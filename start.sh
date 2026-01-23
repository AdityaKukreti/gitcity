#!/bin/bash
set -e

echo "======================================"
echo "  Build Inspector - Docker Deployment"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo ""
    echo "Install Docker:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo ""
    echo "Install Docker Compose:"
    echo "  sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "  sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your GitLab credentials!"
    echo ""
    echo "For testing with mock data (no GitLab needed):"
    echo "  USE_MOCK_DATA=true (already set)"
    echo ""
    echo "For production with real GitLab:"
    echo "  1. Set GITLAB_URL=https://gitlab.yourcompany.com"
    echo "  2. Set GITLAB_TOKEN=your_token_here"
    echo "  3. Set USE_MOCK_DATA=false"
    echo "  4. Set REACT_APP_BACKEND_URL to your public backend URL"
    echo ""
    read -p "Press Enter to continue with mock data, or Ctrl+C to edit .env first..."
fi

echo ""
echo "🚀 Starting Build Inspector..."
echo ""

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start services
echo ""
echo "Building and starting services..."
docker-compose up -d --build

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "Service Status:"
docker-compose ps

echo ""
echo "======================================"
echo "  ✅ Build Inspector is Running!"
echo "======================================"
echo ""
echo "Access the application:"
echo "  🌐 Frontend:  http://localhost:3000"
echo "  🔧 Backend:   http://localhost:8001"
echo "  📚 API Docs:  http://localhost:8001/docs"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  Stop services:    docker-compose down"
echo "  Restart:          docker-compose restart"
echo "  View status:      docker-compose ps"
echo ""
echo "For deployment guide, see: DEPLOYMENT.md"
echo ""