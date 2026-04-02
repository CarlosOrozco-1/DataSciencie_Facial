import { Camera, Settings, Activity } from 'lucide-react'

// [NUEVO CÓDIGO]: Componente Sidebar para reemplazar el st.sidebar de Streamlit.
// Usa íconos de lucide-react y mantiene un diseño oscuro premium.
export default function Sidebar({ currentPage, setCurrentPage }) {
  return (
    <aside className="sidebar">
      <div className="brand-title">
        <Activity size={28} />
        FaceGuard
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
      
      <div style={{ marginTop: 'auto', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        Sistema de Reconocimiento v2.0
      </div>
    </aside>
  )
}
