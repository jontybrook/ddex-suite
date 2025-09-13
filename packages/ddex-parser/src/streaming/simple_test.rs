// src/streaming/simple_test.rs
//! Simple test to verify the streaming parser can be compiled and works

use super::*;
use crate::DDEXParser;
use std::io::Cursor;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_streaming_parser_creation() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<ERNMessage xmlns="http://ddex.net/xml/ern/43">
    <MessageHeader>
        <MessageId>test-message-1</MessageId>
        <MessageCreatedDateTime>2023-01-01T00:00:00</MessageCreatedDateTime>
    </MessageHeader>
</ERNMessage>"#;

        let cursor = Cursor::new(xml.as_bytes());
        let iterator = DDEXStreamIterator::new(cursor, ddex_core::models::versions::ERNVersion::V4_3);

        assert!(!iterator.finished);
        assert!(!iterator.has_error());

        let stats = iterator.stats();
        assert_eq!(stats.elements_yielded, 0);
        assert!(!stats.is_finished);
    }

    #[test]
    fn test_parser_stream_api() {
        let parser = DDEXParser::new();
        let xml = r#"<ERNMessage></ERNMessage>"#;
        let cursor = Cursor::new(xml.as_bytes());

        let _stream_iterator = parser.stream(cursor);
        // Just test that it compiles for now
    }
}

/// Simple implementation that can compile
pub fn create_simple_streaming_parser<R: std::io::BufRead>(
    reader: R,
    version: ddex_core::models::versions::ERNVersion,
) -> Result<DDEXStreamIterator<R>, crate::error::ParseError> {
    let config = StreamingConfig::default();
    Ok(DDEXStreamIterator::with_config(reader, version, config))
}