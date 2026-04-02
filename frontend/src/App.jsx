import { useState } from 'react'
import Sidebar from './components/Sidebar'
import LiveView from './pages/LiveView'
import CameraManager from './pages/CameraManager'
import './index.css'

// [CAMBIO REALIZADO]: Componente raíz que maneja el estado global de navegación.
// En lugar de usar react-router, optamos por renderizado condicional simple
// dado que solo hay dos vistas (Vista en Vivo y Gestión de Cámaras).
function App() {
  const [currentPage, setCurrentPage] = useState('live')

  return (
    <div className="app-layout">
      {/* Componente lateral de navegación */}
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      {/* Contenedor principal donde se inyecta la página seleccionada */}
      <main className="main-content">
        {currentPage === 'live' ? <LiveView /> : <CameraManager />}
      </main>
    </div>
  )
}

export default App
