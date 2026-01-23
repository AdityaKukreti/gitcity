#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, List

class GitLabMonitorAPITester:
    def __init__(self, base_url="https://build-inspector-5.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response_sample"] = str(response_data)[:200] + "..." if len(str(response_data)) > 200 else str(response_data)
        
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")

    def test_api_endpoint(self, endpoint: str, method: str = "GET", data: Dict = None, expected_status: int = 200) -> tuple:
        """Test a single API endpoint"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        
        try:
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=10)
            else:
                return False, f"Unsupported method: {method}", None

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    return True, f"Status: {response.status_code}", response_data
                except:
                    return True, f"Status: {response.status_code} (non-JSON response)", response.text
            else:
                return False, f"Expected {expected_status}, got {response.status_code}", response.text

        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}", None

    def test_root_endpoint(self):
        """Test API root endpoint"""
        success, details, data = self.test_api_endpoint("/")
        self.log_test("API Root Endpoint", success, details, data)
        return success

    def test_projects_endpoint(self):
        """Test projects endpoint"""
        success, details, data = self.test_api_endpoint("/projects")
        
        if success and data:
            # Validate response structure
            if isinstance(data, list) and len(data) > 0:
                project = data[0]
                required_fields = ['id', 'name', 'path', 'web_url']
                missing_fields = [field for field in required_fields if field not in project]
                
                if missing_fields:
                    success = False
                    details += f" - Missing fields: {missing_fields}"
                else:
                    details += f" - Found {len(data)} projects"
            else:
                success = False
                details += " - Invalid response format or empty data"
        
        self.log_test("Projects Endpoint", success, details, data)
        return success, data

    def test_pipelines_endpoint(self):
        """Test pipelines endpoint"""
        success, details, data = self.test_api_endpoint("/pipelines")
        
        if success and data:
            if isinstance(data, list) and len(data) > 0:
                pipeline = data[0]
                required_fields = ['id', 'project_id', 'project_name', 'status', 'ref', 'jobs']
                missing_fields = [field for field in required_fields if field not in pipeline]
                
                if missing_fields:
                    success = False
                    details += f" - Missing fields: {missing_fields}"
                else:
                    details += f" - Found {len(data)} pipelines"
            else:
                success = False
                details += " - Invalid response format or empty data"
        
        self.log_test("Pipelines Endpoint", success, details, data)
        return success, data

    def test_pipeline_filtering(self, pipelines_data):
        """Test pipeline filtering functionality"""
        if not pipelines_data or len(pipelines_data) == 0:
            self.log_test("Pipeline Filtering", False, "No pipelines data available for filtering test")
            return False

        # Test project filtering
        project_id = pipelines_data[0]['project_id']
        success, details, data = self.test_api_endpoint(f"/pipelines?project_id={project_id}")
        
        if success and data:
            # Verify all returned pipelines belong to the specified project
            valid_filter = all(p['project_id'] == project_id for p in data)
            if not valid_filter:
                success = False
                details += " - Project filter not working correctly"
            else:
                details += f" - Project filter working, {len(data)} pipelines for project {project_id}"
        
        self.log_test("Pipeline Project Filtering", success, details)

        # Test status filtering
        success, details, data = self.test_api_endpoint("/pipelines?status=success")
        if success and data:
            valid_filter = all(p['status'] == 'success' for p in data)
            if not valid_filter:
                success = False
                details += " - Status filter not working correctly"
            else:
                details += f" - Status filter working, {len(data)} success pipelines"
        
        self.log_test("Pipeline Status Filtering", success, details)
        return success

    def test_pipeline_detail(self, pipelines_data):
        """Test individual pipeline detail endpoint"""
        if not pipelines_data or len(pipelines_data) == 0:
            self.log_test("Pipeline Detail", False, "No pipelines data available for detail test")
            return False

        pipeline_id = pipelines_data[0]['id']
        success, details, data = self.test_api_endpoint(f"/pipelines/{pipeline_id}")
        
        if success and data:
            required_fields = ['id', 'project_id', 'status', 'jobs', 'test_results']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                success = False
                details += f" - Missing fields: {missing_fields}"
            else:
                details += f" - Pipeline {pipeline_id} details complete"
        
        self.log_test("Pipeline Detail Endpoint", success, details, data)
        return success, data

    def test_stats_endpoint(self):
        """Test statistics endpoint"""
        success, details, data = self.test_api_endpoint("/stats")
        
        if success and data:
            required_fields = ['total', 'success', 'failed', 'running', 'pending', 'success_rate']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                success = False
                details += f" - Missing fields: {missing_fields}"
            else:
                details += f" - Stats: {data['total']} total, {data['success_rate']}% success rate"
        
        self.log_test("Stats Endpoint", success, details, data)
        return success

    def test_branches_endpoint(self):
        """Test branches endpoint"""
        success, details, data = self.test_api_endpoint("/branches")
        
        if success and data:
            if 'branches' in data and isinstance(data['branches'], list):
                details += f" - Found {len(data['branches'])} branches"
            else:
                success = False
                details += " - Invalid branches response format"
        
        self.log_test("Branches Endpoint", success, details, data)
        return success

    def test_pipeline_logs(self, pipeline_data):
        """Test pipeline logs endpoint"""
        if not pipeline_data or 'jobs' not in pipeline_data or len(pipeline_data['jobs']) == 0:
            self.log_test("Pipeline Logs", False, "No jobs available for logs test")
            return False

        pipeline_id = pipeline_data['id']
        job_id = pipeline_data['jobs'][0]['id']
        
        success, details, data = self.test_api_endpoint(f"/pipelines/{pipeline_id}/logs?job_id={job_id}")
        
        if success and data:
            if 'raw_log' in data and 'error_lines' in data:
                details += f" - Logs retrieved for job {job_id}"
            else:
                success = False
                details += " - Invalid logs response format"
        
        self.log_test("Pipeline Logs Endpoint", success, details)
        return success

    def test_pipeline_actions(self, pipeline_data):
        """Test pipeline action endpoints (retry/cancel)"""
        if not pipeline_data:
            self.log_test("Pipeline Actions", False, "No pipeline data available for actions test")
            return False

        pipeline_id = pipeline_data['id']
        
        # Test retry action
        success, details, data = self.test_api_endpoint(
            f"/pipelines/{pipeline_id}/action", 
            method="POST", 
            data={"action": "retry"}
        )
        self.log_test("Pipeline Retry Action", success, details, data)

        # Test cancel action
        success, details, data = self.test_api_endpoint(
            f"/pipelines/{pipeline_id}/action", 
            method="POST", 
            data={"action": "cancel"}
        )
        self.log_test("Pipeline Cancel Action", success, details, data)
        
        return success

    def test_sync_endpoint(self):
        """Test manual sync endpoint"""
        success, details, data = self.test_api_endpoint("/sync", method="POST")
        self.log_test("Manual Sync Endpoint", success, details, data)
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting GitLab Monitor API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Test basic connectivity
        if not self.test_root_endpoint():
            print("❌ API root endpoint failed - stopping tests")
            return self.generate_report()

        # Test core endpoints
        projects_success, projects_data = self.test_projects_endpoint()
        pipelines_success, pipelines_data = self.test_pipelines_endpoint()
        
        # Test filtering if pipelines are available
        if pipelines_success and pipelines_data:
            self.test_pipeline_filtering(pipelines_data)
            
            # Test pipeline detail
            detail_success, pipeline_detail = self.test_pipeline_detail(pipelines_data)
            
            # Test logs and actions if detail is available
            if detail_success and pipeline_detail:
                self.test_pipeline_logs(pipeline_detail)
                self.test_pipeline_actions(pipeline_detail)

        # Test other endpoints
        self.test_stats_endpoint()
        self.test_branches_endpoint()
        self.test_sync_endpoint()

        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test_name']}: {test['details']}")
        
        passed_tests = [test for test in self.test_results if test['success']]
        if passed_tests:
            print(f"\n✅ PASSED TESTS ({len(passed_tests)}):")
            for test in passed_tests:
                print(f"  - {test['test_name']}")

        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    tester = GitLabMonitorAPITester()
    report = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if report["failed_tests"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())