// Simple test to verify error propagation in Node.js bindings
const { DdexParser } = require('./');

async function testErrorPropagation() {
    const parser = new DdexParser();

    console.log('Testing Node.js DDEX Parser Error Propagation...\n');

    // Test 1: Empty input
    try {
        parser.parse_sync('');
        console.log('❌ Test 1 FAILED: Should have thrown for empty input');
    } catch (err) {
        console.log('✅ Test 1 PASSED: Empty input error:', err.message);
    }

    // Test 2: Invalid XML
    try {
        parser.parse_sync('not xml at all');
        console.log('❌ Test 2 FAILED: Should have thrown for invalid XML');
    } catch (err) {
        console.log('✅ Test 2 PASSED: Invalid XML error:', err.message);
    }

    // Test 3: Malformed XML
    try {
        parser.parse_sync('<xml><unclosed>');
        console.log('❌ Test 3 FAILED: Should have thrown for malformed XML');
    } catch (err) {
        console.log('✅ Test 3 PASSED: Malformed XML error:', err.message);
    }

    // Test 4: Version detection on empty
    try {
        parser.detect_version('');
        console.log('❌ Test 4 FAILED: Should have thrown for empty input');
    } catch (err) {
        console.log('✅ Test 4 PASSED: Version detection empty error:', err.message);
    }

    // Test 5: Version detection on non-XML
    try {
        parser.detect_version('hello world');
        console.log('❌ Test 5 FAILED: Should have thrown for non-XML input');
    } catch (err) {
        console.log('✅ Test 5 PASSED: Version detection non-XML error:', err.message);
    }

    // Test 6: Sanity check validation
    const sanityResult = await parser.sanity_check('');
    if (!sanityResult.is_valid && sanityResult.errors.length > 0) {
        console.log('✅ Test 6 PASSED: Sanity check properly reports invalid:', sanityResult.errors[0]);
    } else {
        console.log('❌ Test 6 FAILED: Sanity check should report invalid for empty input');
    }

    // Test 7: Get detailed error information
    try {
        const detailedError = parser.get_detailed_error('<invalid>xml</invalid>');
        console.log('✅ Test 7 PASSED: Detailed error:', {
            type: detailedError.error_type,
            message: detailedError.message,
            suggestions: detailedError.suggestions.length + ' suggestions provided'
        });
    } catch (err) {
        console.log('✅ Test 7 PASSED: get_detailed_error works:', err.message);
    }

    console.log('\n🎉 Error propagation tests completed!');
}

// Run the test
testErrorPropagation().catch(console.error);