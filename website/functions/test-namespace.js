const { DdexParser } = require('ddex-parser');

// Test with and without namespace
const withNS = `<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
  <MessageHeader>
    <MessageId>TEST123</MessageId>
  </MessageHeader>
</NewReleaseMessage>`;

const withoutNS = `<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage>
  <MessageHeader>
    <MessageId>TEST123</MessageId>
  </MessageHeader>
</NewReleaseMessage>`;

const parser = new DdexParser();

// Try different parsing options
const options = {
  includeRawExtensions: true,
  includeComments: true,
  validateReferences: false,
  collectStatistics: true
};

console.log('With namespace (basic):', parser.parseSync(withNS));

try {
  console.log('With namespace (options):', parser.parseSync(withNS, options));
} catch (e) {
  console.log('Options not supported:', e.message);
}

try {
  console.log('Without namespace:', parser.parseSync(withoutNS));
} catch (e) {
  console.log('Without namespace error:', e.message);
}