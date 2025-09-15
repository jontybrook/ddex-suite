const { DdexParser } = require('./index');

console.log('🎮 Testing with Playground-style DDEX XML');
console.log('==========================================\n');

// Create a more comprehensive DDEX XML like what the playground would use
const playgroundXml = `<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43"
                       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <MessageHeader>
        <MessageId>MSG001_001</MessageId>
        <MessageCreatedDateTime>2024-01-15T10:30:00Z</MessageCreatedDateTime>
        <MessageSender>
            <PartyId namespace="PADPIDA">SENDER001</PartyId>
            <PartyName>Sample Record Label</PartyName>
        </MessageSender>
        <MessageRecipient>
            <PartyId namespace="PADPIDA">RECIP001</PartyId>
            <PartyName>Sample Digital Service Provider</PartyName>
        </MessageRecipient>
    </MessageHeader>
    <ReleaseList>
        <Release>
            <ReleaseId>
                <ISRC>USSM12345678</ISRC>
            </ReleaseId>
            <ReleaseReference>REL001</ReleaseReference>
            <ReleaseType>Album</ReleaseType>
            <ReleaseTitle>
                <TitleText>Sample Album Title</TitleText>
            </ReleaseTitle>
            <ReleaseDetailsByTerritory>
                <TerritoryCode>Worldwide</TerritoryCode>
                <DisplayArtist>
                    <PartyName>Sample Artist</PartyName>
                </DisplayArtist>
            </ReleaseDetailsByTerritory>
        </Release>
    </ReleaseList>
</ern:NewReleaseMessage>`;

console.log('📄 Playground XML Content:');
console.log(playgroundXml);
console.log('\n' + '='.repeat(60) + '\n');

const parser = new DdexParser();

try {
    console.log('🔍 Testing version detection...');
    const version = parser.detectVersion(playgroundXml);
    console.log('✅ Version detected:', version);
    console.log('');

    console.log('⚡ Testing parseSync with playground XML...');
    const result = parser.parseSync(playgroundXml);

    console.log('✅ Parse Results:');
    console.log('  Message ID:', result.messageId);
    console.log('  Message Type:', result.messageType);
    console.log('  Message Date:', result.messageDate);
    console.log('  Sender Name:', result.senderName);
    console.log('  Sender ID:', result.senderId);
    console.log('  Recipient Name:', result.recipientName);
    console.log('  Recipient ID:', result.recipientId);
    console.log('  Version:', result.version);
    console.log('  Profile:', result.profile);
    console.log('  Release Count:', result.releaseCount);
    console.log('  Track Count:', result.trackCount);
    console.log('  Deal Count:', result.dealCount);
    console.log('  Resource Count:', result.resourceCount);
    console.log('  Total Duration:', result.totalDurationSeconds);
    console.log('');

    // Check expectations vs reality
    console.log('🎯 Expected vs Actual Values:');
    console.log('  Expected Message ID: MSG001_001');
    console.log('  Actual Message ID  :', result.messageId);
    console.log('  Expected Sender    : Sample Record Label');
    console.log('  Actual Sender      :', result.senderName);
    console.log('  Expected Recipient : Sample Digital Service Provider');
    console.log('  Actual Recipient   :', result.recipientName);
    console.log('');

    // Verify we're getting real parsed data
    const isMockData = result.messageId === 'TEST_001' && result.senderName === 'Test Sender';
    if (isMockData) {
        console.log('❌ ERROR: Still returning mock data!');
    } else {
        console.log('✅ SUCCESS: Real parsing confirmed!');
        console.log('   - Not returning mock "TEST_001" message ID');
        console.log('   - Not returning mock "Test Sender" sender name');
        console.log('   - Parser is processing actual XML structure');
    }

    // Test with statistics
    console.log('\n📊 Testing with statistics collection...');
    const optionsWithStats = {
        collectStatistics: true,
        fidelityLevel: "balanced"
    };

    const resultWithStats = parser.parseSync(playgroundXml, optionsWithStats);
    if (resultWithStats.statistics) {
        console.log('✅ Statistics collected:');
        console.log('  Parse Time (ms):', resultWithStats.statistics.parseTimeMs);
        console.log('  Memory Used:', resultWithStats.statistics.memoryUsedBytes);
        console.log('  Element Count:', resultWithStats.statistics.elementCount);
        console.log('  Attribute Count:', resultWithStats.statistics.attributeCount);
        console.log('  Extension Count:', resultWithStats.statistics.extensionCount);
    }

    if (resultWithStats.fidelityInfo) {
        console.log('✅ Fidelity Info:');
        console.log('  Fidelity Level:', resultWithStats.fidelityInfo.fidelityLevel);
        console.log('  Canonicalization:', resultWithStats.fidelityInfo.canonicalizationAlgorithm);
        console.log('  Extensions Preserved:', resultWithStats.fidelityInfo.extensionsPreserved);
    }

} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
}