from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import httpx
import re
import random
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configuration
GITLAB_URL = os.environ.get('GITLAB_URL', 'https://gitlab.example.com')
GITLAB_TOKEN = os.environ.get('GITLAB_TOKEN', '')
USE_MOCK_DATA = os.environ.get('USE_MOCK_DATA', 'true').lower() == 'true'
FETCH_INTERVAL = int(os.environ.get('FETCH_INTERVAL_SECONDS', '30'))

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ Models ============

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int
    name: str
    path: str
    description: Optional[str] = None
    web_url: str
    last_activity_at: str
    avatar_url: Optional[str] = None

class TestResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    total: int = 0

class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int
    name: str
    stage: str
    status: str
    created_at: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration: Optional[float] = None
    web_url: str

class Pipeline(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int
    project_id: int
    project_name: str
    status: str
    ref: str  # branch name
    sha: str
    web_url: str
    created_at: str
    updated_at: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration: Optional[float] = None
    source: str
    jobs: List[Job] = []
    test_results: Optional[TestResult] = None

class ProcessedLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    job_id: int
    pipeline_id: int
    raw_log: str
    error_lines: List[Dict[str, Any]] = []
    processed_at: str

class Artifact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    job_id: int
    pipeline_id: int
    filename: str
    size: int
    file_type: str

class PipelineStats(BaseModel):
    total: int
    success: int
    failed: int
    running: int
    pending: int
    success_rate: float

class PipelineAction(BaseModel):
    action: str  # 'retry' or 'cancel'

# ============ Mock Data Service ============

class MockGitLabService:
    def __init__(self):
        self.mock_projects = [
            {
                "id": 1,
                "name": "backend-api",
                "path": "team/backend-api",
                "description": "Main backend API service",
                "web_url": "https://gitlab.example.com/team/backend-api",
                "last_activity_at": datetime.now(timezone.utc).isoformat(),
                "avatar_url": None
            },
            {
                "id": 2,
                "name": "frontend-app",
                "path": "team/frontend-app",
                "description": "React frontend application",
                "web_url": "https://gitlab.example.com/team/frontend-app",
                "last_activity_at": datetime.now(timezone.utc).isoformat(),
                "avatar_url": None
            },
            {
                "id": 3,
                "name": "ml-pipeline",
                "path": "data/ml-pipeline",
                "description": "Machine learning pipeline",
                "web_url": "https://gitlab.example.com/data/ml-pipeline",
                "last_activity_at": datetime.now(timezone.utc).isoformat(),
                "avatar_url": None
            }
        ]
        
        self.pipeline_counter = 1000

    async def fetch_projects(self):
        return self.mock_projects

    async def fetch_pipelines(self, project_id: int):
        project = next((p for p in self.mock_projects if p["id"] == project_id), None)
        if not project:
            return []
        
        branches = ["main", "develop", "feature/new-ui", "hotfix/bug-123"]
        statuses = ["success", "failed", "running", "pending", "canceled"]
        sources = ["push", "web", "merge_request_event", "schedule"]
        
        pipelines = []
        for i in range(15):
            pipeline_id = self.pipeline_counter + i
            status = random.choice(statuses)
            branch = random.choice(branches)
            source = random.choice(sources)
            
            created_at = datetime.now(timezone.utc).replace(hour=random.randint(0, 23), minute=random.randint(0, 59))
            started_at = created_at if status != "pending" else None
            finished_at = created_at if status in ["success", "failed", "canceled"] else None
            duration = random.randint(60, 600) if finished_at else None
            
            # Create jobs
            stages = ["build", "test", "deploy"]
            jobs = []
            for stage_idx, stage in enumerate(stages):
                job_status = status if stage_idx == len(stages) - 1 else "success"
                jobs.append({
                    "id": pipeline_id * 100 + stage_idx,
                    "name": f"{stage}-job",
                    "stage": stage,
                    "status": job_status,
                    "created_at": created_at.isoformat(),
                    "started_at": started_at.isoformat() if started_at else None,
                    "finished_at": finished_at.isoformat() if finished_at else None,
                    "duration": duration / len(stages) if duration else None,
                    "web_url": f"{project['web_url']}/-/jobs/{pipeline_id * 100 + stage_idx}"
                })
            
            # Test results
            test_results = {
                "passed": random.randint(50, 200),
                "failed": random.randint(0, 10) if status == "failed" else 0,
                "skipped": random.randint(0, 5),
                "total": 0
            }
            test_results["total"] = test_results["passed"] + test_results["failed"] + test_results["skipped"]
            
            pipelines.append({
                "id": pipeline_id,
                "project_id": project_id,
                "project_name": project["name"],
                "status": status,
                "ref": branch,
                "sha": f"{''.join(random.choices('abcdef0123456789', k=8))}",
                "web_url": f"{project['web_url']}/-/pipelines/{pipeline_id}",
                "created_at": created_at.isoformat(),
                "updated_at": created_at.isoformat(),
                "started_at": started_at.isoformat() if started_at else None,
                "finished_at": finished_at.isoformat() if finished_at else None,
                "duration": duration,
                "source": source,
                "jobs": jobs,
                "test_results": test_results
            })
        
        return pipelines

    async def fetch_job_logs(self, job_id: int):
        # Generate mock logs with some errors
        logs = [
            "[2025-01-15 10:30:00] Starting job...",
            "[2025-01-15 10:30:05] Installing dependencies...",
            "[2025-01-15 10:31:00] Running tests...",
            "[2025-01-15 10:32:00] Test suite completed",
            f"[2025-01-15 10:32:30] ERROR: Failed to connect to database at localhost:5432",
            "[2025-01-15 10:32:31] Traceback (most recent call last):",
            "[2025-01-15 10:32:31]   File 'test_db.py', line 42, in <module>",
            "[2025-01-15 10:32:31]     connection = psycopg2.connect(**db_params)",
            "[2025-01-15 10:32:31] psycopg2.OperationalError: could not connect to server",
            "[2025-01-15 10:32:35] WARN: Retrying connection...",
            "[2025-01-15 10:33:00] Job completed with status: failed"
        ]
        return "\n".join(logs)

mock_service = MockGitLabService()

# ============ GitLab Service ============

class GitLabService:
    def __init__(self):
        self.base_url = GITLAB_URL.rstrip('/')
        self.token = GITLAB_TOKEN
        self.headers = {"PRIVATE-TOKEN": self.token}

    async def fetch_projects(self):
        if USE_MOCK_DATA:
            return await mock_service.fetch_projects()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v4/projects",
                headers=self.headers,
                params={"membership": True, "per_page": 100}
            )
            response.raise_for_status()
            return response.json()

    async def fetch_pipelines(self, project_id: int):
        if USE_MOCK_DATA:
            return await mock_service.fetch_pipelines(project_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v4/projects/{project_id}/pipelines",
                headers=self.headers,
                params={"per_page": 50}
            )
            response.raise_for_status()
            pipelines = response.json()
            
            # Fetch detailed info for each pipeline
            detailed_pipelines = []
            for pipeline in pipelines:
                detail_response = await client.get(
                    f"{self.base_url}/api/v4/projects/{project_id}/pipelines/{pipeline['id']}",
                    headers=self.headers
                )
                detail_response.raise_for_status()
                pipeline_detail = detail_response.json()
                
                # Fetch jobs
                jobs_response = await client.get(
                    f"{self.base_url}/api/v4/projects/{project_id}/pipelines/{pipeline['id']}/jobs",
                    headers=self.headers
                )
                jobs_response.raise_for_status()
                pipeline_detail['jobs'] = jobs_response.json()
                
                detailed_pipelines.append(pipeline_detail)
            
            return detailed_pipelines

    async def fetch_job_logs(self, project_id: int, job_id: int):
        if USE_MOCK_DATA:
            return await mock_service.fetch_job_logs(job_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v4/projects/{project_id}/jobs/{job_id}/trace",
                headers=self.headers
            )
            response.raise_for_status()
            return response.text

