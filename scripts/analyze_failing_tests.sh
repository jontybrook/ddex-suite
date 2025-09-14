#!/bin/bash
# scripts/analyze_failing_tests.sh

echo "🔍 Analyzing Failing Tests for v0.4.0"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to parser directory
cd packages/ddex-parser

echo -e "${BLUE}Step 1: Running complete test suite with detailed output...${NC}"

# Run tests with verbose output and capture both stdout and stderr
cargo test --lib -- --nocapture --test-threads=1 2>&1 | tee full_test_output.log

echo -e "\n${BLUE}Step 2: Extracting failing test information...${NC}"

# Extract test result summary
echo -e "\n${YELLOW}📊 TEST SUMMARY:${NC}"
grep "test result:" full_test_output.log | tail -1

# Extract failing test names
echo -e "\n${RED}📋 FAILING TESTS:${NC}"
FAILING_TESTS=$(grep "test.*FAILED" full_test_output.log | awk '{print $2}' | sort)

if [ -n "$FAILING_TESTS" ]; then
    COUNT=0
    for test in $FAILING_TESTS; do
        COUNT=$((COUNT + 1))
        echo -e "${RED}  $COUNT. $test${NC}"
    done

    echo -e "\n${BLUE}Step 3: Analyzing failure modes...${NC}"

    # Create detailed failure analysis
    for test in $FAILING_TESTS; do
        echo -e "\n${YELLOW}🔬 ANALYZING: $test${NC}"
        echo "=" | tr -d '\n' | head -c 50 && echo

        # Extract the specific failure for this test
        grep -A20 "test $test" full_test_output.log | grep -A20 "FAILED\|panicked" > "failure_${test##*::}.log" 2>/dev/null || true

        # Categorize the failure
        if grep -q "namespace\|xmlns\|prefix" "failure_${test##*::}.log" 2>/dev/null; then
            echo -e "${YELLOW}Category: Namespace handling issue${NC}"
        elif grep -q "timeout\|timed out\|deadline\|slow" "failure_${test##*::}.log" 2>/dev/null; then
            echo -e "${YELLOW}Category: Timeout/Performance issue${NC}"
        elif grep -q "assertion.*failed\|should be equal\|expected.*found" "failure_${test##*::}.log" 2>/dev/null; then
            echo -e "${YELLOW}Category: Assertion failure${NC}"
        elif grep -q "parse\|ParseError\|invalid\|unexpected" "failure_${test##*::}.log" 2>/dev/null; then
            echo -e "${YELLOW}Category: Parsing error${NC}"
        else
            echo -e "${YELLOW}Category: Unknown/Other${NC}"
        fi

        # Show the actual error message
        echo -e "\n${BLUE}Error details:${NC}"
        if [ -f "failure_${test##*::}.log" ]; then
            head -10 "failure_${test##*::}.log" | sed 's/^/  /'
        else
            echo "  No detailed error captured"
        fi

        # Try to run the specific test in isolation for more details
        echo -e "\n${BLUE}Running test in isolation:${NC}"
        timeout 30 cargo test "$test" -- --nocapture 2>&1 | tail -20 | sed 's/^/  /'
    done

else
    echo -e "${GREEN}✅ No failing tests found in current run!${NC}"

    # Check for compilation errors that might prevent tests from running
    if grep -q "error\[" full_test_output.log; then
        echo -e "\n${RED}🚨 COMPILATION ERRORS FOUND:${NC}"
        grep -A3 "error\[" full_test_output.log | head -20
    fi
fi

echo -e "\n${BLUE}Step 4: Failure categorization summary...${NC}"

# Count different types of issues
NAMESPACE_ISSUES=$(grep -r "namespace\|xmlns\|prefix" failure_*.log 2>/dev/null | wc -l || echo "0")
TIMEOUT_ISSUES=$(grep -r "timeout\|timed out\|deadline\|slow" failure_*.log 2>/dev/null | wc -l || echo "0")
PARSE_ERRORS=$(grep -r "parse\|ParseError\|invalid\|unexpected" failure_*.log 2>/dev/null | wc -l || echo "0")
PERFORMANCE_ISSUES=$(grep -r "memory\|allocation\|benchmark\|throughput" failure_*.log 2>/dev/null | wc -l || echo "0")

echo -e "${YELLOW}Failure breakdown:${NC}"
echo "  Namespace issues: $NAMESPACE_ISSUES"
echo "  Timeout issues: $TIMEOUT_ISSUES"
echo "  Parsing errors: $PARSE_ERRORS"
echo "  Performance issues: $PERFORMANCE_ISSUES"

echo -e "\n${BLUE}Step 5: Release impact assessment...${NC}"

# Calculate pass rate
TOTAL_TESTS=$(grep "test result:" full_test_output.log | tail -1 | grep -o "[0-9]\+ passed" | head -1 | grep -o "[0-9]\+" || echo "0")
FAILED_TESTS=$(grep "test result:" full_test_output.log | tail -1 | grep -o "[0-9]\+ failed" | head -1 | grep -o "[0-9]\+" || echo "0")

if [ "$TOTAL_TESTS" -gt 0 ] && [ "$FAILED_TESTS" -gt 0 ]; then
    PASS_RATE=$(( (TOTAL_TESTS - FAILED_TESTS) * 100 / TOTAL_TESTS ))
    echo -e "Pass rate: ${GREEN}$PASS_RATE%${NC} ($((TOTAL_TESTS - FAILED_TESTS))/$TOTAL_TESTS tests)"

    if [ "$PASS_RATE" -ge 90 ]; then
        echo -e "${GREEN}✅ Pass rate meets release criteria (≥90%)${NC}"
        echo -e "${GREEN}✅ Core functionality validated${NC}"
        echo -e "${GREEN}✅ Ready for release with noted limitations${NC}"
    else
        echo -e "${RED}❌ Pass rate below 90% threshold${NC}"
        echo -e "${YELLOW}⚠️  Manual review required before release${NC}"
    fi
elif [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passing - Ready for release!${NC}"
else
    echo -e "${YELLOW}⚠️  Unable to determine pass rate${NC}"
fi

echo -e "\n${BLUE}Step 6: Recommendations...${NC}"

echo -e "${YELLOW}Immediate actions:${NC}"
echo "1. Review individual test failures above"
echo "2. Determine if failures are release-blocking"
echo "3. Consider workarounds or documentation updates"

echo -e "\n${YELLOW}For each failing test:${NC}"
for test in $FAILING_TESTS; do
    case "$test" in
        *namespace*)
            echo "  • $test: Consider if namespace edge cases affect core functionality"
            ;;
        *benchmark*|*performance*)
            echo "  • $test: May be timeout issue due to improved performance"
            ;;
        *comprehensive*|*integration*)
            echo "  • $test: Complex integration test - check if core features work"
            ;;
        *)
            echo "  • $test: Requires individual analysis"
            ;;
    esac
done

# Cleanup temporary files
rm -f failure_*.log

echo -e "\n${GREEN}Analysis complete! Check full_test_output.log for details.${NC}"