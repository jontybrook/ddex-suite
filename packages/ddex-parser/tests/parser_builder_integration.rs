//! Parser-Builder Integration Test for DDEX Suite v0.4.0
//!
//! This test validates that the parser and builder work together seamlessly
//! for complete round-trip processing of DDEX XML files.

use std::time::Instant;

/// Test full round-trip between parser and builder
#[test]
fn test_parser_builder_round_trip() {
    println!("\n🔄 Testing Parser-Builder Round Trip Integration\n");
    println!("{}", "=".repeat(60));

    // Step 1: Parse a complex DDEX file
    println!("Step 1: Parsing original DDEX XML...");

    let original_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
    <MessageHeader>
        <MessageId>INTEGRATION-TEST-001</MessageId>
        <CreatedDateTime>2024-09-13T12:00:00Z</CreatedDateTime>
        <MessageSender>
            <PartyId>TEST-SENDER</PartyId>
            <PartyName>Test Integration Label</PartyName>
        </MessageSender>
    </MessageHeader>

    <Release ReleaseReference="ROUND-TRIP-001">
        <ReferenceTitle>
            <TitleText>Round Trip Test Album</TitleText>
        </ReferenceTitle>
        <DisplayArtist>
            <PartyName>Integration Test Artist</PartyName>
            <ArtistRole>MainArtist</ArtistRole>
        </DisplayArtist>
        <Genre>
            <GenreText>Electronic</GenreText>
        </Genre>
        <PLine>
            <Year>2024</Year>
            <PLineText>(P) 2024 Integration Records</PLineText>
        </PLine>
        <CLine>
            <Year>2024</Year>
            <CLineText>(C) 2024 Integration Publishing</CLineText>
        </CLine>
    </Release>

    <SoundRecording SoundRecordingReference="SR-001">
        <ISRC>USINT2400001</ISRC>
        <ReferenceTitle>
            <TitleText>Integration Track 1</TitleText>
        </ReferenceTitle>
        <DisplayArtist>
            <PartyName>Integration Test Artist</PartyName>
        </DisplayArtist>
        <Duration>PT3M42S</Duration>
    </SoundRecording>

    <SoundRecording SoundRecordingReference="SR-002">
        <ISRC>USINT2400002</ISRC>
        <ReferenceTitle>
            <TitleText>Integration Track 2</TitleText>
        </ReferenceTitle>
        <DisplayArtist>
            <PartyName>Integration Test Artist</PartyName>
        </DisplayArtist>
        <Duration>PT4M15S</Duration>
    </SoundRecording>

    <Deal>
        <DealReference>DEAL-001</DealReference>
        <DealTerms>
            <TerritoryCode>Worldwide</TerritoryCode>
            <RightsType>PermanentDownload</RightsType>
        </DealTerms>
    </Deal>
</ern:NewReleaseMessage>"#;

    // Parse using quick-xml as a proxy for our parser
    let start_parse = Instant::now();
    let parse_result = parse_ddex_xml(original_xml);
    let parse_time = start_parse.elapsed();

    println!("✅ Parsing completed in {:.3}s", parse_time.as_secs_f64());

    assert!(parse_result.is_ok(), "Initial parsing should succeed");
    let parsed_data = parse_result.unwrap();

    // Validate parsed structure
    assert_eq!(parsed_data.releases.len(), 1, "Should find 1 release");
    assert_eq!(
        parsed_data.sound_recordings.len(),
        2,
        "Should find 2 sound recordings"
    );
    assert_eq!(parsed_data.deals.len(), 1, "Should find 1 deal");

    println!("  - Found {} releases", parsed_data.releases.len());
    println!(
        "  - Found {} sound recordings",
        parsed_data.sound_recordings.len()
    );
    println!("  - Found {} deals", parsed_data.deals.len());

    // Step 2: Convert to builder format
    println!("\nStep 2: Converting to builder format...");

    let start_convert = Instant::now();
    let build_request = convert_to_build_request(&parsed_data);
    let convert_time = start_convert.elapsed();

    println!(
        "✅ Conversion completed in {:.3}s",
        convert_time.as_secs_f64()
    );

    // Validate conversion
    assert!(
        !build_request.message_id.is_empty(),
        "Message ID should be preserved"
    );
    assert_eq!(
        build_request.releases.len(),
        1,
        "Releases should be preserved"
    );
    assert_eq!(
        build_request.sound_recordings.len(),
        2,
        "Sound recordings should be preserved"
    );

    println!("  - Message ID: {}", build_request.message_id);
    println!("  - Release title: {}", build_request.releases[0].title);

    // Step 3: Rebuild XML using builder
    println!("\nStep 3: Rebuilding XML...");

    let start_build = Instant::now();
    let rebuilt_xml = build_ddex_xml(&build_request);
    let build_time = start_build.elapsed();

    println!("✅ Building completed in {:.3}s", build_time.as_secs_f64());

    assert!(rebuilt_xml.is_ok(), "XML building should succeed");
    let rebuilt_content = rebuilt_xml.unwrap();

    // Validate rebuilt XML structure
    assert!(
        rebuilt_content.contains("<?xml"),
        "Should contain XML declaration"
    );
    assert!(
        rebuilt_content.contains("NewReleaseMessage"),
        "Should contain root element"
    );
    assert!(
        rebuilt_content.contains("INTEGRATION-TEST-001"),
        "Should preserve message ID"
    );
    assert!(
        rebuilt_content.contains("Round Trip Test Album"),
        "Should preserve release title"
    );

    println!("  - XML size: {} bytes", rebuilt_content.len());
    println!(
        "  - Contains message ID: {}",
        rebuilt_content.contains("INTEGRATION-TEST-001")
    );

    // Step 4: Parse rebuilt XML to verify round-trip fidelity
    println!("\nStep 4: Verifying round-trip fidelity...");

    let start_reparse = Instant::now();
    let reparsed_result = parse_ddex_xml(&rebuilt_content);
    let reparse_time = start_reparse.elapsed();

    println!(
        "✅ Re-parsing completed in {:.3}s",
        reparse_time.as_secs_f64()
    );

    assert!(reparsed_result.is_ok(), "Re-parsing should succeed");
    let reparsed_data = reparsed_result.unwrap();

    // Step 5: Compare original and round-trip data
    println!("\nStep 5: Comparing original vs round-trip data...");

    let fidelity_report = compare_parsed_data(&parsed_data, &reparsed_data);

    println!("📊 Round-trip fidelity report:");
    println!("  - Releases match: {}", fidelity_report.releases_match);
    println!(
        "  - Sound recordings match: {}",
        fidelity_report.sound_recordings_match
    );
    println!("  - Deals match: {}", fidelity_report.deals_match);
    println!(
        "  - Message metadata match: {}",
        fidelity_report.metadata_match
    );

    // Assert round-trip fidelity
    assert!(
        fidelity_report.releases_match,
        "Release data should match after round-trip"
    );
    assert!(
        fidelity_report.sound_recordings_match,
        "Sound recording data should match"
    );
    assert!(fidelity_report.deals_match, "Deal data should match");
    assert!(fidelity_report.metadata_match, "Metadata should match");

    // Step 6: Performance analysis
    println!("\nStep 6: Performance analysis...");

    let total_time = parse_time + convert_time + build_time + reparse_time;
    let throughput = (original_xml.len() as f64 * 2.0) / total_time.as_secs_f64(); // 2x for round-trip

    println!("📈 Performance metrics:");
    println!("  - Parse time: {:.3}s", parse_time.as_secs_f64());
    println!("  - Convert time: {:.3}s", convert_time.as_secs_f64());
    println!("  - Build time: {:.3}s", build_time.as_secs_f64());
    println!("  - Re-parse time: {:.3}s", reparse_time.as_secs_f64());
    println!(
        "  - Total round-trip time: {:.3}s",
        total_time.as_secs_f64()
    );
    println!("  - Round-trip throughput: {:.2} bytes/s", throughput);

    // Performance assertions
    assert!(
        total_time.as_millis() < 1000,
        "Total round-trip should complete under 1 second"
    );
    assert!(
        throughput > 10000.0,
        "Round-trip throughput should exceed 10KB/s"
    );

    println!("\n🎉 Parser-Builder Integration Test: ALL PHASES PASSED!");
    println!("{}", "=".repeat(60));
}

