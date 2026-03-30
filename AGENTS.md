# Configuración del Agente (opencode)

## Comandos de Ejecución

### Iniciar Docker
```bash
docker compose up -d
```

### Detener Docker
```bash
docker compose down
```

### Ver logs
```bash
docker compose logs -f [servicio]
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
