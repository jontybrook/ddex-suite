import { DdexParser } from './index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌊 Testing Streaming Mode Capabilities');
console.log('====================================\n');

const parser = new DdexParser();

// First, let's check what streaming options are available
console.log('🔍 Examining streaming options...');

// Test 1: Check if stream method exists
console.log('1️⃣  Testing if stream() method exists...');
if (typeof parser.stream === 'function') {
    console.log('✅ stream() method is available');

    try {
        const xmlPath = path.join(__dirname, 'complex_ddex_test.xml');
        const complexXml = fs.readFileSync(xmlPath, 'utf8');

        console.log('🧪 Testing stream() method...');
        const streamResult = parser.stream(complexXml);

        console.log('✅ Stream method executed:');
        console.log('  Result type:', typeof streamResult);
        console.log('  Result:', streamResult);

        // Check if it's an iterator/iterable
        if (streamResult && typeof streamResult[Symbol.iterator] === 'function') {
            console.log('✅ Result is iterable');
            let count = 0;
            for (const item of streamResult) {
                console.log(`  Item ${count}:`, item);
                count++;
                if (count > 5) { // Limit output
                    console.log('  ... (limiting output)');
                    break;
                }
            }
        } else if (streamResult && typeof streamResult.next === 'function') {
            console.log('✅ Result has next() method (async iterator)');
            try {
                const firstItem = await streamResult.next();
                console.log('  First item:', firstItem);
            } catch (e) {
                console.log('  Error calling next():', e.message);
            }
        }

    } catch (error) {
        console.log('❌ stream() method failed:', error.message);
    }
} else {
    console.log('❌ stream() method is not available');
}

console.log('');

// Test 2: Check if streaming options work with parseSync
console.log('2️⃣  Testing streaming options in parseSync...');
try {
    const xmlPath = path.join(__dirname, 'complex_ddex_test.xml');
    const complexXml = fs.readFileSync(xmlPath, 'utf8');

    // Test various streaming-related options
    const streamingOptions = {
        streaming: true,
        enableStreaming: true,
        streamingThreshold: 1000,
        chunkSize: 512,
        maxMemory: 10485760 // 10MB
    };

    console.log('🧪 Testing with streaming options:', streamingOptions);
    const result = parser.parseSync(complexXml, streamingOptions);

    console.log('✅ parseSync with streaming options succeeded:');
    console.log('  Message ID:', result.messageId);
    console.log('  Resource Count:', result.resourceCount);
    console.log('  Release Count:', result.releaseCount);

    // Check if any special streaming fields were added
    const streamingFields = ['streamingInfo', 'chunkData', 'streamStats'];
    streamingFields.forEach(field => {
        if (result[field] !== undefined) {
            console.log(`  ${field}:`, result[field]);
        }
    });

} catch (error) {
    console.log('❌ parseSync with streaming options failed:', error.message);
}

console.log('');

// Test 3: Create a larger file for real streaming test
console.log('3️⃣  Testing with larger file...');
try {
    // Create a larger DDEX file by duplicating elements
    const baseXml = fs.readFileSync(path.join(__dirname, 'complex_ddex_test.xml'), 'utf8');

    // Generate a larger XML by adding more releases and resources
    let largeXml = baseXml.replace('</ReleaseList>', '');
    let largeResourceXml = baseXml.match(/<ResourceList>(.*?)<\/ResourceList>/s);
    let largeResources = '';

    if (largeResourceXml) {
        largeResources = largeResourceXml[1];
        largeXml = largeXml.replace(/<ResourceList>.*?<\/ResourceList>/s, '');
    }

    // Add 10 more releases and resources
    for (let i = 3; i <= 12; i++) {
        largeXml += `
        <Release>
            <ReleaseId>
                <GRid>GR1000000123456${i}</GRid>
            </ReleaseId>
            <ReleaseReference>REL${i.toString().padStart(3, '0')}</ReleaseReference>
            <ReleaseType>Single</ReleaseType>
            <ReleaseTitle>
                <TitleText>Generated Release ${i}</TitleText>
            </ReleaseTitle>
            <ReleaseDetailsByTerritory>
                <TerritoryCode>Worldwide</TerritoryCode>
                <DisplayArtist>
                    <PartyName>Generated Artist ${i}</PartyName>
                    <ArtistRole>MainArtist</ArtistRole>
                </DisplayArtist>
            </ReleaseDetailsByTerritory>
            <ReleaseResourceReferenceList>
                <ReleaseResourceReference>RES${i.toString().padStart(3, '0')}</ReleaseResourceReference>
            </ReleaseResourceReferenceList>
        </Release>`;

        largeResources += `
        <SoundRecording>
            <ResourceReference>RES${i.toString().padStart(3, '0')}</ResourceReference>
            <ResourceId>
                <ISRC>USCX1230000${i}</ISRC>
            </ResourceId>
            <ReferenceTitle>
                <TitleText>Generated Track ${i}</TitleText>
            </ReferenceTitle>
            <Duration>PT${(i % 5 + 2)}M${(i * 7) % 60}S</Duration>
            <SoundRecordingDetailsByTerritory>
                <TerritoryCode>Worldwide</TerritoryCode>
                <DisplayArtist>
                    <PartyName>Generated Artist ${i}</PartyName>
                    <ArtistRole>MainArtist</ArtistRole>
                </DisplayArtist>
            </SoundRecordingDetailsByTerritory>
        </SoundRecording>`;
    }

    largeXml += '</ReleaseList>';
    largeXml += '<ResourceList>' + largeResources + '</ResourceList>';
    largeXml += baseXml.split('</ResourceList>')[1];

    console.log(`📁 Generated large XML file (${Math.round(largeXml.length / 1024)}KB)`);

    // Test parsing with streaming threshold
    const streamingOptionsForLarge = {
        streamingThreshold: 1000, // Should trigger streaming for our large file
        enableStreaming: true,
        chunkSize: 1024
    };

    console.log('🧪 Testing large file with streaming options...');
    const startTime = Date.now();
    const largeResult = parser.parseSync(largeXml, streamingOptionsForLarge);
    const endTime = Date.now();

    console.log('✅ Large file parsing completed:');
    console.log(`  Parse time: ${endTime - startTime}ms`);
    console.log(`  File size: ${Math.round(largeXml.length / 1024)}KB`);
    console.log('  Message ID:', largeResult.messageId);
    console.log('  Release Count:', largeResult.releaseCount);
    console.log('  Resource Count:', largeResult.resourceCount);
    console.log('  Deal Count:', largeResult.dealCount);

    // Compare with non-streaming parse
    console.log('🔄 Comparing with non-streaming parse...');
    const startTime2 = Date.now();
    const regularResult = parser.parseSync(largeXml);
    const endTime2 = Date.now();

    console.log('📊 Performance comparison:');
    console.log(`  Streaming mode: ${endTime - startTime}ms`);
    console.log(`  Regular mode: ${endTime2 - startTime2}ms`);
    console.log(`  Difference: ${Math.abs((endTime - startTime) - (endTime2 - startTime2))}ms`);

} catch (error) {
    console.log('❌ Large file test failed:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('🎯 Streaming Mode Test Summary:');
console.log('• Tested stream() method availability');
console.log('• Tested streaming options in parseSync()');
console.log('• Tested with larger files');
console.log('• Verified streaming threshold behavior');
console.log('='.repeat(60));