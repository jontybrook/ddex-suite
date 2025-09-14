//! Streaming accumulator for progressive model construction
//!
//! Handles incremental building of DDEX elements, reference resolution,
//! and validation during streaming parsing.

use crate::error::ParseError;
use ddex_core::models::{graph::*, versions::ERNVersion};
use ddex_core::models::streaming_types::*;
use ddex_core::models::streaming_types::builders::*;
use std::collections::{HashMap, VecDeque};
use std::time::Instant;

/// Types of elements that can be accumulated
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ElementType {
    Header,
    Release,
    Resource,
    Party,
    Deal,
}

/// A pending reference that needs resolution
#[derive(Debug, Clone)]
pub struct PendingReference {
    pub from_element: String,
    pub from_type: ElementType,
    pub to_reference: String,
    pub to_type: ElementType,
    pub field_name: String,
    pub created_at: Instant,
}

/// Parsed element ready for output
#[derive(Debug, Clone)]
pub enum AccumulatedElement {
    Header(Box<MessageHeader>),
    Release(Release),
    Resource(Resource),
    Party(Party),
    Deal(Deal),
    EndOfStream,
}

/// Statistics for the accumulator
#[derive(Debug, Clone)]
pub struct AccumulatorStats {
    pub active_releases: usize,
    pub active_resources: usize,
    pub active_parties: usize,
    pub pending_references: usize,
    pub completed_elements: usize,
    pub validation_warnings: usize,
    pub memory_estimate: usize,
}

/// Configuration for the accumulator
#[derive(Debug, Clone)]
pub struct AccumulatorConfig {
    pub max_pending_references: usize,
    pub max_memory_mb: usize,
    pub reference_timeout_seconds: u64,
    pub enable_validation: bool,
    pub strict_validation: bool,
}

impl Default for AccumulatorConfig {
    fn default() -> Self {
        Self {
            max_pending_references: 10000,
            max_memory_mb: 100,
            reference_timeout_seconds: 300, // 5 minutes
            enable_validation: true,
            strict_validation: false,
        }
    }
}

/// Streaming accumulator for progressive DDEX model construction
pub struct StreamingAccumulator {
    // Partially built elements
    releases: HashMap<String, ReleaseBuilder>,
    resources: HashMap<String, ResourceBuilder>,
    parties: HashMap<String, PartyBuilder>,
    header: Option<MessageHeaderBuilder>,

    // Reference resolution
    pending_refs: VecDeque<PendingReference>,
    resolved_refs: HashMap<String, ElementType>,

    // Completed elements ready to yield
    completed: VecDeque<AccumulatedElement>,

    // Statistics and configuration
    config: AccumulatorConfig,
    stats: AccumulatorStats,
    start_time: Instant,
    validation_warnings: Vec<String>,
}

impl StreamingAccumulator {
    pub fn new(config: AccumulatorConfig) -> Self {
        Self {
            releases: HashMap::new(),
            resources: HashMap::new(),
            parties: HashMap::new(),
            header: None,
            pending_refs: VecDeque::new(),
            resolved_refs: HashMap::new(),
            completed: VecDeque::new(),
            config,
            stats: AccumulatorStats {
                active_releases: 0,
                active_resources: 0,
                active_parties: 0,
                pending_references: 0,
                completed_elements: 0,
                validation_warnings: 0,
                memory_estimate: 0,
            },
            start_time: Instant::now(),
            validation_warnings: Vec::new(),
        }
    }

    /// Add a field value to the appropriate builder
    pub fn add_field(&mut self, path: &[String], value: String, attributes: &HashMap<String, String>) -> Result<(), ParseError> {
        if path.is_empty() {
            return Ok(());
        }

        match path[0].as_str() {
            "MessageHeader" => self.handle_header_field(path, value, attributes),
            "Release" => self.handle_release_field(path, value, attributes),
            "Resource" => self.handle_resource_field(path, value, attributes),
            "Party" => self.handle_party_field(path, value, attributes),
            _ => Ok(()),
        }
    }

    /// Handle header field assignment
    fn handle_header_field(&mut self, path: &[String], value: String, _attributes: &HashMap<String, String>) -> Result<(), ParseError> {
        if self.header.is_none() {
            self.header = Some(MessageHeaderBuilder::new());
        }

        if let Some(ref mut header) = self.header {
            match path.get(1).map(|s| s.as_str()) {
                Some("MessageId") => header.set_message_id(value),
                Some("MessageCreatedDateTime") => header.set_created_date_time_from_text(value),
                Some("MessageSender") => {
                    let sender = create_message_sender(value, None);
                    header.set_sender(sender);
                }
                Some("MessageRecipient") => {
                    let recipient = create_message_recipient(value);
                    header.set_recipient(recipient);
                }
                _ => {}
            }
        }

        Ok(())
    }

