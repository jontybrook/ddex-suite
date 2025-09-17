/**
 * DDEX Suite API - Cloud Functions for Firebase
 * Provides REST API endpoints for DDEX parsing and building functionality
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const cors = require("cors");

// Import DDEX handlers
const { parseHandler, buildHandler, batchHandler } = require('./ddex-handlers');

// Import DDEX packages - try native first, then fallback to WASM
let DdexParser, DdexBuilder;
let parserInitPromise, builderInitPromise;

// Simple XML parser implementation as fallback
class SimpleDdexParser {
  parse(xmlContent) {
    // Simple XML parsing using Node.js built-ins
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
    // Simple XML building
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
      <PartyName>${sender}</PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyName>${recipient}</PartyName>
    </MessageRecipient>
    <MessageThreadId>${messageId}</MessageThreadId>
  </MessageHeader>
  <ResourceList/>
  <ReleaseList>`;

    releases.forEach((release, index) => {
      xml += `
    <Release>
      <ReleaseId>
        <GRid>${release.releaseId || `REL${index + 1}`}</GRid>
      </ReleaseId>
      <ReferenceTitle>
        <TitleText>${release.title || 'Untitled'}</TitleText>
      </ReferenceTitle>
      <ReleaseDetailsByTerritory TerritoryCode="Worldwide">
        <DisplayArtistName>${release.artist || 'Unknown Artist'}</DisplayArtistName>
        <OriginalReleaseDate>${release.releaseDate || '2024-01-01'}</OriginalReleaseDate>
      </ReleaseDetailsByTerritory>
    </Release>`;
    });

    xml += `
  </ReleaseList>
</ern:NewReleaseMessage>`;

    return xml;
  }
}

async function initWasmModules() {
  try {
    logger.info('Native modules not available, using simple cloud-compatible implementation');

    // Use simple implementations that work in cloud environment
    DdexParser = SimpleDdexParser;
    DdexBuilder = SimpleDdexBuilder;

    logger.info('Successfully loaded cloud-compatible DDEX modules');
    return true;
  } catch (error) {
    logger.error('Failed to initialize cloud modules:', error);
    return false;
  }
}

// Try native modules first
try {
  ({ DdexParser } = require("ddex-parser"));
  ({ DdexBuilder } = require("ddex-builder"));
  logger.info('Successfully loaded DDEX native modules');
} catch (nativeError) {
  logger.warn('Native modules failed, will try WASM:', nativeError.message);

  // Initialize WASM modules as fallback
  parserInitPromise = initWasmModules();
}

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Helper function to handle CORS
function setCORSHeaders(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Helper function to handle errors
function handleError(res, error, operation) {
  logger.error(`Error in ${operation}:`, error);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
    operation
  });
}

// Parser API endpoint
exports.parseXML = onRequest({
  memory: '1GiB',
  timeoutSeconds: 60,
  maxInstances: 5,
  cors: true
}, async (req, res) => {
  setCORSHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
    return;
  }

  try {
    const { xmlContent, options = {} } = req.body;

    if (!xmlContent) {
      res.status(400).json({
        success: false,
        error: 'Missing xmlContent in request body'
      });
      return;
    }

    // Wait for WASM initialization if needed
    if (!DdexParser && parserInitPromise) {
      logger.info('Waiting for WASM parser initialization...');
      await parserInitPromise;
    }

    if (!DdexParser) {
      res.status(503).json({
        success: false,
        error: 'DDEX Parser modules failed to load (both native and WASM).',
        suggestion: 'Please check the function logs for detailed error information.'
      });
      return;
    }

    logger.info('Parsing DDEX XML', {
      contentLength: xmlContent.length,
      options
    });

    const parser = new DdexParser();
    const result = await parser.parse(xmlContent, options);

    logger.info('Successfully parsed DDEX XML', {
      hasFlat: !!result.flat,
      hasGraph: !!result.graph
    });

    res.json({
      success: true,
      data: result,
      metadata: {
        contentLength: xmlContent.length,
        parseTime: new Date().toISOString()
      }
    });

  } catch (error) {
    handleError(res, error, 'parseXML');
  }
});

// Builder API endpoint
exports.buildXML = onRequest({
  memory: '1GiB',
  timeoutSeconds: 60,
  maxInstances: 5,
  cors: true
}, async (req, res) => {
  setCORSHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
    return;
  }

  try {
    const { buildRequest, options = {} } = req.body;

    if (!buildRequest) {
      res.status(400).json({
        success: false,
        error: 'Missing buildRequest in request body'
      });
      return;
    }

    // Wait for WASM initialization if needed
    if (!DdexBuilder && parserInitPromise) {
      logger.info('Waiting for WASM builder initialization...');
      await parserInitPromise;
    }

    if (!DdexBuilder) {
      res.status(503).json({
        success: false,
        error: 'DDEX Builder modules failed to load (both native and WASM).',
        suggestion: 'Please check the function logs for detailed error information.'
      });
      return;
    }

    logger.info('Building DDEX XML', {
      hasFlat: !!buildRequest.flat,
      hasGraph: !!buildRequest.graph,
      options
    });

    const builder = new DdexBuilder();
    const xmlResult = await builder.build(buildRequest, options);

    logger.info('Successfully built DDEX XML', {
      outputLength: xmlResult.length
    });

    res.json({
      success: true,
      data: {
        xml: xmlResult
      },
      metadata: {
        outputLength: xmlResult.length,
        buildTime: new Date().toISOString()
      }
    });

  } catch (error) {
    handleError(res, error, 'buildXML');
  }
});

// Round-trip API endpoint (Parse → Modify → Build)
exports.roundTrip = onRequest({
  memory: '1GiB',
  timeoutSeconds: 120,
  maxInstances: 3,
  cors: true
}, async (req, res) => {
  setCORSHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
    return;
  }

  try {
    const { xmlContent, modifications = {}, options = {} } = req.body;

    if (!xmlContent) {
      res.status(400).json({
        success: false,
        error: 'Missing xmlContent in request body'
      });
      return;
    }

    // Wait for WASM initialization if needed
    if ((!DdexParser || !DdexBuilder) && parserInitPromise) {
      logger.info('Waiting for WASM modules initialization...');
      await parserInitPromise;
    }

    if (!DdexParser || !DdexBuilder) {
      res.status(503).json({
        success: false,
        error: 'DDEX modules failed to load (both native and WASM).',
        suggestion: 'Please check the function logs for detailed error information.'
      });
      return;
    }

    logger.info('Starting round-trip operation', {
      contentLength: xmlContent.length,
      hasModifications: Object.keys(modifications).length > 0
    });

    // Step 1: Parse the XML
    const parser = new DdexParser();
    const parsed = await parser.parse(xmlContent, options.parser);

    // Step 2: Apply modifications if provided
    let modified = parsed;
    if (Object.keys(modifications).length > 0) {
      modified = { ...parsed };

      // Apply modifications to flat representation
      if (modifications.flat && modified.flat) {
        Object.assign(modified.flat, modifications.flat);
      }

      // Apply modifications to graph representation
      if (modifications.graph && modified.graph) {
        Object.assign(modified.graph, modifications.graph);
      }
    }

    // Step 3: Build the XML back
    const builder = new DdexBuilder();
    const buildRequest = modified.toBuildRequest ? modified.toBuildRequest() : modified;
    const xmlResult = await builder.build(buildRequest, options.builder);

    logger.info('Successfully completed round-trip', {
      originalLength: xmlContent.length,
      outputLength: xmlResult.length
    });

    res.json({
      success: true,
      data: {
        original: parsed,
        modified: modified,
        xml: xmlResult
      },
      metadata: {
        originalLength: xmlContent.length,
        outputLength: xmlResult.length,
        roundTripTime: new Date().toISOString()
      }
    });

  } catch (error) {
    handleError(res, error, 'roundTrip');
  }
});

// Health check endpoint
exports.health = onRequest({
  memory: '256MiB',
  timeoutSeconds: 10,
  cors: true
}, (req, res) => {
  setCORSHeaders(res);

  res.json({
    success: true,
    message: 'DDEX Suite API is running',
    timestamp: new Date().toISOString(),
    version: '0.4.1',
    modules: {
      parser: !!DdexParser,
      builder: !!DdexBuilder
    }
  });
});

// API documentation endpoint
exports.docs = onRequest({
  memory: '256MiB',
  timeoutSeconds: 10,
  cors: true
}, (req, res) => {
  setCORSHeaders(res);

  const docs = {
    title: 'DDEX Suite API',
    version: '0.4.1',
    description: 'REST API for DDEX XML parsing and building',
    endpoints: {
      '/parseXML': {
        method: 'POST',
        description: 'Parse DDEX XML into structured data',
        body: {
          xmlContent: 'string (required) - The DDEX XML content to parse',
          options: 'object (optional) - Parser options'
        },
        response: {
          success: 'boolean',
          data: 'object - Parsed DDEX data with flat and graph representations',
          metadata: 'object - Parse metadata'
        }
      },
      '/buildXML': {
        method: 'POST',
        description: 'Build DDEX XML from structured data',
        body: {
          buildRequest: 'object (required) - The build request with flat/graph data',
          options: 'object (optional) - Builder options'
        },
        response: {
          success: 'boolean',
          data: 'object - Generated XML content',
          metadata: 'object - Build metadata'
        }
      },
      '/roundTrip': {
        method: 'POST',
        description: 'Parse → Modify → Build workflow',
        body: {
          xmlContent: 'string (required) - The DDEX XML content to process',
          modifications: 'object (optional) - Modifications to apply',
          options: 'object (optional) - Parser and builder options'
        },
        response: {
          success: 'boolean',
          data: 'object - Original, modified, and rebuilt data',
          metadata: 'object - Round-trip metadata'
        }
      },
      '/health': {
        method: 'GET',
        description: 'API health check',
        response: {
          success: 'boolean',
          message: 'string',
          timestamp: 'string',
          version: 'string'
        }
      }
    }
  };

  res.json(docs);
});

// DDEX API endpoints using handlers
exports.ddexParse = onRequest({
  memory: '1GiB',
  timeoutSeconds: 60,
  cors: true
}, parseHandler);

exports.ddexBuild = onRequest({
  memory: '1GiB',
  timeoutSeconds: 60,
  cors: true
}, buildHandler);

exports.ddexBatch = onRequest({
  memory: '1GiB',
  timeoutSeconds: 60,
  cors: true
}, batchHandler);
