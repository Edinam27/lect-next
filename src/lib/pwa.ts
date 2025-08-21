'use client';

// PWA Service for managing Progressive Web App functionality
export class PWAService {
  private static instance: PWAService;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private db: IDBDatabase | null = null;
  private dbName = 'upsa-attendance-db';
  private dbVersion = 1;

  private constructor() {
    this.initializeDB();
  }

  public static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  // Initialize IndexedDB for offline storage
  private async initializeDB(): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for offline data
        if (!db.objectStoreNames.contains('pendingAttendance')) {
          const attendanceStore = db.createObjectStore('pendingAttendance', {
            keyPath: 'id',
            autoIncrement: true
          });
          attendanceStore.createIndex('timestamp', 'timestamp', { unique: false });
          attendanceStore.createIndex('userId', 'userId', { unique: false });
        }

        if (!db.objectStoreNames.contains('pendingVerifications')) {
          const verificationStore = db.createObjectStore('pendingVerifications', {
            keyPath: 'id',
            autoIncrement: true
          });
          verificationStore.createIndex('timestamp', 'timestamp', { unique: false });
          verificationStore.createIndex('userId', 'userId', { unique: false });
        }

        if (!db.objectStoreNames.contains('cachedData')) {
          const cacheStore = db.createObjectStore('cachedData', {
            keyPath: 'key'
          });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('userPreferences')) {
          db.createObjectStore('userPreferences', {
            keyPath: 'key'
          });
        }
      };
    });
  }

  // Register service worker
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      this.swRegistration = registration;

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              this.showUpdateAvailableNotification();
            }
          });
        }
      });

      console.log('Service Worker registered successfully');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  // Show update available notification
  private showUpdateAvailableNotification(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const notification = new Notification('App Update Available', {
        body: 'A new version of the app is available. Refresh to update.',
        icon: '/icons/icon-192x192.png',
        tag: 'app-update'
      });

      notification.onclick = () => {
        window.location.reload();
      };
    }
  }

  // Request notification permission
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  // Store attendance record for offline sync
  public async storeOfflineAttendance(attendanceData: any): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['pendingAttendance'], 'readwrite');
      const store = transaction.objectStore('pendingAttendance');

      const data = {
        ...attendanceData,
        timestamp: new Date().toISOString(),
        synced: false
      };

      const request = store.add(data);

      request.onsuccess = () => {
        console.log('Attendance stored for offline sync');
        this.scheduleBackgroundSync('attendance-sync');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to store attendance for offline sync');
        reject(request.error);
      };
    });
  }

  // Store verification record for offline sync
  public async storeOfflineVerification(verificationData: any): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['pendingVerifications'], 'readwrite');
      const store = transaction.objectStore('pendingVerifications');

      const data = {
        ...verificationData,
        timestamp: new Date().toISOString(),
        synced: false
      };

      const request = store.add(data);

      request.onsuccess = () => {
        console.log('Verification stored for offline sync');
        this.scheduleBackgroundSync('verification-sync');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to store verification for offline sync');
        reject(request.error);
      };
    });
  }

  // Schedule background sync
  private async scheduleBackgroundSync(tag: string): Promise<void> {
    if (this.swRegistration && 'sync' in this.swRegistration) {
      try {
        await this.swRegistration.sync.register(tag);
        console.log(`Background sync scheduled: ${tag}`);
      } catch (error) {
        console.error(`Failed to schedule background sync: ${tag}`, error);
      }
    }
  }

  // Cache data for offline access
  public async cacheData(key: string, data: any, ttl: number = 3600000): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');

      const cacheData = {
        key,
        data,
        timestamp: Date.now(),
        ttl
      };

      const request = store.put(cacheData);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get cached data
  public async getCachedData(key: string): Promise<any | null> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Check if data is still valid (not expired)
          const now = Date.now();
          if (now - result.timestamp < result.ttl) {
            resolve(result.data);
          } else {
            // Data expired, remove it
            this.removeCachedData(key);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Remove cached data
  public async removeCachedData(key: string): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Get pending sync items count
  public async getPendingSyncCount(): Promise<{ attendance: number; verifications: number }> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['pendingAttendance', 'pendingVerifications'], 'readonly');
      
      let attendanceCount = 0;
      let verificationsCount = 0;
      let completed = 0;

      const attendanceRequest = transaction.objectStore('pendingAttendance').count();
      attendanceRequest.onsuccess = () => {
        attendanceCount = attendanceRequest.result;
        completed++;
        if (completed === 2) {
          resolve({ attendance: attendanceCount, verifications: verificationsCount });
        }
      };

      const verificationsRequest = transaction.objectStore('pendingVerifications').count();
      verificationsRequest.onsuccess = () => {
        verificationsCount = verificationsRequest.result;
        completed++;
        if (completed === 2) {
          resolve({ attendance: attendanceCount, verifications: verificationsCount });
        }
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  // Check if app is running in standalone mode (installed as PWA)
  public isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  // Check if app can be installed
  public canInstall(): boolean {
    return typeof window !== 'undefined' && 'beforeinstallprompt' in window;
  }

  // Show install prompt
  public async showInstallPrompt(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const deferredPrompt = (window as any).deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      (window as any).deferredPrompt = null;
      return outcome === 'accepted';
    }
    return false;
  }

  // Get network status
  public getNetworkStatus(): { online: boolean; effectiveType?: string } {
    if (typeof window === 'undefined') {
      return { online: true };
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType
    };
  }

  // Clean up old cached data
  public async cleanupOldCache(): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      const index = store.index('timestamp');
      
      const now = Date.now();
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const data = cursor.value;
          if (now - data.timestamp > data.ttl) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const pwaService = PWAService.getInstance();

// Types for offline data
export interface OfflineAttendanceData {
  scheduleId: string;
  userId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
  timestamp: string;
}

export interface OfflineVerificationData {
  attendanceId: string;
  userId: string;
  status: 'VERIFIED' | 'DISPUTED';
  notes?: string;
  timestamp: string;
}

// Utility functions
export const isOnline = (): boolean => {
  return typeof window !== 'undefined' ? navigator.onLine : true;
};

export const isPWAInstalled = (): boolean => {
  return pwaService.isStandalone();
};

export const canInstallPWA = (): boolean => {
  return pwaService.canInstall();
};