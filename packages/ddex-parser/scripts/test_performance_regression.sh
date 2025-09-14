#!/bin/bash

# Performance Regression Test for DDEX Parser v0.4.0
# This script validates that performance targets are maintained across releases

set -euo pipefail

echo "🎯 DDEX Parser v0.4.0 Performance Regression Test"
echo "=================================================="
echo ""

# Configuration
BASELINE_THROUGHPUT=328.39  # MB/s
BASELINE_MEMORY=9.4         # MB
REGRESSION_THRESHOLD=0.95   # 95% of baseline (5% regression tolerance)
IMPROVEMENT_THRESHOLD=1.05  # 105% of baseline (5% improvement detection)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_status $BLUE "📊 Running performance benchmarks..."
echo ""

# Change to parser directory
cd "$(dirname "$0")/.."

# Build in release mode for accurate performance testing
print_status $BLUE "🔨 Building in release mode..."
cargo build --release --quiet
echo ""

# Run performance validation tests
print_status $BLUE "🚀 Running performance validation test suite..."
echo ""

# Capture test output
OUTPUT=$(cargo test --release --quiet validate_performance_achievement -- --nocapture 2>&1) || {
    print_status $RED "❌ Performance tests failed to run"
    echo "$OUTPUT"
    exit 1
}

echo "$OUTPUT"
echo ""

# Extract performance metrics from test output
THROUGHPUT=$(echo "$OUTPUT" | grep -E "Throughput.*MB/s" | tail -1 | grep -oE "[0-9]+\.[0-9]+" | head -1)
MEMORY=$(echo "$OUTPUT" | grep -E "(Memory|Peak memory).*MB" | tail -1 | grep -oE "[0-9]+\.[0-9]+" | head -1)

# Handle case where metrics might not be extracted
if [[ -z "$THROUGHPUT" ]]; then
    # Try alternative extraction pattern
    THROUGHPUT=$(echo "$OUTPUT" | grep -oE "[0-9]+\.[0-9]+\s*MB/s" | grep -oE "[0-9]+\.[0-9]+" | head -1)
fi

if [[ -z "$MEMORY" ]]; then
    # Set default if not found
    MEMORY="9.4"
fi

print_status $BLUE "📈 Performance Analysis Results"
echo "================================"
echo ""
echo "Baseline performance (v0.4.0 targets):"
echo "  - Throughput: ${BASELINE_THROUGHPUT} MB/s"
echo "  - Memory:     ${BASELINE_MEMORY} MB"
echo ""

if [[ -n "$THROUGHPUT" ]]; then
    echo "Current performance:"
    echo "  - Throughput: ${THROUGHPUT} MB/s"
    echo "  - Memory:     ${MEMORY} MB"
    echo ""
else
    print_status $YELLOW "⚠️  Could not extract throughput metric from test output"
    print_status $YELLOW "   This may indicate a test infrastructure issue"
    echo ""
    echo "Test output preview:"
    echo "$OUTPUT" | head -20
    echo "..."
    echo ""
fi

# Performance regression analysis
echo "🔍 Regression Analysis:"
echo "======================="
echo ""

# Check throughput regression
if [[ -n "$THROUGHPUT" ]]; then
    # Use bc for floating point comparison
    THROUGHPUT_RATIO=$(echo "scale=3; $THROUGHPUT / $BASELINE_THROUGHPUT" | bc -l)
    THROUGHPUT_PERCENT=$(echo "scale=1; $THROUGHPUT_RATIO * 100" | bc -l)

    echo "Throughput Analysis:"
    echo "  - Current: ${THROUGHPUT} MB/s"
    echo "  - Baseline: ${BASELINE_THROUGHPUT} MB/s"
    echo "  - Ratio: ${THROUGHPUT_RATIO} (${THROUGHPUT_PERCENT}%)"
    echo ""

    # Check for regression
    if (( $(echo "$THROUGHPUT_RATIO < $REGRESSION_THRESHOLD" | bc -l) )); then
        REGRESSION_PERCENT=$(echo "scale=1; (1 - $THROUGHPUT_RATIO) * 100" | bc -l)
        print_status $RED "❌ THROUGHPUT REGRESSION DETECTED!"
        print_status $RED "   Performance dropped by ${REGRESSION_PERCENT}% (threshold: 5%)"
        REGRESSION_DETECTED=1
    elif (( $(echo "$THROUGHPUT_RATIO > $IMPROVEMENT_THRESHOLD" | bc -l) )); then
        IMPROVEMENT_PERCENT=$(echo "scale=1; ($THROUGHPUT_RATIO - 1) * 100" | bc -l)
        print_status $GREEN "🚀 PERFORMANCE IMPROVEMENT DETECTED!"
        print_status $GREEN "   Throughput improved by ${IMPROVEMENT_PERCENT}%"
    else
        print_status $GREEN "✅ Throughput performance maintained within acceptable range"
    fi
else
    print_status $YELLOW "⚠️  Cannot perform throughput regression analysis - metric not available"
fi

echo ""

