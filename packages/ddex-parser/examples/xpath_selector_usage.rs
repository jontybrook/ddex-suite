// examples/xpath_selector_usage.rs
//! Comprehensive examples demonstrating XPath-like selector functionality

use ddex_parser::parser::xpath_selector::XPathSelector;
use std::io::Cursor;
use std::time::Instant;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== XPath Selector Usage Examples ===\n");

    // Example 1: Basic element selection
    basic_element_selection()?;

    // Example 2: Descendant-or-self axis (//element)
    descendant_or_self_selection()?;

    // Example 3: Wildcard matching
    wildcard_selection()?;

    // Example 4: Attribute filtering
    attribute_filtering()?;

    // Example 5: DDEX-specific examples
    ddex_specific_examples()?;

    // Example 6: Performance with large documents
    performance_demonstration()?;

    // Example 7: Complex XPath expressions
    complex_expressions()?;

    Ok(())
}

fn basic_element_selection() -> Result<(), Box<dyn std::error::Error>> {
    println!("1. Basic Element Selection");

    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <library>
        <book>
            <title>Rust Programming</title>
            <author>Steve Klabnik</author>
        </book>
        <book>
            <title>The Book</title>
            <author>Carol Nichols</author>
        </book>
    </library>"#;

    // Select all book titles
    let cursor = Cursor::new(xml.as_bytes());
    let selector = XPathSelector::new("//title")?;
    let result = selector.select(cursor)?;

    println!("   XPath: //title");
    println!("   Found {} titles:", result.values.len());
    for (i, title) in result.values.iter().enumerate() {
        println!("     {}. {}", i + 1, title);
    }
    println!(
        "   Performance: {} elements processed in {:?}",
        result.stats.elements_processed, result.stats.duration
    );
    println!();

    Ok(())
}

fn descendant_or_self_selection() -> Result<(), Box<dyn std::error::Error>> {
    println!("2. Descendant-or-Self Axis (//)");

    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <company>
        <department name="Engineering">
            <team>
                <person>Alice</person>
                <person>Bob</person>
            </team>
        </department>
        <person>CEO</person>
    </company>"#;

    let cursor = Cursor::new(xml.as_bytes());
    let selector = XPathSelector::new("//person")?;
    let result = selector.select(cursor)?;

    println!("   XPath: //person");
    println!("   Found {} people at all levels:", result.values.len());
    for (i, person) in result.values.iter().enumerate() {
        println!("     {}. {} (path: {})", i + 1, person, result.paths[i]);
    }
    println!();

    Ok(())
}

fn wildcard_selection() -> Result<(), Box<dyn std::error::Error>> {
    println!("3. Wildcard Matching");

    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <store>
        <electronics>
            <laptop>MacBook Pro</laptop>
            <phone>iPhone</phone>
        </electronics>
        <books>
            <novel>1984</novel>
            <technical>Rust Guide</technical>
        </books>
    </store>"#;

    // Select all items regardless of category
    let cursor = Cursor::new(xml.as_bytes());
    let selector = XPathSelector::new("//*/laptop")?;
    let result = selector.select(cursor)?;

    println!("   XPath: //*/laptop");
    println!("   Found {} laptops:", result.values.len());
    for laptop in &result.values {
        println!("     - {}", laptop);
    }

    // Use wildcard to get all products under any category
    let cursor2 = Cursor::new(xml.as_bytes());
    let selector2 = XPathSelector::new("//*/*")?;
    let result2 = selector2.select(cursor2)?;

    println!("   XPath: //*/*");
    println!("   Found {} products:", result2.values.len());
    for (i, product) in result2.values.iter().enumerate() {
        println!("     {}. {}", i + 1, product);
    }
    println!();

    Ok(())
}

fn attribute_filtering() -> Result<(), Box<dyn std::error::Error>> {
    println!("4. Attribute Filtering");

    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <inventory>
        <item type="electronics" status="available">Laptop</item>
        <item type="electronics" status="sold">Phone</item>
        <item type="books" status="available">Novel</item>
        <item type="books">Dictionary</item>
        <item status="available">Miscellaneous</item>
    </inventory>"#;

    // Find items by attribute existence
    let cursor1 = Cursor::new(xml.as_bytes());
    let selector1 = XPathSelector::new("//item[@type]")?;
    let result1 = selector1.select(cursor1)?;

    println!("   XPath: //item[@type] (attribute exists)");
    println!(
        "   Found {} items with type attribute:",
        result1.values.len()
    );
    for (i, item) in result1.values.iter().enumerate() {
        let attrs = &result1.attributes[i];
        println!(
            "     {}. {} (type: {})",
            i + 1,
            item,
            attrs.get("type").unwrap_or(&"unknown".to_string())
        );
    }

    // Find items by specific attribute value
    let cursor2 = Cursor::new(xml.as_bytes());
    let selector2 = XPathSelector::new("//item[@status='available']")?;
    let result2 = selector2.select(cursor2)?;

    println!("   XPath: //item[@status='available'] (specific value)");
    println!("   Found {} available items:", result2.values.len());
    for item in &result2.values {
        println!("     - {}", item);
    }
    println!();

    Ok(())
}

