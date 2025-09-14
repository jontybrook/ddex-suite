#!/bin/bash
# scripts/run_all_fixes.sh
# Master script to apply all fixes and verify results

set -e

echo "🚀 DDEX Suite v0.4.0 Complete Fix Pipeline"
echo "==========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "Cargo.toml" ] || [ ! -d "packages" ]; then
    echo "❌ This script must be run from the root of the ddex-suite repository"
    exit 1
fi

# Step 1: Apply all fixes
echo "Step 1: Applying all compilation fixes..."
echo ""
./scripts/fix_compilation_errors.sh

echo ""
echo "Step 2: Verifying fixes were applied correctly..."
echo ""
./scripts/verify_fixes.sh

EXIT_CODE=$?

echo ""
echo "=========================================="
echo "🎯 PIPELINE COMPLETE"
echo "=========================================="

case $EXIT_CODE in
    0)
        echo "✅ SUCCESS: All fixes applied and verified!"
        echo "The DDEX Suite v0.4.0 is ready for development."
        echo ""
        echo "Next steps:"
        echo "  • cargo build --release    # Build optimized binaries"
        echo "  • cargo test               # Run test suite"
        echo "  • cargo doc --open         # Generate and view docs"
        ;;
    1)
        echo "⚠️  PARTIAL SUCCESS: Fixes applied with minor issues"
        echo "The codebase compiles but some checks failed."
        echo "Review the output above for details."
        ;;
    2)
        echo "❌ FAILED: Compilation errors remain"
        echo "Manual intervention required."
        echo "Check the error messages above."
        ;;
esac

exit $EXIT_CODE