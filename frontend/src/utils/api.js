// Helper centralizado para todas las peticiones autenticadas con JWT
// Inyecta automáticamente el header Authorization: Bearer <token>
const API_URL = 'http://localhost:8000'

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
