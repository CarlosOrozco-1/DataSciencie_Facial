from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
import re

class CameraBase(BaseModel):
    name: str
    url: str
    username: Optional[str] = None
    password: Optional[str] = None
    location: Optional[str] = None
    status: str = "active"
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        """Valida que la URL sea un formato válido para cámaras"""
        if not v:
            raise ValueError("URL no puede estar vacía")
        
        # Permitir URLs RTSP, HTTP, HTTPS o índices numéricos (para /dev/videoX)
        valid_patterns = [
            r'^rtsp://.*',           # RTSP
            r'^https?://.*',         # HTTP/HTTPS
            r'^\d+$',                # Índice de cámara local (0, 1, 2...)
        ]
        
        if not any(re.match(pattern, v) for pattern in valid_patterns):
            raise ValueError(
                f"URL inválida: '{v}'. Debe ser RTSP (rtsp://...), HTTP (http://...), "
                f"HTTPS (https://...) o un índice numérico (0, 1, 2...) para cámaras locales"
            )
        
        return v
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Valida que el estado sea válido"""
        valid_statuses = ['active', 'inactive', 'error']
        if v not in valid_statuses:
            raise ValueError(f"Status debe ser uno de: {', '.join(valid_statuses)}")
        return v

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    
    @field_validator('url')
    @classmethod
    def validate_url(cls, v):
        """Valida que la URL sea un formato válido para cámaras"""
        if v is None:
            return v
            
        if not v:
            raise ValueError("URL no puede estar vacía")
        
        # Permitir URLs RTSP, HTTP, HTTPS o índices numéricos
        valid_patterns = [
            r'^rtsp://.*',
            r'^https?://.*',
            r'^\d+$',
        ]
        
        if not any(re.match(pattern, v) for pattern in valid_patterns):
            raise ValueError(
                f"URL inválida: '{v}'. Debe ser RTSP (rtsp://...), HTTP (http://...), "
                f"HTTPS (https://...) o un índice numérico (0, 1, 2...) para cámaras locales"
            )
        
        return v
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        """Valida que el estado sea válido"""
        if v is None:
            return v
        valid_statuses = ['active', 'inactive', 'error']
        if v not in valid_statuses:
            raise ValueError(f"Status debe ser uno de: {', '.join(valid_statuses)}")
        return v

class CameraResponse(CameraBase):
    id: int
    is_processing: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
