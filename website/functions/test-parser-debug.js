// Test different import methods
console.log('Testing different import methods...\n');

// Option 1: Default export
try {
  const DdexParserDefault = require('ddex-parser');
  console.log('Option 1 - Default export type:', typeof DdexParserDefault);
  console.log('Option 1 - Default export keys:', Object.keys(DdexParserDefault));
} catch (e) {
  console.error('Option 1 failed:', e.message);
}

// Option 2: Named export
try {
  const { DdexParser } = require('ddex-parser');
  console.log('Option 2 - Named export type:', typeof DdexParser);
} catch (e) {
  console.error('Option 2 failed:', e.message);
}

// Option 3: Check what's actually exported
const ddexModule = require('ddex-parser');
console.log('Module exports:', Object.keys(ddexModule));
console.log('Module type:', typeof ddexModule);
console.log('Module constructor name:', ddexModule.constructor?.name);

// Option 4: Try instantiating differently
let ParserClass;
try {
  if (typeof ddexModule === 'function') {
    ParserClass = ddexModule;
    console.log('Using module as constructor');
  } else if (ddexModule.DdexParser) {
    ParserClass = ddexModule.DdexParser;
    console.log('Using DdexParser property');
  } else if (ddexModule.default) {
    ParserClass = ddexModule.default;
    console.log('Using default property');
  } else {
    console.log('No valid constructor found');
  }
} catch (e) {
  console.error('Constructor detection failed:', e.message);
}

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

console.log('\nTesting parser with different approaches...\n');

// Test with the detected parser class
if (ParserClass) {
  try {
    console.log('Testing with detected ParserClass...');
    const parser = new ParserClass();
    const result = parser.parseSync(testXML);
    console.log('✅ Success with detected class:');
    console.log('- messageId:', result.messageId);
    console.log('- releases[0].title:', result.releases?.[0]?.title);

    // Check methods available
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(parser));
    console.log('- Available methods:', methods);
  } catch (e) {
    console.error('❌ Failed with detected class:', e.message);
  }
}

// Test with different import approaches
console.log('\n--- Testing different import approaches ---');

// Test 1: Direct module as constructor
try {
  const parser1 = new ddexModule();
  const result1 = parser1.parseSync(testXML);
  console.log('✅ Test 1 - Direct module constructor works');
  console.log('- messageId:', result1.messageId);
} catch (e) {
  console.error('❌ Test 1 failed:', e.message);
}

// Test 2: Named export
try {
  const { DdexParser } = require('ddex-parser');
  const parser2 = new DdexParser();
  const result2 = parser2.parseSync(testXML);
  console.log('✅ Test 2 - Named export works');
  console.log('- messageId:', result2.messageId);
} catch (e) {
  console.error('❌ Test 2 failed:', e.message);
}

// Test 3: Default export
try {
  const DefaultParser = require('ddex-parser').default || require('ddex-parser');
  const parser3 = new DefaultParser();
  const result3 = parser3.parseSync(testXML);
  console.log('✅ Test 3 - Default export works');
  console.log('- messageId:', result3.messageId);
} catch (e) {
  console.error('❌ Test 3 failed:', e.message);
}