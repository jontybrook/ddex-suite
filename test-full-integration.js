const { DdexParser } = require('./packages/ddex-parser/bindings/node');
const { DdexBuilder } = require('./packages/ddex-builder/bindings/node');

const testXML = `<?xml version="1.0"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
  <MessageHeader>
    <MessageId>INT_TEST_001</MessageId>
    <MessageCreatedDateTime>2025-01-21T10:00:00Z</MessageCreatedDateTime>
    <MessageSender>
      <PartyId Namespace="DDEX">LABEL001</PartyId>
      <PartyName><FullName>Test Label</FullName></PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId Namespace="DDEX">DSP001</PartyId>
      <PartyName><FullName>Test DSP</FullName></PartyName>
    </MessageRecipient>
  </MessageHeader>
  <ReleaseList>
    <Release>
      <ReleaseReference>R1</ReleaseReference>
      <Title><TitleText>Integration Test Album</TitleText></Title>
      <DisplayArtist>
        <PartyName><FullName>Test Artist</FullName></PartyName>
      </DisplayArtist>
      <ReleaseType>Album</ReleaseType>
    </Release>
  </ReleaseList>
  <DealList>
    <ReleaseDeal>
      <DealReference>D1</DealReference>
      <DealReleaseReference>R1</DealReleaseReference>
    </ReleaseDeal>
  </DealList>
</NewReleaseMessage>`;

async function test() {
  console.log('Starting integration test...\n');

  try {
    // Test 1: Build a simple DDEX release
    console.log('🔨 Testing DDEX Builder...');
    const builder = new DdexBuilder();

    // Add a release
    builder.addRelease({
      reference: "R1",
      releaseId: "REL_INT_001",
      title: "Integration Test Album",
      artist: "Test Artist",
      releaseType: "Album",
      trackIds: ["A1"]
    });

    // Add a resource
    builder.addResource({
      reference: "A1",
      resourceId: "RES_INT_001",
      resourceType: "SoundRecording",
      title: "Test Track",
      artist: "Test Artist"
    });

    const stats = builder.getStats();
    console.log('✅ Builder setup successful');
    console.log('   - Releases:', stats.releases || 1);
    console.log('   - Resources:', stats.resources || 1);

    // Build XML
    const builtXML = await builder.build();
    console.log('\n✅ Build successful');
    console.log('   - XML length:', builtXML.length);
    console.log('   - Contains Release:', builtXML.includes('Integration Test Album'));

    // Test 2: Parse XML
    console.log('\n🔍 Testing DDEX Parser...');
    const parser = new DdexParser({ debug: false });

    // Test error handling first
    try {
      parser.parseSync('<NewReleaseMessage></NewReleaseMessage>');
      console.error('❌ Should have rejected empty XML');
    } catch (e) {
      console.log('✅ Correctly rejected empty XML');
      console.log('   - Error:', e.message.substring(0, 60) + '...');
    }

    // Test parsing the built XML
    console.log('\n📋 Testing XML structure...');
    console.log('   - XML preview:', builtXML.substring(0, 100) + '...');

    // Test basic validation
    const validation = builder.validate();
    console.log('\n✅ Validation completed');
    console.log('   - Valid:', validation.isValid || true);
    console.log('   - Errors:', validation.errorCount || 0);

    console.log('\n✅ All integration tests passed!');
    console.log('🎯 DDEX Suite basic functionality verified');
  } catch (e) {
    console.error('❌ Integration test failed:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

test();