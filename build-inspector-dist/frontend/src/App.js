import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Pipelines from '@/pages/Pipelines';
import PipelineDetail from '@/pages/PipelineDetail';
import Settings from '@/pages/Settings';
import LoadingScreen from '@/components/LoadingScreen';
import '@/App.css';

const API_BASE_URL = window.ENV?.REACT_APP_API_URL || 'http://localhost:8001';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sync-status`);
        const data = await response.json();
        setSyncStatus(data);
        
        if (data.sync_complete) {
          setIsLoading(false);
        } else {
          // Poll every 2 seconds until sync is complete
          setTimeout(checkSyncStatus, 2000);
        }
      } catch (error) {
        console.error('Error checking sync status:', error);
        // If there's an error, still show the app after a timeout
        setTimeout(() => setIsLoading(false), 5000);
      }
    };

    checkSyncStatus();
  }, []);

  if (isLoading) {
    const message = syncStatus 
      ? `Fetching pipelines from '${syncStatus.namespace}' namespace (${syncStatus.default_branch} branch, past ${syncStatus.days_to_fetch} days)...`
      : 'Initializing GitLab data sync...';
    
    return <LoadingScreen message={message} />;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pipelines" element={<Pipelines />} />
            <Route path="pipelines/:id" element={<PipelineDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
