# Implementación de Autenticación: Google OAuth + Reconocimiento Facial

> **Fecha de implementación**: 25 de Abril 2026  
> **Autor**: Antigravity AI + Equipo GenderSense  
> **Google Client ID**: `1082189297764-sblg1265oumq46854eb2loajlchtirl4.apps.googleusercontent.com`

## Panorama General: 4 Métodos de Autenticación

| Método | Estado | Tipo | Descripción |
|--------|--------|------|-------------|
| Contraseña | ✅ Existente | Local | Username/email + password |
| 2FA TOTP | ✅ Existente | Segundo factor | Código 6 dígitos de Microsoft Authenticator |
| Google OAuth | 🆕 Nuevo | Externo | Login con cuenta Google via GIS |
| Reconocimiento Facial | 🆕 Nuevo | Biométrico | Webcam del navegador + verificación de embedding facial |

## Decisiones de Diseño

### ¿Tablas nuevas o campos en User?
**Se decidió agregar campos al modelo `User` existente**, siguiendo el mismo patrón de 2FA (`totp_secret` + `is_2fa_enabled`):

Para Google:
```python
google_id = Column(String, nullable=True, unique=True)
is_google_enabled = Column(Boolean, default=False)
```

Para Facial:
```python
face_embedding = Column(Text, nullable=True)      # Vector 128D serializado como JSON
has_face_enrolled = Column(Boolean, default=False)
```

`hashed_password` se hace `nullable=True` para soportar usuarios que solo usan Google.

### Gestión desde Perfil
Cada autenticación se activa/desactiva desde `UserProfile.jsx` con tarjetas independientes:

| Tarjeta | Estado | Acción |
|---------|--------|--------|
| 🔑 2FA (TOTP) | Activar / Desactivar | Ya existe |
| 🌐 Google | Vincular / Desvincular | Nuevo |
| 📷 Rostro | Registrar / Eliminar | Nuevo |

### Auto-registro con Google
Cuando un usuario nuevo hace login con Google, se crea automáticamente con `is_admin=False`. Si el email ya existe en la BD, se vincula la cuenta Google al usuario existente.

---

## Fase 1: Google OAuth 2.0

### Flujo
1. Frontend carga la librería Google Identity Services (GIS)
2. Usuario hace click en "Iniciar con Google" → popup de Google
3. Google retorna un `id_token` (JWT firmado por Google)
4. Frontend envía el token a `POST /api/auth/google`
5. Backend verifica el token con `google.oauth2.id_token.verify_oauth2_token()`
6. Si es válido → busca/crea usuario → emite JWT de GenderSense

### Dependencias
- Backend: `google-auth==2.28.1`, `requests==2.31.0`
- Frontend: Script `https://accounts.google.com/gsi/client`

### Endpoints nuevos
- `POST /api/auth/google` — Login/registro con Google (público)

### Configuración requerida en Google Cloud Console
- Agregar orígenes autorizados: `http://localhost:8501` (dev), dominio real (prod)

---

## Fase 2: Reconocimiento Facial

### Concepto
Se usa `face_recognition` (basada en dlib) para generar **face embeddings** — vectores de 128 dimensiones que representan la identidad única de un rostro.

### Ejemplo de embedding
```json
[-0.0819, 0.0692, -0.0166, -0.0440, -0.1035, 0.0096, -0.0457, 0.0089,
 0.1660, -0.1426, 0.2045, -0.0253, -0.2222, -0.0244, -0.0466, 0.1417,
 ... (128 valores float en total)]
```

### Comparación
Distancia euclidiana entre embeddings:
- **< 0.6** → Misma persona ✅
- **≥ 0.6** → Personas diferentes ❌

### Flujo de Registro (desde Perfil)
1. Usuario autenticado hace click en "Registrar mi rostro"
2. Se capturan 3 fotos con la webcam
3. Se genera embedding por cada foto y se promedian
4. Se almacena en `User.face_embedding` como JSON

### Flujo de Login
1. Click en "Iniciar con Rostro" en pantalla de login
2. Se captura 1 foto con webcam
3. Se envía a `POST /api/auth/face/login`
4. Backend genera embedding y compara contra todos los registrados
5. Si hay match → JWT de GenderSense

### Anti-Spoofing
Se reutiliza `GenderEstimator.check_liveness()` existente (Laplacian variance + bright pixel check).

### Dependencias
- Backend: `face_recognition==1.3.0` (incluye dlib)
- Docker: `cmake`, `build-essential`, `libopenblas-dev`, `liblapack-dev`

### Endpoints nuevos
- `POST /api/auth/face/enroll` — Registrar rostro (requiere JWT)
- `POST /api/auth/face/login` — Login con rostro (público)
- `DELETE /api/auth/face/enroll` — Eliminar rostro registrado (requiere JWT)

---

## Archivos Modificados

| Archivo | Google | Facial |
|---------|:------:|:------:|
| `app/requirements.txt` | ✅ | ✅ |
| `Dockerfile.app` | — | ✅ |
| `app/models/user.py` | ✅ | ✅ |
| `app/schemas/user.py` | ✅ | ✅ |
| `app/api/auth.py` | ✅ | ✅ |
| `app/core/security.py` | ✅ | — |
| `backend/vision/face_auth.py` | — | ✅ (Nuevo) |
| `frontend/index.html` | ✅ | — |
| `frontend/src/pages/Login.jsx` | ✅ | ✅ |
| `frontend/src/pages/UserProfile.jsx` | — | ✅ |
| `frontend/src/index.css` | ✅ | ✅ |
| `.env` / `.env.example` | ✅ | ✅ |
| `docker-compose.yml` | ✅ | ✅ |