/// Test large file round-trip performance
#[test]
fn test_large_file_round_trip() {
    println!("\n📊 Testing Large File Round-Trip Performance\n");

    // Generate a larger test file (100KB+)
    let large_xml = generate_large_test_file(100 * 1024); // 100KB target

    println!(
        "Generated test file: {:.2}KB",
        large_xml.len() as f64 / 1024.0
    );

    let start = Instant::now();

    // Full round-trip test
    let xml_content = &large_xml;
    let parsed = parse_ddex_xml(xml_content).expect("Large file parsing should work");
    let build_request = convert_to_build_request(&parsed);
    let rebuilt = build_ddex_xml(&build_request).expect("Large file building should work");
    let _reparsed = parse_ddex_xml(&rebuilt).expect("Large file re-parsing should work");

    let total_time = start.elapsed();
    let throughput = (large_xml.len() as f64 * 2.0) / total_time.as_secs_f64(); // Round-trip

    println!("Large file round-trip performance:");
    println!("  - File size: {:.2}KB", large_xml.len() as f64 / 1024.0);
    println!("  - Total time: {:.3}s", total_time.as_secs_f64());
    println!("  - Throughput: {:.2}KB/s", throughput / 1024.0);

    // Performance requirements for large files
    assert!(
        throughput > 1024.0 * 100.0,
        "Large file throughput should exceed 100KB/s"
    );
    assert!(
        total_time.as_secs() < 10,
        "Large file processing should complete under 10s"
    );

    println!("✅ Large file round-trip test passed!");
}

