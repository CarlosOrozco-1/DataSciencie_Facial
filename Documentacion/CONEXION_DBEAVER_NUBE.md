# Conexión a Base de Datos en Producción (DBeaver)

Por motivos de seguridad, los puertos de PostgreSQL **NO** están expuestos ni abiertos directamente en las listas de seguridad web de Oracle Cloud, evitando ataques directos a tu información. 

Para poder conectarte a la base de datos de producción desde la aplicación DBeaver de tu máquina local, usaremos un **Túnel SSH**. Esta herramienta, soportada nativamente por DBeaver, establecerá una conexión segura vía SSH a tu servidor Ubuntu de Oracle y usará esa pasarela privada para inyectarse al contenedor de base de datos a través del puente de host.

## Paso a Paso

### 1. Crear Nueva Conexión
Abre tu DBeaver, haz clic en el icono del conector izquierdo y selecciona una nueva conexión usando la plantilla de **PostgreSQL**.

### 2. Configuración de Base de Datos Principal (Pestaña "General" o "Principal")
Llena los campos como si PostgreSQL estuviera en tu propia computadora:
* **Host / Servidor:** `localhost` (DBeaver secuestrará este tráfico local internamente por el túnel).
* **Base de datos:** `facial_db` o aquél que está guardado en tu archivo principal de `.env`.
* **Puerto:** `5433` (Corresponde al host que Docker Compose expuso para las entradas locales de Ubuntu).
* **Usuario:** `facial_user` o el que estableciste como POSTGRES_USER.
* **Contraseña:** `facial_pass` o la de POSTGRES_PASSWORD.

### 3. Configuración del Túnel SSH (Pestaña "SSH")
Ve a la pestaña SSH dentro del asistente y carga tus accesos de Oracle:
* Activa la casilla **Use SSH Tunnel** (Usar túnel SSH).
* **Host / IP:** `141.148.129.197` (La IP Púbica de tu servidor Oracle).
* **Puerto:** `22` (Por defecto para SSH).
* **User Name:** El usuario root de oracle, comúnmente `ubuntu`.
* **Auth Method:** Selecciona `Public Key`. 
* Explora la ruta hacia el archivo de tu llave privada `id_rsa` que tienes en tu terminal Linux y ubícalo allí (si llegas a usar Putty sería el `.ppk`).
* Si tu llave SSH incluye una contraseña frase de paso, escríbela allí.

### 4. Probar y Conectar
* Haz clic en **Test Connection** (Probar Conexión) para asegurarte que el proxy levante al unísono.
* Al ser la primera vez cruzando la llave, probablemente te pregunte si "tienes seguridad que quieres conectarte a este Host" dale en Si (Add Known Hosts).
* ¡Luego deberás de ver tu tabla al desplegar los recursos de Esquemas (schemas)!
