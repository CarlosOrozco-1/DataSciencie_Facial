# Sistema de Análisis de Video con Estimación de Género

Proyecto de visión por computadora para análisis de video en tiempo real con detección de rostros y estimación de presentación de género.

## Características

- Captura de video desde múltiples fuentes (cámaras RTSP/HTTP)
- Detección de rostros en tiempo real
- Estimación de atributos faciales (género)
- Almacenamiento en base de datos PostgreSQL
- Dashboard interactivo con Streamlit
- API REST con FastAPI

## Tecnologías

- **Backend**: Python, FastAPI, SQLAlchemy
- **Base de datos**: PostgreSQL
- **Frontend**: Streamlit
- **Docker**: Contenedores para todos los servicios
- **Visión**: OpenCV, ONNX Runtime

## Estructura del Proyecto

```
├── app/                    # Backend FastAPI
│   ├── api/               # Endpoints REST
│   ├── models/            # Modelos SQLAlchemy
│   ├── schemas/           # Schemas Pydantic
│   └── database/          # Conexión a DB
├── frontend/              # Dashboard Streamlit
├── scriptsDB/             # Scripts de base de datos
├── docker-compose.yml     # Orquestación de servicios
└── README.md
```

## Requisitos

- Docker
- Docker Compose

## Instalación y Ejecución

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd proyecto-reconocimiento-facial
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

### 3. Iniciar los servicios

```bash
docker compose up -d
```

### 4. Verificar servicios

```bash
docker compose ps
```

## Servicios y Puertos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| API | 8000 | FastAPI - Documentación en `/docs` |
| Frontend | 8501 | Dashboard Streamlit |
| PostgreSQL | 5433 | Base de datos |

## URLs de Acceso

- **API Documentation**: http://localhost:8000/docs
- **Dashboard**: http://localhost:8501
- **Base de datos**: localhost:5433

## Uso de la API

### Cámaras

```bash
# Crear cámara
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Cámara 1", "url": "rtsp://192.168.1.100/stream", "location": "Entrada"}'

# Listar cámaras
curl http://localhost:8000/api/cameras/
```

### Detecciones

```bash
# Crear detección
curl -X POST http://localhost:8000/api/detections/ \
  -H "Content-Type: application/json" \
  -d '{"camera_id": 1, "gender": "male", "confidence": 0.95}'

# Obtener estadísticas
curl http://localhost:8000/api/detections/stats

# Filtrar por cámara
curl "http://localhost:8000/api/detections/stats?camera_id=1"
```

## Desarrollo

### Comandos útiles

```bash
# Ver logs
docker compose logs -f app

# Reiniciar servicio
docker compose restart app

# Acceder al contenedor
docker compose exec app bash
```

## Base de datos

### Conectar a PostgreSQL

```bash
docker compose exec db psql -U facial_user -d facial_db
```

### Ver tablas

```bash
docker compose exec db psql -U facial_user -d facial_db -c "\dt"
```

## Integración de Cámaras de Terceros (Tuya/Nexxt)

Para cámaras basadas en Tuya/Smart Life (ej. Nexxt) que no proveen RTSP directo, recomendamos inicializar un puente local utilizando [tuya-ipc-terminal](https://github.com/seydx/tuya-ipc-terminal).

Esta utilidad CLI de código abierto se conecta a la API reservada de Tuya y convierte el stream propietario en un servidor RTSP estándar localizado en `localhost`. 
Ejemplo de configuración generada por el terminal: `rtsp://localhost:8554/Camara_Exterior_/hd`
El proyecto es capaz de consumir estos streams generados de forma nativa e insertarlos en el ecosistema (Dashboard) junto con las cámaras USB convencionales utilizando un sistema híbrido de inyección e interfaz MJPEG.

## Consideraciones Éticas

Este sistema realiza inferencias visuales automáticas con fines analíticos. No determina identidad de género, solo estimaciones basadas en características faciales.

## Licencia

MIT License