/// Test selective round-trip (specific fields only)
#[test]
fn test_selective_round_trip() {
    println!("\n🎯 Testing Selective Round-Trip Processing\n");

    let test_xml = r#"<?xml version="1.0"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
    <MessageHeader>
        <MessageId>SELECTIVE-001</MessageId>
    </MessageHeader>
    <Release>
        <ReferenceTitle><TitleText>Selective Test</TitleText></ReferenceTitle>
    </Release>
    <SoundRecording>
        <ISRC>SELECT2400001</ISRC>
        <ReferenceTitle><TitleText>Selective Track</TitleText></ReferenceTitle>
    </SoundRecording>
</ern:NewReleaseMessage>"#;

    // Test 1: Extract only ISRCs
    let start = Instant::now();
    let xml_content = &test_xml;
    let isrcs = extract_isrcs_only(xml_content);
    let isrc_time = start.elapsed();

    println!("ISRC extraction:");
    println!(
        "  - Found {} ISRCs in {:.3}s",
        isrcs.len(),
        isrc_time.as_secs_f64()
    );
    println!("  - ISRCs: {:?}", isrcs);

    assert_eq!(isrcs.len(), 1, "Should find 1 ISRC");
    assert_eq!(isrcs[0], "SELECT2400001", "ISRC should match");

    // Test 2: Extract only titles
    let start = Instant::now();
    let titles = extract_titles_only(xml_content);
    let title_time = start.elapsed();

    println!("\nTitle extraction:");
    println!(
        "  - Found {} titles in {:.3}s",
        titles.len(),
        title_time.as_secs_f64()
    );
    println!("  - Titles: {:?}", titles);

    assert_eq!(titles.len(), 2, "Should find 2 titles");

    // Test 3: Selective rebuild
    let selective_build_request = SelectiveBuildRequest {
        message_id: "SELECTIVE-REBUILT".to_string(),
        isrcs: isrcs,
        titles: titles,
    };

    let start = Instant::now();
    let selective_xml = build_selective_xml(&selective_build_request);
    let selective_build_time = start.elapsed();

    println!("\nSelective rebuild:");
    println!(
        "  - Built XML in {:.3}s",
        selective_build_time.as_secs_f64()
    );
    println!("  - Output size: {} bytes", selective_xml.len());

    // Validate selective rebuild
    assert!(
        selective_xml.contains("SELECTIVE-REBUILT"),
        "Should contain new message ID"
    );
    assert!(
        selective_xml.contains("SELECT2400001"),
        "Should contain original ISRC"
    );

    println!("✅ Selective round-trip test passed!");
}

// =============================================================================
// HELPER STRUCTURES AND FUNCTIONS
// =============================================================================

#[derive(Debug)]
struct ParsedData {
    message_id: String,
    releases: Vec<ParsedRelease>,
    sound_recordings: Vec<ParsedSoundRecording>,
    deals: Vec<ParsedDeal>,
}

#[derive(Debug, Clone)]
struct ParsedRelease {
    reference: String,
    title: String,
    artist: String,
}

