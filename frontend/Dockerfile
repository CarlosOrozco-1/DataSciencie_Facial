FROM node:22

WORKDIR /app

# Copiar configuración de instalación
COPY package.json package-lock.json* ./

# Instalación global e inicial
RUN npm install

# Copiar el código fuente
COPY . .

# Exponer el puerto
EXPOSE 8501