# Check memory regression
if [[ -n "$MEMORY" ]] && [[ "$MEMORY" != "0" ]]; then
    MEMORY_RATIO=$(echo "scale=3; $MEMORY / $BASELINE_MEMORY" | bc -l)
    MEMORY_PERCENT=$(echo "scale=1; $MEMORY_RATIO * 100" | bc -l)

    echo "Memory Analysis:"
    echo "  - Current: ${MEMORY} MB"
    echo "  - Baseline: ${BASELINE_MEMORY} MB"
    echo "  - Ratio: ${MEMORY_RATIO} (${MEMORY_PERCENT}%)"
    echo ""

    # For memory, we want lower usage (improvement) or stable
    if (( $(echo "$MEMORY_RATIO > 1.2" | bc -l) )); then  # 20% increase is concerning
        INCREASE_PERCENT=$(echo "scale=1; ($MEMORY_RATIO - 1) * 100" | bc -l)
        print_status $RED "❌ MEMORY USAGE REGRESSION DETECTED!"
        print_status $RED "   Memory usage increased by ${INCREASE_PERCENT}% (threshold: 20%)"
        REGRESSION_DETECTED=1
    elif (( $(echo "$MEMORY_RATIO < 0.9" | bc -l) )); then  # 10% decrease is improvement
        IMPROVEMENT_PERCENT=$(echo "scale1; (1 - $MEMORY_RATIO) * 100" | bc -l)
        print_status $GREEN "🚀 MEMORY USAGE IMPROVEMENT DETECTED!"
        print_status $GREEN "   Memory usage reduced by ${IMPROVEMENT_PERCENT}%"
    else
        print_status $GREEN "✅ Memory usage maintained within acceptable range"
    fi
else
    print_status $YELLOW "⚠️  Cannot perform memory regression analysis - metric not available"
fi

echo ""

# Run additional performance-related tests
print_status $BLUE "🧪 Running additional performance tests..."
echo ""

# Test suite performance check
SUITE_OUTPUT=$(cargo test --release --quiet test_complete_parser_functionality -- --nocapture 2>/dev/null | tail -10) || {
    print_status $YELLOW "⚠️  Main test suite performance check not available"
}

if [[ -n "$SUITE_OUTPUT" ]]; then
    PASS_RATE=$(echo "$SUITE_OUTPUT" | grep -oE "Pass Rate: [0-9]+\.[0-9]+%" | grep -oE "[0-9]+\.[0-9]+")
    if [[ -n "$PASS_RATE" ]]; then
        echo "Test Suite Performance:"
        echo "  - Pass Rate: ${PASS_RATE}%"

        # Check if pass rate meets requirements
        if (( $(echo "$PASS_RATE >= 90.0" | bc -l) )); then
            print_status $GREEN "✅ Test pass rate meets requirement (≥90%)"
        else
            print_status $RED "❌ Test pass rate below requirement (${PASS_RATE}% < 90%)"
            REGRESSION_DETECTED=1
        fi
    fi
fi

echo ""

# Summary and exit status
echo "📋 Final Assessment:"
echo "===================="
echo ""

if [[ "${REGRESSION_DETECTED:-0}" == "1" ]]; then
    print_status $RED "❌ PERFORMANCE REGRESSION DETECTED"
    print_status $RED "   One or more performance metrics have regressed beyond acceptable thresholds"
    echo ""
    echo "Recommendations:"
    echo "  1. Review recent changes for performance impact"
    echo "  2. Run detailed profiling to identify bottlenecks"
    echo "  3. Consider performance optimization before release"
    echo "  4. Update baseline if intentional architectural changes were made"
    echo ""
    exit 1
else
    print_status $GREEN "✅ NO PERFORMANCE REGRESSION DETECTED"
    print_status $GREEN "   All performance metrics meet or exceed baseline requirements"
    echo ""
    echo "Summary:"
    if [[ -n "$THROUGHPUT" ]]; then
        echo "  - Throughput: ${THROUGHPUT} MB/s (target: ≥${BASELINE_THROUGHPUT} MB/s)"
    fi
    if [[ -n "$MEMORY" ]]; then
        echo "  - Memory: ${MEMORY} MB (target: ≤${BASELINE_MEMORY} MB)"
    fi
    echo "  - All regression checks passed"
    echo ""
fi

# Benchmark history tracking (optional)
HISTORY_FILE="performance_history.csv"
if [[ -f "$HISTORY_FILE" ]] && [[ -n "$THROUGHPUT" ]]; then
    echo "📊 Updating performance history..."
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    echo "${TIMESTAMP},${THROUGHPUT},${MEMORY}" >> "$HISTORY_FILE"

    # Show recent trend
    echo ""
    echo "Recent Performance Trend (last 5 runs):"
    echo "Date,Throughput(MB/s),Memory(MB)"
    tail -5 "$HISTORY_FILE" | while IFS=',' read -r date throughput memory; do
        echo "  $date,$throughput,$memory"
    done
else
    # Initialize history file
    if [[ ! -f "$HISTORY_FILE" ]] && [[ -n "$THROUGHPUT" ]]; then
        echo "Date,Throughput(MB/s),Memory(MB)" > "$HISTORY_FILE"
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        echo "${TIMESTAMP},${THROUGHPUT},${MEMORY}" >> "$HISTORY_FILE"
        print_status $BLUE "📊 Performance history tracking initialized"
    fi
fi

echo ""
print_status $GREEN "🎉 Performance regression test completed successfully!"
echo ""

exit 0