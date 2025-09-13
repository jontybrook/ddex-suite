#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 DDEX Suite NPM Package Inspector');
console.log('=====================================\n');

async function inspectPackages() {
    const packages = ['ddex-parser', 'ddex-builder'];
    const versions = ['0.3.5', '0.3.0']; // Compare current with previous

    // Create inspection directory
    const inspectDir = './package-inspection';
    if (fs.existsSync(inspectDir)) {
        execSync(`rm -rf ${inspectDir}`);
    }
    fs.mkdirSync(inspectDir);

    console.log('📦 Step 1: Downloading package tarballs...\n');

    for (const pkg of packages) {
        for (const version of versions) {
            try {
                console.log(`Downloading ${pkg}@${version}...`);
                execSync(`npm pack ${pkg}@${version}`, { cwd: inspectDir });
                console.log(`✅ Downloaded ${pkg}@${version}`);
            } catch (error) {
                console.log(`⚠️  Could not download ${pkg}@${version}: ${error.message}`);
            }
        }
    }

    console.log('\n📂 Step 2: Extracting and examining contents...\n');

    const results = {};

    // Get all .tgz files
    const tarballs = fs.readdirSync(inspectDir).filter(f => f.endsWith('.tgz'));

    for (const tarball of tarballs) {
        const tarballPath = path.join(inspectDir, tarball);
        const extractDir = path.join(inspectDir, tarball.replace('.tgz', ''));

        console.log(`\n🔓 Extracting ${tarball}...`);

        try {
            execSync(`tar -xzf "${tarballPath}"`, { cwd: inspectDir });

            // Move extracted package to named directory
            const packageDir = path.join(inspectDir, 'package');
            if (fs.existsSync(packageDir)) {
                fs.renameSync(packageDir, extractDir);
            }

            // Analyze package
            const analysis = analyzePackage(extractDir, tarball);
            results[tarball] = analysis;

            printPackageAnalysis(tarball, analysis);

        } catch (error) {
            console.log(`❌ Failed to extract ${tarball}: ${error.message}`);
        }
    }

    console.log('\n🔬 Step 3: Detailed Binary Analysis...\n');
    testLoadingMechanisms(inspectDir, results);

    console.log('\n📊 Step 4: Comparison Summary...\n');
    generateComparisonReport(results);
}

function analyzePackage(packageDir, tarballName) {
    const analysis = {
        tarball: tarballName,
        packageDir,
        packageJson: null,
        files: [],
        nativeBindings: [],
        wasmFiles: [],
        jsFiles: [],
        totalSize: 0,
        mainEntry: null,
        exports: null
    };

    try {
        // Read package.json
        const packageJsonPath = path.join(packageDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            analysis.packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            analysis.mainEntry = analysis.packageJson.main;
            analysis.exports = analysis.packageJson.exports;
        }

        // Recursively scan all files
        scanDirectory(packageDir, '', analysis);

    } catch (error) {
        console.log(`❌ Error analyzing ${packageDir}: ${error.message}`);
    }

    return analysis;
}

function scanDirectory(dir, relativePath, analysis) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const relPath = relativePath ? path.join(relativePath, item) : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath, relPath, analysis);
        } else {
            const ext = path.extname(item);
            const size = stat.size;

            analysis.files.push({ path: relPath, size, ext });
            analysis.totalSize += size;

            // Categorize files
            if (ext === '.node') {
                analysis.nativeBindings.push({ path: relPath, size });
            } else if (ext === '.wasm') {
                analysis.wasmFiles.push({ path: relPath, size });
            } else if (ext === '.js' || ext === '.mjs') {
                analysis.jsFiles.push({ path: relPath, size });
            }
        }
    }
}