fn ddex_specific_examples() -> Result<(), Box<dyn std::error::Error>> {
    println!("5. DDEX-Specific Examples");

    let ddex_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>MSG001</ern:MessageId>
            <ern:MessageSender>
                <ern:PartyName>Test Label</ern:PartyName>
            </ern:MessageSender>
        </ern:MessageHeader>
        <ern:ReleaseList>
            <ern:Release IsMainRelease="true">
                <ern:ReleaseId Namespace="GRid">A1-123456789-1234567890-A</ern:ReleaseId>
                <ern:ReferenceTitle>
                    <ern:TitleText>My Album</ern:TitleText>
                    <ern:SubTitle>Deluxe Edition</ern:SubTitle>
                </ern:ReferenceTitle>
            </ern:Release>
            <ern:Release IsMainRelease="false">
                <ern:ReleaseId>REL002</ern:ReleaseId>
                <ern:ReferenceTitle>
                    <ern:TitleText>Bonus Tracks</ern:TitleText>
                </ern:ReferenceTitle>
            </ern:Release>
        </ern:ReleaseList>
        <ern:ResourceList>
            <ern:SoundRecording>
                <ern:SoundRecordingId Namespace="ISRC">USRC17607839</ern:SoundRecordingId>
                <ern:ReferenceTitle>
                    <ern:TitleText>Track One</ern:TitleText>
                </ern:ReferenceTitle>
            </ern:SoundRecording>
            <ern:SoundRecording>
                <ern:SoundRecordingId Namespace="ISRC">GBUM71505078</ern:SoundRecordingId>
                <ern:ReferenceTitle>
                    <ern:TitleText>Track Two</ern:TitleText>
                </ern:ReferenceTitle>
            </ern:SoundRecording>
        </ern:ResourceList>
    </ern:NewReleaseMessage>"#;

    // Example 5.1: Extract all release titles using convenience method
    let cursor1 = Cursor::new(ddex_xml.as_bytes());
    let titles = XPathSelector::select_release_titles(cursor1)?;
    println!("   Convenience method - Release titles:");
    for (i, title) in titles.iter().enumerate() {
        println!("     {}. {}", i + 1, title);
    }

    // Example 5.2: Extract ISRCs using convenience method
    let cursor2 = Cursor::new(ddex_xml.as_bytes());
    let isrcs = XPathSelector::select_isrcs(cursor2)?;
    println!("   Convenience method - ISRCs:");
    for (i, isrc) in isrcs.iter().enumerate() {
        println!("     {}. {}", i + 1, isrc);
    }

    // Example 5.3: Custom XPath for main releases only
    let cursor3 = Cursor::new(ddex_xml.as_bytes());
    let selector3 =
        XPathSelector::new("//Release[@IsMainRelease='true']//TitleText")?.namespace_aware(true);
    let result3 = selector3.select(cursor3)?;
    println!("   Custom XPath - Main release titles only:");
    for title in &result3.values {
        println!("     - {}", title);
    }

    // Example 5.4: All titles (releases + tracks)
    let cursor4 = Cursor::new(ddex_xml.as_bytes());
    let all_titles = XPathSelector::select_with_xpath(cursor4, "//TitleText")?;
    println!(
        "   All titles (releases + tracks): {} found",
        all_titles.len()
    );
    for (i, title) in all_titles.iter().enumerate() {
        println!("     {}. {}", i + 1, title);
    }
    println!();

    Ok(())
}

