import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, UserPlus, CheckCircle, AlertCircle, ScanFace, ArrowLeft } from 'lucide-react';
import { authFetch, API_URL } from '../utils/api';

export default function RegisterFace({ onNavigate, isPublic = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [name, setName] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState('idle'); // idle | scanning | processing | success | error
  const [scanProgress, setScanProgress] = useState(0); // 0 to 100
  const [scanMessage, setScanMessage] = useState('');
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
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

  // Detener la cámara al desmontar
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Por favor, ingresa el nombre de la persona.' });
      return;
    }
    if (!isCameraActive) {
      setMessage({ type: 'error', text: 'La cámara debe estar activa para tomar la foto.' });
      return;
    }

    setScanStatus('scanning');
    setMessage(null);
    setScanProgress(0);

    const capturedFrames = [];
    const captureInstructions = [
      "Mirando al frente...",
      "Gira ligeramente a la derecha...",
      "Gira ligeramente a la izquierda...",
      "Mirando al frente nuevamente...",
      "Finalizando escaneo..."
    ];

    // Tomar 5 fotos a lo largo de 4 segundos
    for (let i = 0; i < 5; i++) {
      setScanMessage(captureInstructions[i]);
      setScanProgress((i / 5) * 100);
      
      const frame = captureFrame();
      if (frame) capturedFrames.push(frame);

      // Esperar 800ms entre foto y foto
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    setScanProgress(100);
    setScanStatus('processing');
    setScanMessage("Procesando biometría y validando duplicados...");

    try {
      const response = await fetch(`${API_URL}/api/detections/register_face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          images_base64: capturedFrames
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Ocurrió un error al registrar el rostro.');
      }

      setScanStatus('success');
      setMessage({ type: 'success', text: `¡Registro exitoso! Identidad guardada como: ${data.name}` });
      setName('');
      
      // Auto-apagar cámara después de éxito
      setTimeout(() => stopCamera(), 3000);
      
    } catch (error) {
      setScanStatus('error');
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <ScanFace style={{ color: 'var(--accent-primary)', width: '2.5rem', height: '2.5rem' }} />
            Registro Biométrico
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            {isPublic ? "Registro público de identidad facial para acceso al sistema." : "Registra la identidad en la base de datos para reconocimiento automático."}
          </p>
        </div>
        {isPublic && (
          <button onClick={() => onNavigate('login')} className="btn" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-subtle)' }}>
            <ArrowLeft size={18} style={{ marginRight: '0.5rem' }} /> Volver al Login
          </button>
        )}
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
          {message.type === 'error' ? <AlertCircle size={24} style={{ minWidth: '24px' }} /> : <CheckCircle size={24} style={{ minWidth: '24px' }} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre Completo</label>
            <input 
              type="text" 
              placeholder="Ej. Juan Pérez" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={scanStatus === 'scanning' || scanStatus === 'processing'}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '1.1rem'
              }}
            />
          </div>

          {/* Contenedor del video con silueta biométrica */}
          <div style={{ 
            width: '100%', 
            aspectRatio: '4/3', 
            backgroundColor: '#000', 
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            border: scanStatus === 'scanning' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            boxShadow: scanStatus === 'scanning' ? '0 0 20px rgba(56, 189, 248, 0.3)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            {!isCameraActive && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-secondary)', zIndex: 10 }}>
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
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* OVERLAY BIOMÉTRICO (Silueta y Animación) */}
            {isCameraActive && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                {/* Silueta de óvalo para guiar el rostro */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '60%',
                  height: '70%',
                  border: '2px dashed rgba(255,255,255,0.4)',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)', // Oscurecer el exterior
                }} />

                {/* Escáner láser al escanear */}
                {scanStatus === 'scanning' && (
                  <div className="laser-scanner" />
                )}

                {/* Texto de instrucción superpuesto */}
                {(scanStatus === 'scanning' || scanStatus === 'processing') && (
                  <div style={{
                    position: 'absolute',
                    bottom: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '20px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    textAlign: 'center',
                    border: '1px solid var(--accent-primary)',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    zIndex: 20
                  }}>
                    {scanMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barra de progreso */}
          {(scanStatus === 'scanning' || scanStatus === 'processing') && (
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${scanProgress}%`, 
                backgroundColor: 'var(--accent-primary)',
                transition: 'width 0.8s ease'
              }} />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            {isCameraActive && scanStatus !== 'scanning' && scanStatus !== 'processing' && (
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
              disabled={!isCameraActive || scanStatus === 'scanning' || scanStatus === 'processing'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: '1.1rem' }}
            >
              <UserPlus size={20} />
              Iniciar Escaneo
            </button>
          </div>

        </div>
      </div>

      <style>{`
        .laser-scanner {
          position: absolute;
          top: 15%;
          left: 20%;
          width: 60%;
          height: 2px;
          background-color: var(--accent-primary);
          box-shadow: 0 0 15px 5px rgba(56, 189, 248, 0.6);
          animation: scanVertical 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          border-radius: 50%;
        }

        @keyframes scanVertical {
          0% { top: 15%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
