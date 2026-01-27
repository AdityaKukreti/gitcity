#!/usr/bin/env python3
"""
Test script to verify pre-caching implementation for logs and tests
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / 'backend' / '.env')

async def test_cache():
    """Test that caches are working correctly"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'gitlab_monitor')]
    
    print("🔍 Checking cache statistics...\n")
    
    # Check artifact cache
    artifact_count = await db.artifact_cache.count_documents({})
    print(f"📦 Artifact cache entries: {artifact_count}")
    
    # Check log cache
    log_count = await db.processed_logs.count_documents({})
    print(f"📝 Log cache entries: {log_count}")
    
    # Check test cache
    test_count = await db.test_results.count_documents({})
    print(f"🧪 Test cache entries: {test_count}")
    
    print(f"\n✅ Total cached entries: {artifact_count + log_count + test_count}")
    
    # Show some sample cached data
    if log_count > 0:
        print("\n📝 Sample cached log entry:")
        sample_log = await db.processed_logs.find_one({})
        if sample_log:
            print(f"   Job ID: {sample_log.get('job_id')}")
            print(f"   Pipeline ID: {sample_log.get('pipeline_id')}")
            print(f"   Error lines found: {len(sample_log.get('error_lines', []))}")
    
    if test_count > 0:
        print("\n🧪 Sample cached test results:")
        sample_test = await db.test_results.find_one({})
        if sample_test:
            results = sample_test.get('test_results', {})
            print(f"   Job ID: {sample_test.get('job_id')}")
            print(f"   Total tests: {results.get('total', 0)}")
            print(f"   Passed: {results.get('passed', 0)}")
            print(f"   Failed: {results.get('failed', 0)}")
            print(f"   Cached at: {sample_test.get('cached_at')}")
    
    if artifact_count > 0:
        print("\n📦 Sample cached artifact structure:")
        sample_artifact = await db.artifact_cache.find_one({})
        if sample_artifact:
            print(f"   Job ID: {sample_artifact.get('job_id')}")
            print(f"   Files in cache: {len(sample_artifact.get('files', []))}")
            print(f"   Has full file list: {'full_file_list' in sample_artifact}")
    
    # Close connection
    client.close()
    print("\n✅ Cache verification complete!")

if __name__ == "__main__":
    try:
        asyncio.run(test_cache())
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
