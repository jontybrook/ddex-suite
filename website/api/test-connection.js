#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');

// Test configuration
const API_BASE_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000; // 30 seconds

// Sample ERN 4.3 XML for testing
const SAMPLE_ERN_43_XML = `<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43" MessageSchemaVersionId="ern/43" BusinessProfileVersionId="CommonReleaseProfile/14" ReleaseProfileVersionId="CommonReleaseProfile/14">
  <MessageHeader>
    <MessageThreadId>MSG001</MessageThreadId>
    <MessageId>MSG001_001</MessageId>
    <MessageCreatedDateTime>2024-01-15T10:00:00Z</MessageCreatedDateTime>
    <MessageSender>
      <PartyId Namespace="UserDefined">LABEL001</PartyId>
      <PartyName>
        <FullName>Test Record Label</FullName>
      </PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId Namespace="UserDefined">DSP001</PartyId>
      <PartyName>
        <FullName>Test DSP</FullName>
      </PartyName>
    </MessageRecipient>
  </MessageHeader>
  <PartyList>
    <Party>
      <PartyReference>P1</PartyReference>
      <PartyId Namespace="UserDefined">LABEL001</PartyId>
      <PartyName>
        <FullName>Test Record Label</FullName>
      </PartyName>
    </Party>
    <Party>
      <PartyReference>P2</PartyReference>
      <PartyId Namespace="UserDefined">ARTIST001</PartyId>
      <PartyName>
        <FullName>Test Artist</FullName>
      </PartyName>
    </Party>
  </PartyList>
  <ResourceList>
    <SoundRecording>
      <ResourceReference>A1</ResourceReference>
      <Type>MusicalWorkSoundRecording</Type>
      <Title>
        <TitleText>Test Track</TitleText>
      </Title>
      <DisplayArtist>
        <PartyName>
          <FullName>Test Artist</FullName>
        </PartyName>
      </DisplayArtist>
      <Duration>PT3M45S</Duration>
    </SoundRecording>
  </ResourceList>
  <ReleaseList>
    <Release>
      <ReleaseReference>R1</ReleaseReference>
      <ReleaseType>Album</ReleaseType>
      <ReleaseId>
        <GRid>A1234567890123456789</GRid>
      </ReleaseId>
      <DisplayTitleText>Test Album</DisplayTitleText>
      <DisplayArtist>
        <PartyName>
          <FullName>Test Artist</FullName>
        </PartyName>
      </DisplayArtist>
      <ResourceGroup>
        <ResourceGroupContentItem>
          <SequenceNumber>1</SequenceNumber>
          <ResourceType>SoundRecording</ResourceType>
          <ReleaseResourceReference>A1</ReleaseResourceReference>
        </ResourceGroupContentItem>
      </ResourceGroup>
    </Release>
  </ReleaseList>
  <DealList>
    <ReleaseDeal>
      <DealReference>D1</DealReference>
      <Deal>
        <DealTerms>
          <CommercialModelType>SubscriptionModel</CommercialModelType>
          <Territory>
            <TerritoryCode>Worldwide</TerritoryCode>
          </Territory>
          <ValidityPeriod>
            <StartDate>2024-01-15</StartDate>
          </ValidityPeriod>
        </DealTerms>
        <DealReleaseReference>R1</DealReleaseReference>
      </Deal>
    </ReleaseDeal>
  </DealList>
</NewReleaseMessage>`;

// Sample build request JSON
const SAMPLE_BUILD_REQUEST = {
  messageHeader: {
    messageId: "TEST_MSG_001",
    messageSenderName: "Test Label",
    messageRecipientName: "Test DSP",
    messageCreatedDateTime: "2024-01-15T10:00:00Z"
  },
  releases: [
    {
      releaseId: "REL_001",
      title: "Test Album",
      artist: "Test Artist",
      releaseType: "Album",
      label: "Test Label",
      upc: "123456789012",
      releaseDate: "2024-01-15",
      territories: ["Worldwide"],
      genres: ["Pop"],
      trackIds: ["TRK_001"]
    }
  ],
  resources: [
    {
      resourceId: "TRK_001",
      resourceType: "SoundRecording",
      title: "Test Track",
      artist: "Test Artist",
      isrc: "TEST123456789",
      duration: "PT3M45S",
      trackNumber: 1
    }
  ],
  deals: [
    {
      dealId: "DEAL_001",
      releaseId: "REL_001",
      territories: ["Worldwide"],
      useTypes: ["Stream"],
      commercialModelType: "SubscriptionModel",
      dealStartDate: "2024-01-15"
    }
  ]
};

// Test results tracking
let testResults = [];
let serverProcess = null;

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '  ℹ️',
    success: '  ✅',
    error: '  ❌',
    warning: '  ⚠️',
    header: '📋'
  }[type] || '  •';

  console.log(`${prefix} ${message}`);
}

