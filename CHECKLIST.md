# Pre-Deployment Checklist

Use this checklist before deploying Build Inspector to production.

## ✅ Prerequisites

- [ ] Docker 20.10+ installed
- [ ] Docker Compose 2.0+ installed
- [ ] Git installed (for updates)
- [ ] Sufficient disk space (minimum 2GB)
- [ ] GitLab access token ready (if not using mock data)

## ✅ Configuration

- [ ] `.env` file created from `.env.example`
- [ ] `GITLAB_URL` set to your GitLab instance
- [ ] `GITLAB_TOKEN` configured with proper scopes (`api`, `read_api`)
- [ ] `USE_MOCK_DATA` set to `false` for production
- [ ] `FETCH_INTERVAL_SECONDS` configured based on needs
- [ ] `REACT_APP_BACKEND_URL` set to public backend URL (for production)

## ✅ Security

- [ ] GitLab token stored securely (not committed to git)
- [ ] `.env` file added to `.gitignore`
- [ ] MongoDB not exposed to public internet
- [ ] SSL/HTTPS configured (if public-facing)
- [ ] Firewall rules configured properly
- [ ] Resource limits set in docker compose.yml

## ✅ Testing

- [ ] Test with mock data first: `./start.sh`
- [ ] Access frontend at http://localhost:3000
- [ ] Verify backend API at http://localhost:8001/docs
- [ ] Check MongoDB connection: `./manage.sh shell-mongodb`
- [ ] Test GitLab connection with real credentials
- [ ] Verify artifact download functionality
- [ ] Check log error highlighting
- [ ] Test pipeline filtering and search

## ✅ Production Readiness

- [ ] Backup strategy in place: `./manage.sh backup`
- [ ] Monitoring configured (optional)
- [ ] Log aggregation set up (optional)
- [ ] Reverse proxy configured (Nginx/Traefik)
- [ ] Domain/DNS configured
- [ ] SSL certificates installed
- [ ] Health check endpoints working
- [ ] Auto-restart policy configured

## ✅ Documentation

- [ ] README.md reviewed
- [ ] DEPLOYMENT.md read
- [ ] DATABASE_INFO.md understood
- [ ] Team trained on usage
- [ ] GitLab token rotation policy established

## ✅ Post-Deployment

- [ ] Verify all services healthy: `./manage.sh health`
- [ ] Check logs for errors: `./manage.sh logs`
- [ ] Monitor first sync cycle
- [ ] Test from different browsers/devices
- [ ] Verify data is being cached in MongoDB
- [ ] Set up automated backups
- [ ] Document deployment details

## 🚀 Deployment Commands

### Quick Start (Mock Data)
```bash
./start.sh
```

### Production (Real GitLab)
```bash
# 1. Configure
cp .env.example .env
nano .env  # Edit configuration

# 2. Validate
./validate-docker-setup.sh

# 3. Deploy
docker compose up -d --build

# 4. Verify
./manage.sh health
./manage.sh logs
```

### Backup Before Update
```bash
./manage.sh backup
```

### Update Application
```bash
git pull origin main
./manage.sh update
```

## 📞 Support

If issues arise:
1. Check logs: `./manage.sh logs`
2. Verify configuration: `cat .env`
3. Test connectivity: `./manage.sh health`
4. Review DEPLOYMENT.md troubleshooting section
5. Check MongoDB data: `./manage.sh shell-mongodb`

## 🔄 Rollback Plan

If deployment fails:
```bash
# Stop services
./manage.sh stop

# Restore from backup
./manage.sh restore backup-YYYYMMDD-HHMMSS.archive

# Start services
./manage.sh start
```

## 📊 Success Criteria

Deployment is successful when:
- ✅ All services show "healthy" status
- ✅ Frontend loads without errors
- ✅ Backend API responds
- ✅ Data syncing from GitLab
- ✅ MongoDB storing data
- ✅ Artifacts downloadable
- ✅ Log highlighting working
- ✅ No errors in logs

---

**Last Updated:** January 2026  
**Version:** 1.0.0