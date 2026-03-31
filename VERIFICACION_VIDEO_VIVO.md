# ✅ VERIFICACIÓN: Video En Vivo y Detecciones

## 🎯 Lo Que Se Agregó

### 1. Nuevo Endpoint de API
```
GET http://localhost:8000/api/cameras/{camera_id}/frame
```
- Retorna el frame actual de la cámara en formato JPEG
- Solo funciona si la cámara está en procesamiento

### 2. Dashboard Mejorado (Streamlit)
- **TAB 1: 📷 Cámaras** - Visualización en vivo con botones de control
- **TAB 2: 🎯 Detecciones** - Todas las detecciones con filtros
- **TAB 3: 📊 Estadísticas** - Gráficos y analytics
- **TAB 4: ⚙️ Configuración** - Estado del sistema

---

## 🚀 PASO A PASO: Verifica que Todo Funciona

### PASO 1: Abre el Dashboard
```
http://localhost:8501
```

### PASO 2: Ve a la TAB "📷 Cámaras"

Verás:
- Selector de cámara
- Botones de control (▶️ Iniciar / ⏹️ Detener)
- Información de la cámara
- Estado (🟢 Online)

### PASO 3: Verifica Estado Online

La cámara debe mostrar:
```
Estado: 🟢 Online
```

Si dice "🔴 Offline":
- Reinicia: `docker compose restart app`
- Verifica: `/dev/video0` está accesible

### PASO 4: Inicia Procesamiento (Si No Está Activo)

Si ves ⏹️ ( Detener), ya está procesando ✅

Si ves ▶️ (Iniciar):
1. Haz clic en "▶️ Iniciar"
2. Espera 2 segundos
3. Deberías ver ⏹️ (Detener)

### PASO 5: Actualiza Frame

1. Haz clic en "🔄 Actualizar Frame"
2. Deberías ver la imagen de tu cámara
3. Si ves un frame, ¡significa que la cámara está funcionando! ✅

### PASO 6: Colócate Frente a la Cámara

Para que detecte tu rostro:
1. Ponte directamente frente a la cámara
2. Buena iluminación frontal
3. Cabeza en posición frontal (sin girar)
4. No demasiado lejos (30-60 cm es ideal)

### PASO 7: Actualiza Frames Múltiples Veces

1. Haz clic en "🔄 Actualizar Frame" varias veces
2. Deberías ver los frames actualizándose
3. Si la detección funciona, verás tu rostro detectado

### PASO 8: Ve a Estadísticas

Ve a la TAB "📊 Estadísticas":
1. Si hay detecciones, verás números
2. Deberías ver gráficos con datos
3. Si hay 0 detecciones, continúa en el siguiente paso

---

## ⚠️ Troubleshooting: ¿Por Qué No Hay Detecciones?

### 1. Haar Cascade es Muy Exigente

El detector HAAR CASCAP requiere:
- ✅ Rostro **FRONTAL** (no girado)
- ✅ **Buena iluminación** frontal
- ✅ **Distancia correcta** (30-60 cm)
- ✅ **Cabeza derecha** (no inclinada)

### 2. Frame Skipping

- Solo procesa 1 de cada 5 frames
- Esto significa que algunas detecciones se saltan
- Es normal no tener detecciones cada segundo

### 3. Soluciones Rápidas

```bash
# Verifica que está realmente procesando
curl http://localhost:8000/api/processing/status

# Verifica que no hay errores
docker compose logs app --tail=50 | grep -i error

# Reinicia si es necesario
docker compose restart app

# Prueba conexión de cámara
docker compose exec app python3 -c "
import cv2
cap = cv2.VideoCapture(0)
print('Conectado:', cap.isOpened())
cap.release()
"
```

### 4. Mejora la Iluminación

- Colócate cerca de una ventana o luz frontal
- Evita contragolpes (luz detrás)
- El detector HAAR necesita buenas sombras faciales

### 5. Mejora la Posición

- Rostro completamente frontal
- Ojos abiertos y visibles
- Cabeza recta (sin girar)
- No cubierto por cabello

---

## 📊 Verificar Detecciones en BD

Si quieres verificar directamente en la BD:

```bash
# Conectar a PostgreSQL
docker compose exec db psql -U facial_user -d facial_db

# Ver detecciones
SELECT * FROM detections ORDER BY timestamp DESC LIMIT 10;

# Ver cámaras
SELECT * FROM cameras;

# Ver estadísticas
SELECT gender, COUNT(*) FROM detections GROUP BY gender;
```

---

## 🎬 Demo Completo

1. **Abre 2 ventanas del navegador**:
   - Ventana 1: http://localhost:8501 (Dashboard)
   - Ventana 2: http://localhost:8000/docs (API Docs)

2. **En la Ventana 1**:
   - Ve a TAB "📷 Cámaras"
   - Haz clic en "▶️ Iniciar" (si no está procesando)
   - Verás "📹 Visualización en Vivo"

3. **Colócate frente a la cámara**:
   - Buena iluminación
   - Rostro frontal
   - Haz clic en "🔄 Actualizar Frame"

4. **Mira el frame actualizado**:
   - Si funciona, verás tu rostro
   - Si el detector identifica tu rostro, verás en la tabla

5. **Ve a TAB "📊 Estadísticas"**:
   - Deberías tener el número de detecciones aumentando

---

## 🔧 Comandos Útiles

```bash
# Ver logs en tiempo real
docker compose logs -f app | grep -i "camera\|detection\|processing"

# Verificar que la cámara está accesible
ls -la /dev/video0

# Obtener frame actual via API
curl http://localhost:8000/api/cameras/5/frame -o frame.jpg
eog frame.jpg  # O abre frame.jpg en visor de imágenes

# Ver estado de procesamiento
curl http://localhost:8000/api/processing/status | jq .

# Ver últimas detecciones
curl http://localhost:8000/api/detections/?limit=10 | jq .

# Contar detecciones en BD
docker compose exec db psql -U facial_user -d facial_db -c "SELECT COUNT(*) FROM detections;"
```

---

## ✅ Checklist Final

- [ ] Dashboard carga en http://localhost:8501
- [ ] Cámara muestra estado "🟢 Online"
- [ ] Procesamiento muestra "⏹️ Detener" (está activo)
- [ ] Frame se actualiza con "🔄 Actualizar Frame"
- [ ] Ves tu rostro o algo de la cámara en el frame
- [ ] TAB "Estadísticas" muestra algunos números
- [ ] TAB "Detecciones" tiene registros

---

## 🎉 Si Todo Funciona

¡Felicidades! Tu aplicación de reconocimiento facial está funcionando:
- ✅ Cámara conectada
- ✅ Captura de frames en vivo
- ✅ Detección de rostros
- ✅ Almacenamiento en BD
- ✅ Visualización en dashboard

**Próximo paso**: Configurar cámara IP Nexxt (cuando estés listo)

---

## ❓ Preguntas Frecuentes

**P: ¿Por qué el detector no detecta mi rostro?**
R: HAAR CASCADE es sensible al ángulo. Necesita rostro frontal, buena iluminación y a distancia correcta.

**P: ¿Cómo mejo la precisión?**
R: Descargar modelo ONNX (próximo paso) o usar redes neuronales (mucho más preciso).

**P: ¿El dashboard es lento?**
R: Es normal, está actualizando datos cada pocos segundos. Puedes ajustar en el código Streamlit.

**P: ¿Por qué dice "No está en procesamiento"?**
R: Inicia el procesamiento con el botón "▶️ Iniciar" antes de actualizar frames.

---

**Versión**: 1.0  
**Última actualización**: 2026-03-31  
**Estado**: ✅ Funcional
