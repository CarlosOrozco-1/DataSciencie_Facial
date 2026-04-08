import { useState } from 'react'

// Login con soporte para 2FA y recuperación de contraseña
// Flujo: username+password → si 2FA activo → mostrar campo de código 6 dígitos
import { API_URL } from '../utils/api'

export default function Login({ onLogin, onNavigate }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Estado para 2FA segundo paso
  const [requires2FA, setRequires2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [totpCode, setTotpCode] = useState('')

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

  // Segundo paso: validar código TOTP
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">{requires2FA ? '🔑' : '🔐'}</div>
          <h1 className="login-title">GenderSense</h1>
          <p className="login-subtitle">
            {requires2FA ? 'Verificación en Dos Pasos' : 'Sistema de Reconocimiento Facial'}
          </p>
        </div>

        {/* Paso 1: Username + Password */}
        {!requires2FA ? (
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
              <input
                id="password" type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required
              />
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
        ) : (
          /* Paso 2: Código de 6 dígitos del Authenticator */
          <form onSubmit={handleVerify2FA} className="login-form">
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Abre <strong>Microsoft Authenticator</strong> e ingresa el código de 6 dígitos que aparece para <strong>GenderSense</strong>
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
    </div>
  )
}
