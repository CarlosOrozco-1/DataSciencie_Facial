# Configuración del Agente (opencode)

## Comandos de Ejecución

### Iniciar todos los servicios
```bash
docker compose up -d
```

### Detener todos los servicios
```bash
docker compose down
```

### Iniciar servicios específicos
```bash
# Solo backend
docker compose up -d app

# Solo frontend
docker compose up -d frontend

# Solo base de datos
docker compose up -d db

# Backend + Frontend (sin DB)
docker compose up -d app frontend

# Backend + DB (sin Frontend)
docker compose up -d app db
```

### Detener servicios específicos
```bash
# Detener backend
docker compose stop app

# Detener frontend
docker compose stop frontend

# Detener base de datos
docker compose stop db

# Detener backend + frontend
docker compose stop app frontend
```

### Reiniciar servicios
```bash
# Reiniciar todos
docker compose restart

# Reiniciar servicio específico
docker compose restart app
docker compose restart frontend
```

### Ver logs
```bash
# Logs de un servicio
docker compose logs -f app
docker compose logs -f frontend

# Logs de todos los servicios
docker compose logs -f
```

### Reconstruir contenedores
```bash
docker compose up -d --build
```

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| app      | 8000   | FastAPI (Backend) |
| frontend | 8501   | Streamlit (Dashboard) |
| db       | 5433   | PostgreSQL (externo) / 5432 (interno) |

## URLs

- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:8501

## Variables de Entorno

Copiar `.env.example` a `.env` y configurar:
```bash
cp .env.example .env
```

## Comandos de Desarrollo

### Requisitos Previos
1. Docker debe estar corriendo: `docker compose ps`
2. Si Docker está detenido, iniciar primero: `docker compose up -d`

### Backend (FastAPI con Uvicorn)

**Opción 1: Con Docker (recomendado)**
```bash
# Iniciar servicio
docker compose up -d app

# Ver logs en tiempo real
docker compose logs -f app

# Detener servicio
docker compose stop app

# Reiniciar servicio
docker compose restart app

# Acceder al contenedor
docker compose exec app bash
```

**Opción 2: Directamente en máquina (sin Docker)**
```bash
# Instalar dependencias
cd app
pip install -r requirements.txt

# Iniciar servidor Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# El servidor estará disponible en: http://localhost:8000
# API Docs en: http://localhost:8000/docs
```

### Frontend (Streamlit)

**Opción 1: Con Docker (recomendado)**
```bash
# Iniciar servicio
docker compose up -d frontend

# Ver logs en tiempo real
docker compose logs -f frontend

# Detener servicio
docker compose stop frontend

# Reiniciar servicio
docker compose restart frontend

# Acceder al contenedor
docker compose exec frontend bash
```

**Opción 2: Directamente en máquina (sin Docker)**
```bash
# Instalar dependencias
cd frontend
pip install -r requirements.txt

# Iniciar Streamlit
streamlit run app.py

# El dashboard estará disponible en: http://localhost:8501
```

### Base de Datos (PostgreSQL)

**Opción 1: Con Docker**
```bash
# Iniciar servicio
docker compose up -d db

# Conectar a PostgreSQL
docker compose exec db psql -U facial_user -d facial_db

# Ver tablas
docker compose exec db psql -U facial_user -d facial_db -c "\dt"

# Ejecutar script SQL
docker compose exec -T db psql -U facial_user -d facial_db < scriptsDB/init_db.sql
```

## Base de Datos

### Conectar a PostgreSQL
```bash
docker compose exec db psql -U facial_user -d facial_db
```

### Ver tablas
```bash
docker compose exec db psql -U facial_user -d facial_db -c "\dt"
```

## Comandos útiles Docker

```bash
# Ver estado de contenedores
docker compose ps

# Ver recursos
docker stats

# Limpiar recursos no usados
docker system prune
```

## Reglas de Desarrollo
- **Comentarios Obligatorios**: Todo cambio o inserción de nuevo código DEBE incluir un comentario explicativo que indique la justificación del cambio o la función del código nuevo añadido en el sistema.
