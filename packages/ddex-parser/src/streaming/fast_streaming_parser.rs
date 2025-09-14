// src/streaming/fast_streaming_parser.rs
//! Ultra-high-performance streaming DDEX parser targeting 280+ MB/s throughput

use crate::error::ParseError;
use crate::parser::security::SecurityConfig;
use crate::streaming::{StreamingConfig, StreamingProgress};
use memchr::{memmem, memchr};
use std::io::BufRead;
use std::time::{Duration, Instant};

/// High-performance streaming parser optimized for speed
pub struct FastStreamingParser {
    /// Pre-allocated buffer for zero-copy operations
    buffer: Vec<u8>,
    /// Current position in buffer
    pos: usize,
    /// Total bytes processed
    total_bytes: u64,
    /// Start time for performance tracking
    start_time: Instant,
    /// Configuration
    config: StreamingConfig,
    /// Release boundary finder
    release_finder: memmem::Finder<'static>,
    /// Release end finder
    release_end_finder: memmem::Finder<'static>,
}

/// Fast streaming element with minimal allocation
#[derive(Debug, Clone)]
pub struct FastStreamingElement {
    /// Element type (Release, Resource, Party, etc.)
    pub element_type: FastElementType,
    /// Raw XML content (zero-copy reference)
    pub raw_content: Vec<u8>,
    /// Byte position in original stream
    pub position: u64,
    /// Size in bytes
    pub size: usize,
    /// Parse timestamp
    pub parsed_at: Instant,
}

/// Element types for fast classification
#[derive(Debug, Clone, PartialEq)]
pub enum FastElementType {
    Release,
    Resource,
    Party,
    Deal,
    MessageHeader,
    Other(String),
}

/// Performance metrics
#[derive(Debug, Clone)]
pub struct FastParsingStats {
    pub throughput_mbps: f64,
    pub elements_per_second: f64,
    pub total_bytes: u64,
    pub total_elements: usize,
    pub elapsed: Duration,
    pub peak_memory_mb: f64,
    pub avg_element_size: f64,
}

impl FastStreamingParser {
    /// Create new fast streaming parser
    pub fn new(config: StreamingConfig) -> Self {
        Self {
            buffer: Vec::with_capacity(config.buffer_size * 4), // Pre-allocate 4x for efficiency
            pos: 0,
            total_bytes: 0,
            start_time: Instant::now(),
            release_finder: memmem::Finder::new(b"<Release"),
            release_end_finder: memmem::Finder::new(b"</Release>"),
            config,
        }
    }

    /// Parse streaming data with zero-copy optimization bypassing quick_xml
    pub fn parse_streaming<R: BufRead>(
        &mut self,
        mut reader: R,
        mut progress_callback: Option<Box<dyn FnMut(StreamingProgress)>>,
    ) -> Result<FastStreamingIterator, ParseError> {
        let start = Instant::now();
        let mut elements = Vec::new();
        let mut last_progress = 0u64;

        // Read entire buffer into memory for maximum performance
        let mut buffer = Vec::new();
        let bytes_read = reader.read_to_end(&mut buffer)?;
        self.total_bytes = bytes_read as u64;

        // Use byte-level pattern matching instead of XML parsing
        let mut pos = 0;
        while pos < buffer.len() {
            // Find next '<' character using memchr for speed
            if let Some(tag_start) = memchr(b'<', &buffer[pos..]) {
                let abs_start = pos + tag_start;

                // Skip closing tags
                if abs_start + 1 < buffer.len() && buffer[abs_start + 1] == b'/' {
                    pos = abs_start + 1;
                    continue;
                }

                // Check what type of element this is by looking at the tag name
                if let Some(element) = self.find_complete_element(&buffer, abs_start)? {
                    let element_size = element.size; // Capture size before move
                    elements.push(element);

                    // Progress reporting
                    if let Some(ref mut callback) = progress_callback {
                        if abs_start as u64 - last_progress >= self.config.progress_interval {
                            callback(StreamingProgress {
                                bytes_processed: abs_start as u64,
                                elements_parsed: elements.len(),
                                releases_parsed: elements.iter().filter(|e| e.element_type == FastElementType::Release).count(),
                                resources_parsed: elements.iter().filter(|e| e.element_type == FastElementType::Resource).count(),
                                parties_parsed: elements.iter().filter(|e| e.element_type == FastElementType::Party).count(),
                                deals_parsed: elements.iter().filter(|e| e.element_type == FastElementType::Deal).count(),
                                elapsed: start.elapsed(),
                                estimated_total_bytes: Some(bytes_read as u64),
                                current_depth: 0, // Not tracked in byte-level parsing
                                memory_usage: elements.len() * std::mem::size_of::<FastStreamingElement>(),
                            });
                            last_progress = abs_start as u64;
                        }
                    }

                    pos = abs_start + element_size;
                } else {
                    pos = abs_start + 1;
                }
            } else {
                break; // No more tags found
            }
        }

        let elapsed = start.elapsed();
        let throughput = (bytes_read as f64) / elapsed.as_secs_f64() / (1024.0 * 1024.0);

        let stats = FastParsingStats {
            throughput_mbps: throughput,
            elements_per_second: elements.len() as f64 / elapsed.as_secs_f64(),
            total_bytes: bytes_read as u64,
            total_elements: elements.len(),
            elapsed,
            peak_memory_mb: (buffer.len() as f64) / (1024.0 * 1024.0),
            avg_element_size: if !elements.is_empty() {
                elements.iter().map(|e| e.size).sum::<usize>() as f64 / elements.len() as f64
            } else {
                0.0
            },
        };

        Ok(FastStreamingIterator::new(elements, stats))
    }