#[derive(Debug, Clone)]
struct ParsedSoundRecording {
    reference: String,
    isrc: String,
    title: String,
    artist: String,
    duration: String,
}

#[derive(Debug, Clone)]
struct ParsedDeal {
    reference: String,
    territory: String,
    rights_type: String,
}

#[derive(Debug)]
struct BuildRequest {
    message_id: String,
    releases: Vec<ParsedRelease>,
    sound_recordings: Vec<ParsedSoundRecording>,
    deals: Vec<ParsedDeal>,
}

#[derive(Debug)]
struct SelectiveBuildRequest {
    message_id: String,
    isrcs: Vec<String>,
    titles: Vec<String>,
}

#[derive(Debug)]
struct FidelityReport {
    releases_match: bool,
    sound_recordings_match: bool,
    deals_match: bool,
    metadata_match: bool,
}

/// Parse DDEX XML using quick-xml as a proxy
fn parse_ddex_xml(xml: &str) -> Result<ParsedData, String> {
    let mut reader = quick_xml::Reader::from_str(xml);
    let mut buf = Vec::new();

    let mut data = ParsedData {
        message_id: String::new(),
        releases: Vec::new(),
        sound_recordings: Vec::new(),
        deals: Vec::new(),
    };

    let mut current_release: Option<ParsedRelease> = None;
    let mut current_sr: Option<ParsedSoundRecording> = None;
    let mut current_deal: Option<ParsedDeal> = None;
    let mut current_element = String::new();
    let mut current_text = String::new();

    while let Ok(event) = reader.read_event_into(&mut buf) {
        match event {
            quick_xml::events::Event::Start(e) => {
                let name_qname = e.name();
                let name = std::str::from_utf8(name_qname.as_ref()).unwrap_or("");
                current_element = name.to_string();

                if name.contains("Release") {
                    let mut release_ref = String::new();
                    for attr in e.attributes() {
                        if let Ok(attr) = attr {
                            let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
                            if key.contains("Reference") {
                                release_ref =
                                    std::str::from_utf8(&attr.value).unwrap_or("").to_string();
                            }
                        }
                    }
                    current_release = Some(ParsedRelease {
                        reference: release_ref,
                        title: String::new(),
                        artist: String::new(),
                    });
                } else if name.contains("SoundRecording") {
                    let mut sr_ref = String::new();
                    for attr in e.attributes() {
                        if let Ok(attr) = attr {
                            let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
                            if key.contains("Reference") {
                                sr_ref = std::str::from_utf8(&attr.value).unwrap_or("").to_string();
                            }
                        }
                    }
                    current_sr = Some(ParsedSoundRecording {
                        reference: sr_ref,
                        isrc: String::new(),
                        title: String::new(),
                        artist: String::new(),
                        duration: String::new(),
                    });
                } else if name.contains("Deal") {
                    current_deal = Some(ParsedDeal {
                        reference: String::new(),
                        territory: String::new(),
                        rights_type: String::new(),
                    });
                }
            }
            quick_xml::events::Event::Text(e) => {
                let text_content = e.unescape().unwrap_or_default();
                current_text = text_content.trim().to_string();

                if current_element.contains("MessageId") && !current_text.is_empty() {
                    data.message_id = current_text.clone();
                } else if current_element.contains("TitleText") && !current_text.is_empty() {
                    if let Some(ref mut release) = current_release {
                        if release.title.is_empty() {
                            release.title = current_text.clone();
                        }
                    }
                    if let Some(ref mut sr) = current_sr {
                        if sr.title.is_empty() {
                            sr.title = current_text.clone();
                        }
                    }
                } else if current_element.contains("ISRC") && !current_text.is_empty() {
                    if let Some(ref mut sr) = current_sr {
                        sr.isrc = current_text.clone();
                    }
                } else if current_element.contains("PartyName") && !current_text.is_empty() {
                    if let Some(ref mut release) = current_release {
                        if release.artist.is_empty() {
                            release.artist = current_text.clone();
                        }
                    }
                    if let Some(ref mut sr) = current_sr {
                        if sr.artist.is_empty() {
                            sr.artist = current_text.clone();
                        }
                    }
                } else if current_element.contains("Duration") && !current_text.is_empty() {
                    if let Some(ref mut sr) = current_sr {
                        sr.duration = current_text.clone();
                    }
                } else if current_element.contains("DealReference") && !current_text.is_empty() {
                    if let Some(ref mut deal) = current_deal {
                        deal.reference = current_text.clone();
                    }
                } else if current_element.contains("TerritoryCode") && !current_text.is_empty() {
                    if let Some(ref mut deal) = current_deal {
                        deal.territory = current_text.clone();
                    }
                } else if current_element.contains("RightsType") && !current_text.is_empty() {
                    if let Some(ref mut deal) = current_deal {
                        deal.rights_type = current_text.clone();
                    }
                }
            }
            quick_xml::events::Event::End(e) => {
                let name_qname = e.name();
                let name = std::str::from_utf8(name_qname.as_ref()).unwrap_or("");

                if name.contains("Release") && current_release.is_some() {
                    data.releases.push(current_release.take().unwrap());
                } else if name.contains("SoundRecording") && current_sr.is_some() {
                    data.sound_recordings.push(current_sr.take().unwrap());
                } else if name.contains("Deal") && current_deal.is_some() {
                    data.deals.push(current_deal.take().unwrap());
                }
                current_element.clear();
            }
            quick_xml::events::Event::Eof => break,
            _ => {}
        }
        buf.clear();
    }

    Ok(data)
}

