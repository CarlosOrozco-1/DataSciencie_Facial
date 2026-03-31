# 🚀 INICIO RÁPIDO: Cámara Web USB

## ⏱️ 5 PASOS EN 10 MINUTOS

### **PASO 1: Detectar Cámara** (2 min)

```bash
cd /home/carlosorozco/Documents/Proyecto-Reconocimiento-Facial
python detect_cameras.py
```

**Anota el número que aparezca** (probablemente `0`)

---

### **PASO 2: Iniciar Servicios** (3 min)

```bash
docker compose up -d
# Espera ~10 segundos
docker compose ps
```

**Verifica que diga "Up" en todos**

---

### **PASO 3: Crear Cámara** (1 min)

Reemplaza `0` con tu número del Paso 1:

```bash
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Cámara Web",
    "url": "0",
    "location": "Escritorio",
    "status": "active"
  }'
```

**Apunta el `id` de la respuesta** (probablemente `1`)

---

### **PASO 4: Verificar Conexión** (1 min)

Reemplaza `1` con el ID del Paso 3:

```bash
curl http://localhost:8000/api/cameras/1/status
```

**Debería decir**:
```json
"status": "online",
"accessible": true
```

---

### **PASO 5: Iniciar Detección** (2 min)

```bash
curl -X POST http://localhost:8000/api/processing/start/1
```

**Listo.** La app está procesando rostros. 

Para ver detecciones:
```bash
curl http://localhost:8000/api/detections/?limit=5
```

---

## 📍 Ubicaciones de Documentación Completa

| Guía | Ubicación | Contenido |
|------|-----------|----------|
| **Cámara Web Detallada** | [GUIA_CAMARA_WEB.md](GUIA_CAMARA_WEB.md) | Troubleshooting, alternativas, logs |
| **Cámara IP Nexxt** | [GUIA_CAMARA_IP_NEXXT.md](GUIA_CAMARA_IP_NEXXT.md) | Configuración, URLs RTSP, credenciales |
| **Diagnóstico Original** | [DIAGNOSTICO_CAMARAS.md](DIAGNOSTICO_CAMARAS.md) | Problemas solucionados |
| **Cambios Realizados** | [CAMBIOS_REALIZADOS.md](CAMBIOS_REALIZADOS.md) | Detalles técnicos |

---

## ❌ Si Algo No Funciona

### "Cámara not found" / "offline"

```bash
# 1. Verifica que existe
ls -la /dev/video0

# 2. Verifica permisos
sudo usermod -a -G video $USER
# (Necesitas reloguearte)

# 3. Reinicia Docker
docker compose restart app
```

### "Connection refused" en API

```bash
# Verifica servicios
docker compose ps

# Ver logs del app
docker compose logs -f app | tail -20

# Reconstruir si es necesario
docker compose down
docker compose up -d --build
```

---

## 💬 Contacta si...

- El script `detect_cameras.py` no encuentra la cámara
- El estado es "offline" después de Paso 4
- Necesitas configurar la Nexxt después

Lee la guía completa correspondiente en los links de arriba.

---

**¿Listo? Comienza con `python detect_cameras.py`** ✨
