//! Debug test to understand parsing behavior

#[cfg(test)]
mod tests {
    use crate::streaming::working_impl::{WorkingStreamIterator, WorkingStreamingElement};
    use ddex_core::models::versions::ERNVersion;
    use std::io::Cursor;

    #[test]
    fn debug_release_parsing() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<ern:NewReleaseMessage xmlns:ern="http://ddex.net/xml/ern/43">
    <Release ReleaseReference="REL-2023-001">
        <ReferenceTitle>
            <TitleText>Greatest Hits Collection</TitleText>
        </ReferenceTitle>
    </Release>
</ern:NewReleaseMessage>"#;

        let cursor = Cursor::new(xml.as_bytes());
        let iterator = WorkingStreamIterator::new(cursor, ERNVersion::V4_3);

        let elements: Result<Vec<_>, _> = iterator.collect();
        assert!(elements.is_ok(), "Debug parsing should succeed");

        let elements = elements.unwrap();
        println!("Debug - Total elements: {}", elements.len());

        for (i, element) in elements.iter().enumerate() {
            println!("Debug - Element {}: {:?}", i, element);
        }

        // Find the release element
        if let Some(WorkingStreamingElement::Release {
            reference, title, ..
        }) = elements
            .iter()
            .find(|e| matches!(e, WorkingStreamingElement::Release { .. }))
        {
            println!(
                "Debug - Found release: reference='{}', title='{}'",
                reference, title
            );
            assert_eq!(reference, "REL-2023-001", "Release reference should match");
            assert_eq!(
                title, "Greatest Hits Collection",
                "Release title should match"
            );
        } else {
            panic!("No release element found");
        }
    }
}
