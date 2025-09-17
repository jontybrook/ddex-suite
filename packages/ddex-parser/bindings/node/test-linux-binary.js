#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing ddex-parser Linux binary...');
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Simple test XML
const simpleXML = `<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/382" MessageSchemaVersionId="ern/382" BusinessProfileVersionId="CommonDealTypes/14" ReleaseProfileVersionId="CommonReleaseTypes/14">
  <MessageHeader>
    <MessageThreadId>thread-001</MessageThreadId>
    <MessageId>msg-001</MessageId>
    <MessageFileName>test.xml</MessageFileName>
    <MessageSender>
      <PartyId Namespace="DPId">12345</PartyId>
      <PartyName>
        <FullName>Test Sender</FullName>
      </PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId Namespace="DPId">67890</PartyId>
      <PartyName>
        <FullName>Test Recipient</FullName>
      </PartyName>
    </MessageRecipient>
    <MessageCreatedDateTime>2024-01-01T00:00:00Z</MessageCreatedDateTime>
  </MessageHeader>
  <ResourceList>
    <SoundRecording>
      <SoundRecordingId>
        <ISRC>TEST1234567890</ISRC>
      </SoundRecordingId>
      <ReferenceTitle>
        <TitleText>Test Track</TitleText>
      </ReferenceTitle>
      <Duration>PT3M30S</Duration>
    </SoundRecording>
  </ResourceList>
  <ReleaseList>
    <Release>
      <ReleaseId>
        <ICPN>TEST-001</ICPN>
      </ReleaseId>
      <ReferenceTitle>
        <TitleText>Test Album</TitleText>
      </ReferenceTitle>
      <ReleaseResourceReferenceList>
        <ReleaseResourceReference>TEST1234567890</ReleaseResourceReference>
      </ReleaseResourceReferenceList>
    </Release>
  </ReleaseList>
</NewReleaseMessage>`;

try {
    // Try to load the Linux binary directly
    const linuxBinaryPath = path.join(__dirname, 'ddex-parser-node.linux-x64-gnu.node');

    if (!fs.existsSync(linuxBinaryPath)) {
        console.error('❌ Linux binary not found at:', linuxBinaryPath);
        process.exit(1);
    }

    console.log('✅ Linux binary found at:', linuxBinaryPath);
    console.log('Binary size:', fs.statSync(linuxBinaryPath).size, 'bytes');

    // Load the native module
    const ddexParser = require(linuxBinaryPath);
    console.log('✅ Native module loaded successfully');
    console.log('Available exports:', Object.keys(ddexParser));

    // Test basic functionality
    if (ddexParser.DdexParser) {
        console.log('✅ DdexParser class found');

        const parser = new ddexParser.DdexParser();
        console.log('✅ DdexParser instance created');

        // Test parsing
        console.log('🔄 Parsing test XML...');
        const result = parser.parse(simpleXML);

        console.log('✅ Parsing successful!');
        console.log('Result type:', typeof result);
        console.log('Has graph:', !!result.graph);
        console.log('Has flat:', !!result.flat);

        if (result.flat) {
            console.log('Flat data keys:', Object.keys(result.flat));
            if (result.flat.releases && result.flat.releases.length > 0) {
                console.log('First release title:', result.flat.releases[0].title);
            }
        }

        console.log('🎉 ddex-parser Linux binary test PASSED!');

    } else {
        console.error('❌ DdexParser class not found in exports');
        process.exit(1);
    }

} catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}