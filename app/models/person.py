from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.database.connection import Base

class RegisteredPerson(Base):
    __tablename__ = "registered_persons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    face_embedding = Column(Text, nullable=False) # Vector 128D serializado como JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
