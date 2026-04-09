import { useState, useEffect } from 'react'
import { authFetch, API_URL } from '../utils/api'
import { Users, UserPlus, Trash2, KeyRound, Edit, X, Check, ShieldCheck, ShieldOff } from 'lucide-react'

// Módulo CRUD exclusivo para Administradores
export default function UserManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ username: '', email: '', password: '', is_admin: false })
  const [showForm, setShowForm] = useState(false)
  
  // Estado para modales
  const [userToDelete, setUserToDelete] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const [editData, setEditData] = useState({ username: '', email: '', is_admin: false })
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/users/`)
      if (res.status === 403) {
        alert('Privilegios insuficientes')
        window.location.reload()
        return
      }
      const data = await res.json()
      setUsers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  // Crear usuario
  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await authFetch(`${API_URL}/api/users/`, {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setFormData({ username: '', email: '', password: '', is_admin: false })
        setShowForm(false)
        fetchUsers()
      } else {
        const err = await res.json()
        setError(err.detail || 'Error al crear usuario')
      }
    } catch (e) {
      setError('Fallo de conexión')
    }
  }

  // Eliminar usuario
  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    try {
      const res = await authFetch(`${API_URL}/api/users/${userToDelete}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        alert(err.detail || 'Error al eliminar')
      }
      setUserToDelete(null)
      fetchUsers()
    } catch (e) {
      alert('Error de conexión')
    }
  }

  // Resetear contraseña
  const handleResetPassword = async () => {
    if (!resetTarget || !resetPassword) return
    try {
      const res = await authFetch(`${API_URL}/api/users/${resetTarget}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ new_password: resetPassword })
      })
      if (res.ok) {
        setResetTarget(null)
        setResetPassword('')
        alert('Contraseña restablecida exitosamente')
      } else {
        const err = await res.json()
        alert(err.detail || 'Error al restablecer')
      }
    } catch (e) {
      alert('Error de conexión')
    }
  }

  // Editar usuario
  const handleStartEdit = (user) => {
    setEditTarget(user.id)
    setEditData({ username: user.username, email: user.email, is_admin: user.is_admin })
  }

  const handleSaveEdit = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/users/${editTarget}`, {
        method: 'PUT',
        body: JSON.stringify(editData)
      })
      if (res.ok) {
        setEditTarget(null)
        fetchUsers()
      } else {
        const err = await res.json()
        alert(err.detail || 'Error al actualizar')
      }
    } catch (e) {
      alert('Error de conexión')
    }
  }

  if (loading) return <div className="page-subtitle">Cargando usuarios...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '2rem' }}>
      
      {/* Header */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users style={{ color: 'var(--accent-primary)' }} size={28} />
            Gestión de Usuarios (Admin)
          </h1>
          <p className="page-subtitle">Administra los accesos y privilegios del sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={18} />
            {showForm ? 'Cancelar Ocultar' : 'Nuevo Usuario'}
          </button>
        </div>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ maxWidth: '600px' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Registrar Nuevo Usuario</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre de Usuario</label>
              <input type="text" required placeholder="Ej: operador1" value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Correo Electrónico</label>
              <input type="email" required placeholder="Ej: operador@empresa.com" value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Contraseña</label>
              <input type="password" required placeholder="Mínimo 6 caracteres" value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
            
            {/* Selector de Privilegios Administrativos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '0.5rem' }}>
                <input type="checkbox" id="isAdminCheckbox" 
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })} 
                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}/>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label htmlFor="isAdminCheckbox" style={{ fontWeight: 'bold', color: 'var(--warning)', cursor: 'pointer', margin: 0 }}>Otorgar Privilegios de Administrador</label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>El usuario podrá crear, editar y eliminar a otros en este módulo.</span>
                </div>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: '1rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
            ➕ Crear Usuario
          </button>
        </form>
      )}

      {/* Tabla de usuarios */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>ID</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Usuario</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Email</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Rol</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Estado</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>2FA</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>Registrado</th>
              <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{u.id}</td>
                <td style={{ padding: '0.75rem' }}>
                  {editTarget === u.id ? (
                    <input type="text" value={editData.username} onChange={(e) => setEditData({...editData, username: e.target.value})} style={{ padding: '0.3rem 0.5rem', width: '120px' }} />
                  ) : (
                    <span style={{ fontWeight: 600 }}>{u.username}</span>
                  )}
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {editTarget === u.id ? (
                    <input type="email" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} style={{ padding: '0.3rem 0.5rem', width: '200px' }} />
                  ) : u.email}
                </td>
                <td style={{ padding: '0.75rem' }}>
                    {editTarget === u.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input type="checkbox" checked={editData.is_admin} onChange={(e) => setEditData({ ...editData, is_admin: e.target.checked })} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Admin</span>
                        </div>
                    ) : (
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: u.is_admin ? 'rgba(234, 179, 8, 0.2)' : 'rgba(56, 189, 248, 0.1)', color: u.is_admin ? 'var(--warning)' : 'var(--accent-primary)' }}>
                            {u.is_admin ? 'Administrador' : 'Estándar'}
                        </span>
                    )}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span className={`status-badge ${u.is_active ? 'status-active' : 'status-inactive'}`}>
                    {u.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
                    color: u.is_2fa_enabled ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {u.is_2fa_enabled ? <><ShieldCheck size={14} /> Activo</> : <><ShieldOff size={14} /> No</>}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('es-GT') : '—'}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    {editTarget === u.id ? (
                      <>
                        <button className="btn" style={{ padding: '0.4rem', backgroundColor: 'var(--success)' }} onClick={handleSaveEdit} title="Guardar">
                          <Check size={16} />
                        </button>
                        <button className="btn" style={{ padding: '0.4rem', backgroundColor: 'var(--border-subtle)' }} onClick={() => setEditTarget(null)} title="Cancelar">
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn" style={{ padding: '0.4rem', backgroundColor: 'var(--accent-secondary)' }} onClick={() => handleStartEdit(u)} title="Editar Privilegios">
                          <Edit size={16} />
                        </button>
                        <button className="btn" style={{ padding: '0.4rem', backgroundColor: 'var(--warning)' }} onClick={() => setResetTarget(u.id)} title="Resetear Contraseña">
                          <KeyRound size={16} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '0.4rem' }} onClick={() => setUserToDelete(u.id)} title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay usuarios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de eliminación */}
      {userToDelete !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '2rem', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Confirmar Eliminación</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>¿Estás seguro que deseas eliminar este usuario de forma permanente?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn" style={{ flex: 1, backgroundColor: 'var(--border-subtle)', color: 'white' }} onClick={() => setUserToDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleConfirmDelete}>Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de reset de contraseña */}
      {resetTarget !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '2rem', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={22} style={{ color: 'var(--warning)' }} />
              Restablecer Contraseña
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              Ingresa la nueva contraseña para el usuario #{resetTarget}
            </p>
            <input type="password" placeholder="Nueva contraseña" value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)} style={{ marginBottom: '1.5rem' }} />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" style={{ flex: 1, backgroundColor: 'var(--border-subtle)', color: 'white' }} onClick={() => { setResetTarget(null); setResetPassword('') }}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleResetPassword}>Restablecer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
