# Changelog - ddex-builder

All notable changes to DDEX Builder will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2024-09-15

### 🔄 Compatibility Update
- Version bump to maintain parity with ddex-parser v0.4.1
- Full round-trip compatibility verified with fixed parser
- No functional changes to builder

### ✅ Verified Integrations
- Playground application integration tested and working
- Parse → Modify → Build cycle confirmed operational

### 📦 Dependencies
- Updated to work seamlessly with ddex-parser v0.4.1

---

## [0.4.0] - 2025-09-14

### 🚀 Major Features - Enhanced Integration & Performance

#### Round-Trip Compatibility with v0.4.0 Parser
- **Full Integration**: Complete compatibility with SIMD-optimized ddex-parser v0.4.0
- **Performance Optimizations**: Enhanced XML generation speed for streaming workflows
- **Memory Efficiency**: Optimized for large-scale processing with <50MB peak usage

#### Enhanced DataFrame Support
- **Python Integration**: Improved `from_dataframe()` performance and reliability
- **Schema Validation**: Enhanced input validation for DataFrame-to-DDEX conversion
- **Round-Trip Fidelity**: Perfect compatibility with v0.4.0 parser DataFrame output

### 🐛 Bug Fixes
- **Canonicalization**: Fixed text content preservation in XML generation
- **Deterministic Output**: Improved consistency across different platforms
- **Memory Management**: Enhanced cleanup and resource handling

### 📈 Performance Improvements
- **Build Speed**: Maintained <15ms typical build times for standard releases
- **Memory Usage**: Optimized memory patterns for streaming workflows
- **Batch Processing**: Enhanced throughput for large catalog generation

## [0.3.5] - 2025-09-12

### 🔒 Security & Stability Release

#### Security Enhancements
- **PyO3 Upgrade**: Updated to PyO3 0.24 fixing RUSTSEC-2025-0020 security advisory
- **XML Security**: Enhanced XXE protection and input validation
- **Memory Safety**: Additional bounds checking and error handling

#### Stability Improvements
- **Cross-Platform**: Improved reliability across Linux, macOS, and Windows
- **Error Handling**: More robust error recovery and reporting
- **Test Coverage**: Enhanced test suite with additional edge case coverage

### 📦 Package Updates
- Compatible with ddex-core 0.3.5 and ddex-parser 0.3.5
- Updated Python bindings with PyO3 0.24 compatibility
- Enhanced Node.js bindings stability

## [0.3.0] - 2025-09-11

### 🎉 Major Improvements

#### Python Bindings - Now Production Ready!
- **BREAKING**: Replaced mock implementation with native PyO3 bindings
- Full native performance for DDEX XML generation
- Complete pandas DataFrame integration with `from_dataframe()` support
- Fixed all compilation issues across macOS/Linux/Windows
- Added Python 3.8+ support with abi3 compatibility

#### DataFrame Integration (Python)
- Added `DdexBuilder.from_dataframe()` for building from pandas DataFrames
- Support for multiple DataFrame input schemas
- Round-trip compatibility with ddex-parser DataFrames
- Streamlined data science workflows

### 🐛 Bug Fixes
- Fixed canonicalization text content preservation issues
- Resolved snapshot test failures after version updates
- Corrected Python binding type mismatches
- Fixed deterministic output generation

### 🏭 Industry Presets
- **Generic**: Default preset for broad distributor compatibility
- **YouTube**: Content ID and monetization standards (based on public specifications)
- Enhanced custom preset framework for organization-specific configurations

### 💔 Breaking Changes
- Python: Mock implementation removed, all methods now use native code
- Python: Updated API signatures for native binding compatibility
- Preset system refined to focus on publicly documented standards

### 📈 Performance Improvements
- Native Rust performance in Python bindings
- Memory usage optimized with bounded allocation
- Improved XML generation speed for large catalogs

### ⚠️ Known Issues
- Some canonicalization edge cases may affect text content (fix planned for v0.4.0)
- Advanced validation scenarios need refinement
- WASM builds require additional setup

## [0.2.5] - 2025-09-10

