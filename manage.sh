#!/bin/bash

# Build Inspector - Docker Management Script

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

show_help() {
    cat << EOF
Build Inspector - Docker Management

Usage: ./manage.sh [command]

Commands:
  start         Start all services
  stop          Stop all services
  restart       Restart all services
  status        Show service status
  logs          View logs (all services)
  logs-backend  View backend logs only
  logs-frontend View frontend logs only
  logs-mongodb  View MongoDB logs only
  build         Rebuild all containers
  clean         Stop and remove all containers, volumes
  shell-backend Shell into backend container
  shell-mongodb MongoDB shell
  backup        Backup MongoDB database
  restore       Restore MongoDB database
  update        Pull latest code and rebuild
  health        Check service health
  help          Show this help message

Examples:
  ./manage.sh start
  ./manage.sh logs-backend
  ./manage.sh backup

EOF
}

case "$1" in
    start)
        echo "Starting Build Inspector..."
        docker compose up -d
        echo ""
        echo "✓ Services started!"
        echo "  Frontend: http://localhost:3000"
        echo "  Backend:  http://localhost:8001"
        ;;
    
    stop)
        echo "Stopping Build Inspector..."
        docker compose down
        echo "✓ Services stopped"
        ;;
    
    restart)
        echo "Restarting Build Inspector..."
        docker compose restart
        echo "✓ Services restarted"
        ;;
    
    status)
        docker compose ps
        ;;
    
    logs)
        docker compose logs -f
        ;;
    
    logs-backend)
        docker compose logs -f backend
        ;;
    
    logs-frontend)
        docker compose logs -f frontend
        ;;
    
    logs-mongodb)
        docker compose logs -f mongodb
        ;;
    
    build)
        echo "Rebuilding containers..."
        docker compose down
        docker compose up -d --build
        echo "✓ Rebuild complete"
        ;;
    
    clean)
        echo "⚠️  This will remove all containers and data!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            docker compose down -v --remove-orphans
            echo "✓ Cleanup complete"
        else
            echo "Cancelled"
        fi
        ;;
    
    shell-backend)
        docker compose exec backend bash
        ;;
    
    shell-mongodb)
        docker compose exec mongodb mongosh build_inspector
        ;;
    
    backup)
        BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).archive"
        echo "Creating backup: $BACKUP_FILE"
        docker compose exec -T mongodb mongodump \
            --db build_inspector \
            --archive > "$BACKUP_FILE"
        echo "✓ Backup saved to $BACKUP_FILE"
        ;;
    
    restore)
        if [ -z "$2" ]; then
            echo "Usage: ./manage.sh restore <backup-file>"
            exit 1
        fi
        echo "Restoring from: $2"
        docker compose exec -T mongodb mongorestore \
            --archive < "$2"
        echo "✓ Restore complete"
        ;;
    
    update)
        echo "Updating Build Inspector..."
        git pull origin main
        docker compose down
        docker compose up -d --build
        echo "✓ Update complete"
        ;;
    
    health)
        echo "Checking service health..."
        echo ""
        
        # Backend
        if curl -s http://localhost:8001/api/ > /dev/null 2>&1; then
            echo "✓ Backend: Healthy"
        else
            echo "✗ Backend: Unhealthy"
        fi
        
        # Frontend
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo "✓ Frontend: Healthy"
        else
            echo "✗ Frontend: Unhealthy"
        fi
        
        # MongoDB
        if docker compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
            echo "✓ MongoDB: Healthy"
        else
            echo "✗ MongoDB: Unhealthy"
        fi
        ;;
    
    help|--help|-h)
        show_help
        ;;
    
    *)
        echo "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