gitlab_service = GitLabService()

# ============ Background Scheduler ============

async def sync_gitlab_data():
    """Background task to sync GitLab data"""
    try:
        logger.info("Starting GitLab data sync...")
        
        # Fetch all projects
        projects = await gitlab_service.fetch_projects()
        
        # Store projects
        for project in projects:
            await db.projects.update_one(
                {"id": project["id"]},
                {"$set": project},
                upsert=True
            )
        
        logger.info(f"Synced {len(projects)} projects")
        
        # Fetch pipelines for each project
        total_pipelines = 0
        for project in projects:
            pipelines = await gitlab_service.fetch_pipelines(project["id"])
            
            for pipeline in pipelines:
                # Process logs for failed jobs
                for job in pipeline.get('jobs', []):
                    if job['status'] == 'failed':
                        try:
                            logs = await gitlab_service.fetch_job_logs(project["id"], job['id'])
                            processed_log = process_logs(logs, job['id'], pipeline['id'])
                            await db.processed_logs.update_one(
                                {"job_id": job['id']},
                                {"$set": processed_log},
                                upsert=True
                            )
                        except Exception as e:
                            logger.error(f"Error processing logs for job {job['id']}: {e}")
                
                # Store pipeline
                await db.pipelines.update_one(
                    {"id": pipeline["id"]},
                    {"$set": pipeline},
                    upsert=True
                )
                total_pipelines += 1
        
        logger.info(f"Synced {total_pipelines} pipelines")
        
    except Exception as e:
        logger.error(f"Error syncing GitLab data: {e}")

