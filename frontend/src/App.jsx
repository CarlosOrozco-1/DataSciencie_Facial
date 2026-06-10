import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import LiveView from './pages/LiveView'
import CameraManager from './pages/CameraManager'
import UserManager from './pages/UserManager'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import UserProfile from './pages/UserProfile'
import DetectionsManager from './pages/DetectionsManager'
import RegisterFace from './pages/RegisterFace'
import './index.css'

// Componente raíz con control de autenticación JWT y rutas de recuperación.
// Detecta si hay un reset_token en la URL para mostrar la página de reset.
function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [authPage, setAuthPage] = useState('login') // login | forgot | reset
  const [resetToken, setResetToken] = useState(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) setToken(storedToken)

    // Detectar token de reset en la URL (llegó por email)
    const params = new URLSearchParams(window.location.search)
    const urlResetToken = params.get('reset_token')
    if (urlResetToken) {
      setAuthPage('reset')
      setResetToken(urlResetToken)
      // Limpiar la URL para que no quede visible el token
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleLogin = (newToken) => {
    setToken(newToken)
    setAuthPage('login')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setAuthPage('login')
  }

  // Navegación entre páginas de auth (login, forgot, reset)
  const handleAuthNavigate = (page) => {
    setAuthPage(page)
  }

  // Si no hay token, mostrar flujo de autenticación
  if (!token) {
    switch (authPage) {
      case 'forgot':
        return <ForgotPassword onNavigate={handleAuthNavigate} />
      case 'reset':
        return <ResetPassword token={resetToken} onNavigate={handleAuthNavigate} />
      case 'register':
        return <RegisterFace onNavigate={handleAuthNavigate} isPublic={true} />
      default:
        return <Login onLogin={handleLogin} onNavigate={handleAuthNavigate} />
    }
  }

  // Renderizado de páginas internas (autenticado)
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard setCurrentPage={setCurrentPage} />
      case 'live': return <LiveView />
      case 'manager': return <CameraManager />
      case 'users': return <UserManager />
      case 'user-profile': return <UserProfile />
      case 'detections': return <DetectionsManager />
      case 'register': return <RegisterFace />
      default: return <Dashboard />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} />
      <main className="main-content">
        <div key={currentPage} className="page-transition">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default App
