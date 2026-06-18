import { useState, useEffect, useRef } from 'react'
import { authFetch, API_URL } from '../utils/api'
import { User, ShieldCheck, ShieldOff, Camera, CameraOff, Loader2 } from 'lucide-react'

// Módulo de perfil de usuario con gestión de 4 métodos de autenticación:
// 1. Contraseña (siempre activa)
// 2. 2FA TOTP (Activar/Desactivar)
// 3. Google OAuth (Vincular/Desvincular)
// 4. Reconocimiento Facial (Registrar/Eliminar)
export default function UserProfile() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Estado para 2FA setup
    const [show2FASetup, setShow2FASetup] = useState(false)
    const [qrData, setQrData] = useState(null)
    const [totpCode, setTotpCode] = useState('')
    const [setup2FAError, setSetup2FAError] = useState('')

    // Estado para Face enrollment
    const [showFaceSetup, setShowFaceSetup] = useState(false)
    const [faceStatus, setFaceStatus] = useState('idle') // idle | capturing | countdown | processing | success | error
    const [faceMessage, setFaceMessage] = useState('')
    const [capturedImages, setCapturedImages] = useState([])
    const [countdown, setCountdown] = useState(0)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)

    const fetchProfile = async () => {
        try {
            const res = await authFetch(`${API_URL}/api/users/me`)
            if (res.ok) {
                const data = await res.json()
                setUser(data)
            } else {
                console.error("Error al obtener el perfil")
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchProfile() }, [])

    // ======== 2FA Setup ========
    const handleSetup2FA = async () => {
        try {
            const res = await authFetch(`${API_URL}/api/auth/2fa/setup`, { method: 'POST' })
            if (res.ok) {
                const data = await res.json()
                setQrData(data)
                setShow2FASetup(true)
                setTotpCode('')
                setSetup2FAError('')
            } else {
                alert('Error al generar código QR')
            }
        } catch (e) {
            alert('Error de conexión con el servidor')
        }
    }

    const handleVerify2FA = async () => {
        setSetup2FAError('')
        try {
            const res = await authFetch(`${API_URL}/api/auth/2fa/verify`, {
                method: 'POST',
                body: JSON.stringify({ code: totpCode })
            })
            if (res.ok) {
                setShow2FASetup(false)
                setQrData(null)
                setTotpCode('')
                alert('✅ Autenticación de doble factor activada exitosamente')
                fetchProfile()
            } else {
                const err = await res.json()
                setSetup2FAError(err.detail || 'Código incorrecto')
            }
        } catch (e) {
            setSetup2FAError('Error de conexión')
        }
    }

    const handleDisable2FA = async () => {
        if (!window.confirm('¿Desactivar la autenticación de doble factor? Tu cuenta será menos segura.')) return
        try {
            const res = await authFetch(`${API_URL}/api/auth/2fa/disable`, { method: 'POST' })
            if (res.ok) {
                alert('2FA desactivado en tu cuenta')
                fetchProfile()
            }
        } catch (e) {
            alert('Error de conexión')
        }
    }

    // ======== Google OAuth ========
    const handleUnlinkGoogle = async () => {
        if (!window.confirm('¿Desvincular tu cuenta de Google? Ya no podrás iniciar sesión con Google.')) return
        try {
            const res = await authFetch(`${API_URL}/api/auth/google/unlink`, { method: 'POST' })
            if (res.ok) {
                alert('Cuenta de Google desvinculada')
                fetchProfile()
            } else {
                const err = await res.json()
                alert(err.detail || 'Error al desvincular')
            }
        } catch (e) {
            alert('Error de conexión')
        }
    }

    // ======== Face Enrollment ========
    const startFaceEnrollment = async () => {
        setShowFaceSetup(true)
        setFaceStatus('capturing')
        setFaceMessage('Preparando cámara...')
        setCapturedImages([])

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
            setFaceMessage('Posiciona tu rostro frente a la cámara. Se tomarán 3 fotos.')
            
            // Iniciar captura automática después de un momento
            setTimeout(() => startCaptureCycle(0, []), 1500)
        } catch (err) {
            setFaceStatus('error')
            setFaceMessage('No se pudo acceder a la cámara. Verifica los permisos.')
        }
    }

    const startCaptureCycle = (captureIndex, collected) => {
        if (captureIndex >= 3) {
            // Ya tenemos las 3 fotos, enviar al backend
            submitFaceEnrollment(collected)
            return
        }

        setFaceStatus('countdown')
        setFaceMessage(`Foto ${captureIndex + 1} de 3 — Mantén la vista al frente`)
        
        let count = 3
        setCountdown(count)
        
        const timer = setInterval(() => {
            count--
            setCountdown(count)
            
            if (count <= 0) {
                clearInterval(timer)
                // Capturar foto
                const imageData = captureFrame()
                if (imageData) {
                    const newCollected = [...collected, imageData]
                    setCapturedImages(newCollected)
                    setFaceMessage(`✓ Foto ${captureIndex + 1} capturada`)
                    
                    // Siguiente captura después de 1 segundo
                    setTimeout(() => startCaptureCycle(captureIndex + 1, newCollected), 1000)
                } else {
                    setFaceStatus('error')
                    setFaceMessage('Error al capturar la imagen')
                }
            }
        }, 1000)
    }

    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current) return null
        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        return canvas.toDataURL('image/jpeg', 0.9)
    }

    const submitFaceEnrollment = async (images) => {
        setFaceStatus('processing')
        setFaceMessage('Procesando rostro... Esto puede tardar unos segundos.')

        try {
            const res = await authFetch(`${API_URL}/api/auth/face/enroll`, {
                method: 'POST',
                body: JSON.stringify({ images })
            })

            if (res.ok) {
                setFaceStatus('success')
                setFaceMessage('✅ ¡Rostro registrado exitosamente!')
                setTimeout(() => {
                    stopFaceCamera()
                    fetchProfile()
                }, 2000)
            } else {
                const err = await res.json()
                setFaceStatus('error')
                setFaceMessage(err.detail || 'Error al registrar el rostro')
            }
        } catch (e) {
            setFaceStatus('error')
            setFaceMessage('Error de conexión con el servidor')
        }
    }

    const handleDeleteFace = async () => {
        if (!window.confirm('¿Eliminar tu rostro registrado? Ya no podrás iniciar sesión con reconocimiento facial.')) return
        try {
            const res = await authFetch(`${API_URL}/api/auth/face/enroll`, { method: 'DELETE' })
            if (res.ok) {
                alert('Rostro eliminado exitosamente')
                fetchProfile()
            } else {
                const err = await res.json()
                alert(err.detail || 'Error al eliminar el rostro')
            }
        } catch (e) {
            alert('Error de conexión')
        }
    }

    const stopFaceCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setShowFaceSetup(false)
        setFaceStatus('idle')
        setCapturedImages([])
    }

    if (loading) return <div className="page-subtitle">Cargando perfil...</div>
    if (!user) return <div className="page-subtitle">Error al cargar el perfil.</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '2rem' }}>

            {/* Header */}
            <div>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User style={{ color: 'var(--accent-primary)' }} size={28} />
                    Mi Perfil
                </h1>
                <p className="page-subtitle">Información personal y seguridad de tu cuenta</p>
            </div>

            {/* Datos Personales */}
            <div className="card" style={{ maxWidth: '600px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Datos del Usuario</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Usuario:</div>
                    <div style={{ fontSize: '1.1rem' }}>{user.username}</div>
                    
                    <div style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Email:</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{user.email}</div>
                    
                    <div style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Estado:</div>
                    <div>
                        <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                           {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>

                    <div style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Miembro desde:</div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('es-GT') : '—'}
                    </div>
                </div>
            </div>

            {/* Sección de Seguridad */}
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={22} style={{ color: 'var(--accent-primary)' }} />
                    Métodos de Autenticación
                </h2>

                {/* Tarjeta 2FA */}
                <div className="card auth-card" style={{ maxWidth: '600px', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🔑 Doble Factor (2FA)
                            </h3>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                {user.is_2fa_enabled
                                    ? '✅ 2FA está activado en tu cuenta.'
                                    : 'Protege tu cuenta con Microsoft Authenticator.'}
                            </p>
                        </div>
                        {user.is_2fa_enabled ? (
                            <button className="btn btn-danger" onClick={handleDisable2FA} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                                <ShieldOff size={16} /> Desactivar
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={handleSetup2FA} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                                <ShieldCheck size={16} /> Activar 2FA
                            </button>
                        )}
                    </div>
                </div>

                {/* Tarjeta Google OAuth */}
                <div className="card auth-card" style={{ maxWidth: '600px', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🌐 Google
                            </h3>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                {user.is_google_enabled
                                    ? '✅ Cuenta de Google vinculada. Puedes iniciar sesión con Google.'
                                    : 'Vincula tu cuenta de Google para iniciar sesión más rápido.'}
                            </p>
                        </div>
                        {user.is_google_enabled ? (
                            <button className="btn btn-danger" onClick={handleUnlinkGoogle} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                                <ShieldOff size={16} /> Desvincular
                            </button>
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                Inicia sesión con Google para vincular automáticamente.
                            </p>
                        )}
                    </div>
                </div>

                {/* Tarjeta Reconocimiento Facial */}
                <div className="card auth-card" style={{ maxWidth: '600px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                📷 Reconocimiento Facial
                            </h3>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                {user.has_face_enrolled
                                    ? '✅ Rostro registrado. Puedes iniciar sesión con tu cara.'
                                    : 'Registra tu rostro para iniciar sesión con la cámara.'}
                            </p>
                        </div>
                        {user.has_face_enrolled ? (
                            <button className="btn btn-danger" onClick={handleDeleteFace} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                                <CameraOff size={16} /> Eliminar Rostro
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={startFaceEnrollment} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                                <Camera size={16} /> Registrar Rostro
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de configuración 2FA con QR */}
            {show2FASetup && qrData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: '420px', width: '90%', padding: '2rem', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <ShieldCheck size={22} style={{ color: 'var(--accent-primary)' }} />
                            Configurar 2FA
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Escanea este código QR con <strong>Microsoft Authenticator</strong>
                        </p>

                        {/* QR Code */}
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }}>
                            <img src={qrData.qr_code} alt="QR 2FA" style={{ width: '200px', height: '200px' }} />
                        </div>

                        {/* Clave manual */}
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>O ingresa esta clave manualmente:</p>
                        <code style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', background: 'rgba(56,189,248,0.1)', padding: '0.4rem 0.8rem', borderRadius: '6px', letterSpacing: '2px', display: 'inline-block', marginBottom: '1.5rem' }}>
                            {qrData.secret}
                        </code>

                        {/* Verificación */}
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                            Ingresa el código de 6 dígitos que muestra la app:
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                            <input type="text" placeholder="000000" value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold', width: '160px' }} />
                        </div>

                        {setup2FAError && (
                            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                ⚠️ {setup2FAError}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1, backgroundColor: 'var(--border-subtle)', color: 'white' }} onClick={() => { setShow2FASetup(false); setQrData(null) }}>Cancelar</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleVerify2FA} disabled={totpCode.length !== 6}>
                                Verificar y Activar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de registro facial */}
            {showFaceSetup && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '2rem', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <Camera size={22} style={{ color: 'var(--accent-primary)' }} />
                            Registrar Rostro
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
                            border: `2px solid ${faceStatus === 'idle' || faceStatus === 'capturing' ? '#E2E8F0' : faceStatus === 'countdown' || faceStatus === 'processing' ? '#00F0FF' : faceStatus === 'success' ? '#00FF66' : '#FF0033'}`,
                            boxShadow: faceStatus === 'countdown' || faceStatus === 'processing' ? '0 0 20px rgba(0, 240, 255, 0.3)' : 'none',
                            transition: 'all 0.3s ease',
                            marginBottom: '1rem'
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
                                    height: '75%',
                                    aspectRatio: '1 / 1',
                                    border: `2px ${faceStatus === 'idle' || faceStatus === 'capturing' ? 'dashed' : 'solid'} ${faceStatus === 'idle' || faceStatus === 'capturing' ? '#E2E8F0' : faceStatus === 'countdown' || faceStatus === 'processing' ? '#00F0FF' : faceStatus === 'success' ? '#00FF66' : '#FF0033'}`,
                                    borderRadius: '50%',
                                    boxShadow: `0 0 0 9999px rgba(0, 0, 0, ${faceStatus === 'error' ? 0.8 : 0.6})`,
                                    animation: faceStatus === 'idle' || faceStatus === 'capturing' ? 'floating 4s infinite ease-in-out' : faceStatus === 'countdown' || faceStatus === 'processing' ? 'pulsing 0.5s infinite alternate' : faceStatus === 'error' ? 'blink 0.3s infinite alternate' : 'none',
                                    transition: 'border-color 0.3s ease'
                                }}>
                                    {/* Grid interno */}
                                    <div className={`face-mesh-grid ${faceStatus}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                        {[...Array(12)].map((_, i) => (
                                           <div key={i} className={`mesh-node ${faceStatus}`} style={{ backgroundColor: faceStatus === 'idle' || faceStatus === 'capturing' ? '#E2E8F0' : faceStatus === 'countdown' || faceStatus === 'processing' ? '#00F0FF' : faceStatus === 'success' ? '#00FF66' : '#FF0033' }} />
                                        ))}
                                    </div>
                                </div>

                                {/* Láser al escanear/analizar */}
                                {(faceStatus === 'countdown' || faceStatus === 'processing') && (
                                    <div className="laser-scanner" />
                                )}

                                {/* Countdown número gigante */}
                                {faceStatus === 'countdown' && countdown > 0 && (
                                    <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.5)', position: 'absolute', animation: 'pulse 1s ease-in-out infinite' }}>
                                        {countdown}
                                    </div>
                                )}

                                {/* Íconos de éxito/error/procesando en el centro */}
                                {faceStatus === 'processing' && (
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

                        {/* Indicador de fotos capturadas */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    backgroundColor: capturedImages.length > i ? 'var(--success)' : 'var(--border-subtle)',
                                    transition: 'background-color 0.3s'
                                }} />
                            ))}
                        </div>

                        <p style={{ 
                            color: faceStatus === 'error' ? '#fca5a5' : faceStatus === 'success' ? 'var(--success)' : 'var(--text-secondary)', 
                            fontSize: '0.9rem', fontWeight: 500 
                        }}>
                            {faceMessage}
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button className="btn" style={{ flex: 1, backgroundColor: 'var(--border-subtle)', color: 'white' }} onClick={stopFaceCamera}>
                                {faceStatus === 'success' ? 'Cerrar' : 'Cancelar'}
                            </button>
                            {faceStatus === 'error' && (
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => startFaceEnrollment()}>
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
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
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
                .face-mesh-grid.countdown, .face-mesh-grid.processing, .face-mesh-grid.success {
                    opacity: 1;
                }
                .face-mesh-grid.countdown, .face-mesh-grid.processing {
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
