// examples/selective_isrc_extraction.rs
//! Example demonstrating fast selective ISRC extraction

use ddex_parser::parser::selective_parser::SelectiveParser;
use std::io::Cursor;
use std::time::Instant;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Selective ISRC Extraction Example ===\n");

    // Example 1: Basic ISRC extraction
    basic_isrc_extraction()?;

    // Example 2: Fast ISRC extraction for large files
    fast_isrc_extraction()?;

    // Example 3: Custom field extraction
    custom_field_extraction()?;

    // Example 4: Performance comparison
    performance_comparison()?;

    Ok(())
}

fn basic_isrc_extraction() -> Result<(), Box<dyn std::error::Error>> {
    println!("1. Basic ISRC Extraction");

    let xml = generate_sample_ddex_with_isrcs(10);
    let cursor = Cursor::new(xml.as_bytes());

    let mut parser = SelectiveParser::for_isrcs();
    let start = Instant::now();

    let isrcs = parser.extract_isrcs(cursor)?;
    let duration = start.elapsed();

    println!("   Results:");
    println!("   - ISRCs found: {}", isrcs.len());
    println!("   - Extraction time: {:?}", duration);
    println!("   - First few ISRCs: {:?}", &isrcs[..isrcs.len().min(3)]);
    println!();

    Ok(())
}

fn fast_isrc_extraction() -> Result<(), Box<dyn std::error::Error>> {
    println!("2. Fast ISRC Extraction (Large Dataset)");

    let xml = generate_sample_ddex_with_isrcs(1000);
    let data_size = xml.len() as f64 / (1024.0 * 1024.0);

    println!("   Processing {:.2} MB of XML data...", data_size);

    let cursor = Cursor::new(xml.as_bytes());
    let mut parser = SelectiveParser::for_isrcs();

    let start = Instant::now();
    let isrcs = parser.extract_isrcs_fast(cursor)?;
    let duration = start.elapsed();

    let throughput = data_size / duration.as_secs_f64();

    println!("   Results:");
    println!("   - ISRCs found: {}", isrcs.len());
    println!("   - Extraction time: {:?}", duration);
    println!("   - Throughput: {:.2} MB/s", throughput);
    println!("   - Sample ISRCs: {:?}", &isrcs[..isrcs.len().min(5)]);
    println!();

    Ok(())
}

fn custom_field_extraction() -> Result<(), Box<dyn std::error::Error>> {
    println!("3. Custom Field Extraction");

    let xml = generate_release_metadata_xml();
    let cursor = Cursor::new(xml.as_bytes());

    let mut parser = SelectiveParser::for_release_metadata()
        .case_sensitive(false)
        .max_depth(10);

    let start = Instant::now();
    let result = parser.extract_fields(cursor)?;
    let duration = start.elapsed();

    println!("   Results:");
    println!("   - Fields extracted: {}", result.values.len());
    println!("   - Elements processed: {}", result.elements_processed);
    println!("   - Extraction time: {:?}", duration);

    for (field, values) in &result.values {
        println!("   - {}: {} values", field, values.len());
        if !values.is_empty() {
            println!("     Example: {}", &values[0]);
        }
    }
    println!();

    Ok(())
}

fn performance_comparison() -> Result<(), Box<dyn std::error::Error>> {
    println!("4. Performance Comparison: Standard vs Fast ISRC Extraction");

    let sizes = vec![100, 500, 1000, 2000];

    println!(
        "   {:<6} | {:<12} | {:<12} | {:<10}",
        "Size", "Standard", "Fast", "Speedup"
    );
    println!("   {:-<6}-+-{:-<12}-+-{:-<12}-+-{:-<10}", "", "", "", "");

    for size in sizes {
        let xml = generate_sample_ddex_with_isrcs(size);

        // Standard extraction
        let cursor1 = Cursor::new(xml.as_bytes());
        let mut parser1 = SelectiveParser::for_isrcs();
        let start1 = Instant::now();
        let isrcs1 = parser1.extract_isrcs(cursor1)?;
        let duration1 = start1.elapsed();

        // Fast extraction
        let cursor2 = Cursor::new(xml.as_bytes());
        let mut parser2 = SelectiveParser::for_isrcs();
        let start2 = Instant::now();
        let isrcs2 = parser2.extract_isrcs_fast(cursor2)?;
        let duration2 = start2.elapsed();

        let speedup = if duration2.as_nanos() > 0 {
            duration1.as_nanos() as f64 / duration2.as_nanos() as f64
        } else {
            0.0
        };

        println!(
            "   {:<6} | {:>9.2}ms | {:>9.2}ms | {:>7.1}x",
            size,
            duration1.as_millis(),
            duration2.as_millis(),
            speedup
        );

        // Verify both methods find the same ISRCs
        assert_eq!(
            isrcs1.len(),
            isrcs2.len(),
            "ISRC count mismatch for size {}",
            size
        );
    }

    println!();
    println!("Note: Fast extraction uses byte-level scanning and is optimized for");
    println!("      extracting ISRCs from very large XML files (>10MB) where full");
    println!("      XML parsing overhead becomes significant.");

    Ok(())
}

