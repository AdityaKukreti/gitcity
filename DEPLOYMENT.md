# Build Inspector - Deployment Guide

## Quick Start with Docker Compose

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### Local Development/Testing

1. **Clone and navigate to the project:**
```bash
cd /path/to/build-inspector
```

2. **Start with mock data (no GitLab needed):**
```bash
docker compose up -d
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

4. **View logs:**
```bash
docker compose logs -f
```

5. **Stop the application:**
```bash
docker compose down
```

### Production Deployment with Real GitLab

1. **Create environment file:**
```bash
cp .env.example .env
```

2. **Edit `.env` file:**
```bash
# Required for real GitLab connection
GITLAB_URL=https://gitlab.yourcompany.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
USE_MOCK_DATA=false
FETCH_INTERVAL_SECONDS=30

# For production, set your public backend URL
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

3. **Rebuild with new configuration:**
```bash
docker compose down
docker compose up -d --build
```

### GitLab Token Setup

1. Go to GitLab → User Settings → Access Tokens
2. Create token with scopes:
   - `api` (full API access)
   - `read_api` (read-only API access)
3. Copy token and add to `.env` file

---

## Cloud Deployment Options

### Option 1: Docker Compose on VM (AWS, GCP, Azure)

**On your VM:**

1. **Install Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

2. **Copy project to VM:**
```bash
scp -r build-inspector/ user@your-vm-ip:/home/user/
```

3. **Configure and start:**
```bash
cd build-inspector
cp .env.example .env
# Edit .env with your GitLab credentials
docker compose up -d
```

4. **Setup reverse proxy (Nginx):**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### Option 2: AWS ECS (Fargate)

1. **Push images to ECR:**
```bash
# Build and tag
docker build -t build-inspector-backend ./backend
docker build -t build-inspector-frontend ./frontend

# Tag for ECR
docker tag build-inspector-backend:latest YOUR_ECR_URI/backend:latest
docker tag build-inspector-frontend:latest YOUR_ECR_URI/frontend:latest

# Push
docker push YOUR_ECR_URI/backend:latest
docker push YOUR_ECR_URI/frontend:latest
```

2. **Create ECS Task Definition** with:
   - MongoDB container (or use MongoDB Atlas)
   - Backend container
   - Frontend container

3. **Configure environment variables** in ECS task definition

### Option 3: Kubernetes (K8s)

1. **Create namespace:**
```bash
kubectl create namespace build-inspector
```

2. **Create secret for GitLab token:**
```bash
kubectl create secret generic gitlab-secret \
  --from-literal=gitlab-token=YOUR_TOKEN \
  -n build-inspector
```

3. **Apply manifests:**
```bash
kubectl apply -f k8s/ -n build-inspector
```

### Option 4: Google Cloud Run

1. **Build and push to GCR:**
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/backend ./backend
gcloud builds submit --tag gcr.io/PROJECT_ID/frontend ./frontend
```

2. **Deploy services:**
```bash
gcloud run deploy backend \
  --image gcr.io/PROJECT_ID/backend \
  --platform managed \
  --set-env-vars GITLAB_URL=...,GITLAB_TOKEN=...

gcloud run deploy frontend \
  --image gcr.io/PROJECT_ID/frontend \
  --platform managed
```

### Option 5: DigitalOcean App Platform

1. Connect your Git repository
2. Auto-detect Dockerfiles
3. Set environment variables in dashboard
4. Deploy

---

## Docker Commands Cheat Sheet

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f [service_name]

# Rebuild after code changes
docker compose up -d --build

# Scale backend (if needed)
docker compose up -d --scale backend=3

# Execute command in container
docker compose exec backend python -c "print('test')"

# Access MongoDB shell
docker compose exec mongodb mongosh build_inspector

# View resource usage
docker stats

# Clean up everything
docker compose down -v --remove-orphans
```

---

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GITLAB_URL` | GitLab instance URL | `https://gitlab.example.com` | Yes* |
| `GITLAB_TOKEN` | GitLab access token | - | Yes* |
| `USE_MOCK_DATA` | Use mock data instead of GitLab | `true` | No |
| `FETCH_INTERVAL_SECONDS` | Data sync interval | `30` | No |
| `REACT_APP_BACKEND_URL` | Backend API URL | `http://localhost:8001` | Yes |
| `MONGO_URL` | MongoDB connection string | `mongodb://mongodb:27017` | No |
| `DB_NAME` | Database name | `build_inspector` | No |

*Required only when `USE_MOCK_DATA=false`

---

## Monitoring & Maintenance

### Health Checks

All services have built-in health checks:

```bash
# Check service health
docker compose ps

# Backend health
curl http://localhost:8001/api/

# Frontend health
curl http://localhost:3000/health

# MongoDB health
docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### Backup MongoDB Data

```bash
# Backup
docker compose exec -T mongodb mongodump \
  --db build_inspector \
  --archive > backup.archive

# Restore
docker compose exec -T mongodb mongorestore \
  --archive < backup.archive
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build
```

---

## Troubleshooting

### Issue: Frontend can't connect to backend

**Solution:** Check `REACT_APP_BACKEND_URL` in `.env`
```bash
# For local Docker deployment
REACT_APP_BACKEND_URL=http://localhost:8001

# For production with reverse proxy
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

### Issue: MongoDB connection failed

**Solution:** Ensure MongoDB is healthy
```bash
docker compose ps mongodb
docker compose logs mongodb
```

### Issue: GitLab authentication failed

**Solution:** Verify token has correct permissions
- Required scopes: `api`, `read_api`
- Check token hasn't expired
- Verify GITLAB_URL is correct

### Issue: High memory usage

**Solution:** Limit container resources
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

---

## Production Best Practices

1. **Use HTTPS:** Setup SSL certificates (Let's Encrypt)
2. **Use secrets management:** AWS Secrets Manager, HashiCorp Vault
3. **Setup monitoring:** Prometheus + Grafana
4. **Configure log aggregation:** ELK Stack, Loki
5. **Enable authentication:** Add OAuth/SAML if needed
6. **Regular backups:** Automate MongoDB backups
7. **Use managed MongoDB:** MongoDB Atlas for production
8. **Setup alerts:** Monitor pipeline failures
9. **Resource limits:** Set CPU/memory limits
10. **Auto-scaling:** Configure based on load

---

## Support

For issues or questions:
1. Check logs: `docker compose logs -f`
2. Verify environment variables
3. Check health endpoints
4. Review `/app/DATABASE_INFO.md` for architecture

---

**License:** MIT  
**Version:** 1.0.0