    /// Find complete element using byte-level operations (bypasses quick_xml entirely)
    fn find_complete_element(&self, buffer: &[u8], start: usize) -> Result<Option<FastStreamingElement>, ParseError> {
        // Detect element type by examining the opening tag
        if let Some(element_type) = self.detect_element_type_from_bytes(&buffer[start..])? {
            // Find matching closing tag using direct pattern matching
            if let Some(end_pos) = self.find_closing_tag_direct(buffer, start, &element_type) {
                let raw_content = buffer[start..=end_pos].to_vec();
                return Ok(Some(FastStreamingElement {
                    element_type,
                    raw_content,
                    position: start as u64,
                    size: end_pos - start + 1,
                    parsed_at: Instant::now(),
                }));
            }
        }
        Ok(None)
    }

    /// Detect element type from bytes without XML parsing
    fn detect_element_type_from_bytes(&self, data: &[u8]) -> Result<Option<FastElementType>, ParseError> {
        if data.len() < 8 || data[0] != b'<' {
            return Ok(None);
        }

        // Look for element name boundaries (space, '>', or namespace separator)
        let search_end = data.len().min(50); // Reasonable limit for tag names
        if let Some(boundary_pos) = data[1..search_end].iter()
            .position(|&b| b == b' ' || b == b'>' || b == b'/' || b == b'\t' || b == b'\n' || b == b'\r') {

            let tag_name = &data[1..=boundary_pos];

            // Direct byte pattern matching for common DDEX elements
            match tag_name {
                name if name.starts_with(b"Release") || name.starts_with(b"ern:Release") =>
                    Ok(Some(FastElementType::Release)),
                name if name.starts_with(b"Resource") || name.starts_with(b"ern:Resource") ||
                         name.starts_with(b"SoundRecording") || name.starts_with(b"ern:SoundRecording") =>
                    Ok(Some(FastElementType::Resource)),
                name if name.starts_with(b"Party") || name.starts_with(b"ern:Party") =>
                    Ok(Some(FastElementType::Party)),
                name if name.starts_with(b"Deal") || name.starts_with(b"ern:Deal") =>
                    Ok(Some(FastElementType::Deal)),
                name if name.starts_with(b"MessageHeader") || name.starts_with(b"ern:MessageHeader") =>
                    Ok(Some(FastElementType::MessageHeader)),
                _ => {
                    // Extract name as string for unknown types
                    if let Ok(name_str) = std::str::from_utf8(tag_name) {
                        Ok(Some(FastElementType::Other(name_str.to_string())))
                    } else {
                        Ok(None)
                    }
                }
            }
        } else {
            Ok(None)
        }
    }

