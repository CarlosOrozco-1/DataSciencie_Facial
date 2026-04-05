# 🚀 Guía de Despliegue en Oracle Cloud (Ubuntu)

Esta guía documenta los pasos para llevar el proyecto **GenderSense** de tu máquina local a un servidor en la nube con **HTTPS automático**.

---

## 🏗️ 1. Preparación del Servidor (Ubuntu 22.04+)

Una vez que tengas tu instancia de Oracle Cloud encendida y hayas accedido por SSH, sigue estos pasos:

### 1.1 Actualizar el Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar Docker y Docker Compose
Ejecuta estos comandos para instalar la versión oficial de Docker:

```bash
# Instalar dependencias necesarias
sudo apt install -y ca-certificates curl gnupg lsb-release

# Agregar la clave GPG oficial de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Configurar el repositorio
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine y Compose Plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 1.3 Configurar permisos (Opcional)
Para correr docker sin usar `sudo` siempre:
```bash
sudo usermod -aG docker $USER
# NOTA: Debes cerrar sesión y volver a entrar para que aplique.
```

---

## 🌐 2. Configuración de Red (Oracle Cloud)

Oracle tiene dos capas de seguridad. **Ambas deben estar configuradas.**

### 2.1 Capa 1: Consola de Oracle (VCN Security Lists)
En el panel de Oracle Cloud (Networking > Virtual Cloud Networks > [Tu VCN] > Security Lists):
- Haz clic en **Add Ingress Rules**:
  - **Source CIDR**: `0.0.0.0/0`
  - **Protocol**: `TCP`
  - **Port Range**: `80, 443`
  - **Description**: Permitir tráfico Web (HTTP/HTTPS).

### 2.2 Capa 2: Firewall Interno (iptables)
Ubuntu en Oracle viene con reglas de `iptables` muy estrictas que ignoran las reglas de la consola si no se abren internamente. Ejecuta:

```bash
# Abrir puertos 80 y 443
sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT

# Guardar los cambios para que persistan tras reiniciar
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

---

## 🚢 3. Despliegue de la Aplicación

### 3.1 Clonar el Proyecto
En el servidor, navega a la carpeta donde quieras instalarlo y clona tu repositorio de GitHub:

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# Entrar a la carpeta del proyecto
cd TU_REPOSITORIO
```

### 3.2 Configurar el Entorno (.env)
Una vez dentro de la carpeta del proyecto, crea el archivo `.env` (puedes copiar el ejemplo si lo tienes):
```bash
cp .env.example .env
nano .env
```
Asegúrate de configurar:
- `DOMAIN_NAME`: Tu dominio real (ej. `detec.duckdns.org`).
- `SMTP_USER` y `SMTP_PASSWORD`: Tus credenciales de Gmail (App Password).
- `JWT_SECRET_KEY`: Una clave aleatoria larga para la seguridad de los tokens.

### 3.3 Arrancar con Docker Compose
```bash
# Construir y levantar en segundo plano
docker compose up -d --build
```

---

## 🛠️ Archivos Clave del Despliegue

- **`Caddyfile`**: Gestiona el proxy inverso y pide los certificados SSL (HTTPS) automáticamente a Let's Encrypt.
- **`frontend/src/utils/api.js`**: Detecta automáticamente si estás en producción o local para apuntar a la API correcta.

---

## ⚠️ Solución de Problemas (Troubleshooting)

| Problema | Solución |
|----------|----------|
| **La cámara no activa** | Asegúrate de que estás accediendo por `https://` y no `http://`. |
| **Página no carga (Timeout)** | Revisa la regla de **Ingress Rules** en la consola de Oracle y los comandos de `iptables`. |
| **Error en Caddy Logs** | Ejecuta `docker compose logs caddy` para ver si pudo obtener el certificado SSL (necesitas un dominio real apuntando a la IP). |
