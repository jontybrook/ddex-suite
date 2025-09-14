//! Type definitions for the linker module

use std::fmt;

/// Type of entity being linked
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum EntityType {
    /// Release entity
    Release,
    /// Resource entity (audio, video, etc.)
    Resource,
    /// Party entity (artist, label, etc.)
    Party,
    /// Deal entity
    Deal,
    /// Technical details
    TechnicalDetails,
    /// Rights controller
    RightsController,
}

impl fmt::Display for EntityType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Release => write!(f, "Release"),
            Self::Resource => write!(f, "Resource"),
            Self::Party => write!(f, "Party"),
            Self::Deal => write!(f, "Deal"),
            Self::TechnicalDetails => write!(f, "TechnicalDetails"),
            Self::RightsController => write!(f, "RightsController"),
        }
    }
}

/// Reference generation style
#[derive(Debug, Clone)]
pub enum ReferenceStyle {
    /// Sequential numbering (A1, A2, R1, R2)
    Sequential,

    /// Reference format with custom separator
    Prefixed {
        /// Separator character(s) between prefix and ID
        separator: String,
    },

    /// Custom formatter function
    Custom(fn(EntityType, u32) -> String),
}

impl Default for ReferenceStyle {
    fn default() -> Self {
        Self::Sequential
    }
}

/// Configuration for the reference linker
#[derive(Debug, Clone)]
pub struct LinkerConfig {
    /// Reference generation style
    pub reference_style: ReferenceStyle,

    /// Enable auto-linking
    pub auto_link: bool,

    /// Validate references on build
    pub validate_on_build: bool,

    /// Strict mode (fail on warnings)
    pub strict: bool,
}

impl Default for LinkerConfig {
    fn default() -> Self {
        Self {
            reference_style: ReferenceStyle::default(),
            auto_link: true,
            validate_on_build: true,
            strict: false,
        }
    }
}

/// Link between release and resource
#[derive(Debug, Clone)]
pub struct ResourceLink {
    /// Reference to the release
    pub release_reference: String,
    /// Reference to the resource
    pub resource_reference: String,
    /// Sequence number in the release
    pub sequence_number: u32,
}

/// Release-Resource reference mapping
#[derive(Debug, Clone)]
pub struct ReleaseResourceReference {
    /// Reference to the parent release
    pub release_reference: String,
    /// Reference to the linked resource
    pub resource_reference: String,
    /// Sequence number in the release
    pub sequence_number: u32,
}

/// Statistics for linking operation
#[derive(Debug, Default)]
pub struct LinkingStats {
    /// Number of references generated
    pub generated_refs: usize,
    /// Number of resources linked
    pub linked_resources: usize,
    /// Number of deals linked
    pub linked_deals: usize,
    /// Number of parties linked
    pub linked_parties: usize,
    /// Whether validation passed
    pub validation_passed: bool,
    /// List of warnings generated
    pub warnings: Vec<String>,
}

/// Report from auto-linking process
#[derive(Debug, Clone, Default)]
pub struct LinkingReport {
    /// Number of references generated
    pub generated_refs: usize,
    /// Number of resources successfully linked
    pub linked_resources: usize,
    /// Number of deals successfully linked
    pub linked_deals: usize,
    /// Number of parties successfully linked
    pub linked_parties: usize,
    /// Whether all validations passed
    pub validation_passed: bool,
    /// List of warnings generated during linking
    pub warnings: Vec<String>,
}

/// Linking errors
#[derive(Debug, thiserror::Error)]
pub enum LinkingError {
    /// Reference to unknown resource
    #[error("Unknown resource: {0}")]
    UnknownResource(String),
    /// Reference to unknown release
    #[error("Unknown release: {0}")]
    UnknownRelease(String),
    /// Reference without a target
    #[error("Orphaned reference: {0}")]
    OrphanedReference(String),
    /// Broken reference link
    #[error("Broken reference from {from} to {to}")]
    BrokenReference {
        /// Source of the reference
        from: String,
        /// Target that doesn't exist
        to: String,
    },
    /// Duplicate reference ID
    #[error("Duplicate reference: {0}")]
    DuplicateReference(String),
    /// Circular reference detected
    #[error("Circular reference detected: {0}")]
    CircularReference(String),
    /// Invalid entity type for operation
    #[error("Invalid entity type: {0}")]
    InvalidEntityType(String),
    /// Validation failed
    #[error("Validation failed: {0}")]
    ValidationFailed(String),
}
