const { DdexParser } = require('./index');
const fs = require('fs');
const path = require('path');

console.log('🗺️  Testing IndexMap Conversion to JavaScript');
console.log('============================================\n');

// Load complex DDEX XML
const xmlPath = path.join(__dirname, 'complex_ddex_test.xml');
const complexXml = fs.readFileSync(xmlPath, 'utf8');

const parser = new DdexParser();

try {
    console.log('🔍 Parsing DDEX and examining IndexMap conversion...');
    const result = parser.parseSync(complexXml);

    // Let's examine the entire result structure
    console.log('📊 Full Result Structure Inspection:');
    console.log('  Result type:', typeof result);
    console.log('  Result keys:', Object.keys(result));
    console.log('');

    // Look for resources in different possible locations
    console.log('🔍 Searching for resources data...');

    if (result.resources !== undefined) {
        console.log('✅ Found result.resources:');
        console.log('  Type:', typeof result.resources);
        console.log('  Is Array:', Array.isArray(result.resources));
        console.log('  Content:', result.resources);
    } else {
        console.log('❌ result.resources is undefined');
    }

    // Check if there are other fields that might contain resource data
    const possibleResourceFields = ['resource', 'resourceList', 'soundRecordings', 'tracks'];
    possibleResourceFields.forEach(field => {
        if (result[field] !== undefined) {
            console.log(`✅ Found result.${field}:`, typeof result[field], result[field]);
        }
    });

    console.log('\n📋 Complete Result Object:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n🧪 Testing resource iteration possibilities...');

    // If resources exist as an object (converted from IndexMap)
    if (result.resources && typeof result.resources === 'object' && !Array.isArray(result.resources)) {
        console.log('✅ Resources appear to be an object (converted from IndexMap):');
        const resourceKeys = Object.keys(result.resources);
        console.log('  Resource IDs (keys):', resourceKeys);

        if (resourceKeys.length > 0) {
            console.log('  First resource example:');
            console.log('    ID:', resourceKeys[0]);
            console.log('    Data:', result.resources[resourceKeys[0]]);

            console.log('\n🔄 Iterating over resources:');
            for (const [resourceId, resourceData] of Object.entries(result.resources)) {
                console.log(`    Resource ${resourceId}:`, resourceData);
            }
        }
    }

    // If resources exist as an array
    if (result.resources && Array.isArray(result.resources)) {
        console.log('✅ Resources appear to be an array:');
        console.log('  Resource count:', result.resources.length);
        result.resources.forEach((resource, index) => {
            console.log(`  Resource ${index}:`, resource);
        });
    }

    console.log('\n🎯 IndexMap Conversion Analysis:');
    console.log('• Expected: IndexMap<String, ParsedResource> from Rust');
    console.log('• Actual resourceCount:', result.resourceCount);
    console.log('• Resources in result:', result.resources ? 'Present' : 'Missing');

    if (result.resourceCount > 0 && (!result.resources || Object.keys(result.resources).length === 0)) {
        console.log('❌ ISSUE: resourceCount > 0 but no accessible resource data');
        console.log('💡 This suggests the IndexMap conversion needs improvement');
    }

    // Test with a simpler XML to see if the issue is with complexity
    console.log('\n🧪 Testing with simple XML for comparison...');
    const simpleXml = `<?xml version="1.0"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <MessageHeader>
            <MessageId>SIMPLE_TEST</MessageId>
        </MessageHeader>
    </ern:NewReleaseMessage>`;

    const simpleResult = parser.parseSync(simpleXml);
    console.log('📊 Simple result structure:');
    console.log('  Keys:', Object.keys(simpleResult));
    console.log('  Resource Count:', simpleResult.resourceCount);
    console.log('  Resources:', simpleResult.resources);

} catch (error) {
    console.error('❌ IndexMap conversion test failed:', error.message);
    console.error('Stack trace:', error.stack);
}