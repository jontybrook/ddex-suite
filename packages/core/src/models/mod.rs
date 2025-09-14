// core/src/models/mod.rs
//! DDEX data models

pub mod attributes;
pub mod common;
pub mod flat;
pub mod graph;
pub mod streaming_types;
pub mod versions; // Add this line to export the versions module

pub use attributes::{AttributeInheritance, AttributeMap, AttributeType, AttributeValue, QName};
pub use common::{Identifier, IdentifierType, LocalizedString};

pub mod extensions;
pub use extensions::{Comment, CommentPosition, Extensions, ProcessingInstruction, XmlFragment};

pub mod validation;
pub use validation::{
    AttributeValidationError, AttributeValidator, DependencyCondition, ValidationPolicy,
    ValidationResult, ValidationRule,
};