function logHeader(message) {
  console.log('\\n' + '='.repeat(60));
  log(message, 'header');
  console.log('='.repeat(60));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(endpoint, data, method = 'POST') {
  const startTime = Date.now();

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    log(`Making ${method} request to: ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
    });

    const duration = Date.now() - startTime;
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseData.error || response.statusText}`);
    }

    return {
      success: true,
      data: responseData,
      duration,
      status: response.status
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

// Server management
async function startServer() {
  log('Starting API server...');

  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('running on port') && !serverReady) {
        serverReady = true;
        log('API server started successfully');
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      log(`Server error: ${data.toString()}`, 'error');
    });

    serverProcess.on('error', (error) => {
      reject(new Error(`Failed to start server: ${error.message}`));
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && !serverReady) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Server startup timeout'));
      }
    }, 10000);
  });
}

async function stopServer() {
  if (serverProcess) {
    log('Stopping API server...');
    serverProcess.kill('SIGTERM');

    // Give it time to shut down gracefully
    await sleep(2000);

    if (!serverProcess.killed) {
      serverProcess.kill('SIGKILL');
    }

    serverProcess = null;
    log('API server stopped');
  }
}

async function waitForServer() {
  log('Waiting for server to be ready...');

  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        log('Server is ready');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }

    await sleep(1000);
  }

  throw new Error('Server failed to become ready');
}

// Test functions
async function testHealthEndpoint() {
  logHeader('Testing Health Endpoint');

  const result = await makeRequest('/health', null, 'GET');

  if (result.success) {
    log(`Health check passed (${result.duration}ms)`, 'success');
    log(`Response: ${JSON.stringify(result.data, null, 2)}`);
    testResults.push({ test: 'Health Check', success: true, duration: result.duration });
  } else {
    log(`Health check failed: ${result.error}`, 'error');
    testResults.push({ test: 'Health Check', success: false, error: result.error });
  }

  return result.success;
}

async function testParseEndpoint() {
  logHeader('Testing Parse Endpoint');

  const result = await makeRequest('/api/parse', { xml: SAMPLE_ERN_43_XML });

  if (result.success) {
    log(`Parse test passed (${result.duration}ms)`, 'success');
    log(`XML size: ${SAMPLE_ERN_43_XML.length} bytes`);
    log(`Response success: ${result.data.success}`);
    log(`Parse time: ${result.data.metadata?.parseTime || 'unknown'}`);

    if (result.data.data) {
      log(`Has graph data: ${!!result.data.data.graph}`);
      log(`Has flat data: ${!!result.data.data.flat}`);
    }

    testResults.push({
      test: 'Parse XML',
      success: true,
      duration: result.duration,
      parseTime: result.data.metadata?.parseTime
    });
  } else {
    log(`Parse test failed: ${result.error}`, 'error');
    testResults.push({ test: 'Parse XML', success: false, error: result.error });
  }

  return result.success;
}

async function testBuildEndpoint() {
  logHeader('Testing Build Endpoint');

  const result = await makeRequest('/api/build', {
    data: SAMPLE_BUILD_REQUEST,
    preset: 'basic',
    version: '4.3'
  });

  if (result.success) {
    log(`Build test passed (${result.duration}ms)`, 'success');
    log(`Generated XML length: ${result.data.xml?.length || 0} bytes`);
    log(`Build time: ${result.data.metadata?.buildTime || 'unknown'}`);
    log(`Version: ${result.data.metadata?.version || 'unknown'}`);
    log(`Preset: ${result.data.metadata?.preset || 'unknown'}`);

    testResults.push({
      test: 'Build XML',
      success: true,
      duration: result.duration,
      buildTime: result.data.metadata?.buildTime,
      xmlSize: result.data.xml?.length
    });
  } else {
    log(`Build test failed: ${result.error}`, 'error');
    testResults.push({ test: 'Build XML', success: false, error: result.error });
  }

  return result.success;
}

async function testBatchParseEndpoint() {
  logHeader('Testing Batch Parse Endpoint');

  const batchData = {
    documents: [
      { id: 'doc1', xml: SAMPLE_ERN_43_XML },
      { id: 'doc2', xml: SAMPLE_ERN_43_XML.replace('Test Album', 'Test Album 2') }
    ],
    options: {
      includeGraph: true,
      includeFlat: true
    }
  };

  const result = await makeRequest('/api/batch/parse', batchData);

  if (result.success) {
    log(`Batch parse test passed (${result.duration}ms)`, 'success');
    log(`Total documents: ${result.data.summary?.total || 0}`);
    log(`Successful: ${result.data.summary?.successful || 0}`);
    log(`Failed: ${result.data.summary?.failed || 0}`);
    log(`Total time: ${result.data.summary?.totalTime || 'unknown'}`);
    log(`Average time: ${result.data.summary?.averageTime || 'unknown'}`);

    testResults.push({
      test: 'Batch Parse',
      success: true,
      duration: result.duration,
      totalDocs: result.data.summary?.total,
      successfulDocs: result.data.summary?.successful
    });
  } else {
    log(`Batch parse test failed: ${result.error}`, 'error');
    testResults.push({ test: 'Batch Parse', success: false, error: result.error });
  }

  return result.success;
}

