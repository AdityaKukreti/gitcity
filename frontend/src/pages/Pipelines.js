import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, RefreshCw, GitBranch, Search, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const BACKEND_URL = window.ENV?.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const Pipelines = () => {
  const [pipelines, setPipelines] = useState([]);
  const [projects, setProjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    project: 'all',
    branch: 'all',
    status: 'all',
    search: '',
  });
  const [projectOpen, setProjectOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchData();
    
    // Check for project query parameter
    const projectParam = searchParams.get('project');
    if (projectParam) {
      setFilters(prev => ({ ...prev, project: projectParam }));
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [filters.project, filters.branch, filters.status]);

  const fetchData = async () => {
    try {
      const [projectsRes, branchesRes] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/branches`),
      ]);

      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
      setBranches(Array.isArray(branchesRes.data.branches) ? branchesRes.data.branches : []);
      await fetchPipelines();
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
      setProjects([]);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelines = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.project && filters.project !== 'all') params.append('project_id', filters.project);
      if (filters.branch && filters.branch !== 'all') params.append('branch', filters.branch);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);

      const response = await axios.get(`${API}/pipelines?${params.toString()}`);
      setPipelines(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      toast.error('Failed to load pipelines');
      setPipelines([]);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/sync`);
      await fetchPipelines();
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'status-success';
      case 'failed':
        return 'status-failed';
      case 'running':
        return 'status-running';
      case 'pending':
        return 'status-pending';
      case 'canceled':
        return 'status-canceled';
      default:
        return 'status-pending';
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
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPipelines = pipelines.filter((pipeline) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        (pipeline.project_name || '').toLowerCase().includes(searchLower) ||
        (pipeline.ref || '').toLowerCase().includes(searchLower) ||
        (pipeline.sha || '').toLowerCase().includes(searchLower) ||
        (pipeline.id || '').toString().includes(searchLower)
      );
    }
    return true;
  });

  const groupedPipelines = filteredPipelines.reduce((acc, pipeline) => {
    const date = new Date(pipeline.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(pipeline);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-state">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-running animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading pipelines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="pipelines-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-semibold tracking-tight text-foreground" data-testid="pipelines-title">
            Pipelines
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{filteredPipelines.length} pipelines found</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="refresh-button">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="stat-card" data-testid="filters-section">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-heading font-medium">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search pipelines..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
                data-testid="search-input"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Project</label>
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={projectOpen}
                  className="w-full justify-between"
                  data-testid="project-filter"
                >
                  {filters.project && filters.project !== 'all'
                    ? projects.find((project) => project.id.toString() === filters.project)?.name
                    : "All projects"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search projects..." />
                  <CommandList>
                    <CommandEmpty>No project found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setFilters({ ...filters, project: 'all' });
                          setProjectOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filters.project === 'all' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All projects
                      </CommandItem>
                      {projects.map((project) => (
                        <CommandItem
                          key={project.id}
                          value={project.name}
                          onSelect={() => {
                            setFilters({ ...filters, project: project.id.toString() });
                            setProjectOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.project === project.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {project.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Branch</label>
            <Popover open={branchOpen} onOpenChange={setBranchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={branchOpen}
                  className="w-full justify-between"
                  data-testid="branch-filter"
                >
                  {filters.branch && filters.branch !== 'all'
                    ? filters.branch
                    : "All branches"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search branches..." />
                  <CommandList>
                    <CommandEmpty>No branch found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setFilters({ ...filters, branch: 'all' });
                          setBranchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filters.branch === 'all' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All branches
                      </CommandItem>
                      {branches.map((branch) => (
                        <CommandItem
                          key={branch}
                          value={branch}
                          onSelect={() => {
                            setFilters({ ...filters, branch: branch });
                            setBranchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filters.branch === branch ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <GitBranch className="w-3 h-3 mr-2" />
                          {branch}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Status</label>
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pipelines List */}
      <div className="space-y-6" data-testid="pipelines-list">
        {Object.keys(groupedPipelines).length === 0 ? (
          <div className="stat-card text-center py-12" data-testid="empty-state">
            <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No pipelines found</p>
          </div>
        ) : (
          Object.entries(groupedPipelines).map(([date, datePipelines]) => (
            <div key={date} data-testid={`pipeline-group-${date}`}>
              <h3 className="text-sm font-heading font-medium text-muted-foreground mb-3">{date}</h3>
              <div className="space-y-3">
                {datePipelines.map((pipeline) => (
                  <Link
                    key={pipeline.id}
                    to={`/pipelines/${pipeline.id}`}
                    className="block stat-card"
                    data-testid={`pipeline-card-${pipeline.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <span className={`status-badge ${getStatusColor(pipeline.status)}`}>
                          {pipeline.status}
                        </span>
                        <div>
                          <h4 className="font-heading font-medium text-foreground">
                            {pipeline.project_name || 'Unknown Project'}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">#{pipeline.id}</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDate(pipeline.created_at)}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">Branch</span>
                        <div className="flex items-center gap-1.5 text-foreground">
                          <GitBranch className="w-3 h-3" />
                          <span className="font-mono text-xs">{pipeline.ref || 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Commit</span>
                        <span className="font-mono text-xs text-foreground">{pipeline.sha ? pipeline.sha.substring(0, 8) : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Duration</span>
                        <span className="text-foreground">{formatDuration(pipeline.duration)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Source</span>
                        <span className="text-foreground capitalize">{pipeline.source || 'N/A'}</span>
                      </div>
                    </div>
                    {pipeline.test_results && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-6 text-xs">
                        <span className="text-success">✓ {pipeline.test_results.passed} passed</span>
                        {pipeline.test_results.failed > 0 && (
                          <span className="text-error">✗ {pipeline.test_results.failed} failed</span>
                        )}
                        {pipeline.test_results.skipped > 0 && (
                          <span className="text-muted-foreground">⊘ {pipeline.test_results.skipped} skipped</span>
                        )}
                        <span className="text-muted-foreground">Total: {pipeline.test_results.total}</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Pipelines;