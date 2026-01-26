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
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import httpx
import asyncio
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
GITLAB_NAMESPACE = os.environ.get('GITLAB_NAMESPACE', 'ncryptify')
DEFAULT_BRANCH = os.environ.get('DEFAULT_BRANCH', 'master')
DAYS_TO_FETCH = int(os.environ.get('DAYS_TO_FETCH', '7'))
FETCH_INTERVAL = int(os.environ.get('FETCH_INTERVAL_SECONDS', '30'))

# Global flag to track if initial sync is complete
initial_sync_complete = False
background_sync_running = False

app = FastAPI()

# Add CORS middleware FIRST
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration: Optional[float] = None
    web_url: Optional[str] = None
    artifacts_file: Optional[Dict[str, Any]] = None

class Pipeline(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: int
    project_id: int
    project_name: Optional[str] = None
    status: str
    ref: str  # branch name
    sha: Optional[str] = None
    web_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration: Optional[float] = None
    source: Optional[str] = None
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
    
    async def fetch_job_artifacts(self, project_id: int, job_id: int):
        # Generate mock artifacts with download URLs
        artifacts = [
            {
                "filename": f"build-artifacts-{job_id}.zip",
                "size": random.randint(1024, 10240000),
                "download_url": f"https://gitlab.example.com/api/v4/projects/{project_id}/jobs/{job_id}/artifacts"
            },
            {
                "filename": f"test-reports-{job_id}.zip",
                "size": random.randint(512, 5120000),
                "download_url": f"https://gitlab.example.com/api/v4/projects/{project_id}/jobs/{job_id}/artifacts"
            }
        ]
        return artifacts

mock_service = MockGitLabService()

# ============ GitLab Service ============

class GitLabService:
    def __init__(self):
        self.base_url = GITLAB_URL.rstrip('/')
        self.token = GITLAB_TOKEN
        self.headers = {"PRIVATE-TOKEN": self.token}

    async def fetch_projects(self):
        all_projects = []
        page = 1
        per_page = 100
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                response = await client.get(
                    f"{self.base_url}/api/v4/projects",
                    headers=self.headers,
                    params={"membership": True, "per_page": per_page, "page": page, "archived": False}
                )
                response.raise_for_status()
                projects = response.json()
                
                if not projects:
                    break
                
                all_projects.extend(projects)
                
                # Check if there are more pages
                if len(projects) < per_page:
                    break
                
                page += 1
        
        # Filter projects by namespace
        filtered_projects = [
            p for p in all_projects 
            if p.get('namespace', {}).get('path') == GITLAB_NAMESPACE or 
               p.get('namespace', {}).get('full_path', '').startswith(f"{GITLAB_NAMESPACE}/")
        ]
        
        logger.info(f"Fetched {len(all_projects)} projects from GitLab, {len(filtered_projects)} in '{GITLAB_NAMESPACE}' namespace")
        return filtered_projects

    async def fetch_pipelines(self, project_id: int, ref: str = None, updated_after: str = None):
        # Build query parameters
        params = {"per_page": 100}
        if ref:
            params["ref"] = ref
        if updated_after:
            params["updated_after"] = updated_after
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{self.base_url}/api/v4/projects/{project_id}/pipelines",
                headers=self.headers,
                params=params
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
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v4/projects/{project_id}/jobs/{job_id}/trace",
                headers=self.headers
            )
            response.raise_for_status()
            return response.text
    
    async def fetch_job_artifacts(self, project_id: int, job_id: int):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v4/projects/{project_id}/jobs/{job_id}",
                headers=self.headers
            )
            response.raise_for_status()
            job_data = response.json()
            
            artifacts = []
            if job_data.get('artifacts_file'):
                art_file = job_data['artifacts_file']
                artifacts.append({
                    "filename": art_file.get('filename', 'artifacts.zip'),
                    "size": art_file.get('size', 0),
                    "download_url": f"{self.base_url}/api/v4/projects/{project_id}/jobs/{job_id}/artifacts"
                })
            return artifacts
    
    async def fetch_job_junit_report(self, project_id: int, job_id: int):
        """Fetch and parse JUnit test report from job artifacts - recursively searches for junit_report.xml in CI stage"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Download the artifacts archive
                response = await client.get(
                    f"{self.base_url}/api/v4/projects/{project_id}/jobs/{job_id}/artifacts",
                    headers=self.headers,
                    follow_redirects=True
                )
                response.raise_for_status()
                
                logger.info(f"Downloaded artifacts for job {job_id}, size: {len(response.content)} bytes, content-type: {response.headers.get('content-type')}")
                
                # Parse the zip file to find JUnit XML files
                import zipfile
                import xml.etree.ElementTree as ET
                from io import BytesIO
                
                test_results = {
                    "total": 0,
                    "passed": 0,
                    "failed": 0,
                    "skipped": 0,
                    "tests": []
                }
                
                try:
                    zip_data = BytesIO(response.content)
                    with zipfile.ZipFile(zip_data, 'r') as zip_file:
                        file_list = zip_file.namelist()
                        logger.info(f"Files in artifact archive: {file_list}")
                        
                        # First, try to find junit_report.xml specifically (recursively in any directory)
                        junit_file = None
                        for file_path in file_list:
                            if file_path.endswith('junit_report.xml'):
                                junit_file = file_path
                                logger.info(f"Found junit_report.xml at: {file_path}")
                                break
                        
                        # If junit_report.xml not found, look for other JUnit XML files
                        if not junit_file:
                            junit_patterns = ['junit', 'test-result', 'test_result', 'TEST-', 'report']
                            for file_path in file_list:
                                file_lower = file_path.lower()
                                if file_path.endswith('.xml') and any(pattern in file_lower for pattern in junit_patterns):
                                    junit_file = file_path
                                    logger.info(f"Found alternative JUnit file: {file_path}")
                                    break
                        
                        # Process the found JUnit file
                        if junit_file:
                            try:
                                xml_content = zip_file.read(junit_file)
                                root = ET.fromstring(xml_content)
                                
                                # Parse JUnit XML format - handle both testsuite and testsuites root
                                testsuites = root.findall('.//testsuite') if root.tag != 'testsuite' else [root]
                                
                                for testsuite in testsuites:
                                    for testcase in testsuite.findall('testcase'):
                                        test_name = testcase.get('name', 'Unknown')
                                        classname = testcase.get('classname', '')
                                        duration = float(testcase.get('time', 0))
                                        
                                        # Determine test status
                                        failure = testcase.find('failure')
                                        error = testcase.find('error')
                                        skipped = testcase.find('skipped')
                                        
                                        if failure is not None:
                                            status = 'failed'
                                            test_results['failed'] += 1
                                            test_results['tests'].append({
                                                "name": test_name,
                                                "classname": classname,
                                                "status": status,
                                                "duration": duration,
                                                "failure_message": failure.get('message', failure.text or 'No message')
                                            })
                                        elif error is not None:
                                            status = 'failed'
                                            test_results['failed'] += 1
                                            test_results['tests'].append({
                                                "name": test_name,
                                                "classname": classname,
                                                "status": status,
                                                "duration": duration,
                                                "failure_message": error.get('message', error.text or 'No message')
                                            })
                                        elif skipped is not None:
                                            status = 'skipped'
                                            test_results['skipped'] += 1
                                            test_results['tests'].append({
                                                "name": test_name,
                                                "classname": classname,
                                                "status": status,
                                                "duration": duration,
                                                "skip_message": skipped.get('message', skipped.text or 'No message')
                                            })
                                        else:
                                            status = 'passed'
                                            test_results['passed'] += 1
                                            test_results['tests'].append({
                                                "name": test_name,
                                                "classname": classname,
                                                "status": status,
                                                "duration": duration
                                            })
                                        
                                        test_results['total'] += 1
                                
                                logger.info(f"Parsed {test_results['total']} tests from {junit_file}")
                            except ET.ParseError as e:
                                logger.warning(f"XML parse error in {junit_file}: {e}")
                            except Exception as e:
                                logger.warning(f"Error parsing JUnit XML file {junit_file}: {e}")
                        else:
                            logger.warning(f"No JUnit test results found in artifacts for job {job_id}")
                        
                        if False:  # Dummy condition to skip old loop
                            for file_info in file_list:
                                file_lower = file_info.lower()
                                if file_info.endswith('.xml') and False:
                                    logger.info(f"Found potential JUnit file: {file_info}")
                
                except zipfile.BadZipFile:
                    logger.error(f"Artifacts for job {job_id} is not a valid ZIP file")
                    return None
                
                return test_results if test_results['total'] > 0 else None
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching artifacts for job {job_id}: {e.response.status_code}")
            return None
        except Exception as e:
            logger.error(f"Error fetching JUnit report for job {job_id}: {e}")
            return None
    
    async def fetch_gitlab_ci_config(self, project_id: int, ref: str = None):
        """Fetch .gitlab-ci.yml file from a project to get stage order"""
        try:
            params = {"ref": ref or DEFAULT_BRANCH}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v4/projects/{project_id}/repository/files/.gitlab-ci.yml/raw",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                
                # Parse YAML to extract stages
                import yaml
                config = yaml.safe_load(response.text)
                
                # Get stages from the config
                if config and 'stages' in config:
                    return config['stages']
                
                return None
        except Exception as e:
            logger.warning(f"Could not fetch .gitlab-ci.yml for project {project_id}: {e}")
            return None

gitlab_service = GitLabService()

# ============ Background Scheduler ============

async def sync_gitlab_data():
    """Background task to sync GitLab data"""
    global initial_sync_complete
    
    try:
        logger.info("Starting GitLab data sync...")
        
        # Fetch all projects from the configured namespace
        projects = await gitlab_service.fetch_projects()
        
        if not projects:
            logger.warning(f"No projects found in namespace '{GITLAB_NAMESPACE}'")
            initial_sync_complete = True
            return
        
        # Get enabled projects from settings
        enabled_projects_doc = await db.settings.find_one({"key": "enabled_projects"})
        enabled_projects = enabled_projects_doc.get("value", []) if enabled_projects_doc else []
        
        # Store all projects (for settings page)
        for project in projects:
            await db.projects.update_one(
                {"id": project["id"]},
                {"$set": project},
                upsert=True
            )
        
        logger.info(f"Synced {len(projects)} projects from '{GITLAB_NAMESPACE}' namespace")
        
        # Calculate date threshold for fetching pipelines based on DAYS_TO_FETCH
        date_threshold = (datetime.now(timezone.utc) - timedelta(days=DAYS_TO_FETCH)).isoformat()
        
        # Filter projects based on settings (if any enabled projects are set)
        projects_to_fetch = projects
        if enabled_projects:
            projects_to_fetch = [p for p in projects if p["id"] in enabled_projects]
            logger.info(f"Fetching data for {len(projects_to_fetch)} enabled projects")
        
        # Fetch pipelines for each project
        total_pipelines = 0
        for project in projects_to_fetch:
            logger.info(f"Fetching pipelines for project: {project.get('name')} (ID: {project['id']})")
            
            # Fetch pipelines for the default branch from the last 24 hours
            pipelines = await gitlab_service.fetch_pipelines(
                project["id"], 
                ref=DEFAULT_BRANCH,
                updated_after=date_threshold
            )
            
            logger.info(f"Found {len(pipelines)} pipelines for {project.get('name')} on branch '{DEFAULT_BRANCH}' (past {DAYS_TO_FETCH} days)")
            
            for pipeline in pipelines:
                # Ensure project_name is set
                pipeline['project_name'] = project.get('name', project.get('path', 'Unknown'))
                pipeline['project_id'] = project['id']
                
                # Process logs for failed jobs and fetch artifacts for completed jobs
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
                    
                    # Fetch artifacts URLs only (don't download/store)
                    if job['status'] in ['success', 'failed']:
                        try:
                            artifacts = await gitlab_service.fetch_job_artifacts(project["id"], job['id'])
                            job['artifacts'] = artifacts  # Store in job data
                        except Exception as e:
                            logger.error(f"Error fetching artifacts for job {job['id']}: {e}")
                
                # Store pipeline
                await db.pipelines.update_one(
                    {"id": pipeline["id"]},
                    {"$set": pipeline},
                    upsert=True
                )
                total_pipelines += 1
        
        logger.info(f"Synced {total_pipelines} pipelines from the past {DAYS_TO_FETCH} days on branch '{DEFAULT_BRANCH}'")
        initial_sync_complete = True
        
    except Exception as e:
        logger.error(f"Error syncing GitLab data: {e}")
        initial_sync_complete = True  # Set to true even on error to prevent blocking

async def continuous_sync():
    """Continuously sync data in the background"""
    global background_sync_running
    background_sync_running = True
    
    while background_sync_running:
        try:
            await asyncio.sleep(FETCH_INTERVAL)
            logger.info("Running scheduled data sync...")
            await sync_gitlab_data()
        except Exception as e:
            logger.error(f"Error in continuous sync: {e}")
            await asyncio.sleep(FETCH_INTERVAL)

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
    logger.info("Backend startup initiated")
    logger.info(f"Configuration: Namespace='{GITLAB_NAMESPACE}', Branch='{DEFAULT_BRANCH}', Fetch Interval={FETCH_INTERVAL}s")
    
    # Trigger initial sync on startup
    import asyncio
    asyncio.create_task(sync_gitlab_data())
    
    # Start continuous background sync
    asyncio.create_task(continuous_sync())
    
    logger.info("Initial data sync and continuous background sync started")

@app.on_event("shutdown")
async def shutdown_event():
    global background_sync_running
    background_sync_running = False
    scheduler.shutdown()
    client.close()

# ============ API Endpoints ============

@api_router.get("/")
async def root():
    return {"message": "GitLab Pipeline Monitor API"}

@api_router.get("/sync-status")
async def get_sync_status():
    """Check if initial sync is complete"""
    return {
        "sync_complete": initial_sync_complete,
        "namespace": GITLAB_NAMESPACE,
        "default_branch": DEFAULT_BRANCH,
        "days_to_fetch": DAYS_TO_FETCH
    }

@api_router.get("/projects", response_model=List[Project])
async def get_projects(enabled_only: bool = Query(False)):
    if enabled_only:
        # Get enabled projects from settings
        enabled_projects_doc = await db.settings.find_one({"key": "enabled_projects"})
        enabled_projects = enabled_projects_doc.get("value", []) if enabled_projects_doc else []
        
        if enabled_projects:
            projects = await db.projects.find(
                {"id": {"$in": enabled_projects}}, 
                {"_id": 0}
            ).to_list(1000)
        else:
            projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    else:
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
    
    # Apply enabled projects filter if no specific project is requested
    if not project_id:
        enabled_projects_doc = await db.settings.find_one({"key": "enabled_projects"})
        enabled_projects = enabled_projects_doc.get("value", []) if enabled_projects_doc else []
        
        if enabled_projects:
            query["project_id"] = {"$in": enabled_projects}
    else:
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
async def get_stats(status: Optional[str] = Query(None)):
    # Get enabled projects filter
    enabled_projects_doc = await db.settings.find_one({"key": "enabled_projects"})
    enabled_projects = enabled_projects_doc.get("value", []) if enabled_projects_doc else []
    
    # Build base query
    base_query = {}
    if enabled_projects:
        base_query["project_id"] = {"$in": enabled_projects}
    
    total = await db.pipelines.count_documents(base_query)
    success = await db.pipelines.count_documents({**base_query, "status": "success"})
    failed = await db.pipelines.count_documents({**base_query, "status": "failed"})
    running = await db.pipelines.count_documents({**base_query, "status": "running"})
    pending = await db.pipelines.count_documents({**base_query, "status": "pending"})
    
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
    return {"message": f"Action '{action.action}' not supported in current mode"}

@api_router.get("/pipelines/{pipeline_id}/artifacts")
async def get_pipeline_artifacts(pipeline_id: int):
    """Get all artifacts for a pipeline"""
    pipeline = await db.pipelines.find_one({"id": pipeline_id}, {"_id": 0})
    if not pipeline:
        return {"artifacts": []}
    
    artifacts = []
    for job in pipeline.get('jobs', []):
        # Check if job has artifacts_file (the actual artifact metadata from GitLab)
        if job.get('artifacts_file'):
            artifacts.append({
                "filename": job['artifacts_file'].get('filename', 'artifacts.zip'),
                "size": job['artifacts_file'].get('size', 0),
                "file_type": job.get('artifacts_file', {}).get('file_type', 'archive'),
                "job_id": job['id'],
                "job_name": job['name'],
                "pipeline_id": pipeline_id
            })
    
    return {"artifacts": artifacts}

@api_router.get("/jobs/{job_id}/artifacts")
async def get_job_artifacts(job_id: int):
    """Get artifacts for a specific job"""
    pipeline = await db.pipelines.find_one({"jobs.id": job_id}, {"_id": 0})
    if not pipeline:
        return {"artifacts": []}
    
    for job in pipeline.get('jobs', []):
        if job['id'] == job_id and job.get('artifacts_file'):
            return {
                "artifacts": [{
                    "filename": job['artifacts_file'].get('filename', 'artifacts.zip'),
                    "size": job['artifacts_file'].get('size', 0),
                    "file_type": job.get('artifacts_file', {}).get('file_type', 'archive'),
                    "job_id": job['id'],
                    "job_name": job['name']
                }]
            }
    
    return {"artifacts": []}

@api_router.get("/jobs/{job_id}/artifacts/browse")
async def browse_job_artifacts(job_id: int, path: Optional[str] = Query("")):
    """Browse files within job artifacts"""
    # Find the pipeline containing this job
    pipeline = await db.pipelines.find_one({"jobs.id": job_id}, {"_id": 0})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if job has artifacts
    job_data = None
    for job in pipeline.get('jobs', []):
        if job['id'] == job_id:
            job_data = job
            break
    
    if not job_data or not job_data.get('artifacts_file'):
        raise HTTPException(status_code=404, detail="Artifacts not found for this job")
    
    project_id = pipeline.get('project_id')
    
    try:
        # Check artifact size first
        content_length = job_data['artifacts_file'].get('size', 0)
        
        # Only download if less than 50MB for browsing (reduced from 100MB)
        if content_length > 50 * 1024 * 1024:
            return {
                "files": [],
                "message": "Artifact is too large to browse. Please download the full archive.",
                "size": content_length
            }
        
        # Download and parse the artifact with increased timeout
        async with httpx.AsyncClient(timeout=httpx.Timeout(180.0, connect=60.0, read=180.0)) as client:
            logger.info(f"Downloading artifacts for job {job_id}, size: {content_length} bytes")
            
            try:
                response = await client.get(
                    f"{gitlab_service.base_url}/api/v4/projects/{project_id}/jobs/{job_id}/artifacts",
                    headers=gitlab_service.headers,
                    follow_redirects=True
                )
                response.raise_for_status()
                
                logger.info(f"Successfully downloaded {len(response.content)} bytes for job {job_id}")
            except httpx.ReadError as e:
                logger.error(f"Read error downloading artifacts for job {job_id}: {e}")
                raise HTTPException(status_code=502, detail="Error reading artifact data from GitLab. The connection may have been interrupted.")
            except httpx.RemoteProtocolError as e:
                logger.error(f"Protocol error downloading artifacts for job {job_id}: {e}")
                raise HTTPException(status_code=502, detail="GitLab server closed the connection unexpectedly. Try downloading the full archive instead.")
            
            # Parse the zip file to list contents
            import zipfile
            from io import BytesIO
            
            try:
                zip_data = BytesIO(response.content)
                with zipfile.ZipFile(zip_data, 'r') as zip_file:
                    all_files = zip_file.namelist()
                    
                    # Filter files based on path
                    if path:
                        # Normalize path - ensure it ends with / for directory matching
                        normalized_path = path.rstrip('/') + '/'
                        filtered_files = [f for f in all_files if f.startswith(normalized_path)]
                    else:
                        filtered_files = all_files
                    
                    # Build directory structure
                    files = []
                    seen = set()
                    
                    for file_path in filtered_files:
                        # Remove the base path if specified
                        if path:
                            relative_path = file_path[len(normalized_path):]
                        else:
                            relative_path = file_path
                        
                        if not relative_path:
                            continue
                        
                        # Get the first component (file or directory)
                        parts = relative_path.split('/')
                        first_component = parts[0]
                        
                        if first_component in seen or not first_component:
                            continue
                        seen.add(first_component)
                        
                        # Determine if it's a file or directory
                        full_path = f"{path}/{first_component}" if path else first_component
                        is_directory = len(parts) > 1 or file_path.endswith('/')
                        
                        file_info = {
                            "name": first_component,
                            "type": "directory" if is_directory else "file",
                            "path": full_path.rstrip('/')
                        }
                        
                        # Add size for files
                        if not is_directory:
                            try:
                                file_info["size"] = zip_file.getinfo(file_path).file_size
                            except:
                                file_info["size"] = 0
                        
                        files.append(file_info)
                    
                    # Sort: directories first, then files, alphabetically
                    files.sort(key=lambda x: (x["type"] == "file", x["name"]))
                    
                    return {"files": files}
            
            except zipfile.BadZipFile:
                raise HTTPException(status_code=400, detail="Artifacts file is not a valid ZIP archive")
    
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Artifacts not found for this job")
        raise HTTPException(status_code=e.response.status_code, detail=f"Error fetching artifacts: {e}")
    except httpx.ReadTimeout:
        logger.error(f"Timeout downloading artifacts for job {job_id}")
        raise HTTPException(status_code=504, detail="Timeout downloading artifacts. The file may be too large. Try downloading the full archive instead.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error browsing artifacts for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error browsing artifacts: {str(e)}")

@api_router.get("/jobs/{job_id}/artifacts/download")
async def download_job_artifact(job_id: int, path: Optional[str] = Query(None)):
    """Download a specific file from job artifacts or entire archive"""
    # Find the pipeline containing this job
    pipeline = await db.pipelines.find_one({"jobs.id": job_id}, {"_id": 0})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Job not found")
    
    project_id = pipeline.get('project_id')
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Download the artifacts archive
            response = await client.get(
                f"{gitlab_service.base_url}/api/v4/projects/{project_id}/jobs/{job_id}/artifacts",
                headers=gitlab_service.headers,
                follow_redirects=True
            )
            response.raise_for_status()
            
            if not path:
                # Return entire archive as zip
                return StreamingResponse(
                    io.BytesIO(response.content),
                    media_type="application/zip",
                    headers={"Content-Disposition": f"attachment; filename=artifacts-job-{job_id}.zip"}
                )
            
            # Extract specific file from archive
            import zipfile
            from io import BytesIO
            
            try:
                zip_data = BytesIO(response.content)
                with zipfile.ZipFile(zip_data, 'r') as zip_file:
                    # Try to find the file
                    if path not in zip_file.namelist():
                        raise HTTPException(status_code=404, detail=f"File '{path}' not found in artifacts")
                    
                    file_content = zip_file.read(path)
                    
                    # Determine content type based on file extension
                    import mimetypes
                    content_type, _ = mimetypes.guess_type(path)
                    if not content_type:
                        content_type = "application/octet-stream"
                    
                    filename = path.split('/')[-1]
                    
                    return StreamingResponse(
                        io.BytesIO(file_content),
                        media_type=content_type,
                        headers={"Content-Disposition": f"attachment; filename={filename}"}
                    )
            
            except zipfile.BadZipFile:
                raise HTTPException(status_code=400, detail="Artifacts file is not a valid ZIP archive")
    
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Artifacts not found for this job")
        raise HTTPException(status_code=e.response.status_code, detail=f"Error fetching artifacts: {e}")
    except Exception as e:
        logger.error(f"Error downloading artifact for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading artifact: {str(e)}")

@api_router.post("/sync")
async def trigger_sync():
    """Manually trigger data sync"""
    await sync_gitlab_data()
    return {"message": "Sync completed"}

@api_router.get("/settings/enabled-projects")
async def get_enabled_projects():
    """Get list of enabled project IDs"""
    doc = await db.settings.find_one({"key": "enabled_projects"})
    return {"enabled_projects": doc.get("value", []) if doc else []}

@api_router.post("/settings/enabled-projects")
async def update_enabled_projects(project_ids: List[int]):
    """Update list of enabled project IDs"""
    await db.settings.update_one(
        {"key": "enabled_projects"},
        {"$set": {"value": project_ids}},
        upsert=True
    )
    return {"message": "Enabled projects updated", "enabled_projects": project_ids}

@api_router.get("/projects/{project_id}/ci-config")
async def get_ci_config(project_id: int, ref: Optional[str] = Query(None)):
    """Get CI/CD configuration stage order from .gitlab-ci.yml"""
    stages = await gitlab_service.fetch_gitlab_ci_config(project_id, ref)
    
    if stages:
        return {"stages": stages, "source": "gitlab-ci.yml"}
    else:
        # Return default stage order if .gitlab-ci.yml is not available
        return {"stages": ["build", "test", "deploy", "release", "cleanup"], "source": "default"}

@api_router.get("/jobs/{job_id}/tests")
async def get_job_tests(job_id: int):
    """Get test results for a specific job from JUnit artifacts"""
    # Find the pipeline containing this job
    pipeline = await db.pipelines.find_one({"jobs.id": job_id}, {"_id": 0})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get the project_id
    project_id = pipeline.get('project_id')
    
    # Fetch JUnit test report
    test_results = await gitlab_service.fetch_job_junit_report(project_id, job_id)
    
    if test_results:
        return test_results
    else:
        return {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "tests": []
        }

app.include_router(api_router)
