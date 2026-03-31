# 📷 GUÍA: CONECTAR CÁMARA IP NEXXT

## 🎯 Objetivo
Conectar tu cámara IP Nexxt (192.168.10.100) a la aplicación usando ONVIF.

---

## ⚙️ PASO 1: Acceder a la Interfaz Web de la Cámara

1. **Abre tu navegador**
2. **Ve a**: http://192.168.10.100

Deberías ver la interfaz de la cámara Nexxt.

---

## 🔐 PASO 2: Configurar Credenciales

### Caso 1: Si la Cámara Tiene Usuario/Contraseña

```
Usuario:     admin  (o el que configuraste)
Contraseña:  ... (la que configuraste)
```

**Si olvidaste las credenciales**, reseteaℓa:
- Busca un botón "Reset" pequeño en la cámara (generalmente atrás)
- Mantenlo presionado ~10 segundos
- Volverá a valores de fábrica (usuario: `admin`, sin contraseña)

### Caso 2: Si solo Tiene Contraseña (sin usuario)

Algunas cámaras Nexxt permiten solo contraseña:
```
Usuario:       (dejar en blanco O escribir "admin")
Contraseña:    ... (la que configuraste)
```

---

## 📡 PASO 3: Obtener la URL RTSP

### Via Interfaz Web

