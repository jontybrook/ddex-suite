#!/bin/bash

set -e  # Exit on any error

echo "🔄 DDEX Suite Linux Native Build Script"
echo "======================================"

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

# Step 2: Create Dockerfile
echo ""
echo "🐳 Step 2: Creating Dockerfile..."
mkdir -p dockerfile

cat > dockerfile/Dockerfile << 'EOF'
FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Add x86_64-unknown-linux-gnu target
RUN rustup target add x86_64-unknown-linux-gnu

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

# Build the native module
RUN npx napi build --platform --target x86_64-unknown-linux-gnu || \
    (echo "⚠️  napi build failed, trying cargo build fallback..." && \
     cd /workspace && \
     cargo build --target x86_64-unknown-linux-gnu --release && \
     cp /workspace/target/x86_64-unknown-linux-gnu/release/libddex_parser.so ./ddex-parser.linux-x64-gnu.node)

# Verify the output exists
RUN ls -la *.node || echo "No .node files found, checking alternatives..."
RUN find . -name "*.node" -type f || echo "No .node files in current directory"
EOF

echo "✅ Dockerfile created successfully"

# Step 3: Build Docker image and compile
echo ""
echo "🔨 Step 3: Building Docker image and compiling native module..."

# Build the Docker image
docker build -f dockerfile/Dockerfile -t ddex-suite-builder .

# Create container and extract the built file
echo ""
echo "📤 Step 4: Extracting built native module..."

# Create output directory
mkdir -p build_output

# Run container and extract files
CONTAINER_ID=$(docker create ddex-suite-builder)
echo "Container created: $CONTAINER_ID"

# Try to copy the .node file from the expected location
echo "Attempting to extract .node file..."
docker cp "$CONTAINER_ID:/workspace/packages/ddex-parser/bindings/node/ddex-parser.linux-x64-gnu.node" build_output/ 2>/dev/null || \
docker cp "$CONTAINER_ID:/workspace/packages/ddex-parser/bindings/node/" build_output/node_bindings/ 2>/dev/null || \
echo "⚠️  Direct copy failed, will search for .node files in container"

# If direct copy fails, search for .node files
if [ ! -f "build_output/ddex-parser.linux-x64-gnu.node" ]; then
    echo "Searching for .node files in container..."
    docker run --rm ddex-suite-builder find /workspace -name "*.node" -type f | head -10

    # Try alternative extraction
    docker run --rm -v "$(pwd)/build_output:/output" ddex-suite-builder sh -c "
        find /workspace -name '*.node' -type f -exec cp {} /output/ \; || \
        find /workspace -name 'libddex_parser.so' -type f -exec cp {} /output/ddex-parser.linux-x64-gnu.node \;
    "
fi

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
    exit 1
fi

# Clean up
echo ""
echo "🧹 Cleaning up Docker image..."
docker rmi ddex-suite-builder > /dev/null 2>&1 || echo "Docker image cleanup skipped"

echo ""
echo "🎉 Build completed successfully!"
echo "📁 Output location: $OUTPUT_FILE"
echo "📁 Also available at: $ORIGINAL_DIR/ddex-parser.linux-x64-gnu.node"

# Return to original directory
cd - > /dev/null