import { useState } from 'react'

// Componente de Login con diseño glassmorphism oscuro
// Acepta username o email para iniciar sesión
const API_URL = 'http://localhost:8000'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // OAuth2PasswordRequestForm espera form-data con "username" y "password"
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
        // Guardar token en localStorage para persistencia entre recargas
        localStorage.setItem('token', data.access_token)
        onLogin(data.access_token)
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

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Encabezado con branding */}
        <div className="login-header">
          <div className="login-icon">🔐</div>
          <h1 className="login-title">GenderSense</h1>
          <p className="login-subtitle">Sistema de Reconocimiento Facial</p>
        </div>

        {/* Formulario de autenticación */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Usuario o Correo electrónico</label>
            <input
              id="username"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Mensaje de error visual */}
          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Autenticando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="login-footer">Acceso restringido · Solo personal autorizado</p>
      </div>
    </div>
  )
}
