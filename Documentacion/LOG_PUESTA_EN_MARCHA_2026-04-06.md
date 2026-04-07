# Log de Puesta en Marcha (Equipo Nuevo)

**Fecha:** 2026-04-06  
**Proyecto:** DataSciencie_Facial  
**Entorno:** Repositorio clonado en nuevo equipo

## Objetivo

Levantar backend, base de datos y frontend con contenedores en el nuevo equipo, validar conectividad y confirmar acceso funcional a la aplicación.

## Resumen de lo realizado

1. Se validó la estructura del repositorio y la presencia de `docker-compose.yml`.
2. Se verificó/creó configuración de entorno usando `.env`.
3. Se detectó que el comando `docker compose` estaba siendo resuelto por Podman sin proveedor de compose instalado.
4. Se instaló `podman-compose` para habilitar ejecución de `docker compose` en este entorno.
5. Se construyeron imágenes y se levantaron servicios `db`, `app` y `frontend`.
6. Se validó que backend y base de datos quedaron operativos.
7. Se identificó error de permisos en frontend (`EACCES` sobre `/app/package.json`) y se corrigió el contexto del directorio montado.
8. Se confirmó que la aplicación quedó arriba y operativa.
9. Se verificó que la base contiene tablas iniciales y usuario administrador semilla.

## Comandos ejecutados (orden cronológico)

### Diagnóstico inicial

```bash
docker compose ps
docker compose logs app
docker compose logs frontend
docker compose logs db
docker --version
docker compose version
podman --version
```

### Instalación de soporte compose en este equipo

```bash
python3 -m pip install --user podman-compose
docker compose version
```

### Verificación de entorno y variables

```bash
grep '^JWT_SECRET_KEY=.*' .env
```

### Build y arranque de servicios

```bash
docker compose up -d --build db app frontend
```

### Corrección para imagen de base de datos (pull explícito)

```bash
podman pull docker.io/library/postgres:15-alpine
docker compose up -d db app frontend
```

### Validación de backend y base de datos

```bash
docker compose ps
docker compose logs app
docker compose logs db
curl -s http://localhost:8000/health
docker compose exec db psql -U facial_user -d facial_db -c "\dt"
```

### Diagnóstico de frontend (error detectado)

```bash
docker compose logs frontend
curl -I http://localhost:8501
```

### Corrección de permisos frontend (entorno SELinux/Podman)

```bash
sudo chcon -Rt container_file_t frontend
docker compose up -d frontend
docker compose logs -f frontend
```

## Hallazgos técnicos

- `docker` en este equipo usa Podman como backend (`Emulate Docker CLI using podman`).
- Faltaba proveedor compose inicialmente (`docker-compose`/`podman-compose` no disponible).
- El frontend falló por permisos de volumen montado (`EACCES: /app/package.json`).
- Backend quedó saludable en `http://localhost:8000/health`.
- PostgreSQL inicializó correctamente con volumen nuevo en este equipo.

## Estado final validado

- `db`: operativo y saludable.
- `app`: operativo (FastAPI arriba en puerto 8000).
- `frontend`: operativo tras corrección de contexto/permiso.
- DBeaver: conexión exitosa con credenciales de `.env`.
- Usuario administrador semilla disponible:
  - Email: `admin@generosense.com`
  - Password inicial: `password123`

## Parámetros de conexión PostgreSQL (DBeaver)

- Host: `localhost`
- Port: `5433`
- Database: `facial_db`
- Username: `facial_user`
- Password: `facial_pass` (o el valor actual en `.env`)

## Recomendaciones posteriores

1. Cambiar inmediatamente la contraseña del usuario administrador por seguridad.
2. Si se migra información histórica, realizar `pg_dump` en origen y `pg_restore` en este equipo.
3. Documentar si el entorno objetivo usa Docker Engine o Podman para evitar diferencias de permisos en montajes.
