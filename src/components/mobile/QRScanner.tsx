'use client';

import { useState, useRef, useEffect } from 'react';
import {
  XMarkIcon,
  CameraIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
}

interface ScanResult {
  data: string;
  timestamp: number;
}

export default function QRScanner({ isOpen, onClose, onScan, title = 'Scan QR Code' }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      cleanup();
    }

    return cleanup;
  }, [isOpen]);

  const initializeCamera = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start scanning after video loads
        videoRef.current.onloadedmetadata = () => {
          startScanning();
        };
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      setHasPermission(false);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera is not supported in this browser.');
        } else {
          setError(err.message || 'Failed to access camera');
        }
      } else {
        setError('Failed to access camera');
      }
      
      setIsScanning(false);
    }
  };

  const startScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    // Scan every 500ms
    scanIntervalRef.current = setInterval(() => {
      scanFrame();
    }, 500);
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Get image data for QR code detection
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Simple QR code detection simulation
      // In a real implementation, you would use a library like jsQR
      const qrData = detectQRCode(imageData);
      
      if (qrData) {
        handleScanResult(qrData);
      }
    } catch (err) {
      console.error('Scan error:', err);
    }
  };

  // Simulated QR code detection
  // In production, replace this with a real QR code library like jsQR
  const detectQRCode = (imageData: ImageData): string | null => {
    // This is a placeholder implementation
    // In a real app, you would use a library like jsQR:
    // import jsQR from 'jsqr';
    // const code = jsQR(imageData.data, imageData.width, imageData.height);
    // return code ? code.data : null;
    
    // For demo purposes, simulate finding a QR code occasionally
    if (Math.random() < 0.1) { // 10% chance to simulate finding a QR code
      const studentIds = ['STU001', 'STU002', 'STU003', 'STU004', 'STU005'];
      return studentIds[Math.floor(Math.random() * studentIds.length)];
    }
    
    return null;
  };

  const handleScanResult = (data: string) => {
    const now = Date.now();
    
    // Prevent duplicate scans within 2 seconds
    if (lastScan && now - lastScan.timestamp < 2000 && lastScan.data === data) {
      return;
    }

    setLastScan({ data, timestamp: now });
    
    // Provide haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    // Call the onScan callback
    onScan(data);
    
    // Close scanner after successful scan
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const cleanup = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsScanning(false);
    setError(null);
    setLastScan(null);
  };

  const retryCamera = () => {
    cleanup();
    initializeCamera();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black text-white p-4 safe-area-top flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative overflow-hidden">
        {hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <CameraIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Initializing camera...</p>
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-black p-6">
            <div className="text-center text-white max-w-sm">
              <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-2">Camera Access Required</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <button
                onClick={retryCamera}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        )}

        {hasPermission && (
          <>
            {/* Video Element */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />

            {/* Hidden Canvas for Processing */}
            <canvas
              ref={canvasRef}
              className="hidden"
            />

            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Scanning Frame */}
              <div className="relative">
                <div className="w-64 h-64 border-2 border-white rounded-lg relative">
                  {/* Corner Indicators */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                  
                  {/* Scanning Line */}
                  {isScanning && (
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-blue-400 animate-pulse" />
                  )}
                </div>
                
                {/* Instructions */}
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
                  <p className="text-white text-sm">
                    {isScanning ? 'Position QR code within the frame' : 'Preparing scanner...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Indicator */}
            {isScanning && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Scanning...
              </div>
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-black text-white p-4 safe-area-bottom">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-300">
            Point your camera at a QR code to scan
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span>• Hold steady</span>
            <span>• Ensure good lighting</span>
            <span>• Keep QR code in frame</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Manual Input Fallback Component
interface ManualInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: string) => void;
  placeholder?: string;
  title?: string;
}

export function ManualInput({ 
  isOpen, 
  onClose, 
  onSubmit, 
  placeholder = 'Enter student ID',
  title = 'Manual Entry'
}: ManualInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
          
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}