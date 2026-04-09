import React, { useState, useMemo } from 'react';
import {
  Users,
  User,
  UserRound,
  Activity,
  BarChart3,
  RefreshCcw,
  Play,
  Pause,
  ArrowUpRight,
  TrendingUp,
  Settings
} from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { WebcamDetection } from '../components/WebcamDetection';
import { RtspDetection } from '../components/RtspDetection';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { authFetch, API_URL } from '../utils/api';

export default function LiveView() {
  const [cameras, setCameras] = useState([]);
  const [selectedCam, setSelectedCam] = useState('');

  const [maleCount, setMaleCount] = useState(0);

  const [femaleCount, setFemaleCount] = useState(0);
  const [isDetecting, setIsDetecting] = useState(true);
  const [sessionStartTime] = useState(new Date());

  const fetchCameras = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/cameras/`);
      const data = await res.json();
      setCameras(data);
      if (data.length > 0) {
        setSelectedCam(data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchCameras();
  }, []);

  const fetchStats = async () => {
    if (!selectedCam) return;
    try {
      const res = await authFetch(`${API_URL}/api/detections/stats?camera_id=${selectedCam}`);
      const data = await res.json();
      setMaleCount(data.male_count || 0);
      setFemaleCount(data.female_count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  // Polling de estadísticas
  React.useEffect(() => {
    fetchStats(); // Fetch inicial al cambiar de cámara
    let interval;
    if (isDetecting && selectedCam) {
      interval = setInterval(fetchStats, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [selectedCam, isDetecting]);

  const totalCount = maleCount + femaleCount;

  // Mantenemos handleDetection vacio si la webcam lo llama, ya que ahora 
  // polling nos proveerá los datos frescos de la BD directamente.
  const handleDetection = (gender) => { };

  const resetCounts = () => {
    // Si queremos reiniciar el backend, tendríamos que mandar un DELETE logico. 
    // Por ahora, recargamos la página o solo ignoramos el botón local.
    fetchStats();
  };

  const chartData = useMemo(() => [
    { name: 'Hombres', value: maleCount, fill: '#38bdf8' },
    { name: 'Mujeres', value: femaleCount, fill: '#818cf8' },
  ], [maleCount, femaleCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <header className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Activity style={{ color: 'var(--accent-primary)', width: '2rem', height: '2rem' }} />
            Detección de Género { /* titulos de la pagina vista en vivo */}
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>Panel de Análisis de Audiencia Local en Tiempo Real</p>
        </div>

        {cameras.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cámara Activa:</label>
            <select
              value={selectedCam}
              onChange={(e) => setSelectedCam(e.target.value)}
              style={{ margin: 0, padding: '0.25rem 0.5rem', backgroundColor: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', minWidth: '200px' }}
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id} style={{ color: 'black' }}>
                  {cam.name} ({cam.location})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className={`btn ${isDetecting ? 'btn-danger' : 'btn-primary'}`}
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            onClick={() => setIsDetecting(!isDetecting)}
          >
            {isDetecting ? <Pause style={{ width: '1rem', height: '1rem' }} /> : <Play style={{ width: '1rem', height: '1rem' }} />}
            {isDetecting ? "Detener Detección" : "Iniciar Detección"}
          </button>
          {/*<button className="btn" style={{ backgroundColor: 'var(--border-subtle)', color: 'white', padding: '0.75rem' }} onClick={resetCounts}>
            <RefreshCcw style={{ width: '1rem', height: '1rem' }} />
          </button>
          <button className="btn" style={{ backgroundColor: 'var(--border-subtle)', color: 'white', padding: '0.75rem' }}>
            <Settings style={{ width: '1rem', height: '1rem' }} />
          </button>*/}{/* Botones de control del modulo vista en vivo sin configurar*/}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Main Content: Camera Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', gridColumn: 'span 2' }}>
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users style={{ width: '1.25rem', height: '1.25rem', color: 'var(--accent-primary)' }} />
                Transmisión Local Analizada
              </h2>
            </div>

            {/* Aquí integramos el componente híbrido según el URL */}
            {cameras.length > 0 && selectedCam ? (
              cameras.find(c => c.id.toString() === selectedCam)?.url?.startsWith('rtsp://') ? (
                <RtspDetection
                  key={`rtsp-${selectedCam}`}
                  cameraId={parseInt(selectedCam)}
                  isDetecting={isDetecting}
                />
              ) : (
                <WebcamDetection
                  key={`webcam-${selectedCam}`}
                  onDetection={handleDetection}
                  isDetecting={isDetecting}
                  cameraId={parseInt(selectedCam)}
                  deviceId={cameras.find(c => c.id.toString() === selectedCam)?.url}
                  hardwareLabel={cameras.find(c => c.id.toString() === selectedCam)?.hardware_label}
                />
              )
            ) : (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No hay cámaras configuradas. Ve a Gestión de Cámaras para agregar una.
              </div>
            )}
          </section>

          {/* Quick Metrics */}
          <div className="metrics-grid" style={{ marginTop: 0 }}>
            <StatsCard
              label="Hombres"
              count={maleCount}
              icon={<User style={{ width: '1.5rem', height: '1.5rem' }} />}
            />
            <StatsCard
              label="Mujeres"
              count={femaleCount}
              icon={<UserRound style={{ width: '1.5rem', height: '1.5rem' }} />}
              accent
            />
            <StatsCard
              label="Total"
              count={totalCount}
              icon={<Users style={{ width: '1.5rem', height: '1.5rem' }} />}
              colorClass="status-inactive"
            />
          </div>
        </div>

        {/* Sidebar: Analytics Dashboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <BarChart3 style={{ width: '1.25rem', height: '1.25rem', color: 'var(--accent-secondary)' }} />
                Distribución por Género
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Análisis porcentual de la sesión actual</p>
            </div>

            <div style={{ height: '250px', width: '100%', minWidth: '10px' }}>
              {totalCount > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                      itemStyle={{ color: 'white' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', border: '2px dashed var(--border-subtle)', borderRadius: '12px' }}>
                  <TrendingUp style={{ width: '3rem', height: '3rem', marginBottom: '0.5rem', opacity: 0.2 }} />
                  <p style={{ fontSize: '0.875rem' }}>Esperando detecciones...</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                  <span>Masculino</span>
                </div>
                <span style={{ fontWeight: 'bold' }}>{totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 0}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: 'var(--accent-secondary)' }} />
                  <span>Femenino</span>
                </div>
                <span style={{ fontWeight: 'bold' }}>{totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 0}%</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <TrendingUp style={{ width: '1.25rem', height: '1.25rem', color: 'var(--accent-primary)' }} />
              Rendimiento de Sesión
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="metric-title">Tasa de Detección</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {isDetecting ? "15.4" : "0.0"} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>pers/min</span>
                  </p>
                </div>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                  <ArrowUpRight style={{ width: '1.25rem', height: '1.25rem', color: 'var(--success)' }} />
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border-subtle)', opacity: 0.5 }} />

              <div>
                <p className="metric-title">Iniciado hace</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  {Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000 / 60)} minutos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
