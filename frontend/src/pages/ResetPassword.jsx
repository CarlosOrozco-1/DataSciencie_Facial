import { useState } from 'react'

import { API_URL } from '../utils/api'

// Página para establecer nueva contraseña usando el token de recuperación
// El token llega como query param en la URL: ?reset_token=xyz
export default function ResetPassword({ token, onNavigate }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      })

      if (res.ok) {
        setSuccess(true)
      } else {
        const errData = await res.json()
        setError(errData.detail || 'Error al restablecer contraseña')
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
          <div className="login-icon">🔑</div>
          <h1 className="login-title">Nueva Contraseña</h1>
          <p className="login-subtitle">Establece tu nueva contraseña de acceso</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.
            </p>
            <button onClick={() => onNavigate('login')} className="login-btn">
              Ir al Inicio de Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="new-password">Nueva Contraseña</label>
              <input
                id="new-password" type="password" placeholder="Mínimo 6 caracteres"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirmar Contraseña</label>
              <input
                id="confirm-password" type="password" placeholder="Repetir contraseña"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && <div className="login-error">⚠️ {error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
