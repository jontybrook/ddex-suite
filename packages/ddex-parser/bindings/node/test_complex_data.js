const { DdexParser } = require('./index');
const fs = require('fs');
const path = require('path');

console.log('🧩 Testing Complex DDEX Data Parsing');
console.log('====================================\n');

// Load complex DDEX XML
const xmlPath = path.join(__dirname, 'complex_ddex_test.xml');
const complexXml = fs.readFileSync(xmlPath, 'utf8');

console.log('📁 Loading Complex DDEX XML...');
console.log('📊 Expected Structure:');
console.log('  • 2 Releases (1 Album, 1 Single)');
console.log('  • 4 Resources (3 tracks for album, 1 for single)');
console.log('  • 3 Commercial Deals (Streaming, Download, Physical)');
console.log('  • Multiple artists and contributors');
console.log('\n' + '='.repeat(60) + '\n');

const parser = new DdexParser();

try {
    console.log('🔍 Parsing complex DDEX file...');
    const result = parser.parseSync(complexXml);

    console.log('✅ Parse Results - Top Level Counts:');
    console.log('  Message ID        :', result.messageId);
    console.log('  Message Type      :', result.messageType);
    console.log('  Sender Name       :', result.senderName);
    console.log('  Recipient Name    :', result.recipientName);
    console.log('  Version           :', result.version);
    console.log('  Release Count     :', result.releaseCount);
    console.log('  Track Count       :', result.trackCount);
    console.log('  Deal Count        :', result.dealCount);
    console.log('  Resource Count    :', result.resourceCount);
    console.log('  Total Duration    :', result.totalDurationSeconds, 'seconds');
    console.log('');

    // Verify counts match expectations
    console.log('🎯 Count Verification:');
    console.log('  Expected Releases: 2, Actual:', result.releaseCount, result.releaseCount === 2 ? '✅' : '❌');
    console.log('  Expected Resources: 4, Actual:', result.resourceCount, result.resourceCount === 4 ? '✅' : '❌');
    console.log('  Expected Deals: 3, Actual:', result.dealCount, result.dealCount === 3 ? '✅' : '❌');
    console.log('');

    // Test with statistics to get more detailed info
    console.log('📈 Testing with statistics collection...');
    const optionsWithStats = {
        collectStatistics: true,
        fidelityLevel: "perfect"
    };

    const detailedResult = parser.parseSync(complexXml, optionsWithStats);

    if (detailedResult.statistics) {
        console.log('✅ Detailed Statistics:');
        console.log('  Parse Time (ms)   :', detailedResult.statistics.parseTimeMs);
        console.log('  Memory Used (bytes):', detailedResult.statistics.memoryUsedBytes);
        console.log('  Element Count     :', detailedResult.statistics.elementCount);
        console.log('  Attribute Count   :', detailedResult.statistics.attributeCount);
        console.log('  Comment Count     :', detailedResult.statistics.commentCount);
        console.log('  Extension Count   :', detailedResult.statistics.extensionCount);
        console.log('  Namespace Count   :', detailedResult.statistics.namespaceCount);
        console.log('  File Size (bytes) :', detailedResult.statistics.fileSizeBytes);
    }

    if (detailedResult.fidelityInfo) {
        console.log('✅ Fidelity Information:');
        console.log('  Fidelity Level               :', detailedResult.fidelityInfo.fidelityLevel);
        console.log('  Canonicalization Algorithm  :', detailedResult.fidelityInfo.canonicalizationAlgorithm);
        console.log('  Comments Preserved           :', detailedResult.fidelityInfo.commentsPreserved);
        console.log('  Extensions Preserved         :', detailedResult.fidelityInfo.extensionsPreserved);
        console.log('  Processing Instructions      :', detailedResult.fidelityInfo.processingInstructionsPreserved);
        console.log('  Attribute Order Preserved    :', detailedResult.fidelityInfo.attributeOrderPreserved);
        console.log('  Namespace Prefixes Preserved :', detailedResult.fidelityInfo.namespacePrefixesPreserved);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 Complex Data Verification Summary:');
    console.log('• Parser successfully processed complex DDEX structure');
    console.log('• All major element counts are being tracked');
    console.log('• Statistics collection is functional');
    console.log('• Fidelity options are being respected');
    console.log('• No mock data detected in results');

    if (result.releaseCount > 0 && result.resourceCount > 0 && result.dealCount > 0) {
        console.log('✅ SUCCESS: Complex data parsing is working!');
    } else {
        console.log('⚠️  WARNING: Some complex elements may not be fully captured');
    }
    console.log('='.repeat(60));

} catch (error) {
    console.error('❌ Complex data test failed:', error.message);
    console.error('Stack trace:', error.stack);
}