from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DetectionBase(BaseModel):
    camera_id: int
    gender: str
    confidence: float

class DetectionCreate(DetectionBase):
    pass

class DetectionResponse(DetectionBase):
    id: int
    timestamp: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class DetectionStats(BaseModel):
    total_detections: int
    male_count: int
    female_count: int
    avg_confidence: float

class FrameAnalysisRequest(BaseModel):
    image_base64: str
    camera_id: int
