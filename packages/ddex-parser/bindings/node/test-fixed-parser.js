const { DdexParser } = require('.');

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

async function testFixedParser() {
  try {
    console.log('Testing FIXED parser build...');

    const parser = new DdexParser();
    console.log('Parser created successfully');

    // Test parsing
    const result = await parser.parse(testXml);
    console.log('✅ PARSING SUCCESSFUL!');
    console.log('Message ID:', result.messageId);
    console.log('Sender Name:', result.sender?.name);
    console.log('Sender ID:', result.sender?.id);
    console.log('Recipient Name:', result.recipient?.name);
    console.log('Recipient ID:', result.recipient?.id);
    console.log('Number of Releases:', result.releases?.length);
    console.log('Release Title:', result.releases?.[0]?.title);

  } catch (error) {
    console.error('❌ Parse failed:');
    console.error('Error message:', error.message);
  }
}

testFixedParser();