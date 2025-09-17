const express = require('express');
const { DDEXParser } = require('ddex-parser');

const router = express.Router();

// POST /api/parse - Parse DDEX XML and return structured JSON
router.post('/', async (req, res) => {
  try {
    // Validate request body
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing request body',
        message: 'XML content is required'
      });
    }

    const xmlContent = typeof req.body === 'string' ? req.body : req.body.xml;

    if (!xmlContent || typeof xmlContent !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'XML content must be provided as a string'
      });
    }

    if (xmlContent.trim().length === 0) {
      return res.status(400).json({
        error: 'Empty XML',
        message: 'XML content cannot be empty'
      });
    }

    // Parse options from query parameters
    const options = {
      includeGraph: req.query.includeGraph === 'true',
      includeFlat: req.query.includeFlat !== 'false', // Default to true
      preserveExtensions: req.query.preserveExtensions === 'true'
    };

    // Initialize parser and parse XML
    const parser = new DDEXParser();
    const startTime = Date.now();

    const result = await parser.parse(xmlContent, options);

    const parseTime = Date.now() - startTime;

    // Return parsed result with metadata
    res.json({
      success: true,
      data: result,
      metadata: {
        parseTime: `${parseTime}ms`,
        size: xmlContent.length,
        hasGraph: !!result.graph,
        hasFlat: !!result.flat,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Parse error:', error);

    // Handle specific parser errors
    if (error.message.includes('XML')) {
      return res.status(400).json({
        error: 'XML parsing failed',
        message: error.message,
        details: error.details || null
      });
    }

    if (error.message.includes('DDEX')) {
      return res.status(400).json({
        error: 'DDEX validation failed',
        message: error.message,
        details: error.details || null
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Parsing failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal parsing error'
    });
  }
});

// POST /api/parse/validate - Validate DDEX XML without full parsing
router.post('/validate', async (req, res) => {
  try {
    const xmlContent = typeof req.body === 'string' ? req.body : req.body.xml;

    if (!xmlContent || typeof xmlContent !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'XML content must be provided as a string'
      });
    }

    const parser = new DDEXParser();
    const startTime = Date.now();

    // Attempt to parse - if successful, XML is valid
    await parser.parse(xmlContent, { includeGraph: false, includeFlat: false });

    const validateTime = Date.now() - startTime;

    res.json({
      success: true,
      valid: true,
      message: 'DDEX XML is valid',
      metadata: {
        validateTime: `${validateTime}ms`,
        size: xmlContent.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Validation error:', error);

    res.status(400).json({
      success: false,
      valid: false,
      error: 'Validation failed',
      message: error.message,
      details: error.details || null
    });
  }
});

module.exports = router;