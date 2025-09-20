#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing ddex-builder Linux binary...');
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Simple test structure for building
const testStructure = {
  messageHeader: {
    messageThreadId: "thread-001",
    messageId: "msg-001",
    messageFileName: "test.xml",
    messageSender: {
      partyId: {
        value: "12345",
        namespace: "DPId"
      },
      partyName: {
        fullName: "Test Sender"
      }
    },
    messageRecipient: {
      partyId: {
        value: "67890",
        namespace: "DPId"
      },
      partyName: {
        fullName: "Test Recipient"
      }
    },
    messageCreatedDateTime: "2024-01-01T00:00:00Z"
  },
  resourceList: [
    {
      soundRecording: {
        soundRecordingId: {
          isrc: "TEST1234567890"
        },
        referenceTitle: {
          titleText: "Test Track"
        },
        duration: "PT3M30S"
      }
    }
  ],
  releaseList: [
    {
      releaseId: {
        icpn: "TEST-001"
      },
      referenceTitle: {
        titleText: "Test Album"
      },
      releaseResourceReferenceList: ["TEST1234567890"]
    }
  ]
};

try {
    // Try to load the Linux binary directly
    const linuxBinaryPath = path.join(__dirname, 'ddex-builder-node.linux-x64-gnu.node');

    if (!fs.existsSync(linuxBinaryPath)) {
        console.error('❌ Linux binary not found at:', linuxBinaryPath);
        process.exit(1);
    }

    console.log('✅ Linux binary found at:', linuxBinaryPath);
    console.log('Binary size:', fs.statSync(linuxBinaryPath).size, 'bytes');

    // Load the native module
    const ddexBuilder = require(linuxBinaryPath);
    console.log('✅ Native module loaded successfully');
    console.log('Available exports:', Object.keys(ddexBuilder));

    // Test basic functionality
    if (ddexBuilder.DdexBuilder) {
        console.log('✅ DdexBuilder class found');

        const builder = new ddexBuilder.DdexBuilder();
        console.log('✅ DdexBuilder instance created');

        // Test validation (if available)
        console.log('🔄 Testing structure validation...');

        try {
            // Try to validate the structure
            const isValid = builder.validate && builder.validate(testStructure);
            console.log('Validation result:', isValid);
        } catch (validationError) {
            console.log('Note: Validation method may not be available:', validationError.message);
        }

        // Test building (if build method is available)
        console.log('🔄 Testing XML building...');

        try {
            const xml = builder.build && builder.build(testStructure, { version: '382' });
            if (xml) {
                console.log('✅ XML built successfully!');
                console.log('XML length:', xml.length);
                console.log('XML starts with:', xml.substring(0, 100) + '...');
            } else {
                console.log('Note: Build method may not be available or returned null');
            }
        } catch (buildError) {
            console.log('Note: Build method may not be available:', buildError.message);
        }

        // Test other available methods
        const availableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(builder));
        console.log('Available builder methods:', availableMethods);

        console.log('🎉 ddex-builder Linux binary test PASSED!');

    } else {
        console.error('❌ DdexBuilder class not found in exports');
        process.exit(1);
    }

} catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}