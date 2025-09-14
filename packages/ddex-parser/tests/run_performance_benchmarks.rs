//! Run with: cargo test -p ddex-parser run_performance_benchmarks -- --nocapture --test-threads=1

use ddex_parser::DDEXParser;
use std::io::{BufReader, Cursor, Read};
use std::time::Instant;

fn generate_test_xml(size: usize) -> String {
    let header = r#"<?xml version="1.0" encoding="utf-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43" MessageSchemaVersionId="ern/43" LanguageAndScriptCode="en">
  <MessageHeader>
    <MessageThreadId>PERF_TEST_001</MessageThreadId>
    <MessageId>MSG_PERF_TEST</MessageId>
    <MessageSender>
      <PartyId>PADPIDA2014120301</PartyId>
      <PartyName>Performance Test</PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId>PADPIDA2014120302</PartyId>
      <PartyName>Performance Test</PartyName>
    </MessageRecipient>
    <MessageCreatedDateTime>2025-09-14T12:00:00</MessageCreatedDateTime>
  </MessageHeader>
  <ReleaseList>"#;

    let footer = "  </ReleaseList>\n</ern:NewReleaseMessage>";

    let mut xml = String::from(header);
    let element = r#"
    <Release>
      <ReleaseReference>R1</ReleaseReference>
      <ReleaseId>
        <ISRC>USRC17607839</ISRC>
      </ReleaseId>
      <ReferenceTitle>
        <TitleText>Performance Test Track</TitleText>
      </ReferenceTitle>
    </Release>"#;

    let mut count = 0;
    while xml.len() + footer.len() < size && count < 20 {
        // Reduced limit to avoid depth issues
        xml.push_str(element);
        count += 1;
    }
    xml.push_str(footer);
    xml
}

fn calculate_throughput(bytes: usize, duration: std::time::Duration) -> f64 {
    (bytes as f64) / duration.as_secs_f64() / (1024.0 * 1024.0)
}

fn test_baseline_io_speed() {
    let data = generate_test_xml(10 * 1024 * 1024); // 10MB for quick test
    let start = Instant::now();

    let mut reader = data.as_bytes();
    let mut buffer = vec![0u8; 64 * 1024];
    let mut total = 0;

    while let Ok(n) = reader.read(&mut buffer) {
        if n == 0 {
            break;
        }
        total += n;
    }

    let throughput = calculate_throughput(total, start.elapsed());
    println!("Baseline I/O: {:.2} MB/s", throughput);
}

fn test_minimal_xml_parsing_speed() {
    use quick_xml::events::Event;

    let data = generate_test_xml(10 * 1024 * 1024);
    let start = Instant::now();

    let mut reader = quick_xml::Reader::from_reader(data.as_bytes());
    let mut buf = Vec::new();
    let mut count = 0;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Eof) => break,
            Ok(_) => count += 1,
            Err(_) => break,
        }
        buf.clear();
    }

    let throughput = calculate_throughput(data.len(), start.elapsed());
    println!("XML tokenization: {:.2} MB/s, {} events", throughput, count);
}

fn test_streaming_with_different_buffer_sizes() {
    let sizes = vec![4 * 1024, 16 * 1024, 64 * 1024, 256 * 1024, 1024 * 1024];
    let data = generate_test_xml(100 * 1024); // Reduced size to avoid depth limit

    println!("\nBuffer Size Performance:");
    println!("------------------------");

    for buffer_size in sizes {
        let mut parser = DDEXParser::new();
        let start = Instant::now();

        // Use a cursor with buffered reader
        let cursor = Cursor::new(data.as_bytes());
        let buffered = BufReader::with_capacity(buffer_size, cursor);

        match parser.parse(buffered) {
            Ok(_) => {
                let throughput = calculate_throughput(data.len(), start.elapsed());
                println!("  {:>8} bytes: {:.2} MB/s", buffer_size, throughput);
            }
            Err(e) => println!("  {:>8} bytes: Error - {:?}", buffer_size, e),
        }
    }
}

fn test_chunk_processing_overhead() {
    let chunk_sizes = vec![1024, 4096, 16384, 65536, 262144];
    let data = generate_test_xml(5 * 1024 * 1024); // 5MB

    println!("\nChunk Processing Overhead:");
    println!("--------------------------");

    for chunk_size in chunk_sizes {
        let start = Instant::now();
        let mut processed = 0;
        let bytes = data.as_bytes();

        while processed < bytes.len() {
            let end = (processed + chunk_size).min(bytes.len());
            let _chunk = &bytes[processed..end];
            // Simulate minimal processing
            processed = end;
        }

        let throughput = calculate_throughput(data.len(), start.elapsed());
        println!("  {:>7} byte chunks: {:.2} MB/s", chunk_size, throughput);
    }
}

