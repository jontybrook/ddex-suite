const express = require('express');
const cors = require('cors');
const { DdexParser } = require('ddex-parser');
const { DdexBuilder } = require('ddex-builder');

// Helper function to extract actual data from DDEX XML
// Since the Node.js parser returns mock data, we'll parse the XML directly
function extractDdexData(xmlString) {
  // Simple XML extraction using regex (for demo purposes)
  // In production, would use a proper XML parser like fast-xml-parser

  const extractText = (xml, tagName) => {
    const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  };

  const extractAttribute = (xml, tagName, attrName) => {
    const regex = new RegExp(`<${tagName}[^>]*${attrName}="([^"]*)"`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
  };

  const countTags = (xml, tagName) => {
    const regex = new RegExp(`<${tagName}[^>]*>`, 'g');
    const matches = xml.match(regex);
    return matches ? matches.length : 0;
  };

  const extractDuration = (xml) => {
    const duration = extractText(xml, 'Duration');
    if (!duration) return 0;

    // Parse PT3M45S format to seconds
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Extract actual values from XML
  const messageId = extractText(xmlString, 'MessageId') || 'Unknown';
  const messageThreadId = extractText(xmlString, 'MessageThreadId') || 'Unknown';
  const messageType = xmlString.includes('NewReleaseMessage') ? 'NewReleaseMessage' : 'Unknown';
  const messageDate = extractText(xmlString, 'MessageCreatedDateTime') || new Date().toISOString();

  // Extract sender and recipient information
  const senderMatch = xmlString.match(/<MessageSender>[\s\S]*?<FullName>([^<]*)<\/FullName>[\s\S]*?<\/MessageSender>/i);
  const recipientMatch = xmlString.match(/<MessageRecipient>[\s\S]*?<FullName>([^<]*)<\/FullName>[\s\S]*?<\/MessageRecipient>/i);

  const senderName = senderMatch ? senderMatch[1].trim() : 'Unknown Sender';
  const recipientName = recipientMatch ? recipientMatch[1].trim() : 'Unknown Recipient';
  const senderId = extractAttribute(xmlString, 'PartyId', 'Namespace') || 'unknown';

  // Count actual elements
  const releaseCount = countTags(xmlString, 'Release');
  const trackCount = countTags(xmlString, 'SoundRecording') + countTags(xmlString, 'MusicalWork');
  const dealCount = countTags(xmlString, 'ReleaseDeal') + countTags(xmlString, 'Deal');
  const resourceCount = countTags(xmlString, 'SoundRecording') + countTags(xmlString, 'Image') + countTags(xmlString, 'Video');

  const totalDurationSeconds = extractDuration(xmlString);

  return {
    messageId,
    messageThreadId,
    messageType,
    messageDate,
    senderName,
    senderId,
    recipientName,
    recipientId: 'parsed_recipient',
    releaseCount,
    trackCount,
    dealCount,
    resourceCount,
    totalDurationSeconds
  };
}

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

app.post('/api/parse', async (req, res) => {
  try {
    const { xml } = req.body;

    if (!xml) {
      res.status(400).json({ error: 'XML content is required' });
      return;
    }

    console.log('Parsing DDEX XML with Node.js parser...');

    // Initialize the parser
    const parser = new DdexParser();

    // Use parser for version detection and basic validation
    const detectedVersion = parser.detectVersion(xml);

    // The Node.js parser returns mock data, so we'll extract real values from XML
    const actualParsedData = extractDdexData(xml);

    // Combine detected version with actual parsed data
    const result = {
      ...actualParsedData,
      version: detectedVersion,
      messageSchemaVersionId: detectedVersion
    };

    console.log(`Parse completed: ${result.messageId} from ${result.senderName} → ${result.recipientName}`);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error parsing XML:', error);
    res.status(500).json({
      success: false,
      error: `Failed to parse DDEX XML: ${error.message || error}`
    });
  }
});

// Build DDEX XML endpoint
app.post('/api/build', async (req, res) => {
  try {
    const { buildRequest, preset } = req.body;

    if (!buildRequest) {
      return res.status(400).json({
        success: false,
        error: 'Build request is required'
      });
    }

    console.log('Building XML from request:', buildRequest);

    // Initialize the builder
    const builder = new DdexBuilder();

    const xml = await builder.build(buildRequest);
    console.log('Build completed, XML length:', xml.length);

    res.json({
      success: true,
      xml: xml
    });
  } catch (error) {
    console.error('Build error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch build DDEX XML endpoint
app.post('/api/batch-build', async (req, res) => {
  try {
    const { requests } = req.body;

    if (!requests || !Array.isArray(requests)) {
      return res.status(400).json({
        success: false,
        error: 'Requests array is required'
      });
    }

    console.log('Batch building', requests.length, 'requests');

    const builder = new DdexBuilder();
    const results = [];

    for (const request of requests) {
      const xml = await builder.build(request);
      results.push(xml);
    }

    console.log('Batch build completed, generated', results.length, 'XML files');

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Batch build error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available presets endpoint
app.get('/api/presets', (req, res) => {
  try {
    const presets = ['none', 'generic', 'youtube_music'];
    res.json({
      success: true,
      presets: presets
    });
  } catch (error) {
    console.error('Presets error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      parser: 'ddex-parser v0.4.1',
      builder: 'ddex-builder v0.4.1'
    }
  });
});

app.listen(port, () => {
  console.log(`DDEX Suite API server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log(`  GET  http://localhost:${port}/health - Health check`);
  console.log(`  POST http://localhost:${port}/api/parse - Parse DDEX XML`);
  console.log(`  POST http://localhost:${port}/api/build - Build DDEX XML`);
  console.log(`  POST http://localhost:${port}/api/batch-build - Batch build DDEX XML`);
  console.log(`  GET  http://localhost:${port}/api/presets - Get available presets`);
});