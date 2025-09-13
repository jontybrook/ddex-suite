// core/src/lib.rs
use ddex_core::models;
/// DDEX Parser Core Library
pub mod error;
pub mod parser;
pub mod transform;
pub mod streaming;

// Re-export commonly used types
pub use ddex_core::models::versions::ERNVersion;

use serde::{Deserialize, Serialize};
use parser::security::SecurityConfig;
use streaming::{DDEXStreamIterator, ParsedElement};

/// Main DDEX Parser
#[derive(Debug, Clone)]
pub struct DDEXParser {
    config: SecurityConfig,
}

impl Default for DDEXParser {
    fn default() -> Self {
        Self::new()
    }
}

impl DDEXParser {
    /// Create a new parser with default security configuration
    pub fn new() -> Self {
        Self {
            config: SecurityConfig::default(),
        }
    }
    
    /// Create parser with custom security configuration
    pub fn with_config(config: SecurityConfig) -> Self {
        Self { config }
    }
    
    /// Parse DDEX XML from a reader
    pub fn parse<R: std::io::BufRead + std::io::Seek>(
        &self,
        reader: R,
    ) -> Result<ddex_core::models::flat::ParsedERNMessage, error::ParseError> {
        self.parse_with_options(reader, Default::default())
    }
    
    /// Parse with options
    pub fn parse_with_options<R: std::io::BufRead + std::io::Seek>(
        &self,
        reader: R,
        options: parser::ParseOptions,
    ) -> Result<ddex_core::models::flat::ParsedERNMessage, error::ParseError> {
        // Apply security config - check if external entities are disabled and we should block them
        // Note: This security check will be enhanced with XML bomb protection

        parser::parse(reader, options, &self.config)
    }
    
    /// Stream parse for large files using new streaming implementation
    pub fn stream<R: std::io::BufRead>(
        &self,
        reader: R,
    ) -> DDEXStreamIterator<R> {
        // For streaming, we can't detect version from reader without consuming it
        // So we default to V4_3
        let version = ddex_core::models::versions::ERNVersion::V4_3;

        let streaming_config = streaming::StreamingConfig {
            security: self.config.clone(),
            ..Default::default()
        };

        DDEXStreamIterator::with_config(reader, version, streaming_config)
    }

    /// Stream parse with version detection (consumes some input to detect version)
    pub fn stream_with_version_detection<R: std::io::BufRead + std::io::Seek>(
        &self,
        mut reader: R,
    ) -> Result<DDEXStreamIterator<R>, error::ParseError> {
        // Detect version first
        let version = parser::detector::VersionDetector::detect(&mut reader)?;
        reader.seek(std::io::SeekFrom::Start(0))?;

        let streaming_config = streaming::StreamingConfig {
            security: self.config.clone(),
            ..Default::default()
        };

        Ok(DDEXStreamIterator::with_config(reader, version, streaming_config))
    }
    
    /// Detect DDEX version from XML
    pub fn detect_version<R: std::io::BufRead>(
        &self,
        reader: R,
    ) -> Result<ddex_core::models::versions::ERNVersion, error::ParseError> {
        parser::detector::VersionDetector::detect(reader)
    }
    
    /// Perform sanity check on DDEX XML
    pub fn sanity_check<R: std::io::BufRead>(
        &self,
        _reader: R,
    ) -> Result<SanityCheckResult, error::ParseError> {
        // Placeholder for sanity check
        Ok(SanityCheckResult {
            is_valid: true,
            version: ddex_core::models::versions::ERNVersion::V4_3,
            errors: Vec::new(),
            warnings: Vec::new(),
        })
    }
}

// Old StreamIterator removed - now using DDEXStreamIterator from streaming module

/// Result of sanity check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SanityCheckResult {
    pub is_valid: bool,
    pub version: ddex_core::models::versions::ERNVersion,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// Benchmark report support
#[cfg(feature = "bench")]
pub mod bench_report;

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parser_creation() {
        let parser = DDEXParser::new();
        assert!(parser.config.disable_external_entities);
    }
}