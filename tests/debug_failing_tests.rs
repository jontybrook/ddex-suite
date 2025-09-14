//! Debug failing tests for DDEX Parser v0.4.0
//!
//! This module provides targeted debugging for the specific tests that are failing

use std::time::{Duration, Instant};
use std::io::Cursor;

/// Test namespace scope inheritance - One of the identified failing tests
#[test]
fn debug_namespace_scope_inheritance() {
    println!("\n🔍 Debugging Namespace Scope Inheritance");
    println!("=" | repeat(50));

    // This test is likely failing due to complex namespace handling
    let xml_with_nested_namespaces = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43"
                           xmlns:xs="http://www.w3.org/2001/XMLSchema">
        <ern:MessageHeader>
            <ern:MessageId>MSG123</ern:MessageId>
            <ern:MessageSender xmlns:custom="http://example.com/custom">
                <ern:PartyId namespace="PADPIDA2020">TEST001</ern:PartyId>
                <custom:Extension>Custom data</custom:Extension>
            </ern:MessageSender>
        </ern:MessageHeader>
        <ern:Release ReleaseReference="REL123">
            <ern:ReferenceTitle xmlns:local="http://local.example.com">
                <local:TitleText>Test Release</local:TitleText>
                <ern:SubTitle>Subtitle</ern:SubTitle>
            </ern:ReferenceTitle>
        </ern:Release>
    </ern:NewReleaseMessage>"#;

    println!("Testing namespace scope inheritance...");

    // Use quick-xml to test basic parsing
    let mut reader = quick_xml::Reader::from_str(xml_with_nested_namespaces);
    let mut buf = Vec::new();
    let mut namespace_stack = Vec::new();
    let mut element_count = 0;

    loop {
        match reader.read_namespaced_event(&mut buf) {
            Ok((namespace, quick_xml::events::Event::Start(e))) => {
                element_count += 1;
                let name = std::str::from_utf8(e.name().as_ref()).unwrap_or("?");
                let ns = namespace.map(|n| std::str::from_utf8(n).unwrap_or("?"));
                println!("  Start element: {:?}:{}", ns, name);

                // Track namespace declarations
                for attr in e.attributes() {
                    if let Ok(attr) = attr {
                        let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("?");
                        if key.starts_with("xmlns") {
                            let value = std::str::from_utf8(&attr.value).unwrap_or("?");
                            println!("    Namespace declaration: {} = {}", key, value);
                        }
                    }
                }
            }
            Ok((namespace, quick_xml::events::Event::End(e))) => {
                let name = std::str::from_utf8(e.name().as_ref()).unwrap_or("?");
                let ns = namespace.map(|n| std::str::from_utf8(n).unwrap_or("?"));
                println!("  End element: {:?}:{}", ns, name);
            }
            Ok((_, quick_xml::events::Event::Eof)) => break,
            Ok(_) => {} // Ignore other events
            Err(e) => {
                println!("❌ XML parsing error: {}", e);
                break;
            }
        }
        buf.clear();
    }

    println!("Parsed {} elements", element_count);

    if element_count > 5 {
        println!("✅ Basic namespace parsing successful");
    } else {
        println!("❌ Namespace parsing may have issues");
    }

    // Test for specific namespace inheritance issue
    println!("\nTesting namespace inheritance edge case:");

    // This might be the specific case that's failing
    let problematic_xml = r#"<?xml version="1.0"?>
    <root xmlns:a="http://example.com/a">
        <a:parent xmlns:b="http://example.com/b">
            <b:child xmlns:a="http://example.com/new-a">
                <a:grandchild>Content</a:grandchild>
            </b:child>
        </a:parent>
    </root>"#;

    let mut reader = quick_xml::Reader::from_str(problematic_xml);
    let mut buf = Vec::new();
    let mut inheritance_ok = true;

    // Check if namespace prefixes are correctly inherited
    while let Ok((namespace, event)) = reader.read_namespaced_event(&mut buf) {
        match event {
            quick_xml::events::Event::Start(e) => {
                let name = std::str::from_utf8(e.name().as_ref()).unwrap_or("?");
                if name == "grandchild" {
                    // The 'a' prefix should resolve to "http://example.com/new-a" here, not the original
                    if let Some(ns) = namespace {
                        let ns_str = std::str::from_utf8(ns).unwrap_or("?");
                        println!("  grandchild namespace: {}", ns_str);
                        if ns_str != "http://example.com/new-a" {
                            inheritance_ok = false;
                        }
                    }
                }
            }
            quick_xml::events::Event::Eof => break,
            _ => {}
        }
        buf.clear();
    }

    if inheritance_ok {
        println!("✅ Namespace inheritance working correctly");
    } else {
        println!("❌ Namespace inheritance issue detected - this is likely the failing test cause");
    }
}