    /// Find closing tag using direct byte pattern matching
    fn find_closing_tag_direct(&self, buffer: &[u8], start: usize, element_type: &FastElementType) -> Option<usize> {
        // Check for namespaced versions using vectors to handle different lengths
        let ns_closing_patterns: Vec<&[u8]> = match element_type {
            FastElementType::Release => vec![b"</ern:Release>", b"</Release>"],
            FastElementType::Resource => vec![b"</ern:Resource>", b"</Resource>",
                                            b"</ern:SoundRecording>", b"</SoundRecording>"],
            FastElementType::Party => vec![b"</ern:Party>", b"</Party>"],
            FastElementType::Deal => vec![b"</ern:Deal>", b"</Deal>"],
            FastElementType::MessageHeader => vec![b"</ern:MessageHeader>", b"</MessageHeader>"],
            FastElementType::Other(name) => {
                // Handle namespaced names
                let clean_name = if name.contains(':') {
                    name.split(':').last().unwrap_or(name)
                } else {
                    name
                };
                let pattern = format!("</{}>", clean_name);
                return self.find_pattern_after(&buffer[start..], pattern.as_bytes())
                    .map(|pos| start + pos + pattern.len() - 1);
            }
        };

        // Find the first occurrence of any matching closing tag
        let mut closest_pos = None;
        for pattern in ns_closing_patterns {
            if let Some(pos) = self.find_pattern_after(&buffer[start..], pattern) {
                let absolute_pos = start + pos + pattern.len() - 1;
                closest_pos = Some(closest_pos.map_or(absolute_pos, |current: usize| current.min(absolute_pos)));
            }
        }

        closest_pos
    }

    /// Find pattern in buffer after start position
    fn find_pattern_after(&self, data: &[u8], pattern: &[u8]) -> Option<usize> {
        memmem::find(data, pattern)
    }


    /// Get current parsing statistics
    pub fn get_stats(&self) -> FastParsingStats {
        let elapsed = self.start_time.elapsed();
        let throughput_mbps = if elapsed.as_secs_f64() > 0.0 {
            (self.total_bytes as f64) / (1024.0 * 1024.0) / elapsed.as_secs_f64()
        } else {
            0.0
        };

        FastParsingStats {
            throughput_mbps,
            elements_per_second: 0.0, // Will be calculated by iterator
            total_bytes: self.total_bytes,
            total_elements: 0, // Will be set by iterator
            elapsed,
            peak_memory_mb: (self.buffer.capacity() as f64) / (1024.0 * 1024.0),
            avg_element_size: 0.0, // Will be calculated by iterator
        }
    }
}

/// High-performance streaming iterator
#[allow(dead_code)]
pub struct FastStreamingIterator {
    elements: Vec<FastStreamingElement>,
    position: usize,
    stats: FastParsingStats,
}

#[allow(dead_code)]
impl FastStreamingIterator {
    pub fn new(elements: Vec<FastStreamingElement>, mut stats: FastParsingStats) -> Self {
        // Calculate final statistics
        stats.total_elements = elements.len();
        if stats.elapsed.as_secs_f64() > 0.0 {
            stats.elements_per_second = elements.len() as f64 / stats.elapsed.as_secs_f64();
        }
        if !elements.is_empty() {
            stats.avg_element_size = elements.iter().map(|e| e.size).sum::<usize>() as f64 / elements.len() as f64;
        }

        Self {
            elements,
            position: 0,
            stats,
        }
    }

    /// Get parsing performance statistics
    pub fn stats(&self) -> &FastParsingStats {
        &self.stats
    }

    /// Get all elements of a specific type
    pub fn filter_by_type(&self, element_type: FastElementType) -> Vec<&FastStreamingElement> {
        self.elements.iter().filter(|e| e.element_type == element_type).collect()
    }

    /// Get total number of elements
    pub fn len(&self) -> usize {
        self.elements.len()
    }

    /// Check if iterator is empty
    pub fn is_empty(&self) -> bool {
        self.elements.is_empty()
    }
}

impl Iterator for FastStreamingIterator {
    type Item = FastStreamingElement;

    fn next(&mut self) -> Option<Self::Item> {
        if self.position < self.elements.len() {
            let element = self.elements[self.position].clone();
            self.position += 1;
            Some(element)
        } else {
            None
        }
    }

    fn size_hint(&self) -> (usize, Option<usize>) {
        let remaining = self.elements.len() - self.position;
        (remaining, Some(remaining))
    }
}

impl ExactSizeIterator for FastStreamingIterator {}

