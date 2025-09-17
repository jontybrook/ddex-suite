#!/bin/bash

set -e  # Exit on any error

echo "🔄 DDEX Suite Linux Native Build Script (Fixed)"
echo "=============================================="

# Step 1: Clone the repository
echo ""
echo "📦 Step 1: Cloning ddex-suite repository..."
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

if [ -d "ddex-suite" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd ddex-suite
    git pull
else
    echo "Cloning repository..."
    git clone https://github.com/daddykev/ddex-suite.git
    cd ddex-suite
fi

echo "✅ Repository cloned successfully"

# Step 2: Create Dockerfile with proper cross-compilation setup
echo ""
echo "🐳 Step 2: Creating Dockerfile with cross-compilation support..."
mkdir -p dockerfile

cat > dockerfile/Dockerfile << 'EOF'
# Use x86_64 base image directly to avoid cross-compilation issues
FROM --platform=linux/amd64 node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    gcc-x86-64-linux-gnu \
    g++-x86-64-linux-gnu \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Add x86_64-unknown-linux-gnu target
RUN rustup target add x86_64-unknown-linux-gnu

# Set up cross-compilation environment
ENV CC_x86_64_unknown_linux_gnu=x86_64-linux-gnu-gcc
ENV CXX_x86_64_unknown_linux_gnu=x86_64-linux-gnu-g++
ENV AR_x86_64_unknown_linux_gnu=x86_64-linux-gnu-ar
ENV CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=x86_64-linux-gnu-gcc

# Install @napi-rs/cli globally
RUN npm install -g @napi-rs/cli

# Set working directory
WORKDIR /workspace

# Copy the entire project
COPY . .

# Set working directory to parser bindings
WORKDIR /workspace/packages/ddex-parser/bindings/node

# Install Node.js dependencies
RUN npm install

# Build the native module with proper cross-compilation
RUN npx napi build --platform --target x86_64-unknown-linux-gnu --release || \
    (echo "⚠️  napi build failed, trying direct cargo build..." && \
     cd /workspace && \
     CARGO_TARGET_X86_64_UNKNOWN_LINUX_GNU_LINKER=x86_64-linux-gnu-gcc \
     CC=x86_64-linux-gnu-gcc \
     CXX=x86_64-linux-gnu-g++ \
     cargo build --target x86_64-unknown-linux-gnu --release --package ddex-parser-node && \
     find /workspace/target/x86_64-unknown-linux-gnu/release -name "*.so" -exec cp {} /workspace/packages/ddex-parser/bindings/node/ddex-parser.linux-x64-gnu.node \;)

# Verify the output exists
RUN ls -la *.node || echo "No .node files found, checking alternatives..."
RUN find . -name "*.node" -type f || echo "No .node files in current directory"
RUN find /workspace -name "*.so" -path "*/x86_64-unknown-linux-gnu/*" || echo "No .so files found"
EOF

echo "✅ Dockerfile created successfully"

# Step 3: Build Docker image and compile using x86_64 platform
echo ""
echo "🔨 Step 3: Building Docker image for x86_64 platform..."

# Build the Docker image with explicit platform
docker build --platform=linux/amd64 -f dockerfile/Dockerfile -t ddex-suite-builder-x64 .

# Create container and extract the built file
echo ""
echo "📤 Step 4: Extracting built native module..."

# Create output directory
mkdir -p build_output

# Run container and extract files
CONTAINER_ID=$(docker create ddex-suite-builder-x64)
echo "Container created: $CONTAINER_ID"

# Try to copy the .node file from the expected location
echo "Attempting to extract .node file..."
docker cp "$CONTAINER_ID:/workspace/packages/ddex-parser/bindings/node/ddex-parser.linux-x64-gnu.node" build_output/ 2>/dev/null || \
echo "⚠️  Direct copy failed, searching for built files..."

# Search for any built files and copy them
docker run --rm -v "$(pwd)/build_output:/output" ddex-suite-builder-x64 sh -c "
    echo 'Searching for .node files...'
    find /workspace -name '*.node' -type f -exec cp {} /output/ \; 2>/dev/null || echo 'No .node files found'

    echo 'Searching for .so files in target directory...'
    find /workspace/target/x86_64-unknown-linux-gnu -name '*.so' -type f -exec cp {} /output/ddex-parser.linux-x64-gnu.node \; 2>/dev/null || echo 'No .so files found'

    echo 'Listing all files in output:'
    ls -la /output/ || echo 'Output directory empty'
"

# Clean up container
docker rm "$CONTAINER_ID" > /dev/null

# Step 5: Verify the output
echo ""
echo "🔍 Step 5: Verifying the built native module..."

OUTPUT_FILE=""
if [ -f "build_output/ddex-parser.linux-x64-gnu.node" ]; then
    OUTPUT_FILE="build_output/ddex-parser.linux-x64-gnu.node"
elif [ -f "build_output/index.node" ]; then
    OUTPUT_FILE="build_output/index.node"
    mv "$OUTPUT_FILE" "build_output/ddex-parser.linux-x64-gnu.node"
    OUTPUT_FILE="build_output/ddex-parser.linux-x64-gnu.node"
else
    echo "Checking what files were extracted..."
    ls -la build_output/
    OUTPUT_FILE=$(find build_output -name "*.node" -type f | head -1)
    if [ -n "$OUTPUT_FILE" ]; then
        echo "Found .node file: $OUTPUT_FILE"
        cp "$OUTPUT_FILE" "build_output/ddex-parser.linux-x64-gnu.node"
        OUTPUT_FILE="build_output/ddex-parser.linux-x64-gnu.node"
    fi
fi

if [ -f "$OUTPUT_FILE" ]; then
    echo "✅ Native module found: $OUTPUT_FILE"

    # Check file type
    FILE_TYPE=$(file "$OUTPUT_FILE")
    echo "📋 File type: $FILE_TYPE"

    # Check file size
    FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null || echo "unknown")
    FILE_SIZE_KB=$((FILE_SIZE / 1024))
    echo "📏 File size: ${FILE_SIZE} bytes (${FILE_SIZE_KB} KB)"

    # Verify it's an ELF 64-bit shared object
    if echo "$FILE_TYPE" | grep -q "ELF 64-bit"; then
        echo "✅ Valid ELF 64-bit shared object"

        # Check if size is reasonable (around 340KB expected)
        if [ "$FILE_SIZE_KB" -gt 100 ] && [ "$FILE_SIZE_KB" -lt 1000 ]; then
            echo "✅ File size looks reasonable (${FILE_SIZE_KB} KB)"
        else
            echo "⚠️  File size ${FILE_SIZE_KB} KB seems unusual (expected ~340KB)"
        fi
    else
        echo "❌ Not a valid ELF 64-bit shared object"
        echo "File type: $FILE_TYPE"
    fi

    # Copy to original project directory
    ORIGINAL_DIR="/Users/kevinmoo/Desktop/localrepo/ddex-suite"
    if [ -d "$ORIGINAL_DIR" ]; then
        cp "$OUTPUT_FILE" "$ORIGINAL_DIR/"
        echo "✅ Native module copied to: $ORIGINAL_DIR/ddex-parser.linux-x64-gnu.node"
    fi

else
    echo "❌ No native module found in build output"
    echo "Build output contents:"
    find build_output -type f -ls 2>/dev/null || ls -la build_output/

    # Try alternative approach - look in container for any built artifacts
    echo ""
    echo "🔍 Checking container for any built artifacts..."
    docker run --rm ddex-suite-builder-x64 sh -c "
        echo 'Files in target directory:'
        find /workspace/target -name '*.so' -o -name '*.node' | head -10
        echo 'Files in packages:'
        find /workspace/packages -name '*.so' -o -name '*.node' | head -10
    "
fi

# Clean up
echo ""
echo "🧹 Cleaning up Docker image..."
docker rmi ddex-suite-builder-x64 > /dev/null 2>&1 || echo "Docker image cleanup skipped"

if [ -f "$OUTPUT_FILE" ]; then
    echo ""
    echo "🎉 Build completed successfully!"
    echo "📁 Output location: $OUTPUT_FILE"
    echo "📁 Also available at: $ORIGINAL_DIR/ddex-parser.linux-x64-gnu.node"
else
    echo ""
    echo "❌ Build failed - no native module produced"
    exit 1
fi

# Return to original directory
cd - > /dev/null