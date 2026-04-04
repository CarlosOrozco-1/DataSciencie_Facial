# 📷 GUÍA: CONECTAR CÁMARA WEB USB

## 🎯 Objetivo
Conectar tu cámara web USB a la aplicación de reconocimiento facial.

---

## 📋 PASO 1: Detectar la Cámara Web

### En tu máquina (FUERA de Docker)

Ejecuta el script de detección:

```bash
cd /home/carlosorozco/Documents/Proyecto-Reconocimiento-Facial

# Instalar opencv si no lo tienes
pip install opencv-python

# Ejecutar script de detección
python detect_cameras.py
```

**Salida esperada**:
```
🔍 Buscando cámaras disponibles en el sistema...

============================================================
📷 CÁMARA DETECTADA
============================================================
  Índice:        0
  Resolución:    1280x720
  FPS:           30
  Estado:        ✅ FUNCIONAL

📊 RESUMEN: Se encontraron 1 cámara(s)

💡 CÓMO USAR EN LA APLICACIÓN:
Para usar la cámara 0:
  - URL: "0"
```

**Apunta el número (probablemente 0)**. ← Este es tu índice de cámara.

---

### Alternativa en Linux (if script no funciona)

```bash
# Ver todas las cámaras disponibles
ls -la /dev/video*

# Resultado esperado:
# crw-rw----+ 1 root video 81, 0 mar 30 14:23 /dev/video0  ← Tu cámara

# Probar con OpenCV en Python
python3 -c "
import cv2
cap = cv2.VideoCapture(0)
if cap.isOpened():
    print('✅ Cámara web detectada en /dev/video0')
    print(f'   Resolución: {int(cap.get(3))}x{int(cap.get(4))}')
    cap.release()
else:
    print('❌ Cámara no accesible')
"
```

---

## ⚙️ PASO 2: Asegurar Acceso a /dev/video0 en Docker

Para que el contenedor Docker acceda a la cámara, ya está configurado en `docker-compose.yml`:

```yaml
devices:
  - /dev/video0:/dev/video0  # ← Ya está configurado
```

**Esto significa**:
- Tu cámara USB en `/dev/video0` estará disponible dentro del contenedor como `/dev/video0`

---

## 🚀 PASO 3: Iniciar Servicios

```bash
# Si está ejecutándose, primero detén todo
docker compose down

# Inicia los servicios
docker compose up -d

# Verifica que están corriendo
docker compose ps
```

**Salida esperada** (todos con estado "Up"):
```
NAME            STATUS
facial_db       Up (healthy)
facial_api      Up
facial_frontend Up
```

---

## 📝 PASO 4: Registrar la Cámara Web

### Opción A: Con cURL

Reemplaza `0` si tu cámara tiene otro índice (ej: `1`, `2`):

```bash
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Cámara Web USB",
    "url": "0",
    "location": "Escritorio",
    "status": "active"
  }'
```

**Respuesta exitosa**:
```json
{
  "id": 1,
  "name": "Mi Cámara Web USB",
  "url": "0",
  "username": null,
  "password": null,
  "location": "Escritorio",
  "status": "active",
  "is_processing": false,
  "created_at": "2025-03-30T10:30:00+00:00",
  "updated_at": null
}
```

**Apunta el `id` (probablemente 1)** ← Lo usarás en los próximos pasos.

### Opción B: Interface Swagger UI (más fácil visualmente)

1. Abre en tu navegador: **http://localhost:8000/docs**
2. Busca la sección "cameras"
3. Click en **`POST /api/cameras/`**
4. Click en **"Try it out"**
5. Pega este JSON en el "Request body":
   ```json
   {
     "name": "Mi Cámara Web USB",
     "url": "0",
     "location": "Escritorio",
     "status": "active"
   }
   ```
6. Click en **"Execute"**
7. Mira la respuesta en la sección "Responses"

---

## ✅ PASO 5: Verificar Conexión

```bash
# Reemplaza "1" con el ID que obtuviste en Paso 4
curl http://localhost:8000/api/cameras/1/status
```

**Respuesta si está conectada**:
```json
{
  "camera_id": 1,
  "name": "Mi Cámara Web USB",
  "url": "0",
  "status": "online",
  "accessible": true
}
```

**Si dice "offline"**:
```json
{
  "status": "offline",
  "accessible": false,
  "error": "..."
}
```

