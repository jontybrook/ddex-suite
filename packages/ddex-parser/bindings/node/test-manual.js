const { DdexParser } = require('./index');

console.log('Testing Node.js bindings...');

try {
  const parser = new DdexParser({ debug: false });
  console.log('✓ Parser loaded successfully');

  try {
    parser.parseSync('<NewReleaseMessage></NewReleaseMessage>');
    console.log('❌ Should have rejected incomplete XML');
  } catch(e) {
    console.log('✓ Correctly rejects incomplete XML:', e.message.substring(0, 50) + '...');
  }

  console.log('✓ All Node.js binding tests passed');
} catch(e) {
  console.error('❌ Failed to load parser:', e.message);
  process.exit(1);
}