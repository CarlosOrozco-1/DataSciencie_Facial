import { useState, useEffect } from 'react'
import { authFetch, API_URL } from '../utils/api'
import { 
  Calendar, 
  Trash2, 
  Edit2, 
  X, 
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Download,
  Mail
} from 'lucide-react'

export default function DetectionsManager() {
  const [detections, setDetections] = useState([])
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [genderFilter, setGenderFilter] = useState('')
  const [cameraFilter, setCameraFilter] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ gender: '', confidence: '' })
  const [page, setPage] = useState(0)
  const limit = 20

  // Estados para el reporte por correo
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportConfig, setReportConfig] = useState({
    email: '',
    format: 'pdf',
    message: ''
  })
  const [sendingReport, setSendingReport] = useState(false)

  const fetchDetections = async () => {
    try {
      const queryParams = new URLSearchParams({
        skip: (page * limit).toString(),
        limit: limit.toString()
      })
      
      if (selectedDate) {
        // Convertir la fecha local seleccionada a sus rangos UTC para consultar correctamente en la base de datos
        const start = new Date(`${selectedDate}T00:00:00`);
        const end = new Date(`${selectedDate}T23:59:59`);
        queryParams.append('start_date', start.toISOString());
        queryParams.append('end_date', end.toISOString());
      }
      if (genderFilter) {
        queryParams.append('gender', genderFilter)
      }
      if (cameraFilter) {
        queryParams.append('camera_id', cameraFilter)
      }
      
      const [detsRes, camsRes] = await Promise.all([
        authFetch(`${API_URL}/api/detections/?${queryParams.toString()}`),
        authFetch(`${API_URL}/api/cameras/`)
      ])

      if (detsRes.ok && camsRes.ok) {
        const detsData = await detsRes.json()
        const camsData = await camsRes.json()
        setDetections(detsData)
        setCameras(camsData)
      }
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetections()
  }, [selectedDate, page, genderFilter, cameraFilter])

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value)
    setPage(0)
  }

  const getCameraName = (cameraId) => {
    const cam = cameras.find(c => c.id === cameraId)
    return cam?.name || cam?.hardware_label || `Cámara ${cameraId}` || 'Desconocida'
  }

  const handleEdit = (det) => {
    setEditingId(det.id)
    setEditForm({ gender: det.gender, confidence: det.confidence })
  }

  const handleSave = async (id) => {
    const res = await authFetch(`${API_URL}/api/detections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gender: editForm.gender,
        confidence: parseFloat(editForm.confidence)
      })
    })

    if (res.ok) {
      setEditingId(null)
      fetchDetections()
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditForm({ gender: '', confidence: '' })
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta detección?')) return

    const res = await authFetch(`${API_URL}/api/detections/${id}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      fetchDetections()
    }
  }

  const clearFilters = () => {
    setGenderFilter('')
    setCameraFilter('')
    setPage(0)
  }

  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha/Hora', 'Camara', 'Genero', 'Edad', 'Confianza']
    const rows = detections.map(det => [
      det.id,
      new Date(det.timestamp).toLocaleString(),
      getCameraName(det.camera_id),
      det.gender === 'male' ? 'Hombre' : det.gender === 'female' ? 'Mujer' : det.gender === 'spoof' ? 'Suplantacion' : det.gender,
      det.age || 'Desconocida',
      `${Math.round(det.confidence * 100)}%`
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob(["\uFEFF"+csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `detecciones_${selectedDate || 'todas'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSendReport = async (e) => {
    e.preventDefault()
    if (!reportConfig.email) {
      alert('Por favor ingresa un correo electrónico')
      return
    }

    setSendingReport(true)
    try {
      // Preparamos los filtros actuales para enviarlos al backend
      const payload = {
        email: reportConfig.email,
        format: reportConfig.format,
        message: reportConfig.message,
        camera_id: cameraFilter ? parseInt(cameraFilter) : null,
        gender: genderFilter || null,
        start_date: selectedDate ? new Date(`${selectedDate}T00:00:00`).toISOString() : null,
        end_date: selectedDate ? new Date(`${selectedDate}T23:59:59`).toISOString() : null
      }

      const res = await authFetch(`${API_URL}/api/reports/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        alert(data.message || 'Reporte enviado con éxito')
        setShowReportModal(false)
      } else {
        const err = await res.json()
        alert(`Error: ${err.detail || 'No se pudo enviar el reporte'}`)
      }
    } catch (error) {
      console.error('Error enviando reporte:', error)
      alert('Error de conexión al intentar enviar el reporte')
    } finally {
      setSendingReport(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '80vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="animate-spin" style={{ width: 48, height: 48, border: '4px solid var(--border-subtle)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
        <p className="page-subtitle">Cargando detecciones...</p>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <header className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Gestión de Detecciones</h1>
          <p className="page-subtitle">Consulta, modifica y elimina registros</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--accent-primary)' }} />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <option value="">Todos los géneros</option>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--accent-primary)' }} />
            <select
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                minWidth: '180px'
              }}
            >
              <option value="">Todas las cámaras</option>
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>
                  {cam.name || cam.hardware_label || `Cámara ${cam.id}`}
                </option>
              ))}
            </select>
          </div>

          {(genderFilter || cameraFilter) && (
            <button
              onClick={clearFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.5rem 0.75rem',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <X size={14} /> Limpiar
            </button>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button
              onClick={() => setShowReportModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'var(--accent-primary)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Mail size={16} /> Enviar Reporte
            </button>

            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: 'var(--success)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Download size={16} /> Exportar CSV
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Fecha/Hora</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Cámara</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Género</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Edad</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Confianza</th>
              <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {detections.map(det => (
              <tr key={det.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>#{det.id}</td>
                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                  {new Date(det.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                  {getCameraName(det.camera_id)}
                </td>
                <td style={{ padding: '1rem' }}>
                  {editingId === det.id ? (
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '0.3rem 0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  ) : (
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      background: det.gender === 'male' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 114, 182, 0.15)',
                      color: det.gender === 'male' ? '#38bdf8' : '#f472b6'
                    }}>
                      {det.gender === 'male' ? 'Hombre' : 'Mujer'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {det.age || '-'}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                  {editingId === det.id ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={editForm.confidence}
                      onChange={(e) => setEditForm({ ...editForm, confidence: e.target.value })}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '0.3rem 0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        width: '80px'
                      }}
                    />
                  ) : (
                    <span style={{ fontWeight: 600 }}>{Math.round(det.confidence * 100)}%</span>
                  )}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  {editingId === det.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleSave(det.id)}
                        style={{ background: 'var(--success)', border: 'none', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer', display: 'flex' }}
                      >
                        <Check size={16} style={{ color: 'white' }} />
                      </button>
                      <button
                        onClick={handleCancel}
                        style={{ background: 'var(--text-secondary)', border: 'none', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer', display: 'flex' }}
                      >
                        <X size={16} style={{ color: 'white' }} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleEdit(det)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.4rem' }}
                      >
                        <Edit2 size={16} style={{ color: 'var(--accent-primary)' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(det.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.4rem' }}
                      >
                        <Trash2 size={16} style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {detections.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No hay detecciones para la fecha seleccionada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex-between" style={{ marginTop: '1rem' }}>
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: page === 0 ? 'var(--bg-input)' : 'var(--accent-primary)',
            border: 'none',
            borderRadius: '8px',
            color: page === 0 ? 'var(--text-secondary)' : 'white',
            cursor: page === 0 ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <ChevronLeft size={18} /> Anterior
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Página {page + 1}
        </span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={detections.length < limit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: detections.length < limit ? 'var(--bg-input)' : 'var(--accent-primary)',
            border: 'none',
            borderRadius: '8px',
            color: detections.length < limit ? 'var(--text-secondary)' : 'white',
            cursor: detections.length < limit ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Siguiente <ChevronRight size={18} />
        </button>
      </div>

      {/* Modal para Envío de Reporte */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setShowReportModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Mail style={{ color: 'var(--accent-primary)' }} /> 
              Enviar Reporte
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              El reporte incluirá los datos filtrados actualmente.
            </p>

            <form onSubmit={handleSendReport}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Correo de Destino</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={reportConfig.email}
                  onChange={(e) => setReportConfig({ ...reportConfig, email: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Formato del Reporte</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ flex: 1, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={reportConfig.format === 'pdf'}
                      onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
                      style={{ marginRight: '0.5rem' }}
                    />
                    PDF
                  </label>
                  <label style={{ flex: 1, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={reportConfig.format === 'excel'}
                      onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
                      style={{ marginRight: '0.5rem' }}
                    />
                    Excel
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Mensaje (Opcional)</label>
                <textarea
                  placeholder="Escribe un mensaje para incluir en el correo..."
                  value={reportConfig.message}
                  onChange={(e) => setReportConfig({ ...reportConfig, message: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    color: 'var(--text-primary)',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={sendingReport}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: sendingReport ? 'not-allowed' : 'pointer',
                  opacity: sendingReport ? 0.7 : 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {sendingReport ? (
                  <>
                    <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check size={18} /> Enviar Reporte Ahora
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}