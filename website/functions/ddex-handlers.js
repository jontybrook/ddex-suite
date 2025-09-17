/**
 * DDEX API Handlers
 * Separate handlers for DDEX parsing, building, and batch operations
 */

const logger = require("firebase-functions/logger");
const cors = require("cors");

// Initialize CORS
const corsHandler = cors({
  origin: ['https://ddex-suite.org', 'https://ddex-suite.web.app', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

// Import DDEX packages with fallback
let DdexParser, DdexBuilder;

// Simple fallback parsers (same as in index.js)
class SimpleDdexParser {
  parse(xmlContent) {
    const match = xmlContent.match(/<MessageId[^>]*>([^<]+)<\/MessageId>/);
    const messageId = match ? match[1] : 'Unknown';

    const releaseMatches = xmlContent.match(/<Release[^>]*>/g) || [];
    const trackMatches = xmlContent.match(/<Track[^>]*>/g) || [];

    return {
      messageId: messageId,
      messageType: 'NewReleaseMessage',
      messageDate: new Date().toISOString(),
      senderName: 'Cloud Parser',
      senderId: 'CLOUD_PARSER',
      recipientName: 'API Client',
      recipientId: 'API_CLIENT',
      version: 'V3_8_2',
      releaseCount: releaseMatches.length,
      trackCount: trackMatches.length,
      dealCount: 0,
      resourceCount: 0,
      totalDurationSeconds: 0,
      releases: [],
      resources: {},
      deals: []
    };
  }
}

class SimpleDdexBuilder {
  build(buildRequest) {
    const messageId = buildRequest.messageHeader?.messageId || `msg-${Date.now()}`;
    const sender = buildRequest.messageHeader?.messageSenderName || 'DDEX Suite API';
    const recipient = buildRequest.messageHeader?.messageRecipientName || 'Client';
    const releases = buildRequest.releases || [];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/V3_8_2" MessageSchemaVersionId="ern/V3_8_2">
  <MessageHeader>
    <MessageId>${messageId}</MessageId>
    <MessageCreatedDateTime>${new Date().toISOString()}</MessageCreatedDateTime>
    <MessageSender>
      <PartyName>
        <FullName>${sender}</FullName>
      </PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyName>
        <FullName>${recipient}</FullName>
      </PartyName>
    </MessageRecipient>
  </MessageHeader>`;

    if (releases.length > 0) {
      xml += `
  <ReleaseList>`;
      releases.forEach((release, index) => {
        xml += `
    <Release>
      <ReleaseReference>R${index + 1}</ReleaseReference>
      <ReleaseType>${release.releaseType || 'Album'}</ReleaseType>
      <DisplayTitleText>${release.title || 'Unknown'}</DisplayTitleText>
      <DisplayArtist>
        <PartyName>
          <FullName>${release.artist || 'Unknown'}</FullName>
        </PartyName>
      </DisplayArtist>
    </Release>`;
      });
      xml += `
  </ReleaseList>`;
    }

    xml += `
</ern:NewReleaseMessage>`;

    return xml;
  }
}

// Initialize DDEX libraries
function initializeDdexLibraries() {
  if (!DdexParser) {
    try {
      const { DDEXParser } = require('ddex-parser');
      DdexParser = DDEXParser;
      logger.info('Successfully loaded ddex-parser');
    } catch (error) {
      logger.warn('Failed to load ddex-parser, using fallback:', error.message);
      DdexParser = SimpleDdexParser;
    }
  }

  if (!DdexBuilder) {
    try {
      const { DDEXBuilder } = require('ddex-builder');
      DdexBuilder = DDEXBuilder;
      logger.info('Successfully loaded ddex-builder');
    } catch (error) {
      logger.warn('Failed to load ddex-builder, using fallback:', error.message);
      DdexBuilder = SimpleDdexBuilder;
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
        initializeDdexLibraries();

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
        initializeDdexLibraries();

        const buildConfig = {
          version: targetVersion,
          preset: preset || null,
          deterministic: options?.deterministic !== false,
          canonicalize: options?.canonicalize !== false,
          validate: options?.validate !== false
        };

        const startTime = Date.now();
        const builder = new DdexBuilder();
        const xml = await builder.build(data, buildConfig);
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
        initializeDdexLibraries();

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
              const xml = await builder.build(doc.data, buildConfig);

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
              const buildRequest = parsed.toBuildRequest ? parsed.toBuildRequest() : parsed;
              const rebuilt = await builder.build(buildRequest, {
                version: options.version || '4.3',
                deterministic: true,
                canonicalize: true
              });
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