use ddex_parser::DDEXParser;
use std::io::Cursor;
use std::time::Instant;

#[test]
fn test_fast_streaming_performance() {
    println!("\n=== FAST STREAMING PERFORMANCE TEST ===\n");

    // Test 1: Small valid XML
    let small_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
    <MessageHeader><MessageId>MSG123</MessageId></MessageHeader>
    <ReleaseList>
        <Release><ReleaseId>R1</ReleaseId></Release>
        <Release><ReleaseId>R2</ReleaseId></Release>
    </ReleaseList>
</NewReleaseMessage>"#;

    println!("Test 1: Small file (2 releases)");
    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(small_xml.as_bytes());
    match parser.parse(cursor) {
        Ok(_) => println!("  ✅ Parsed successfully"),
        Err(e) => println!("  ❌ Error: {:?}", e),
    }

    // Test 2: Medium file (100 releases - should work)
    println!("\nTest 2: Medium file (100 releases)");
    let mut medium_xml = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
    <MessageHeader><MessageId>MSG123</MessageId></MessageHeader>
    <ReleaseList>"#,
    );

    for i in 0..100 {
        medium_xml.push_str(&format!("<Release><ReleaseId>R{}</ReleaseId></Release>", i));
    }
    medium_xml.push_str("</ReleaseList></NewReleaseMessage>");

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(medium_xml.as_bytes());
    let start = Instant::now();

    match parser.parse(cursor) {
        Ok(_result) => {
            let elapsed = start.elapsed();
            let mb = medium_xml.len() as f64 / 1_048_576.0;
            let throughput = mb / elapsed.as_secs_f64();

            println!("  ✅ Parsed successfully");
            println!("  File size: {:.3} MB", mb);
            println!("  Parse time: {:.3}s", elapsed.as_secs_f64());
            println!("  Throughput: {:.2} MB/s", throughput);

            if throughput > 100.0 {
                println!("  🚀 Fast streaming appears active (>100 MB/s)");
            } else if throughput > 50.0 {
                println!("  ⚡ Moderate performance (50-100 MB/s)");
            } else {
                println!("  🐌 Slow performance (<50 MB/s) - fast streaming may not be active");
            }
        }
        Err(e) => {
            println!("  ❌ Parse error: {:?}", e);
            if format!("{:?}", e).contains("DepthLimitExceeded") {
                println!("  Note: Depth limit incorrectly triggered for sibling elements!");
            }
        }
    }

    // Test 3: Large file (1000 releases - may hit depth limit bug)
    println!("\nTest 3: Large file (1000 releases)");
    let mut large_xml = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
    <MessageHeader><MessageId>MSG123</MessageId></MessageHeader>
    <ReleaseList>"#,
    );

    for i in 0..1000 {
        large_xml.push_str(&format!("<Release><ReleaseId>R{}</ReleaseId></Release>", i));
    }
    large_xml.push_str("</ReleaseList></NewReleaseMessage>");

    let mut parser = DDEXParser::new();
    let cursor = Cursor::new(large_xml.as_bytes());
    let start = Instant::now();

    match parser.parse(cursor) {
        Ok(_result) => {
            let elapsed = start.elapsed();
            let mb = large_xml.len() as f64 / 1_048_576.0;
            let throughput = mb / elapsed.as_secs_f64();

            println!("  ✅ Parsed successfully");
            println!("  File size: {:.3} MB", mb);
            println!("  Parse time: {:.3}s", elapsed.as_secs_f64());
            println!("  Throughput: {:.2} MB/s", throughput);
        }
        Err(e) => {
            println!("  ❌ Parse error: {:?}", e);
            if format!("{:?}", e).contains("DepthLimitExceeded") {
                println!("  BUG: Sibling elements shouldn't increase depth!");
                println!("  The parser is incorrectly counting siblings as nested depth.");
            }
        }
    }

    println!("\n=== END OF PERFORMANCE TEST ===\n");
}
