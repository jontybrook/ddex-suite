console.log('=== Checking module exports ===');
const parserModule = require('ddex-parser');
const builderModule = require('ddex-builder');

console.log('Parser module exports:', Object.keys(parserModule));
console.log('Builder module exports:', Object.keys(builderModule));

const Parser = parserModule.DdexParser || parserModule.DDEXParser || parserModule.Parser || parserModule;
const Builder = builderModule.DdexBuilder || builderModule.DDEXBuilder || builderModule.Builder || builderModule;

const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
  <MessageHeader>
    <MessageId>TEST001</MessageId>
    <MessageCreatedDateTime>2024-01-15T10:00:00Z</MessageCreatedDateTime>
  </MessageHeader>
  <ReleaseList>
    <Release>
      <ReleaseReference>R1</ReleaseReference>
      <Title>
        <TitleText>Test Album</TitleText>
      </Title>
    </Release>
  </ReleaseList>
</NewReleaseMessage>`;

console.log('=== Testing Parser ===');
try {
  const parser = new Parser();
  console.log('Parser created');
  console.log('Parser type:', typeof parser);
  console.log('Parser methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));

  // Try parseSync
  if (parser.parseSync) {
    const result = parser.parseSync(testXML);
    console.log('parseSync result type:', typeof result);
    console.log('parseSync result:', JSON.stringify(result, null, 2).substring(0, 500));
  }

  // Try parse
  if (parser.parse) {
    parser.parse(testXML).then(result => {
      console.log('parse (async) result type:', typeof result);
      console.log('parse (async) result:', JSON.stringify(result, null, 2).substring(0, 500));
    });
  }
} catch (error) {
  console.error('Parser test error:', error);
}

console.log('\n=== Testing Builder ===');
try {
  const builder = new Builder();
  console.log('Builder created');
  console.log('Builder type:', typeof builder);
  console.log('Builder methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(builder)));

  // Try building from parsed data (round-trip test)
  const parser = new Parser();
  const parsed = parser.parseSync(testXML);
  console.log('Parsed data keys:', Object.keys(parsed));

  // Try to build from the parsed data (async)
  if (builder.build) {
    console.log('Trying to build from parsed data...');
    const result = builder.build(parsed);
    console.log('build from parsed result type:', typeof result);

    // Check if it's a Promise
    if (result && typeof result.then === 'function') {
      console.log('Result is a Promise, awaiting...');
      result.then(xmlResult => {
        console.log('Promise resolved, result type:', typeof xmlResult);
        console.log('Promise resolved, result:', xmlResult ? xmlResult.substring(0, 200) : 'null');
      }).catch(err => {
        console.error('Promise rejected:', err.message);
      });
    } else if (typeof result === 'object') {
      console.log('build result keys:', Object.keys(result));
      console.log('build result.xml:', result.xml ? result.xml.substring(0, 200) : 'N/A');
    } else {
      console.log('build result:', result ? result.substring(0, 200) : 'null');
    }
  }

  // Try different methods to get the XML
  const presets = builder.getAvailablePresets ? builder.getAvailablePresets() : [];
  console.log('Available presets:', presets);

  if (presets.length > 0) {
    console.log('Trying with preset:', presets[0]);
    builder.applyPreset(presets[0]);
    const result = builder.build(parsed);
    console.log('build with preset result type:', typeof result);
  }
} catch (error) {
  console.error('Builder test error:', error);
}