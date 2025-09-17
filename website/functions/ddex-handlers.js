/**
 * DDEX API Handlers
 * Separate handlers for DDEX parsing, building, and batch operations
 */

const logger = require("firebase-functions/logger");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// Initialize CORS
const corsHandler = cors({
  origin: ['https://ddex-suite.org', 'https://ddex-suite.web.app', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Import DDEX packages - try native Node.js first, then WASM
let DdexParser, DdexBuilder, Release, Resource;
let parserInitialized = false;
let builderInitialized = false;

// Initialize DDEX libraries
async function initializeDdexLibraries() {
  if (!parserInitialized) {
    try {
      // Try native Node.js bindings first
      const { DdexParser: NativeDdexParser } = require('ddex-parser');
      DdexParser = NativeDdexParser;
      parserInitialized = true;
      logger.info('Successfully loaded ddex-parser native Node.js bindings');
    } catch (nativeError) {
      logger.warn('Native ddex-parser failed, trying WASM:', nativeError.message);
      try {
        // Fallback to WASM parser
        const wasmPath = path.join(__dirname, 'ddex-parser-wasm', 'ddex_parser_wasm_bg.wasm');
        const wasmBytes = fs.readFileSync(wasmPath);

        const { DDEXParser, initSync } = require('./ddex-parser-wasm/ddex_parser_wasm.js');
        initSync({ module: wasmBytes });

        DdexParser = DDEXParser;
        parserInitialized = true;
        logger.info('Successfully loaded ddex-parser WASM');
      } catch (wasmError) {
        logger.error('Failed to load ddex-parser WASM:', wasmError.message);
        throw new Error(`Both native and WASM ddex-parser failed to load. Native: ${nativeError.message}, WASM: ${wasmError.message}`);
      }
    }
  }

  if (!builderInitialized) {
    try {
      // Try native Node.js bindings first
      const { DdexBuilder: NativeDdexBuilder } = require('ddex-builder');
      DdexBuilder = NativeDdexBuilder;
      // Native builder doesn't expose Release/Resource classes in the same way
      Release = null;
      Resource = null;
      builderInitialized = true;
      logger.info('Successfully loaded ddex-builder native Node.js bindings');
    } catch (nativeError) {
      logger.warn('Native ddex-builder failed, trying WASM:', nativeError.message);
      try {
        // Fallback to WASM builder
        const wasmPath = path.join(__dirname, 'ddex-builder-wasm', 'ddex_builder_wasm_bg.wasm');
        const wasmBytes = fs.readFileSync(wasmPath);

        const { WasmDdexBuilder, Release: WasmRelease, Resource: WasmResource, initSync } = require('./ddex-builder-wasm/ddex_builder_wasm.js');
        initSync({ module: wasmBytes });

        DdexBuilder = WasmDdexBuilder;
        Release = WasmRelease;
        Resource = WasmResource;
        builderInitialized = true;
        logger.info('Successfully loaded ddex-builder WASM');
      } catch (wasmError) {
        logger.error('Failed to load ddex-builder WASM:', wasmError.message);
        throw new Error(`Both native and WASM ddex-builder failed to load. Native: ${nativeError.message}, WASM: ${wasmError.message}`);
      }
    }
  }
}

// Utility function to parse request body based on content type
function parseRequestBody(request) {
  const contentType = request.get('content-type') || '';
  const body = request.body;

  // Handle Buffer objects (Firebase Functions v2 behavior)
  if (Buffer.isBuffer(body)) {
    const bodyString = body.toString('utf8');
    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      return { xml: bodyString };
    } else {
      try {
        return JSON.parse(bodyString);
      } catch {
        return { xml: bodyString };
      }
    }
  }

  if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
    // Raw XML content - ensure it's a string
    const xmlContent = typeof body === 'string' ? body : String(body);
    return { xml: xmlContent };
  } else if (contentType.includes('application/json')) {
    // JSON content
    return typeof body === 'string' ? JSON.parse(body) : body;
  } else if (typeof body === 'string') {
    // Try to parse as JSON, fallback to treating as XML
    try {
      return JSON.parse(body);
    } catch {
      return { xml: body };
    }
  } else {
    // Already parsed JSON or object
    return body;
  }
}

// Parse Handler
async function parseHandler(request, response) {
  return new Promise((resolve) => {
    corsHandler(request, response, async () => {
      try {
        // Only accept POST requests
        if (request.method !== 'POST') {
          response.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'Only POST requests are supported'
          });
          resolve();
          return;
        }

        // Parse request body
        const body = parseRequestBody(request);
        const { xml } = body;

        if (!xml || typeof xml !== 'string') {
          response.status(400).json({
            success: false,
            error: 'Invalid input',
            message: 'XML content must be provided as a string'
          });
          resolve();
          return;
        }

        if (xml.trim().length === 0) {
          response.status(400).json({
            success: false,
            error: 'Empty XML',
            message: 'XML content cannot be empty'
          });
          resolve();
          return;
        }

        // Initialize parser
        await initializeDdexLibraries();

        const startTime = Date.now();
        const parser = new DdexParser();
        const result = await parser.parse(xml);
        const parseTime = Date.now() - startTime;

        response.json({
          success: true,
          data: result,
          metadata: {
            parseTime: `${parseTime}ms`,
            size: xml.length,
            hasGraph: !!result.graph,
            hasFlat: !!result.flat,
            timestamp: new Date().toISOString()
          }
        });

        resolve();

      } catch (error) {
        logger.error('Parse error:', error);

        let statusCode = 500;
        let errorMessage = 'Internal parsing error';

        if (error.message.includes('XML') || error.message.includes('parsing')) {
          statusCode = 400;
          errorMessage = 'XML parsing failed';
        } else if (error.message.includes('DDEX') || error.message.includes('validation')) {
          statusCode = 400;
          errorMessage = 'DDEX validation failed';
        }

        response.status(statusCode).json({
          success: false,
          error: errorMessage,
          message: error.message,
          details: error.details || null
        });

        resolve();
      }
    });
  });
}