Ver sección **Troubleshooting** abajo.

---

## 🎯 PASO 6: Iniciar Detección de Rostros

```bash
# Reemplaza "1" con tu ID de cámara
curl -X POST http://localhost:8000/api/processing/start/1
```

**Respuesta**:
```json
{
  "message": "Processing started for camera 1"
}
```

---

## 📊 PASO 7: Ver Detecciones

```bash
# Ver todas las detecciones
curl http://localhost:8000/api/detections/?limit=10

# Ver solo de la última hora
curl "http://localhost:8000/api/detections/?limit=100"
```

**Verás algo como**:
```json
[
  {
    "id": 1,
    "camera_id": 1,
    "gender": "male",
    "confidence": 0.87,
    "timestamp": "2025-03-30T10:35:00+00:00",
    "created_at": "2025-03-30T10:35:00+00:00"
  },
  {
    "id": 2,
    "camera_id": 1,
    "gender": "female",
    "confidence": 0.92,
    "timestamp": "2025-03-30T10:35:05+00:00",
    "created_at": "2025-03-30T10:35:05+00:00"
  }
]
```

---

## ⏹️ PASO 8: Detener Detección (Opcional)

```bash
curl -X POST http://localhost:8000/api/processing/stop/1
```

---

## 🔧 Troubleshooting

### ❌ Error: "offline" / "No se pudo conectar"

**Causa**: Cámara no accesible desde Docker

**Soluciones**:

```bash
# 1. Verifica que la cámara esté reconocida
ls -la /dev/video*

# 2. Verifica permisos
sudo usermod -a -G video $(id -u -n)
# (Necesitarás reiniciar sesión)

# 3. Prueba desde dentro del contenedor
docker compose exec app python3 -c "
import cv2
cap = cv2.VideoCapture(0)
print('Accesible:', cap.isOpened())
cap.release()
"

# 4. Ver logs docker
docker compose logs -f app | grep -i camera
```

### ❌ Error: "IndexError: no cameras available"

**Causa**: Script de detección no encuentra cámaras

**Soluciones**:

```bash
# 1. Verifica conexión USB
lsusb | grep -i camera
# O busca el dispositivo

# 2. En Linux, a veces es video1 o video2
python detect_cameras.py  # Prueba de nuevo

# 3. Reinstala drivers
# En Ubuntu/Debian:
sudo apt-get install libv4l-0 v4l-utils

# 4. Reintenta detección
for i in {0..10}; do
  python3 -c "import cv2; cap = cv2.VideoCapture($i); print('$i:', cap.isOpened())" 2>/dev/null
done
```

### ❌ Los rostros no se detectan

**Causa**: La estimación de género está usando método heurístico simple (no muy preciso)

**Esto es normal** en esta etapa. El modelo ONNX de precisión está en TODO.

---

## 📋 Resumen de Comandos Rápidos

```bash
# Detección de cámaras
python detect_cameras.py

# Servicios
docker compose up -d      # Iniciar
docker compose down       # Detener
docker compose logs -f    # Ver logs

# Crear cámara (cambiar "0" por tu índice)
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Webcam","url":"0","location":"Escritorio","status":"active"}'

# Ver cámaras
curl http://localhost:8000/api/cameras/

# Verificar conexión (cambiar "1" por tu ID)
curl http://localhost:8000/api/cameras/1/status

# Iniciar procesamiento
curl -X POST http://localhost:8000/api/processing/start/1

# Ver detecciones
curl http://localhost:8000/api/detections/?limit=10

# Detener procesamiento
curl -X POST http://localhost:8000/api/processing/stop/1
```

---

## 🎥 Cámara IP Nexxt (Próximo Paso)

Una vez que la cámara web funcione, haremos lo mismo con tu cámara IP Nexxt:

1. Accederemos a la interfaz web de la cámara (http://192.168.10.100)
2. Configuraremos credenciales de usuario (si Nexxt lo permite)
3. Obtendremos la URL RTSP
4. La registraremos en la aplicación

**Nota sobre Nextx y ONVIF**:
- ONVIF es un estándar para cámaras IP
- Muchas cámaras Nexxt permiten acceso vía ONVIF sin necesidad de usuario, solo contraseña
- Si no puedes crear usuario, probablemente uses `admin` como usuario por defecto

---

**¿Problemas? Avísame después de ejecutar el script de detección.**
