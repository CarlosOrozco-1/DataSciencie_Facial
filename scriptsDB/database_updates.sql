-- Script para actualizar la base de datos con las nuevas funcionalidades (Estimación de Edad e Identidad)

-- 1. Añadir nuevas columnas a la tabla de detecciones
ALTER TABLE detections ADD COLUMN IF NOT EXISTS age VARCHAR(20) DEFAULT NULL;
ALTER TABLE detections ADD COLUMN IF NOT EXISTS person_name VARCHAR(100) DEFAULT NULL;

-- 2. Crear tabla para el registro voluntario de personas
CREATE TABLE IF NOT EXISTS registered_persons (
    id SERIAL PRIMARY KEY, -- O usar INT AUTO_INCREMENT si es MySQL/MariaDB
    name VARCHAR(100) NOT NULL,
    face_embedding TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

/*
INSTRUCCIONES PARA APLICAR EN CONTENEDOR DOCKER / SERVIDOR:

1. Si utilizas PostgreSQL o MySQL en Docker, entra al contenedor de la base de datos:
   docker exec -it <nombre_del_contenedor_db> psql -U <usuario> -d <nombre_bd>
   (Sustituye psql por mysql si usas MySQL/MariaDB)

2. Ejecuta los comandos ALTER TABLE y CREATE TABLE anteriores.

3. Si usas SQLite local (archivo .db):
   Puedes ejecutar esto usando la herramienta de línea de comandos de sqlite3:
   sqlite3 app.db < database_updates.sql
*/
