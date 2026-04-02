import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Loader2, User, UserRound, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export function WebcamDetection({ onDetection, isDetecting, cameraId = 1, deviceId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const startCamera = async () => {
    stopCamera(); // Detener cualquier stream anterior
    try {
      const videoConstraints = { width: 1280, height: 720 };
      if (deviceId && deviceId.length > 5 && deviceId !== 'CUSTOM') {
        videoConstraints.deviceId = { exact: deviceId };
      } else {
        videoConstraints.facingMode = 'user';
      }
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
      } catch (innerErr) {
        if (innerErr.name === 'OverconstrainedError' || innerErr.name === 'NotReadableError') {
          console.warn("No se pudo usar la cámara exacta (OverconstrainedError). Usando cámara por defecto.");
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        } else {
          throw innerErr;
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureAndDetect = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isDetecting || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageDataUri = canvas.toDataURL('image/jpeg', 0.8);
      
      setIsProcessing(true);
      try {
        const response = await fetch(`${API_URL}/api/detections/analyze_frame`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_base64: imageDataUri,
            camera_id: cameraId
          })
        });
        
        if (!response.ok) throw new Error('API Error');
        
        const result = await response.json();
        setLastResult(result.gender);
        onDetection(result.gender);
      } catch (error) {
        console.error("Detection error:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [isDetecting, isProcessing, onDetection, cameraId]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [deviceId]); // Reiniciar la cámara si el hardware seleccionado cambia

  useEffect(() => {
    let interval;
    if (isDetecting) {
      interval = setInterval(() => {
        captureAndDetect();
      }, 3000); // 3 seconds interval is fine for local backend
    }
    return () => clearInterval(interval);
  }, [isDetecting, captureAndDetect]);

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
      {!hasPermission && hasPermission !== null && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle style={{ width: '3rem', height: '3rem', color: 'var(--danger)', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '1rem' }}>Acceso a cámara denegado</p>
          <button className="btn btn-primary" onClick={startCamera}>Reintentar</button>
        </div>
      )}

      {hasPermission === null && (
        <Loader2 style={{ width: '2rem', height: '2rem', color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
      )}

      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: hasPermission ? 1 : 0,
          transition: 'opacity 0.5s'
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {hasPermission && (
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 20 }}>
          <div className="status-badge" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ 
              width: '0.5rem', 
              height: '0.5rem', 
              borderRadius: '50%', 
              backgroundColor: isDetecting ? 'var(--success)' : 'var(--danger)',
              animation: isDetecting ? 'pulse 2s infinite' : 'none'
            }} />
            {isDetecting ? "ANALIZANDO EN TIEMPO REAL" : "PAUSADO"}
          </div>
          
          {isProcessing && (
            <div className="status-badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: 'var(--accent-primary)' }}>
              <Loader2 style={{ width: '0.75rem', height: '0.75rem', animation: 'spin 1s linear infinite' }} />
              PROCESANDO...
            </div>
          )}

          {lastResult && lastResult !== 'none_detected' && !isProcessing && (
            <div className="status-badge" style={{ backgroundColor: 'var(--accent-secondary)', color: 'white' }}>
              {lastResult === 'male' ? <User style={{ width: '1rem', height: '1rem' }} /> : <UserRound style={{ width: '1rem', height: '1rem' }} />}
              {lastResult === 'male' ? "HOMBRE DETECTADO" : "MUJER DETECTADA"}
            </div>
          )}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 20 }}>
        <button 
          className="btn"
          style={{ 
            borderRadius: '50%', 
            width: '3rem', 
            height: '3rem', 
            padding: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={hasPermission ? stopCamera : startCamera}
        >
          {hasPermission ? <Camera style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} /> : <CameraOff style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />}
        </button>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
