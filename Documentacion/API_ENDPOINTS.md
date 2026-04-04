# 📡 API Endpoints - GenderSense

Documentación completa de todos los endpoints del backend FastAPI.  
**Base URL:** `http://localhost:8000`  
**Autenticación:** Todos los endpoints (excepto `/api/auth/login`, `/` y `/health`) requieren el header:
```
Authorization: Bearer <token_jwt>
```

---

## 🔐 Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/login` | Iniciar sesión (con soporte 2FA) | ❌ No |
| `POST` | `/api/auth/2fa/setup` | Generar QR para vincular Authenticator | ✅ Sí |
| `POST` | `/api/auth/2fa/verify` | Verificar código y activar 2FA | ✅ Sí |
| `POST` | `/api/auth/2fa/validate` | Validar código 2FA durante login (paso 2) | ❌ No |
| `POST` | `/api/auth/2fa/disable` | Desactivar 2FA | ✅ Sí |
| `POST` | `/api/auth/forgot-password` | Enviar email de recuperación | ❌ No |
| `POST` | `/api/auth/reset-password` | Restablecer contraseña con token | ❌ No |

### `POST /api/auth/login`
Acepta `username` o `email` en el campo `username`.

**Body** (`application/x-www-form-urlencoded`):
```
username=admin&password=password123
```

**Respuesta SIN 2FA** (`200`):
```json
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "token_type": "bearer",
  "requires_2fa": false,
  "temp_token": null
}
```

**Respuesta CON 2FA** (`200`):
```json
{
  "access_token": null,
  "token_type": null,
  "requires_2fa": true,
  "temp_token": "eyJ0ZW1wLi4."
}
```

### `POST /api/auth/2fa/validate`
Segundo paso del login cuando el usuario tiene 2FA activo.
```json
{
  "temp_token": "eyJ0ZW1wLi4.",
  "code": "482917"
}
```

### `POST /api/auth/2fa/setup`
Retorna QR code en base64 y clave secreta TOTP.
```json
{
  "qr_code": "data:image/png;base64,...",
  "secret": "JBSWY3DPEHPK3PXP",
  "message": "Escanea el QR con Microsoft Authenticator..."
}
```

### `POST /api/auth/2fa/verify`
Confirma que el authenticator está correctamente vinculado.
```json
{ "code": "482917" }
```

### `POST /api/auth/forgot-password`
```json
{ "email": "admin@generosense.com" }
```

### `POST /api/auth/reset-password`
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "new_password": "mi_nueva_clave"
}
```

---

## 👥 Usuarios (`/api/users`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/users/` | Listar todos los usuarios | ✅ Sí |
| `GET` | `/api/users/me` | Obtener usuario autenticado actual | ✅ Sí |
| `GET` | `/api/users/{id}` | Obtener usuario por ID | ✅ Sí |
| `POST` | `/api/users/` | Crear nuevo usuario | ✅ Sí |
| `PUT` | `/api/users/{id}` | Actualizar datos de usuario | ✅ Sí |
| `PUT` | `/api/users/{id}/reset-password` | Resetear contraseña (admin) | ✅ Sí |
| `PUT` | `/api/users/me/change-password` | Cambiar contraseña propia | ✅ Sí |
| `DELETE` | `/api/users/{id}` | Eliminar usuario | ✅ Sí |

### `POST /api/users/`
**Body** (`application/json`):
```json
{
  "username": "operador1",
  "email": "operador@empresa.com",
  "password": "clave_segura"
}
```

### `PUT /api/users/{id}`
Campos opcionales:
```json
{
  "username": "nuevo_nombre",
  "email": "nuevo@email.com",
  "is_active": false
}
```

### `PUT /api/users/{id}/reset-password`
```json
{ "new_password": "nueva_clave_segura" }
```

### `PUT /api/users/me/change-password`
```json
{
  "current_password": "clave_actual",
  "new_password": "nueva_clave"
}
```

---

## 📷 Cámaras (`/api/cameras`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/cameras/` | Listar cámaras | ✅ Sí |
| `GET` | `/api/cameras/{id}` | Obtener cámara por ID | ✅ Sí |
| `POST` | `/api/cameras/` | Registrar nueva cámara | ✅ Sí |
| `PUT` | `/api/cameras/{id}` | Actualizar cámara | ✅ Sí |
| `DELETE` | `/api/cameras/{id}` | Eliminar cámara | ✅ Sí |
| `GET` | `/api/cameras/{id}/status` | Estado de conexión | ✅ Sí |
| `POST` | `/api/cameras/{id}/test` | Probar conexión | ✅ Sí |
| `GET` | `/api/cameras/{id}/frame` | Obtener frame actual | ✅ Sí |

### `POST /api/cameras/`
```json
{
  "name": "Camara Principal",
  "url": "rtsp://192.168.10.100:554/stream1",
  "location": "Entrada Norte",
  "username": "admin",
  "password": "cam_pass"
}
```

---

## 🔍 Detecciones (`/api/detections`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/detections/` | Listar detecciones | ✅ Sí |
| `GET` | `/api/detections/stats` | Estadísticas agregadas | ✅ Sí |
| `POST` | `/api/detections/` | Registrar detección manual | ✅ Sí |
| `POST` | `/api/detections/analyze_frame` | Analizar frame con IA | ✅ Sí |

### `GET /api/detections/stats`
**Query params opcionales:**
- `camera_id` — Filtrar por cámara
- `start_date` — Fecha inicio (ISO 8601)
- `end_date` — Fecha fin (ISO 8601)

**Respuesta:**
```json
{
  "total_detections": 42,
  "male_count": 25,
  "female_count": 17,
  "avg_confidence": 0.87
}
```

### `POST /api/detections/analyze_frame`
```json
{
  "image_base64": "data:image/jpeg;base64,...",
  "camera_id": 7
}
```

---

## ⚙️ Procesamiento (`/api/processing`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/processing/start/{id}` | Iniciar procesamiento RTSP | ✅ Sí |
| `POST` | `/api/processing/stop/{id}` | Detener procesamiento | ✅ Sí |
| `GET` | `/api/processing/status` | Estado global de procesos | ✅ Sí |
| `GET` | `/api/processing/status/{id}` | Estado de cámara específica | ✅ Sí |
| `GET` | `/api/processing/frame/{id}` | Frame JPEG estático | ✅ Sí |
| `GET` | `/api/processing/video_feed/{id}` | Stream MJPEG en vivo | ✅ Sí* |

> *El endpoint `video_feed` acepta token como query param: `?token=<jwt>` para compatibilidad con etiquetas `<img>`.

---

## 🏥 Sistema

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `GET` | `/` | Info básica de la API | ❌ No |
| `GET` | `/health` | Estado de salud | ❌ No |
| `GET` | `/docs` | Documentación Swagger (auto) | ❌ No |

---

## 🔑 Credenciales por Defecto (Seed)

| Campo | Valor |
|-------|-------|
| Username | `admin` |
| Email | `admin@generosense.com` |
| Password | `password123` |

> ⚠️ **Cambiar la contraseña por defecto en producción.**
