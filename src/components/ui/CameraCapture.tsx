'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, Check, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  label?: string;
}

export function CameraCapture({ onCapture, label = "Take a Selfie" }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Start the camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please check your permissions.");
    }
  }, []);

  // Stop the camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Capture photo
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw image
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPhotoData(dataUrl);
        stopCamera();
      }
    }
  };

  // Retake photo
  const handleRetake = () => {
    setPhotoData(null);
    startCamera();
  };

  // Confirm photo
  const handleConfirm = () => {
    if (photoData) {
      // Convert Data URL to File object
      fetch(photoData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
          onCapture(file);
        });
    }
  };

  return (
    <div className="w-full border rounded-lg overflow-hidden bg-slate-900 border-slate-700">
      <div className="p-3 bg-slate-800 border-b border-slate-700 font-medium text-slate-200">
        {label}
      </div>
      
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        {error ? (
          <div className="p-4 text-red-400 text-center text-sm">{error}</div>
        ) : photoData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoData} alt="Captured selfie" className="w-full h-full object-cover" />
        ) : isCameraActive ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform -scale-x-100" 
          />
        ) : (
          <div className="text-slate-500 flex flex-col items-center">
            <Camera className="w-12 h-12 mb-2 opacity-50" />
            <button 
              onClick={startCamera}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Start Camera
            </button>
          </div>
        )}
        
        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {isCameraActive && !photoData && (
        <div className="p-4 flex justify-center bg-slate-800">
          <button 
            onClick={handleCapture}
            className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500"
            aria-label="Take photo"
          />
        </div>
      )}

      {photoData && (
        <div className="p-4 flex justify-between gap-4 bg-slate-800">
          <button 
            onClick={handleRetake}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded bg-slate-700 text-white hover:bg-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retake
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <Check className="w-4 h-4" /> Confirm
          </button>
        </div>
      )}
    </div>
  );
}
