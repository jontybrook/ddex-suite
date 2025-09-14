# DDEX Suite Fix Scripts

This directory contains automation scripts for fixing common compilation errors in DDEX Suite v0.4.0.

## Scripts

### `fix_compilation_errors.sh`
**Main fix script** - Applies all known compilation fixes automatically.

```bash
./scripts/fix_compilation_errors.sh
```

**What it fixes:**
1. **LinkerError → LinkingError** - Renames conflicting error types
2. **Temporary value lifetime issues** - Fixes borrowing issues in parser tests
3. **Deprecated IndexMap methods** - Replaces `remove()` with `shift_remove()`
4. **Non-existent quick_xml methods** - Updates to current API
5. **Unused variables and imports** - Cleans up compilation warnings
6. **Ambiguous glob re-exports** - Uses qualified imports to avoid conflicts
7. **Automated cargo fixes** - Runs `cargo fix` for additional cleanup

### `verify_fixes.sh`
**Quick verification script** - Checks if all fixes were applied correctly.

```bash
./scripts/verify_fixes.sh
```

**What it checks:**
- File-level fixes (imports, method calls, naming)
- Compilation success for both packages
- Warning levels and specific error types
- Overall codebase health

### `verify_clean_build.sh`
**Comprehensive build verification** - Full clean build and test verification.

```bash
./scripts/verify_clean_build.sh
```

**What it verifies:**
- Clean build from scratch (cargo clean)
- Individual package builds (ddex-core, ddex-parser, ddex-builder)
- Full workspace compilation
- Specific fix verification (LinkerError, IndexMap, etc.)
- Test suite execution
- Binary builds and functionality
- Documentation generation
- Performance and size metrics

## Usage Examples

### Apply all fixes:
```bash
# From repository root
./scripts/fix_compilation_errors.sh
```

### Verify fixes worked:
```bash
# Quick verification
./scripts/verify_fixes.sh

# Comprehensive verification
./scripts/verify_clean_build.sh
```

### Full workflow:
```bash
# Apply fixes and verify
./scripts/fix_compilation_errors.sh && ./scripts/verify_fixes.sh

# Complete pipeline with comprehensive testing
./scripts/run_all_fixes.sh

# Full clean build verification
./scripts/verify_clean_build.sh
```

## Exit Codes

### `fix_compilation_errors.sh`
- `0` - All fixes applied successfully
- `1` - Some fixes failed (check output)

### `verify_fixes.sh`
- `0` - All fixes verified, codebase ready
- `1` - Fixes mostly successful, minor issues remain
- `2` - Compilation errors still present

### `verify_clean_build.sh`
- `0` - Clean build verification passed, production ready
- `1` - Clean build mostly successful, minor issues
- `2` - Clean build verification failed, manual intervention needed

## Manual Fixes

Some issues may still require manual attention:

### Complex lifetime issues
```rust
// May need manual fix in some test files
let name_bytes = element.name();
let name = std::str::from_utf8(name_bytes.as_ref())?;
```

### Version-specific API usage
```rust
// Use qualified imports for version-specific functions
use crate::versions::ern43::get_namespace_mappings;
```

### Test-specific quick_xml updates
```rust
// Replace deprecated methods with current API
while let Ok(event) = reader.read_event_into(&mut buf) {
    match event {
        Event::Start(e) => {
            let name = e.local_name();
            // Process element...
        }
        _ => {}
    }
}
```

## Troubleshooting

### If fixes fail:
1. Check you're in repository root
2. Ensure files aren't read-only
3. Run `git status` to see what changed
4. Use `git checkout -- <file>` to reset individual files if needed

### If compilation still fails:
1. Run `cargo clean` to clear build cache
2. Check for additional API changes in dependencies
3. Review error messages for patterns not covered by scripts

### If verification fails:
1. Run the fix script again
2. Check for file permission issues
3. Manually verify the specific failing checks

## Development

To add new fixes to the script:

1. Identify the pattern to fix
2. Add detection logic to `verify_fixes.sh`
3. Add fix logic to `fix_compilation_errors.sh`
4. Test on a clean checkout
5. Update this README

## Backup and Recovery

The fix script creates backups for major changes:
- `packages/ddex-builder/src/versions/mod.rs.bak` - Original versions module

To restore a backup:
```bash
cp packages/ddex-builder/src/versions/mod.rs.bak packages/ddex-builder/src/versions/mod.rs
```