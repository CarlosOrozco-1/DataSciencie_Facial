# 🔍 DIAGNÓSTICO Y SOLUCIÓN: CONEXIÓN DE CÁMARAS

## 📋 Resumen Ejecutivo

Tu aplicación **no podía conectar cámaras** por **4 problemas críticos**:

1. **❌ Base de datos incompleta** - Tabla `cameras` sin campos `username` y `password`
2. **❌ DATABASE_URL incorrecta en Docker** - Usaba `host.docker.internal:5433` en lugar de `db:5432`
3. **❌ Sin validación de URLs** - Aceptaba cualquier formato sin verificar
4. **❌ Sin reintentos** - Si fallaba conexión, no reintentaba

---

## ✅ CAMBIOS REALIZADOS

### 1. Script SQL Actualizado ✔️
**Archivo**: [scriptsDB/init_db.sql](scriptsDB/init_db.sql)

```sql
-- ANTES (❌ Incompleto):
CREATE TABLE cameras (
    id, name, url, location, status, created_at, updated_at
    -- Sin credenciales
)

-- DESPUÉS (✅ Correcto):
CREATE TABLE cameras (
    id, name, url,
    username, password,      ← AGREGADO
    location, status,
    is_processing,           ← AGREGADO
    created_at, updated_at
)
```

**Impacto**: Ahora puedes guardar credenciales de cámaras IP.

---

### 2. DATABASE_URL Corregida ✔️
**Archivo**: [docker-compose.yml](docker-compose.yml)

```yaml
# ANTES (❌ Incorrecto):
DATABASE_URL: postgresql://facial_user:facial_pass@host.docker.internal:5433/facial_db

# DESPUÉS (✅ Correcto):
DATABASE_URL: postgresql://facial_user:facial_pass@db:5432/facial_db
```

**Por qué funciona**:
- Dentro de Docker, los contenedores se comunican por **nombre de servicio** (`db`)
- El puerto **5432** es el puerto **interno** de PostgreSQL
- El puerto **5433** solo se usa cuando conectas desde **fuera de Docker** (ej: pgAdmin en tu máquina)

---

### 3. Validación de URLs Agregada ✔️
**Archivo**: [app/schemas/camera.py](app/schemas/camera.py)

Ahora valida automáticamente:
```python
# URLs VÁLIDAS:
✅ rtsp://192.168.1.100:554/stream
✅ http://192.168.1.101:8080/video
✅ https://cameras.example.com/stream
✅ 0 (usa /dev/video0 local)
✅ 1 (usa /dev/video1 local)

# URLs INVÁLIDAS (rechaza con error claro):
❌ ftp://camera.local/video         → Error: FTP no soportado
❌ 192.168.1.100                    → Error: Falta protocolo
❌ camera-stream                    → Error: Formato no reconocido
```

---

### 4. Retry Logic Implementada ✔️
**Archivo**: [backend/vision/processor.py](backend/vision/processor.py)

```python
# ANTES (❌ Falla inmediatamente):
def connect(self):
    self.cap = cv2.VideoCapture(url)
    if not self.cap.isOpened():
        return False  # ← Falla, sin reintentos
    return True

# DESPUÉS (✅ Reintentos automáticos):
def connect(self, retry_count=0):
    if retry_count > MAX_RETRIES:
        return False
    
    self.cap = cv2.VideoCapture(url)
    if not self.cap.isOpened():
        time.sleep(RETRY_DELAY)
        return self.connect(retry_count + 1)  # ← Reintenta automáticamente
    return True
```

**Configuración**:
- **MAX_RETRIES**: 3 intentos
- **RETRY_DELAY**: 2 segundos entre intentos
- **RECONNECT_TIMEOUT**: 5 segundos timeout por conexión

---

### 5. Archivo .env.example Mejorado ✔️
**Archivo**: [.env.example](.env.example)

Documento completo con:
- Variables de configuración
- Explicación de puertos y conectividad
- Ejemplos de URLs soportadas

---

## 🚀 CÓMO USAR AHORA

### Paso 1: Resetear Base de Datos

**⚠️ IMPORTANTE**: La BD vieja no tiene las columnas nuevas, debes recrearla.

```bash
# Opción A: Con Docker (recomendado)
docker compose down -v          # Detiene y elimina volúmenes
docker compose up -d db        # Recrea la BD desde cero
sleep 5                        # Espera a que PostgreSQL inicie
docker compose exec db psql -U facial_user -d facial_db < scriptsDB/init_db.sql

# Verificar estructura:
docker compose exec db psql -U facial_user -d facial_db -c "\d cameras"
```

**Debería mostrar**:
```
 Column      |              Type              |
 id          | integer                        | 
 name        | character varying(255)         |
 url         | character varying(500)         |
 username    | character varying(255)         | ← NUEVO
 password    | character varying(255)         | ← NUEVO
 location    | character varying(255)         |
 status      | character varying(50)          |
 is_processing | boolean                      | ← NUEVO
 created_at  | timestamp with time zone       |
 updated_at  | timestamp with time zone       |
```

---

### Paso 2: Iniciar Servicios

```bash
# Iniciar todo
docker compose up -d

# Verificar servicios corriendo
docker compose ps
```

**Debería mostrar** (todos con estado `Up`):
```
NAME            STATUS
facial_db       Up (healthy)
facial_api      Up
facial_frontend Up
```

---

### Paso 3: Crear una Cámara de Prueba

#### Opción A: Con cURL

```bash
# Crear cámara RTSP (IP camera)
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cámara Entrada IP",
    "url": "rtsp://192.168.1.100:554/stream",
    "username": "admin",
    "password": "password123",
    "location": "Entrada Principal",
    "status": "active"
  }'

# Crear cámara local
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Webcam Local",
    "url": "0",
    "location": "Oficina",
    "status": "active"
  }'
```

