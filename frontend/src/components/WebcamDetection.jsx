import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Loader2, User, UserRound, AlertCircle, Maximize, Minimize } from 'lucide-react';
import { authFetch, API_URL } from '../utils/api';

const playBeep = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6 - más agudo y notorio
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime); // Volumen inicial más alto
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2); // Más largo
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(150, ctx.currentTime);
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.2);
      }, 200);
    }
  } catch (e) {
    console.error("Audio beep error:", e);
  }
};

export function WebcamDetection({ onDetection, isDetecting, cameraId = 1, deviceId, hardwareLabel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const prevResultRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [videoDims, setVideoDims] = useState({ width: 1280, height: 720 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (lastResult && lastResult.length > 0) {
      const prev = prevResultRef.current;
      const hasSpoof = lastResult.some(d => d.gender === 'spoof');
      const hadSpoof = prev && prev.some(d => d.gender === 'spoof');
      const wasEmpty = !prev || prev.length === 0;

      if (wasEmpty) {
        playBeep(hasSpoof ? 'error' : 'success');
      } else if (hasSpoof && !hadSpoof) {
        playBeep('error');
      }
    }
    prevResultRef.current = lastResult;
  }, [lastResult]);

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
          // Por retrocompatibilidad, pasamos el primero o un resumen
          onDetection(result.detections[0].gender);
        } else {
          setLastResult([]);
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
      }, 800); // Polling más rápido (800ms) para un seguimiento más fluido
    }
    return () => clearInterval(interval);
  }, [isDetecting, captureAndDetect]);

  return (
    <div ref={containerRef} className="card" style={{ position: 'relative', overflow: 'hidden', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 0, backgroundColor: 'var(--bg-card)' }}>
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
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setVideoDims({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
              });
            }
          }}
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
        <svg 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            pointerEvents: 'none',
            opacity: hasPermission ? 1 : 0,
            zIndex: 10
          }}
          viewBox={`0 0 ${videoDims.width} ${videoDims.height}`}
          preserveAspectRatio="xMidYMid slice"
        >
          {lastResult && Array.isArray(lastResult) && lastResult.map((det, idx) => {
            if (!det.box) return null;
            const [x, y, w, h] = det.box;
            const isSpoof = det.gender === 'spoof';
            const color = isSpoof ? '#ef4444' : '#10b981';
            
            let labelText = 'DESCONOCIDO';
            let isRegistered = false;
            
            if (isSpoof) {
              labelText = 'FOTO/SUPLANTACIÓN';
            } else if (det.person_name && !det.person_name.startsWith('Anon-') && det.person_name !== 'Desconocido') {
              labelText = det.person_name.toUpperCase();
              isRegistered = true;
            } else if (det.gender === 'male') {
              labelText = 'HOMBRE';
            } else if (det.gender === 'female') {
              labelText = 'MUJER';
            }
            
            // Si es registrado, mostramos solo el nombre (o nombre + edad si quisiéramos).
            // Si no, mostramos el género y el nivel de confianza.
            const text = isSpoof ? labelText : (isRegistered ? labelText : `${labelText} ${Math.round(det.confidence * 100)}%`);
            
            return (
              <g key={idx}>
                <rect 
                  x={x} y={y} width={w} height={h} 
                  fill="none" stroke={color} strokeWidth="4" 
                  style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
                <foreignObject 
                  x={x} y={y > 24 ? y - 24 : y} width={Math.max(w, 200)} height="24"
                  style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflow: 'visible' }}
                >
                  <div style={{
                    display: 'inline-block',
                    background: isSpoof ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    fontFamily: 'Inter, sans-serif',
                    padding: '2px 8px',
                    whiteSpace: 'nowrap'
                  }}>
                    {text}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <button 
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 30,
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(4px)',
          color: 'white',
          padding: '0.5rem',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>

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
                      : (det.person_name && !det.person_name.startsWith('Anon-') && det.person_name !== 'Desconocido')
                        ? `IDENTIDAD: ${det.person_name.toUpperCase()}`
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
