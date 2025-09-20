// test-types.ts - TypeScript integration test
import { DDEXBuilder, StreamingDDEXBuilder, type Release, type Resource } from './js/index';

// Test basic DDEXBuilder usage with TypeScript
const builder = new DDEXBuilder();

// Test typed interfaces
const release: Release = {
  releaseId: 'REL001',
  releaseType: 'Album',
  title: 'Test Album',
  artist: 'Test Artist',
  trackIds: ['TRK001']
};

const resource: Resource = {
  resourceId: 'TRK001',
  resourceType: 'SoundRecording',
  title: 'Test Track',
  artist: 'Test Artist',
  isrc: 'USRC17607839'
};

// Test method calls with proper typing
builder.addRelease(release);
builder.addResource(resource);

// Test async methods
(async () => {
  try {
    // Test validation
    const validation = await builder.validate();
    console.log('Validation result:', validation.isValid);

    // Test build with options
    const xml = await builder.build(null, {
      version: '4.3',
      preset: 'audio_album',
      enableDeterministicOrdering: true
    });
    console.log('Generated XML length:', xml.length);

    // Test statistics
    const stats = builder.getStats();
    console.log('Release count:', stats.releasesCount);

    // Test presets
    const presets = builder.getAvailablePresets();
    console.log('Available presets:', presets);

  } catch (error) {
    console.error('Build error:', error);
  }
})();

// Test StreamingDDEXBuilder
const streamBuilder = new StreamingDDEXBuilder({
  maxBufferSize: 1024 * 1024,
  deterministic: true,
  validateDuringStream: true,
  progressCallbackFrequency: 100
});

streamBuilder.setProgressCallback((progress) => {
  console.log(`Progress: ${progress.releasesWritten} releases written`);
});

streamBuilder.startMessage({
  messageSenderName: 'Test Label',
  messageRecipientName: 'Test Platform'
}, '4.3');

console.log('TypeScript test file created successfully - types are working!');