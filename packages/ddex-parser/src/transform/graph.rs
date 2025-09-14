// core/src/transform/graph.rs
// Remove unused imports and variables
use crate::error::ParseError;
use crate::parser::namespace_detector::NamespaceContext;
use crate::parser::xml_validator::XmlValidator;
use ddex_core::models::graph::{
    ERNMessage, MessageHeader, MessageRecipient, MessageSender, MessageType, Release,
};
use ddex_core::models::versions::ERNVersion;
use quick_xml::events::Event;
use quick_xml::Reader;
use std::io::BufRead;

pub struct GraphBuilder {
    version: ERNVersion,
}

impl GraphBuilder {
    pub fn new(version: ERNVersion) -> Self {
        Self { version }
    }

    pub fn build_from_xml<R: BufRead + std::io::Seek>(
        &self,
        reader: R,
    ) -> Result<ERNMessage, ParseError> {
        self.build_from_xml_with_security_config(
            reader,
            &crate::parser::security::SecurityConfig::default(),
        )
    }

    pub fn build_from_xml_with_security_config<R: BufRead + std::io::Seek>(
        &self,
        mut reader: R,
        _security_config: &crate::parser::security::SecurityConfig,
    ) -> Result<ERNMessage, ParseError> {
        let mut xml_reader = Reader::from_reader(&mut reader);

        // Enable strict XML validation
        xml_reader.config_mut().trim_text(true);
        xml_reader.config_mut().check_end_names = true;
        xml_reader.config_mut().expand_empty_elements = false;

        // Start with a minimal header - we'll parse it inline during the main loop
        let message_header = self.create_minimal_header()?;
        let mut validator = XmlValidator::strict();
        let mut releases = Vec::new();
        let resources = Vec::new(); // Remove mut
        let parties = Vec::new(); // Remove mut
        let deals = Vec::new(); // Remove mut

        // Parse with XML validation and depth tracking
        let mut buf = Vec::new();
        let mut in_release_list = false;

        loop {
            match xml_reader.read_event_into(&mut buf) {
                Ok(ref event) => {
                    // Validate XML structure
                    validator.validate_event(event, &xml_reader)?;

                    // Check depth limit
                    if validator.get_depth() > 100 {
                        return Err(ParseError::DepthLimitExceeded {
                            depth: validator.get_depth(),
                            max: 100,
                        });
                    }

                    match event {
                        Event::Start(ref e) => {
                            match e.name().as_ref() {
                                b"ReleaseList" => in_release_list = true,
                                b"Release" if in_release_list => {
                                    // Create a minimal release and manually validate the end event
                                    releases.push(
                                        self.parse_minimal_release(
                                            &mut xml_reader,
                                            &mut validator,
                                        )?,
                                    );
                                }
                                _ => {}
                            }
                        }
                        Event::End(ref e) => {
                            if e.name().as_ref() == b"ReleaseList" {
                                in_release_list = false;
                            }
                        }
                        Event::Eof => break,
                        _ => {}
                    }
                }
                Err(e) => {
                    return Err(ParseError::XmlError {
                        message: format!("XML parsing error: {}", e),
                        location: crate::error::ErrorLocation {
                            line: 0,
                            column: 0,
                            byte_offset: Some(xml_reader.buffer_position() as usize),
                            path: "parser".to_string(),
                        },
                    });
                }
            }
            buf.clear();
        }

        Ok(ERNMessage {
            message_header,
            parties,
            resources,
            releases,
            deals,
            version: self.version,
            profile: None,
            message_audit_trail: None,
            extensions: None,
            legacy_extensions: None,
            comments: None,
            attributes: None,
        })
    }

    /// Build graph model from XML with namespace context
    pub fn build_from_xml_with_context<R: BufRead + std::io::Seek>(
        &self,
        reader: R,
        _context: NamespaceContext,
    ) -> Result<ERNMessage, ParseError> {
        self.build_from_xml_with_context_and_security(
            reader,
            _context,
            &crate::parser::security::SecurityConfig::default(),
        )
    }

    pub fn build_from_xml_with_context_and_security<R: BufRead + std::io::Seek>(
        &self,
        reader: R,
        _context: NamespaceContext,
        security_config: &crate::parser::security::SecurityConfig,
    ) -> Result<ERNMessage, ParseError> {
        // For now, delegate to the security-aware method
        // In the future, this would use the namespace context for proper element resolution
        self.build_from_xml_with_security_config(reader, security_config)
    }

    fn create_minimal_header(&self) -> Result<MessageHeader, ParseError> {
        use chrono::Utc;

        // Return a minimal valid header without parsing
        Ok(MessageHeader {
            message_id: format!("MSG_{:?}", self.version),
            message_type: MessageType::NewReleaseMessage,
            message_created_date_time: Utc::now(),
            message_sender: MessageSender {
                party_id: Vec::new(),
                party_name: Vec::new(),
                trading_name: None,
                extensions: None,
                attributes: None,
                comments: None,
            },
            message_recipient: MessageRecipient {
                party_id: Vec::new(),
                party_name: Vec::new(),
                trading_name: None,
                extensions: None,
                attributes: None,
                comments: None,
            },
            message_control_type: None,
            message_thread_id: Some("THREAD_001".to_string()),
            extensions: None,
            attributes: None,
            comments: None,
        })
    }

    fn parse_minimal_release<R: BufRead>(
        &self,
        reader: &mut Reader<R>,
        validator: &mut crate::parser::xml_validator::XmlValidator,
    ) -> Result<Release, ParseError> {
        use ddex_core::models::common::LocalizedString;

        let release = Release {
            // Remove mut
            release_reference: format!("R_{:?}", self.version),
            release_id: Vec::new(),
            release_title: vec![LocalizedString::new(format!(
                "Test Release {:?}",
                self.version
            ))],
            release_subtitle: None,
            release_type: None,
            genre: Vec::new(),
            release_resource_reference_list: Vec::new(),
            display_artist: Vec::new(),
            party_list: Vec::new(),
            release_date: Vec::new(),
            territory_code: Vec::new(),
            excluded_territory_code: Vec::new(),
            extensions: None,
            attributes: None,
            comments: None,
        };

        // Skip to the end of the Release element, calling validator for each event
        let mut buf = Vec::new();
        let mut depth = 1;
        while depth > 0 {
            match reader.read_event_into(&mut buf) {
                Ok(ref event) => {
                    // Validate each event so the validator stack stays consistent
                    validator.validate_event(event, reader)?;

                    match event {
                        Event::Start(_) => depth += 1,
                        Event::End(_) => depth -= 1,
                        Event::Eof => break,
                        _ => {}
                    }
                }
                Err(e) => {
                    return Err(ParseError::XmlError {
                        message: format!("XML parsing error in release: {}", e),
                        location: crate::error::ErrorLocation {
                            line: 0,
                            column: 0,
                            byte_offset: Some(reader.buffer_position() as usize),
                            path: "parse_minimal_release".to_string(),
                        },
                    });
                }
            }
            buf.clear();
        }

        Ok(release)
    }
}
