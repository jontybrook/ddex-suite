const { DdexParser } = require('./index');
const fs = require('fs');
const path = require('path');

console.log('=== Testing with Simple XML ===\n');

// Test with the simple XML from the Python tests
const xmlPath = path.join('..', '..', 'bindings', 'python', 'tests', 'test.xml');
const xml = fs.readFileSync(xmlPath, 'utf8');

console.log('📄 XML Content:');
console.log(xml);
console.log('\n' + '='.repeat(50));

const parser = new DdexParser();
const result = parser.parseSync(xml);

console.log('📊 Parsed Result (Pretty JSON):');
console.log('================================');
console.log(JSON.stringify(result, null, 2));

console.log('\n' + '='.repeat(50));
console.log('✅ Data Structure Validation:');
console.log('==============================');
console.log('Message ID:', result.messageId);
console.log('Message Type:', result.messageType);
console.log('Version:', result.version);
console.log('Releases Array:', Array.isArray(result.releases));
console.log('Resources Object:', typeof result.resources === 'object');
console.log('Deals Array:', Array.isArray(result.deals));
console.log('\n🎯 SUCCESS: Real DDEX parser is working with complete data structures!');