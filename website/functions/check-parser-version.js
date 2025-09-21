const { DdexParser } = require('ddex-parser');

// Test with minimal XML
const minimalXML = `<?xml version="1.0"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
  <MessageHeader>
    <MessageId>TEST123</MessageId>
  </MessageHeader>
</NewReleaseMessage>`;

// Test with release
const withReleaseXML = `<?xml version="1.0"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
  <MessageHeader>
    <MessageId>ACTUAL_ID_456</MessageId>
  </MessageHeader>
  <ReleaseList>
    <Release>
      <Title>
        <TitleText>Actual Album Title</TitleText>
      </Title>
    </Release>
  </ReleaseList>
</NewReleaseMessage>`;

console.log('Testing parser v0.4.3...\n');

// Test 1: Minimal
const parser1 = new DdexParser({ debug: false });
const result1 = parser1.parseSync(minimalXML);
console.log('Test 1 - Minimal XML:');
console.log('Expected MessageId: TEST123');
console.log('Actual MessageId:', result1.messageId);
console.log('Match:', result1.messageId === 'TEST123' ? '✅' : '❌');

// Test 2: With Release
const parser2 = new DdexParser({ debug: false });
const result2 = parser2.parseSync(withReleaseXML);
console.log('\nTest 2 - With Release:');
console.log('Expected MessageId: ACTUAL_ID_456');
console.log('Actual MessageId:', result2.messageId);
console.log('Expected Title: Actual Album Title');
console.log('Actual Title:', result2.releases?.[0]?.title);
console.log('Match:', result2.releases?.[0]?.title === 'Actual Album Title' ? '✅' : '❌');

if (result1.messageId !== 'TEST123' || result2.releases?.[0]?.title !== 'Actual Album Title') {
  console.log('\n⚠️ Parser is not extracting actual values!');
  console.log('This appears to be a bug in ddex-parser v0.4.3');
}