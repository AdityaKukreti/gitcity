import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, RefreshCw } from 'lucide-react';

const API_BASE_URL = window.ENV?.REACT_APP_API_URL || 'http://localhost:8001';

const SyncProgressIndicator = () => {
  const [syncProgress, setSyncProgress] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkSyncProgress = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sync-progress`);
        const data = await response.json();
        setSyncProgress(data);
        
        // Show indicator if sync is in progress
        setIsVisible(data.is_syncing);
      } catch (error) {
        console.error('Error checking sync progress:', error);
        setIsVisible(false);
      }
    };

    // Check immediately
    checkSyncProgress();

    // Poll every 2 seconds
    const interval = setInterval(checkSyncProgress, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !syncProgress) {
    return null;
  }

  const { cached_pipelines, total_pipelines, progress_percent, current_project } = syncProgress;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            Syncing Pipelines...
          </p>
          <p className="text-xs text-gray-500 mt-1 truncate">
            {current_project || 'Processing...'}
          </p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>{cached_pipelines} / {total_pipelines}</span>
              <span>{progress_percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress_percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncProgressIndicator;
