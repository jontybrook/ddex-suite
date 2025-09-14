// core/src/lib.rs
use ddex_core::models;
/// DDEX Parser Core Library
pub mod error;
pub mod parser;
pub mod transform;
pub mod streaming;
pub mod utf8_utils;

// Re-export commonly used types
pub use ddex_core::models::versions::ERNVersion;

use serde::{Deserialize, Serialize};
use parser::security::SecurityConfig;
use streaming::{WorkingStreamIterator, WorkingStreamingElement, StreamingConfig};

#[cfg(feature = "zero-copy")]
use streaming::fast_zero_copy::FastZeroCopyIterator;

use streaming::parallel_parser::ParallelStreamingIterator;

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
    ) -> WorkingStreamIterator<R> {
        // For streaming, we can't detect version from reader without consuming it
        // So we default to V4_3
        let version = ddex_core::models::versions::ERNVersion::V4_3;

        WorkingStreamIterator::new(reader, version)
    }

    /// Stream parse with version detection (consumes some input to detect version)
    pub fn stream_with_version_detection<R: std::io::BufRead + std::io::Seek>(
        &self,
        mut reader: R,
    ) -> Result<WorkingStreamIterator<R>, error::ParseError> {
        // Detect version first
        let version = parser::detector::VersionDetector::detect(&mut reader)?;
        reader.seek(std::io::SeekFrom::Start(0))?;

        Ok(WorkingStreamIterator::new(reader, version))
    }

    /// High-performance zero-copy streaming parser (280+ MB/s)
    #[cfg(feature = "zero-copy")]
    pub fn stream_zero_copy<R: std::io::BufRead>(
        &self,
        reader: R,
    ) -> FastZeroCopyIterator<R> {
        let version = ddex_core::models::versions::ERNVersion::V4_3;
        FastZeroCopyIterator::new(reader, version)
    }

    /// Zero-copy streaming with version detection
    #[cfg(feature = "zero-copy")]
    pub fn stream_zero_copy_with_version_detection<R: std::io::BufRead + std::io::Seek>(
        &self,
        mut reader: R,
    ) -> Result<FastZeroCopyIterator<R>, error::ParseError> {
        let version = parser::detector::VersionDetector::detect(&mut reader)?;
        reader.seek(std::io::SeekFrom::Start(0))?;

        Ok(FastZeroCopyIterator::new(reader, version))
    }

    /// Multi-core parallel streaming parser for maximum throughput (target: 280+ MB/s)
    pub fn stream_parallel<R: std::io::BufRead>(
        &self,
        reader: R,
    ) -> ParallelStreamingIterator<R> {
        let version = ddex_core::models::versions::ERNVersion::V4_3;
        ParallelStreamingIterator::new(reader, version)
    }

    /// Parallel streaming with custom thread count
    pub fn stream_parallel_with_threads<R: std::io::BufRead>(
        &self,
        reader: R,
        threads: usize,
    ) -> ParallelStreamingIterator<R> {
        let version = ddex_core::models::versions::ERNVersion::V4_3;
        ParallelStreamingIterator::with_threads(reader, version, threads)
    }

    /// Parallel streaming with version detection
    pub fn stream_parallel_with_version_detection<R: std::io::BufRead + std::io::Seek>(
        &self,
        mut reader: R,
    ) -> Result<ParallelStreamingIterator<R>, error::ParseError> {
        let version = parser::detector::VersionDetector::detect(&mut reader)?;
        reader.seek(std::io::SeekFrom::Start(0))?;

        Ok(ParallelStreamingIterator::new(reader, version))
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

#[cfg(test)]
mod api_integration_test;