function printPackageAnalysis(tarball, analysis) {
    console.log(`\n📋 Analysis: ${tarball}`);
    console.log('─'.repeat(50));

    if (analysis.packageJson) {
        console.log(`📄 Version: ${analysis.packageJson.version}`);
        console.log(`📄 Main: ${analysis.mainEntry || 'Not specified'}`);
        console.log(`📄 Exports: ${analysis.exports ? 'Yes' : 'No'}`);
    }

    console.log(`📊 Total files: ${analysis.files.length}`);
    console.log(`📊 Total size: ${formatBytes(analysis.totalSize)}`);

    console.log(`\n🔧 Native bindings (.node): ${analysis.nativeBindings.length}`);
    for (const binding of analysis.nativeBindings) {
        console.log(`  📎 ${binding.path} (${formatBytes(binding.size)})`);
    }

    console.log(`\n🌐 WASM files (.wasm): ${analysis.wasmFiles.length}`);
    for (const wasm of analysis.wasmFiles) {
        console.log(`  🌐 ${wasm.path} (${formatBytes(wasm.size)})`);
    }

    console.log(`\n📝 JavaScript files: ${analysis.jsFiles.length}`);
    for (const js of analysis.jsFiles.slice(0, 5)) { // Show first 5
        console.log(`  📝 ${js.path} (${formatBytes(js.size)})`);
    }
    if (analysis.jsFiles.length > 5) {
        console.log(`  ... and ${analysis.jsFiles.length - 5} more`);
    }

    // Check main entry file content
    if (analysis.mainEntry) {
        const mainPath = path.join(analysis.packageDir, analysis.mainEntry);
        if (fs.existsSync(mainPath)) {
            console.log(`\n📖 Main entry (${analysis.mainEntry}):`);
            const content = fs.readFileSync(mainPath, 'utf8');
            console.log('─'.repeat(30));
            console.log(content.substring(0, 500));
            if (content.length > 500) console.log('...[truncated]');
            console.log('─'.repeat(30));
        }
    }
}

function testLoadingMechanisms(inspectDir, results) {
    console.log('🧪 Testing loading mechanisms...\n');

    for (const [tarball, analysis] of Object.entries(results)) {
        console.log(`\n🔍 Testing ${tarball}:`);

        // Try to load native bindings directly
        for (const binding of analysis.nativeBindings) {
            const bindingPath = path.join(analysis.packageDir, binding.path);
            console.log(`  Testing native binding: ${binding.path}`);
            try {
                require(bindingPath);
                console.log(`  ✅ Native binding loads successfully`);
            } catch (error) {
                console.log(`  ❌ Native binding failed: ${error.message}`);
            }
        }

        // Check for napi-rs patterns
        const napiFiles = analysis.files.filter(f => f.path.includes('napi') || f.path.includes('@napi-rs'));
        if (napiFiles.length > 0) {
            console.log(`  📦 NAPI-RS files found: ${napiFiles.length}`);
            napiFiles.forEach(f => console.log(`    - ${f.path}`));
        }

        // Test WASM loading
        for (const wasm of analysis.wasmFiles) {
            console.log(`  Testing WASM: ${wasm.path}`);
            const wasmPath = path.join(analysis.packageDir, wasm.path);
            try {
                const wasmBuffer = fs.readFileSync(wasmPath);
                console.log(`  ✅ WASM file readable (${formatBytes(wasmBuffer.length)})`);
            } catch (error) {
                console.log(`  ❌ WASM file failed: ${error.message}`);
            }
        }
    }
}

function generateComparisonReport(results) {
    console.log('📈 Package Comparison Report');
    console.log('═'.repeat(60));

    const packages = ['ddex-parser', 'ddex-builder'];

    for (const pkg of packages) {
        console.log(`\n📦 ${pkg.toUpperCase()}`);
        console.log('─'.repeat(40));

        const versions = Object.keys(results)
            .filter(t => t.includes(pkg))
            .sort();

        if (versions.length === 0) {
            console.log('  ❌ No versions found');
            continue;
        }

        for (const version of versions) {
            const analysis = results[version];
            console.log(`\n  📊 ${version}:`);
            console.log(`    Size: ${formatBytes(analysis.totalSize)}`);
            console.log(`    Native bindings: ${analysis.nativeBindings.length}`);
            console.log(`    WASM files: ${analysis.wasmFiles.length}`);
            console.log(`    Main entry: ${analysis.mainEntry || 'None'}`);

            if (analysis.nativeBindings.length === 0 && analysis.wasmFiles.length === 0) {
                console.log(`    ⚠️  No native bindings or WASM found - likely mock implementation`);
            }
        }
    }

    console.log('\n🎯 Key Findings:');
    console.log('─'.repeat(40));

    // Analyze findings
    const allAnalyses = Object.values(results);
    const hasNativeBindings = allAnalyses.some(a => a.nativeBindings.length > 0);
    const hasWasm = allAnalyses.some(a => a.wasmFiles.length > 0);

    if (!hasNativeBindings && !hasWasm) {
        console.log('❌ No native bindings or WASM found in any package');
        console.log('💡 This explains why packages fall back to mock implementations');
    }

    if (hasNativeBindings) {
        console.log('✅ Native bindings found in some packages');
    }

    if (hasWasm) {
        console.log('✅ WASM files found in some packages');
    }

    console.log('\n📋 Recommendations:');
    console.log('─'.repeat(40));
    console.log('1. Check build pipeline for native binding inclusion');
    console.log('2. Verify WASM compilation and packaging');
    console.log('3. Test loading mechanisms in package.json exports');
    console.log('4. Compare with working local builds');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the inspection
inspectPackages().catch(console.error);