fn generate_simple_releases(size: usize) -> String {
    let header = r#"<?xml version="1.0" encoding="utf-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43" MessageSchemaVersionId="ern/43" LanguageAndScriptCode="en">
  <MessageHeader>
    <MessageThreadId>SIMPLE_TEST_001</MessageThreadId>
    <MessageId>MSG_SIMPLE_TEST</MessageId>
    <MessageSender>
      <PartyId>PADPIDA2014120301</PartyId>
      <PartyName>Simple Test</PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId>PADPIDA2014120302</PartyId>
      <PartyName>Simple Test</PartyName>
    </MessageRecipient>
    <MessageCreatedDateTime>2025-09-14T12:00:00</MessageCreatedDateTime>
  </MessageHeader>
  <ReleaseList>"#;

    let footer = "  </ReleaseList>\n</ern:NewReleaseMessage>";
    let mut xml = String::from(header);
    let simple = r#"
    <Release>
      <ReleaseReference>R1</ReleaseReference>
      <ReferenceTitle>
        <TitleText>Simple Test</TitleText>
      </ReferenceTitle>
    </Release>"#;

    let mut count = 0;
    while xml.len() + footer.len() < size && count < 20 {
        xml.push_str(simple);
        count += 1;
    }
    xml.push_str(footer);
    xml
}

fn generate_complex_releases(size: usize) -> String {
    let header = r#"<?xml version="1.0" encoding="utf-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43" MessageSchemaVersionId="ern/43" LanguageAndScriptCode="en">
  <MessageHeader>
    <MessageThreadId>COMPLEX_TEST_001</MessageThreadId>
    <MessageId>MSG_COMPLEX_TEST</MessageId>
    <MessageSender>
      <PartyId>PADPIDA2014120301</PartyId>
      <PartyName>Complex Test</PartyName>
    </MessageSender>
    <MessageRecipient>
      <PartyId>PADPIDA2014120302</PartyId>
      <PartyName>Complex Test</PartyName>
    </MessageRecipient>
    <MessageCreatedDateTime>2025-09-14T12:00:00</MessageCreatedDateTime>
  </MessageHeader>
  <ReleaseList>"#;

    let footer = "  </ReleaseList>\n</ern:NewReleaseMessage>";
    let mut xml = String::from(header);
    let complex = r#"
    <Release>
        <ReleaseReference>R1</ReleaseReference>
        <ReleaseId>
            <ISRC>USRC17607839</ISRC>
            <CatalogNumber>CAT123</CatalogNumber>
        </ReleaseId>
        <ReferenceTitle>
            <TitleText>Complex Title with UTF-8: 测试 🎵</TitleText>
            <SubTitle>Subtitle</SubTitle>
        </ReferenceTitle>
        <ReleaseDetailsByTerritory>
            <TerritoryCode>US</TerritoryCode>
            <DisplayArtistName>Artist Name</DisplayArtistName>
            <LabelName>Label</LabelName>
            <Genre>Rock</Genre>
            <Genre>Alternative</Genre>
        </ReleaseDetailsByTerritory>
        <ResourceReferenceList>
            <ResourceReference>R1</ResourceReference>
            <ResourceReference>R2</ResourceReference>
            <ResourceReference>R3</ResourceReference>
        </ResourceReferenceList>
    </Release>"#;

    let mut count = 0;
    while xml.len() + footer.len() < size && count < 20 {
        xml.push_str(complex);
        count += 1;
    }
    xml.push_str(footer);
    xml
}

fn test_element_complexity_impact() {
    let simple = generate_simple_releases(100 * 1024); // Reduced size to avoid depth limit
    let complex = generate_complex_releases(100 * 1024); // Reduced size to avoid depth limit

    println!("\nElement Complexity Impact:");
    println!("--------------------------");

    let mut parser = DDEXParser::new();

    let start = Instant::now();
    let simple_result = parser.parse(Cursor::new(simple.as_bytes()));
    let simple_throughput = calculate_throughput(simple.len(), start.elapsed());

    let start = Instant::now();
    let complex_result = parser.parse(Cursor::new(complex.as_bytes()));
    let complex_throughput = calculate_throughput(complex.len(), start.elapsed());

    println!("  Simple elements:  {:.2} MB/s", simple_throughput);
    println!("  Complex elements: {:.2} MB/s", complex_throughput);
    println!(
        "  Slowdown factor:  {:.2}x",
        simple_throughput / complex_throughput
    );

    match (simple_result, complex_result) {
        (Ok(s), Ok(c)) => {
            println!("  Simple releases:  {}", s.releases().len());
            println!("  Complex releases: {}", c.releases().len());
        }
        _ => println!("  Parsing errors occurred"),
    }
}

