const { DdexParser } = require('ddex-parser');

// Test XML with release that should be extracted
const testXML = `<?xml version="1.0"?>
<NewReleaseMessage xmlns="http://ddex.net/xml/ern/43">
  <MessageHeader>
    <MessageId>ACTUAL_ID_456</MessageId>
  </MessageHeader>
  <ReleaseList>
    <Release>
      <Title>
        <TitleText>My Amazing Album</TitleText>
      </Title>
      <DisplayArtist>
        <FullName>The Great Artist</FullName>
      </DisplayArtist>
    </Release>
  </ReleaseList>
  <ResourceList>
    <SoundRecording>
      <ResourceReference>R1</ResourceReference>
      <TitleText>Track One</TitleText>
    </SoundRecording>
    <SoundRecording>
      <ResourceReference>R2</ResourceReference>
      <TitleText>Track Two</TitleText>
    </SoundRecording>
  </ResourceList>
</NewReleaseMessage>`;

console.log('Testing workaround for ddex-parser v0.4.3 bug...\n');

// Parse with the current buggy parser
const parser = new DdexParser({ debug: false });
let result = parser.parseSync(testXML);

console.log('Before workaround:');
console.log('- MessageId:', result.messageId);
console.log('- Release title:', result.releases?.[0]?.title);
console.log('- Release artist:', result.releases?.[0]?.displayArtist);

// Apply the workaround
if (result.releases && result.releases.length > 0) {
  // Extract all TitleText elements for releases
  const releaseTitles = [];
  const titleRegex = /<Release[^>]*>[\s\S]*?<TitleText>([^<]+)<\/TitleText>/g;
  let match;
  while ((match = titleRegex.exec(testXML)) !== null) {
    releaseTitles.push(match[1]);
  }

  // Extract artist names for releases
  const artistRegex = /<DisplayArtist[^>]*>[\s\S]*?<FullName>([^<]+)<\/FullName>/g;
  const artists = [];
  while ((match = artistRegex.exec(testXML)) !== null) {
    artists.push(match[1]);
  }

  console.log('\nExtracted values:');
  console.log('- Title regex found:', releaseTitles);
  console.log('- Artist regex found:', artists);

  // Apply the extracted values
  result.releases.forEach((release, index) => {
    if (releaseTitles[index]) {
      release.title = releaseTitles[index];
      release.defaultTitle = releaseTitles[index];
    }
    if (artists[index]) {
      release.displayArtist = artists[index];
    }
  });

  // Also extract resources if present
  if (testXML.includes('<SoundRecording>')) {
    const trackTitles = [];
    const trackRegex = /<SoundRecording[^>]*>[\s\S]*?<TitleText>([^<]+)<\/TitleText>/g;
    while ((match = trackRegex.exec(testXML)) !== null) {
      trackTitles.push(match[1]);
    }

    console.log('- Track titles found:', trackTitles);

    // Apply to tracks if they exist
    if (result.tracks && trackTitles.length > 0) {
      result.tracks.forEach((track, index) => {
        if (trackTitles[index]) {
          track.title = trackTitles[index];
        }
      });
    }
  }
}

console.log('\nAfter workaround:');
console.log('- MessageId:', result.messageId);
console.log('- Release title:', result.releases?.[0]?.title);
console.log('- Release artist:', result.releases?.[0]?.displayArtist);

console.log('\n✅ Workaround test complete!');