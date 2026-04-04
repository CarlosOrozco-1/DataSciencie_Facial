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

# Schema de respuesta (nunca expone el hash de la contraseña)
class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Schema de respuesta JWT
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None
