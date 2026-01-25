import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen = ({ message = "Loading GitLab data..." }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Fetching Pipeline Data
        </h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="flex justify-center">
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          This may take a few moments...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