def process_logs(log_text: str, job_id: int, pipeline_id: int) -> dict:
    """Process logs to highlight errors"""
    lines = log_text.split('\n')
    error_lines = []
    
    error_patterns = [
        r'ERROR',
        r'FAILED',
        r'Exception',
        r'Traceback',
        r'FATAL',
        r'\[ERR\]',
        r'error:',
        r'failed'
    ]
    
    for idx, line in enumerate(lines):
        for pattern in error_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                error_lines.append({
                    "line_number": idx + 1,
                    "content": line,
                    "type": "error" if "ERROR" in line.upper() or "FAILED" in line.upper() else "warning"
                })
                break
    
    return {
        "job_id": job_id,
        "pipeline_id": pipeline_id,
        "raw_log": log_text,
        "error_lines": error_lines,
        "processed_at": datetime.now(timezone.utc).isoformat()
    }

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    # Initial sync
    await sync_gitlab_data()
    
    # Schedule periodic sync
    scheduler.add_job(sync_gitlab_data, 'interval', seconds=FETCH_INTERVAL)
    scheduler.start()
    logger.info(f"Scheduler started with {FETCH_INTERVAL}s interval")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    client.close()

# ============ API Endpoints ============

@api_router.get("/")
async def root():
    return {"message": "GitLab Pipeline Monitor API"}

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    return projects

@api_router.get("/pipelines", response_model=List[Pipeline])
async def get_pipelines(
    project_id: Optional[int] = Query(None),
    branch: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if branch:
        query["ref"] = branch
    if status:
        query["status"] = status
    
    pipelines = await db.pipelines.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return pipelines

@api_router.get("/pipelines/{pipeline_id}", response_model=Pipeline)
async def get_pipeline(pipeline_id: int):
    pipeline = await db.pipelines.find_one({"id": pipeline_id}, {"_id": 0})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline

@api_router.get("/pipelines/{pipeline_id}/logs")
async def get_pipeline_logs(pipeline_id: int, job_id: Optional[int] = Query(None)):
    if job_id:
        log = await db.processed_logs.find_one({"job_id": job_id}, {"_id": 0})
        if not log:
            # Fetch fresh logs
            pipeline = await db.pipelines.find_one({"id": pipeline_id}, {"_id": 0})
            if pipeline:
                for job in pipeline.get('jobs', []):
                    if job['id'] == job_id:
                        logs = await gitlab_service.fetch_job_logs(pipeline['project_id'], job_id)
                        log = process_logs(logs, job_id, pipeline_id)
                        await db.processed_logs.insert_one(log)
                        log.pop('_id', None)
                        return log
            raise HTTPException(status_code=404, detail="Logs not found")
        return log
    
    # Return all logs for pipeline
    logs = await db.processed_logs.find({"pipeline_id": pipeline_id}, {"_id": 0}).to_list(100)
    return logs

@api_router.get("/stats", response_model=PipelineStats)
async def get_stats():
    total = await db.pipelines.count_documents({})
    success = await db.pipelines.count_documents({"status": "success"})
    failed = await db.pipelines.count_documents({"status": "failed"})
    running = await db.pipelines.count_documents({"status": "running"})
    pending = await db.pipelines.count_documents({"status": "pending"})
    
    success_rate = (success / total * 100) if total > 0 else 0
    
    return {
        "total": total,
        "success": success,
        "failed": failed,
        "running": running,
        "pending": pending,
        "success_rate": round(success_rate, 2)
    }

@api_router.get("/branches")
async def get_branches():
    branches = await db.pipelines.distinct("ref")
    return {"branches": branches}

@api_router.post("/pipelines/{pipeline_id}/action")
async def pipeline_action(pipeline_id: int, action: PipelineAction):
    # For mock data, just update the status
    if USE_MOCK_DATA:
        if action.action == "retry":
            await db.pipelines.update_one(
                {"id": pipeline_id},
                {"$set": {"status": "pending"}}
            )
            return {"message": "Pipeline retry initiated (mock)"}
        elif action.action == "cancel":
            await db.pipelines.update_one(
                {"id": pipeline_id},
                {"$set": {"status": "canceled"}}
            )
            return {"message": "Pipeline canceled (mock)"}
    
    return {"message": f"Action '{action.action}' not supported in current mode"}

@api_router.post("/sync")
async def trigger_sync():
    """Manually trigger data sync"""
    await sync_gitlab_data()
    return {"message": "Sync completed"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)