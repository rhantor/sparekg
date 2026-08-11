'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  /** Called when a confirmed photo is discarded, so the parent can drop it too. */
  onReset?: () => void;
  label?: string;
}

/**
 * Works out why the browser will refuse before we call getUserMedia, so a
 * silent rejection (no permission prompt) can be explained instead of guessed
 * at. Returns null when there is no known blocker.
 */
async function preflightBlocker(): Promise<string | null> {
  // A previously-denied camera permission is sticky: the browser rejects
  // instantly and never re-prompts, which reads as "nothing happened".
  try {
    const status = await navigator.permissions?.query({ name: 'camera' as PermissionName });
    if (status?.state === 'denied') {
      return 'Camera access is blocked for this site. Click the camera or lock icon in the address bar, set Camera to “Allow”, then reload the page.';
    }
  } catch {
    // Firefox/Safari don't support the camera permission name — carry on.
  }

  // A desktop with no webcam also rejects with no prompt at all.
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    if (devices.length > 0 && !devices.some((d) => d.kind === 'videoinput')) {
      return 'No camera was found on this device. Connect a webcam, or continue on a phone.';
    }
  } catch {
    // enumerateDevices can throw in locked-down contexts — let getUserMedia try.
  }

  return null;
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow it via the icon in the address bar, and check Windows Settings → Privacy → Camera lets your browser use it.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this device. Connect a webcam, or continue on a phone.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Your camera is already in use by another app (Teams, Zoom, Camera). Close it and try again.';
    case 'OverconstrainedError':
      return 'This device has no front-facing camera we can use.';
    default:
      return `Could not start the camera${name ? ` (${name})` : ''}. Please try again.`;
  }
}

export function CameraCapture({ onCapture, onReset, label = 'Take a Selfie' }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unmountedRef = useRef(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [ready, setReady] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isCameraActive = stream !== null;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setReady(false);
    setStalled(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);

    // getUserMedia only exists on https / localhost — the usual cause of a dead
    // camera when testing over a LAN IP.
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext
          ? 'This browser does not support camera capture. Try Chrome, Edge or Safari.'
          : 'The camera needs a secure connection. Open this page over https (or on localhost) and try again.'
      );
      return;
    }

    setStarting(true);
    try {
      const blocker = await preflightBlocker();
      if (blocker) {
        setError(blocker);
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      // Unmounted while the permission prompt was open — don't leak the camera.
      if (unmountedRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      console.error('Camera error:', err);
      setError(cameraErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }, []);

  // Attach the stream *after* the <video> element has mounted.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    // Safari/iOS ignores `autoplay` for srcObject often enough to warrant this.
    video.play().catch(() => {
      /* the readiness poll below still frees the shutter once frames arrive */
    });

    // `canplay`/`loadedmetadata` are unreliable for MediaStream sources across
    // browsers, so treat a non-zero frame size as the real readiness signal
    // rather than trusting any single event to fire.
    const poll = window.setInterval(() => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setReady(true);
        setStalled(false);
        window.clearInterval(poll);
      }
    }, 150);

    const stallTimer = window.setTimeout(() => {
      if (!(video.videoWidth > 0)) setStalled(true);
    }, 6000);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stallTimer);
      video.srcObject = null;
    };
  }, [stream]);

  // Release the preview URL on retake and on unmount.
  useEffect(() => {
    const url = photo?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo?.url]);

  useEffect(() => {
    // Must be reset on every mount: StrictMode unmounts and remounts once in
    // dev, and a ref left at `true` would make startCamera kill each stream it
    // acquires, giving a dead preview with no error.
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Drawn unmirrored: the preview is flipped for comfort, but the stored
    // image has to match the ID document.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Could not capture the photo. Please try again.');
          return;
        }
        setPhoto({ url: URL.createObjectURL(blob), file: new File([blob], 'selfie.jpg', { type: 'image/jpeg' }) });
        stopCamera();
      },
      'image/jpeg',
      0.9
    );
  };

  const handleRetake = () => {
    setPhoto(null);
    // Drop the already-confirmed file upstream too, otherwise abandoning the
    // retake would submit the previous selfie.
    if (confirmed) onReset?.();
    setConfirmed(false);
    startCamera();
  };

  const handleConfirm = () => {
    if (!photo) return;
    onCapture(photo.file);
    setConfirmed(true);
  };

  return (
    <div className="w-full border rounded-lg overflow-hidden bg-slate-900 border-slate-700">
      <div className="p-3 bg-slate-800 border-b border-slate-700 font-medium text-slate-200">{label}</div>

      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="Captured selfie" className="w-full h-full object-cover" />
            {confirmed && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-emerald-600/90 py-2 text-white text-sm font-medium">
                <Check className="w-4 h-4" /> Selfie confirmed
              </div>
            )}
          </>
        ) : isCameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setReady(true)}
              onPlaying={() => setReady(true)}
              className="w-full h-full object-cover transform -scale-x-100"
            />
            {!ready && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center bg-black/60">
                <p className="text-slate-300 text-sm">Starting camera…</p>
                {stalled && (
                  <p className="text-amber-400 text-xs max-w-xs">
                    The camera is on but sending no picture. Close any other app using it, or reopen this page in
                    Chrome or Safari rather than an in-app browser.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 flex flex-col items-center gap-2 p-4 text-center">
            <Camera className="w-12 h-12 opacity-50" />
            {error && <p className="text-red-400 text-sm max-w-sm">{error}</p>}
            <button
              onClick={startCamera}
              disabled={starting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {starting ? 'Starting…' : error ? 'Try again' : 'Start Camera'}
            </button>
          </div>
        )}

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {isCameraActive && !photo && (
        <div className="p-4 flex justify-center bg-slate-800">
          <button
            onClick={handleCapture}
            disabled={!ready}
            className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 hover:bg-slate-200 disabled:opacity-40 transition-colors focus:outline-none focus:ring-4 focus:ring-blue-500"
            aria-label="Take photo"
          />
        </div>
      )}

      {photo && (
        <div className="p-4 flex justify-between gap-4 bg-slate-800">
          <button
            onClick={handleRetake}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded bg-slate-700 text-white hover:bg-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Retake
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmed}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400 transition-colors"
          >
            <Check className="w-4 h-4" /> {confirmed ? 'Confirmed' : 'Use this photo'}
          </button>
        </div>
      )}
    </div>
  );
}
