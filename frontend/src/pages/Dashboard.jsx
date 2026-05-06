import { useState, useEffect } from 'react'
import { authFetch, API_URL } from '../utils/api'
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Clock, 
  Camera, 
  UserCheck,
  ChevronRight,
  MapPin
} from 'lucide-react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

export default function Dashboard({ setCurrentPage }) {
  const [stats, setStats] = useState(null)
  const [recentDetections, setRecentDetections] = useState([])
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState([])
  const [selectedLocation, setSelectedLocation] = useState('')

  const fetchData = async () => {
    try {
      const locationParam = selectedLocation ? `&location=${encodeURIComponent(selectedLocation)}` : ''
      const [statsRes, detectionsRes, camerasRes, locationsRes] = await Promise.all([
        authFetch(`${API_URL}/api/detections/stats${locationParam ? `?${locationParam.slice(1)}` : ''}`),
        authFetch(`${API_URL}/api/detections/${locationParam ? `?${locationParam.slice(1)}` : ''}`),
        authFetch(`${API_URL}/api/cameras/`),
        authFetch(`${API_URL}/api/cameras/locations`)
      ])
      
      if (statsRes.ok && detectionsRes.ok && camerasRes.ok) {
        const statsData = await statsRes.json()
        const detectionsData = await detectionsRes.json()
        const camerasData = await camerasRes.json()
        const locationsData = locationsRes.ok ? await locationsRes.json() : []
        
        setLocations(locationsData)
        
        const cameraMap = camerasData.reduce((acc, cam) => {
          acc[cam.id] = cam.name || cam.hardware_label || `Cam ${cam.id}`
          return acc
        }, {})
        
        const enrichedDetections = detectionsData.slice(0, 5).map(det => ({
            ...det,
            camera_name: cameraMap[det.camera_id] || `Cámara ${det.camera_id}`
        }))
        
        setStats(statsData)
        setRecentDetections(enrichedDetections)
      }
    } catch (e) {
      console.error("Error fetching dashboard data:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [selectedLocation])

  const handleLocationChange = (e) => {
    setSelectedLocation(e.target.value)
  }

  if (loading || !stats) {
    return (
      <div className="flex-center" style={{ height: '80vh', flexDirection: 'column', gap: '1rem' }}>
        <Activity className="animate-spin" size={48} style={{ color: 'var(--accent-primary)' }} />
        <p className="page-subtitle">Cargando Dashboard Inteligente...</p>
      </div>
    )
  }

  const malePercent = stats.total_detections > 0 ? (stats.male_count / stats.total_detections) * 100 : 0
  const femalePercent = stats.total_detections > 0 ? (stats.female_count / stats.total_detections) * 100 : 0

  return (
    <div>
      <header className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Dashboard de Detecciones</h1>
          <p className="page-subtitle">Análisis demográfico y tendencias en tiempo real</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {locations.length > 0 && (
            <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={16} style={{ color: 'var(--accent-primary)' }} />
              <select 
                value={selectedLocation}
                onChange={handleLocationChange}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">Todas las ubicaciones</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          )}
          <div className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={20} style={{ color: 'var(--success)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Sistema Activo</span>
          </div>
        </div>
      </header>

      {/* Main Metrics Grid */}
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-title">Detecciones Totales</div>
          <div className="metric-value">{stats.total_detections}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <TrendingUp size={14} /> <span>Histórico acumulado</span>
          </div>
        </div>
        <div className="card metric-card">
          <div className="metric-title">Confianza Promedio</div>
          <div className="metric-value">{Math.round(stats.avg_confidence * 100)}%</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Precisión del modelo IA</p>
        </div>
        <div className="card metric-card">
          <div className="metric-title">Hombres</div>
          <div className="metric-value" style={{ background: 'linear-gradient(135deg, #38bdf8, #2563eb)', WebkitBackgroundClip: 'text' }}>
            {stats.male_count}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{Math.round(malePercent)}% del total</p>
        </div>
        <div className="card metric-card">
          <div className="metric-title">Mujeres</div>
          <div className="metric-value" style={{ background: 'linear-gradient(135deg, #f472b6, #db2777)', WebkitBackgroundClip: 'text' }}>
            {stats.female_count}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{Math.round(femalePercent)}% del total</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Silhouettes and Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Gender Silhouettes Section */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} style={{ color: 'var(--accent-primary)' }} />
              Distribución por Género
            </h3>
            
            <div className="silhouette-container">
              {/* Male Silhouette */}
              <div className="silhouette-box">
                <div className="silhouette-svg silhouette-male">
                  <div className="liquid-fill" style={{ height: `${malePercent}%`, background: 'linear-gradient(to top, #0284c7, #38bdf8)' }}></div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{Math.round(malePercent)}%</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Hombres</div>
                </div>
              </div>

              {/* Female Silhouette */}
              <div className="silhouette-box">
                <div className="silhouette-svg silhouette-female">
                  <div className="liquid-fill" style={{ height: `${femalePercent}%`, background: 'linear-gradient(to top, #be185d, #f472b6)' }}></div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{Math.round(femalePercent)}%</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Mujeres</div>
                </div>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
              Frecuencia de Detección (24h)
            </h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.history}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="var(--text-secondary)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-card)', 
                      borderColor: 'var(--border-subtle)',
                      borderRadius: '12px',
                      color: 'white'
                    }}
                    itemStyle={{ color: 'var(--accent-primary)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="var(--accent-primary)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity and Cam Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Recent Activity */}
          <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
                Actividad Reciente
              </h3>
              <button 
                className="btn" 
                onClick={() => setCurrentPage && setCurrentPage('detections')}
                style={{ padding: '0.4rem', color: 'var(--accent-primary)', fontSize: '0.85rem' }}
              >
                Ver todo <ChevronRight size={16} />
              </button>
            </div>

            <div className="recent-detections-list">
              {recentDetections.map(det => (
                <div key={det.id} className="detection-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '10px', 
                      backgroundColor: det.gender === 'male' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(244, 114, 182, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: det.gender === 'male' ? 'var(--accent-primary)' : '#f472b6'
                    }}>
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', textTransform: 'capitalize' }}>
                        {det.gender === 'male' ? 'Hombre detectado' : 'Mujer detectada'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Camera size={12} /> {det.camera_name}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{Math.round(det.confidence * 100)}%</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {new Date(det.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {recentDetections.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No hay detecciones recientes
                </div>
              )}
            </div>

            {/* 
              DOCUMENTACION: Análisis Dinámico de Flujo
              Se calcula como una comparación entre la cantidad de detecciones en la última hora vs la hora anterior a esa.
              Si el trend es > 0, significa subida. < 0 es bajada. 0 es estable.
              Esta tarjeta provee feedback situacional en tiempo real al usuario de la plataforma.
            */}
            <div className="card" style={{ marginTop: 'auto', backgroundColor: 'rgba(56, 189, 248, 0.05)', borderStyle: 'dashed' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                💡 <strong>Análisis:</strong> El flujo de personas{' '}
                {stats.flow_trend > 0 
                  ? `ha aumentado un ${stats.flow_trend}%` 
                  : stats.flow_trend < 0 
                    ? `ha disminuido un ${Math.abs(stats.flow_trend)}%`
                    : 'se mantiene estable o sin datos suficientes'}
                {' '}en la última hora.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
