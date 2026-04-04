import React, { useState, useEffect } from 'react';
import { Camera, CameraOff, Loader2, AlertCircle } from 'lucide-react';
import { authFetch, API_URL } from '../utils/api';

export function RtspDetection({ cameraId, isDetecting }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // Inicializar transmisión en Backend al montar
  useEffect(() => {
    let active = true;

    const startBackendProcessing = async () => {
      try {
        setHasPermission(null);
        setCameraError(null);
        
        const res = await authFetch(`${API_URL}/api/processing/start/${cameraId}`, {
          method: 'POST'
        });
        
        if (res.ok) {
          if (active) setHasPermission(true);
        } else {
          throw new Error('No se pudo conectar al Stream RTSP del Backend');
        }
      } catch (err) {
        if (active) {
          setCameraError("Fallo de conexión RTSP: El stream no está accesible o el servidor externo está apagado.");
          setHasPermission(false);
        }
      }
    };

    if (isDetecting && cameraId) {
      startBackendProcessing();
    }

    // Limpieza: Detener procesamiento en backend al desmontar el componente RTSP
    return () => {
      active = false;
      authFetch(`${API_URL}/api/processing/stop/${cameraId}`, {
        method: 'POST'
      }).catch(e => console.error("Error al detener RTSP", e));
    };
  }, [cameraId, isDetecting]);

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 0, backgroundColor: 'var(--bg-card)' }}>
      {cameraError ? (
         <div style={{ padding: '2rem', textAlign: 'center' }}>
           <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>⚠️</span>
           <h3 style={{ color: 'var(--accent-danger)', marginBottom: '0.5rem' }}>Error de Conexión IP / RTSP</h3>
           <p style={{ color: 'var(--text-secondary)' }}>{cameraError}</p>
         </div>
      ) : !hasPermission && hasPermission !== null ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <AlertCircle style={{ width: '3rem', height: '3rem', color: 'var(--danger)', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '1rem' }}>Acceso denegado</p>
        </div>
      ) : hasPermission === null ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-primary)' }}>
          <Loader2 style={{ width: '3rem', height: '3rem', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p>Conectando al stream de red...</p>
        </div>
      ) : (
        <img 
          src={isDetecting ? `${API_URL}/api/processing/video_feed/${cameraId}?token=${localStorage.getItem('token')}` : ''}
          alt="Transmisión RTSP"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: hasPermission ? 1 : 0,
            transition: 'opacity 0.5s'
          }}
          onError={() => {
            setCameraError("Perdida de frames. El servidor MJPEG ha dejado de responder.");
            setHasPermission(false);
          }}
        />
      )}

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
            {isDetecting ? "ANALIZANDO RTSP (MJPEG)" : "PAUSADO"}
          </div>
          
          {/* El badge de Procesando no se incluye aquí porque el procesamiento 
              lo hace Python directamente y no el framework de react */}
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
          // Se inhabilita el click local para apagar, se maneja globalmente con isDetecting en LiveView
        >
          {hasPermission && isDetecting ? <Camera style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} /> : <CameraOff style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />}
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
