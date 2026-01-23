import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, CheckCircle2, XCircle, Clock, PlayCircle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentPipelines, setRecentPipelines] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, pipelinesRes, projectsRes] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/pipelines?limit=10`),
        axios.get(`${API}/projects`),
      ]);

      setStats(statsRes.data);
      setRecentPipelines(pipelinesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
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
        return <CheckCircle2 className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'running':
        return <PlayCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-state">
        <div className="text-center">
          <Activity className="w-12 h-12 text-running animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-heading font-semibold tracking-tight text-foreground" data-testid="dashboard-title">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor your CI/CD pipelines at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid">
        <div className="stat-card" data-testid="stat-total">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Pipelines</span>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-3xl font-heading font-semibold">{stats?.total || 0}</p>
        </div>

        <div className="stat-card" data-testid="stat-success">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Success</span>
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <p className="text-3xl font-heading font-semibold text-success">{stats?.success || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats?.success_rate || 0}% success rate</p>
        </div>

        <div className="stat-card" data-testid="stat-failed">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Failed</span>
            <XCircle className="w-5 h-5 text-error" />
          </div>
          <p className="text-3xl font-heading font-semibold text-error">{stats?.failed || 0}</p>
        </div>

        <div className="stat-card" data-testid="stat-running">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Running</span>
            <PlayCircle className="w-5 h-5 text-running" />
          </div>
          <p className="text-3xl font-heading font-semibold text-running">{stats?.running || 0}</p>
        </div>
      </div>

      {/* Projects Overview */}
      <div className="stat-card" data-testid="projects-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-heading font-medium">Projects</h2>
          <span className="text-sm text-muted-foreground">{projects.length} active</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-4 border border-border rounded-md hover:border-zinc-600 transition-colors"
              data-testid={`project-${project.id}`}
            >
              <h3 className="font-heading font-medium text-foreground mb-1">{project.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">{project.path}</p>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Pipelines */}
      <div className="stat-card" data-testid="recent-pipelines-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-heading font-medium">Recent Pipelines</h2>
          <Link
            to="/pipelines"
            className="text-sm text-running hover:text-running/80 transition-colors"
            data-testid="view-all-link"
          >
            View all →
          </Link>
        </div>
        <div className="space-y-3">
          {recentPipelines.map((pipeline) => (
            <Link
              key={pipeline.id}
              to={`/pipelines/${pipeline.id}`}
              className="block p-4 border border-border rounded-md hover:border-zinc-600 transition-colors"
              data-testid={`pipeline-${pipeline.id}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 ${getStatusColor(pipeline.status)}`}>
                    {getStatusIcon(pipeline.status)}
                    <span className="text-sm font-medium capitalize">{pipeline.status}</span>
                  </div>
                  <span className="text-sm font-heading font-medium text-foreground">
                    {pipeline.project_name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(pipeline.created_at)}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="font-mono">#{pipeline.id}</span>
                <span>Branch: {pipeline.ref}</span>
                <span>Duration: {formatDuration(pipeline.duration)}</span>
                <span className="font-mono">{pipeline.sha.substring(0, 8)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;