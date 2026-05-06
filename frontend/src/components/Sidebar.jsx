import { useState } from 'react'
import { Camera, Settings, Activity, LogOut, Users, LayoutDashboard, Menu, User, Database } from 'lucide-react'

// Componente Sidebar con navegación, módulo de usuarios y botón de cierre de sesión JWT
export default function Sidebar({ currentPage, setCurrentPage, onLogout }) {

  // Hook para manejar el estado del sidebar
  const [isCollapsed, setIsCollapsed] = useState(false)
  return (
    // Se agrega dinamicamente la clase CSS 'collapsed' para colapsar el sidebar
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>

      <div className="brand-title flex-between">
        {/* Envolvemos todo el logo para que desaparezca al colapsar */}
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={28} />
            <span>BioFacial</span>
          </div>
        )}

        {/* Botón para colapsar el sidebar */}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="collapse-btn">
          <Menu size={24} color="var(--text-secondary)" />
        </button>
      </div>


      <nav>
        <button
          onClick={() => setCurrentPage('dashboard')}
          className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
          title={isCollapsed ? 'Dashboard' : ''} // Tooltip para el botón de dashboard
        >
          <LayoutDashboard size={20} style={{ minWidth: '20px' }} />
          {!isCollapsed && <span>Dashboard</span>}
        </button>

        <button
          onClick={() => setCurrentPage('live')}
          className={`nav-link ${currentPage === 'live' ? 'active' : ''}`}
          title={isCollapsed ? 'Vista en Vivo' : ''}
        >
          <Camera size={20} style={{ minWidth: '20px' }} />
          {!isCollapsed && <span>Vista en Vivo</span>}
        </button>

        <button
          onClick={() => setCurrentPage('manager')}
          className={`nav-link ${currentPage === 'manager' ? 'active' : ''}`}
          title={isCollapsed ? 'Gestión de Cámaras' : ''}
        >
          <Settings size={20} style={{ minWidth: '20px' }} />
          {!isCollapsed && <span>Gestión de Cámaras</span>}
        </button>
        {/* Solo renderizar Gestión de Usuarios si el token (is_admin) lo permite */}
        {(() => {
          try {
            const token = localStorage.getItem('token')
            if (!token) return null
            const payload = JSON.parse(atob(token.split('.')[1]))
            if (payload.is_admin) {
              return (
                <button
                  onClick={() => setCurrentPage('users')}
                  className={`nav-link ${currentPage === 'users' ? 'active' : ''}`}
                  title={isCollapsed ? 'Gestión de Usuarios' : ''}
                >
                  <Users size={20} style={{ minWidth: '20px' }} />
                  {!isCollapsed && <span>Gestión de Usuarios</span>}
                </button>
              )
            }
          } catch {
            return null
          }
          return null
        })()}

        <button
          onClick={() => setCurrentPage('detections')}
          className={`nav-link ${currentPage === 'detections' ? 'active' : ''}`}
          title={isCollapsed ? 'Detecciones' : ''}
        >
          <Database size={20} style={{ minWidth: '20px' }} />
          {!isCollapsed && <span>Detecciones</span>}
        </button>

        <button
          onClick={() => setCurrentPage('user-profile')}
          className={`nav-link ${currentPage === 'user-profile' ? 'active' : ''}`}
          title={isCollapsed ? 'Perfil' : ''}
        >
          <User size={20} style={{ minWidth: '20px' }} />
          {!isCollapsed && <span>Perfil</span>}
        </button>
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={onLogout}
          className="nav-link"
          style={{ color: 'var(--danger)', width: '100%' }}
          title="Cerrar Sesión"
        >
          <LogOut size={20} style={{ minWidth: '20px' }} />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
        {!isCollapsed && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
            BioFacial v2.1.0
          </div>
        )}
      </div>

    </aside>
  )
}