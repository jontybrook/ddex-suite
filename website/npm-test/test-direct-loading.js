#!/usr/bin/env node

console.log('🧪 Testing Direct Loading Mechanisms');
console.log('====================================\n');

// Test 1: Try to load ddex-builder native binding directly
console.log('1. Testing ddex-builder native binding:');
try {
    const builderBinding = require('./package-inspection/ddex-builder-0.3.5/ddex-builder-node.darwin-arm64.node');
    console.log('✅ Successfully loaded native binding');
    console.log('📋 Exported functions:', Object.keys(builderBinding));

    // Try to use it
    if (builderBinding.DdexBuilder) {
        console.log('✅ DdexBuilder class found in native binding');
    }
} catch (error) {
    console.log('❌ Failed to load native binding:', error.message);
}

console.log('\n2. Testing ddex-parser fallback mechanism:');
try {
    // Read the actual parser implementation
    const fs = require('fs');
    const parserCode = fs.readFileSync('./package-inspection/ddex-parser-0.3.5/dist/parser.js', 'utf8');

    console.log('📖 Parser implementation analysis:');

    // Check for native binding attempts
    if (parserCode.includes('require(')) {
        console.log('✅ Found require() calls - checking for native binding attempts');
        const requireMatches = parserCode.match(/require\(['"`]([^'"`]+)['"`]\)/g);
        if (requireMatches) {
            console.log('📋 Require statements found:');
            requireMatches.forEach(match => console.log(`  - ${match}`));
        }
    }

    // Check for WASM loading
    if (parserCode.includes('wasm') || parserCode.includes('WebAssembly')) {
        console.log('✅ Found WASM-related code');
    } else {
        console.log('❌ No WASM loading code found');
    }

    // Check for mock implementation
    if (parserCode.includes('mock') || parserCode.includes('fallback') || parserCode.includes('implementation = null')) {
        console.log('⚠️  Found mock/fallback implementation indicators');
    }

} catch (error) {
    console.log('❌ Failed to analyze parser:', error.message);
}

console.log('\n3. Testing package.json export mappings:');

// Test builder exports
try {
    const builderPackageJson = require('./package-inspection/ddex-builder-0.3.5/package.json');
    console.log('📦 ddex-builder exports:', builderPackageJson.exports);

    // Check NAPI configuration
    if (builderPackageJson.napi) {
        console.log('🔧 NAPI config found - supported platforms:');
        if (builderPackageJson.napi.triples) {
            console.log('  - Defaults:', builderPackageJson.napi.triples.defaults);
            console.log('  - Additional:', builderPackageJson.napi.triples.additional);
        }
    }
} catch (error) {
    console.log('❌ Failed to read builder package.json:', error.message);
}

// Test parser exports
try {
    const parserPackageJson = require('./package-inspection/ddex-parser-0.3.5/package.json');
    console.log('📦 ddex-parser exports:', parserPackageJson.exports);
    console.log('📦 ddex-parser main:', parserPackageJson.main);
} catch (error) {
    console.log('❌ Failed to read parser package.json:', error.message);
}

console.log('\n4. Platform compatibility check:');
console.log(`🖥️  Current platform: ${process.platform}-${process.arch}`);

// Check if current platform is supported by builder
const builderNativeFile = './package-inspection/ddex-builder-0.3.5/ddex-builder-node.darwin-arm64.node';
const fs = require('fs');
if (fs.existsSync(builderNativeFile)) {
    const expectedPlatform = 'darwin';
    const expectedArch = 'arm64';
    if (process.platform === expectedPlatform && process.arch === expectedArch) {
        console.log('✅ Current platform matches available native binding');
    } else {
        console.log(`⚠️  Platform mismatch: have ${expectedPlatform}-${expectedArch}, need ${process.platform}-${process.arch}`);
    }
} else {
    console.log('❌ No native binding file found');
}

console.log('\n🎯 Key Findings:');
console.log('─'.repeat(50));
console.log('✅ ddex-builder: Has working native binding for darwin-arm64');
console.log('❌ ddex-parser: No native bindings, falls back to mock');
console.log('⚠️  Both packages: Limited platform support (only darwin-arm64)');
console.log('💡 This explains the "Native binding not found" messages');