fn performance_demonstration() -> Result<(), Box<dyn std::error::Error>> {
    println!("6. Performance Demonstration");

    // Generate a larger DDEX-like document
    let mut large_xml = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
    <ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
        <ern:MessageHeader>
            <ern:MessageId>PERF_TEST</ern:MessageId>
        </ern:MessageHeader>
        <ern:ResourceList>"#,
    );

    // Add many sound recordings
    for i in 0..1000 {
        let isrc = format!("US{:03}{:02}{:05}", i % 1000, 20 + (i % 25), i);
        large_xml.push_str(&format!(
            r#"
            <ern:SoundRecording>
                <ern:SoundRecordingId Namespace="ISRC">{}</ern:SoundRecordingId>
                <ern:ReferenceTitle>
                    <ern:TitleText>Track {} Title</ern:TitleText>
                </ern:ReferenceTitle>
                <ern:Duration>PT{}M{}S</ern:Duration>
            </ern:SoundRecording>"#,
            isrc,
            i,
            3 + (i % 5),
            30 + (i % 30)
        ));
    }

    large_xml.push_str("</ern:ResourceList></ern:NewReleaseMessage>");

    let data_size = large_xml.len() as f64 / (1024.0 * 1024.0);
    println!("   Testing with {:.2} MB of XML data...", data_size);

    // Performance test 1: Extract all ISRCs
    let cursor1 = Cursor::new(large_xml.as_bytes());
    let start1 = Instant::now();
    let isrc_selector = XPathSelector::ddex_isrcs()?;
    let isrc_result = isrc_selector.select(cursor1)?;
    let duration1 = start1.elapsed();

    println!("   ISRC Extraction:");
    println!("     - Found: {} ISRCs", isrc_result.values.len());
    println!("     - Time: {:?}", duration1);
    println!(
        "     - Throughput: {:.2} MB/s",
        data_size / duration1.as_secs_f64()
    );
    println!(
        "     - Elements/sec: {:.0}",
        isrc_result.stats.elements_processed as f64 / duration1.as_secs_f64()
    );

    // Performance test 2: Extract all track titles
    let cursor2 = Cursor::new(large_xml.as_bytes());
    let start2 = Instant::now();
    let title_result = XPathSelector::select_with_xpath(cursor2, "//SoundRecording//TitleText")?;
    let duration2 = start2.elapsed();

    println!("   Title Extraction:");
    println!("     - Found: {} titles", title_result.len());
    println!("     - Time: {:?}", duration2);
    println!(
        "     - Throughput: {:.2} MB/s",
        data_size / duration2.as_secs_f64()
    );

    // Performance test 3: Complex filtering
    let cursor3 = Cursor::new(large_xml.as_bytes());
    let start3 = Instant::now();
    let complex_selector =
        XPathSelector::new("//SoundRecordingId[@Namespace='ISRC']")?.max_results(100); // Limit results for faster processing
    let complex_result = complex_selector.select(cursor3)?;
    let duration3 = start3.elapsed();

    println!("   Complex Filtering (first 100 results):");
    println!("     - Found: {} ISRCs", complex_result.values.len());
    println!("     - Time: {:?}", duration3);
    println!(
        "     - Throughput: {:.2} MB/s",
        data_size / duration3.as_secs_f64()
    );
    println!();

    Ok(())
}

fn complex_expressions() -> Result<(), Box<dyn std::error::Error>> {
    println!("7. Complex XPath Expressions");

    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
    <catalog>
        <category name="electronics">
            <product id="p1" price="999" currency="USD">
                <name>Laptop</name>
                <description>High-performance laptop</description>
                <features>
                    <feature>16GB RAM</feature>
                    <feature>1TB SSD</feature>
                </features>
            </product>
            <product id="p2" price="699" currency="USD">
                <name>Tablet</name>
                <description>Portable tablet</description>
            </product>
        </category>
        <category name="books">
            <product id="b1" price="25" currency="USD">
                <name>Programming Book</name>
                <description>Learn to code</description>
            </product>
        </category>
    </catalog>"#;

    // Complex expression 1: Descendant wildcard with specific child
    let cursor1 = Cursor::new(xml.as_bytes());
    let selector1 = XPathSelector::new("//*/product/name")?;
    let result1 = selector1.select(cursor1)?;

    println!("   XPath: //*/product/name");
    println!("   Product names: {} found", result1.values.len());
    for name in &result1.values {
        println!("     - {}", name);
    }

    // Complex expression 2: Multiple levels with wildcards
    let cursor2 = Cursor::new(xml.as_bytes());
    let selector2 = XPathSelector::new("//product//feature")?;
    let result2 = selector2.select(cursor2)?;

    println!("   XPath: //product//feature");
    println!("   Product features: {} found", result2.values.len());
    for feature in &result2.values {
        println!("     - {}", feature);
    }

    // Complex expression 3: Attribute filtering with descendant matching
    let cursor3 = Cursor::new(xml.as_bytes());
    let selector3 = XPathSelector::new("//category[@name='electronics']//product")?;
    let result3 = selector3.select(cursor3)?;

    println!("   XPath: //category[@name='electronics']//product");
    println!("   Electronics products: {} found", result3.values.len());
    for (i, _) in result3.values.iter().enumerate() {
        let attrs = &result3.attributes[i];
        if let (Some(id), Some(price)) = (attrs.get("id"), attrs.get("price")) {
            println!("     - Product {} (${} USD)", id, price);
        }
    }

    println!();
    println!("=== XPath Selector Summary ===");
    println!("✓ Basic element selection (//element)");
    println!("✓ Descendant-or-self axis matching");
    println!("✓ Wildcard element matching (*)");
    println!("✓ Attribute filtering ([@attr] and [@attr='value'])");
    println!("✓ Namespace-aware processing");
    println!("✓ Case sensitivity options");
    println!("✓ Performance statistics tracking");
    println!("✓ Result limiting for large documents");
    println!("✓ DDEX-specific convenience methods");

    Ok(())
}
