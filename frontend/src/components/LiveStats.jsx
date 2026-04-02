import { useState, useEffect } from 'react'

// [NUEVO CÓDIGO]: Componente LiveStats React.
// Reemplaza la inyección en Streamlit. Utiliza un hook asincrónico para
// recabar estadísticas del nodo cada segundo, logrando interactividad sin refrescos visuales crudos.
export default function LiveStats({ cameraId }) {
  const [stats, setStats] = useState({
    total_detections: '-',
    male_count: '-',
    female_count: '-',
    avg_confidence: '-'
  })

  useEffect(() => {
    let mounted = true
    const fetchStats = async () => {
      if (!cameraId) return;
      try {
        const res = await fetch(`http://localhost:8000/api/detections/stats?camera_id=${cameraId}`)
        if (res.ok && mounted) {
          const data = await res.json()
          setStats({
            total_detections: data.total_detections,
            male_count: data.male_count,
            female_count: data.female_count,
            avg_confidence: `${data.avg_confidence.toFixed(1)}%`
          })
        }
      } catch (e) {
        // En caso de fallar, callamos la excepción para evitar polución de consola si la API está reiniciando
      }
    }

    // Polling nativo de React cada 1000 ms.
    const interval = setInterval(fetchStats, 1000)
    fetchStats() // primera carga

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [cameraId])

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Rendimiento del Nodo (En Vivo)
      </h3>
      
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-title">Detecciones Históricas</div>
          <div className="metric-value">{stats.total_detections}</div>
        </div>
        <div className="card metric-card">
          <div className="metric-title">Hombres</div>
          <div className="metric-value">{stats.male_count}</div>
        </div>
        <div className="card metric-card">
          <div className="metric-title">Mujeres</div>
          <div className="metric-value">{stats.female_count}</div>
        </div>
        <div className="card metric-card">
          <div className="metric-title">Confiabilidad</div>
          <div className="metric-value">{stats.avg_confidence}</div>
        </div>
      </div>
    </div>
  )
}
