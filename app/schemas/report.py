from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class ReportRequest(BaseModel):
    """
    Modelo para la solicitud de envío de reportes por correo.
    Contiene los filtros de datos y la configuración del envío.
    """
    email: EmailStr
    format: str # 'pdf' o 'excel'
    message: Optional[str] = None
    
    # Filtros de datos
    camera_id: Optional[int] = None
    gender: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
