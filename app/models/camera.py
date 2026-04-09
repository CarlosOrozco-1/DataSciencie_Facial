from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    username = Column(String(255), nullable=True)
    password = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    hardware_label = Column(String(255), nullable=True)
    status = Column(String(50), default="active")
    is_processing = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    detections = relationship("Detection", back_populates="camera", cascade="all, delete-orphan")
    
    def get_full_url(self):
        """Retorna la URL completa con credenciales si existen"""
        if self.username and self.password:
            if self.url.startswith("rtsp://"):
                return self.url.replace("rtsp://", f"rtsp://{self.username}:{self.password}@")
            elif self.url.startswith("http://"):
                return self.url.replace("http://", f"http://{self.username}:{self.password}@")
            elif self.url.startswith("https://"):
                return self.url.replace("https://", f"https://{self.username}:{self.password}@")
        return self.url
