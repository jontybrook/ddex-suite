#!/bin/bash
# scripts/revert_bad_changes.sh

echo "🔧 Reverting breaking changes..."

# Revert the field renames that break tests
cd packages/ddex-builder

# Fix schema/mod.rs - revert _preset back to preset
sed -i '' 's/_preset: Option<PartnerPreset>/preset: Option<PartnerPreset>/' src/schema/mod.rs

# For other fields, use #[allow(dead_code)] instead of renaming
# This preserves the API while suppressing warnings

echo "Fixed compilation error"