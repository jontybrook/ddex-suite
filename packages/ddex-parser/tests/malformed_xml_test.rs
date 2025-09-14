use ddex_parser::parser::security::SecurityConfig;
use ddex_parser::{error::ParseError, DDEXParser};
use std::io::Cursor;

#[test]
fn test_mismatched_opening_closing_tags() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
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
            </ern:WrongTag>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    match result {
        Err(ParseError::MismatchedTags {
            expected, found, ..
        }) => {
            assert_eq!(expected, "Release");
            assert_eq!(found, "WrongTag");
        }
        other => panic!("Expected MismatchedTags error, got: {:?}", other),
    }
}

#[test]
fn test_unexpected_closing_tag() {
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
            </ern:Release>
        </ern:UnexpectedTag>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    match result {
        Err(ParseError::UnexpectedClosingTag { tag, .. }) => {
            assert_eq!(tag, "UnexpectedTag");
        }
        other => panic!("Expected UnexpectedClosingTag error, got: {:?}", other),
    }
}

#[test]
fn test_unclosed_tags() {
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
    <!-- Missing closing tags -->"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    match result {
        Err(ParseError::UnclosedTags { tags, .. }) => {
            assert!(tags.contains(&"Release".to_string()));
            assert!(tags.contains(&"ReleaseList".to_string()));
            assert!(tags.contains(&"NewReleaseMessage".to_string()));
        }
        other => panic!("Expected UnclosedTags error, got: {:?}", other),
    }
}

#[test]
fn test_invalid_element_name() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG004</ern:MessageId>
            <123InvalidName>Invalid</123InvalidName>
        </ern:MessageHeader>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    match result {
        Err(ParseError::MalformedXml { message, .. }) => {
            assert!(message.contains("Invalid element name"));
            assert!(message.contains("123InvalidName"));
        }
        other => panic!("Expected MalformedXml error, got: {:?}", other),
    }
}

#[test]
fn test_duplicate_attributes() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId id="first" id="second">MSG005</ern:MessageId>
        </ern:MessageHeader>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    match result {
        Err(ParseError::InvalidAttribute { message, .. }) => {
            assert!(message.contains("Duplicate attribute"));
            assert!(message.contains("id"));
        }
        other => panic!("Expected InvalidAttribute error, got: {:?}", other),
    }
}

#[test]
fn test_invalid_attribute_characters() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId value="test < invalid">MSG006</ern:MessageId>
        </ern:MessageHeader>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    match result {
        Err(ParseError::InvalidAttribute { message, .. }) => {
            assert!(message.contains("Invalid character in attribute value"));
        }
        other => panic!("Expected InvalidAttribute error, got: {:?}", other),
    }
}

#[test]
fn test_malformed_cdata() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG007</ern:MessageId>
            <ern:Description><![CDATA[This contains ]]> in the middle]]></ern:Description>
        </ern:MessageHeader>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    match result {
        Err(ParseError::MalformedXml { message, .. }) => {
            assert!(message.contains("CDATA section contains ']]>' in the middle"));
        }
        other => panic!("Expected MalformedXml error, got: {:?}", other),
    }
}

#[test]
fn test_empty_element_name() {
    // This test uses a manually constructed byte array to test empty element names
    // since it's hard to construct with valid XML syntax
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG008</ern:MessageId>
            <>Empty</>
        </ern:MessageHeader>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    // This should fail during XML parsing itself, not reach our validator
    match result {
        Err(ParseError::XmlError { .. }) | Err(ParseError::MalformedXml { .. }) => {
            // Either error is acceptable for this malformed case
        }
        other => panic!(
            "Expected parsing error for empty element name, got: {:?}",
            other
        ),
    }
}

#[test]
fn test_nested_elements_depth_tracking() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG009</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER009</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT009</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release>
                <ern:ReleaseId>REL009</ern:ReleaseId>
                <ern:ReleaseReference>R009</ern:ReleaseReference>
                <ern:Title>
                    <ern:TitleText>Valid Nested Structure</ern:TitleText>
                </ern:Title>
            </ern:Release>
        </ern:ReleaseList>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    // This should succeed as it's well-formed XML
    assert!(
        result.is_ok(),
        "Well-formed nested XML should parse successfully"
    );
}

#[test]
fn test_xml_with_comments_and_processing_instructions() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <!-- This is a comment -->
    <?processing-instruction data?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <!-- Another comment -->
            <ern:MessageId>MSG010</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER010</ern:PartyId>
            </ern:MessageSender>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT010</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    // Comments and PIs should be allowed in well-formed XML
    assert!(
        result.is_ok(),
        "XML with comments and processing instructions should parse successfully"
    );
}

#[test]
fn test_self_closing_elements() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG011</ern:MessageId>
            <ern:MessageSender/>
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT011</ern:PartyId>
            </ern:MessageRecipient>
        </ern:MessageHeader>
        <ern:ReleaseList/>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    // Self-closing elements should be valid
    assert!(
        result.is_ok(),
        "XML with self-closing elements should parse successfully"
    );
}

#[test]
fn test_complex_malformed_structure() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG012</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER012</ern:PartyId>
            </ern:MessageRecipient> <!-- Wrong closing tag -->
            <ern:MessageRecipient>
                <ern:PartyId>RECIPIENT012</ern:PartyId>
            </ern:MessageSender> <!-- Wrong closing tag -->
        </ern:MessageHeader>
    </ern:NewReleaseMessage>"#;

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = parser.parse(cursor);

    // Should catch the first mismatched tag
    match result {
        Err(ParseError::MismatchedTags {
            expected, found, ..
        }) => {
            assert_eq!(expected, "MessageSender");
            assert_eq!(found, "MessageRecipient");
        }
        other => panic!("Expected MismatchedTags error, got: {:?}", other),
    }
}

#[test]
fn test_strict_vs_lenient_validation() {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG013</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyId>SENDER013</ern:PartyId>
            </ern:MessageSender>
        </ern:MessageHeader>
    </ern:NewReleaseMessage>"#;

    // Test with strict validation (should pass)
    let mut strict_parser = DDEXParser::with_config(SecurityConfig::strict());
    let cursor = Cursor::new(xml.as_bytes());
    let result = strict_parser.parse(cursor);
    assert!(
        result.is_ok(),
        "Well-formed XML should pass strict validation"
    );

    // Test with default validation (should also pass)
    let mut default_parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());
    let result = default_parser.parse(cursor);
    assert!(
        result.is_ok(),
        "Well-formed XML should pass default validation"
    );
}
