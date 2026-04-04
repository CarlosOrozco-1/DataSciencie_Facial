import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import LiveView from './pages/LiveView'
import CameraManager from './pages/CameraManager'
import Login from './pages/Login'
import './index.css'

// Componente raíz con control de autenticación JWT.
// Si no hay token en localStorage, muestra Login.
// Si hay token, muestra la aplicación normalmente.
function App() {
  const [currentPage, setCurrentPage] = useState('live')
  const [token, setToken] = useState(localStorage.getItem('token'))

  // Verificar si el token almacenado sigue siendo válido al cargar
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
    }
  }, [])

  // Callback cuando el usuario se loguea exitosamente
  const handleLogin = (newToken) => {
    setToken(newToken)
  }

  // Cerrar sesión eliminando el token
  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
  }

  // Si no hay token, mostrar pantalla de login
  if (!token) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app-layout">
      {/* Componente lateral de navegación con botón de logout */}
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={handleLogout} />
      
      {/* Contenedor principal donde se inyecta la página seleccionada */}
      <main className="main-content">
        {currentPage === 'live' ? <LiveView /> : <CameraManager />}
      </main>
    </div>
  )
}

export default App
