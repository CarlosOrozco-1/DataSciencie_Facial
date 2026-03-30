from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from app.database.connection import get_db
from app.models.detection import Detection
from app.models.camera import Camera
from app.schemas.detection import DetectionCreate, DetectionResponse, DetectionStats

router = APIRouter(prefix="/api/detections", tags=["detections"])

@router.get("/", response_model=List[DetectionResponse])
def get_detections(
    skip: int = 0, 
    limit: int = 100, 
    camera_id: Optional[int] = None,
    gender: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Detection)
    
    if camera_id:
        query = query.filter(Detection.camera_id == camera_id)
    if gender:
        query = query.filter(Detection.gender == gender)
    
    return query.order_by(Detection.timestamp.desc()).offset(skip).limit(limit).all()

@router.get("/stats", response_model=DetectionStats)
def get_stats(
    camera_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Detection)
    
    if camera_id:
        query = query.filter(Detection.camera_id == camera_id)
    if start_date:
        query = query.filter(Detection.timestamp >= start_date)
    if end_date:
        query = query.filter(Detection.timestamp <= end_date)
    
    total = query.count()
    male_count = query.filter(Detection.gender == "male").count()
    female_count = query.filter(Detection.gender == "female").count()
    avg_conf = query.with_entities(func.avg(Detection.confidence)).scalar() or 0.0
    
    return DetectionStats(
        total_detections=total,
        male_count=male_count,
        female_count=female_count,
        avg_confidence=round(avg_conf, 2)
    )

@router.post("/", response_model=DetectionResponse)
def create_detection(detection: DetectionCreate, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.id == detection.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    db_detection = Detection(**detection.model_dump())
    db.add(db_detection)
    db.commit()
    db.refresh(db_detection)
    return db_detection
