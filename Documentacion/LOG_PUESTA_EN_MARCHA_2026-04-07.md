# LOG PUESTA EN MARCHA - 2026-04-07

## Servidor
* Plataforma: Oracle Cloud Ubuntu 22.04 LTS
* Dominio en Producción: gendersense.duckdns.org
* IP Pública: 141.148.129.197

## Resumen del Despliegue
Se realizó un despliegue completo del proyecto de forma manual en una Oracle Cloud Free Tier utilizando Docker Compose. Se utilizaron los archivos de la rama `desa` como base para el entorno.

---

## 1. Configuración de Redes y Servidor

### A. Apertura de Puertos en Oracle Cloud (Panel Web)
Debido a la doble barrera de firewall de Oracle, se debió permitir el tráfico creando reglas de ingreso (Ingress Rules) en la Lista de Seguridad de la Red Virtual (VCN):
* **Source CIDR:** `0.0.0.0/0`
* **Protocolo:** `TCP`
* **Destination Ports:** `80, 443`
*(Permite la funcionalidad HTTP y expedición HTTPS/SSL por parte de Caddy con DuckDNS)*

### B. Apertura de Puertos Internos en Ubuntu (SSH)
Adicional al panel web, Oracle trae un cortafuegos interno restrictivo. Se introdujeron las siguientes reglas a nivel consola:
```bash
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

### C. Instalación de Docker y Compose
Paso fundamental para soportar los contenedores del proyecto usando fuentes oficiales:
```bash
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```
*(Hubo que reiniciar sesión SSH para aplicar los permisos del docker de grupo).*

---

## 2. Construcción y Revisiones

Después de clonar el código (`git checkout desa`) y de copiar las plantillas (`cp .env.example .env`) ajustamos el dominio como `DOMAIN_NAME=gendersense.duckdns.org`, inyectamos un token `JWT_SECRET_KEY` propio e inicializamos el clúster con descargas y mapeos:

```bash
docker compose up -d --build
```

**Comandos de auditoría posteriores que usamos:**
Para validar que los procesos se levantaron ("Up" / "healthy"):
```bash
docker compose ps
```
Para presenciar la exitosa expedición del certificado SSL por parte del reverse_proxy y confirmar que todo comunicara exteriormente:
```bash
docker compose logs caddy
```

---

## 3. Errores Solucionados durante Múltiples Fases

### A. Variables de Entorno no transmitidas a Caddy
* **Problema:** Caddy generaba un certificado TLS para el identificador genérico `localhost` en lugar del dominio real configurado en el `.env`. Esto ocurría porque el archivo `docker-compose.yml` original no tenía una instrucción para pasar el entorno al proxy Caddy, causando que el servidor no permitiera conectarse desde un navegador Chrome de manera segura.
* **Solución:** Se añadió la propiedad `env_file: - .env` al bloque del servicio `caddy` en el `docker-compose.yml` para asegurarse de que lea correctamente la llave `DOMAIN_NAME`.

### B. Bloqueo de Dominio en Vite Dev Server
* **Problema:** El contenedor del frontend (Vite) bloqueaba activamente las solicitudes mostrando en la consola un mensaje: `Blocked request. This host ("gendersense.duckdns.org") is not allowed.`. Este fue un cambio estricto de seguridad introducido en las versiones recientes de Vite (> v5).
* **Solución:** Se editó el archivo `frontend/vite.config.js` agregando el flag `allowedHosts: true` en la jerarquía de `server`.

### C. URLs Quemadas (Hardcoded) en Componentes Frontend
* **Problema:** Al hacer login, el sistema arrojaba un error 500 originado en que la UI contactaba y rebotaba (ERR_CONNECTION_REFUSED en localhost:8000). Aún cuando `utils/api.js` estaba correctamente programado para transmutar su ruta hacia `window.location.origin`, archivos como `Login.jsx`, `ForgotPassword.jsx` y `ResetPassword.jsx` ignoraban esa lógica central.
* **Solución:** Se borraron las rutas manuales de estos módulos y se editaron importando dinámicamente `API_URL` desde `../utils/api`.

### D. Directiva de Manejo Recortador en Caddyfile
* **Problema:** La ruta y la base final del login regresaba un error backend de Status `404 Not Found`. El ruteador `Caddyfile` usaba `handle_path /api/*`. Las directivas de la familia `handle_path` tienen el peculiar comportamiento de recortar por detrás la coincidencia entregada. En lugar de procesar `/api/auth/login`, procesaba como `/auth/login`. Como FastAPI fue agnóstico de esto, denegaba la vía.
* **Solución:** Se reemplazó el mandato `handle_path` por un estricto `handle` explícito dentro de `Caddyfile` para mantener las concordancias de API.
