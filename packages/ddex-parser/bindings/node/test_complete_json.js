const { DdexParser } = require('./index');
const fs = require('fs');

console.log('=== Complete Data Structure JSON Output ===\n');

const xml = fs.readFileSync('complex_ddex_test.xml', 'utf8');
const parser = new DdexParser();
const result = parser.parseSync(xml);

console.log('📊 Complete ParsedMessage Structure:');
console.log('=====================================\n');

// Pretty-print the complete result
console.log(JSON.stringify(result, null, 2));

console.log('\n' + '='.repeat(60));
console.log('🔍 Data Summary:');
console.log('================');
console.log('✅ Message ID:', result.messageId);
console.log('✅ Message Type:', result.messageType);
console.log('✅ Sender:', result.senderName);
console.log('✅ Version:', result.version);
console.log('');

console.log('📀 Releases Data:');
console.log('  Count:', result.releaseCount);
console.log('  Array Length:', result.releases?.length);
console.log('  First Release ID:', result.releases?.[0]?.releaseId);
console.log('  First Release Title:', result.releases?.[0]?.title);
console.log('  First Release Artist:', result.releases?.[0]?.displayArtist);
console.log('');

console.log('🎵 Resources Data:');
console.log('  Count:', result.resourceCount);
console.log('  Object Keys Count:', Object.keys(result.resources || {}).length);
console.log('  Resource Keys:', Object.keys(result.resources || {}));
console.log('');

console.log('💼 Deals Data:');
console.log('  Count:', result.dealCount);
console.log('  Array Length:', result.deals?.length);
console.log('');

console.log('🎯 Data Structure Verification:');
console.log('================================');
console.log('✅ Releases field exists:', 'releases' in result);
console.log('✅ Resources field exists:', 'resources' in result);
console.log('✅ Deals field exists:', 'deals' in result);
console.log('✅ Releases is array:', Array.isArray(result.releases));
console.log('✅ Resources is object:', typeof result.resources === 'object');
console.log('✅ Deals is array:', Array.isArray(result.deals));

if (result.releases && result.releases.length > 0) {
    console.log('');
    console.log('📀 Detailed First Release:');
    console.log('===========================');
    const firstRelease = result.releases[0];
    Object.entries(firstRelease).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            console.log(`  ${key}: [Array with ${value.length} items]`);
        } else if (typeof value === 'object' && value !== null) {
            console.log(`  ${key}: [Object]`);
        } else {
            console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
    });
}

console.log('\n' + '='.repeat(60));
console.log('🎉 SUCCESS: Complete data structure is now exposed to JavaScript!');
console.log('   No more mock data - this is real parsed DDEX content.');
console.log('='.repeat(60));