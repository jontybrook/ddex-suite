use ddex_parser::parser::security::SecurityConfig;
use ddex_parser::{error::ParseError, DDEXParser};
use std::io::Cursor;

#[test]
fn test_utf8_characters_in_titles() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43"
                           xmlns:avs="http://ddex.net/xml/avs"
                           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <ern:MessageHeader>
            <ern:MessageId>MSG001</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER001</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT001</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL001</ern:ReleaseId>
                <ern:ReleaseReference>R001</ern:ReleaseReference>
                <ern:Title>
                    <ern:TitleText>Café ñoño 北京 🎵</ern:TitleText>
                </ern:Title>
                <ern:Artist>Björk</ern:Artist>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor).unwrap();

    // The exact structure and field access depends on the parsed result structure
    // These assertions would need to be adjusted based on the actual structure returned
    // For now, we're just testing that parsing doesn't fail with UTF-8 content
    assert!(!result.flat.message_id.is_empty());
}

#[test]
fn test_utf8_in_artist_names() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG002</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER002</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT002</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL002</ern:ReleaseId>
                <ern:ReleaseReference>R002</ern:ReleaseReference>
                <ern:Title>
                    <ern:TitleText>Test Song</ern:TitleText>
                </ern:Title>
                <ern:Artist>Mötörhead</ern:Artist>
                <ern:Artist>Sigur Rós</ern:Artist>
                <ern:Artist>陈奕迅</ern:Artist>
                <ern:Artist>Δημήτρης</ern:Artist>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    // Should not fail on UTF-8 content
    assert!(
        result.is_ok(),
        "UTF-8 artist names should parse successfully"
    );
}

#[test]
fn test_utf8_mixed_languages() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG_多语言_тест_🌍</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER_λέξη</ern:PartyId>
                <ern:PartyName>
                    <ern:FullName>音楽レーベル Ω</ern:FullName>
                </ern:PartyName>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT_αβγ</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL_世界_🎶</ern:ReleaseId>
                <ern:ReleaseReference>R_тест</ern:ReleaseReference>
                <ern:Title>
