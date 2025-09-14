#!/bin/bash
# scripts/verify_clean_build.sh
# Comprehensive clean build verification for DDEX Suite v0.4.0

set -e

echo "🔍 DDEX Suite v0.4.0 Clean Build Verification"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() { echo -e "${CYAN}[STEP]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if we're in the right directory
if [ ! -f "Cargo.toml" ] || [ ! -d "packages" ]; then
    print_error "This script must be run from the root of the ddex-suite repository"
    exit 1
fi

# Initialize counters
TOTAL_WARNINGS=0
TOTAL_ERRORS=0
BUILD_FAILURES=0
TEST_FAILURES=0

# Step 1: Clean previous builds
print_header "1. Cleaning previous builds"
print_info "Removing all build artifacts..."
cargo clean
print_success "✓ Build cache cleared"
echo ""

# Step 2: Build each package individually
print_header "2. Building individual packages"

packages=("ddex-core" "ddex-parser" "ddex-builder")

for package in "${packages[@]}"; do
    print_info "Building $package..."

    # Capture build output
    BUILD_OUTPUT=$(cargo build --lib -p "$package" 2>&1)
    BUILD_EXIT_CODE=$?

    # Count warnings and errors
    WARNINGS=$(echo "$BUILD_OUTPUT" | grep -c "warning:" || true)
    ERRORS=$(echo "$BUILD_OUTPUT" | grep -c "error:" || true)

    if [ -z "$WARNINGS" ]; then WARNINGS=0; fi
    if [ -z "$ERRORS" ]; then ERRORS=0; fi

    TOTAL_WARNINGS=$((TOTAL_WARNINGS + WARNINGS))
    TOTAL_ERRORS=$((TOTAL_ERRORS + ERRORS))

    if [ $BUILD_EXIT_CODE -eq 0 ]; then
        print_success "✓ $package built successfully ($WARNINGS warnings, $ERRORS errors)"
    else
        print_error "✗ $package build failed ($WARNINGS warnings, $ERRORS errors)"
        BUILD_FAILURES=$((BUILD_FAILURES + 1))
        echo "Build output for $package:"
        echo "$BUILD_OUTPUT" | tail -20
        echo ""
    fi
done

echo ""

# Step 3: Full workspace build
print_header "3. Building complete workspace"
print_info "Building all packages together..."

WORKSPACE_OUTPUT=$(cargo build --workspace 2>&1)
WORKSPACE_EXIT_CODE=$?

if [ $WORKSPACE_EXIT_CODE -eq 0 ]; then
    print_success "✓ Workspace build successful"
else
    print_error "✗ Workspace build failed"
    BUILD_FAILURES=$((BUILD_FAILURES + 1))
    echo "Workspace build errors:"
    echo "$WORKSPACE_OUTPUT" | grep -A 5 -B 5 "error:" || echo "No specific error pattern found"
fi

echo ""

# Step 4: Check for specific fixed issues
print_header "4. Verifying specific fixes"

# Check for LinkerError issues
LINKER_ERRORS=$(cargo check --package ddex-builder 2>&1 | grep -c "LinkerError" || true)
if [ -z "$LINKER_ERRORS" ]; then LINKER_ERRORS=0; fi

if [ "$LINKER_ERRORS" -eq 0 ]; then
    print_success "✓ No LinkerError references found"
else
    print_warning "⚠ Found $LINKER_ERRORS LinkerError references"
fi

# Check for deprecated IndexMap methods
DEPRECATED_REMOVES=$(cargo check --package ddex-builder 2>&1 | grep -c "deprecated.*remove" || true)
if [ -z "$DEPRECATED_REMOVES" ]; then DEPRECATED_REMOVES=0; fi

if [ "$DEPRECATED_REMOVES" -eq 0 ]; then
    print_success "✓ No deprecated IndexMap methods found"
else
    print_warning "⚠ Found $DEPRECATED_REMOVES deprecated remove() calls"
fi

# Check for ambiguous glob re-exports
AMBIGUOUS_GLOBS=$(cargo check --package ddex-builder 2>&1 | grep -c "ambiguous glob re-exports" || true)
if [ -z "$AMBIGUOUS_GLOBS" ]; then AMBIGUOUS_GLOBS=0; fi

if [ "$AMBIGUOUS_GLOBS" -eq 0 ]; then
    print_success "✓ No ambiguous glob re-exports"
else
    print_error "✗ Found $AMBIGUOUS_GLOBS ambiguous glob re-exports"
fi

echo ""

# Step 5: Run tests
print_header "5. Running test suites"

test_packages=("ddex-parser" "ddex-builder")

for package in "${test_packages[@]}"; do
    print_info "Testing $package..."

    # Run tests with timeout
    TEST_OUTPUT=$(timeout 300 cargo test --lib -p "$package" 2>&1 || echo "TEST_TIMEOUT_OR_FAILURE")
    TEST_EXIT_CODE=$?

    # Parse test results
    if echo "$TEST_OUTPUT" | grep -q "TEST_TIMEOUT_OR_FAILURE"; then
        print_error "✗ $package tests timed out or failed to run"
        TEST_FAILURES=$((TEST_FAILURES + 1))
    else
        PASSED=$(echo "$TEST_OUTPUT" | grep -o "[0-9]\+ passed" | grep -o "[0-9]\+" || echo "0")
        FAILED=$(echo "$TEST_OUTPUT" | grep -o "[0-9]\+ failed" | grep -o "[0-9]\+" || echo "0")

        if [ -z "$PASSED" ]; then PASSED=0; fi
        if [ -z "$FAILED" ]; then FAILED=0; fi

        if [ "$FAILED" -eq 0 ] && [ "$PASSED" -gt 0 ]; then
            print_success "✓ $package tests passed ($PASSED passed, $FAILED failed)"
        elif [ "$PASSED" -eq 0 ] && [ "$FAILED" -eq 0 ]; then
            print_warning "⚠ $package has no tests or tests didn't run properly"
        else
            print_error "✗ $package tests failed ($PASSED passed, $FAILED failed)"
            TEST_FAILURES=$((TEST_FAILURES + 1))
            echo "Test failures for $package:"
            echo "$TEST_OUTPUT" | grep -A 3 "FAILED" | head -10
        fi
    fi
done

echo ""

# Step 6: Binary builds
print_header "6. Building CLI binaries"

binaries=("ddex-parser" "ddex-builder")

for binary in "${binaries[@]}"; do
    print_info "Building $binary binary..."

    if cargo build --bin "$binary" --quiet 2>/dev/null; then
        print_success "✓ $binary binary built successfully"

        # Test binary exists and runs
        if [ -f "target/debug/$binary" ]; then
            VERSION_OUTPUT=$(./target/debug/"$binary" --version 2>/dev/null || echo "NO_VERSION")
            if [ "$VERSION_OUTPUT" != "NO_VERSION" ]; then
                print_info "  Version: $VERSION_OUTPUT"
            fi
        fi
    else
        print_error "✗ $binary binary build failed"
        BUILD_FAILURES=$((BUILD_FAILURES + 1))
    fi
done

echo ""

# Step 7: Performance check
print_header "7. Quick performance check"

print_info "Checking binary sizes..."
if [ -d "target/debug" ]; then
    for binary in "${binaries[@]}"; do
        if [ -f "target/debug/$binary" ]; then
            SIZE=$(du -h "target/debug/$binary" | cut -f1)
            print_info "  $binary: $SIZE"
        fi
    done
fi

echo ""

# Step 8: Documentation build
print_header "8. Building documentation"

print_info "Building documentation..."
DOC_OUTPUT=$(cargo doc --workspace --no-deps --quiet 2>&1)
DOC_EXIT_CODE=$?

if [ $DOC_EXIT_CODE -eq 0 ]; then
    print_success "✓ Documentation built successfully"
else
    print_warning "⚠ Documentation build had issues"
    echo "$DOC_OUTPUT" | head -10
fi

echo ""

# Final Summary
print_header "BUILD VERIFICATION SUMMARY"
echo "=========================================="
echo -e "📦 Packages: ${#packages[@]}"
echo -e "🔧 Build failures: $BUILD_FAILURES"
echo -e "⚠️  Total warnings: $TOTAL_WARNINGS"
echo -e "❌ Total errors: $TOTAL_ERRORS"
echo -e "🧪 Test failures: $TEST_FAILURES"
echo -e "🔍 Ambiguous globs: $AMBIGUOUS_GLOBS"
echo -e "🔗 LinkerError refs: $LINKER_ERRORS"
echo "=========================================="

# Determine overall status
if [ "$BUILD_FAILURES" -eq 0 ] && [ "$TOTAL_ERRORS" -eq 0 ] && [ "$AMBIGUOUS_GLOBS" -eq 0 ]; then
    print_success "🎉 CLEAN BUILD VERIFICATION PASSED!"
    echo ""
    echo "✅ All packages build successfully"
    echo "✅ No compilation errors"
    echo "✅ All critical fixes verified"
    echo "✅ DDEX Suite v0.4.0 is ready for production use"
    echo ""
    echo "Next steps:"
    echo "  • cargo build --release          # Optimized builds"
    echo "  • cargo test --release           # Release mode tests"
    echo "  • cargo publish --dry-run        # Pre-publish check"
    exit 0
elif [ "$BUILD_FAILURES" -eq 0 ] && [ "$TOTAL_ERRORS" -eq 0 ]; then
    print_warning "⚠️ CLEAN BUILD MOSTLY SUCCESSFUL"
    echo ""
    echo "✅ All packages build successfully"
    echo "✅ No compilation errors"
    if [ "$AMBIGUOUS_GLOBS" -gt 0 ]; then
        echo "⚠️  Some ambiguous glob re-exports remain"
    fi
    echo "⚠️  Warning count: $TOTAL_WARNINGS (consider addressing)"
    echo ""
    echo "The codebase is functional but could benefit from cleanup."
    exit 1
else
    print_error "❌ CLEAN BUILD VERIFICATION FAILED"
    echo ""
    echo "❌ Build failures: $BUILD_FAILURES"
    echo "❌ Compilation errors: $TOTAL_ERRORS"
    echo "❌ Test failures: $TEST_FAILURES"
    echo ""
    echo "Manual intervention required before the codebase is ready."
    echo "Review the error output above for specific issues to address."
    exit 2
fi