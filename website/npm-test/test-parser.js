const { DDEXParser } = require('ddex-parser');

console.log('Testing ddex-parser npm package...');

// Test basic parser instantiation
try {
    const parser = new DDEXParser();
    console.log('✅ DDEXParser instantiated successfully');

    // Test with a simple DDEX XML
    const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<ns2:NewReleaseMessage
  xmlns:ns2="http://ddex.net/xml/ern/43"
  MessageSchemaVersionId="ern/43"
  BusinessProfileVersionId="CommonReleaseTypes/14"
  ReleaseProfileVersionId="CommonReleaseTypes/14">
  <MessageHeader>
    <MessageThreadId>MSG123</MessageThreadId>
    <MessageId>MSG456</MessageId>
    <MessageCreatedDateTime>2024-01-01T00:00:00</MessageCreatedDateTime>
    <MessageSender>
      <PartyId>SENDER123</PartyId>
      <PartyName>
        <FullName>Test Sender</FullName>
      </PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId>RECIPIENT123</PartyId>
      <PartyName>
        <FullName>Test Recipient</FullName>
      </PartyName>
    </MessageRecipient>
  </MessageHeader>
  <UpdateIndicator>OriginalMessage</UpdateIndicator>
  <IsBackfill>false</IsBackfill>
</ns2:NewReleaseMessage>`;

    const result = parser.parse(sampleXML);
    console.log('✅ Successfully parsed DDEX XML');
    console.log('Result structure:', Object.keys(result));

    // Access the parsed data properly
    if (result.flat && result.flat.message_header) {
        console.log('Message ID:', result.flat.message_header.message_id);
        console.log('Sender:', result.flat.message_header.message_sender.party_name.full_name);
    } else {
        console.log('Parsed result:', JSON.stringify(result, null, 2));
    }

} catch (error) {
    console.error('❌ Error testing ddex-parser:', error.message);
    process.exit(1);
}

console.log('🎉 ddex-parser npm package test completed successfully!');