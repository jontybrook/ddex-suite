#!/bin/bash

echo "🔧 Fixing debug logging in production library code..."

# Fix 1: Remove debug logging from extension_capture.rs
echo "Fixing packages/ddex-parser/src/parser/extension_capture.rs:404"
sed -i '' 's/.*eprintln!("Warning: XML parsing error during extension capture.*/#[cfg(debug_assertions)] &/' packages/ddex-parser/src/parser/extension_capture.rs

# Fix 2: Remove debug logging from comprehensive.rs
echo "Fixing packages/ddex-parser/src/streaming/comprehensive.rs:399"
sed -i '' 's/.*eprintln!("Iterator error.*/#[cfg(debug_assertions)] &/' packages/ddex-parser/src/streaming/comprehensive.rs

# Fix 3-6: Remove debug logging from aligned_comprehensive.rs
echo "Fixing packages/ddex-parser/src/streaming/aligned_comprehensive.rs validation warnings"
sed -i '' 's/.*eprintln!("Warning:.*validation failed.*/#[cfg(debug_assertions)] &/' packages/ddex-parser/src/streaming/aligned_comprehensive.rs

# Fix 7-19: Remove debug logging from fast_streaming_parser.rs
echo "Fixing packages/ddex-parser/src/streaming/fast_streaming_parser.rs performance output"
sed -i '' 's/.*println!("SIMD.*/#[cfg(feature = "performance-debug")] &/' packages/ddex-parser/src/streaming/fast_streaming_parser.rs
sed -i '' 's/.*println!("Throughput.*/#[cfg(feature = "performance-debug")] &/' packages/ddex-parser/src/streaming/fast_streaming_parser.rs
sed -i '' 's/.*println!("Element type counts.*/#[cfg(feature = "performance-debug")] &/' packages/ddex-parser/src/streaming/fast_streaming_parser.rs
sed -i '' 's/^[[:space:]]*println!.*Elements.*/#[cfg(feature = "performance-debug")] &/' packages/ddex-parser/src/streaming/fast_streaming_parser.rs

echo "✅ Debug logging fixes applied"
echo ""
echo "🔍 Verifying fixes - checking for remaining debug output in library code:"

# Verify no debug logging remains in production code
REMAINING=$(grep -r "eprintln!\|println!\|dbg!" packages/ddex-parser/src/ \
  --exclude-dir=bin \
  --exclude="*cli.rs" \
  --exclude="*main.rs" \
  --exclude="*test*.rs" \
  --exclude="*benchmark*.rs" \
  --exclude="*verification*.rs" \
  --exclude="*perf_analysis*.rs" \
  | grep -v "#\[cfg" | wc -l)

if [ "$REMAINING" -eq 0 ]; then
    echo "✅ SUCCESS: No remaining debug logging in production library code"
else
    echo "⚠️  WARNING: $REMAINING debug statements still found:"
    grep -r "eprintln!\|println!\|dbg!" packages/ddex-parser/src/ \
      --exclude-dir=bin \
      --exclude="*cli.rs" \
      --exclude="*main.rs" \
      --exclude="*test*.rs" \
      --exclude="*benchmark*.rs" \
      --exclude="*verification*.rs" \
      --exclude="*perf_analysis*.rs" \
      | grep -v "#\[cfg"
fi

echo ""
echo "🏗️  Next steps:"
echo "1. Test the parser still works: cd packages/ddex-parser/bindings/node && npm run build"
echo "2. Run playground test: node test-fixed-parser.js"
echo "3. Commit the changes if tests pass"