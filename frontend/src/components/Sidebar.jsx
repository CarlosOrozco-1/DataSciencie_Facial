import { Camera, Settings, Activity, LogOut } from 'lucide-react'

// Componente Sidebar con navegación y botón de cierre de sesión JWT
export default function Sidebar({ currentPage, setCurrentPage, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand-title">
        <Activity size={28} />
        GenderSense
      </div>
      
      <nav>
        <button 
          onClick={() => setCurrentPage('live')}
          className={`nav-link ${currentPage === 'live' ? 'active' : ''}`}
        >
          <Camera size={20} />
          Vista en Vivo
        </button>
        
        <button 
          onClick={() => setCurrentPage('manager')}
          className={`nav-link ${currentPage === 'manager' ? 'active' : ''}`}
        >
          <Settings size={20} />
          Gestión de Cámaras
        </button>
      </nav>
      
      <div style={{ marginTop: 'auto' }}>
        {/* Botón para cerrar sesión y eliminar token JWT */}
        <button 
          onClick={onLogout}
          className="nav-link"
          style={{ color: 'var(--danger)', width: '100%' }}
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
          Sistema de Reconocimiento v2.0
        </div>
      </div>
    </aside>
  )
}
