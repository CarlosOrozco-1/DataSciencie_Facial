# Log del Proyecto

## Fases del Proyecto

| Fase | Estado | Descripción |
|------|--------|-------------|
| 1. Definición | ✅ Completado | Documentación del proyecto |
| 2. Infraestructura | 🔄 En progreso | Docker, estructura de carpetas |
| 3. Base de datos | ✅ Completado | Modelos y migraciones |
| 4. Backend | ✅ Completado | API FastAPI |
| 5. Frontend | ⏳ Pendiente | Dashboard Streamlit |
| 6. PoC Visión | ⏳ Pendiente | Detección facial con OpenCV/ONNX |
| 7. Integración | ⏳ Pendiente | Conectar todos los servicios |
| 8. Exportación | ⏳ Pendiente | Exportar datos a Excel |
| 9. Optimización | ⏳ Pendiente | Rendimiento y escalabilidad |
| 10. Pruebas | ⏳ Pendiente | Testing completo |

---

## Registro de Eventos

### 2026-03-29 - Infraestructura Inicial

**Evento:** Se creó la estructura inicial del proyecto

**Acciones realizadas:**
- Actualización de `Descripcion-de-proyecto.md` con frontend Streamlit
- Creación de estructura de carpetas:
  ```
  app/
    api/
    core/
    models/
    schemas/
    services/
    database/
  frontend/
    src/
      components/
      pages/
  backend/
    vision/
  models/
  tests/
  ```
- Creación de archivos Docker:
  - `docker-compose.yml` (servicios: app, db, frontend)
  - `Dockerfile.app` (FastAPI)
  - `frontend/Dockerfile` (Streamlit)
  - `.env.example`
  - `app/requirements.txt`
  - `frontend/requirements.txt`
- Creación de `AGENTS.md` con configuraciones para opencode
- Creación de `PROJECT_LOGS.md` (este archivo)

**Próximo paso:** Iniciar contenedores Docker

### 2026-03-30 - Documentación de Estructura

**Evento:** Se documentó la estructura completa del proyecto

**Acciones realizadas:**
- Creación de `STRUCTURE.md` con:
  - Vista general de todas las carpetas y archivos
  - Diagrama de conexiones entre componentes
  - Flujo de datos (captura → procesamiento → almacenamiento → visualización)
  - Tabla de responsabilidades por carpeta

**Detalles de estructura:**
- `app/` → Backend FastAPI (API REST, lógica de negocio, modelos DB)
- `frontend/` → Dashboard Streamlit (interfaz web)
- `backend/` → Worker de visión (procesamiento video con OpenCV)
- `models/` → Modelos ONNX pre-entrenados
- `tests/` → Pruebas automatizadas

**Conexiones:**
- Usuario → Frontend → App (API) → PostgreSQL
- Cámara → Backend/Worker → App → PostgreSQL

**Próximo paso:** Revisar documentación y aprobar estructura

### 2026-03-30 - Inicio de Servicios Docker

**Evento:** Se iniciaron los servicios de Docker

**Acciones realizadas:**
- Copia de `.env.example` a `.env`
- Ejecución de `docker compose up -d --build`
- Corrección de error en `Dockerfile.app` (paquete `libgl1-mesa-glx` obsoleto)
- Creación de archivo básico `frontend/app.py`
- Verificación de servicios corriendo

**Estado de servicios:**
| Servicio | Estado | Puerto |
|----------|--------|--------|
| facial_db | ✅ Corriendo (healthy) | 5432 |
| facial_api | ✅ Corriendo | 8000 |
| facial_frontend | ✅ Corriendo | 8501 |

**URLs de acceso:**
- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:8501

**Próximo paso:** Fase 3 - Base de datos (crear modelos)

### 2026-03-30 - Base de Datos y API

**Evento:** Se crearon las tablas y endpoints de la API

**Acciones realizadas:**
- Creación de scripts SQL en `scriptsDB/init_db.sql`
- Creación de modelos SQLAlchemy:
  - `app/models/camera.py` (tabla cameras)
  - `app/models/detection.py` (tabla detections)
- Creación de schemas Pydantic:
  - `app/schemas/camera.py`
  - `app/schemas/detection.py`
- Creación de endpoints API:
  - `/api/cameras/` (CRUD completo)
  - `/api/detections/` (CRUD + estadísticas)
- Pruebas completas de CRUD
- Corrección de conflicto de puerto (5432 → 5433)
- Creación de colección Postman (`postman_collection.json`)
- Creación de README.md

**Datos de prueba:**
- Cámara 1: "Cámara Principal" (id=3) - 3 detecciones
- Cámara 2: "Cámara Estacionamiento" (id=4) - 2 detecciones

**Puerto actualizado:** PostgreSQL ahora usa 5433 (externo)

**Próximo paso:** Fase 5 - Frontend (Dashboard Streamlit)

---

## Cómo usar este log

Agregar nuevos eventos siguiendo este formato:

```markdown
### YYYY-MM-DD - [Título del evento]

**Evento:** [Descripción corta]

**Acciones realizadas:**
- [Acción 1]
- [Ación 2]

**Próximo paso:** [Siguiente tarea]
```
