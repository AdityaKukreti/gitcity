# Database Architecture - Build Inspector

## Overview
The application **DOES use MongoDB** for persistent storage. All GitLab data is fetched and stored in MongoDB, and the UI reads from the database - **NOT directly from GitLab**.

## How It Works

### 1. Background Sync Process
- **Scheduler**: Runs every 30 seconds (configurable via `FETCH_INTERVAL_SECONDS`)
- **Process**: Fetches data from GitLab API (or mock service) and stores in MongoDB
- **Collections Updated**: projects, pipelines, artifacts, processed_logs

### 2. API Flow
```
User Opens App → Frontend Calls API → Backend Reads from MongoDB → Returns Data
```

The application **never** queries GitLab directly from the frontend. All data is served from the MongoDB cache.

### 3. MongoDB Collections

#### `projects` Collection
- Stores: Project metadata (id, name, path, description, web_url)
- Count: 3 projects
- Updated: Every sync cycle

#### `pipelines` Collection  
- Stores: Pipeline data with jobs, test results, status
- Count: 15 pipelines (per project)
- Updated: Every sync cycle
- Fields: id, project_id, status, ref (branch), sha, jobs[], test_results{}

#### `artifacts` Collection
- Stores: Artifact metadata for each job
- Count: 90 artifacts
- Fields: job_id, pipeline_id, project_id, filename, size, file_type
- **NEW**: Added in this update for artifact download feature

#### `processed_logs` Collection
- Stores: Parsed logs with error highlighting
- Count: 20 processed logs
- Fields: job_id, pipeline_id, raw_log, error_lines[]
- Purpose: Pre-processes logs to highlight errors for faster UI rendering

## Benefits of This Architecture

### 1. **Performance**
- No waiting for GitLab API on every page load
- Fast response times (data served from local MongoDB)
- Reduced load on GitLab server

### 2. **Reliability**
- Works even if GitLab is temporarily unreachable
- Consistent data availability
- No rate limiting issues

### 3. **Enhanced Features**
- Log processing and error highlighting done in background
- Artifact metadata cached for quick access
- Historical data preserved even if deleted from GitLab

### 4. **Scalability**
- Can handle multiple users viewing same data
- Background sync runs independently
- Database can be indexed for faster queries

## Verification

Check database status:
```bash
mongosh mongodb://localhost:27017/test_database --quiet --eval "
  db.getCollectionNames().forEach(function(collection) {
    print(collection + ': ' + db[collection].countDocuments());
  })
"
```

Current Status:
- ✅ projects: 3 documents
- ✅ pipelines: 15 documents  
- ✅ artifacts: 90 documents
- ✅ processed_logs: 20 documents

## Configuration

Database connection is configured in `/app/backend/.env`:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
```

**DO NOT** change these values - they are pre-configured for the container environment.
