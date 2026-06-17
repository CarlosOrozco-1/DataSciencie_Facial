import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, UserPlus, CheckCircle, AlertCircle, ScanFace, ArrowLeft } from 'lucide-react';
import { authFetch, API_URL } from '../utils/api';

export default function RegisterFace({ onNavigate, isPublic = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [name, setName] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Estados requeridos por el protocolo
  const [meshState, setMeshState] = useState('IDLE'); // IDLE | SCANNING | CAPTURE_SUCCESS | ERROR
  const [scanMessage, setScanMessage] = useState('Centra tu rostro en el círculo');
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isProcessing, setIsProcessing] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setMessage(null);
        setMeshState('IDLE');
        setScanMessage('Centra tu rostro y presiona Iniciar');
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

  // Función asíncrona que simula una pausa
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const handleRegister = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Por favor, ingresa el nombre de la persona.' });
      return;
    }
    if (!isCameraActive) {
      setMessage({ type: 'error', text: 'La cámara debe estar activa para tomar la foto.' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const capturedFrames = [];

    // Protocolo de 4 capturas biométricas
    try {
      for (let i = 1; i <= 4; i++) {
        // Paso 1: Anuncia captura
        setMeshState('IDLE');
        setScanMessage(`Preparando captura ${i} de 4...`);
        await delay(1000); // Tiempo para que el usuario se posicione

        // Paso 2: Cambia a SCANNING
        setMeshState('SCANNING');
        setScanMessage(`Escaneando rostro... (${i}/4)`);

        // Simular escaneo de profundidad (láser visible)
        await delay(1500);

        // Paso 3: Lanza acción de captura
        const frame = captureFrame();
        if (!frame) throw new Error("Error al capturar la imagen del dispositivo.");
        capturedFrames.push(frame);

        // Paso 4: Captura Exitosa (Green)
        setMeshState('CAPTURE_SUCCESS');
        setScanMessage('¡Captura guardada!');
        await delay(1000); // Congelar estado de éxito por 1 seg
      }

      // Procesamiento final en backend
      setMeshState('SCANNING');
      setScanMessage('Procesando vectores biométricos en la Base de Datos...');

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

      // Finalización Exitosa
      setMeshState('CAPTURE_SUCCESS');
      setScanMessage('Perfil biométrico creado correctamente.');

      const ageText = data.age && data.age !== "(Desconocida)" ? ` | Edad detectada: ${data.age}` : '';
      setMessage({ type: 'success', text: `¡Registro exitoso! Identidad guardada como: ${data.name}${ageText}` });
      setName('');

      await delay(2000);
      stopCamera();

    } catch (error) {
      setMeshState('ERROR');
      setScanMessage('Error en la validación.');
      setMessage({ type: 'error', text: error.message });
      await delay(2000);
      setMeshState('IDLE');
      setScanMessage('Centra tu rostro e intenta de nuevo');
    } finally {
      setIsProcessing(false);
    }
  };

  // Determinar colores según estado de la malla
  const getMeshColors = () => {
    switch (meshState) {
      case 'IDLE': return { main: '#E2E8F0', rgb: '226, 232, 240', animation: 'floating 4s infinite ease-in-out' };
      case 'SCANNING': return { main: '#00F0FF', rgb: '0, 240, 255', animation: 'pulsing 0.5s infinite alternate' };
      case 'CAPTURE_SUCCESS': return { main: '#00FF66', rgb: '0, 255, 102', animation: 'none' };
      case 'ERROR': return { main: '#FF0033', rgb: '255, 0, 51', animation: 'blink 0.3s infinite alternate' };
      default: return { main: '#FFFFFF', rgb: '255, 255, 255', animation: 'none' };
    }
  };

  const meshConfig = getMeshColors();

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
              disabled={isProcessing}
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

          {/* Contenedor del video con SIMULACIÓN DE MEDIA PIPE FACE MESH */}
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
            border: `2px solid ${meshConfig.main}`,
            boxShadow: `0 0 20px rgba(${meshConfig.rgb}, 0.3)`,
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

            {/* OVERLAY DE ESTADOS (Malla simulada) */}
            {isCameraActive && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>

                {/* Overlay principal que oscurece los bordes */}
                <div style={{
                  position: 'absolute',
                  width: '60%',
                  height: '75%',
                  border: `2px ${meshState === 'IDLE' ? 'dashed' : 'solid'} ${meshConfig.main}`,
                  borderRadius: '50%',
                  boxShadow: `0 0 0 9999px rgba(0, 0, 0, ${meshState === 'ERROR' ? 0.8 : 0.6})`,
                  animation: meshConfig.animation,
                  transition: 'border-color 0.3s ease'
                }}>
                  {/* Grid / Malla interna (CSS) */}
                  <div className={`face-mesh-grid ${meshState}`} style={{ borderColor: `rgba(${meshConfig.rgb}, 0.3)` }}>
                    {/* Nodos flotantes simulados */}
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className={`mesh-node ${meshState}`} style={{ backgroundColor: meshConfig.main }} />
                    ))}
                  </div>
                </div>

                {/* Escáner láser al escanear */}
                {meshState === 'SCANNING' && (
                  <div className="laser-scanner" />
                )}

                {/* Texto de estado superpuesto */}
                <div style={{
                  position: 'absolute',
                  bottom: '8%',
                  backgroundColor: `rgba(${meshConfig.rgb}, 0.15)`,
                  padding: '0.6rem 2rem',
                  borderRadius: '30px',
                  color: meshConfig.main,
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  textAlign: 'center',
                  border: `1px solid ${meshConfig.main}`,
                  backdropFilter: 'blur(4px)',
                  boxShadow: `0 4px 15px rgba(${meshConfig.rgb}, 0.4)`,
                  transition: 'all 0.3s ease'
                }}>
                  {scanMessage}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            {isCameraActive && !isProcessing && (
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
              disabled={!isCameraActive || isProcessing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: '1.1rem' }}
            >
              <UserPlus size={20} />
              {isProcessing ? 'Procesando...' : 'Iniciar Escaneo Biométrico'}
            </button>
          </div>

        </div>
      </div>

      <style>{`
        /* Simulación de la malla Face Mesh */
        .face-mesh-grid {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-image: 
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 20px 20px;
          background-position: center center;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        
        .face-mesh-grid.SCANNING, .face-mesh-grid.CAPTURE_SUCCESS {
          opacity: 1;
        }

        .face-mesh-grid.SCANNING {
          animation: meshPulse 1s infinite alternate;
        }

        .mesh-node {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 5px currentColor;
        }
        
        /* Posiciones pseudo-aleatorias de los nodos en el rostro */
        .mesh-node:nth-child(1) { top: 20%; left: 30%; }
        .mesh-node:nth-child(2) { top: 20%; left: 70%; }
        .mesh-node:nth-child(3) { top: 40%; left: 20%; }
        .mesh-node:nth-child(4) { top: 40%; left: 80%; }
        .mesh-node:nth-child(5) { top: 50%; left: 50%; }
        .mesh-node:nth-child(6) { top: 60%; left: 35%; }
        .mesh-node:nth-child(7) { top: 60%; left: 65%; }
        .mesh-node:nth-child(8) { top: 75%; left: 50%; }
        .mesh-node:nth-child(9) { top: 35%; left: 40%; }
        .mesh-node:nth-child(10) { top: 35%; left: 60%; }
        .mesh-node:nth-child(11) { top: 85%; left: 40%; }
        .mesh-node:nth-child(12) { top: 85%; left: 60%; }

        /* Animaciones */
        @keyframes floating {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.02); opacity: 0.8; }
        }

        @keyframes pulsing {
          from { opacity: 0.7; box-shadow: 0 0 10px rgba(0, 240, 255, 0.4); }
          to { opacity: 1; box-shadow: 0 0 25px rgba(0, 240, 255, 0.8); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; border-color: #FF0033; }
          50% { opacity: 0.3; border-color: transparent; }
        }

        @keyframes meshPulse {
          from { background-size: 20px 20px; }
          to { background-size: 22px 22px; }
        }

        .laser-scanner {
          position: absolute;
          top: 10%;
          left: 20%;
          width: 60%;
          height: 3px;
          background-color: #00F0FF;
          box-shadow: 0 0 20px 8px rgba(0, 240, 255, 0.7);
          animation: scanVertical 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          border-radius: 50%;
          z-index: 20;
        }

        @keyframes scanVertical {
          0% { top: 10%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
