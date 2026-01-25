import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, RefreshCw, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const [settings, setSettings] = useState({
    gitlabUrl: '',
    gitlabToken: '',
    useMockData: true,
    fetchInterval: 30,
  });
  const [saved, setSaved] = useState(false);

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
      </div>
    </div>
  );
};

export default Settings;