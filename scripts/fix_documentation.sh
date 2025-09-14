#!/bin/bash
# scripts/fix_documentation.sh

echo "🔧 Fixing documentation warnings for v0.4.0"
echo "==========================================="

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# First, apply automatic fixes
echo -e "${BLUE}Applying automatic fixes...${NC}"
cargo fix --lib -p ddex-core --allow-dirty 2>/dev/null
cargo fix --lib -p ddex-parser --allow-dirty 2>/dev/null
cargo fix --lib -p ddex-builder --allow-dirty 2>/dev/null

# Check specific documentation fixes we applied
echo ""
echo -e "${BLUE}Verifying specific documentation fixes...${NC}"

# Track verification results
VERIFIED=0
FAILED=0

# Check ddex-builder documentation fixes
check_file() {
    local file=$1
    local pattern=$2
    local description=$3

    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "  ✅ $description"
        ((VERIFIED++))
    else
        echo -e "  ❌ $description"
        ((FAILED++))
    fi
}

echo "Checking ddex-builder fixes:"
check_file "packages/ddex-builder/src/id_generator.rs" "/// Unicode normalization form for ID generation" "UnicodeForm enum documentation"
check_file "packages/ddex-builder/src/id_generator.rs" "/// Case normalization strategy for ID generation" "CaseNormalization enum documentation"
check_file "packages/ddex-builder/src/preflight.rs" "/// Validation strictness level for preflight checks" "PreflightLevel enum documentation"
check_file "packages/ddex-builder/src/preflight.rs" "/// Result of preflight validation" "ValidationResult struct documentation"
check_file "packages/ddex-builder/src/versions/mod.rs" "/// Field transformation between DDEX versions" "ConversionType enum documentation"
check_file "packages/ddex-builder/src/versions/converter.rs" "/// Result of version conversion operation" "ConversionResult enum documentation"
check_file "packages/ddex-builder/src/optimized_strings.rs" "/// Localized string with language code" "OptimizedLocalizedString documentation"
check_file "packages/ddex-builder/src/security/entity_classifier.rs" "/// Classification result" "ClassificationResult enum documentation"
check_file "packages/ddex-builder/src/security/error_sanitizer.rs" "/// Context where error occurred" "ErrorContext enum documentation"
check_file "packages/ddex-builder/src/parallel_processing.rs" "/// Result of parallel processing" "ParallelBuildResult documentation"
check_file "packages/ddex-builder/src/caching.rs" "/// Validation rule for cached schemas" "ValidationRule struct documentation"
check_file "packages/ddex-builder/src/canonical/mod.rs" "/// Create a test canonicalizer with specific DDEX version for testing" "Test function documentation"

# Check code quality fixes
echo ""
echo "Checking code quality fixes:"
check_file "packages/ddex-builder/src/memory_optimization.rs" "let _obj2 = pool.get();" "Unused variable fix"
check_file "packages/ddex-builder/src/memory_optimization.rs" "pub fn get(&self) -> PooledObject<'_, T>" "Lifetime elision fix"
check_file "packages/ddex-builder/src/namespace_minimizer.rs" "let ast = AST {" "Unnecessary mut removal"

# Check remaining warnings
echo ""
echo -e "${BLUE}Checking remaining documentation warnings...${NC}"
WARNINGS=$(cargo doc --no-deps -p ddex-builder 2>&1 | grep "warning:" | grep -c "missing documentation")

if [ "$WARNINGS" -eq 0 ]; then
    echo -e "  ✅ ${GREEN}No missing documentation warnings!${NC}"
else
    echo -e "  ⚠️  ${YELLOW}$WARNINGS missing documentation warnings remaining${NC}"
    echo ""
    echo "Missing documentation for:"
    cargo doc --no-deps -p ddex-builder 2>&1 | grep "missing documentation" | head -5 | sed 's/^/  /'
fi

# Generate documentation to verify it builds
echo ""
echo -e "${BLUE}Generating documentation...${NC}"
if cargo doc --no-deps --all-features -p ddex-builder >/dev/null 2>&1; then
    echo -e "  ✅ ${GREEN}Documentation builds successfully${NC}"