    /// Handle release field assignment
    fn handle_release_field(&mut self, path: &[String], value: String, attributes: &HashMap<String, String>) -> Result<(), ParseError> {
        let release_ref = attributes.get("ReleaseReference")
            .cloned()
            .unwrap_or_else(|| format!("REL_{}", self.stats.active_releases));

        let release = self.releases.entry(release_ref.clone())
            .or_insert_with(|| ReleaseBuilder::new(release_ref.clone()));

        match path.get(1).map(|s| s.as_str()) {
            Some("ReleaseTitle") => {
                let title = create_localized_string(value, attributes.get("LanguageCode").cloned());
                release.add_title(title);
            }
            Some("Genre") => {
                let genre = create_genre(value, None);
                release.add_genre(genre);
            }
            Some("DisplayArtist") => {
                let artist = create_artist(value, "MainArtist".to_string(), None);
                release.add_artist(artist);
            }
            Some("ReleaseType") => {
                let release_type = match value.as_str() {
                    "Album" => ReleaseType::Album,
                    "Single" => ReleaseType::Single,
                    "EP" => ReleaseType::EP,
                    _ => ReleaseType::Other(value),
                };
                release.set_release_type(release_type);
            }
            Some("ReleaseResourceReference") => {
                release.add_resource_reference(value.clone());
                // Add pending reference for resolution
                self.add_pending_reference(
                    release_ref,
                    ElementType::Release,
                    value,
                    ElementType::Resource,
                    "resource_reference".to_string(),
                );
            }
            _ => {}
        }

        self.update_stats();
        Ok(())
    }

    /// Handle resource field assignment
    fn handle_resource_field(&mut self, path: &[String], value: String, attributes: &HashMap<String, String>) -> Result<(), ParseError> {
        let resource_ref = attributes.get("ResourceReference")
            .cloned()
            .unwrap_or_else(|| format!("RES_{}", self.stats.active_resources));

        let resource = self.resources.entry(resource_ref.clone())
            .or_insert_with(|| ResourceBuilder::new(resource_ref.clone()));

        match path.get(1).map(|s| s.as_str()) {
            Some("Title") => {
                let title = create_localized_string(value, attributes.get("LanguageCode").cloned());
                resource.add_title(title);
            }
            Some("Duration") => {
                resource.set_duration_from_text(value);
            }
            Some("ResourceType") => {
                let resource_type = match value.as_str() {
                    "SoundRecording" => ResourceType::SoundRecording,
                    "Video" => ResourceType::Video,
                    "Image" => ResourceType::Image,
                    "Text" => ResourceType::Text,
                    "SheetMusic" => ResourceType::SheetMusic,
                    _ => ResourceType::SoundRecording,
                };
                resource.set_resource_type(resource_type);
            }
            Some("ISRC") => {
                let identifier = create_identifier(value, ddex_core::models::IdentifierType::ISRC, Some("ISRC".to_string()));
                resource.add_identifier(identifier);
            }
            _ => {}
        }

        // Mark this resource as resolved
        self.resolved_refs.insert(resource_ref, ElementType::Resource);
        self.update_stats();
        Ok(())
    }

    /// Handle party field assignment
    fn handle_party_field(&mut self, path: &[String], value: String, attributes: &HashMap<String, String>) -> Result<(), ParseError> {
        let party_ref = attributes.get("PartyReference").cloned();
        let party_key = party_ref.clone().unwrap_or_else(|| format!("PARTY_{}", self.stats.active_parties));

        let party = self.parties.entry(party_key.clone())
            .or_insert_with(|| PartyBuilder::new(party_ref));

        match path.get(1).map(|s| s.as_str()) {
            Some("PartyName") => {
                let name = create_localized_string(value, attributes.get("LanguageCode").cloned());
                party.add_name(name);
            }
            Some("ISNI") => {
                party.set_isni(value);
            }
            Some("PartyRole") => {
                let role = match value.as_str() {
                    "Artist" => ddex_core::models::graph::PartyRole::Artist,
                    "Producer" => ddex_core::models::graph::PartyRole::Producer,
                    "Composer" => ddex_core::models::graph::PartyRole::Composer,
                    "Lyricist" => ddex_core::models::graph::PartyRole::Lyricist,
                    "Publisher" => ddex_core::models::graph::PartyRole::Publisher,
                    "Performer" => ddex_core::models::graph::PartyRole::Performer,
                    "Engineer" => ddex_core::models::graph::PartyRole::Engineer,
                    "Label" => ddex_core::models::graph::PartyRole::Label,
                    "Distributor" => ddex_core::models::graph::PartyRole::Distributor,
                    _ => ddex_core::models::graph::PartyRole::Other(value),
                };
                party.add_role(role);
            }
            _ => {}
        }

        if let Some(ref party_ref) = party_ref {
            self.resolved_refs.insert(party_ref.clone(), ElementType::Party);
        }
        self.update_stats();
        Ok(())
    }

