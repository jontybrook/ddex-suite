const { DdexBuilder } = require('ddex-builder');

async function checkXML() {
    const builder = new DdexBuilder();

    const buildRequest = {
        version: '4.3',
        message_header: {
            message_thread_id: 'INTEGRATION_TEST_123',
            message_id: 'INTEGRATION_MSG_456',
            message_created_date_time: '2024-09-12T21:00:00',
            message_sender: {
                party_id: 'SENDER_123',
                party_name: {
                    full_name: 'Integration Test Sender'
                }
            },
            message_recipient: {
                party_id: 'RECIPIENT_123',
                party_name: {
                    full_name: 'Integration Test Recipient'
                }
            }
        },
        update_indicator: 'OriginalMessage',
        is_backfill: false
    };

    const xml = await builder.build(buildRequest);
    console.log('Generated XML:');
    console.log('='.repeat(60));
    console.log(xml);
    console.log('='.repeat(60));
}

checkXML().catch(console.error);