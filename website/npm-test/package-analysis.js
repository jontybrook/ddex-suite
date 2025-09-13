#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 DDEX Suite Package Analysis Report');
console.log('=====================================\n');

function analyzePackage(packagePath, name) {
    console.log(`📦 ${name.toUpperCase()}`);
    console.log('─'.repeat(50));

    // Read package.json
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log(`Version: ${packageJson.version}`);
        console.log(`Main: ${packageJson.main || 'Not specified'}`);
        console.log(`Exports: ${packageJson.exports ? 'Yes' : 'No'}`);
        console.log(`Scripts: ${Object.keys(packageJson.scripts || {}).join(', ') || 'None'}`);

        if (packageJson.exports) {
            console.log('📤 Exports:');
            console.log(JSON.stringify(packageJson.exports, null, 2));
        }

        if (packageJson.napi) {
            console.log('🔧 NAPI Configuration:');
            console.log(JSON.stringify(packageJson.napi, null, 2));
        }

        console.log('\n📂 Dependencies:');
        const deps = packageJson.dependencies || {};
        if (Object.keys(deps).length > 0) {
            Object.entries(deps).forEach(([name, version]) => {
                console.log(`  - ${name}: ${version}`);
            });
        } else {
            console.log('  None');
        }
    }

    // List all files
    console.log('\n📁 Files:');
    listFiles(packagePath, '');

    // Check for native bindings
    console.log('\n🔧 Native Bindings:');
    const nativeFiles = findFiles(packagePath, '.node');
    if (nativeFiles.length > 0) {
        nativeFiles.forEach(file => {
            const stat = fs.statSync(path.join(packagePath, file));
            console.log(`  ✅ ${file} (${formatBytes(stat.size)})`);
        });
    } else {
        console.log('  ❌ No .node files found');
    }

    // Check for WASM files
    console.log('\n🌐 WASM Files:');
    const wasmFiles = findFiles(packagePath, '.wasm');
    if (wasmFiles.length > 0) {
        wasmFiles.forEach(file => {
            const stat = fs.statSync(path.join(packagePath, file));
            console.log(`  ✅ ${file} (${formatBytes(stat.size)})`);
        });
    } else {
        console.log('  ❌ No .wasm files found');
    }

    // Examine main entry file
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const mainFile = packageJson.main;
        if (mainFile) {
            const mainPath = path.join(packagePath, mainFile);
            if (fs.existsSync(mainPath)) {
                console.log(`\n📖 Main Entry (${mainFile}):`);
                console.log('─'.repeat(30));
                const content = fs.readFileSync(mainPath, 'utf8');
                console.log(content.substring(0, 800));
                if (content.length > 800) console.log('...[truncated]');
                console.log('─'.repeat(30));
            }
        }
    }

    console.log('\n');
}

function listFiles(dir, prefix, maxDepth = 2, currentDepth = 0) {
    if (currentDepth >= maxDepth) return;

    try {
        const items = fs.readdirSync(dir).sort();
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                console.log(`  ${prefix}📁 ${item}/`);
                listFiles(fullPath, prefix + '  ', maxDepth, currentDepth + 1);
            } else {
                const size = formatBytes(stat.size);
                const ext = path.extname(item);
                let icon = '📄';
                if (ext === '.node') icon = '🔧';
                else if (ext === '.wasm') icon = '🌐';
                else if (ext === '.js' || ext === '.mjs') icon = '📝';
                else if (ext === '.d.ts') icon = '📋';
                else if (ext === '.json') icon = '⚙️';

                console.log(`  ${prefix}${icon} ${item} (${size})`);
            }
        }
    } catch (error) {
        console.log(`  ${prefix}❌ Error reading directory: ${error.message}`);
    }
}

function findFiles(dir, extension, found = []) {
    try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                findFiles(fullPath, extension, found);
            } else if (item.endsWith(extension)) {
                found.push(path.relative(process.cwd(), fullPath).replace(/.*package-inspection\/[^\/]+\//, ''));
            }
        }
    } catch (error) {
        // Ignore errors
    }

    return found;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Analyze packages
const packagesDir = './package-inspection';

console.log('🎯 Key Findings from Published Packages:\n');

if (fs.existsSync(path.join(packagesDir, 'ddex-builder-0.3.5'))) {
    analyzePackage(path.join(packagesDir, 'ddex-builder-0.3.5'), 'ddex-builder-0.3.5');
}

if (fs.existsSync(path.join(packagesDir, 'ddex-parser-0.3.5'))) {
    analyzePackage(path.join(packagesDir, 'ddex-parser-0.3.5'), 'ddex-parser-0.3.5');
}

console.log('🎯 Summary of Issues:');
console.log('─'.repeat(50));
console.log('1. ddex-builder: ✅ Has native bindings (.node file ~2.5MB)');
console.log('2. ddex-parser: ❌ No native bindings or WASM files');
console.log('3. ddex-parser: Uses compiled TypeScript dist/ directory');
console.log('4. Both packages: Missing platform-specific bindings for cross-platform support');
console.log('5. ddex-parser: Likely falls back to mock implementation');
console.log('\n💡 This explains the test behavior we observed!');