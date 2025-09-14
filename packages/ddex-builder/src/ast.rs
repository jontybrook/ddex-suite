//! Abstract Syntax Tree for DDEX XML generation

use ddex_core::models::{Comment, CommentPosition};
use indexmap::IndexMap;
// Remove unused serde imports since we're not serializing AST

/// Abstract Syntax Tree representation of DDEX XML
///
/// The AST represents the complete structure of a DDEX XML document,
/// including the root element, namespace declarations, and schema location.
/// This structure is used internally by the builder to construct
/// deterministic XML output with proper canonicalization.
#[derive(Debug, Clone)]
pub struct AST {
    /// Root element of the document
    pub root: Element,
    /// XML namespaces used in the document (prefix -> URI)
    /// Uses IndexMap to ensure deterministic ordering
    pub namespaces: IndexMap<String, String>,
    /// XSD schema location if specified
    pub schema_location: Option<String>,
}

/// XML element in the AST
///
/// Represents a single XML element with its name, namespace, attributes,
/// and child nodes. The structure maintains deterministic ordering
/// of attributes using IndexMap to ensure consistent XML output.
#[derive(Debug, Clone)]
pub struct Element {
    /// Element name (local name without prefix)
    pub name: String,
    /// Namespace URI if element is namespaced
    pub namespace: Option<String>,
    /// Element attributes (name -> value)
    /// Uses IndexMap to ensure deterministic attribute ordering
    pub attributes: IndexMap<String, String>,
    /// Child nodes (elements, text, comments)
    pub children: Vec<Node>,
}

/// Node types in the AST
///
/// Represents the different types of nodes that can appear as children
/// of an XML element. Supports elements, text content, and comments
/// with both structured and simple comment formats.
#[derive(Debug, Clone)]
pub enum Node {
    /// Element node
    Element(Element),
    /// Text content node
    Text(String),
    /// Structured comment node with position information
    Comment(Comment),
    /// Legacy comment support for backward compatibility
    SimpleComment(String),
}

impl Element {
    /// Create a new element with the given name
    ///
    /// # Arguments
    /// * `name` - The element name (local name without namespace prefix)
    ///
    /// # Example
    /// ```
    /// use ddex_builder::ast::Element;
    /// let element = Element::new("Title");
    /// ```
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            namespace: None,
            attributes: IndexMap::new(),
            children: Vec::new(),
        }
    }

    /// Set the namespace for this element
    ///
    /// # Arguments
    /// * `ns` - The namespace URI
    ///
    /// # Example
    /// ```
    /// use ddex_builder::ast::Element;
    /// let element = Element::new("Title")
    ///     .with_namespace("http://ddex.net/xml/ern/43");
    /// ```
    pub fn with_namespace(mut self, ns: impl Into<String>) -> Self {
        self.namespace = Some(ns.into());
        self
    }

    /// Add an attribute to this element
    ///
    /// # Arguments
    /// * `key` - The attribute name
    /// * `value` - The attribute value
    ///
    /// # Example
    /// ```
    /// use ddex_builder::ast::Element;
    /// let element = Element::new("Title")
    ///     .with_attr("LanguageAndScriptCode", "en");
    /// ```
    pub fn with_attr(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.attributes.insert(key.into(), value.into());
        self
    }

    /// Add text content to this element
    ///
    /// # Arguments
    /// * `text` - The text content
    ///
    /// # Example
    /// ```
    /// use ddex_builder::ast::Element;
    /// let element = Element::new("Title")
    ///     .with_text("My Song Title");
    /// ```
    pub fn with_text(mut self, text: impl Into<String>) -> Self {
        self.children.push(Node::Text(text.into()));
        self
    }

    /// Add a child element
    ///
    /// # Arguments
    /// * `child` - The child element to add
    ///
    /// # Example
    /// ```
    /// use ddex_builder::ast::Element;
    /// let mut parent = Element::new("Release");
    /// let child = Element::new("Title").with_text("My Song");
    /// parent.add_child(child);
    /// ```
    pub fn add_child(&mut self, child: Element) {
        self.children.push(Node::Element(child));
    }

    /// Add text content as a child node
    ///
    /// # Arguments
    /// * `text` - The text content to add
    ///
    /// # Example
    /// ```
    /// use ddex_builder::ast::Element;
    /// let mut element = Element::new("Title");
    /// element.add_text("My Song Title");
    /// ```
    pub fn add_text(&mut self, text: impl Into<String>) {
        self.children.push(Node::Text(text.into()));
    }

    /// Add a structured comment to this element
    ///
    /// # Arguments
    /// * `comment` - The structured comment with position information
    ///
    /// # Example
    /// ```
    /// use ddex_builder::ast::Element;
    /// use ddex_core::models::{Comment, CommentPosition};
    /// let mut element = Element::new("Release");
    /// let comment = Comment::new("Release generated by system".to_string(), CommentPosition::Before);
    /// element.add_comment(comment);
    /// ```
    pub fn add_comment(&mut self, comment: Comment) {
        self.children.push(Node::Comment(comment));
    }

    /// Add a simple comment (for backward compatibility)
    ///
    /// # Arguments
    /// * `comment` - The comment text
    ///
    /// # Example
    /// ```
    /// use ddex_builder::ast::Element;
    /// let mut element = Element::new("Release");
    /// element.add_simple_comment("This is a simple comment");
    /// ```
    pub fn add_simple_comment(&mut self, comment: impl Into<String>) {
        self.children.push(Node::SimpleComment(comment.into()));
    }

    /// Add a comment with a specific position
    ///
    /// # Arguments
    /// * `content` - The comment content
    /// * `position` - The position where the comment should appear
    ///
    /// # Example
    /// ```
    /// use ddex_builder::ast::Element;
    /// use ddex_core::models::CommentPosition;
    /// let element = Element::new("Release")
    ///     .with_comment("Release comment".to_string(), CommentPosition::Before);
    /// ```
    pub fn with_comment(mut self, content: String, position: CommentPosition) -> Self {
        let comment = Comment::new(content, position);
        self.children.push(Node::Comment(comment));
        self
    }
}
