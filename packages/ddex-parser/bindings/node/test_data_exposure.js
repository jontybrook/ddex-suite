const { DdexParser } = require('./index');
const fs = require('fs');

const xml = fs.readFileSync('complex_ddex_test.xml', 'utf8');
const parser = new DdexParser();
const result = parser.parseSync(xml);

console.log('=== Data Exposure Test ===');
console.log('Releases array present:', Array.isArray(result.releases));
console.log('Number of releases:', result.releases?.length);
console.log('First release:', result.releases?.[0]);

console.log('\nResources object present:', typeof result.resources === 'object');
console.log('Resource keys:', Object.keys(result.resources || {}));
console.log('First resource:', Object.values(result.resources || {})[0]);

console.log('\nDeals array present:', Array.isArray(result.deals));
console.log('Number of deals:', result.deals?.length);
console.log('First deal:', result.deals?.[0]);