#### Opción B: En Postman
1. Abre http://localhost:8000/docs (Swagger UI)
2. Click en `POST /api/cameras/`
3. Click en "Try it out"
4. Copia el JSON de abajo
5. Click en "Execute"

```json
{
  "name": "Mi Cámara IP",
  "url": "rtsp://192.168.1.100:554/stream",
  "username": "admin",
  "password": "password123",
  "location": "Entrada",
  "status": "active"
}
```

---

### Paso 4: Probar Conexión

```bash
# Verificar estado de cámara (ANTES de procesamiento)
curl http://localhost:8000/api/cameras/1/status

# Respuesta esperada (conectada):
{
  "camera_id": 1,
  "name": "Mi Cámara IP",
  "url": "rtsp://192.168.1.100:554/stream",
  "status": "online",
  "accessible": true
}

# O si falla (con detalles):
{
  "camera_id": 1,
  "name": "Mi Cámara IP",
  "status": "error",
  "accessible": false,
  "error": "[Cámara 1] Error de conexión: Connection refused"
}
```

---

### Paso 5: Iniciar Procesamiento (Detector de Rostros)

```bash
# Iniciar detección en cámara 1
curl -X POST http://localhost:8000/api/processing/start/1

# Verificar que está procesando
curl http://localhost:8000/api/processing/status

# Respuesta esperada:
{
  "cameras_processing": [1],
  "details": [
    {
      "camera_id": 1,
      "is_running": true,
      "is_connected": true,
      "frames_processed": 1234,
      "last_error": null
    }
  ]
}

# Detener procesamiento
curl -X POST http://localhost:8000/api/processing/stop/1
```

---

## 📊 Tipos de Cámaras Soportadas

| Tipo | URL Ejemplo | Username | Password | Notas |
|------|------------|----------|----------|-------|
| **RTSP** (Recomendado) | `rtsp://192.168.1.100:554/stream` | ✅ Soportado | ✅ Soportado | IP cameras más comunes |
| **HTTP** | `http://192.168.1.101:8080/video` | ✅ Soportado | ✅ Soportado | Alternativa a RTSP |
| **HTTPS** | `https://camera.example.com/video` | ✅ Soportado | ✅ Soportado | Para conexiones seguras |
| **Cámara Local** | `0` o `1` | ❌ No aplica | ❌ No aplica | `/dev/video0` en Linux |

---

## 🔧 Configuración Avanzada

### Variables de Entorno (en `.env`)

```bash
# Timeouts y reintentos
CAMERA_TIMEOUT_MS=3000        # Espera máxima: 3 segundos
CAMERA_MAX_RETRIES=3          # Reintentar 3 veces
CAMERA_RETRY_DELAY=2          # 2 segundos entre intentos

# Si modificas estos valores, necesitas reconstruir:
docker compose up -d --build
```

### Ver Logs Detallados

```bash
# Logs del backend (muestra problemas de conexión)
docker compose logs -f app | grep "Cámara"

# Ejemplo de salida:
# [Cámara 1] Intento de conexión 1/4: rtsp://192.168.1.100:554/stream
# [Cámara 1] Conexión establecida exitosamente
# [Cámara 1] Frames processed: 45
```

---

## ❓ Troubleshooting

### Problema: "Cámara offline"
```json
{
  "status": "offline",
  "accessible": false
}
```

**Soluciones**:
1. ✅ Verifica que la cámara esté en la misma red: `ping 192.168.1.100`
2. ✅ Verifica el puerto: `telnet 192.168.1.100 554` (para RTSP)
3. ✅ Verifica credenciales en la configuración de la cámara
4. ✅ Prueba la URL directamente con VLC:
   ```bash
   cvlc "rtsp://admin:password123@192.168.1.100:554/stream"
   ```

### Problema: "Conexión rechazada"
```
Error: Connection refused
```

**Soluciones**:
1. ✅ Para Docker: Asegúrate que DATABASE_URL usa `@db:5432/`
2. ✅ Reinicia servicios: `docker compose restart app`
3. ✅ Reconstruye: `docker compose up -d --build`

### Problema: "No se pueden guardar credenciales"
```
Column "username" does not exist
```

**Soluciones**:
1. ✅ Resetea la BD (ver Paso 1 arriba)
2. ✅ Verifica schema con: `docker compose exec db psql -U facial_user -d facial_db -c "\d cameras"`

---

## 📈 Monitoreo

### Ver todas las cámaras
```bash
curl http://localhost:8000/api/cameras/
```

### Ver detecciones recientes
```bash
curl http://localhost:8000/api/detections/?limit=10
```

### Ver estado de procesamiento
```bash
curl http://localhost:8000/api/processing/status
```

---

## 🎯 Próximos Pasos

1. **✅ Completado**: Conexión de cámaras RTSP y HTTP
2. **✅ Completado**: Almacenamiento de credenciales
3. **✅ Completado**: Detección de rostros
4. **TODO**: Estimación de género mejorada (descargar modelo ONNX)
5. **TODO**: Frontend Streamlit con UI completa
6. **TODO**: Autenticación en API
7. **TODO**: Almacenamiento de snapshots de detecciones

---

## 📞 Soporte

Si algo no funciona:

1. Verifica los logs: `docker compose logs -f app`
2. Verifica la BD: `docker compose exec db psql -U facial_user -d facial_db -c "\dt"`
3. Prueba conexión manualmente: `curl http://localhost:8000/api/cameras/1/status`

---

**Versión del documento**: 1.0  
**Última actualización**: 2025-03-30  
**Estado**: ✅ Completado
