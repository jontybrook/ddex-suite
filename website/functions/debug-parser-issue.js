const { DdexParser } = require('ddex-parser');

const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43" MessageSchemaVersionId="ern/43" LanguageAndScriptCode="en">
  <MessageHeader>
    <MessageThreadId>PLAYGROUND_MSG_001</MessageThreadId>
    <MessageId>MSG_PLAYGROUND_2024</MessageId>
    <MessageSender>
      <PartyId>PLAYGROUND_LABEL</PartyId>
      <PartyName><FullName>Playground Record Label</FullName></PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId>PLAYGROUND_DSP</PartyId>
      <PartyName><FullName>Playground Streaming Platform</FullName></PartyName>
    </MessageRecipient>
    <MessageCreatedDateTime>2024-01-15T10:00:00Z</MessageCreatedDateTime>
  </MessageHeader>
  <ReleaseList>
    <Release>
      <ReleaseReference>R1</ReleaseReference>
      <ReleaseType>Single</ReleaseType>
      <ReleaseId>
        <GRid>A1-PLAYGROUND-GRID-001</GRid>
      </ReleaseId>
      <ReferenceTitle>
        <TitleText>Sample Track Release</TitleText>
      </ReferenceTitle>
    </Release>
  </ReleaseList>
  <ResourceList>
    <SoundRecording>
      <ResourceReference>A1</ResourceReference>
      <SoundRecordingId>
        <ISRC>USPLAYG240001</ISRC>
      </SoundRecordingId>
      <ReferenceTitle>
        <TitleText>Sample Track</TitleText>
      </ReferenceTitle>
    </SoundRecording>
  </ResourceList>
  <DealList>
    <ReleaseDeal>
      <DealReleaseReference>R1</DealReleaseReference>
      <Deal>
        <DealReference>D1</DealReference>
        <TerritoryCode>Worldwide</TerritoryCode>
        <StartDate>2024-01-15</StartDate>
      </Deal>
    </ReleaseDeal>
  </DealList>
</ern:NewReleaseMessage>`;

async function testParser() {
  try {
    console.log('Testing parser with v0.4.4...');
    const parser = new DdexParser();
    console.log('Parser created successfully');

    // Test version detection first
    try {
      const version = parser.detectVersion(testXml);
      console.log('Version detected:', version);
    } catch (err) {
      console.error('Version detection failed:', err.message);
    }

    // Test parsing
    const result = await parser.parse(testXml);
    console.log('Parsing successful!');
    console.log('Message ID:', result.messageId);
    console.log('Sender:', result.sender?.name);
    console.log('Recipient:', result.recipient?.name);
    console.log('Releases:', result.releases?.length);

  } catch (error) {
    console.error('Parse failed:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Try to get detailed error if available
    try {
      const parser = new DdexParser();
      if (parser.getDetailedError) {
        const detailed = parser.getDetailedError(testXml);
        console.log('Detailed error:', JSON.stringify(detailed, null, 2));
      }
    } catch (detailErr) {
      console.log('Could not get detailed error:', detailErr.message);
    }
  }
}

testParser();