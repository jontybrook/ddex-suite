// Simple test to debug error contract
fn main() {
    use ddex_parser::DDEXParser;
    use std::io::Cursor;

    let parser = DDEXParser::new();
    let invalid_xml = "not xml";
    let result = parser.parse(Cursor::new(invalid_xml.as_bytes()));

    println!("Result: {:?}", result);
}