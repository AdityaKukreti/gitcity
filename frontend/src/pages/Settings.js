import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, RefreshCw, CheckCircle2, Info, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

const BACKEND_URL = window.ENV?.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const [settings, setSettings] = useState({
    gitlabUrl: '',
    gitlabToken: '',
    useMockData: true,
    fetchInterval: 30,
  });
  const [saved, setSaved] = useState(false);
  const [projects, setProjects] = useState([]);
  const [enabledProjects, setEnabledProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchEnabledProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchEnabledProjects = async () => {
    try {
      const response = await axios.get(`${API}/settings/enabled-projects`);
      setEnabledProjects(response.data.enabled_projects || []);
    } catch (error) {
      console.error('Error fetching enabled projects:', error);
    }
  };

  const handleProjectToggle = (projectId) => {
    setEnabledProjects(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  const handleSaveProjects = async () => {
    try {
      await axios.post(`${API}/settings/enabled-projects`, enabledProjects);
      toast.success('Project settings saved successfully!');
    } catch (error) {
      console.error('Error saving project settings:', error);
      toast.error('Failed to save project settings');
    }
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter(project => {
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.path.toLowerCase().includes(query) ||
      (project.description && project.description.toLowerCase().includes(query))
    );
  });

  const handleSave = () => {
    // In a real implementation, this would save to backend
    toast.success('Settings saved! Please update backend .env file with these values.');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async () => {
    try {
      await axios.post(`${API}/sync`);
      toast.success('Connection successful! Data synced.');
    } catch (error) {
      toast.error('Connection failed. Check your GitLab URL and token.');
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-heading font-semibold tracking-tight text-foreground" data-testid="settings-title">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your GitLab connection</p>
      </div>

      {/* Info Banner */}
      <div className="stat-card bg-info/10 border-info/30" data-testid="info-banner">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Configuration Instructions</p>
            <p className="text-muted-foreground">
              To connect to your GitLab instance, update the following values in your backend <code className="px-1.5 py-0.5 bg-secondary rounded font-mono text-xs">.env</code> file:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li><code className="px-1.5 py-0.5 bg-secondary rounded font-mono text-xs">GITLAB_URL</code> - Your GitLab instance URL</li>
              <li><code className="px-1.5 py-0.5 bg-secondary rounded font-mono text-xs">GITLAB_TOKEN</code> - Your GitLab personal access token</li>
              <li><code className="px-1.5 py-0.5 bg-secondary rounded font-mono text-xs">USE_MOCK_DATA</code> - Set to "false" to use real data</li>
              <li><code className="px-1.5 py-0.5 bg-secondary rounded font-mono text-xs">FETCH_INTERVAL_SECONDS</code> - Data sync interval</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              After updating, restart the backend: <code className="px-1.5 py-0.5 bg-secondary rounded font-mono text-xs">sudo supervisorctl restart backend</code>
            </p>
          </div>
        </div>
      </div>

      {/* GitLab Configuration */}
      <div className="stat-card" data-testid="gitlab-config">
        <h2 className="text-2xl font-heading font-medium mb-4">GitLab Configuration</h2>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="gitlab-url" data-testid="label-gitlab-url">GitLab URL</Label>
            <Input
              id="gitlab-url"
              placeholder="https://gitlab.example.com"
              value={settings.gitlabUrl}
              onChange={(e) => setSettings({ ...settings, gitlabUrl: e.target.value })}
              data-testid="input-gitlab-url"
            />
            <p className="text-xs text-muted-foreground">
              The base URL of your self-hosted GitLab instance
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gitlab-token" data-testid="label-gitlab-token">GitLab Access Token</Label>
            <Input
              id="gitlab-token"
              type="password"
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              value={settings.gitlabToken}
              onChange={(e) => setSettings({ ...settings, gitlabToken: e.target.value })}
              data-testid="input-gitlab-token"
            />
            <p className="text-xs text-muted-foreground">
              Generate a personal access token with <code className="px-1 py-0.5 bg-secondary rounded text-xs">api</code> and{' '}
              <code className="px-1 py-0.5 bg-secondary rounded text-xs">read_api</code> scopes
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mock-data" data-testid="label-mock-data">Use Mock Data</Label>
              <p className="text-xs text-muted-foreground">
                Enable to use sample data for testing
              </p>
            </div>
            <Switch
              id="mock-data"
              checked={settings.useMockData}
              onCheckedChange={(checked) => setSettings({ ...settings, useMockData: checked })}
              data-testid="switch-mock-data"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fetch-interval" data-testid="label-fetch-interval">Fetch Interval (seconds)</Label>
            <Input
              id="fetch-interval"
              type="number"
              min="10"
              max="3600"
              value={settings.fetchInterval}
              onChange={(e) => setSettings({ ...settings, fetchInterval: parseInt(e.target.value) })}
              data-testid="input-fetch-interval"
            />
            <p className="text-xs text-muted-foreground">
              How often to sync data from GitLab (10-3600 seconds)
            </p>
          </div>
        </div>
      </div>

      {/* Environment Variables Reference */}
      <div className="stat-card" data-testid="env-reference">
        <h2 className="text-2xl font-heading font-medium mb-4">Environment Variables</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Copy these values to your <code className="px-1.5 py-0.5 bg-secondary rounded font-mono text-xs">/app/backend/.env</code> file:
        </p>
        <div className="bg-background p-4 rounded-md border border-border font-mono text-sm">
          <pre data-testid="env-preview">
            GITLAB_URL="{settings.gitlabUrl || 'https://gitlab.example.com'}"<br />
            GITLAB_TOKEN="{settings.gitlabToken || 'your_gitlab_token_here'}"<br />
            USE_MOCK_DATA="{settings.useMockData ? 'true' : 'false'}"<br />
            FETCH_INTERVAL_SECONDS="{settings.fetchInterval}"<br />
          </pre>
        </div>
      </div>

      {/* Repository Selection */}
      <div className="stat-card" data-testid="repository-selection">
        <h2 className="text-2xl font-heading font-medium mb-4">Repository Selection</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Select which repositories to monitor. Only checked repositories will have their data fetched and displayed in the dashboard.
        </p>
        
        {loadingProjects ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-running animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading repositories...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No repositories found. Please sync data first.</p>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search repositories by name, path, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="repo-search-input"
                />
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="text-center py-8">
                <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No repositories match your search criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-start space-x-3 p-3 border border-border rounded-md hover:bg-secondary/50 transition-colors"
                  data-testid={`project-checkbox-${project.id}`}
                >
                  <Checkbox
                    id={`project-${project.id}`}
                    checked={enabledProjects.includes(project.id)}
                    onCheckedChange={() => handleProjectToggle(project.id)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`project-${project.id}`}
                      className="text-sm font-medium text-foreground cursor-pointer"
                    >
                      {project.name}
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">{project.path}</p>
                    {project.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {enabledProjects.length} of {projects.length} repositories selected
                {searchQuery && ` (${filteredProjects.length} shown)`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEnabledProjects(projects.map(p => p.id))}
                  data-testid="select-all-button"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEnabledProjects([])}
                  data-testid="deselect-all-button"
                >
                  Deselect All
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} data-testid="save-button">
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Copy Configuration
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handleTest} data-testid="test-button">
          <RefreshCw className="w-4 h-4 mr-2" />
          Test Connection
        </Button>
        <Button onClick={handleSaveProjects} data-testid="save-projects-button">
          <Save className="w-4 h-4 mr-2" />
          Save Repository Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
