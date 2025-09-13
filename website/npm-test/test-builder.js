const { DdexBuilder } = require('ddex-builder');

async function testBuilder() {
    console.log('Testing ddex-builder npm package...');

    // Test basic builder instantiation
    try {
    const builder = new DdexBuilder();
    console.log('✅ DdexBuilder instantiated successfully');

    // Test with a basic build request
    const buildRequest = {
        version: '4.3',
        message_header: {
            message_thread_id: 'MSG123',
            message_id: 'MSG456',
            message_created_date_time: '2024-01-01T00:00:00',
            message_sender: {
                party_id: 'SENDER123',
                party_name: {
                    full_name: 'Test Sender'
                }
            },
            message_recipient: {
                party_id: 'RECIPIENT123',
                party_name: {
                    full_name: 'Test Recipient'
                }
            }
        },
        update_indicator: 'OriginalMessage',
        is_backfill: false
    };

    const result = await builder.build(buildRequest);
    console.log('✅ Successfully built DDEX XML');
    console.log('Result type:', typeof result);
    console.log('Result keys:', Object.keys(result || {}));

    if (typeof result === 'string') {
        console.log('Generated XML length:', result.length);
        console.log('XML preview:', result.substring(0, 200) + '...');
    } else {
        console.log('Build result:', result);
    }

    } catch (error) {
        console.error('❌ Error testing ddex-builder:', error.message);
        process.exit(1);
    }

    console.log('🎉 ddex-builder npm package test completed successfully!');
}

testBuilder().catch(console.error);