fn generate_sample_ddex_with_isrcs(num_tracks: usize) -> String {
    let mut xml = String::from(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
    <ern:MessageHeader>
        <ern:MessageId>ISRC_EXTRACTION_TEST</ern:MessageId>
        <ern:MessageSender>
            <ern:PartyName>ISRC Parser Demo</ern:PartyName>
        </ern:MessageSender>
        <ern:MessageRecipient>
            <ern:PartyName>Performance Test</ern:PartyName>
        </ern:MessageRecipient>
        <ern:MessageCreatedDateTime>2024-01-15T10:30:00Z</ern:MessageCreatedDateTime>
    </ern:MessageHeader>
    <ern:ResourceList>"#,
    );

    for i in 0..num_tracks {
        // Generate valid ISRC (12 characters: CCXXXYYNNNNN)
        let country_code = match i % 4 {
            0 => "US",
            1 => "GB",
            2 => "FR",
            _ => "DE",
        };
        let registrant = format!("{:03}", (i / 100) % 1000);
        let year = format!("{:02}", 20 + (i % 25)); // Years 20-44
        let designation = format!("{:05}", i % 100000);
        let isrc = format!("{}{}{}{}", country_code, registrant, year, designation);

        xml.push_str(&format!(
            r#"
        <ern:SoundRecording>
            <ern:SoundRecordingId Namespace="ISRC">{}</ern:SoundRecordingId>
            <ern:ReferenceTitle>
                <ern:TitleText>Test Track {}</ern:TitleText>
            </ern:ReferenceTitle>
            <ern:Duration>PT3M{:02}S</ern:Duration>
            <ern:SoundRecordingDetailsByTerritory>
                <ern:TerritoryCode>Worldwide</ern:TerritoryCode>
                <ern:DisplayArtist>
                    <ern:PartyName>Test Artist {}</ern:PartyName>
                    <ern:ArtistRole>MainArtist</ern:ArtistRole>
                </ern:DisplayArtist>
                <ern:LabelName>Fast Parser Records</ern:LabelName>
                <ern:RightsAgreementId>RA_{:06}</ern:RightsAgreementId>
            </ern:SoundRecordingDetailsByTerritory>
        </ern:SoundRecording>"#,
            isrc,
            i,
            (i % 60),
            i,
            i
        ));
    }

    xml.push_str("</ern:ResourceList></ern:NewReleaseMessage>");
    xml
}

fn generate_release_metadata_xml() -> String {
    r#"<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
    <ern:MessageHeader>
        <ern:MessageId>METADATA_EXTRACTION_TEST</ern:MessageId>
        <ern:MessageSender>
            <ern:PartyName>Metadata Parser Demo</ern:PartyName>
        </ern:MessageSender>
        <ern:MessageRecipient>
            <ern:PartyName>Field Extraction Test</ern:PartyName>
        </ern:MessageRecipient>
        <ern:MessageCreatedDateTime>2024-01-15T10:30:00Z</ern:MessageCreatedDateTime>
    </ern:MessageHeader>
    <ern:ReleaseList>
        <ern:Release IsMainRelease="true">
            <ern:ReleaseId Namespace="GRid">A1-12345-67890123-A</ern:ReleaseId>
            <ern:ReleaseReference>REL_METADATA_001</ern:ReleaseReference>
            <ern:ReferenceTitle>
                <ern:TitleText LanguageAndScriptCode="en">Selective Parsing Demo Album</ern:TitleText>
                <ern:SubTitle LanguageAndScriptCode="en">High Performance Field Extraction</ern:SubTitle>
            </ern:ReferenceTitle>
            <ern:ReleaseType>Album</ern:ReleaseType>
            <ern:ReleaseDetailsByTerritory>
                <ern:TerritoryCode>Worldwide</ern:TerritoryCode>
                <ern:DisplayArtist>
                    <ern:PartyName LanguageAndScriptCode="en">The Fast Parser Band</ern:PartyName>
                    <ern:ArtistRole>MainArtist</ern:ArtistRole>
                </ern:DisplayArtist>
                <ern:LabelName LanguageAndScriptCode="en">Selective Records Ltd.</ern:LabelName>
                <ern:ReleaseDate>2024-01-15</ern:ReleaseDate>
                <ern:OriginalReleaseDate>2024-01-15</ern:OriginalReleaseDate>
                <ern:PLine>
                    <ern:Year>2024</ern:Year>
                    <ern:PLineCompany>Selective Records Ltd.</ern:PLineCompany>
                    <ern:PLineText>High performance DDEX parsing demonstration</ern:PLineText>
                </ern:PLine>
                <ern:Genre>
                    <ern:GenreText>Electronic/Demo</ern:GenreText>
                    <ern:SubGenre>Performance/Technical</ern:SubGenre>
                </ern:Genre>
            </ern:ReleaseDetailsByTerritory>
        </ern:Release>
        <ern:Release>
            <ern:ReleaseId>REL_SECONDARY_002</ern:ReleaseId>
            <ern:ReleaseReference>REL_METADATA_002</ern:ReleaseReference>
            <ern:ReferenceTitle>
                <ern:TitleText LanguageAndScriptCode="en">Another Test Release</ern:TitleText>
            </ern:ReferenceTitle>
            <ern:ReleaseType>Single</ern:ReleaseType>
            <ern:ReleaseDetailsByTerritory>
                <ern:TerritoryCode>US</ern:TerritoryCode>
                <ern:DisplayArtist>
                    <ern:PartyName LanguageAndScriptCode="en">Secondary Artist</ern:PartyName>
                    <ern:ArtistRole>MainArtist</ern:ArtistRole>
                </ern:DisplayArtist>
                <ern:ReleaseDate>2024-02-01</ern:ReleaseDate>
            </ern:ReleaseDetailsByTerritory>
        </ern:Release>
    </ern:ReleaseList>
</ern:NewReleaseMessage>"#.to_string()
}
