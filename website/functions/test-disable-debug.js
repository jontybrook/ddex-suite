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

console.log('Testing debug disable methods...\n');

// Method 1: Constructor options
try {
  console.log('1. Testing constructor options...');
  const parser1 = new DdexParser({ debug: false });
  console.log('Before parseSync...');
  const result1 = parser1.parseSync(testXML);
  console.log('After parseSync - messageId:', result1.messageId);
} catch (e) {
  console.error('Method 1 failed:', e.message);
}

// Method 2: Environment variable
try {
  console.log('\n2. Testing with NODE_ENV=production...');
  process.env.NODE_ENV = 'production';
  const parser2 = new DdexParser();
  console.log('Before parseSync...');
  const result2 = parser2.parseSync(testXML);
  console.log('After parseSync - messageId:', result2.messageId);
} catch (e) {
  console.error('Method 2 failed:', e.message);
}

// Method 3: Disable console.error temporarily
try {
  console.log('\n3. Testing with console.error disabled...');
  const originalError = console.error;
  console.error = () => {}; // Disable console.error

  const parser3 = new DdexParser();
  console.log('Before parseSync...');
  const result3 = parser3.parseSync(testXML);
  console.log('After parseSync - messageId:', result3.messageId);

  console.error = originalError; // Restore console.error
} catch (e) {
  console.error('Method 3 failed:', e.message);
}

// Method 4: Check for debug methods on the parser instance
try {
  console.log('\n4. Checking for debug-related methods...');
  const parser4 = new DdexParser();

  // Check instance properties
  const instanceKeys = Object.keys(parser4);
  console.log('Instance keys:', instanceKeys);

  // Check prototype methods
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(parser4));
  const debugMethods = methods.filter(m =>
    m.toLowerCase().includes('debug') ||
    m.toLowerCase().includes('log') ||
    m.toLowerCase().includes('verbose')
  );
  console.log('Debug-related methods:', debugMethods);

  // Try setting properties that might control debug
  parser4.debug = false;
  parser4.verbose = false;
  parser4.silent = true;

  console.log('Before parseSync with debug properties set...');
  const result4 = parser4.parseSync(testXML);
  console.log('After parseSync - messageId:', result4.messageId);
} catch (e) {
  console.error('Method 4 failed:', e.message);
}