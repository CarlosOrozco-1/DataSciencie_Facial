import { useState, useEffect } from 'react'
import { authFetch, API_URL } from '../utils/api'
import { User, ShieldCheck, ShieldOff } from 'lucide-react'

// Módulo exclusivo para el perfil del usuario actual (visualización y 2FA)
export default function UserProfile() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    // Estado para 2FA setup
    const [show2FASetup, setShow2FASetup] = useState(false)
    const [qrData, setQrData] = useState(null)
    const [totpCode, setTotpCode] = useState('')
    const [setup2FAError, setSetup2FAError] = useState('')

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

            {/* Tarjeta de Seguridad 2FA */}
            <div className="card" style={{ maxWidth: '600px', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldCheck size={20} style={{ color: 'var(--accent-primary)' }} />
                        Autenticación de Doble Factor (2FA)
                    </h3>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {user.is_2fa_enabled
                            ? '✅ 2FA está activado en tu cuenta.'
                            : 'Protege tu cuenta activando Microsoft Authenticator.'}
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
        </div>
    )
}