async function testPresetsEndpoint() {
  logHeader('Testing Presets Endpoint');

  const result = await makeRequest('/api/build/presets', { version: '4.3' });

  if (result.success) {
    log(`Presets test passed (${result.duration}ms)`, 'success');
    log(`Available presets: ${result.data.presets?.length || 0}`);

    if (result.data.presets) {
      result.data.presets.forEach(preset => {
        log(`  - ${preset.name}: ${preset.description}`);
      });
    }

    testResults.push({
      test: 'Get Presets',
      success: true,
      duration: result.duration,
      presetCount: result.data.presets?.length
    });
  } else {
    log(`Presets test failed: ${result.error}`, 'error');
    testResults.push({ test: 'Get Presets', success: false, error: result.error });
  }

  return result.success;
}

async function testRoundTripEndpoint() {
  logHeader('Testing Round-trip Endpoint');

  const batchData = {
    documents: [
      { id: 'roundtrip1', xml: SAMPLE_ERN_43_XML }
    ],
    options: {
      version: '4.3',
      includeXml: false // Don't include XML in response to save bandwidth
    }
  };

  const result = await makeRequest('/api/batch/round-trip', batchData);

  if (result.success) {
    log(`Round-trip test passed (${result.duration}ms)`, 'success');
    log(`Total documents: ${result.data.summary?.total || 0}`);
    log(`Successful: ${result.data.summary?.successful || 0}`);
    log(`Failed: ${result.data.summary?.failed || 0}`);

    if (result.data.results && result.data.results.length > 0) {
      const firstResult = result.data.results[0];
      log(`Original size: ${firstResult.originalSize} bytes`);
      log(`Rebuilt size: ${firstResult.rebuiltSize} bytes`);
      log(`Size change: ${firstResult.sizeChangePercent}`);
      log(`Parse time: ${firstResult.parseTime}ms`);
      log(`Build time: ${firstResult.buildTime}ms`);
    }

    testResults.push({
      test: 'Round-trip',
      success: true,
      duration: result.duration,
      totalDocs: result.data.summary?.total,
      successfulDocs: result.data.summary?.successful
    });
  } else {
    log(`Round-trip test failed: ${result.error}`, 'error');
    testResults.push({ test: 'Round-trip', success: false, error: result.error });
  }

  return result.success;
}

function printSummary() {
  logHeader('Test Summary Report');

  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;

  log(`Total tests: ${totalTests}`);
  log(`Passed: ${passedTests}`, passedTests === totalTests ? 'success' : 'info');
  log(`Failed: ${failedTests}`, failedTests === 0 ? 'success' : 'error');

  console.log('\\nDetailed Results:');
  testResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    log(`${status} ${result.test} ${duration}`, result.success ? 'success' : 'error');

    if (!result.success && result.error) {
      log(`    Error: ${result.error}`, 'error');
    }
  });

  console.log('\\n' + '='.repeat(60));

  if (passedTests === totalTests) {
    log('🎉 All tests passed! API is working correctly.', 'success');
  } else {
    log(`⚠️  ${failedTests} test(s) failed. Check the API server and dependencies.`, 'warning');
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 DDEX Playground API Connection Test\\n');

  try {
    // Check if dependencies are installed
    try {
      require('ddex-parser');
      require('ddex-builder');
      log('Dependencies ddex-parser and ddex-builder found');
    } catch (error) {
      log('Missing dependencies. Run: npm install ddex-parser ddex-builder', 'error');
      process.exit(1);
    }

    // Start the server
    await startServer();
    await waitForServer();

    // Run all tests
    await testHealthEndpoint();
    await testParseEndpoint();
    await testBuildEndpoint();
    await testPresetsEndpoint();
    await testBatchParseEndpoint();
    await testRoundTripEndpoint();

  } catch (error) {
    log(`Test execution failed: ${error.message}`, 'error');
    testResults.push({ test: 'Test Setup', success: false, error: error.message });
  } finally {
    // Clean up
    await stopServer();

    // Print summary
    printSummary();

    // Exit with appropriate code
    const allPassed = testResults.every(r => r.success);
    process.exit(allPassed ? 0 : 1);
  }
}

// Handle interruption
process.on('SIGINT', async () => {
  log('\\nReceived interrupt signal...', 'warning');
  await stopServer();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  log('\\nReceived termination signal...', 'warning');
  await stopServer();
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    log(`Unexpected error: ${error.message}`, 'error');
    process.exit(1);
  });
}