    /// Try to complete an element of the given type
    pub fn try_complete(&mut self, element_type: ElementType) -> Option<AccumulatedElement> {
        match element_type {
            ElementType::Header => self.try_complete_header(),
            ElementType::Release => self.try_complete_any_release(),
            ElementType::Resource => self.try_complete_any_resource(),
            ElementType::Party => self.try_complete_any_party(),
            ElementType::Deal => None, // Not implemented yet
        }
    }

    /// Try to complete the header
    fn try_complete_header(&mut self) -> Option<AccumulatedElement> {
        if let Some(builder) = self.header.take() {
            match builder.to_core() {
                Ok(header) => {
                    self.stats.completed_elements += 1;
                    Some(AccumulatedElement::Header(Box::new(header)))
                }
                Err(e) => {
                    if self.config.enable_validation {
                        self.validation_warnings.push(format!("Header validation failed: {}", e));
                        self.stats.validation_warnings += 1;
                    }

                    if !self.config.strict_validation {
                        // Create fallback header
                        let header = MessageHeader {
                            message_id: "FALLBACK_MSG".to_string(),
                            message_type: MessageType::NewReleaseMessage,
                            message_created_date_time: chrono::Utc::now(),
                            message_sender: create_message_sender("Unknown Sender".to_string(), None),
                            message_recipient: create_message_recipient("Unknown Recipient".to_string()),
                            message_control_type: None,
                            message_thread_id: None,
                            attributes: None,
                            extensions: None,
                            comments: None,
                        };
                        self.stats.completed_elements += 1;
                        Some(AccumulatedElement::Header(Box::new(header)))
                    } else {
                        None
                    }
                }
            }
        } else {
            None
        }
    }

    /// Try to complete any ready release
    fn try_complete_any_release(&mut self) -> Option<AccumulatedElement> {
        let mut ready_key = None;

        // Find a complete release
        for (key, builder) in &self.releases {
            if builder.is_complete() {
                ready_key = Some(key.clone());
                break;
            }
        }

        if let Some(key) = ready_key {
            if let Some(builder) = self.releases.remove(&key) {
                match builder.to_core() {
                    Ok(release) => {
                        self.stats.completed_elements += 1;
                        self.stats.active_releases = self.releases.len();
                        Some(AccumulatedElement::Release(release))
                    }
                    Err(e) => {
                        if self.config.enable_validation {
                            self.validation_warnings.push(format!("Release validation failed: {}", e));
                            self.stats.validation_warnings += 1;
                        }
                        None
                    }
                }
            } else {
                None
            }
        } else {
            None
        }
    }

    /// Try to complete any ready resource
    fn try_complete_any_resource(&mut self) -> Option<AccumulatedElement> {
        let mut ready_key = None;

        for (key, builder) in &self.resources {
            if builder.is_complete() {
                ready_key = Some(key.clone());
                break;
            }
        }

        if let Some(key) = ready_key {
            if let Some(builder) = self.resources.remove(&key) {
                match builder.to_core() {
                    Ok(resource) => {
                        self.stats.completed_elements += 1;
                        self.stats.active_resources = self.resources.len();
                        Some(AccumulatedElement::Resource(resource))
                    }
                    Err(e) => {
                        if self.config.enable_validation {
                            self.validation_warnings.push(format!("Resource validation failed: {}", e));
                            self.stats.validation_warnings += 1;
                        }
                        None
                    }
                }
            } else {
                None
            }
        } else {
            None
        }
    }