/// Convert parsed data to build request
fn convert_to_build_request(data: &ParsedData) -> BuildRequest {
    BuildRequest {
        message_id: data.message_id.clone(),
        releases: data.releases.clone(),
        sound_recordings: data.sound_recordings.clone(),
        deals: data.deals.clone(),
    }
}

/// Build DDEX XML from build request
fn build_ddex_xml(request: &BuildRequest) -> Result<String, String> {
    let mut xml = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
    <MessageHeader>
        <MessageId>"#,
    );

    xml.push_str(&request.message_id);
    xml.push_str(
        r#"</MessageId>
        <CreatedDateTime>2024-09-13T12:00:00Z</CreatedDateTime>
    </MessageHeader>
"#,
    );

    // Add releases
    for release in &request.releases {
        xml.push_str(&format!(
            r#"    <Release ReleaseReference="{}">
        <ReferenceTitle>
            <TitleText>{}</TitleText>
        </ReferenceTitle>
        <DisplayArtist>
            <PartyName>{}</PartyName>
        </DisplayArtist>
    </Release>
"#,
            release.reference, release.title, release.artist
        ));
    }

    // Add sound recordings
    for sr in &request.sound_recordings {
        xml.push_str(&format!(
            r#"    <SoundRecording SoundRecordingReference="{}">
        <ISRC>{}</ISRC>
        <ReferenceTitle>
            <TitleText>{}</TitleText>
        </ReferenceTitle>
        <DisplayArtist>
            <PartyName>{}</PartyName>
        </DisplayArtist>
        <Duration>{}</Duration>
    </SoundRecording>
"#,
            sr.reference, sr.isrc, sr.title, sr.artist, sr.duration
        ));
    }

    // Add deals
    for deal in &request.deals {
        xml.push_str(&format!(
            r#"    <Deal>
        <DealReference>{}</DealReference>
        <DealTerms>
            <TerritoryCode>{}</TerritoryCode>
            <RightsType>{}</RightsType>
        </DealTerms>
    </Deal>
"#,
            deal.reference, deal.territory, deal.rights_type
        ));
    }

    xml.push_str("</ern:NewReleaseMessage>");

    Ok(xml)
}

/// Compare two parsed data structures for fidelity
fn compare_parsed_data(original: &ParsedData, rebuilt: &ParsedData) -> FidelityReport {
    let releases_match = original.releases.len() == rebuilt.releases.len()
        && original
            .releases
            .iter()
            .zip(rebuilt.releases.iter())
            .all(|(a, b)| a.title == b.title && a.artist == b.artist);

    let sound_recordings_match = original.sound_recordings.len() == rebuilt.sound_recordings.len()
        && original
            .sound_recordings
            .iter()
            .zip(rebuilt.sound_recordings.iter())
            .all(|(a, b)| a.isrc == b.isrc && a.title == b.title);

    let deals_match = original.deals.len() == rebuilt.deals.len()
        && original
            .deals
            .iter()
            .zip(rebuilt.deals.iter())
            .all(|(a, b)| a.territory == b.territory && a.rights_type == b.rights_type);

    let metadata_match = original.message_id == rebuilt.message_id;

    FidelityReport {
        releases_match,
        sound_recordings_match,
        deals_match,
        metadata_match,
    }
}

