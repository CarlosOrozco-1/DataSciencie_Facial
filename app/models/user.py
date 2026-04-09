from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database.connection import Base

# Modelo de usuario con soporte para 2FA TOTP
# username: para login | email: para recuperación de contraseña
# totp_secret: clave secreta compartida con Microsoft Authenticator
# is_2fa_enabled: indica si el usuario activó la verificación en dos pasos
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    totp_secret = Column(String, nullable=True)
    is_2fa_enabled = Column(Boolean, default=False) #Autenticación en dos pasos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
