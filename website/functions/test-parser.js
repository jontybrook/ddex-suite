const { DdexParser } = require('ddex-parser');
const fs = require('fs');

const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43" MessageSchemaVersionId="ern/43" BusinessProfileVersionId="CommonReleaseProfile/14" ReleaseProfileVersionId="CommonReleaseProfile/14">
  <!-- Your full XML here -->
</NewReleaseMessage>`;

const parser = new DdexParser();
const result = parser.parseSync(xmlContent);

console.log('Parser result:', JSON.stringify(result, null, 2));