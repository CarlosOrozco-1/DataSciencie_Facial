from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CameraBase(BaseModel):
    name: str
    url: str
    location: Optional[str] = None
    status: str = "active"

class CameraCreate(CameraBase):
    pass

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None

class CameraResponse(CameraBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