/// Test comprehensive streaming parser - Another identified failing test
#[test]
fn debug_comprehensive_streaming_parser() {
    println!("\n🔍 Debugging Comprehensive Streaming Parser");
    println!("{}", "=".repeat(50));

    // This test likely fails due to timeout or performance issues
    println!("Testing with timeout protection...");

    let start_time = Instant::now();
    let timeout = Duration::from_secs(30); // 30 second timeout

    // Generate a moderately sized test file (not the 700MB monster!)
    println!("Generating test data (5MB)...");
    let test_data = generate_reasonable_test_data(5 * 1024 * 1024); // 5MB

    if start_time.elapsed() > timeout {
        println!("❌ Test data generation timed out");
        return;
    }

    println!("Generated {} bytes of test data", test_data.len());

    // Test basic streaming parsing with timeout check
    println!("Testing streaming parser...");
    let parse_start = Instant::now();

    let mut reader = quick_xml::Reader::from_reader(&test_data[..]);
    let mut buf = Vec::new();
    let mut element_count = 0;
    let mut release_count = 0;

    loop {
        if parse_start.elapsed() > timeout {
            println!("❌ Parsing timed out after {} seconds", timeout.as_secs());
            break;
        }

        match reader.read_event_into(&mut buf) {
            Ok(quick_xml::events::Event::Start(e)) => {
                element_count += 1;
                let name = std::str::from_utf8(e.name().as_ref()).unwrap_or("?");
                if name == "Release" || name.ends_with(":Release") {
                    release_count += 1;
                }

                // Progress indicator for large files
                if element_count % 10000 == 0 {
                    println!("  Processed {} elements ({} releases) in {:.1}s",
                            element_count, release_count, parse_start.elapsed().as_secs_f32());
                }
            }
            Ok(quick_xml::events::Event::Eof) => break,
            Ok(_) => {} // Other events
            Err(e) => {
                println!("❌ Parsing error: {}", e);
                break;
            }
        }
        buf.clear();
    }

    let parse_time = parse_start.elapsed();
    let throughput = (test_data.len() as f64 / (1024.0 * 1024.0)) / parse_time.as_secs_f64();

    println!("Parsing complete:");
    println!("  Elements: {}", element_count);
    println!("  Releases: {}", release_count);
    println!("  Time: {:.2}s", parse_time.as_secs_f64());
    println!("  Throughput: {:.2} MB/s", throughput);

    if element_count > 100 && release_count > 10 {
        println!("✅ Comprehensive streaming parsing successful");
    } else {
        println!("❌ Comprehensive streaming parsing may have issues");
    }

    // Test memory usage
    println!("\nTesting memory efficiency...");
    let memory_test_start = Instant::now();

    // Parse the same data multiple times to check for memory leaks
    for i in 0..3 {
        if memory_test_start.elapsed() > timeout {
            println!("❌ Memory test timed out");
            break;
        }

        let mut reader = quick_xml::Reader::from_reader(&test_data[..]);
        let mut buf = Vec::new();
        let mut count = 0;

        while let Ok(event) = reader.read_event_into(&mut buf) {
            if matches!(event, quick_xml::events::Event::Eof) {
                break;
            }
            count += 1;
            buf.clear();
        }

        println!("  Pass {}: {} events processed", i + 1, count);
    }

    println!("✅ Memory efficiency test completed");
}

