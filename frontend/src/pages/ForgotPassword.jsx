import { useState } from 'react'

import { API_URL } from '../utils/api'

// Página para solicitar recuperación de contraseña por email
export default function ForgotPassword({ onNavigate }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (res.ok) {
        setSent(true)
      } else {
        const errData = await res.json()
        setError(errData.detail || 'Error al procesar solicitud')
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">📧</div>
          <h1 className="login-title">Recuperar Contraseña</h1>
          <p className="login-subtitle">Ingresa tu correo para recibir un enlace de recuperación</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Si el correo está registrado, recibirás un enlace de recuperación en tu bandeja de entrada. 
              Revisa también tu carpeta de spam.
            </p>
            <button onClick={() => onNavigate('login')} className="login-btn">
              Volver al Inicio de Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email" type="email" placeholder="tu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoFocus
              />
            </div>

            {error && <div className="login-error">⚠️ {error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
            </button>

            <button type="button" onClick={() => onNavigate('login')}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              ← Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
