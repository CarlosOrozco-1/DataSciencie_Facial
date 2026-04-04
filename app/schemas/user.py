from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Schema base con campos compartidos entre creación y lectura
class UserBase(BaseModel):
    username: str
    email: EmailStr

# Schema para crear usuario (requiere contraseña en texto plano)
class UserCreate(UserBase):
    password: str

# Schema para actualizar usuario (todos los campos opcionales)
class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

# Schema para que un admin resetee la contraseña de otro usuario
class UserResetPassword(BaseModel):
    new_password: str

# Schema para que el propio usuario cambie su contraseña
class UserChangePassword(BaseModel):
    current_password: str
    new_password: str

# Schema de respuesta (nunca expone el hash ni el secreto TOTP codigo de 6 digitos generado por la app)
class UserResponse(UserBase):
    id: int
    is_active: bool
    is_2fa_enabled: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Schema de respuesta JWT
class Token(BaseModel):
    access_token: str
    token_type: str

# Respuesta de login que puede requerir 2FA
class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    requires_2fa: bool = False
    temp_token: Optional[str] = None

class TokenData(BaseModel):
    email: str | None = None

# Schemas para recuperación de contraseña
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# Schemas para 2FA
class TwoFactorSetupResponse(BaseModel):
    qr_code: str  # Imagen QR en base64
    secret: str   # Clave secreta para ingreso manual
    message: str

class TwoFactorVerifyRequest(BaseModel):
    code: str  # Código de 6 dígitos del authenticator

class TwoFactorValidateRequest(BaseModel):
    temp_token: str  # Token temporal del paso 1 del login
    code: str        # Código de 6 dígitos
