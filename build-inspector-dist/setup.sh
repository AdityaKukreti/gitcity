#!/bin/bash

echo "Setting up Build Inspector..."
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create .env.example if it doesn't exist
if [ ! -f .env.example ]; then
    echo "Creating .env.example..."
    cat > .env.example << 'ENVEOF'
# GitLab Configuration
GITLAB_URL=https://gitlab.example.com
GITLAB_TOKEN=your_gitlab_token_here

# Application Configuration
USE_MOCK_DATA=true
FETCH_INTERVAL_SECONDS=30

# Frontend Configuration (update for production)
REACT_APP_BACKEND_URL=http://localhost:8001

# Database Configuration (automatically set by docker compose)
# MONGO_URL=mongodb://mongodb:27017
# DB_NAME=build_inspector
ENVEOF
    echo "✓ Created .env.example"
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo "✓ Created .env"
else
    echo "✓ .env already exists"
fi

# Check required files
echo ""
echo "Checking required files..."

required_files=(
    "docker compose.yml"
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "backend/server.py"
    "frontend/src/App.js"
)

all_present=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (missing)"
        all_present=false
    fi
done

echo ""
if [ "$all_present" = true ]; then
    echo "✅ Setup complete! All required files are present."
    echo ""
    echo "Next steps:"
    echo "  1. Edit .env file if needed (for real GitLab connection)"
    echo "  2. Run: ./start.sh"
    echo ""
    echo "For mock data testing (no GitLab needed):"
    echo "  ./start.sh"
else
    echo "❌ Some required files are missing."
    echo "Please ensure you're in the correct directory."
    exit 1
fi
