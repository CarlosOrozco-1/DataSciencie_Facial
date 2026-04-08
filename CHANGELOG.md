# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a la [Versionamiento Semántico (Semantic Versioning)](https://semver.org/lang/es/).

## [2.0.0] - 2026-04-07
### Añadido (Added)
- Despliegue completo y oficial en un servidor de producción en la nube (Oracle Cloud).
- Integración del proxy inverso Caddy para provisión automática de certificados SSL (HTTPS) a través de DuckDNS.
- Configuración y validación de una conexión segura hacia la base de datos PostgreSQL mediante el protocolo de túneles SSH usando llaves públicas.
- Configuración de entorno dinámico para que el frontend (`api.js`) distinga inteligente y transparentemente entre desarrollo local (`localhost:8000`) y producción (`gendersense.duckdns.org`).
- Nueva colección de servicios en Postman pre-configurada apuntando dinámicamente al nuevo servidor seguro de producción.

### Modificado (Changed)
- Refactorización de rutas: Los módulos críticos del frontend (como `Login.jsx` y métodos de contraseña) ya no dependen de URLs en texto plano, garantizando su fluidez en cualquier ámbito de red.
- Corrección de prefijos API: Modificación fundamental de directivas en el `Caddyfile` introduciendo el comando `handle` (en lugar de `handle_path`) para conservar adecuadamente y sin recortes las solicitudes entrantes que portan el sufijo `/api/` en la URI hacia FastAPI.
