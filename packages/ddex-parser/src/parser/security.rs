use std::time::Duration;

/// Security configuration for XML parsing
#[derive(Debug, Clone)]
pub struct SecurityConfig {
    // Entity expansion protection
    pub disable_dtd: bool,
    pub disable_external_entities: bool,
    pub max_entity_expansions: usize,
    pub max_entity_depth: usize,

    // Size limits
    pub max_element_depth: usize,
    pub max_attribute_size: usize,
    pub max_text_size: usize,
    pub max_file_size: usize,

    // Time limits
    pub parse_timeout: Duration,
    pub stream_timeout: Duration,

    // Network protection
    pub allow_network: bool,
    pub allowed_schemas: Vec<String>,

    // Performance options
    pub enable_fast_streaming: bool,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self::strict()
    }
}

impl SecurityConfig {
    /// Strict security configuration (default)
    pub fn strict() -> Self {
        Self {
            disable_dtd: true,
            disable_external_entities: true,
            max_entity_expansions: 100, // Reduced from 1000 to protect against XML bombs
            max_entity_depth: 10,       // Reduced from 20 for better protection
            max_element_depth: 100,     // Keep at 100, this will block deep nesting attacks
            max_attribute_size: 100 * 1024, // 100KB
            max_text_size: 1024 * 1024, // 1MB
            max_file_size: 1024 * 1024 * 1024, // 1GB
            parse_timeout: Duration::from_secs(30),
            stream_timeout: Duration::from_secs(300),
            allow_network: false,
            allowed_schemas: vec!["file".to_string()],
            enable_fast_streaming: false, // Disabled by default for strict mode
        }
    }

    /// Relaxed configuration for trusted sources
    pub fn relaxed() -> Self {
        Self {
            max_element_depth: 200,
            max_file_size: if cfg!(target_arch = "wasm32") {
                100 * 1024 * 1024 // 100MB for WASM
            } else {
                5 * 1024 * 1024 * 1024 // 5GB for native
            },
            parse_timeout: Duration::from_secs(120),
            stream_timeout: Duration::from_secs(600),
            enable_fast_streaming: true, // Enable fast streaming in relaxed mode
            ..Self::strict()
        }
    }
}