    /// Try to complete any ready party
    fn try_complete_any_party(&mut self) -> Option<AccumulatedElement> {
        let mut ready_key = None;

        for (key, builder) in &self.parties {
            if builder.is_complete() {
                ready_key = Some(key.clone());
                break;
            }
        }

        if let Some(key) = ready_key {
            if let Some(builder) = self.parties.remove(&key) {
                match builder.to_core() {
                    Ok(party) => {
                        self.stats.completed_elements += 1;
                        self.stats.active_parties = self.parties.len();
                        Some(AccumulatedElement::Party(party))
                    }
                    Err(e) => {
                        if self.config.enable_validation {
                            self.validation_warnings.push(format!("Party validation failed: {}", e));
                            self.stats.validation_warnings += 1;
                        }
                        None
                    }
                }
            } else {
                None
            }
        } else {
            None
        }
    }

    /// Add a pending reference for later resolution
    fn add_pending_reference(&mut self, from_element: String, from_type: ElementType, to_reference: String, to_type: ElementType, field_name: String) {
        if self.pending_refs.len() < self.config.max_pending_references {
            self.pending_refs.push_back(PendingReference {
                from_element,
                from_type,
                to_reference,
                to_type,
                field_name,
                created_at: Instant::now(),
            });
        }
    }

    /// Resolve pending references
    pub fn resolve_references(&mut self) {
        let mut resolved_count = 0;
        let mut i = 0;

        while i < self.pending_refs.len() {
            let should_remove = {
                let pending = &self.pending_refs[i];

                // Check if the target reference is now available
                if self.resolved_refs.contains_key(&pending.to_reference) {
                    // Reference can be resolved
                    resolved_count += 1;
                    true
                } else if pending.created_at.elapsed().as_secs() > self.config.reference_timeout_seconds {
                    // Reference has timed out
                    self.validation_warnings.push(format!("Reference timeout: {} -> {}", pending.from_element, pending.to_reference));
                    self.stats.validation_warnings += 1;
                    true
                } else {
                    false
                }
            };

            if should_remove {
                self.pending_refs.remove(i);
            } else {
                i += 1;
            }
        }

        if resolved_count > 0 {
            self.update_stats();
        }
    }

    /// Periodic cleanup of orphaned builders and old references
    pub fn cleanup(&mut self) {
        let timeout = std::time::Duration::from_secs(self.config.reference_timeout_seconds);
        let now = Instant::now();

        // Clean up old pending references
        self.pending_refs.retain(|pending| {
            now.duration_since(pending.created_at) <= timeout
        });

        // Check memory usage and clean up if necessary
        self.update_stats();
        if self.estimate_memory_usage() > self.config.max_memory_mb * 1024 * 1024 {
            self.force_complete_oldest_elements();
        }
    }

    /// Force completion of oldest elements to free memory
    fn force_complete_oldest_elements(&mut self) {
        // Force complete some releases
        let keys: Vec<String> = self.releases.keys().take(5).cloned().collect();
        for key in keys {
            if let Some(builder) = self.releases.remove(&key) {
                if let Ok(release) = builder.to_core() {
                    self.completed.push_back(AccumulatedElement::Release(release));
                    self.stats.completed_elements += 1;
                }
            }
        }

        // Force complete some resources
        let keys: Vec<String> = self.resources.keys().take(5).cloned().collect();
        for key in keys {
            if let Some(builder) = self.resources.remove(&key) {
                if let Ok(resource) = builder.to_core() {
                    self.completed.push_back(AccumulatedElement::Resource(resource));
                    self.stats.completed_elements += 1;
                }
            }
        }

        self.update_stats();
    }

    /// Get next completed element
    pub fn pop_completed(&mut self) -> Option<AccumulatedElement> {
        self.completed.pop_front()
    }

    /// Check if there are any completed elements ready
    pub fn has_completed(&self) -> bool {
        !self.completed.is_empty()
    }

    /// Update statistics
    fn update_stats(&mut self) {
        self.stats.active_releases = self.releases.len();
        self.stats.active_resources = self.resources.len();
        self.stats.active_parties = self.parties.len();
        self.stats.pending_references = self.pending_refs.len();
        self.stats.validation_warnings = self.validation_warnings.len();
        self.stats.memory_estimate = self.estimate_memory_usage();
    }

    /// Estimate memory usage
    fn estimate_memory_usage(&self) -> usize {
        let mut size = std::mem::size_of::<Self>();
        size += self.releases.len() * 1024; // Rough estimate
        size += self.resources.len() * 512;
        size += self.parties.len() * 256;
        size += self.pending_refs.len() * std::mem::size_of::<PendingReference>();
        size += self.completed.len() * 2048; // Completed elements are larger
        size
    }