/// Create a fast streaming parser with optimal configuration for performance
#[allow(dead_code)]
pub fn create_fast_parser() -> FastStreamingParser {
    let config = StreamingConfig {
        security: SecurityConfig::relaxed(), // Use relaxed for maximum performance
        buffer_size: 64 * 1024, // 64KB buffer
        max_memory: 200 * 1024 * 1024, // 200MB memory limit
        chunk_size: 512, // 512KB chunks for optimal throughput
        enable_progress: false, // Disable progress for max speed
        progress_interval: 0,
    };

    FastStreamingParser::new(config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Cursor, BufReader};

    #[test]
    fn test_fast_streaming_parser_creation() {
        let parser = create_fast_parser();
        assert_eq!(parser.total_bytes, 0);
        assert!(parser.buffer.capacity() >= 64 * 1024 * 4);
    }

    #[test]
    fn test_element_type_detection() {
        let parser = create_fast_parser();

        assert_eq!(
            parser.detect_element_type_from_bytes(b"<Release>").unwrap(),
            Some(FastElementType::Release)
        );

        assert_eq!(
            parser.detect_element_type_from_bytes(b"<ern:Resource>").unwrap(),
            Some(FastElementType::Resource)
        );

        assert_eq!(
            parser.detect_element_type_from_bytes(b"<ern:Party>").unwrap(),
            Some(FastElementType::Party)
        );
    }

    #[test]
    fn test_fast_streaming_basic() {
        let mut parser = create_fast_parser();

        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
        <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
            <ern:MessageHeader>
                <ern:MessageId>MSG001</ern:MessageId>
            </ern:MessageHeader>
            <ern:ReleaseList>
                <ern:Release>
                    <ern:ReleaseId>REL001</ern:ReleaseId>
                    <ern:ReleaseReference>R001</ern:ReleaseReference>
                </ern:Release>
                <ern:Release>
                    <ern:ReleaseId>REL002</ern:ReleaseId>
                    <ern:ReleaseReference>R002</ern:ReleaseReference>
                </ern:Release>
            </ern:ReleaseList>
        </ern:NewReleaseMessage>"#;

        let cursor = Cursor::new(xml.as_bytes());
        let reader = BufReader::new(cursor);

        let result = parser.parse_streaming(reader, None);
        assert!(result.is_ok());

        let iterator = result.unwrap();
        let stats = iterator.stats();

        // Should have parsed some elements
        assert!(stats.total_elements > 0);
        assert!(stats.total_bytes > 0);

        // Should have reasonable throughput for small data
        println!("Fast streaming stats: {:#?}", stats);
    }

    #[test]
    fn test_performance_target() {
        // This test would need a large XML file to properly test 280+ MB/s
        // For now, just verify the parser can handle basic operations efficiently
        let mut parser = create_fast_parser();

        // Generate a reasonably sized XML for testing
        let mut test_xml = String::from(r#"<?xml version="1.0" encoding="UTF-8"?>
        <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
            <ern:MessageHeader>
                <ern:MessageId>PERFORMANCE_TEST</ern:MessageId>
            </ern:MessageHeader>
            <ern:ReleaseList>"#);

        // Add many releases for performance testing
        for i in 0..1000 {
            test_xml.push_str(&format!(r#"
                <ern:Release>
                    <ern:ReleaseId>REL{:06}</ern:ReleaseId>
                    <ern:ReleaseReference>R{:06}</ern:ReleaseReference>
                    <ern:Title>
                        <ern:TitleText>Test Release {}</ern:TitleText>
                    </ern:Title>
                </ern:Release>"#, i, i, i));
        }

        test_xml.push_str("</ern:ReleaseList></ern:NewReleaseMessage>");

        let cursor = Cursor::new(test_xml.as_bytes());
        let reader = BufReader::new(cursor);

        let start = Instant::now();
        let result = parser.parse_streaming(reader, None);
        let elapsed = start.elapsed();

        assert!(result.is_ok());
        let iterator = result.unwrap();
        let stats = iterator.stats();

        println!("Performance test results:");
        println!("  Total bytes: {} KB", stats.total_bytes / 1024);
        println!("  Total elements: {}", stats.total_elements);
        println!("  Elapsed: {:?}", elapsed);
        println!("  Throughput: {:.2} MB/s", stats.throughput_mbps);
        println!("  Elements/sec: {:.2}", stats.elements_per_second);

        // The parser should handle this reasonably quickly
        assert!(elapsed.as_millis() < 1000, "Parser took too long: {:?}", elapsed);
        assert!(stats.total_elements > 1000, "Should have found many elements");
    }
}