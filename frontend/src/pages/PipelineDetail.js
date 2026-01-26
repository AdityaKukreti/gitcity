import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  GitBranch,
  Clock,
  Calendar,
  ExternalLink,
  CheckCircle2,
  XCircle,
  PlayCircle,
  RotateCw,
  Ban,
  FileText,
  Package,
  Download,
  Folder,
  File,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PipelineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState(null);
  const [logs, setLogs] = useState({});
  const [artifacts, setArtifacts] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ciStages, setCiStages] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [testFilter, setTestFilter] = useState('all');
  const [loadingTests, setLoadingTests] = useState(false);
  const [artifactBrowser, setArtifactBrowser] = useState({});
  const [currentPath, setCurrentPath] = useState({});
  const [loadingArtifacts, setLoadingArtifacts] = useState({});

  useEffect(() => {
    fetchPipeline();
    fetchArtifacts();
  }, [id]);

  // Preload tests and artifacts when a job is selected
  useEffect(() => {
    if (selectedJob) {
      fetchJobTests(selectedJob.id);
      browseArtifacts(selectedJob.id, '');
    }
  }, [selectedJob]);

  const fetchPipeline = async () => {
    try {
      const response = await axios.get(`${API}/pipelines/${id}`);
      setPipeline(response.data);
      if (response.data.jobs && response.data.jobs.length > 0) {
        setSelectedJob(response.data.jobs[0]);
      }
      
      // Fetch CI config for accurate stage ordering
      if (response.data.project_id && response.data.ref) {
        try {
          const ciConfigResponse = await axios.get(
            `${API}/projects/${response.data.project_id}/ci-config`,
            { params: { ref: response.data.ref } }
          );
          if (ciConfigResponse.data.stages) {
            setCiStages(ciConfigResponse.data.stages);
          }
        } catch (error) {
          console.log('Could not fetch CI config, using default stage order');
        }
      }
    } catch (error) {
      console.error('Error fetching pipeline:', error);
      toast.error('Failed to load pipeline details');
    } finally {
      setLoading(false);
    }
  };

  const fetchArtifacts = async () => {
    try {
      const response = await axios.get(`${API}/pipelines/${id}/artifacts`);
      setArtifacts(response.data.artifacts || []);
    } catch (error) {
      console.error('Error fetching artifacts:', error);
    }
  };

  const fetchJobLogs = async (jobId) => {
    if (logs[jobId]) return;

    try {
      const response = await axios.get(`${API}/pipelines/${id}/logs?job_id=${jobId}`);
      setLogs((prev) => ({ ...prev, [jobId]: response.data }));
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load logs');
    }
  };

  const fetchJobTests = async (jobId) => {
    if (testResults[jobId]) return;

    setLoadingTests(true);
    try {
      const response = await axios.get(`${API}/jobs/${jobId}/tests`);
      setTestResults((prev) => ({ ...prev, [jobId]: response.data }));
    } catch (error) {
      console.error('Error fetching test results:', error);
      // Don't show error toast as tests might not be available for all jobs
    } finally {
      setLoadingTests(false);
    }
  };

  const handleAction = async (action) => {
    try {
      await axios.post(`${API}/pipelines/${id}/action`, { action });
      toast.success(`Pipeline ${action} initiated`);
      setTimeout(() => fetchPipeline(), 1000);
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error(`Failed to ${action} pipeline`);
    }
  };

  const browseArtifacts = async (jobId, path = '') => {
    // Check if this job has artifacts first
    const jobArtifacts = artifacts.filter(a => a.job_id === jobId);
    if (jobArtifacts.length === 0) {
      // No artifacts for this job, don't try to browse
      setArtifactBrowser((prev) => ({ ...prev, [jobId]: [] }));
      setCurrentPath((prev) => ({ ...prev, [jobId]: '' }));
      return;
    }

    setLoadingArtifacts((prev) => ({ ...prev, [jobId]: true }));
    try {
      const response = await axios.get(`${API}/jobs/${jobId}/artifacts/browse`, {
        params: { path }
      });
      setArtifactBrowser((prev) => ({ ...prev, [jobId]: response.data.files || [] }));
      setCurrentPath((prev) => ({ ...prev, [jobId]: path }));
    } catch (error) {
      console.error('Error browsing artifacts:', error);
      // Don't show error toast if artifacts simply don't exist
      if (error.response?.status !== 404) {
        toast.error('Failed to browse artifacts');
      }
      setArtifactBrowser((prev) => ({ ...prev, [jobId]: [] }));
    } finally {
      setLoadingArtifacts((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleDownloadArtifact = (downloadUrl, filename) => {
    // Open GitLab artifact URL in new tab
    window.open(downloadUrl, '_blank');
    toast.success('Opening artifact download...');
  };

  const handleDownloadFile = (jobId, path, filename) => {
    // Download specific file from artifacts
    const url = `${API}/jobs/${jobId}/artifacts/download?path=${encodeURIComponent(path)}`;
    window.open(url, '_blank');
    toast.success(`Downloading ${filename}...`);
  };

  const handleDownloadFullArchive = (jobId) => {
    // Download entire artifact archive as zip
    const url = `${API}/jobs/${jobId}/artifacts/download`;
    window.open(url, '_blank');
    toast.success('Downloading artifact archive...');
  };

  const handleBrowseDirectory = (jobId, path) => {
    browseArtifacts(jobId, path);
  };

  const handleBreadcrumbClick = (jobId, path) => {
    browseArtifacts(jobId, path);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-success';
      case 'failed':
        return 'text-error';
      case 'running':
        return 'text-running';
      case 'pending':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'failed':
        return <XCircle className="w-5 h-5" />;
      case 'running':
        return <PlayCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderLogLine = (line, index) => {
    const errorPatterns = /ERROR|FAILED|Exception|Traceback|FATAL/i;
    const warnPatterns = /WARN|WARNING/i;

    let className = '';
    if (errorPatterns.test(line)) {
      className = 'log-line-error';
    } else if (warnPatterns.test(line)) {
      className = 'log-line-warning';
    }

    return (
      <div key={index} className={className}>
        <span className="text-muted-foreground mr-4">{index + 1}</span>
        {line}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-state">
        <div className="text-center">
          <PlayCircle className="w-12 h-12 text-running animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="not-found-state">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <p className="text-muted-foreground">Pipeline not found</p>
        </div>
      </div>
    );
  }

  // Get unique stages from jobs
  const uniqueStages = [...new Set(pipeline.jobs.map((job) => job.stage))];
  
  // Sort stages based on CI config or standard order
  let stages;
  if (ciStages && ciStages.length > 0) {
    // Use the order from .gitlab-ci.yml - preserve the exact order
    stages = [];
    for (const stage of ciStages) {
      if (uniqueStages.includes(stage)) {
        stages.push(stage);
      }
    }
    // Add any stages that exist in jobs but not in CI config (at the end)
    const missingStages = uniqueStages.filter(stage => !ciStages.includes(stage));
    stages = [...stages, ...missingStages];
    
    // Reverse the order to match the expected display
    stages.reverse();
  } else {
    // Fallback to standard GitLab CI/CD stage order
    const standardStageOrder = ['build', 'test', 'deploy', 'release', 'cleanup'];
    
    stages = uniqueStages.sort((a, b) => {
      const indexA = standardStageOrder.indexOf(a.toLowerCase());
      const indexB = standardStageOrder.indexOf(b.toLowerCase());
      
      // If both stages are in standard order, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // If only A is in standard order, it comes first
      if (indexA !== -1) return -1;
      // If only B is in standard order, it comes first
      if (indexB !== -1) return 1;
      // If neither is in standard order, sort alphabetically
      return a.localeCompare(b);
    });
  }
  
  const jobsByStage = stages.reduce((acc, stage) => {
    acc[stage] = pipeline.jobs.filter((job) => job.stage === stage);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6" data-testid="pipeline-detail-page">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate('/pipelines')}
          className="mb-4"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pipelines
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex items-center gap-2 ${getStatusColor(pipeline.status)}`}>
                {getStatusIcon(pipeline.status)}
                <h1 className="text-4xl font-heading font-semibold tracking-tight" data-testid="pipeline-title">
                  Pipeline #{pipeline.id}
                </h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{pipeline.project_name}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleAction('retry')}
              data-testid="retry-button"
              disabled={pipeline.status === 'running'}
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction('cancel')}
              data-testid="cancel-button"
              disabled={pipeline.status !== 'running'}
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button variant="outline" asChild data-testid="view-gitlab-button">
              <a href={pipeline.web_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View in GitLab
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Info */}
      <div className="stat-card" data-testid="pipeline-info">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <GitBranch className="w-4 h-4" />
              <span className="text-sm">Branch</span>
            </div>
            <p className="font-mono text-sm text-foreground">{pipeline.ref}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Commit</span>
            </div>
            <p className="font-mono text-sm text-foreground">{pipeline.sha.substring(0, 8)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Duration</span>
            </div>
            <p className="text-sm text-foreground">{formatDuration(pipeline.duration)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Created</span>
            </div>
            <p className="text-sm text-foreground">{formatDate(pipeline.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Test Results */}
      {pipeline.test_results && (
        <div className="stat-card" data-testid="test-results">
          <h2 className="text-2xl font-heading font-medium mb-4">Test Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border border-border rounded-md">
              <p className="text-sm text-muted-foreground mb-1">Passed</p>
              <p className="text-3xl font-heading font-semibold text-success">
                {pipeline.test_results.passed}
              </p>
            </div>
            <div className="p-4 border border-border rounded-md">
              <p className="text-sm text-muted-foreground mb-1">Failed</p>
              <p className="text-3xl font-heading font-semibold text-error">
                {pipeline.test_results.failed}
              </p>
            </div>
            <div className="p-4 border border-border rounded-md">
              <p className="text-sm text-muted-foreground mb-1">Skipped</p>
              <p className="text-3xl font-heading font-semibold text-muted-foreground">
                {pipeline.test_results.skipped}
              </p>
            </div>
            <div className="p-4 border border-border rounded-md">
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-3xl font-heading font-semibold text-foreground">
                {pipeline.test_results.total}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Flow */}
      <div className="stat-card" data-testid="pipeline-flow">
        <h2 className="text-2xl font-heading font-medium mb-4">Pipeline Stages & Jobs</h2>
        <div className="pipeline-flow">
          {stages.map((stage, stageIdx) => (
            <React.Fragment key={stage}>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-heading font-medium text-muted-foreground mb-2">
                  {stage}
                </div>
                {jobsByStage[stage].map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <button
                      key={job.id}
                      onClick={() => {
                        setSelectedJob(job);
                        fetchJobLogs(job.id);
                      }}
                      className={`job-card text-left ${
                        isSelected ? 'border-running' : ''
                      }`}
                      data-testid={`job-${job.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={getStatusColor(job.status)}>
                          {getStatusIcon(job.status)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{job.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDuration(job.duration)}
                      </div>
                    </button>
                  );
                })}
              </div>
              {stageIdx < stages.length - 1 && <div className="stage-connector" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Job Details */}
      {selectedJob && (
        <div className="stat-card" data-testid="job-details">
          <Tabs defaultValue="info" className="w-full">
            <TabsList data-testid="job-tabs">
              <TabsTrigger value="info" data-testid="tab-info">Job Info</TabsTrigger>
              <TabsTrigger value="logs" data-testid="tab-logs">Logs</TabsTrigger>
              <TabsTrigger value="tests" data-testid="tab-tests">Tests</TabsTrigger>
              <TabsTrigger value="artifacts" data-testid="tab-artifacts">
                Artifacts ({artifacts.filter(a => a.job_id === selectedJob.id).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4" data-testid="job-info-content">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-heading font-medium mb-2">{selectedJob.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`status-badge status-${selectedJob.status}`}>
                      {selectedJob.status}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">Stage</span>
                    <span className="text-sm text-foreground">{selectedJob.stage}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">Duration</span>
                    <span className="text-sm text-foreground">{formatDuration(selectedJob.duration)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">Started At</span>
                    <span className="text-sm text-foreground">{formatDate(selectedJob.started_at)}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="mt-4" data-testid="job-logs-content">
              <ScrollArea className="h-[500px]">
                {logs[selectedJob.id] ? (
                  <div className="log-viewer" data-testid="log-viewer">
                    {logs[selectedJob.id].raw_log
                      ?.split('\n')
                      .map((line, idx) => renderLogLine(line, idx))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[400px]">
                    <p className="text-muted-foreground">Loading logs...</p>
                  </div>
                )}
              </ScrollArea>
              {logs[selectedJob.id]?.error_lines?.length > 0 && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-md">
                  <h4 className="text-sm font-heading font-medium text-error mb-2">
                    {logs[selectedJob.id].error_lines.length} Error(s) Found
                  </h4>
                  <div className="space-y-2 text-xs">
                    {logs[selectedJob.id].error_lines.slice(0, 5).map((error, idx) => (
                      <div key={idx} className="font-mono text-error">
                        Line {error.line_number}: {error.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tests" className="mt-4" data-testid="job-tests-content">
              {loadingTests ? (
                <div className="flex items-center justify-center h-[400px]">
                  <PlayCircle className="w-8 h-8 text-running animate-pulse" />
                  <p className="text-muted-foreground ml-3">Loading test results...</p>
                </div>
              ) : testResults[selectedJob.id] && testResults[selectedJob.id].total > 0 ? (
                <div className="space-y-4">
                  {/* Test Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => setTestFilter('all')}
                      className={`p-4 border rounded-md transition-colors ${
                        testFilter === 'all' ? 'border-running bg-running/10' : 'border-border hover:border-zinc-600'
                      }`}
                    >
                      <p className="text-sm text-muted-foreground mb-1">Total</p>
                      <p className="text-2xl font-heading font-semibold text-foreground">
                        {testResults[selectedJob.id].total}
                      </p>
                    </button>
                    <button
                      onClick={() => setTestFilter('passed')}
                      className={`p-4 border rounded-md transition-colors ${
                        testFilter === 'passed' ? 'border-success bg-success/10' : 'border-border hover:border-zinc-600'
                      }`}
                    >
                      <p className="text-sm text-muted-foreground mb-1">Passed</p>
                      <p className="text-2xl font-heading font-semibold text-success">
                        {testResults[selectedJob.id].passed}
                      </p>
                    </button>
                    <button
                      onClick={() => setTestFilter('failed')}
                      className={`p-4 border rounded-md transition-colors ${
                        testFilter === 'failed' ? 'border-error bg-error/10' : 'border-border hover:border-zinc-600'
                      }`}
                    >
                      <p className="text-sm text-muted-foreground mb-1">Failed</p>
                      <p className="text-2xl font-heading font-semibold text-error">
                        {testResults[selectedJob.id].failed}
                      </p>
                    </button>
                    <button
                      onClick={() => setTestFilter('skipped')}
                      className={`p-4 border rounded-md transition-colors ${
                        testFilter === 'skipped' ? 'border-warning bg-warning/10' : 'border-border hover:border-zinc-600'
                      }`}
                    >
                      <p className="text-sm text-muted-foreground mb-1">Skipped</p>
                      <p className="text-2xl font-heading font-semibold text-muted-foreground">
                        {testResults[selectedJob.id].skipped}
                      </p>
                    </button>
                  </div>

                  {/* Test List */}
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {testResults[selectedJob.id].tests
                        .filter(test => testFilter === 'all' || test.status === testFilter)
                        .map((test, idx) => (
                          <div
                            key={idx}
                            className="p-4 border border-border rounded-md hover:border-zinc-600 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {test.status === 'passed' && <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
                                {test.status === 'failed' && <XCircle className="w-4 h-4 text-error flex-shrink-0" />}
                                {test.status === 'skipped' && <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                                <div>
                                  <p className="text-sm font-medium text-foreground">{test.name}</p>
                                  {test.classname && (
                                    <p className="text-xs text-muted-foreground font-mono mt-1">{test.classname}</p>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                                {test.duration ? `${test.duration.toFixed(2)}s` : 'N/A'}
                              </span>
                            </div>
                            {test.failure_message && (
                              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                                <p className="text-xs font-mono text-error whitespace-pre-wrap">{test.failure_message}</p>
                              </div>
                            )}
                            {test.skip_message && (
                              <div className="mt-2 p-3 bg-muted/50 border border-border rounded-md">
                                <p className="text-xs text-muted-foreground">{test.skip_message}</p>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No test results available for this job</p>
                  <p className="text-xs text-muted-foreground mt-2">JUnit XML reports not found in artifacts</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="artifacts" className="mt-4" data-testid="job-artifacts-content">
              <div className="space-y-3">
                {artifacts.filter(a => a.job_id === selectedJob.id).length > 0 ? (
                  <>
                    {/* Download Full Archive Button */}
                    <div className="flex justify-end mb-4">
                      <Button
                        onClick={() => handleDownloadFullArchive(selectedJob.id)}
                        variant="default"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Full Archive (ZIP)
                      </Button>
                    </div>

                    {/* Breadcrumb Navigation */}
                    {currentPath[selectedJob.id] && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <button
                          onClick={() => handleBreadcrumbClick(selectedJob.id, '')}
                          className="hover:text-foreground transition-colors"
                        >
                          Root
                        </button>
                        {currentPath[selectedJob.id].split('/').filter(Boolean).map((part, idx, arr) => {
                          const path = arr.slice(0, idx + 1).join('/');
                          return (
                            <React.Fragment key={idx}>
                              <ChevronRight className="w-4 h-4" />
                              <button
                                onClick={() => handleBreadcrumbClick(selectedJob.id, path)}
                                className="hover:text-foreground transition-colors"
                              >
                                {part}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}

                    {/* File Browser */}
                    {loadingArtifacts[selectedJob.id] ? (
                      <div className="flex items-center justify-center py-12">
                        <PlayCircle className="w-8 h-8 text-running animate-pulse" />
                        <p className="text-muted-foreground ml-3">Loading artifacts...</p>
                      </div>
                    ) : artifactBrowser[selectedJob.id] && artifactBrowser[selectedJob.id].length > 0 ? (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-2">
                          {artifactBrowser[selectedJob.id].map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 border border-border rounded-md hover:border-zinc-600 transition-colors cursor-pointer"
                              onClick={() => {
                                if (file.type === 'directory') {
                                  handleBrowseDirectory(selectedJob.id, file.path);
                                }
                              }}
                            >
                              <div className="flex items-center gap-3">
                                {file.type === 'directory' ? (
                                  <Folder className="w-5 h-5 text-blue-500" />
                                ) : (
                                  <File className="w-5 h-5 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                                  {file.type === 'file' && file.size !== undefined && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatBytes(file.size)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {file.type === 'file' && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadFile(selectedJob.id, file.path, file.name);
                                  }}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              )}
                              {file.type === 'directory' && (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Click on a job to browse artifacts</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No artifacts available for this job</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default PipelineDetail;