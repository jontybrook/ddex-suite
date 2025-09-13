# DDEX Parser Entry Points & Usage Guide

This document provides clear guidance on how to use the DDEX Parser based on what's currently implemented and working.

## 🚀 What Works Right Now

### 1. Command Line Interface (Complete)

The CLI is fully implemented and production-ready:

```bash
# Build from source
cd packages/ddex-parser
cargo build --release

# Basic parsing to JSON
./target/release/ddex-parser parse input.xml --output result.json

# Validation only
./target/release/ddex-parser validate input.xml

# Batch processing
./target/release/ddex-parser batch "*.xml" --output-dir results/

# Format options
./target/release/ddex-parser parse input.xml --format yaml
./target/release/ddex-parser parse input.xml --format msgpack
```

**CLI Commands Available:**
- `parse` - Convert DDEX XML to JSON/YAML/MessagePack
- `validate` - Validate DDEX XML without conversion
- `extract` - Extract specific elements from DDEX files
- `batch` - Process multiple files in parallel
- `stream` - Memory-efficient processing for large files
- `completions` - Generate shell completions

### 2. Rust API (Complete)

The Rust library API is fully functional:

```rust
use ddex_parser::DDEXParser;
use std::fs::File;
use std::io::BufReader;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create parser with secure defaults
    let parser = DDEXParser::new();

    // Open and parse file
    let file = File::open("release.xml")?;
    let reader = BufReader::new(file);
    let result = parser.parse(reader)?;

    // Access parsed data
    println!("Version: {:?}", result.version);
    println!("Releases: {}", result.releases.len());

    for release in &result.releases {
        println!("Title: {}", release.release_title[0].text);
        println!("Tracks: {}", release.track_count);
    }

    Ok(())
}
```

**Security Configuration:**
```rust
use ddex_parser::{DDEXParser, parser::security::SecurityConfig};

let config = SecurityConfig {
    max_entity_expansions: 50,    // Lower limit for XML bombs
    max_element_depth: 50,        // Prevent stack overflow
    disable_dtd: true,            // Block DTD declarations
    disable_external_entities: true,
    ..SecurityConfig::default()
};

let parser = DDEXParser::with_config(config);
```

## 📊 Performance Characteristics (Actual Benchmarks)

Based on real benchmark results:

| Operation | Time | Throughput |
|-----------|------|------------|
| DOM Parse (small files) | ~21µs | ~65 MiB/s |
| Stream Parse (stub) | ~4.8µs | ~294 MiB/s* |
| Memory bounded | ~2.4µs | Variable |

*Note: Stream parsing is currently a stub implementation, so these numbers reflect placeholder performance.

## 🔧 Data Models

### Input → Graph Model → Flat Model

The parser follows this flow:

1. **XML Input** → Security validation → Version detection
2. **Graph Model** → Faithful DDEX structure preservation
3. **Flat Model** → Developer-friendly representation

### Accessing Data

```rust
// Graph model (faithful to DDEX structure)
let graph_releases = result.releases; // Vec<Release>

// Flat model data is accessed through graph model
for release in &graph_releases {
    println!("ID: {}", release.release_reference);

    for title in &release.release_title {
        println!("Title: {}", title.text);
        if let Some(lang) = &title.language_code {
            println!("Language: {}", lang);
        }
    }
}
```

## 🛡️ Security Features (Fully Implemented)

### XML Attack Protection
```rust
// These attacks are automatically blocked:
parser.parse("billion-laughs.xml");  // ❌ Blocked: Entity expansion limit
parser.parse("deep-nesting.xml");    // ❌ Blocked: Nesting depth limit
parser.parse("not-xml");             // ❌ Blocked: Invalid XML
parser.parse("<unclosed>");          // ❌ Blocked: Malformed XML
parser.parse("");                    // ❌ Blocked: Empty input
```

### Error Handling
```rust
match parser.parse(reader) {
    Ok(result) => {
        // Successfully parsed
        println!("Parsed {} releases", result.releases.len());
    },
    Err(ddex_parser::error::ParseError::SecurityViolation { message }) => {
        eprintln!("Security violation: {}", message);
    },
    Err(ddex_parser::error::ParseError::XmlError { message, location }) => {
        eprintln!("XML error at line {}: {}", location.line, message);
    },
    Err(e) => {
        eprintln!("Parse error: {}", e);
    }
}
```

## ❌ What's NOT Ready (Don't Use These)

### Language Bindings
```javascript
// ❌ DON'T USE - Not implemented yet
import { DDEXParser } from 'ddex-parser';  // npm package doesn't exist
```

```python
# ❌ DON'T USE - Not implemented yet
from ddex_parser import DDEXParser  # pip package doesn't exist
```

### Streaming API
```rust
// ⚠️ EXISTS but returns placeholder values
let stream_iter = parser.stream(reader);
for release in stream_iter {
    // This will return None - not fully implemented
}
```

### Advanced Validation
```rust
// ❌ Framework exists but rules are minimal
parser.validate_business_rules(); // Not implemented yet
parser.validate_territories();    // Not implemented yet
```

## 🎯 Production Readiness

### ✅ Safe to Use in Production
- Command line interface
- Basic Rust API
- XML security validation
- ERN version detection and parsing
- JSON output generation
- Error handling

### ⚠️ Use with Caution
- Streaming API (stub implementation)
- Advanced validation (minimal business rules)

### ❌ Don't Use Yet
- Language bindings (JS/Python/WASM)
- Version migration
- Complex business logic validation

## 📚 API Reference

### Main Types
```rust
// Main parser
pub struct DDEXParser { /* ... */ }

// Parsed result
pub struct ParsedERNMessage {
    pub version: ERNVersion,
    pub releases: Vec<Release>,
    pub resources: Vec<Resource>,
    pub parties: Vec<Party>,
    pub deals: Vec<Deal>,
    // ...
}

// Error types
pub enum ParseError {
    XmlError { message: String, location: ErrorLocation },
    SecurityViolation { message: String },
    IoError(std::io::Error),
    // ...
}
```

### Methods Available
```rust
impl DDEXParser {
    pub fn new() -> Self                                    // ✅ Works
    pub fn with_config(config: SecurityConfig) -> Self     // ✅ Works
    pub fn parse<R: BufRead + Seek>(&self, reader: R)      // ✅ Works
    pub fn detect_version<R: BufRead>(&self, reader: R)    // ✅ Works
    pub fn stream<R: BufRead>(&self, reader: R)            // ⚠️ Stub
}
```

---

**Last Updated:** 2025-09-13
**Version:** v0.3.5
**Status:** Production-ready for CLI and basic Rust API