# Build Inspector 🔍

A modern GitLab CI/CD pipeline monitoring dashboard with TeamCity-inspired UI. Monitor pipelines, view test results, download artifacts, and analyze logs with error highlighting - all from a beautiful dark-themed interface.

![Build Inspector Dashboard](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue?style=for-the-badge&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## ✨ Features

### 📊 Dashboard & Monitoring
- **Real-time Statistics**: Total pipelines, success rate, failed/running counts
- **Project Overview**: Monitor multiple GitLab projects in one place
- **Recent Activity**: Latest pipeline runs with status indicators
- **Background Sync**: Auto-fetches data every 30 seconds (configurable)

### 🔍 Pipeline Management
- **Advanced Filtering**: Filter by project, branch, status, or search by keyword
- **Date Grouping**: Pipelines organized by date for easy navigation
- **Status Visualization**: Color-coded status badges (success, failed, running, pending)
- **Pipeline Actions**: Retry or cancel pipelines directly from UI

### 🎯 Detailed Pipeline View
- **Stage Flow Visualization**: See job progression through build → test → deploy stages
- **Test Results**: Passed, failed, and skipped test counts
- **Job Details**: Duration, status, timestamps for each job
- **Artifacts Management**: View and download build artifacts

### 📝 Log Analysis
- **Error Highlighting**: Automatic detection and highlighting of errors in logs
- **Terminal-Style Viewer**: JetBrains Mono font for optimal readability
- **Line Numbers**: Easy reference for debugging
- **Error Summary**: Quick overview of detected issues

### 💾 Database-Powered
- **MongoDB Caching**: All data stored locally for fast access
- **No GitLab Wait**: Instant page loads, no API delays
- **Offline Capability**: Works even if GitLab is temporarily down
- **Historical Data**: Preserved even if deleted from GitLab

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd build-inspector

# Start with mock data (no GitLab needed)
./start.sh

# Access the application
open http://localhost:3000
```

That's it! The app will run with mock data so you can explore all features immediately.

### Option 2: Connect to Real GitLab

1. **Get GitLab Token:**
   - Go to GitLab → User Settings → Access Tokens
   - Create token with `api` and `read_api` scopes
   - Copy the token

2. **Configure Environment:**
```bash
cp .env.example .env
```

Edit `.env`:
```env
GITLAB_URL=https://gitlab.yourcompany.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
USE_MOCK_DATA=false
FETCH_INTERVAL_SECONDS=30
```

3. **Start Application:**
```bash
docker-compose down
docker-compose up -d --build
```

## 📦 What's Included

```
build-inspector/
├── backend/              # FastAPI backend
│   ├── server.py        # Main API server
│   ├── Dockerfile       # Backend container
│   └── requirements.txt # Python dependencies
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/       # Dashboard, Pipelines, Settings
│   │   └── components/  # Reusable UI components
│   ├── Dockerfile       # Frontend container
│   └── nginx.conf       # Production web server config
├── docker-compose.yml   # Multi-container orchestration
├── start.sh            # Easy startup script
├── DEPLOYMENT.md       # Deployment guide
└── DATABASE_INFO.md    # Database architecture
```

## 🎨 Technology Stack

**Frontend:**
- React 19
- TailwindCSS (custom dark theme)
- Shadcn/UI components
- IBM Plex Sans, Inter, JetBrains Mono fonts
- React Router for navigation
- Axios for API calls

**Backend:**
- FastAPI (Python)
- MongoDB for data storage
- APScheduler for background sync
- HTTPX for async GitLab API calls
- Pydantic for data validation

**Infrastructure:**
- Docker & Docker Compose
- Nginx (production frontend)
- MongoDB 7.0

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GITLAB_URL` | GitLab instance URL | `https://gitlab.example.com` | For real data |
| `GITLAB_TOKEN` | GitLab access token | - | For real data |
| `USE_MOCK_DATA` | Use mock data | `true` | No |
| `FETCH_INTERVAL_SECONDS` | Sync interval | `30` | No |
| `REACT_APP_BACKEND_URL` | Backend URL | `http://localhost:8001` | Yes |

## 📖 Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide for various platforms
- [DATABASE_INFO.md](DATABASE_INFO.md) - Database architecture and benefits

## 🌐 Deployment Options

- **Local/VM**: `./start.sh`
- **AWS ECS**: See [DEPLOYMENT.md](DEPLOYMENT.md#option-2-aws-ecs-fargate)
- **Google Cloud Run**: See [DEPLOYMENT.md](DEPLOYMENT.md#option-4-google-cloud-run)
- **Kubernetes**: See [DEPLOYMENT.md](DEPLOYMENT.md#option-3-kubernetes-k8s)
- **DigitalOcean**: See [DEPLOYMENT.md](DEPLOYMENT.md#option-5-digitalocean-app-platform)

## 🔍 Monitoring

```bash
# Backend health
curl http://localhost:8001/api/

# Frontend health
curl http://localhost:3000/health

# Service status
docker-compose ps

# View logs
docker-compose logs -f
```

## 🆘 Troubleshooting

**Frontend can't connect to backend:**
- Check `REACT_APP_BACKEND_URL` in `.env`
- Verify backend is running: `docker-compose ps`

**GitLab authentication failed:**
- Verify token has `api` and `read_api` scopes
- Check GITLAB_URL is correct

See [DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting) for more help.

---

**Made with ❤️ for DevOps teams**