1. **Entra a la interfaz web** (http://192.168.10.100)
2. **Busca**: "Network Settings", "Stream" o "Configuration"
3. **Encuentra**: La sección RTSP o "Remote Access"
4. **Copia la URL** (algo como):
   ```
   rtsp://192.168.10.100:554/stream
   ```

### Si No Encuentras la URL, Usa Esta Estructura Estándar

Para cámaras Nexxt, prueba estas URLs comunes:

```
# URL estándar RTSP
rtsp://192.168.10.100:554/stream

# Con puerto alternativo
rtsp://192.168.10.100:8554/stream

# Canal 1 (típico)
rtsp://192.168.10.100:554/stream1
rtsp://192.168.10.100:554/h264/ch1/main/av_stream
```

---

## 🧪 PASO 4: Probar la URL (Antes de Registrarla)

### Opción A: Desde Terminal

```bash
# Ver si la cámara responde (timeout: 5 segundos)
timeout 5 cvlc "rtsp://192.168.10.100:554/stream" --vout=dummy 2>&1 | head -20
```

**Si funciona**, verás:
```
VLC media player 3.0.0 (expected output)
[rtsp @ ...] Connected to 192.168.10.100:554
```

**Si falla**, probablemente verás:
```
Connection refused
```

### Opción B: Probar con el Script de Python

Crea un archivo `test_camera_rtsp.py`:

```python
import cv2
import sys

camera_url = "rtsp://192.168.10.100:554/stream"
username = "admin"
password = "tu_contraseña"

# Construir URL con credenciales
if username and password:
    url_with_auth = camera_url.replace("rtsp://", f"rtsp://{username}:{password}@", 1)
else:
    url_with_auth = camera_url

print(f"🔍 Intentando conectar a: {camera_url}")
print(f"   Con credenciales: usuario='{username}', tiene_contraseña={bool(password)}\n")

cap = cv2.VideoCapture(url_with_auth)
cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)

if cap.isOpened():
    ret, frame = cap.read()
    if ret and frame is not None:
        print("✅ ¡ÉXITO! La cámara está accesible")
        print(f"   Resolución: {frame.shape[1]}x{frame.shape[0]}")
    else:
        print("❌ Conectado pero no hay video")
    cap.release()
else:
    print("❌ No se pudo conectar a la cámara")
    print("\n💡 Posibles causas:")
    print("   1. URL incorrecta")
    print("   2. Credenciales incorrectas")
    print("   3. Cámara apagada o desconectada")
    print("   4. Firewall bloqueando")
```

Ejecuta:
```bash
python test_camera_rtsp.py
```

---

## ✅ PASO 5: Registrar la Cámara en la Aplicación

Una vez que la URL funcione, regístrala:

### Opción A: Con cURL

**Sin credenciales** (si la cámara no las requiere):
```bash
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cámara Nexxt Principal",
    "url": "rtsp://192.168.10.100:554/stream",
    "location": "Entrada Principal",
    "status": "active"
  }'
```

**Con credenciales** (si la cámara las requiere):
```bash
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cámara Nexxt Principal",
    "url": "rtsp://192.168.10.100:554/stream",
    "username": "admin",
    "password": "tu_contraseña",
    "location": "Entrada Principal",
    "status": "active"
  }'
```

### Opción B: Interface Swagger UI

1. Abre http://localhost:8000/docs
2. Click en `POST /api/cameras/`
3. Click en "Try it out"
4. Pega el JSON de arriba
5. Click "Execute"

---

## 🔧 PASO 6: Verificar Conexión

```bash
# Reemplaza "2" con el ID que obtuviste
curl http://localhost:8000/api/cameras/2/status
```

**Respuesta exitosa**:
```json
{
  "camera_id": 2,
  "name": "Cámara Nexxt Principal",
  "status": "online",
  "accessible": true
}
```

**Si dice offline**, ver sección **Troubleshooting** abajo.

---

## 🎯 PASO 7: Iniciar Procesamiento

```bash
# Reemplaza "2" con tu ID de cámara
curl -X POST http://localhost:8000/api/processing/start/2
```

---

## 🔧 Troubleshooting: Nexxt

### ❌ Error: "No se pudo conectar" / "Connection refused"

**Soluciones en orden**:

1. **Verifica que la cámara esté en la misma red**:
   ```bash
   ping 192.168.10.100
   ```
   Si no responde, la cámara está apagada o en otra red.

2. **Verifica el puerto RTSP** (generalmente 554):
   ```bash
   nc -zv 192.168.10.100 554
   # Resultado: Connection refused (esperado si está bloqueado)
   # o: succeeded (si está abierto)
   ```

3. **Prueba sin credenciales primero**:
   ```bash
   # Si la URL con credenciales falla, prueba sin:
   rtsp://192.168.10.100:554/stream
   ```

4. **Prueba puertos alternativos** (a veces Nexxt usa 8554):
   ```
   rtsp://192.168.10.100:8554/stream
   ```

5. **Verifica credenciales**:
   - En la interfaz web de la cámara (http://192.168.10.100)
   - Busca "Network Settings" o "Users"
   - Confirma usuario y contraseña

6. **Ver si el firewall bloquea**:
   ```bash
   # En tu máquina
   sudo ufw allow 554/tcp  # Ubuntu/Debian
   # o en macOS/Windows, desactiva firewall temporalmente
   ```

---

### ❌ Error: "RTSP stream not found"

**Posibles URLs alternativas para Nexxt**:

```
rtsp://192.168.10.100:554/stream
rtsp://192.168.10.100:554/stream1
rtsp://192.168.10.100:554/CH001.h264
rtsp://192.168.10.100:554/live/ch0
rtsp://192.168.10.100:554/h264/ch1/main/av_stream
```

Prueba cada una con el script de Python.

---

### ❌ Error: "Unauthorized" / "Authentication failed"

**Soluciones**:

1. **Verifica usuario y contraseña**:
   ```bash
   # En la interfaz web: http://192.168.10.100
   # Busca credenciales configuradas
   ```

2. **Intenta usuario default** (si no recuerdas):
   ```
   Usuario:     admin
   Contraseña:  (sin contraseña, dejar en blanco)
   ```

3. **Intenta resetear la cámara**:
   - Botón Reset (atrás/abajo) ~10 segundos
   - Vuelve a valores de fábrica

4. **Si Nexxt tiene Only Password Mode**:
   ```bash
   # A veces solo requiere contraseña, no usuari$o
   # Prueba con usuario nulo:
   rtsp://192.168.10.100:554/stream  (sin credenciales)
   # O:
   rtsp://:contraseña@192.168.10.100:554/stream
   ```

---

### ❌ Error: "Timeout"

**Soluciones**:

1. **Aumenta timeout** (en la app está en 5 segundos, suficiente para LAN):
   ```bash
   # Ver en docker logs
   docker compose logs -f app | grep Timeout
   ```

2. **Verifica conexión de red**:
   ```bash
   ping 192.168.10.100 -c 5
   # Debería responder en < 10ms
   ```

3. **Verifica velocidad de red**:
   ```bash
   # A veces conexiones WiFi lentas causan timeout
   # Conéctate por Ethernet si es posible
   ```

---

## 📋 Resumen de URLs Comunes Nexxt

```bash
# Estructura general RTSP (probar en orden)
rtsp://192.168.10.100:554/stream      # ← Más común
rtsp://192.168.10.100:554/stream1
rtsp://192.168.10.100:554/CH001.h264
rtsp://192.168.10.100:8554/stream     # ← Puerto alternativo

# Con credenciales
rtsp://admin:password@192.168.10.100:554/stream
```

---

## 🎬 Alternativa HTTP (si RTSP no funciona)

Algunas cámaras Nexxt ofrecen stream HTTP:

```
http://192.168.10.100:8080/video
http://192.168.10.100:80/video.cgi
```

Registra igual en la app:
```json
{
  "name": "Nexxt HTTP",
  "url": "http://192.168.10.100:8080/video",
  "username": "admin",
  "password": "tu_contraseña"
}
```

---

## 🔍 Ver Documentación Nexxt Oficial

Si tienes el manual de la cámara:
1. Busca sección "Network" o "RTSP"
2. Find "Stream URL" or "Remote Access"
3. Debería estar el formato exacto

O busca online:
```
"Nexxt [modelo] RTSP stream URL"
"Nexxt [modelo] manual" 
```

---

## 📞 Próximos Pasos

1. ✅ **Primero**: Que funcione la cámara web USB
2. **Después**: Configurar esta cámara Nexxt con los pasos de arriba
3. **Luego**: Optimizar detección de rostros
4. **Final**: Agregar alertas y grabación

---

**Una vez que tengas ambas cámaras funcionando, avísame para optimizaciones.**