    /// Get current statistics
    pub fn stats(&self) -> &AccumulatorStats {
        &self.stats
    }

    /// Get validation warnings
    pub fn validation_warnings(&self) -> &[String] {
        &self.validation_warnings
    }

    /// Finalize processing - complete all remaining elements
    pub fn finalize(&mut self) -> Vec<AccumulatedElement> {
        let mut final_elements = Vec::new();

        // Complete header if present
        if let Some(element) = self.try_complete_header() {
            final_elements.push(element);
        }

        // Complete all remaining releases
        while let Some(element) = self.try_complete_any_release() {
            final_elements.push(element);
        }

        // Complete all remaining resources
        while let Some(element) = self.try_complete_any_resource() {
            final_elements.push(element);
        }

        // Complete all remaining parties
        while let Some(element) = self.try_complete_any_party() {
            final_elements.push(element);
        }

        // Add any remaining completed elements
        while let Some(element) = self.pop_completed() {
            final_elements.push(element);
        }

        // Report unresolved references
        if !self.pending_refs.is_empty() {
            for pending in &self.pending_refs {
                self.validation_warnings.push(format!("Unresolved reference: {} -> {}", pending.from_element, pending.to_reference));
            }
            self.stats.validation_warnings = self.validation_warnings.len();
        }

        final_elements
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_accumulator_basic_functionality() {
        let config = AccumulatorConfig::default();
        let mut accumulator = StreamingAccumulator::new(config);

        // Add header fields
        let mut attributes = HashMap::new();
        accumulator.add_field(&["MessageHeader".to_string(), "MessageId".to_string()], "MSG001".to_string(), &attributes).unwrap();

        // Add release fields
        attributes.insert("ReleaseReference".to_string(), "REL001".to_string());
        accumulator.add_field(&["Release".to_string(), "ReleaseTitle".to_string()], "Test Release".to_string(), &attributes).unwrap();

        // Check stats
        let stats = accumulator.stats();
        assert_eq!(stats.active_releases, 1);

        // Try to complete release (should fail - not enough fields)
        let element = accumulator.try_complete(ElementType::Release);
        assert!(element.is_some()); // Should complete with just title

        // Check final stats
        let stats = accumulator.stats();
        assert_eq!(stats.completed_elements, 1);
    }

    #[test]
    fn test_reference_resolution() {
        let config = AccumulatorConfig::default();
        let mut accumulator = StreamingAccumulator::new(config);

        let mut attributes = HashMap::new();

        // Add release that references a resource
        attributes.insert("ReleaseReference".to_string(), "REL001".to_string());
        accumulator.add_field(&["Release".to_string(), "ReleaseResourceReference".to_string()], "RES001".to_string(), &attributes).unwrap();

        // Add the referenced resource
        attributes.clear();
        attributes.insert("ResourceReference".to_string(), "RES001".to_string());
        accumulator.add_field(&["Resource".to_string(), "Title".to_string()], "Test Track".to_string(), &attributes).unwrap();

        // Resolve references
        accumulator.resolve_references();

        // Check that reference was resolved
        assert!(accumulator.resolved_refs.contains_key("RES001"));
    }

    #[test]
    fn test_memory_management() {
        let config = AccumulatorConfig {
            max_memory_mb: 1, // Very low limit to trigger cleanup
            ..Default::default()
        };
        let mut accumulator = StreamingAccumulator::new(config);

        // Add many elements to trigger memory management
        for i in 0..100 {
            let mut attributes = HashMap::new();
            attributes.insert("ReleaseReference".to_string(), format!("REL{:03}", i));
            accumulator.add_field(&["Release".to_string(), "ReleaseTitle".to_string()], format!("Release {}", i), &attributes).unwrap();
        }

        let initial_count = accumulator.stats().active_releases;

        // Force cleanup
        accumulator.cleanup();

        // Should have fewer active releases after cleanup
        let final_count = accumulator.stats().active_releases;
        assert!(final_count < initial_count);
    }

    #[test]
    fn test_validation_warnings() {
        let config = AccumulatorConfig {
            enable_validation: true,
            strict_validation: false,
            ..Default::default()
        };
        let mut accumulator = StreamingAccumulator::new(config);

        // Try to complete header without required fields
        let element = accumulator.try_complete(ElementType::Header);

        // Should create fallback and generate warning
        assert!(element.is_some());
        assert!(!accumulator.validation_warnings().is_empty());
        assert!(accumulator.stats().validation_warnings > 0);
    }
}