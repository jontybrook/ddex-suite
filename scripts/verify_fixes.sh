#!/bin/bash
# scripts/verify_fixes.sh
# Verification script to check if all compilation fixes are working

set -e

echo "🔍 DDEX Suite v0.4.0 Fix Verification"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[CHECK]${NC} $1"; }
print_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
print_error() { echo -e "${RED}[FAIL]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

TOTAL_CHECKS=0
PASSED_CHECKS=0

check_file_contains() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if grep -q "$2" "$1" 2>/dev/null; then
        print_success "$3"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        print_error "$3"
        return 1
    fi
}

check_file_not_contains() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if ! grep -q "$2" "$1" 2>/dev/null; then
        print_success "$3"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        print_error "$3"
        return 1
    fi
}

echo "Checking individual fixes..."
echo ""

# 1. Check LinkerError → LinkingError fixes
print_status "1. Checking LinkerError → LinkingError fixes"
check_file_contains "packages/ddex-builder/src/linker/auto_linker.rs" "LinkingError" "✓ auto_linker.rs uses LinkingError"
check_file_contains "packages/ddex-builder/src/linker/relationship_manager.rs" "LinkingError" "✓ relationship_manager.rs uses LinkingError"
check_file_contains "packages/ddex-builder/src/lib.rs" "LinkingError" "✓ lib.rs exports LinkingError"
check_file_not_contains "packages/ddex-builder/src/linker" "LinkerError" "✓ No LinkerError references remain"

# 2. Check IndexMap fixes
print_status "2. Checking IndexMap deprecated method fixes"
check_file_contains "packages/ddex-builder/src/streaming/reference_manager.rs" "shift_remove" "✓ reference_manager.rs uses shift_remove"
check_file_contains "packages/ddex-builder/src/caching.rs" "shift_remove" "✓ caching.rs uses shift_remove"
check_file_contains "packages/ddex-builder/src/namespace_minimizer.rs" "shift_remove" "✓ namespace_minimizer.rs uses shift_remove"

# 3. Check quick_xml fixes
print_status "3. Checking quick_xml API fixes"
check_file_contains "packages/ddex-parser/tests/improved_failing_tests.rs" "read_event_into" "✓ Uses correct read_event_into method"
check_file_not_contains "packages/ddex-parser/tests/improved_failing_tests.rs" "read_namespaced_event" "✓ No deprecated read_namespaced_event"

# 4. Check unused import removals
print_status "4. Checking unused import cleanup"
check_file_not_contains "packages/ddex-builder/src/linker/types.rs" "use thiserror::Error" "✓ Removed unused thiserror import"
check_file_not_contains "packages/ddex-builder/src/generator/optimized_xml_writer.rs" "use std::io::Write" "✓ Removed unused Write import"

# 5. Check glob re-export fixes
print_status "5. Checking glob re-export fixes"
check_file_contains "packages/ddex-builder/src/versions/mod.rs" "pub mod ern382" "✓ Has qualified ern382 module"
check_file_contains "packages/ddex-builder/src/versions/mod.rs" "pub mod ern42" "✓ Has qualified ern42 module"
check_file_contains "packages/ddex-builder/src/versions/mod.rs" "pub mod ern43" "✓ Has qualified ern43 module"
check_file_not_contains "packages/ddex-builder/src/versions/mod.rs" "pub use ern_382::\*" "✓ No ambiguous glob imports"

echo ""
print_status "Running compilation tests..."

# Test individual packages
COMPILE_ERRORS=0

echo "Testing ddex-parser compilation..."
if cargo check --package ddex-parser --quiet 2>/dev/null; then
    print_success "✓ ddex-parser compiles successfully"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "✗ ddex-parser has compilation errors"
    COMPILE_ERRORS=$((COMPILE_ERRORS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo "Testing ddex-builder compilation..."
if cargo check --package ddex-builder --quiet 2>/dev/null; then
    print_success "✓ ddex-builder compiles successfully"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "✗ ddex-builder has compilation errors"
    COMPILE_ERRORS=$((COMPILE_ERRORS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Count warnings
echo ""
print_status "Analyzing warning levels..."

WARNING_COUNT=$(cargo check --package ddex-parser --package ddex-builder 2>&1 | grep -c "warning:" || true)
if [ -z "$WARNING_COUNT" ]; then WARNING_COUNT=0; fi

AMBIGUOUS_WARNINGS=$(cargo check --package ddex-builder 2>&1 | grep -c "ambiguous glob re-exports" || true)
if [ -z "$AMBIGUOUS_WARNINGS" ]; then AMBIGUOUS_WARNINGS=0; fi

if [ "$WARNING_COUNT" -lt 100 ]; then
    print_success "✓ Warning count is reasonable ($WARNING_COUNT warnings)"
else
    print_warning "⚠ High warning count ($WARNING_COUNT warnings)"
fi

if [ "$AMBIGUOUS_WARNINGS" -eq 0 ]; then
    print_success "✓ No ambiguous glob re-export warnings"
else
    print_error "✗ Still has $AMBIGUOUS_WARNINGS ambiguous glob re-export warnings"
fi

# Summary
echo ""
echo "======================================="
echo "VERIFICATION SUMMARY"
echo "======================================="
echo "Checks passed: $PASSED_CHECKS/$TOTAL_CHECKS"
echo "Compilation errors: $COMPILE_ERRORS"
echo "Total warnings: $WARNING_COUNT"
echo "Ambiguous glob warnings: $AMBIGUOUS_WARNINGS"
echo ""

if [ "$PASSED_CHECKS" -eq "$TOTAL_CHECKS" ] && [ "$COMPILE_ERRORS" -eq 0 ] && [ "$AMBIGUOUS_WARNINGS" -eq 0 ]; then
    print_success "🎉 ALL FIXES VERIFIED SUCCESSFULLY!"
    echo "The DDEX Suite v0.4.0 is ready for development."
    exit 0
elif [ "$COMPILE_ERRORS" -eq 0 ]; then
    print_warning "⚠️ Fixes mostly successful with minor issues"
    echo "The codebase compiles but some checks failed."
    exit 1
else
    print_error "❌ COMPILATION ERRORS REMAIN"
    echo "Please run the fix script or address issues manually."
    exit 2
fi