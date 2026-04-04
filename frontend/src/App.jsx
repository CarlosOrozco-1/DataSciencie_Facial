import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import LiveView from './pages/LiveView'
import CameraManager from './pages/CameraManager'
import UserManager from './pages/UserManager'
import Login from './pages/Login'
import './index.css'

// Componente raíz con control de autenticación JWT.
// Si no hay token en localStorage, muestra Login.
// Si hay token, muestra la aplicación con las 3 vistas disponibles.
function App() {
  const [currentPage, setCurrentPage] = useState('live')
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
    }
  }, [])

  const handleLogin = (newToken) => {
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  // Renderizado condicional de las páginas según navegación del sidebar
  const renderPage = () => {
    switch (currentPage) {
      case 'live': return <LiveView />
      case 'manager': return <CameraManager />
      case 'users': return <UserManager />
      default: return <LiveView />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}

export default App
