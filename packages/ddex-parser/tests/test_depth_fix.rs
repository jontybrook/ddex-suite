use ddex_parser::DDEXParser;
use std::io::Cursor;

#[test]
fn test_depth_tracking_with_siblings() {
    println!("Testing depth tracking fix with siblings...");

    // Create XML with many sibling elements at depth 3
    let mut xml = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
    <MessageHeader><MessageId>MSG123</MessageId></MessageHeader>
    <ReleaseList>"#,
    );

    // Add 10 sibling Release elements (depth should remain 3 for all)
    for i in 0..10 {
        xml.push_str(&format!("<Release><ReleaseId>R{}</ReleaseId></Release>", i));
    }
    xml.push_str("</ReleaseList></NewReleaseMessage>");

    println!("Created XML with 10 sibling Release elements");
    println!("Expected depth for Release elements: 3");
    println!("Previous bug would count this as depth 13+ (incorrect!)");
    println!("Our fix should keep it at depth 3 (correct)");

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(xml.as_bytes());

    match parser.parse(cursor) {
        Ok(_) => {
            println!("✅ SUCCESS: Parsed successfully!");
            println!("The depth tracking fix is working correctly.");
        }
        Err(e) => {
            println!("❌ FAILED: Parse error: {:?}", e);
            if format!("{:?}", e).contains("DepthLimitExceeded") {
                panic!("The depth limit bug is still present - siblings are being counted as nested depth.");
            } else {
                panic!("Unexpected error: {:?}", e);
            }
        }
    }
}
