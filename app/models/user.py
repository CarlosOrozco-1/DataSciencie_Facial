from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database.connection import Base

# Modelo de usuario con soporte para múltiples métodos de autenticación:
# - Contraseña: username + hashed_password (login tradicional)
# - 2FA TOTP: totp_secret + is_2fa_enabled (Microsoft Authenticator)
# - Google OAuth: google_id + is_google_enabled (login con cuenta Google)
# - Reconocimiento Facial: face_embedding + has_face_enrolled (login biométrico)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable para usuarios que solo usan Google
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    totp_secret = Column(String, nullable=True)
    is_2fa_enabled = Column(Boolean, default=False) #Autenticación en dos pasos
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Google OAuth
    google_id = Column(String, nullable=True, unique=True)    # ID único de Google (sub)
    is_google_enabled = Column(Boolean, default=False)        # ¿Vinculó su cuenta Google?

    # Reconocimiento Facial
    face_embedding = Column(Text, nullable=True)              # Vector 128D serializado como JSON
    has_face_enrolled = Column(Boolean, default=False)        # ¿Registró su rostro?
