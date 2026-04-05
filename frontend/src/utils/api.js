// Helper centralizado para todas las peticiones autenticadas con JWT
// En desarrollo usa localhost:8000, en producción usa la ruta relativa del proxy
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : window.location.origin;

// Exportamos también el prefijo base si es necesario para otros módulos
const API_BASE = window.location.hostname === 'localhost' ? API_URL : `${window.location.origin}/api`;

export function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
}

export async function authFetch(url, options = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  }
  
  const res = await fetch(url, { ...options, headers })
  
  // Si el backend responde 401, el token expiró: limpiar y recargar
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.reload()
  }
  
  return res
}

export { API_URL }
