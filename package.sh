#!/bin/bash

# Package Build Inspector for distribution
# This script creates a clean copy ready for deployment

echo "Packaging Build Inspector for distribution..."
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create distribution directory
DIST_DIR="build-inspector-dist"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

echo "Creating distribution package..."

# Copy backend files
echo "  Copying backend..."
mkdir -p "$DIST_DIR/backend"
cp backend/Dockerfile "$DIST_DIR/backend/"
cp backend/server.py "$DIST_DIR/backend/"
cp backend/requirements.txt "$DIST_DIR/backend/"
cp backend/.dockerignore "$DIST_DIR/backend/" 2>/dev/null || true

# Copy frontend files
echo "  Copying frontend..."
mkdir -p "$DIST_DIR/frontend"
cp frontend/Dockerfile "$DIST_DIR/frontend/"
cp frontend/nginx.conf "$DIST_DIR/frontend/"
cp frontend/package.json "$DIST_DIR/frontend/"
cp frontend/.dockerignore "$DIST_DIR/frontend/" 2>/dev/null || true

# Generate yarn.lock if missing
if [ -f frontend/yarn.lock ]; then
    cp frontend/yarn.lock "$DIST_DIR/frontend/"
fi

# Copy frontend src recursively
cp -r frontend/src "$DIST_DIR/frontend/"
cp -r frontend/public "$DIST_DIR/frontend/"
cp frontend/tailwind.config.js "$DIST_DIR/frontend/"
cp frontend/postcss.config.js "$DIST_DIR/frontend/"
cp frontend/craco.config.js "$DIST_DIR/frontend/" 2>/dev/null || true
cp frontend/.env.production "$DIST_DIR/frontend/" 2>/dev/null || true

# Copy root files
echo "  Copying configuration..."
cp docker compose.yml "$DIST_DIR/"
cp .dockerignore "$DIST_DIR/" 2>/dev/null || true
cp .env.example "$DIST_DIR/" 2>/dev/null || true

# Copy scripts
echo "  Copying scripts..."
cp setup.sh "$DIST_DIR/"
cp start.sh "$DIST_DIR/"
cp manage.sh "$DIST_DIR/"
chmod +x "$DIST_DIR"/*.sh

# Copy documentation
echo "  Copying documentation..."
cp README.md "$DIST_DIR/"
cp QUICKSTART.md "$DIST_DIR/"
cp DEPLOYMENT.md "$DIST_DIR/"
cp DATABASE_INFO.md "$DIST_DIR/"
cp CHECKLIST.md "$DIST_DIR/"

# Create archive
echo ""
echo "Creating archive..."
tar -czf build-inspector.tar.gz "$DIST_DIR"

echo ""
echo "✅ Package created successfully!"
echo ""
echo "Distribution files:"
echo "  📁 Directory: $DIST_DIR/"
echo "  📦 Archive:   build-inspector.tar.gz"
echo ""
echo "To deploy on another machine:"
echo "  1. Copy build-inspector.tar.gz to target machine"
echo "  2. tar -xzf build-inspector.tar.gz"
echo "  3. cd build-inspector-dist"
echo "  4. ./setup.sh"
echo "  5. ./start.sh"
echo ""