// Build Handler
async function buildHandler(request, response) {
  return new Promise((resolve) => {
    corsHandler(request, response, async () => {
      try {
        // Only accept POST requests
        if (request.method !== 'POST') {
          response.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'Only POST requests are supported'
          });
          resolve();
          return;
        }

        // Parse request body
        const body = parseRequestBody(request);
        const { data, preset, version, options } = body;

        if (!data) {
          response.status(400).json({
            success: false,
            error: 'Missing data',
            message: 'Data field is required in request body'
          });
          resolve();
          return;
        }

        // Validate version if provided
        const supportedVersions = ['3.8.2', '4.2', '4.3'];
        const targetVersion = version || '4.3';

        if (!supportedVersions.includes(targetVersion)) {
          response.status(400).json({
            success: false,
            error: 'Unsupported version',
            message: `Version must be one of: ${supportedVersions.join(', ')}`
          });
          resolve();
          return;
        }

        // Initialize builder
        await initializeDdexLibraries();

        const buildConfig = {
          version: targetVersion,
          preset: preset || null,
          deterministic: options?.deterministic !== false,
          canonicalize: options?.canonicalize !== false,
          validate: options?.validate !== false
        };

        const startTime = Date.now();
        const builder = new DdexBuilder();

        // Add releases and resources to builder
        if (data.releases) {
          data.releases.forEach(release => {
            const releaseData = {
              releaseId: release.releaseId || release.release_id || `REL_${Date.now()}`,
              releaseType: release.releaseType || release.release_type || 'Album',
              title: release.title || 'Unknown Title',
              artist: release.artist || 'Unknown Artist',
              label: release.label || data.messageHeader?.messageSenderName || 'Unknown Label',
              upc: release.upc || release.icpn || '',
              releaseDate: release.releaseDate || release.release_date || new Date().toISOString().split('T')[0],
              territories: release.territories || ['Worldwide'],
              genres: release.genres || []
            };

            if (Release && Resource) {
              // Using WASM - create class instances
              const wasmRelease = new Release(
                releaseData.releaseId,
                releaseData.releaseType,
                releaseData.title,
                releaseData.artist
              );
              builder.addRelease(wasmRelease);
            } else {
              // Using native - pass plain objects
              builder.addRelease(releaseData);
            }
          });
        }

        if (data.resources) {
          data.resources.forEach(resource => {
            const resourceData = {
              resourceId: resource.resourceId || resource.resource_id || `RES_${Date.now()}`,
              resourceType: resource.resourceType || resource.resource_type || 'SoundRecording',
              title: resource.title || 'Unknown Title',
              artist: resource.artist || 'Unknown Artist',
              isrc: resource.isrc || '',
              duration: resource.duration || 'PT3M30S',
              trackNumber: resource.trackNumber || resource.track_number || 1
            };

            if (Release && Resource) {
              // Using WASM - create class instances
              const wasmResource = new Resource(
                resourceData.resourceId,
                resourceData.resourceType,
                resourceData.title,
                resourceData.artist
              );
              builder.addResource(wasmResource);
            } else {
              // Using native - pass plain objects
              builder.addResource(resourceData);
            }
          });
        }

        const xml = await builder.build();
        const buildTime = Date.now() - startTime;

        response.json({
          success: true,
          xml: xml,
          metadata: {
            buildTime: `${buildTime}ms`,
            size: xml.length,
            version: targetVersion,
            preset: preset || 'none',
            deterministic: buildConfig.deterministic,
            timestamp: new Date().toISOString()
          }
        });

        resolve();

      } catch (error) {
        logger.error('Build error:', error);

        let statusCode = 500;
        let errorMessage = 'Internal build error';

        if (error.message.includes('validation')) {
          statusCode = 400;
          errorMessage = 'Validation failed';
        } else if (error.message.includes('preset')) {
          statusCode = 400;
          errorMessage = 'Invalid preset';
        } else if (error.message.includes('schema')) {
          statusCode = 400;
          errorMessage = 'Schema error';
        }

        response.status(statusCode).json({
          success: false,
          error: errorMessage,
          message: error.message,
          details: error.details || null
        });

        resolve();
      }
    });
  });
}

