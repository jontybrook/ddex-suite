const express = require('express');
const { DDEXBuilder } = require('ddex-builder');

const router = express.Router();

// POST /api/build - Build DDEX XML from JSON with optional preset
router.post('/', async (req, res) => {
  try {
    // Validate request body
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing request body',
        message: 'JSON data is required'
      });
    }

    const { data, preset, version, options } = req.body;

    if (!data) {
      return res.status(400).json({
        error: 'Missing data',
        message: 'Data field is required in request body'
      });
    }

    // Validate version if provided
    const supportedVersions = ['3.8.2', '4.2', '4.3'];
    const targetVersion = version || '4.3';

    if (!supportedVersions.includes(targetVersion)) {
      return res.status(400).json({
        error: 'Unsupported version',
        message: `Version must be one of: ${supportedVersions.join(', ')}`
      });
    }

    // Build configuration
    const buildConfig = {
      version: targetVersion,
      preset: preset || null,
      deterministic: options?.deterministic !== false, // Default to true
      canonicalize: options?.canonicalize !== false, // Default to true
      validate: options?.validate !== false // Default to true
    };

    // Initialize builder and build XML
    const builder = new DDEXBuilder();
    const startTime = Date.now();

    const xml = await builder.build(data, buildConfig);

    const buildTime = Date.now() - startTime;

    // Return built XML with metadata
    res.json({
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

  } catch (error) {
    console.error('Build error:', error);

    // Handle specific builder errors
    if (error.message.includes('validation')) {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message,
        details: error.details || null
      });
    }

    if (error.message.includes('preset')) {
      return res.status(400).json({
        error: 'Invalid preset',
        message: error.message,
        details: error.details || null
      });
    }

    if (error.message.includes('schema')) {
      return res.status(400).json({
        error: 'Schema error',
        message: error.message,
        details: error.details || null
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Build failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal build error'
    });
  }
});

// POST /api/build/presets - Get available presets for a version
router.post('/presets', async (req, res) => {
  try {
    const { version } = req.body;
    const targetVersion = version || '4.3';

    // Return available presets (this would come from ddex-builder)
    const presets = {
      '3.8.2': ['spotify', 'youtube', 'basic'],
      '4.2': ['spotify', 'youtube', 'apple', 'basic'],
      '4.3': ['spotify', 'youtube', 'apple', 'amazon', 'basic']
    };

    if (!presets[targetVersion]) {
      return res.status(400).json({
        error: 'Unsupported version',
        message: `Version ${targetVersion} is not supported`
      });
    }

    res.json({
      success: true,
      version: targetVersion,
      presets: presets[targetVersion].map(name => ({
        name,
        description: getPresetDescription(name)
      }))
    });

  } catch (error) {
    console.error('Presets error:', error);

    res.status(500).json({
      error: 'Failed to get presets',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
});

// POST /api/build/validate - Validate JSON data before building
router.post('/validate', async (req, res) => {
  try {
    const { data, version } = req.body;

    if (!data) {
      return res.status(400).json({
        error: 'Missing data',
        message: 'Data field is required in request body'
      });
    }

    const targetVersion = version || '4.3';
    const builder = new DDEXBuilder();
    const startTime = Date.now();

    // Validate without building
    const validation = await builder.validate(data, { version: targetVersion });

    const validateTime = Date.now() - startTime;

    res.json({
      success: true,
      valid: validation.valid,
      errors: validation.errors || [],
      warnings: validation.warnings || [],
      metadata: {
        validateTime: `${validateTime}ms`,
        version: targetVersion,
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

// Helper function to get preset descriptions
function getPresetDescription(preset) {
  const descriptions = {
    'spotify': 'Optimized for Spotify delivery requirements',
    'youtube': 'Configured for YouTube Music delivery',
    'apple': 'Apple Music delivery preset',
    'amazon': 'Amazon Music delivery configuration',
    'basic': 'Basic DDEX configuration with minimal requirements'
  };
  return descriptions[preset] || 'Custom preset configuration';
}

module.exports = router;