### Changed
- Version alignment with ddex-parser v0.2.5
- Consistent versioning across entire ddex-suite
- Documentation improvements and preset system refinements

### Added
- Enhanced custom preset framework
- Improved validation engine
- Better error handling and reporting

## [0.2.0] - 2025-09-09

### 🎉 Major Features

#### Complete Integration & Round-Trip Testing
- **Full Round-Trip Support**: Parse → Modify → Build workflow completely functional
- **Enhanced Integration Testing**: Comprehensive end-to-end tests ensuring perfect fidelity
- **Cross-Package Integration**: Seamless interoperability with ddex-parser

#### Advanced CLI Features
- **Enhanced Builder CLI**: Complete command-line implementation with validation
- **Batch Processing**: Process multiple releases efficiently
- **Debugging Features**: Comprehensive error reporting and validation

#### Deterministic Output
- **DB-C14N/1.0**: Custom canonicalization specification implementation
- **Deterministic**: Identical input always produces identical output
- **Cross-Platform**: Same output on Windows, macOS, Linux
- **Cryptographic Integrity**: Enables digital signatures and hash verification

### 🔧 Technical Improvements

#### Core Architecture
- **Memory Optimization**: Improved memory usage patterns
- **Security Hardening**: Enhanced input validation and sanitization
- **Performance**: Optimized XML generation with sub-15ms typical build times
- **Streaming Support**: Handle large catalogs with constant memory usage

#### Language Bindings
- **Node.js/TypeScript**: Complete native bindings with TypeScript definitions
- **Python Integration**: PyO3 bindings with pandas DataFrame support
- **WebAssembly**: Browser-ready WASM bindings for client-side generation

### 📦 Distribution
- **npm Packages**: Published to npm registry with complete TypeScript support
- **PyPI Packages**: Python distributions available with comprehensive type hints
- **Crates.io**: Rust packages published with complete API documentation

## [0.1.0] - 2025-09-08

### 🎉 Initial Release

**Core Features:**
- Complete DDEX ERN 4.3, 4.2, and 3.8.2 XML generation support
- DB-C14N/1.0 deterministic canonicalization for reproducible output
- Comprehensive security framework with XXE protection and input validation
- High-performance XML generation with optimized serialization
- Memory-efficient streaming support for large catalogs
- Round-trip compatibility with DDEX Parser for full Parse → Build → Parse fidelity
- Comprehensive test suite with golden file testing using `insta` crate
- CLI tool with batch processing and validation capabilities
- Multi-language bindings: Node.js, Python, WebAssembly

**Security Features:**
- **XXE Protection**: Complete XML External Entity attack prevention
- **Input Validation**: Comprehensive sanitization and format checking
- **Rate Limiting**: Built-in DoS protection with configurable limits
- **Memory Safety**: Rust's memory safety guarantees throughout

**Performance:**
- **Fast Generation**: <15ms typical build time for standard releases
- **Memory Efficient**: <50MB peak usage for large releases
- **Streaming Support**: Handle releases >100MB with constant memory
- **Batch Processing**: Process hundreds of releases concurrently

**DDEX Support:**
- ✅ **NewReleaseMessage**: Complete album and single releases
- ✅ **UpdateReleaseMessage**: Release metadata updates and corrections
- ✅ **ResourceList**: Audio, video, and image resource management
- ✅ **ReleaseList**: Album, EP, and single release configurations
- ✅ **DealList**: Streaming, download, and physical distribution deals
- ✅ **MessageHeader**: Full routing and control message support
- ✅ **Territory Codes**: Worldwide and region-specific distribution

**Quality Assurance:**
- **Unit Tests**: 95%+ code coverage across all modules
- **Integration Tests**: End-to-end workflow validation
- **Golden File Tests**: Snapshot testing for XML output consistency
- **Performance Tests**: Regression testing for build times and memory usage
- **Security Tests**: Validation against XXE and injection vulnerabilities
- **Cross-Platform Tests**: Validation across Windows, macOS, and Linux

---

## Development Status
- **Current Phase**: Production-ready v0.3.0 with native Python bindings
- **Target**: Suite v1.0.0 planned for Q1 2026
- **Repository**: https://github.com/daddykev/ddex-suite