-- ============================================================
-- MIGRACIÓN: Soporte para Google OAuth + Reconocimiento Facial
-- Fecha: 2026-04-25
-- ============================================================

-- Google OAuth: ID y bandera de vinculación
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_google_enabled BOOLEAN DEFAULT FALSE;

-- Reconocimiento Facial: embedding 128D y bandera
ALTER TABLE users ADD COLUMN IF NOT EXISTS face_embedding TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_face_enrolled BOOLEAN DEFAULT FALSE;

-- Permitir usuarios sin contraseña (solo Google)
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;
