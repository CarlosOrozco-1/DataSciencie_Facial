import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Loader2, User, UserRound, AlertCircle } from 'lucide-react';
import { authFetch, API_URL } from '../utils/api';

export function WebcamDetection({ onDetection, isDetecting, cameraId = 1, deviceId, hardwareLabel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const startCamera = async () => {
    stopCamera(); // Detener cualquier stream anterior
    try {
      let stream;
      try {
        const videoConstraints = { width: 1280, height: 720 };
        
        if (hardwareLabel || (deviceId && deviceId !== 'CUSTOM')) {
          
          if (hardwareLabel) {
            // ======== NUEVO: MATCH POR HARDWARE LABEL (SEGURO/ESTABLE) ========
            await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(e => console.error(e));
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            const matchedDevice = videoDevices.find(d => d.label === hardwareLabel);
            
            if (matchedDevice && matchedDevice.deviceId) {
              videoConstraints.deviceId = { exact: matchedDevice.deviceId };
            } else {
              throw { name: 'DeviceIndexError' }; // Dispositivo físico no encontrado
            }
          }
          // Si el ID es un número simple "0", "1", "2" (estilo OpenCV retrocompatibilidad)
          else if (!isNaN(deviceId) && deviceId.trim() !== '' && deviceId.length < 5) {
            // Pedimos permiso temporal y rápido para asegurar que deviceId se revele
            await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(e => console.error(e));
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            const idx = parseInt(deviceId, 10);
            
            if (videoDevices[idx]) {
              videoConstraints.deviceId = { exact: videoDevices[idx].deviceId };
            } else {
              throw { name: 'DeviceIndexError' }; // No existe tal índice
            }
          } else {
            // Si es un Hash seguro autogenerado
            videoConstraints.deviceId = { exact: deviceId };
          }
        } else {
          videoConstraints.facingMode = 'user';
        }

        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        setCameraError(null);
      } catch (innerErr) {
        // ABOLIMOS el fallback automático. Si la cámara esperada no está, es mejor FALLAR que inyectar datos en la ID incorrecta.
        if (innerErr.name === 'OverconstrainedError' || innerErr.name === 'NotReadableError' || innerErr.name === 'DeviceIndexError') {
          console.warn("Dispositivo inalcanzable. Bloqueando streams cruzados para proteger los datos.");
          setCameraError("Cámara inaccesible. Verifique la conexión física de esta cámara con ID " + (deviceId || 'por defecto') + ". La lectura de datos ha sido bloqueada por seguridad cruzada.");
          return;
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
      setCameraError("Permiso denegado o no hay cámaras disponibles.");
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
        const response = await authFetch(`${API_URL}/api/detections/analyze_frame`, {
          method: 'POST',
          body: JSON.stringify({
            image_base64: imageDataUri,
            camera_id: cameraId
          })
        });
        
        if (!response.ok) throw new Error('API Error');
        
        const result = await response.json();
        if (result.detections && result.detections.length > 0) {
          setLastResult(result.detections);
          drawBoundingBoxes(result.detections);
          // Por retrocompatibilidad, pasamos el primero o un resumen
          onDetection(result.detections[0].gender);
        } else {
          setLastResult([]);
          drawBoundingBoxes([]);
          onDetection('none_detected');
        }
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

  const drawBoundingBoxes = useCallback((detections) => {
    if (!overlayRef.current || !videoRef.current) return;
    const canvas = overlayRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!detections || detections.length === 0) return;
    
    detections.forEach(det => {
      if (det.box) {
        const [x, y, w, h] = det.box;
        ctx.strokeStyle = det.gender === 'spoof' ? '#ef4444' : '#10b981';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, w, h);
        
        ctx.fillStyle = det.gender === 'spoof' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
        let labelText = '';
        if (det.gender === 'spoof') {
            labelText = 'FOTO/SUPLANTACIÓN';
        } else if (det.gender === 'male') {
            labelText = 'HOMBRE';
        } else if (det.gender === 'female') {
            labelText = 'MUJER';
        } else {
            labelText = 'DESCONOCIDO';
        }
        
        const text = det.gender === 'spoof' ? labelText : `${labelText} ${Math.round(det.confidence * 100)}%`;
        ctx.font = 'bold 16px Inter, sans-serif';
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(x, y > 24 ? y - 24 : y, textWidth + 10, 24);
        
        ctx.fillStyle = 'white';
        ctx.fillText(text, x + 5, y > 24 ? y - 6 : y + 18);
      }
    });
  }, []);

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 0, backgroundColor: 'var(--bg-card)' }}>
      {cameraError ? (
         <div style={{ padding: '2rem', textAlign: 'center' }}>
           <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⚠️</span>
           <h3 style={{ color: 'var(--accent-danger)', marginBottom: '0.5rem' }}>Error de Cámara</h3>
           <p style={{ color: 'var(--text-secondary)' }}>{cameraError}</p>
         </div>
      ) : !hasPermission && hasPermission !== null && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle style={{ width: '3rem', height: '3rem', color: 'var(--danger)', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '1rem' }}>Acceso a cámara denegado</p>
          <button className="btn btn-primary" onClick={startCamera}>Reintentar</button>
        </div>
      )}

      {hasPermission === null && (
        <Loader2 style={{ width: '2rem', height: '2rem', color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
      )}

      <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '400px' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: hasPermission ? 1 : 0,
            transition: 'opacity 0.5s'
          }}
        />
        <canvas 
          ref={overlayRef} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            pointerEvents: 'none',
            opacity: hasPermission ? 1 : 0,
            zIndex: 10
          }} 
        />
      </div>
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

          {lastResult && Array.isArray(lastResult) && lastResult.length > 0 && !isProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {lastResult.map((det, idx) => (
                <div key={idx} className="status-badge" style={{ 
                  backgroundColor: det.gender === 'spoof' ? 'var(--danger)' : det.gender === 'unknown' ? 'var(--text-secondary)' : 'var(--accent-secondary)', 
                  color: 'white',
                  fontSize: '0.8rem'
                }}>
                  {det.gender === 'spoof' ? (
                     <AlertCircle style={{ width: '1rem', height: '1rem' }} />
                  ) : det.gender === 'male' ? (
                     <User style={{ width: '1rem', height: '1rem' }} />
                  ) : (
                     <UserRound style={{ width: '1rem', height: '1rem' }} />
                  )}
                  {det.gender === 'spoof' 
                    ? "SUPLANTACIÓN (FOTO)" 
                    : det.gender === 'unknown'
                      ? "ROSTRO BORROSO"
                      : det.gender === 'male' 
                        ? `HOMBRE DETECTADO (${Math.round(det.confidence * 100)}%)` 
                        : `MUJER DETECTADA (${Math.round(det.confidence * 100)}%)`
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      )}


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