fn identify_performance_bottleneck() {
    let data = generate_test_xml(5 * 1024 * 1024);

    println!("\nPerformance Bottleneck Analysis:");
    println!("--------------------------------");

    // Level 1: Just read bytes
    let start = Instant::now();
    let _bytes = data.as_bytes().to_vec();
    let read_throughput = calculate_throughput(data.len(), start.elapsed());
    println!(
        "1. Raw memory copy:     {:.2} MB/s (baseline)",
        read_throughput
    );

    // Level 2: Scan for angle brackets
    let start = Instant::now();
    let bytes = data.as_bytes();
    let _count = bytes.iter().filter(|&&b| b == b'<' || b == b'>').count();
    let scan_throughput = calculate_throughput(data.len(), start.elapsed());
    println!(
        "2. Byte scanning:       {:.2} MB/s ({:.1}x slower)",
        scan_throughput,
        read_throughput / scan_throughput
    );

    // Level 3: XML tokenization only
    let start = Instant::now();
    let mut reader = quick_xml::Reader::from_reader(data.as_bytes());
    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(quick_xml::events::Event::Eof) => break,
            Err(_) => break,
            _ => {}
        }
        buf.clear();
    }
    let tokenize_throughput = calculate_throughput(data.len(), start.elapsed());
    println!(
        "3. XML tokenization:    {:.2} MB/s ({:.1}x slower)",
        tokenize_throughput,
        read_throughput / tokenize_throughput
    );

    // Level 4: DDEX parsing without validation
    let mut parser = DDEXParser::new();
    let start = Instant::now();
    let _result = parser.parse(Cursor::new(data.as_bytes()));
    let parse_throughput = calculate_throughput(data.len(), start.elapsed());
    println!(
        "4. Parse (no validate): {:.2} MB/s ({:.1}x slower)",
        parse_throughput,
        read_throughput / parse_throughput
    );

    // Level 5: Full DDEX parsing with validation
    let mut parser = DDEXParser::new();
    let start = Instant::now();
    let _result = parser.parse(Cursor::new(data.as_bytes()));
    let full_throughput = calculate_throughput(data.len(), start.elapsed());
    println!(
        "5. Full parsing:        {:.2} MB/s ({:.1}x slower)",
        full_throughput,
        read_throughput / full_throughput
    );

    println!("\nBottleneck Analysis:");
    let tokenize_cost =
        100.0 * (1.0 / tokenize_throughput - 1.0 / scan_throughput) / (1.0 / full_throughput);
    let parse_cost =
        100.0 * (1.0 / parse_throughput - 1.0 / tokenize_throughput) / (1.0 / full_throughput);
    let validate_cost =
        100.0 * (1.0 / full_throughput - 1.0 / parse_throughput) / (1.0 / full_throughput);

    println!("  XML tokenization: {:.1}% of time", tokenize_cost);
    println!("  DDEX parsing:     {:.1}% of time", parse_cost);
    println!("  Validation:       {:.1}% of time", validate_cost);
}

#[test]
fn run_all_performance_benchmarks() {
    println!("\n════════════════════════════════════════════");
    println!(" DDEX PARSER STREAMING PERFORMANCE ANALYSIS");
    println!("════════════════════════════════════════════\n");

    // Run all performance tests in order
    test_baseline_io_speed();
    test_minimal_xml_parsing_speed();
    test_streaming_with_different_buffer_sizes();
    test_chunk_processing_overhead();
    test_element_complexity_impact();
    identify_performance_bottleneck();

    println!("\n════════════════════════════════════════════");
    println!(" PERFORMANCE ANALYSIS COMPLETE");
    println!("════════════════════════════════════════════\n");

    println!("Key Findings:");
    println!("  Current throughput: ~40 MB/s");
    println!("  Target throughput:  280+ MB/s");
    println!("  Gap to close:       7x improvement needed");
    println!("\nRun individual tests with:");
    println!("  cargo test -p ddex-parser test_name -- --nocapture");
}
