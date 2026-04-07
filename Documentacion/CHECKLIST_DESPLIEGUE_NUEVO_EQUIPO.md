# Checklist Operativo de Despliegue (Nuevo Equipo)

**Proyecto:** DataSciencie_Facial  
**Objetivo:** Levantar app rápidamente en otro equipo con Docker/Podman.

## 1) Prerrequisitos

- [ ] Sistema con contenedores instalados (`docker` o `podman`)
- [ ] Acceso a internet para descargar imágenes/dependencias
- [ ] Puertos libres: `8000`, `8501`, `5433` (y `80/443` si se usa Caddy)
- [ ] Repositorio clonado completo

## 2) Ubicación de trabajo

- [ ] Entrar a la raíz del proyecto:

```bash
cd /home/ceorozcom/Documents/Reconocimiento-Facial/DataSciencie_Facial
```

## 3) Variables de entorno

- [ ] Crear `.env` si no existe:

```bash
cp .env.example .env
```

- [ ] Verificar/definir mínimo:
  - [ ] `JWT_SECRET_KEY` (obligatorio)
  - [ ] `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (si se personaliza)
  - [ ] SMTP opcional (solo para recuperación de contraseña por correo)

## 4) Compose disponible

- [ ] Validar compose:

```bash
docker compose version
```

- [ ] Si falla en entorno Podman por proveedor compose ausente:

```bash
python3 -m pip install --user podman-compose
docker compose version
```

## 5) Build y arranque

- [ ] Levantar stack principal:

```bash
docker compose up -d --build db app frontend
```

- [ ] Si falla imagen `postgres` por short-name en Podman:

```bash
podman pull docker.io/library/postgres:15-alpine
docker compose up -d db app frontend
```

## 6) Validación de servicios

- [ ] Estado de contenedores:

```bash
docker compose ps
```

- [ ] Backend saludable:

```bash
curl -s http://localhost:8000/health
```

- [ ] Frontend responde:

```bash
curl -I http://localhost:8501
```

- [ ] Logs si hay errores:

```bash
docker compose logs app
docker compose logs frontend
docker compose logs db
```

## 7) Caso común: frontend con error EACCES (Podman/SELinux)

- [ ] Síntoma en logs: `EACCES: permission denied, open '/app/package.json'`
- [ ] Corrección:

```bash
sudo chcon -Rt container_file_t frontend
docker compose up -d frontend
docker compose logs -f frontend
```

## 8) Base de datos y primer acceso

- [ ] Verificar tablas creadas:

```bash
docker compose exec db psql -U facial_user -d facial_db -c "\dt"
```

- [ ] Credenciales iniciales admin (seed automático):
  - Email: `admin@generosense.com`
  - Password: `password123`

- [ ] Cambiar password admin después del primer login.

## 9) Conexión DBeaver

- [ ] Host: `localhost`
- [ ] Puerto: `5433`
- [ ] DB: `facial_db`
- [ ] User: `facial_user`
- [ ] Password: valor de `POSTGRES_PASSWORD` en `.env`

## 10) Datos históricos (opcional)

- [ ] Si se requiere data anterior, migrar con `pg_dump/pg_restore`.
- [ ] Si no, trabajar con DB nueva creada en este equipo.

## 11) Comandos rápidos de operación diaria

```bash
docker compose up -d
docker compose stop
docker compose down
docker compose restart app
docker compose logs -f app
```

## 12) Criterio de “despliegue exitoso”

- [ ] `db` en estado `healthy`
- [ ] `app` arriba y responde `/health`
- [ ] `frontend` arriba y accesible en `http://localhost:8501`
- [ ] Login funcional con usuario admin
- [ ] Conexión DBeaver funcional
