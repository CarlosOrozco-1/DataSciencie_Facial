# LOG PUESTA EN MARCHA - 2026-04-07

## Servidor
* Plataforma: Oracle Cloud Ubuntu 22.04 LTS
* Dominio en Producción: gendersense.duckdns.org
* IP Pública: 141.148.129.197

## Resumen del Despliegue
Se realizó un despliegue completo del proyecto de forma manual en una Oracle Cloud Free Tier utilizando Docker Compose. Se utilizaron los archivos de la rama `desa` como base para el entorno.

## Errores Solucionados durante el despliegue

### 1. Variables de Entorno no transmitidas a Caddy
* **Problema:** Caddy generaba un certificado TLS para el identificador genérico `localhost` en lugar del dominio real configurado en el `.env`. Esto ocurría porque el archivo `docker-compose.yml` original no tenía una instrucción para pasar el entorno al proxy Caddy, causando que el servidor no permitiera conectarse desde un navegador Chrome de manera segura.
* **Solución:** Se añadió la propiedad `env_file: - .env` al bloque del servicio `caddy` en el `docker-compose.yml` para asegurarse de que lea correctamente la llave `DOMAIN_NAME`.

### 2. Bloqueo de Dominio en Vite Dev Server
* **Problema:** El contenedor del frontend (Vite) bloqueaba activamente las solicitudes mostrando en la consola un mensaje: `Blocked request. This host ("gendersense.duckdns.org") is not allowed.`. Este fue un cambio de previsualización estricto introducido en las versiones recientes de Vite (> v5).
* **Solución:** Se editó el archivo `frontend/vite.config.js` agregando el flag `allowedHosts: true` (permitir todos los hosts proxy) en la jerarquía de `server`.

### 3. URLs Quemadas (Hardcoded) en Componentes Frontend
* **Problema:** Al hacer login, el sistema arrojaba un error 500 originado en que la UI contactaba y rebotaba con la red (ERR_CONNECTION_REFUSED en localhost:8000). Aún cuando `utils/api.js` estaba correctamente programado para transmutar su ruta entre entornos, archivos como `Login.jsx`, `ForgotPassword.jsx` y `ResetPassword.jsx` ignoraban esa lógica central y usaban de manera constante y forzada la ruta de `"http://localhost:8000"`.
* **Solución:** Se borraron las rutas manuales y se editaron dichos archivos forzandolos a importar `API_URL` desde `../utils/api` para hacer uso del control de flujos de URL de entornos.

### 4. Directiva de Manejo Recortador en Caddyfile
* **Problema:** La ruta y la base final del login regresaba un error backend de Status `404 Not Found`. Nuestro ruteador `Caddyfile` usaba `handle_path /api/*`. Las directivas de la familia `handle_path` tienen el peculiar comportamiento de recortar por detrás la coincidencia entregada. En lugar de procesar `/api/auth/login`, lo procesaba como `/auth/login`. Como FastAPI ignoraba esto, denegaba la vía.
* **Solución:** Se reemplazó el mandato `handle_path` por un estricto `handle` dentro de las guías de `Caddyfile` para mantener las concordancias de REST de `/api/`.