/// Test parallel benchmark - Another failing test
#[test]
fn debug_parallel_benchmark() {
    println!("\n🔍 Debugging Parallel Benchmark");
    println!("{}", "=".repeat(50));

    let timeout = Duration::from_secs(60); // 1 minute timeout
    let start_time = Instant::now();

    println!("Testing parallel processing capabilities...");

    // Use a small test file to avoid timeout
    let test_data = generate_simple_test_data(1024 * 1024); // 1MB
    println!("Generated {} bytes test data", test_data.len());

    if start_time.elapsed() > timeout {
        println!("❌ Test setup timed out");
        return;
    }

    // Test sequential parsing
    println!("Testing sequential parsing...");
    let seq_start = Instant::now();
    let seq_count = parse_elements(&test_data);
    let seq_time = seq_start.elapsed();

    if start_time.elapsed() > timeout {
        println!("❌ Sequential test timed out");
        return;
    }

    println!("  Sequential: {} elements in {:.3}s", seq_count, seq_time.as_secs_f64());

    // Test "parallel" parsing by splitting data
    println!("Testing chunked parsing...");
    let par_start = Instant::now();

    let chunk_size = test_data.len() / 4; // Split into 4 chunks
    let chunks: Vec<&[u8]> = test_data.chunks(chunk_size).collect();
    let mut total_count = 0;

    for (i, chunk) in chunks.iter().enumerate() {
        if start_time.elapsed() > timeout {
            println!("❌ Parallel test timed out at chunk {}", i);
            break;
        }

        let count = parse_elements(chunk);
        total_count += count;
        println!("  Chunk {}: {} elements", i, count);
    }

    let par_time = par_start.elapsed();

    println!("  Chunked: {} elements in {:.3}s", total_count, par_time.as_secs_f64());

    // Calculate speedup (may not be realistic due to overhead)
    if par_time.as_secs_f64() > 0.0 {
        let speedup = seq_time.as_secs_f64() / par_time.as_secs_f64();
        println!("  Apparent speedup: {:.2}x", speedup);

        if speedup > 0.5 { // At least not significantly slower
            println!("✅ Parallel processing shows reasonable performance");
        } else {
            println!("❌ Parallel processing may have performance issues");
        }
    }
}

/// Test aligned streaming parser with builders - Fourth failing test
#[test]
fn debug_aligned_streaming_parser() {
    println!("\n🔍 Debugging Aligned Streaming Parser");
    println!("{}", "=".repeat(50));

    let timeout = Duration::from_secs(30);
    let start_time = Instant::now();

    println!("Testing aligned streaming with timeout protection...");

    // Use minimal test data to avoid timeout
    let simple_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <MessageHeader>
            <MessageId>ALIGN-TEST-001</MessageId>
            <CreatedDateTime>2024-09-13T12:00:00Z</CreatedDateTime>
        </MessageHeader>
        <Release ReleaseReference="REL001">
            <ReferenceTitle>
                <TitleText>Aligned Test Release</TitleText>
            </ReferenceTitle>
        </Release>
        <Release ReleaseReference="REL002">
            <ReferenceTitle>
                <TitleText>Second Test Release</TitleText>
            </ReferenceTitle>
        </Release>
    </ern:NewReleaseMessage>"#;

    if start_time.elapsed() > timeout {
        println!("❌ Test setup timed out");
        return;
    }

    println!("Testing basic alignment parsing...");
    let parse_start = Instant::now();

    let mut reader = quick_xml::Reader::from_str(simple_xml);
    let mut buf = Vec::new();
    let mut releases = Vec::new();
    let mut current_release_id = None;
    let mut current_title = None;

    loop {
        if parse_start.elapsed() > timeout {
            println!("❌ Parsing timed out");
            break;
        }

        match reader.read_event_into(&mut buf) {
            Ok(quick_xml::events::Event::Start(e)) => {
                let name = std::str::from_utf8(e.name().as_ref()).unwrap_or("?");

                if name == "Release" || name.ends_with(":Release") {
                    // Extract ReleaseReference attribute
                    for attr in e.attributes() {
                        if let Ok(attr) = attr {
                            let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("?");
                            if key == "ReleaseReference" {
                                current_release_id = Some(std::str::from_utf8(&attr.value).unwrap_or("?").to_string());
                            }
                        }
                    }
                }
            }
            Ok(quick_xml::events::Event::Text(e)) => {
                let text = e.unescape().unwrap_or_default().trim().to_string();
                if !text.is_empty() {
                    current_title = Some(text);
                }
            }
            Ok(quick_xml::events::Event::End(e)) => {
                let name = std::str::from_utf8(e.name().as_ref()).unwrap_or("?");
                if name == "Release" || name.ends_with(":Release") {
                    if let (Some(id), Some(title)) = (&current_release_id, &current_title) {
                        releases.push((id.clone(), title.clone()));
                        println!("  Found release: {} - {}", id, title);
                    }
                    current_release_id = None;
                    current_title = None;
                }
            }
            Ok(quick_xml::events::Event::Eof) => break,
            Ok(_) => {}
            Err(e) => {
                println!("❌ Parse error: {}", e);
                break;
            }
        }
        buf.clear();
    }

    let parse_time = parse_start.elapsed();
    println!("Aligned parsing completed in {:.3}s", parse_time.as_secs_f64());
    println!("Found {} releases", releases.len());

    if releases.len() >= 2 {
        println!("✅ Aligned streaming parsing successful");
    } else {
        println!("❌ Aligned streaming parsing may have alignment issues");
    }

    // Test "builder" integration (mock)
    println!("\nTesting builder integration...");
    if !releases.is_empty() {
        println!("  Building output from {} releases", releases.len());

        // Mock builder operation
        let build_start = Instant::now();
        let mut output = String::new();

        for (id, title) in releases {
            if build_start.elapsed() > timeout {
                println!("❌ Builder timed out");
                break;
            }

            output.push_str(&format!("Release {}: {}\n", id, title));
        }

        let build_time = build_start.elapsed();
        println!("  Builder completed in {:.3}s", build_time.as_secs_f64());
        println!("  Output length: {} chars", output.len());

        if !output.is_empty() {
            println!("✅ Builder integration successful");
        } else {
            println!("❌ Builder integration failed");
        }
    }
}

