# Estructura del Proyecto

## Vista General

```
Proyecto-Reconocimiento-Facial/
├── docker-compose.yml          # Orquestación de servicios
├── Dockerfile.app              # Imagen del backend
├── .env.example                # Variables de entorno (copiar a .env)
├── AGENTS.md                   # Configuraciones para opencode
├── PROJECT_LOGS.md             # Fases y registro de eventos
├── STRUCTURE.md                # Este archivo
├── Descripcion-de-proyecto.md  # Documentación del proyecto
│
├── app/                        # BACKEND (FastAPI - API REST)
│   ├── __init__.py
│   ├── main.py                 # Entry point de FastAPI
│   ├── requirements.txt        # Dependencias Python
│   │
│   ├── api/                    # Endpoints/Rutas
│   │   ├── __init__.py
│   │   ├── cameras.py          # Endpoints de cámaras
│   │   ├── detections.py       # Endpoints de detecciones
│   │   ├── exports.py          # Endpoints de exportación
│   │   └── health.py           # Health check
│   │
│   ├── core/                   # Configuraciones centrales
│   │   ├── __init__.py
│   │   ├── config.py           # Configuración de app
│   │   └── security.py         # Seguridad (API keys, etc)
│   │
│   ├── models/                 # Modelos de datos (DB)
│   │   ├── __init__.py
│   │   ├── camera.py           # Modelo Cámara
│   │   ├── detection.py        # Modelo Deteección
│   │   └── base.py             # Clase base SQLAlchemy
│   │
│   ├── schemas/                # Schemas Pydantic (validación)
│   │   ├── __init__.py
│   │   ├── camera.py           # Schema Cámara
│   │   ├── detection.py        # Schema Detección
│   │   └── export.py           # Schema Exportación
│   │
│   ├── services/               # Lógica de negocio
│   │   ├── __init__.py
│   │   ├── camera_service.py   # Lógica de cámaras
│   │   ├── detection_service.py# Lógica de detecciones
│   │   └── export_service.py   # Lógica de exportación Excel
│   │
│   └── database/               # Conexión a DB
│       ├── __init__.py
│       ├── connection.py       # Conexión SQLAlchemy
│       └── session.py          # Sesiones de DB
│
├── frontend/                   # FRONTEND (Streamlit - Dashboard)
│   ├── requirements.txt        # Dependencias Python
│   ├── Dockerfile              # Imagen de Streamlit
│   ├── app.py                  # Entry point de Streamlit
│   │
│   └── src/
│       ├── components/         # Componentes reutilizables
│       │   ├── __init__.py
│       │   ├── camera_card.py  # Card de cámara
│       │   ├── stats_card.py   # Card de estadísticas
│       │   └── charts.py       # Gráficos
│       │
│       └── pages/              # Páginas del dashboard
│           ├── __init__.py
│           ├── dashboard.py    # Página principal
│           ├── cameras.py      # Gestión de cámaras
│           └── reports.py      # Reportes y exportación
│
├── backend/                    # WORKER (Procesamiento de visión)
│   ├── __init__.py
│   ├── main.py                 # Entry point del worker
│   ├── requirements.txt        # Dependencias
│   │
│   └── vision/                 # Módulos de visión
│       ├── __init__.py
│       ├── detector.py        # Detector de rostros
│       ├── estimator.py       # Estimador de género
│       ├── camera.py          # Captura de video
│       └── tracker.py         # Tracking de rostros
│
├── models/                     # Modelos ONNX pre-entrenados
│   ├── README.md               # Listado de modelos
│   └── (archivos .onnx)
│
└── tests/                      # Pruebas unitarias/integración
    ├── __init__.py
    ├── test_api/              # Pruebas de API
    ├── test_vision/           # Pruebas de visión
    └── conftest.py            # Configuración de pytest
```

---

## Conexiones entre Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USUARIO                                     │
│                   (Accede al Dashboard)                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Streamlit)                            │
│                         Puerto 8501                                  │
│  - Dashboard interactivo                                            │
│  - Visualización de datos                                           │
│  - Consulta de detecciones                                          │
│  - Exportación a Excel                                              │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ HTTP Requests
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      APP (FastAPI)                                  │
│                         Puerto 8000                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  API Endpoints                                               │  │
│  │  - /api/cameras (CRUD)                                       │  │
│  │  - /api/detections (consulta)                               │  │
│  │  - /api/export (excel)                                      │  │
│  │  - /health                                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                         │
│                           ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Services (Lógica de negocio)                                │  │
│  │  - camera_service                                            │  │
│  │  - detection_service                                         │  │
│  │  - export_service                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                         │
│                           ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Models (SQLAlchemy - ORM)                                  │  │
│  │  - Camera                                                    │  │
│  │  - Detection                                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────────┘
                           │ SQLAlchemy
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        DB (PostgreSQL)                              │
│                         Puerto 5432                                 │
│  - Tablas: cameras, detections                                     │
│  - Persistencia de datos                                           │
└──────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════
                    FLUJO DE PROCESAMIENTO DE VIDEO
═══════════════════════════════════════════════════════════════════════

                           ┌─────────────┐
                           │   CÁMARA    │
                           │ (rtsp/web)  │
                           └──────┬──────┘
                                  │ Video Stream
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND/WORKER (Visión)                         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  vision/                                                       │ │
│  │  1. camera.py → Captura frames                                 │ │
│  │  2. detector.py → Detecta rostros (OpenCV/ONNX)               │ │
│  │  3. estimator.py → Estima género                               │ │
│  │  4. tracker.py → Tracking                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                           │                                          │
│                           ▼ Detecciones                              │
│                    (Guarda en DB via APP)                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos

### 1. Captura de Video
```
Cámara → backend/vision/camera.py → Frames
```

### 2. Procesamiento
```
Frames → backend/vision/detector.py (rostros) 
       → backend/vision/estimator.py (género)
       → backend/vision/tracker.py (seguimiento)
```

### 3. Almacenamiento
```
Detección → app/services/detection_service.py 
         → app/models/detection.py 
         → PostgreSQL (db)
```

### 4. Consulta/Visualización
```
Usuario → frontend (Streamlit) 
        → app/api/detections.py 
        → PostgreSQL 
        → Response JSON 
        → Dashboard
```

### 5. Exportación
```
Usuario → frontend (botón exportar)
       → app/api/exports.py 
       → app/services/export_service.py 
       → Genera Excel 
       → Download
```

---

## Responsabilidades por Carpeta

| Carpeta | Responsabilidad |
|---------|-----------------|
| `app/api` | Endpoints HTTP (REST) |
| `app/core` | Configuración global |
| `app/models` | Definición de tablas DB |
| `app/schemas` | Validación de datos entrada/salida |
| `app/services` | Lógica de negocio |
| `app/database` | Conexión a PostgreSQL |
| `frontend/src/components` | UI reutilizable |
| `frontend/src/pages` | Páginas del dashboard |
| `backend/vision` | Procesamiento de video (OpenCV) |
| `models` | Modelos ONNX pre-entrenados |
| `tests` | Pruebas automatizadas |

---

## Notas

- **app** y **frontend** son servicios independientes que se comunican via HTTP
- **backend** (worker) procesa video y guarda resultados en DB a través de **app**
- La arquitectura permite escalar: más workers para más cámaras
- **frontend** solo consulta datos, no procesa video
