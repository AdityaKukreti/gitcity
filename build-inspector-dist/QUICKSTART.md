# Quick Start Guide

## For Local Testing/Development

1. **First time setup:**
```bash
cd /path/to/build-inspector
./setup.sh
```

2. **Start the application:**
```bash
./start.sh
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8001
- API Docs: http://localhost:8001/docs

## Common Commands

```bash
# Setup (run once)
./setup.sh

# Start services
./start.sh

# Stop services
./manage.sh stop

# View logs
./manage.sh logs

# Check health
./manage.sh health

# Restart
./manage.sh restart
```

## Troubleshooting

### Issue: "cannot stat '.env.example'"
**Solution:** Run `./setup.sh` first to create required files

### Issue: "Docker is not installed"
**Solution:** Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Issue: Port already in use
**Solution:** Stop conflicting services:
```bash
# Check what's using the port
sudo lsof -i :3000  # Frontend
sudo lsof -i :8001  # Backend

# Stop the conflicting service or change ports in docker-compose.yml
```

### Issue: Permission denied
**Solution:** Add your user to docker group:
```bash
sudo usermod -aG docker $USER
# Log out and log back in
```

## Configuration

### Using Mock Data (Default)
Edit `.env`:
```env
USE_MOCK_DATA=true
```
No GitLab credentials needed!

### Using Real GitLab
1. Get GitLab token from: GitLab → User Settings → Access Tokens
   - Scopes needed: `api`, `read_api`

2. Edit `.env`:
```env
GITLAB_URL=https://gitlab.yourcompany.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
USE_MOCK_DATA=false
```

3. Restart:
```bash
./manage.sh restart
```

## File Structure

```
build-inspector/
├── setup.sh              # Setup script (run first)
├── start.sh              # Start application
├── manage.sh             # Management commands
├── docker-compose.yml    # Docker configuration
├── .env                  # Your configuration
├── .env.example          # Configuration template
├── backend/
│   ├── Dockerfile
│   └── server.py
└── frontend/
    ├── Dockerfile
    └── src/
```

## Health Checks

All services have health checks:
```bash
# Check all services
./manage.sh health

# Check individual service status
docker-compose ps

# View service logs
./manage.sh logs-backend
./manage.sh logs-frontend
./manage.sh logs-mongodb
```

## Data Management

```bash
# Backup database
./manage.sh backup

# Restore from backup
./manage.sh restore backup-20260123-152000.archive

# Access MongoDB shell
./manage.sh shell-mongodb
```

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
./manage.sh build
```

## Stopping

```bash
# Stop services (keeps data)
./manage.sh stop

# Stop and remove everything (including data)
./manage.sh clean
```

## Need Help?

1. Check logs: `./manage.sh logs`
2. Review DEPLOYMENT.md for detailed guides
3. See CHECKLIST.md for deployment validation
4. Check DATABASE_INFO.md for architecture details
