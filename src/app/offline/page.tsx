'use client';

import { useEffect, useState } from 'react';
import { WifiIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { WifiIcon as WifiSolidIcon } from '@heroicons/react/24/solid';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setRetryCount(0);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    
    // Try to reload the page
    if (navigator.onLine) {
      window.location.reload();
    } else {
      // Show feedback that we're still offline
      setTimeout(() => {
        setRetryCount(prev => prev - 1);
      }, 2000);
    }
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const goToAttendance = () => {
    window.location.href = '/dashboard/attendance/take';
  };

  const goToVerification = () => {
    window.location.href = '/dashboard/verify-attendance';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Connection Status Icon */}
        <div className="mb-6">
          {isOnline ? (
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <WifiSolidIcon className="w-10 h-10 text-green-600" />
            </div>
          ) : (
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <WifiIcon className="w-10 h-10 text-red-600" />
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="mb-8">
          {isOnline ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Connection Restored!
              </h1>
              <p className="text-gray-600">
                You're back online. You can now access all features of the UPSA Attendance System.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                You're Offline
              </h1>
              <p className="text-gray-600 mb-4">
                No internet connection detected. Some features may be limited, but you can still access cached content.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">Available Offline:</p>
                <ul className="text-left space-y-1">
                  <li>• View cached attendance records</li>
                  <li>• Access your schedule</li>
                  <li>• Take attendance (syncs when online)</li>
                  <li>• Verify attendance (syncs when online)</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isOnline ? (
            <>
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={goToDashboard}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Go to Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRetry}
                disabled={retryCount > 0}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {retryCount > 0 ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Checking Connection...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-5 h-5" />
                    Try Again
                  </>
                )}
              </button>
              
              <div className="grid grid-cols-1 gap-2 mt-4">
                <button
                  onClick={goToDashboard}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Dashboard (Cached)
                </button>
                <button
                  onClick={goToAttendance}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Take Attendance
                </button>
                <button
                  onClick={goToVerification}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Verify Attendance
                </button>
              </div>
            </>
          )}
        </div>

        {/* Connection Tips */}
        {!isOnline && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Connection Tips:</p>
            <ul className="text-xs text-gray-500 text-left space-y-1">
              <li>• Check your WiFi or mobile data</li>
              <li>• Move to an area with better signal</li>
              <li>• Restart your network connection</li>
              <li>• Contact IT support if issues persist</li>
            </ul>
          </div>
        )}

        {/* App Info */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            UPSA Attendance Management System
          </p>
          <p className="text-xs text-gray-400">
            Progressive Web App • Offline Capable
          </p>
        </div>
      </div>
    </div>
  );
}

// Add metadata for the offline page
// Metadata cannot be exported from client components
// This page handles offline functionality with client-side features