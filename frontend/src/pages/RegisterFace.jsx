import React, { useRef, useState, useCallback } from 'react';
import { Camera, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { authFetch, API_URL } from '../utils/api';

export default function RegisterFace() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [name, setName] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setMessage(null);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setMessage({ type: 'error', text: 'No se pudo acceder a la cámara. Revisa los permisos de tu navegador.' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Detener la cámara al desmontar el componente
  React.useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleRegister = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Por favor, ingresa el nombre de la persona.' });
      return;
    }
    if (!isCameraActive || !videoRef.current) {
      setMessage({ type: 'error', text: 'La cámara debe estar activa para tomar la foto.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    // Dibujar el frame actual del video en el canvas
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Obtener la imagen en base64 (JPEG)
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const response = await authFetch(`${API_URL}/api/detections/register_face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          image_base64: base64Image
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Ocurrió un error al registrar el rostro.');
      }

      setMessage({ type: 'success', text: `¡Registro exitoso! Identidad guardada como: ${data.name}` });
      setName(''); // Limpiar campo
      
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <UserPlus style={{ color: 'var(--accent-primary)', width: '2rem', height: '2rem' }} />
          Registro Voluntario de Rostro
        </h1>
        <p className="page-subtitle" style={{ margin: 0 }}>
          Registra la identidad de una persona en la base de datos para que el sistema la reconozca automáticamente.
        </p>
      </header>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${message.type === 'error' ? 'var(--danger)' : 'var(--success)'}`,
          color: message.type === 'error' ? '#fca5a5' : '#6ee7b7'
        }}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre Completo o Identificador</label>
            <input 
              type="text" 
              placeholder="Ej. Juan Pérez" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'white'
              }}
            />
          </div>

          <div style={{ 
            width: '100%', 
            aspectRatio: '4/3', 
            backgroundColor: '#000', 
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {!isCameraActive && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <Camera size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <button className="btn btn-primary" onClick={startCamera}>
                  Encender Cámara
                </button>
              </div>
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
                display: isCameraActive ? 'block' : 'none',
                transform: 'scaleX(-1)' // Modo espejo
              }} 
            />
            {/* Canvas oculto para capturar el frame */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            {isCameraActive && (
              <button 
                className="btn" 
                onClick={stopCamera}
                style={{ backgroundColor: 'var(--border-subtle)', color: 'white' }}
              >
                Apagar Cámara
              </button>
            )}
            <button 
              className="btn btn-primary" 
              onClick={handleRegister}
              disabled={!isCameraActive || isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isLoading ? (
                <>Procesando...</>
              ) : (
                <>
                  <Camera size={18} />
                  Capturar y Registrar
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
