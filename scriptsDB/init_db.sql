-- ============================================================
-- Script de Base de Datos - Proyecto Reconocimiento Facial
-- ============================================================

-- Crear usuario (si no existe)
-- CREATE USER facial_user WITH PASSWORD 'facial_pass';

-- Crear base de datos (si no existe)
-- CREATE DATABASE facial_db OWNER facial_user;

-- Conectar a la base de datos
-- \c facial_db

-- ============================================================
-- CREACIÓN DE TABLAS
-- ============================================================

-- Tabla: cameras (Cámaras)
CREATE TABLE IF NOT EXISTS cameras (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Tabla: detections (Detecciones)
CREATE TABLE IF NOT EXISTS detections (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    gender VARCHAR(20) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);
CREATE INDEX IF NOT EXISTS idx_detections_camera_id ON detections(camera_id);
CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp);
CREATE INDEX IF NOT EXISTS idx_detections_gender ON detections(gender);

-- ============================================================
-- DATOS DE EJEMPLO (INSERTAR SI ES NECESARIO)
-- ============================================================

-- Insertar cámara de ejemplo
INSERT INTO cameras (name, url, location, status) 
VALUES 
    ('Cámara Principal', 'rtsp://192.168.1.100:554/stream', 'Entrada Principal', 'active'),
    ('Cámara Secundaria', 'http://192.168.1.101/video', 'Estacionamiento', 'active')
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Ver tablas creadas
-- \dt

-- Ver estructura de cameras
-- \d cameras

-- Ver estructura de detections
-- \d detections
