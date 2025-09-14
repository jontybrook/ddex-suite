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
                    <ern:TitleText>Música internacional 🎵 音楽 μουσική</ern:TitleText>
                </ern:Title>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    assert!(
        result.is_ok(),
        "Mixed language UTF-8 content should parse successfully"
    );
}

#[test]
fn test_utf8_emoji_handling() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG🎵</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER🎤</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT🎶</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL🌟</ern:ReleaseId>
                <ern:ReleaseReference>R🎼</ern:ReleaseReference>
                <ern:Title>
                    <ern:TitleText>Party Time 🎉🎊🥳 Dance Music</ern:TitleText>
                </ern:Title>
                <ern:Artist>DJ 🎧 Emoji</ern:Artist>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    assert!(
        result.is_ok(),
        "Emoji UTF-8 content should parse successfully"
    );
}

#[test]
fn test_utf8_xml_attributes() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG003</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER003</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT003</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL003</ern:ReleaseId>
                <ern:ReleaseReference>R003</ern:ReleaseReference>
                <ern:Title xml:lang="es-MX">
                    <ern:TitleText country="México">Canción Española</ern:TitleText>
                </ern:Title>
                <ern:Title xml:lang="ja-JP">
                    <ern:TitleText country="日本">日本の歌</ern:TitleText>
                </ern:Title>
                <ern:Artist nationality="Ελλάδα">Διονύσιος</ern:Artist>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    assert!(
        result.is_ok(),
        "UTF-8 content in XML attributes should parse successfully"
    );
}

#[test]
fn test_invalid_utf8_handling() {
    // This test creates invalid UTF-8 bytes to test error handling
    let mut xml_bytes = Vec::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG004</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER004</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT004</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL004</ern:ReleaseId>
                <ern:ReleaseReference>R004</ern:ReleaseReference>
                <ern:Title>
                    <ern:TitleText>Bad UTF-8: "#
            .as_bytes(),
    );

    // Insert invalid UTF-8 sequence
    xml_bytes.extend_from_slice(&[0xFF, 0xFE, 0xFD]);

    xml_bytes.extend_from_slice(
        r#"</ern:TitleText>
                </ern:Title>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#
            .as_bytes(),
    );

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(&xml_bytes);
    let result = parser.parse(cursor);

    // Should return an error for invalid UTF-8
    match result {
        Err(ParseError::InvalidUtf8 { .. }) => {
            // Success - we properly detected the invalid UTF-8
        }
        Err(ParseError::XmlError { message, .. }) if message.contains("UTF-8") => {
            // Also acceptable - quick-xml may catch it first
        }
        Err(ParseError::SimpleXmlError(message))
            if message.contains("UTF-8") || message.contains("utf-8") =>
        {
            // Also acceptable - utf8_utils may catch it during unescaping
        }
        other => {
            panic!(
                "Expected InvalidUtf8, UTF-8 XmlError, or UTF-8 SimpleXmlError, got: {:?}",
                other
            );
        }
    }
}

#[test]
fn test_utf8_boundary_conditions() {
    // Test UTF-8 characters at different byte boundaries
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG005</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER005</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT005</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL005</ern:ReleaseId>
                <ern:ReleaseReference>R005</ern:ReleaseReference>
                <ern:Title>
                    <ern:TitleText>𝄞𝄢𝄡 Musical Symbols</ern:TitleText>
                </ern:Title>
                <ern:Artist>𝒜𝓇𝓉𝒾𝓈𝓉</ern:Artist>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    assert!(
        result.is_ok(),
        "4-byte UTF-8 characters should parse successfully"
    );
}

#[test]
fn test_utf8_normalization_forms() {
    // Test different Unicode normalization forms
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG006</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER006</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT006</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL006</ern:ReleaseId>
                <ern:ReleaseReference>R006</ern:ReleaseReference>
                <ern:Title>
                    <ern:TitleText>café vs café</ern:TitleText>
                </ern:Title>
                <ern:Artist>José vs José</ern:Artist>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    assert!(
        result.is_ok(),
        "Different Unicode normalization forms should parse successfully"
    );
}

#[test]
fn test_utf8_streaming_parser() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG_STREAM_UTF8</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER_STREAM</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT_STREAM</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL_STREAM</ern:ReleaseId>
                <ern:ReleaseReference>R_STREAM</ern:ReleaseReference>
                <ern:Title>
                    <ern:TitleText>Streaming 🎵 Café 北京 Test</ern:TitleText>
                </ern:Title>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    // Should work with streaming parser as well
    assert!(
        result.is_ok(),
        "UTF-8 content should work with streaming parser"
    );
}

#[test]
fn test_large_utf8_content() {
    // Test with a larger UTF-8 content to stress test the parser
    let large_title = "🎵".repeat(1000); // 1000 music note emojis
    let xml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG_LARGE</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER_LARGE</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT_LARGE</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL_LARGE</ern:ReleaseId>
                <ern:ReleaseReference>R_LARGE</ern:ReleaseReference>
                <ern:Title>
                    <ern:TitleText>{}</ern:TitleText>
                </ern:Title>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#,
        large_title
    );

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    assert!(
        result.is_ok(),
        "Large UTF-8 content should parse successfully"
    );
}
