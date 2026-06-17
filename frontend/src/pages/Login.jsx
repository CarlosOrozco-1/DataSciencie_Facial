import { useState, useEffect, useRef, useCallback } from 'react'
import { Eye, EyeOff, Camera, Loader2 } from 'lucide-react'

// Login con soporte para 4 métodos de autenticación:
// 1. Contraseña (username/email + password)
// 2. 2FA TOTP (segundo paso si está activado)
// 3. Google OAuth (popup de Google Identity Services)
// 4. Reconocimiento Facial (webcam del navegador)
import { API_URL } from '../utils/api'

// Google Client ID desde la configuración
const GOOGLE_CLIENT_ID = '1082189297764-sblg1265oumq46854eb2loajlchtirl4.apps.googleusercontent.com'

export default function Login({ onLogin, onNavigate }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Estado para 2FA segundo paso
  const [requires2FA, setRequires2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [totpCode, setTotpCode] = useState('')

  // Estado para login facial
  const [showFaceLogin, setShowFaceLogin] = useState(false)
  const [faceStatus, setFaceStatus] = useState('idle') // idle | capturing | analyzing | success | error
  const [faceMessage, setFaceMessage] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const googleInitRef = useRef(false)

  // ======== Google OAuth ========
  useEffect(() => {
    // Inicializar Google Identity Services cuando el script esté cargado
    const initGoogle = () => {
      if (googleInitRef.current) return;
      
      if (window.google && window.google.accounts) {
        googleInitRef.current = true;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false, // Evitar problemas con FedCM
        })

        const googleBtnContainer = document.getElementById('google-signin-btn')
        if (googleBtnContainer) {
          window.google.accounts.id.renderButton(googleBtnContainer, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            width: 320,
          })
        }
      }
    }

    // Intentar inmediatamente o esperar a que cargue el script
    if (window.google && window.google.accounts) {
      // Pequeño delay para que el DOM esté listo
      setTimeout(initGoogle, 100)
    } else {
      const interval = setInterval(() => {
        if (window.google && window.google.accounts) {
          initGoogle()
          clearInterval(interval)
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [requires2FA]) // Re-inicializar si cambia el estado de 2FA

  const handleGoogleCallback = async (response) => {
    if (!response || !response.credential) {
      console.warn("Google OAuth falló o no retornó credenciales válidas.");
      setError('Autenticación de Google cancelada o denegada por origen inválido.');
      return;
    }
    
    setError('')
    setLoading(true)
    
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential })
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('token', data.access_token)
        onLogin(data.access_token)
      } else {
        const errData = await res.json()
        setError(errData.detail || 'Error al iniciar sesión con Google')
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  // ======== Login con contraseña ========
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      })

      if (res.ok) {
        const data = await res.json()

        // Si el backend indica que necesita 2FA, mostrar segundo paso
        if (data.requires_2fa) {
          setRequires2FA(true)
          setTempToken(data.temp_token)
        } else {
          // Login exitoso sin 2FA
          localStorage.setItem('token', data.access_token)
          onLogin(data.access_token)
        }
      } else {
        const errData = await res.json()
        setError(errData.detail || 'Credenciales incorrectas')
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  // ======== 2FA Verificación ========
  const handleVerify2FA = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/2fa/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, code: totpCode })
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('token', data.access_token)
        onLogin(data.access_token)
      } else {
        const errData = await res.json()
        setError(errData.detail || 'Código incorrecto')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  // ======== Login Facial ========
  const startFaceLogin = async () => {
    setShowFaceLogin(true)
    setFaceStatus('idle')
    setFaceMessage('Posiciona tu rostro frente a la cámara...')
    setError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // 1. Mostrar IDLE y luego SCANNING
      await delay(1000)
      setFaceStatus('scanning')
      setFaceMessage('Escaneando rostro...')
      
      // 2. Simular escaneo láser 
      await delay(1500)
      
      // 3. Capturar
      captureAndLogin()
    } catch (err) {
      setFaceStatus('error')
      setFaceMessage('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const captureAndLogin = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return
    
    setFaceStatus('analyzing')
    setFaceMessage('Analizando rostro...')

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageDataUri = canvas.toDataURL('image/jpeg', 0.9)

    try {
      const res = await fetch(`${API_URL}/api/auth/face/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUri })
      })

      if (res.ok) {
        const data = await res.json()
        setFaceStatus('success')
        setFaceMessage('¡Bienvenido! Acceso concedido')
        
        // Pequeño delay para mostrar éxito antes de redirigir
        setTimeout(() => {
          stopFaceCamera()
          localStorage.setItem('token', data.access_token)
          onLogin(data.access_token)
        }, 1200)
      } else {
        const errData = await res.json()
        setFaceStatus('error')
        setFaceMessage(errData.detail || 'Rostro no reconocido')
      }
    } catch (err) {
      setFaceStatus('error')
      setFaceMessage('Error de conexión con el servidor')
    }
  }, [onLogin])

  const retryFaceCapture = async () => {
    setFaceStatus('idle')
    setFaceMessage('Posiciona tu rostro frente a la cámara...')
    await delay(1000)
    setFaceStatus('scanning')
    setFaceMessage('Escaneando rostro...')
    await delay(1500)
    captureAndLogin()
  }

  const stopFaceCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowFaceLogin(false)
    setFaceStatus('idle')
  }


  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="login-container">
      {/* Fondo de imagen dinámica */}
      <img 
        className="login-video-bg" 
        src="/fondo_onda_2.jpg" 
        alt="Fondo BioFacial"
      />
      
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">{requires2FA ? '🔑' : '🔐'}</div>
          <h1 className="login-title">BioFacial</h1>
          <p className="login-subtitle">
            {requires2FA ? 'Verificación en Dos Pasos' : 'Sistema de Reconocimiento Facial'}
          </p>
        </div>

        {/* Paso 1: Métodos de autenticación */}
        {!requires2FA ? (
          <>
            {/* Login tradicional */}
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username">Usuario o Correo electrónico</label>
                <input
                  id="username" type="text" placeholder="admin"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  required autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box', marginBottom: 0 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', padding: 0
                    }}
                    title={showPassword ? "Ocultar Contraseña" : "Mostrar Contraseña"}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              {error && <div className="login-error">⚠️ {error}</div>}

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Autenticando...' : 'Iniciar Sesión'}
              </button>

              {/* Enlace de recuperación de contraseña */}
              <button type="button" onClick={() => onNavigate('forgot')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem', textDecoration: 'underline' }}>
                ¿Olvidaste tu contraseña?
              </button>
            </form>

            {/* Separador */}
            <div className="login-divider">
              <span>o accede con</span>
            </div>

            {/* Botones de acceso rápido — ovalados y transparentes */}
            <div className="login-oval-methods" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              {/* Google Overlay */}
              <div className="login-btn-oval-wrapper" style={{ position: 'relative', width: '320px', height: '42px', maxWidth: '100%' }}>
                {/* Botón Visual */}
                <div className="login-btn-oval" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="G" width="18" height="18" />
                  <span>Acceder con Google</span>
                </div>
                {/* Iframe Real (invisible pero clickeable) */}
                <div id="google-signin-btn" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.01, zIndex: 10 }} title="Iniciar con Google"></div>
              </div>

              {/* Reconocimiento Facial */}
              <button type="button" className="login-btn-oval face-oval" onClick={startFaceLogin} disabled={loading} title="Iniciar con Rostro">
                <Camera size={20} />
                <span>Reconocimiento Facial</span>
              </button>
              
              {/* Registro Voluntario */}
              <button type="button" className="login-btn-oval" onClick={() => onNavigate('register')} disabled={loading} title="Registrar Rostro Público" style={{ border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'transparent', color: 'var(--text-secondary)' }}>
                <span style={{ marginLeft: '1.7rem' }}>Registro Voluntario Nuevo</span>
              </button>
            </div>
          </>
        ) : (
          /* Paso 2: Código de 6 dígitos del Authenticator */
          <form onSubmit={handleVerify2FA} className="login-form">
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Abre <strong>Microsoft Authenticator</strong> e ingresa el código de 6 dígitos que aparece para <strong>BioFacial</strong>
            </div>

            <div className="form-group">
              <label htmlFor="totp">Código de Verificación</label>
              <input
                id="totp" type="text" placeholder="000000"
                value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required autoFocus maxLength={6}
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold' }}
              />
            </div>

            {error && <div className="login-error">⚠️ {error}</div>}

            <button type="submit" className="login-btn" disabled={loading || totpCode.length !== 6}>
              {loading ? 'Verificando...' : 'Verificar Código'}
            </button>

            <button type="button" onClick={() => { setRequires2FA(false); setTotpCode(''); setError('') }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              ← Volver al inicio de sesión
            </button>
          </form>
        )}

        <p className="login-footer">Acceso restringido · Solo personal autorizado</p>
      </div>

      {/* Modal de Login Facial */}
      {showFaceLogin && (
        <div className="face-login-modal">
          <div className="face-login-modal-content" style={{ width: '90%', maxWidth: '500px', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <Camera size={22} style={{ color: 'var(--accent-primary)' }} />
              Reconocimiento Facial
            </h3>

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
              border: `2px solid ${faceStatus === 'idle' ? '#E2E8F0' : faceStatus === 'scanning' || faceStatus === 'analyzing' ? '#00F0FF' : faceStatus === 'success' ? '#00FF66' : '#FF0033'}`,
              boxShadow: faceStatus === 'scanning' || faceStatus === 'analyzing' ? '0 0 20px rgba(0, 240, 255, 0.3)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {/* Overlay de estado (Malla Biométrica) */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{
                  position: 'absolute',
                  width: '60%',
                  height: '75%',
                  border: `2px ${faceStatus === 'idle' ? 'dashed' : 'solid'} ${faceStatus === 'idle' ? '#E2E8F0' : faceStatus === 'scanning' || faceStatus === 'analyzing' ? '#00F0FF' : faceStatus === 'success' ? '#00FF66' : '#FF0033'}`,
                  borderRadius: '50%',
                  boxShadow: `0 0 0 9999px rgba(0, 0, 0, ${faceStatus === 'error' ? 0.8 : 0.6})`,
                  animation: faceStatus === 'idle' ? 'floating 4s infinite ease-in-out' : faceStatus === 'scanning' || faceStatus === 'analyzing' ? 'pulsing 0.5s infinite alternate' : faceStatus === 'error' ? 'blink 0.3s infinite alternate' : 'none',
                  transition: 'border-color 0.3s ease'
                }}>
                  {/* Grid interno */}
                  <div className={`face-mesh-grid ${faceStatus}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    {[...Array(12)].map((_, i) => (
                       <div key={i} className={`mesh-node ${faceStatus}`} style={{ backgroundColor: faceStatus === 'idle' ? '#E2E8F0' : faceStatus === 'scanning' || faceStatus === 'analyzing' ? '#00F0FF' : faceStatus === 'success' ? '#00FF66' : '#FF0033' }} />
                    ))}
                  </div>
                </div>

                {/* Láser al escanear/analizar */}
                {(faceStatus === 'scanning' || faceStatus === 'analyzing') && (
                  <div className="laser-scanner" />
                )}

                {/* Íconos de éxito/error grandes en el centro */}
                {faceStatus === 'analyzing' && (
                  <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: '#00F0FF', position: 'absolute' }} />
                )}
                {faceStatus === 'success' && (
                  <div style={{ fontSize: '4rem', position: 'absolute' }}>✅</div>
                )}
                {faceStatus === 'error' && (
                  <div style={{ fontSize: '4rem', position: 'absolute' }}>❌</div>
                )}
              </div>
            </div>

            <p style={{ textAlign: 'center', color: faceStatus === 'error' ? '#fca5a5' : faceStatus === 'success' ? 'var(--success)' : 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '1rem', fontWeight: 500 }}>
              {faceMessage}
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn" style={{ flex: 1, backgroundColor: 'var(--border-subtle)', color: 'white' }} onClick={stopFaceCamera}>
                Cancelar
              </button>
              {faceStatus === 'error' && (
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={retryFaceCapture}>
                  Reintentar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
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
        .face-mesh-grid.scanning, .face-mesh-grid.analyzing, .face-mesh-grid.success {
          opacity: 1;
        }
        .face-mesh-grid.scanning, .face-mesh-grid.analyzing {
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
  )
}
