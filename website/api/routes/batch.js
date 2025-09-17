const express = require('express');
const { DDEXParser } = require('ddex-parser');
const { DDEXBuilder } = require('ddex-builder');

const router = express.Router();

// POST /api/batch/parse - Parse multiple DDEX XML documents
router.post('/parse', async (req, res) => {
  try {
    const { documents, options = {} } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Documents must be provided as an array'
      });
    }

    if (documents.length === 0) {
      return res.status(400).json({
        error: 'Empty batch',
        message: 'At least one document is required'
      });
    }

    if (documents.length > 100) {
      return res.status(400).json({
        error: 'Batch too large',
        message: 'Maximum 100 documents allowed per batch'
      });
    }

    const parser = new DDEXParser();
    const startTime = Date.now();
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      try {
        if (!doc.xml || typeof doc.xml !== 'string') {
          throw new Error('Invalid XML content');
        }

        const parseStart = Date.now();
        const result = await parser.parse(doc.xml, {
          includeGraph: options.includeGraph === true,
          includeFlat: options.includeFlat !== false,
          preserveExtensions: options.preserveExtensions === true
        });

        results.push({
          id: doc.id || `doc_${i}`,
          success: true,
          data: result,
          parseTime: Date.now() - parseStart,
          size: doc.xml.length
        });

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

    res.json({
      success: true,
      summary: {
        total: documents.length,
        successful: successCount,
        failed: errorCount,
        totalTime: `${totalTime}ms`,
        averageTime: `${Math.round(totalTime / documents.length)}ms`
      },
      results
    });

  } catch (error) {
    console.error('Batch parse error:', error);

    res.status(500).json({
      error: 'Batch parsing failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal batch processing error'
    });
  }
});

// POST /api/batch/build - Build multiple DDEX XML documents
router.post('/build', async (req, res) => {
  try {
    const { documents, globalOptions = {} } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Documents must be provided as an array'
      });
    }

    if (documents.length === 0) {
      return res.status(400).json({
        error: 'Empty batch',
        message: 'At least one document is required'
      });
    }

    if (documents.length > 50) {
      return res.status(400).json({
        error: 'Batch too large',
        message: 'Maximum 50 documents allowed per batch build'
      });
    }

    const builder = new DDEXBuilder();
    const startTime = Date.now();
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      try {
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
        const xml = await builder.build(doc.data, buildConfig);

        results.push({
          id: doc.id || `doc_${i}`,
          success: true,
          xml: xml,
          buildTime: Date.now() - buildStart,
          size: xml.length,
          config: buildConfig
        });

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

    res.json({
      success: true,
      summary: {
        total: documents.length,
        successful: successCount,
        failed: errorCount,
        totalTime: `${totalTime}ms`,
        averageTime: `${Math.round(totalTime / documents.length)}ms`
      },
      results
    });

  } catch (error) {
    console.error('Batch build error:', error);

    res.status(500).json({
      error: 'Batch building failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal batch processing error'
    });
  }
});

// POST /api/batch/round-trip - Parse then build multiple documents for round-trip testing
router.post('/round-trip', async (req, res) => {
  try {
    const { documents, options = {} } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Documents must be provided as an array'
      });
    }

    if (documents.length > 20) {
      return res.status(400).json({
        error: 'Batch too large',
        message: 'Maximum 20 documents allowed per round-trip batch'
      });
    }

    const parser = new DDEXParser();
    const builder = new DDEXBuilder();
    const startTime = Date.now();
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];

      try {
        if (!doc.xml || typeof doc.xml !== 'string') {
          throw new Error('Invalid XML content');
        }

        const roundTripStart = Date.now();

        // Step 1: Parse
        const parseStart = Date.now();
        const parsed = await parser.parse(doc.xml, {
          includeGraph: true,
          includeFlat: true,
          preserveExtensions: true
        });
        const parseTime = Date.now() - parseStart;

        // Step 2: Build
        const buildStart = Date.now();
        const buildRequest = parsed.toBuildRequest ? parsed.toBuildRequest() : parsed;
        const rebuilt = await builder.build(buildRequest, {
          version: options.version || '4.3',
          deterministic: true,
          canonicalize: true
        });
        const buildTime = Date.now() - buildStart;

        // Step 3: Compare (basic size comparison)
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

    res.json({
      success: true,
      summary: {
        total: documents.length,
        successful: successCount,
        failed: errorCount,
        totalTime: `${totalTime}ms`,
        averageTime: `${Math.round(totalTime / documents.length)}ms`
      },
      results
    });

  } catch (error) {
    console.error('Batch round-trip error:', error);

    res.status(500).json({
      error: 'Batch round-trip failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal batch processing error'
    });
  }
});

module.exports = router;