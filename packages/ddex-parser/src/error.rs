//! Parser-specific error handling

use ddex_core::error::DDEXError;
use ddex_core::ffi::{FFIError, FFIErrorCategory, FFIErrorSeverity};
use thiserror::Error;

// Re-export ErrorLocation for use in this crate
pub use ddex_core::error::ErrorLocation;

// Define Result type alias
pub type Result<T> = std::result::Result<T, ParseError>;

/// Parser-specific errors
#[derive(Debug, Error, Clone)]
pub enum ParseError {
    #[error("XML parsing error: {message}")]
    XmlError {
        message: String,
        location: ErrorLocation,
    },

    #[error("Unsupported DDEX version: {version}")]
    UnsupportedVersion { version: String },

    #[error("Security violation: {message}")]
    SecurityViolation { message: String },

    #[error("Parse timeout after {seconds} seconds")]
    Timeout { seconds: u64 },

    #[error("Type conversion error: {message}")]
    ConversionError {
        message: String,
        location: ErrorLocation,
    },

    #[error("Core error: {0}")]
    Core(#[from] DDEXError),

    #[error("IO error: {message}")]
    Io { message: String },

    #[error("XML depth limit exceeded: {depth} > {max}")]
    DepthLimitExceeded { depth: usize, max: usize },

    #[error("Invalid UTF-8 encoding at position {position}: {error}")]
    InvalidUtf8 { position: usize, error: String },

    #[error("Mismatched XML tags: expected '{expected}', found '{found}' at position {position}")]
    MismatchedTags {
        expected: String,
        found: String,
        position: usize,
    },

    #[error("Unexpected closing tag '{tag}' at position {position}")]
    UnexpectedClosingTag { tag: String, position: usize },

    #[error("Unclosed XML tags at end of document: {tags:?} at position {position}")]
    UnclosedTags { tags: Vec<String>, position: usize },

    #[error("Malformed XML: {message} at position {position}")]
    MalformedXml { message: String, position: usize },

    #[error("Invalid XML attribute: {message} at position {position}")]
    InvalidAttribute { message: String, position: usize },

    /// Simple XML error variant for compatibility with utf8_utils
    #[error("XML parsing error: {0}")]
    SimpleXmlError(String),
}

impl From<ParseError> for FFIError {
    fn from(err: ParseError) -> Self {
        match err {
            ParseError::Core(core_err) => core_err.into(),
            ParseError::XmlError { message, location } => FFIError {
                code: "PARSE_XML_ERROR".to_string(),
                message,
                location: Some(ddex_core::ffi::FFIErrorLocation {
                    line: location.line,
                    column: location.column,
                    path: location.path,
                }),
                severity: FFIErrorSeverity::Error,
                hint: Some("Check XML syntax".to_string()),
                category: FFIErrorCategory::XmlParsing,
            },
            ParseError::UnsupportedVersion { version } => FFIError {
                code: "UNSUPPORTED_VERSION".to_string(),
                message: format!("Unsupported DDEX version: {}", version),
                location: None,
                severity: FFIErrorSeverity::Error,
                hint: Some("Use ERN 3.8.2, 4.2, or 4.3".to_string()),
                category: FFIErrorCategory::Version,
            },
            ParseError::SecurityViolation { message } => FFIError {
                code: "SECURITY_VIOLATION".to_string(),
                message,
                location: None,
                severity: FFIErrorSeverity::Error,
                hint: Some("Check for XXE or entity expansion attacks".to_string()),
                category: FFIErrorCategory::Validation,
            },
            ParseError::Timeout { seconds } => FFIError {
                code: "PARSE_TIMEOUT".to_string(),
                message: format!("Parse timeout after {} seconds", seconds),
                location: None,
                severity: FFIErrorSeverity::Error,
                hint: Some("File may be too large or complex".to_string()),
                category: FFIErrorCategory::Io,
            },
            ParseError::ConversionError { message, location } => FFIError {
                code: "TYPE_CONVERSION_ERROR".to_string(),
                message,
                location: Some(ddex_core::ffi::FFIErrorLocation {
                    line: location.line,
                    column: location.column,
                    path: location.path,
                }),
                severity: FFIErrorSeverity::Error,
                hint: Some("Check builder state and validation".to_string()),
                category: FFIErrorCategory::Validation,
            },
            ParseError::Io { message } => FFIError {
                code: "IO_ERROR".to_string(),
                message,
                location: None,
                severity: FFIErrorSeverity::Error,
                hint: None,
                category: FFIErrorCategory::Io,
            },
            ParseError::DepthLimitExceeded { depth, max } => FFIError {
                code: "DEPTH_LIMIT_EXCEEDED".to_string(),
                message: format!("XML depth limit exceeded: {} > {}", depth, max),
                location: None,
                severity: FFIErrorSeverity::Error,
                hint: Some("Reduce XML nesting depth to prevent stack overflow".to_string()),
                category: FFIErrorCategory::Validation,
            },
            ParseError::InvalidUtf8 { position, error } => FFIError {
                code: "INVALID_UTF8".to_string(),
                message: format!("Invalid UTF-8 encoding at position {}: {}", position, error),
                location: Some(ddex_core::ffi::FFIErrorLocation {
                    line: 0,
                    column: 0,
                    path: "parser".to_string(),
                }),
                severity: FFIErrorSeverity::Error,
                hint: Some("Ensure the XML file is properly encoded as UTF-8".to_string()),
                category: FFIErrorCategory::XmlParsing,
            },
            ParseError::MismatchedTags {
                expected,
                found,
                position,
            } => FFIError {
                code: "MISMATCHED_TAGS".to_string(),
                message: format!(
                    "Mismatched XML tags: expected '{}', found '{}' at position {}",
                    expected, found, position
                ),
                location: Some(ddex_core::ffi::FFIErrorLocation {
                    line: 0,
                    column: 0,
                    path: "parser".to_string(),
                }),
                severity: FFIErrorSeverity::Error,
                hint: Some(format!(
                    "Ensure opening tag '{}' has matching closing tag",
                    expected
                )),
                category: FFIErrorCategory::XmlParsing,
            },
            ParseError::UnexpectedClosingTag { tag, position } => FFIError {
                code: "UNEXPECTED_CLOSING_TAG".to_string(),
                message: format!("Unexpected closing tag '{}' at position {}", tag, position),
                location: Some(ddex_core::ffi::FFIErrorLocation {
                    line: 0,
                    column: 0,
                    path: "parser".to_string(),
                }),
                severity: FFIErrorSeverity::Error,
                hint: Some(
                    "Remove the unexpected closing tag or add the missing opening tag".to_string(),
                ),
                category: FFIErrorCategory::XmlParsing,
            },
            ParseError::UnclosedTags { tags, position } => FFIError {
                code: "UNCLOSED_TAGS".to_string(),
                message: format!(
                    "Unclosed XML tags at end of document: {:?} at position {}",
                    tags, position
                ),
                location: Some(ddex_core::ffi::FFIErrorLocation {
                    line: 0,
                    column: 0,
                    path: "parser".to_string(),
                }),
                severity: FFIErrorSeverity::Error,
                hint: Some(format!("Add closing tags for: {}", tags.join(", "))),
                category: FFIErrorCategory::XmlParsing,
            },
            ParseError::MalformedXml { message, position } => FFIError {
                code: "MALFORMED_XML".to_string(),
                message: format!("Malformed XML: {} at position {}", message, position),
                location: Some(ddex_core::ffi::FFIErrorLocation {
                    line: 0,
                    column: 0,
                    path: "parser".to_string(),
                }),
                severity: FFIErrorSeverity::Error,
                hint: Some("Check XML syntax and structure".to_string()),
                category: FFIErrorCategory::XmlParsing,
            },
            ParseError::InvalidAttribute { message, position } => FFIError {
                code: "INVALID_ATTRIBUTE".to_string(),
                message: format!(
                    "Invalid XML attribute: {} at position {}",
                    message, position
                ),
                location: Some(ddex_core::ffi::FFIErrorLocation {
                    line: 0,
                    column: 0,
                    path: "parser".to_string(),
                }),
                severity: FFIErrorSeverity::Error,
                hint: Some("Check attribute name and value syntax".to_string()),
                category: FFIErrorCategory::XmlParsing,
            },
            ParseError::SimpleXmlError(message) => FFIError {
                code: "XML_ERROR".to_string(),
                message,
                location: None,
                severity: FFIErrorSeverity::Error,
                hint: Some("Check XML syntax".to_string()),
                category: FFIErrorCategory::XmlParsing,
            },
        }
    }
}

impl From<std::io::Error> for ParseError {
    fn from(err: std::io::Error) -> Self {
        ParseError::Io {
            message: err.to_string(),
        }
    }
}

impl From<std::str::Utf8Error> for ParseError {
    fn from(err: std::str::Utf8Error) -> Self {
        ParseError::XmlError {
            message: format!("UTF-8 encoding error: {}", err),
            location: ErrorLocation {
                line: 0,
                column: 0,
                byte_offset: None,
                path: "parser".to_string(),
            },
        }
    }
}

impl From<quick_xml::events::attributes::AttrError> for ParseError {
    fn from(err: quick_xml::events::attributes::AttrError) -> Self {
        ParseError::XmlError {
            message: format!("XML attribute error: {}", err),
            location: ErrorLocation {
                line: 0,
                column: 0,
                byte_offset: None,
                path: "parser".to_string(),
            },
        }
    }
}

impl From<quick_xml::Error> for ParseError {
    fn from(err: quick_xml::Error) -> Self {
        ParseError::XmlError {
            message: format!("XML parsing error: {}", err),
            location: ErrorLocation {
                line: 0,
                column: 0,
                byte_offset: None,
                path: "parser".to_string(),
            },
        }
    }
}

impl From<String> for ParseError {
    fn from(err: String) -> Self {
        ParseError::XmlError {
            message: err,
            location: ErrorLocation {
                line: 0,
                column: 0,
                byte_offset: None,
                path: "parser".to_string(),
            },
        }
    }
}
