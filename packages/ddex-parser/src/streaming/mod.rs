// src/streaming/mod.rs
//! High-performance streaming DDEX parser implementation

pub mod parser;
pub mod state;
pub mod element;
pub mod iterator;
pub mod minimal;
pub mod comprehensive;
pub mod fixed_comprehensive;
pub mod aligned_comprehensive;
pub mod verification;
pub mod working_impl;
pub mod zero_copy_parser;
pub mod fast_zero_copy;
pub mod parallel_parser;
pub mod fast_streaming_parser;

#[cfg(test)]
pub mod comprehensive_tests;

#[cfg(test)]
pub mod debug_test;

#[cfg(test)]
pub mod perf_analysis;

#[cfg(test)]
pub mod zero_copy_benchmark;

#[cfg(test)]
pub mod parallel_benchmark;

#[cfg(test)]
pub mod consistency_test;

pub use parser::StreamingDDEXParser;
pub use state::{ParserState, ParsingContext};
pub use element::ParsedElement;
pub use iterator::DDEXStreamIterator;
pub use working_impl::{WorkingStreamingParser, WorkingStreamingElement, WorkingStreamIterator, WorkingStreamingStats};
pub use zero_copy_parser::{ZeroCopyParser, ZeroCopyElement, ZeroCopyStreamIterator};
pub use fast_zero_copy::{FastZeroCopyParser, FastZeroCopyIterator};
pub use parallel_parser::{ParallelStreamingParser, ParallelStreamingIterator, ParallelBenchmark};
pub use fast_streaming_parser::{FastStreamingParser, FastStreamingElement, FastElementType, FastStreamingIterator, FastParsingStats, create_fast_parser};

use crate::parser::security::SecurityConfig;

/// Configuration for streaming parser
#[derive(Debug, Clone)]
pub struct StreamingConfig {
    /// Security configuration
    pub security: SecurityConfig,
    /// Buffer size for XML reading
    pub buffer_size: usize,
    /// Maximum memory usage before yielding elements
    pub max_memory: usize,
    /// Chunk size for processing
    pub chunk_size: usize,
    /// Enable progress callbacks
    pub enable_progress: bool,
    /// Progress callback interval (bytes)
    pub progress_interval: u64,
}

impl Default for StreamingConfig {
    fn default() -> Self {
        Self {
            security: SecurityConfig::default(),
            buffer_size: 8192,
            max_memory: 100 * 1024 * 1024, // 100MB
            chunk_size: 100,
            enable_progress: false,
            progress_interval: 1024 * 1024, // 1MB
        }
    }
}

/// Progress information for streaming parsing
#[derive(Debug, Clone)]
pub struct StreamingProgress {
    pub bytes_processed: u64,
    pub elements_parsed: usize,
    pub releases_parsed: usize,
    pub resources_parsed: usize,
    pub parties_parsed: usize,
    pub deals_parsed: usize,
    pub elapsed: std::time::Duration,
    pub estimated_total_bytes: Option<u64>,
    pub current_depth: usize,
    pub memory_usage: usize,
}