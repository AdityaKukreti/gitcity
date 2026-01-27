#!/bin/bash

# GitCity Cleaner Script
# Stops containers, prunes Docker system, and optionally clears MongoDB

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse command line arguments
CLEAR_DB=false
if [[ "$1" == "--db" ]]; then
    CLEAR_DB=true
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║     GitCity Cleanup Script             ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Step 1: Stop all containers
print_info "Stopping all Docker containers..."
if docker compose down 2>/dev/null; then
    print_success "Containers stopped successfully"
else
    print_warning "No containers were running or docker compose.yml not found"
fi

# Step 2: Prune Docker system
print_info "Pruning Docker system (removing unused containers, networks, images)..."
echo ""
print_warning "This will remove:"
echo "  - All stopped containers"
echo "  - All networks not used by at least one container"
echo "  - All dangling images"
echo "  - All build cache"
echo ""

read -p "Continue with Docker prune? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker system prune -af --volumes
    print_success "Docker system pruned successfully"
else
    print_info "Skipping Docker prune"
fi

# Step 3: Clear MongoDB (if --db flag is passed)
if [ "$CLEAR_DB" = true ]; then
    print_info "Clearing MongoDB database..."
    echo ""
    print_warning "This will DELETE ALL DATA from MongoDB!"
    echo "  - All pipelines"
    echo "  - All projects"
    echo "  - All logs"
    echo "  - All cached artifacts"
    echo "  - All settings"
    echo ""
    
    read -p "Are you SURE you want to clear the database? (yes/N): " -r
    echo ""
    if [[ $REPLY == "yes" ]]; then
        # Start only MongoDB to clear it
        print_info "Starting MongoDB container..."
        docker compose up -d mongo
        
        # Wait for MongoDB to be ready
        print_info "Waiting for MongoDB to be ready..."
        sleep 5
        
        # Get MongoDB connection details from .env or use defaults
        MONGO_DB_NAME=${MONGO_DB_NAME:-"gitlab_monitor"}
        
        # Clear the database
        print_info "Dropping database: $MONGO_DB_NAME"
        docker compose exec -T mongo mongosh --quiet --eval "
            use $MONGO_DB_NAME;
            db.dropDatabase();
            print('Database dropped successfully');
        "
        
        print_success "Database cleared successfully"
        
        # Stop MongoDB
        print_info "Stopping MongoDB container..."
        docker compose down
        print_success "MongoDB stopped"
    else
        print_info "Database clearing cancelled"
    fi
else
    print_info "Skipping database clearing (use --db flag to clear database)"
fi

# Summary
echo ""
echo "╔════════════════════════════════════════╗"
echo "║          Cleanup Complete              ║"
echo "╚════════════════════════════════════════╝"
echo ""
print_success "Cleanup completed successfully!"
echo ""
print_info "To start the application again, run:"
echo "  ./start.sh"
echo ""
