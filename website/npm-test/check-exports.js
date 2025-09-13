console.log('Checking ddex-parser exports:');
try {
    const parser = require('ddex-parser');
    console.log('ddex-parser exports:', Object.keys(parser));
    console.log('ddex-parser:', parser);
} catch (error) {
    console.error('Error loading ddex-parser:', error.message);
}

console.log('\nChecking ddex-builder exports:');
try {
    const builder = require('ddex-builder');
    console.log('ddex-builder exports:', Object.keys(builder));
    console.log('ddex-builder:', builder);
} catch (error) {
    console.error('Error loading ddex-builder:', error.message);
}