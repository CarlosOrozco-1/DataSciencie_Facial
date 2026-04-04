import { useState, useEffect } from 'react'
import { authFetch, API_URL } from '../utils/api'

// [NUEVO CÓDIGO]: Lógica de gestión de cámaras con React.
// Maneja peticiones POST y DELETE a FastAPI simulando el comportamiento preexistente 
// de st.form pero con interactividad real, vaciado asíncrono y mensajes visuales nativos.
export default function CameraManager() {
  const [cameras, setCameras] = useState([])
  const [activeIds, setActiveIds] = useState([])
  
  const [formData, setFormData] = useState({ name: '', location: '', url: '' })
  const [loading, setLoading] = useState(true)
  const [localDevices, setLocalDevices] = useState([])
  const [cameraToDelete, setCameraToDelete] = useState(null)

  const fetchCameras = async () => {
    try {
      const [camRes, statRes] = await Promise.all([
        authFetch(`${API_URL}/api/cameras/`),
        authFetch(`${API_URL}/api/processing/status`)
      ])
      
      const camData = await camRes.json()
      const statData = await statRes.json()
      
      setCameras(camData)
      setActiveIds(statData.active_cameras.map(c => c.camera_id))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCameras()
  }, [])

  const detectLocalCameras = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true }) // Solicita permisos
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setLocalDevices(videoDevices)
      if (videoDevices.length > 0) {
        setFormData(prev => ({...prev, url: videoDevices[0].deviceId}))
      }
    } catch (err) {
      alert("No se pudo acceder a las cámaras. Verifique los permisos.")
    }
  }

  const handleAddCamera = async (e) => {
    e.preventDefault()
    try {
      const res = await authFetch(`${API_URL}/api/cameras/`, {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setFormData({ name: '', location: '', url: '' })
        fetchCameras()
      } else {
        alert("Error al añadir la cámara")
      }
    } catch (e) {
      alert("Fallo de conexión")
    }
  }

  const handleDeleteRequest = (id) => {
    setCameraToDelete(id)
  }

  const handleConfirmDelete = async () => {
    if (!cameraToDelete) return;
    try {
      await authFetch(`${API_URL}/api/cameras/${cameraToDelete}`, { method: 'DELETE' })
      setCameraToDelete(null)
      fetchCameras()
    } catch (e) {
      alert("Error eliminando")
    }
  }

  const handleCancelDelete = () => {
    setCameraToDelete(null)
  }

  const handleToggleProcessing = async (id, isCurrentlyActive) => {
    const method = isCurrentlyActive ? 'stop' : 'start';
    try {
      await authFetch(`${API_URL}/api/processing/${method}/${id}`, { method: 'POST' })
      fetchCameras()
    } catch (e) {
      alert(`Error al intentar ${method} el procesamiento`)
    }
  }

  if (loading) return <div className="page-subtitle">Cargando datos...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '2rem' }}>
      
      <div>
        <h1 className="page-title">Gestión de Cámaras</h1>
        <p className="page-subtitle">Añade o manipula las cámaras instaladas en el circuito. Los IDs USB típicamente son 0, 1 o secuencias rtsp://</p>
      </div>

      <form onSubmit={handleAddCamera} className="card" style={{ maxWidth: '600px' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Añadir Nueva Cámara</h2>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre de la Cámara</label>
          <input 
            type="text" 
            required 
            placeholder="Ej: Entrada Principal"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Ubicación</label>
          <input 
            type="text" 
            placeholder="Ej: Lobby Norte"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
          />
        </div>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
            <label style={{ display: 'block', color: 'var(--text-secondary)' }}>URL o ID del Dispositivo</label>
            <button type="button" onClick={detectLocalCameras} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--border-subtle)', color: 'white' }}>
              🔍 Detectar USB
            </button>
          </div>
          
          {localDevices.length > 0 ? (
            <select 
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              required
            >
              <option value="">Seleccione una cámara local...</option>
              {localDevices.map((dev, i) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label || `Cámara Desconocida ${i + 1}`}
                </option>
              ))}
              <option value="CUSTOM">-- Ingresar URL manualmente --</option>
            </select>
          ) : null}

          {(localDevices.length === 0 || formData.url === 'CUSTOM') && (
            <input 
              type="text" 
              required 
              placeholder="rtsp://... o ID"
              value={formData.url === 'CUSTOM' ? '' : formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
            />
          )}
        </div>
        
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
          ➕ Guardar Cámara
        </button>
      </form>

      <div>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Cámaras Registradas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {cameras.map(cam => {
            const isActive = activeIds.includes(cam.id);
            return (
              <div key={cam.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="flex-between">
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{cam.name}</h3>
                  <span className={`status-badge ${isActive ? 'status-active' : 'status-inactive'}`}>
                    {isActive ? 'Transmisión Activa' : 'Desconectado'}
                  </span>
                </div>
                
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>📍 {cam.location || 'Sin Ubicación'}</p>
                <code style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', backgroundColor: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '4px', wordBreak: 'break-all' }}>
                  {cam.url}
                </code>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button 
                    className={`btn ${isActive ? 'btn-danger' : 'btn-primary'}`} 
                    style={{ flex: 1, padding: '0.5rem' }}
                    onClick={() => handleToggleProcessing(cam.id, isActive)}
                  >
                    {isActive ? '⏹️ Detener' : '▶️ Iniciar'}
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '0.5rem' }}
                    onClick={() => handleDeleteRequest(cam.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
          {cameras.length === 0 && <p>No hay cámaras registradas.</p>}
        </div>
      </div>

      {cameraToDelete !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '2rem', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'white' }}>Confirmar Eliminación</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              ¿Estás seguro que deseas eliminar esta cámara de forma permanente?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" style={{ flex: 1, backgroundColor: 'var(--border-subtle)', color: 'white' }} onClick={handleCancelDelete}>
                Cancelar
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleConfirmDelete}>
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