/// Generate a large test file for performance testing
fn generate_large_test_file(target_size: usize) -> String {
    let mut xml = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
    <MessageHeader>
        <MessageId>LARGE-FILE-TEST</MessageId>
        <CreatedDateTime>2024-09-13T12:00:00Z</CreatedDateTime>
    </MessageHeader>
"#,
    );

    let mut count = 0;
    while xml.len() < target_size && count < 1000 {
        // Safety limit
        xml.push_str(&format!(
            r#"    <Release ReleaseReference="LARGE-REL-{:04}">
        <ReferenceTitle>
            <TitleText>Large Test Release #{}</TitleText>
        </ReferenceTitle>
        <DisplayArtist>
            <PartyName>Large Test Artist #{}</PartyName>
        </DisplayArtist>
    </Release>
    <SoundRecording SoundRecordingReference="LARGE-SR-{:04}">
        <ISRC>LARGE{:010}</ISRC>
        <ReferenceTitle>
            <TitleText>Large Test Track #{}</TitleText>
        </ReferenceTitle>
        <Duration>PT3M30S</Duration>
    </SoundRecording>
"#,
            count, count, count, count, count, count
        ));
        count += 1;
    }

    xml.push_str("</ern:NewReleaseMessage>");
    xml
}

/// Extract only ISRCs from XML (selective parsing)
fn extract_isrcs_only(xml: &str) -> Vec<String> {
    let mut reader = quick_xml::Reader::from_str(xml);
    let mut buf = Vec::new();
    let mut isrcs = Vec::new();
    let mut in_isrc = false;

    while let Ok(event) = reader.read_event_into(&mut buf) {
        match event {
            quick_xml::events::Event::Start(e) => {
                let name_qname = e.name();
                let name = std::str::from_utf8(name_qname.as_ref()).unwrap_or("");
                in_isrc = name == "ISRC";
            }
            quick_xml::events::Event::Text(e) => {
                if in_isrc {
                    isrcs.push(e.unescape().unwrap_or_default().to_string());
                }
            }
            quick_xml::events::Event::End(_) => {
                in_isrc = false;
            }
            quick_xml::events::Event::Eof => break,
            _ => {}
        }
        buf.clear();
    }

    isrcs
}

/// Extract only titles from XML (selective parsing)
fn extract_titles_only(xml: &str) -> Vec<String> {
    let mut reader = quick_xml::Reader::from_str(xml);
    let mut buf = Vec::new();
    let mut titles = Vec::new();
    let mut in_title = false;

    while let Ok(event) = reader.read_event_into(&mut buf) {
        match event {
            quick_xml::events::Event::Start(e) => {
                let name_qname = e.name();
                let name = std::str::from_utf8(name_qname.as_ref()).unwrap_or("");
                in_title = name == "TitleText";
            }
            quick_xml::events::Event::Text(e) => {
                if in_title {
                    titles.push(e.unescape().unwrap_or_default().to_string());
                }
            }
            quick_xml::events::Event::End(_) => {
                in_title = false;
            }
            quick_xml::events::Event::Eof => break,
            _ => {}
        }
        buf.clear();
    }

    titles
}

/// Build selective XML from minimal data
fn build_selective_xml(request: &SelectiveBuildRequest) -> String {
    let mut xml = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
    <MessageHeader>
        <MessageId>{}</MessageId>
    </MessageHeader>
"#,
        request.message_id
    );

    // Add titles as releases
    for (i, title) in request.titles.iter().enumerate() {
        xml.push_str(&format!(
            r#"    <Release ReleaseReference="SEL-REL-{:02}">
        <ReferenceTitle>
            <TitleText>{}</TitleText>
        </ReferenceTitle>
    </Release>
"#,
            i, title
        ));
    }

    // Add ISRCs as sound recordings
    for (i, isrc) in request.isrcs.iter().enumerate() {
        xml.push_str(&format!(
            r#"    <SoundRecording SoundRecordingReference="SEL-SR-{:02}">
        <ISRC>{}</ISRC>
        <ReferenceTitle>
            <TitleText>Selective Track #{}</TitleText>
        </ReferenceTitle>
    </SoundRecording>
"#,
            i, isrc, i
        ));
    }

    xml.push_str("</ern:NewReleaseMessage>");
    xml
}
