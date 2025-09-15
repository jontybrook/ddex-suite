const { DdexParser } = require('./index');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Real DDEX Parser Implementation');
console.log('==========================================\n');

// Load a real DDEX XML file
const xmlPath = path.join(__dirname, '../python/tests/test.xml');
const xml = fs.readFileSync(xmlPath, 'utf8');

console.log('📁 Loading DDEX XML from:', xmlPath);
console.log('📄 XML Content:');
console.log(xml);
console.log('\n' + '='.repeat(50) + '\n');

const parser = new DdexParser();

try {
    // Test version detection first
    console.log('🔍 Testing version detection...');
    const version = parser.detectVersion(xml);
    console.log('✅ Version detected:', version);
    console.log('');

    // Test sync parsing
    console.log('⚡ Testing parseSync...');
    const resultSync = parser.parseSync(xml);

    console.log('✅ ParseSync Results:');
    console.log('  Message ID:', resultSync.messageId);
    console.log('  Message Type:', resultSync.messageType);
    console.log('  Sender Name:', resultSync.senderName);
    console.log('  Sender ID:', resultSync.senderId);
    console.log('  Recipient Name:', resultSync.recipientName);
    console.log('  Version:', resultSync.version);
    console.log('  Release Count:', resultSync.releaseCount);
    console.log('  Track Count:', resultSync.trackCount);
    console.log('  Deal Count:', resultSync.dealCount);
    console.log('  Resource Count:', resultSync.resourceCount);
    console.log('');

    // Check if this is mock data
    const isMockData = resultSync.messageId === 'TEST_001';
    console.log('🎭 Is this mock data?', isMockData ? '❌ YES (PROBLEM!)' : '✅ NO (GOOD!)');

    if (isMockData) {
        console.log('❌ ERROR: Still returning mock data instead of parsing real XML!');
    } else {
        console.log('✅ SUCCESS: Real parsing is working!');
        console.log('   Expected Message ID: CLI_TEST_001');
        console.log('   Actual Message ID:', resultSync.messageId);
    }
    console.log('');

    // Test async parsing
    console.log('🔄 Testing async parse...');
    parser.parse(xml).then(resultAsync => {
        console.log('✅ Async Parse Results:');
        console.log('  Message ID:', resultAsync.messageId);
        console.log('  Sender Name:', resultAsync.senderName);
        console.log('  Version:', resultAsync.version);

        const isAsyncMock = resultAsync.messageId === 'TEST_001';
        console.log('🎭 Async is mock data?', isAsyncMock ? '❌ YES' : '✅ NO');
        console.log('');

        // Test sanity check
        console.log('🔍 Testing sanity check...');
        return parser.sanityCheck(xml);
    }).then(sanityResult => {
        console.log('✅ Sanity Check Results:');
        console.log('  Is Valid:', sanityResult.isValid);
        console.log('  Version:', sanityResult.version);
        console.log('  Errors:', sanityResult.errors);
        console.log('  Warnings:', sanityResult.warnings);

        if (sanityResult.isValid) {
            console.log('✅ XML is valid according to sanity check');
        } else {
            console.log('❌ XML failed sanity check');
        }
    }).catch(error => {
        console.error('❌ Async test failed:', error.message);
    });

} catch (error) {
    console.error('❌ Sync test failed:', error.message);
    console.error('Stack trace:', error.stack);
}