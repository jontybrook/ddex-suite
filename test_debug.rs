use ddex_parser::DDEXParser;
use std::io::Cursor;

fn main() {
    let parser = DDEXParser::new();
    
    println!("Testing invalid XML...");
    let invalid_xml = "not xml";
    let result = parser.parse(Cursor::new(invalid_xml.as_bytes()));
    match result {
        Ok(_) => println!("UNEXPECTED: Parser succeeded on invalid XML"),
        Err(e) => println!("Expected error: {:?}", e),
    }
    
    println!("\nTesting empty input...");
    let empty = "";
    let result = parser.parse(Cursor::new(empty.as_bytes()));
    match result {
        Ok(_) => println!("UNEXPECTED: Parser succeeded on empty input"),
        Err(e) => println!("Expected error: {:?}", e),
    }
    
    println!("\nTesting malformed XML...");
    let malformed = "<unclosed>";
    let result = parser.parse(Cursor::new(malformed.as_bytes()));
    match result {
        Ok(_) => println!("UNEXPECTED: Parser succeeded on malformed XML"),
        Err(e) => println!("Expected error: {:?}", e),
    }
}