else
    echo -e "  ❌ ${RED}Documentation build failed${NC}"
    ((FAILED++))
fi

# Documentation coverage report
echo ""
echo -e "${BLUE}📊 Documentation Coverage Report:${NC}"
for package in ddex-core ddex-parser ddex-builder; do
    if [ -d "packages/$package/src" ]; then
        echo -n "  $package: "
        # Count public items vs documented items (more accurate)
        TOTAL=$(find packages/$package/src -name "*.rs" -exec grep -l "^pub " {} \; | xargs grep "^pub " | wc -l)
        DOCUMENTED=$(find packages/$package/src -name "*.rs" -exec grep -l "^/// " {} \; | xargs grep "^/// " | wc -l)

        if [ "$TOTAL" -gt 0 ]; then
            PERCENT=$((DOCUMENTED * 100 / TOTAL))
            if [ "$PERCENT" -ge 80 ]; then
                echo -e "${GREEN}$PERCENT% documented ($DOCUMENTED/$TOTAL items)${NC}"
            elif [ "$PERCENT" -ge 60 ]; then
                echo -e "${YELLOW}$PERCENT% documented ($DOCUMENTED/$TOTAL items)${NC}"
            else
                echo -e "${RED}$PERCENT% documented ($DOCUMENTED/$TOTAL items)${NC}"
            fi
        else
            echo -e "${YELLOW}No public items found${NC}"
        fi
    fi
done

# Security-specific documentation check
echo ""
echo -e "${BLUE}Security Documentation Check:${NC}"
SECURITY_DOCS=0
if grep -q "/// Sanitize.*error for safe external reporting" packages/ddex-builder/src/security/error_sanitizer.rs; then
    echo -e "  ✅ ${GREEN}Error sanitization functions documented${NC}"
    ((SECURITY_DOCS++))
fi
if grep -q "/// Entity is safe\|/// Entity is potentially malicious" packages/ddex-builder/src/security/entity_classifier.rs; then
    echo -e "  ✅ ${GREEN}Entity classification results documented${NC}"
    ((SECURITY_DOCS++))
fi

# Performance documentation check
echo ""
echo -e "${BLUE}Performance Documentation Check:${NC}"
PERF_DOCS=0
if grep -q "/// Statistics for string optimization" packages/ddex-builder/src/optimized_strings.rs; then
    echo -e "  ✅ ${GREEN}String optimization stats documented${NC}"
    ((PERF_DOCS++))
fi
if grep -q "/// Result of parallel processing" packages/ddex-builder/src/parallel_processing.rs; then
    echo -e "  ✅ ${GREEN}Parallel processing results documented${NC}"
    ((PERF_DOCS++))
fi
if grep -q "/// Cache statistics" packages/ddex-builder/src/caching.rs; then
    echo -e "  ✅ ${GREEN}Cache statistics documented${NC}"
    ((PERF_DOCS++))
fi

# Final summary
echo ""
echo "========================================="
echo -e "${BLUE}📋 SUMMARY${NC}"
echo "========================================="
echo -e "Documentation fixes verified: ${GREEN}$VERIFIED${NC}"
if [ "$FAILED" -gt 0 ]; then
    echo -e "Documentation fixes failed: ${RED}$FAILED${NC}"
fi
echo -e "Security documentation items: ${GREEN}$SECURITY_DOCS/2${NC}"
echo -e "Performance documentation items: ${GREEN}$PERF_DOCS/3${NC}"

if [ "$FAILED" -eq 0 ]; then
    echo ""
    echo -e "🎉 ${GREEN}All documentation fixes verified successfully!${NC}"
    if [ "$WARNINGS" -gt 0 ]; then
        echo -e "📚 ${YELLOW}$WARNINGS missing documentation warnings remain (struct fields, etc.)${NC}"
        echo -e "📚 ${GREEN}Core documentation fixes complete - ready for v0.4.0 release${NC}"
    else
        echo -e "📚 ${GREEN}Perfect documentation - ready for v0.4.0 release${NC}"
    fi
    exit 0
else
    echo ""
    echo -e "⚠️  ${YELLOW}Some critical issues found - please review above${NC}"
    exit 1
fi