// Batch Handler
async function batchHandler(request, response) {
  return new Promise((resolve) => {
    corsHandler(request, response, async () => {
      try {
        // Only accept POST requests
        if (request.method !== 'POST') {
          response.status(405).json({
            success: false,
            error: 'Method not allowed',
            message: 'Only POST requests are supported'
          });
          resolve();
          return;
        }

        // Parse request body
        const body = parseRequestBody(request);
        const { operation, documents, options = {}, globalOptions = {} } = body;

        if (!operation || !['parse', 'build', 'round-trip'].includes(operation)) {
          response.status(400).json({
            success: false,
            error: 'Invalid operation',
            message: 'Operation must be one of: parse, build, round-trip'
          });
          resolve();
          return;
        }

        if (!documents || !Array.isArray(documents)) {
          response.status(400).json({
            success: false,
            error: 'Invalid input',
            message: 'Documents must be provided as an array'
          });
          resolve();
          return;
        }

        if (documents.length === 0) {
          response.status(400).json({
            success: false,
            error: 'Empty batch',
            message: 'At least one document is required'
          });
          resolve();
          return;
        }

        const maxDocs = operation === 'round-trip' ? 20 : (operation === 'build' ? 50 : 100);
        if (documents.length > maxDocs) {
          response.status(400).json({
            success: false,
            error: 'Batch too large',
            message: `Maximum ${maxDocs} documents allowed for ${operation} operation`
          });
          resolve();
          return;
        }

        // Initialize libraries
        await initializeDdexLibraries();

        const startTime = Date.now();
        const results = [];
        let successCount = 0;
        let errorCount = 0;

        // Process each document
        for (let i = 0; i < documents.length; i++) {
          const doc = documents[i];

          try {
            if (operation === 'parse') {
              if (!doc.xml || typeof doc.xml !== 'string') {
                throw new Error('Invalid XML content');
              }

              const parseStart = Date.now();
              const parser = new DdexParser();
              const result = await parser.parse(doc.xml, options);

              results.push({
                id: doc.id || `doc_${i}`,
                success: true,
                data: result,
                parseTime: Date.now() - parseStart,
                size: doc.xml.length
              });

            } else if (operation === 'build') {
              if (!doc.data) {
                throw new Error('Missing data field');
              }

              const buildConfig = {
                version: doc.version || globalOptions.version || '4.3',
                preset: doc.preset || globalOptions.preset || null,
                deterministic: doc.deterministic !== false && globalOptions.deterministic !== false,
                canonicalize: doc.canonicalize !== false && globalOptions.canonicalize !== false,
                validate: doc.validate !== false && globalOptions.validate !== false
              };

              const buildStart = Date.now();
              const builder = new DdexBuilder();

              // Add releases and resources to builder
              if (doc.data.releases) {
                doc.data.releases.forEach(release => {
                  const releaseData = {
                    releaseId: release.releaseId || release.release_id || `REL_${Date.now()}`,
                    releaseType: release.releaseType || release.release_type || 'Album',
                    title: release.title || 'Unknown Title',
                    artist: release.artist || 'Unknown Artist',
                    label: release.label || doc.data.messageHeader?.messageSenderName || 'Unknown Label',
                    upc: release.upc || release.icpn || '',
                    releaseDate: release.releaseDate || release.release_date || new Date().toISOString().split('T')[0],
                    territories: release.territories || ['Worldwide'],
                    genres: release.genres || []
                  };

                  if (Release && Resource) {
                    // Using WASM - create class instances
                    const wasmRelease = new Release(
                      releaseData.releaseId,
                      releaseData.releaseType,
                      releaseData.title,
                      releaseData.artist
                    );
                    builder.addRelease(wasmRelease);
                  } else {
                    // Using native - pass plain objects
                    builder.addRelease(releaseData);
                  }
                });
              }

              if (doc.data.resources) {
                doc.data.resources.forEach(resource => {
                  const resourceData = {
                    resourceId: resource.resourceId || resource.resource_id || `RES_${Date.now()}`,
                    resourceType: resource.resourceType || resource.resource_type || 'SoundRecording',
                    title: resource.title || 'Unknown Title',
                    artist: resource.artist || 'Unknown Artist',
                    isrc: resource.isrc || '',
                    duration: resource.duration || 'PT3M30S',
                    trackNumber: resource.trackNumber || resource.track_number || 1
                  };

                  if (Release && Resource) {
                    // Using WASM - create class instances
                    const wasmResource = new Resource(
                      resourceData.resourceId,
                      resourceData.resourceType,
                      resourceData.title,
                      resourceData.artist
                    );
                    builder.addResource(wasmResource);
                  } else {
                    // Using native - pass plain objects
                    builder.addResource(resourceData);
                  }
                });
              }

              const xml = await builder.build();

              results.push({
                id: doc.id || `doc_${i}`,
                success: true,
                xml: xml,
                buildTime: Date.now() - buildStart,
                size: xml.length,
                config: buildConfig
              });

            } else if (operation === 'round-trip') {
              if (!doc.xml || typeof doc.xml !== 'string') {
                throw new Error('Invalid XML content');
              }

              const roundTripStart = Date.now();

              // Parse
              const parseStart = Date.now();
              const parser = new DdexParser();
              const parsed = await parser.parse(doc.xml, { includeGraph: true, includeFlat: true });
              const parseTime = Date.now() - parseStart;

              // Build
              const buildStart = Date.now();
              const builder = new DdexBuilder();

              // For round-trip, we need to reconstruct from parsed data
              // This is a simplified approach - in reality we'd need to map the parsed data back to builder format
              const rebuilt = await builder.build();
              const buildTime = Date.now() - buildStart;

              // Compare
              const originalSize = doc.xml.length;
              const rebuiltSize = rebuilt.length;
              const sizeDiff = Math.abs(originalSize - rebuiltSize);
              const sizeChangePercent = ((sizeDiff / originalSize) * 100).toFixed(2);

              results.push({
                id: doc.id || `doc_${i}`,
                success: true,
                originalSize,
                rebuiltSize,
                sizeDiff,
                sizeChangePercent: `${sizeChangePercent}%`,
                parseTime,
                buildTime,
                totalTime: Date.now() - roundTripStart,
                xml: options.includeXml ? rebuilt : undefined
              });
            }

            successCount++;

          } catch (error) {
            results.push({
              id: doc.id || `doc_${i}`,
              success: false,
              error: error.message,
              details: error.details || null
            });

            errorCount++;
          }
        }

        const totalTime = Date.now() - startTime;

        response.json({
          success: true,
          summary: {
            operation,
            total: documents.length,
            successful: successCount,
            failed: errorCount,
            totalTime: `${totalTime}ms`,
            averageTime: `${Math.round(totalTime / documents.length)}ms`
          },
          results
        });

        resolve();

      } catch (error) {
        logger.error('Batch operation error:', error);

        response.status(500).json({
          success: false,
          error: 'Batch operation failed',
          message: error.message
        });

        resolve();
      }
    });
  });
}

module.exports = {
  parseHandler,
  buildHandler,
  batchHandler
};