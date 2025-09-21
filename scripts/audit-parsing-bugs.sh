#!/bin/bash

echo "🔍 DDEX Suite Parsing Bug Audit"
echo "================================"

# Check for debug logging in production code
echo -e "\n📢 Checking for debug logging in production code..."
echo "Files with eprintln!/println!/dbg! in library code:"
find packages -name "*.rs" -not -path "*/examples/*" -not -path "*/tests/*" -not -path "*/benches/*" -not -name "main.rs" -not -name "cli.rs" | xargs grep -l "eprintln!\|println!\|dbg!" | head -10

# Check for all get_primary_* calls that could fail like PartyName/PartyId
echo -e "\n🎯 Checking for potential get_primary_* failure points..."
echo "All get_primary_* calls that use ? operator:"
grep -r "get_primary.*?" packages/ddex-parser/src/transform/ | head -10

# Check for empty Vec::new() assignments that might cause failures
echo -e "\n📝 Checking for empty Vec::new() assignments..."
echo "Empty vector assignments that might cause missing field errors:"
grep -r "Vec::new()" packages/ddex-parser/src/transform/ | head -5

# Check playground samples for simplified DDEX format usage
echo -e "\n🎮 Checking playground samples for format issues..."
echo "PartyName usage in playground:"
grep -A2 -B2 "PartyName" website/src/pages/playground.tsx

# Check for missing field parsing in graph transformation
echo -e "\n🔍 Checking for missing element parsing..."
echo "Elements that have start parsing but may be missing end parsing:"
echo "MessageSender/MessageRecipient related parsing:"
grep -A5 -B5 "MessageSender\|MessageRecipient" packages/ddex-parser/src/transform/graph.rs | head -15

echo -e "\n✅ Audit complete. Review the output above for potential issues."
echo "Focus on:"
echo "  1. Debug logging in non-CLI library code"
echo "  2. get_primary_* calls without proper null handling"
echo "  3. Empty Vec::new() assignments"
echo "  4. Missing element parsing in graph transformation"