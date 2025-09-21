// Test the exact scenario used in the cloud function
const { DdexParser } = require('ddex-parser');

const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
  <MessageHeader>
    <MessageId>MSG001_001</MessageId>
    <MessageCreatedDateTime>2024-01-15T10:00:00Z</MessageCreatedDateTime>
  </MessageHeader>
  <ReleaseList>
    <Release>
      <ReleaseReference>R1</ReleaseReference>
      <ReleaseType>Album</ReleaseType>
      <Title>
        <TitleText>Sample Album</TitleText>
      </Title>
    </Release>
  </ReleaseList>
</NewReleaseMessage>`;

console.log('=== Testing Cloud Function Scenario ===\n');

// Scenario 1: Native parser with debug: false (what we want)
console.log('1. Native parser with debug: false:');
try {
  const parser1 = new DdexParser({ debug: false });
  console.log('Before parseSync...');
  const result1 = parser1.parseSync(testXML);
  console.log('✅ parseSync success - messageId:', result1.messageId);
  console.log('✅ parseSync success - title:', result1.releases?.[0]?.title);
} catch (e) {
  console.error('❌ parseSync failed:', e.message);
}

// Scenario 2: Native parser without debug option
console.log('\n2. Native parser without debug option:');
try {
  const parser2 = new DdexParser();
  console.log('Before parseSync...');
  const result2 = parser2.parseSync(testXML);
  console.log('✅ parseSync success - messageId:', result2.messageId);
  console.log('✅ parseSync success - title:', result2.releases?.[0]?.title);
} catch (e) {
  console.error('❌ parseSync failed:', e.message);
}

// Scenario 3: Test the async parse method with debug: false
console.log('\n3. Native parser async parse with debug: false:');
try {
  const parser3 = new DdexParser({ debug: false });
  console.log('Before async parse...');
  parser3.parse(testXML).then(result => {
    console.log('✅ async parse success - messageId:', result.messageId);
    console.log('✅ async parse success - title:', result.releases?.[0]?.title);
  }).catch(e => {
    console.error('❌ async parse failed:', e.message);
  });
} catch (e) {
  console.error('❌ async parse setup failed:', e.message);
}

// Wait a moment for async to complete
setTimeout(() => {
  console.log('\n=== Test Complete ===');
}, 100);