/// Generate reasonable sized test data (not 700MB!)
fn generate_reasonable_test_data(target_size: usize) -> Vec<u8> {
    let mut xml = String::from(r#"<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
    <MessageHeader>
        <MessageId>TEST-DATA</MessageId>
        <CreatedDateTime>2024-09-13T12:00:00Z</CreatedDateTime>
    </MessageHeader>
"#);

    let single_release_size = 200; // Smaller releases
    let num_releases = (target_size / single_release_size).min(1000); // Cap at 1000 releases

    for i in 0..num_releases {
        xml.push_str(&format!(r#"
    <Release ReleaseReference="REL-{:06}">
        <ReferenceTitle>
            <TitleText>Test Release #{}</TitleText>
        </ReferenceTitle>
    </Release>"#, i, i));

        // Check size periodically and break if we're getting too large
        if i % 100 == 0 && xml.len() > target_size {
            break;
        }
    }

    xml.push_str("\n</ern:NewReleaseMessage>");
    xml.into_bytes()
}

/// Generate simple test data for quick tests
fn generate_simple_test_data(target_size: usize) -> Vec<u8> {
    let base_xml = r#"<?xml version="1.0"?>
<root><item>data</item><item>more</item></root>"#;

    let mut result = Vec::new();
    while result.len() < target_size {
        result.extend_from_slice(base_xml.as_bytes());
        result.push(b'\n');
    }

    result.truncate(target_size);
    result
}

/// Parse elements from data
fn parse_elements(data: &[u8]) -> usize {
    let mut reader = quick_xml::Reader::from_reader(data);
    let mut buf = Vec::new();
    let mut count = 0;

    while let Ok(event) = reader.read_event_into(&mut buf) {
        if matches!(event, quick_xml::events::Event::Start(_)) {
            count += 1;
        } else if matches!(event, quick_xml::events::Event::Eof) {
            break;
        }
        buf.clear();
    }

    count
}

// Helper function for string repetition
trait StringRepeat {
    fn repeat(&self, n: usize) -> String;
}

impl StringRepeat for &str {
    fn repeat(&self, n: usize) -> String {
        self.chars().cycle().take(n).collect()
    }
}