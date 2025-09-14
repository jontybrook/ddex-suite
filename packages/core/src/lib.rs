//! DDEX Core - Shared models and types for DDEX Suite

pub mod error;
pub mod ffi;
pub mod models;
pub mod namespace;

// Re-export commonly used types
pub use error::{DDEXError, ErrorLocation};
pub use models::versions::ERNVersion;
pub use namespace::{DDEXStandard, NamespaceInfo, NamespaceRegistry, NamespaceScope};
