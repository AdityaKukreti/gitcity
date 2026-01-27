# GitCity Configuration Guide

## Overview

GitCity now supports filtering GitLab repositories by namespace and fetching pipeline data for a specific branch and time period. This guide explains how to configure these settings.

## Environment Variables

Create a `.env` file in the root directory (use `.env.example` as a template):

```bash
cp .env.example .env
```

### Configuration Options

#### 1. **GITLAB_NAMESPACE** (Default: `ncryptify`)
Filters repositories to only those under the specified namespace.

```env
GITLAB_NAMESPACE=ncryptify
```

- Only repositories where `namespace.path` equals this value will be fetched
- Also includes repositories where `namespace.full_path` starts with this value (for nested namespaces)

#### 2. **DEFAULT_BRANCH** (Default: `master`)
Specifies which branch to fetch pipeline data from.

```env
DEFAULT_BRANCH=master
```

- Pipelines will only be fetched for this branch
- Common values: `master`, `main`, `develop`

#### 3. **DAYS_TO_FETCH** (Default: `7`)
Number of days in the past to fetch pipeline data.

```env
DAYS_TO_FETCH=7
```

- Fetches pipelines updated within the last N days
- Helps limit the amount of data fetched on initial sync

#### 4. **GITLAB_URL** (Required for production)
Your GitLab instance URL.

```env
GITLAB_URL=https://gitlab.example.com
```

#### 5. **GITLAB_TOKEN** (Required for production)
Personal access token for GitLab API authentication.

```env
GITLAB_TOKEN=your_gitlab_personal_access_token_here
```

**To create a GitLab personal access token:**
1. Go to GitLab → User Settings → Access Tokens
2. Create a token with `read_api` and `read_repository` scopes
3. Copy the token and add it to your `.env` file

#### 6. **USE_MOCK_DATA** (Default: `true`)
Enable/disable mock data for testing.

```env
USE_MOCK_DATA=false
```

- Set to `false` when connecting to a real GitLab instance
- Set to `true` for testing without GitLab

## Initial Data Sync

When the application starts:

1. **Backend** automatically triggers a data sync on startup
2. **Frontend** displays a loading screen while sync is in progress
3. The loading screen shows:
   - Namespace being fetched
   - Branch being monitored
   - Number of days of data being retrieved
4. Once sync completes, the UI becomes accessible

### Sync Process

The sync process:
1. Fetches all projects from the specified namespace
2. For each project, fetches pipelines from the default branch
3. Only fetches pipelines updated in the past N days
4. Processes job logs for failed jobs
5. Fetches artifact information for completed jobs

## Example Configurations

### Production Setup (Real GitLab)

```env
GITLAB_URL=https://gitlab.company.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
GITLAB_NAMESPACE=ncryptify
DEFAULT_BRANCH=master
DAYS_TO_FETCH=7
USE_MOCK_DATA=false
```

### Development Setup (Mock Data)

```env
GITLAB_URL=https://gitlab.example.com
GITLAB_TOKEN=
GITLAB_NAMESPACE=ncryptify
DEFAULT_BRANCH=master
DAYS_TO_FETCH=7
USE_MOCK_DATA=true
```

### Custom Configuration

```env
GITLAB_URL=https://gitlab.mycompany.com
GITLAB_TOKEN=glpat-your-token-here
GITLAB_NAMESPACE=engineering/backend
DEFAULT_BRANCH=main
DAYS_TO_FETCH=14
USE_MOCK_DATA=false
```

## Running the Application

### Using Docker Compose

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend

# Stop services
docker compose down
```

### Manual Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd frontend
npm install
npm start
```

## Monitoring Sync Status

### API Endpoint

Check sync status via API:

```bash
curl http://localhost:8001/api/sync-status
```

Response:
```json
{
  "sync_complete": true,
  "namespace": "ncryptify",
  "default_branch": "master",
  "days_to_fetch": 7
}
```

### Backend Logs

Monitor the backend logs to see sync progress:

```bash
docker compose logs -f backend
```

You'll see messages like:
```
INFO - Configuration: Namespace='ncryptify', Branch='master', Days=7
INFO - Starting GitLab data sync...
INFO - Fetched 15 projects from GitLab, 5 in 'ncryptify' namespace
INFO - Fetching pipelines for project: backend-api (ID: 123)
INFO - Found 12 pipelines for backend-api on branch 'master'
INFO - Synced 45 pipelines from the past 7 days on branch 'master'
```

## Troubleshooting

### No Projects Found

If you see "No projects found in namespace 'ncryptify'":
- Verify the namespace name is correct
- Check that your GitLab token has access to projects in that namespace
- Ensure `USE_MOCK_DATA=false` when using real GitLab

### Slow Initial Sync

If initial sync is taking too long:
- Reduce `DAYS_TO_FETCH` to fetch less historical data
- Check your GitLab instance performance
- Verify network connectivity

### Loading Screen Stuck

If the loading screen doesn't disappear:
- Check backend logs for errors
- Verify backend is accessible at `http://localhost:8001`
- Check browser console for errors
- The loading screen has a 5-second timeout fallback

## Advanced Configuration

### Changing Namespace After Initial Setup

1. Update `GITLAB_NAMESPACE` in `.env`
2. Restart the backend: `docker compose restart backend`
3. Trigger a manual sync: `curl -X POST http://localhost:8001/api/sync`

### Multiple Branches

Currently, the app fetches data for a single branch. To monitor multiple branches:
- The data is stored per pipeline, so you can manually trigger syncs for different branches
- Future enhancement: Support multiple branches in configuration

## Security Notes

- **Never commit `.env` file** to version control
- Keep your `GITLAB_TOKEN` secure
- Use tokens with minimal required permissions (`read_api`, `read_repository`)
- Rotate tokens regularly
- Consider using environment-specific tokens for dev/staging/production
