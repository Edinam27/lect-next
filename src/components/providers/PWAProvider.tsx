'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { pwaService, isOnline, isPWAInstalled } from '@/lib/pwa';

interface PWAContextType {
  isOnline: boolean;
  isPWAInstalled: boolean;
  canInstall: boolean;
  pendingSyncCount: { attendance: number; verifications: number };
  installPWA: () => Promise<boolean>;
  refreshApp: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

interface PWAProviderProps {
  children: ReactNode;
}

export default function PWAProvider({ children }: PWAProviderProps) {
  const [isOnlineState, setIsOnlineState] = useState(true);
  const [isPWAInstalledState, setIsPWAInstalledState] = useState(false);
  const [canInstallState, setCanInstallState] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState({ attendance: 0, verifications: 0 });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Initialize PWA service
    const initializePWA = async () => {
      try {
        // Register service worker
        await pwaService.registerServiceWorker();
        
        // Request notification permission
        await pwaService.requestNotificationPermission();
        
        // Set initial states
        setIsOnlineState(isOnline());
        setIsPWAInstalledState(isPWAInstalled());
        
        // Get pending sync count
        const syncCount = await pwaService.getPendingSyncCount();
        setPendingSyncCount(syncCount);
        
        // Clean up old cache
        await pwaService.cleanupOldCache();
      } catch (error) {
        console.error('Failed to initialize PWA:', error);
      }
    };

    initializePWA();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnlineState(true);
      // Trigger background sync when coming back online
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SYNC_NOW' });
      }
    };

    const handleOffline = () => {
      setIsOnlineState(false);
    };

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstallState(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsPWAInstalledState(true);
      setCanInstallState(false);
      setDeferredPrompt(null);
    };

    // Listen for service worker messages
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        // Update pending sync count
        pwaService.getPendingSyncCount().then(setPendingSyncCount);
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Periodic sync count update
    const syncCountInterval = setInterval(async () => {
      try {
        const syncCount = await pwaService.getPendingSyncCount();
        setPendingSyncCount(syncCount);
      } catch (error) {
        console.error('Failed to update sync count:', error);
      }
    }, 30000); // Update every 30 seconds

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      
      clearInterval(syncCountInterval);
    };
  }, []);

  const installPWA = async (): Promise<boolean> => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setCanInstallState(false);
      
      if (outcome === 'accepted') {
        setIsPWAInstalledState(true);
        return true;
      }
    }
    return false;
  };

  const refreshApp = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  };

  const contextValue: PWAContextType = {
    isOnline: isOnlineState,
    isPWAInstalled: isPWAInstalledState,
    canInstall: canInstallState,
    pendingSyncCount,
    installPWA,
    refreshApp,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* PWA Install Banner */}
      {canInstallState && !isPWAInstalledState && (
        <PWAInstallBanner onInstall={installPWA} onDismiss={() => setCanInstallState(false)} />
      )}
      
      {/* Offline Indicator */}
      {!isOnlineState && <OfflineIndicator pendingCount={pendingSyncCount} />}
      
      {/* Update Available Banner */}
      <UpdateAvailableBanner onUpdate={refreshApp} />
    </PWAContext.Provider>
  );
}

// PWA Install Banner Component
interface PWAInstallBannerProps {
  onInstall: () => Promise<boolean>;
  onDismiss: () => void;
}

function PWAInstallBanner({ onInstall, onDismiss }: PWAInstallBannerProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const installed = await onInstall();
      if (installed) {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium">Install App</h3>
            <p className="text-xs text-blue-100 mt-1">
              Install UPSA Attendance for quick access and offline functionality.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 bg-white text-blue-600 text-xs font-medium py-2 px-3 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-blue-100 text-xs font-medium py-2 px-3 rounded hover:bg-blue-700"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

// Offline Indicator Component
interface OfflineIndicatorProps {
  pendingCount: { attendance: number; verifications: number };
}

function OfflineIndicator({ pendingCount }: OfflineIndicatorProps) {
  const totalPending = pendingCount.attendance + pendingCount.verifications;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-orange-500 text-white rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">You're offline</p>
            {totalPending > 0 && (
              <p className="text-xs text-orange-100">
                {totalPending} item{totalPending !== 1 ? 's' : ''} pending sync
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Update Available Banner Component
function UpdateAvailableBanner({ onUpdate }: { onUpdate: () => void }) {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    const handleServiceWorkerUpdate = () => {
      setShowUpdate(true);
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleServiceWorkerUpdate);
      
      // Check for waiting service worker
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration && registration.waiting) {
          setShowUpdate(true);
        }
      });
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleServiceWorkerUpdate);
      }
    };
  }, []);

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-green-600 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium">Update Available</h3>
            <p className="text-xs text-green-100 mt-1">
              A new version of the app is available.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onUpdate}
            className="flex-1 bg-white text-green-600 text-xs font-medium py-2 px-3 rounded hover:bg-green-50"
          >
            Update Now
          </button>
          <button
            onClick={() => setShowUpdate(false)}
            className="text-green-100 text-xs font-medium py-2 px-3 rounded hover:bg-green-700"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}