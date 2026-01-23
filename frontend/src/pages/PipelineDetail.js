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

  useEffect(() => {
    fetchPipeline();
    fetchArtifacts();
  }, [id]);

  const fetchPipeline = async () => {
    try {
      const response = await axios.get(`${API}/pipelines/${id}`);
      setPipeline(response.data);
      if (response.data.jobs && response.data.jobs.length > 0) {
        setSelectedJob(response.data.jobs[0]);
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

  const handleDownloadArtifact = async (jobId, filename) => {
    try {
      toast.info('Downloading artifact...');
      const response = await axios.get(`${API}/artifacts/${jobId}/download?filename=${encodeURIComponent(filename)}`, {
        responseType: 'blob',
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Artifact downloaded successfully');
    } catch (error) {
      console.error('Error downloading artifact:', error);
      toast.error('Failed to download artifact');
    }
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

  const stages = [...new Set(pipeline.jobs.map((job) => job.stage))];
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
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default PipelineDetail;