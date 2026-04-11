from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from app.database.connection import get_db
from app.models.detection import Detection
from app.models.camera import Camera
from app.schemas.detection import DetectionCreate, DetectionResponse, DetectionStats, FrameAnalysisRequest
from app.core.security import get_current_user
import base64
import cv2
import numpy as np
import logging
from backend.vision.detector import FaceDetector
from backend.vision.estimator import GenderEstimator

logger = logging.getLogger(__name__)
detector = FaceDetector()
estimator = GenderEstimator()

router = APIRouter(
    prefix="/api/detections", 
    tags=["detections"],
    dependencies=[Depends(get_current_user)]
)

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

from datetime import datetime, timedelta

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
    
    # Calcular historial (últimas 24 horas agrupadas por hora)
    last_24h = datetime.utcnow() - timedelta(hours=24)
    history_query = db.query(
        func.date_trunc('hour', Detection.timestamp).label('hour'),
        func.count(Detection.id).label('count')
    ).filter(Detection.timestamp >= last_24h)
    
    if camera_id:
        history_query = history_query.filter(Detection.camera_id == camera_id)
        
    history_data = history_query.group_by('hour').order_by('hour').all()
    
    history_list = [
        {"label": h.hour.strftime("%H:00"), "count": h.count}
        for h in history_data
    ]
    
    # Calcular tendencia de flujo de personas
    last_1h = datetime.utcnow() - timedelta(hours=1)
    last_2h = datetime.utcnow() - timedelta(hours=2)
    last_hour_count = query.filter(Detection.timestamp >= last_1h).count()
    prev_hour_count = query.filter(Detection.timestamp >= last_2h, Detection.timestamp < last_1h).count()
    
    # Diferencia acotada: (Actual - Previo) / Max(Actual, Previo) * 100
    # Esto mantiene los porcentajes estrictamente entre -100% y +100%
    difference = last_hour_count - prev_hour_count
    denominator = max(last_hour_count, prev_hour_count)
    
    if denominator > 0:
        flow_trend = (difference / denominator) * 100.0
    else:
        flow_trend = 0.0
    
    return DetectionStats(
        total_detections=total,
        male_count=male_count,
        female_count=female_count,
        avg_confidence=round(avg_conf, 2),
        history=history_list,
        flow_trend=round(flow_trend, 1)
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

@router.post("/analyze_frame")
def analyze_frame(request: FrameAnalysisRequest, db: Session = Depends(get_db)):
    try:
        # Extraer base64 si incluye el prefijo 'data:image/jpeg;base64,'
        encoded_data = request.image_base64
        if ',' in encoded_data:
            encoded_data = encoded_data.split(',')[1]
            
        img_data = base64.b64decode(encoded_data)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
            
        faces = detector.detect_faces(frame)
        
        detected_gender = "none_detected"
        
        if len(faces) > 0:
            # Por simplicidad tomamos la primera cara
            face_box = faces[0]
            roi = detector.get_face_roi(frame, face_box)
            if roi is not None and roi.size > 0:
                # Anti-Spoofing: verificar Liveness
                if not estimator.check_liveness(roi):
                    # Retornamos spoof, no guardamos en DB
                    return {"gender": "spoof", "message": "Posible ataque detectado (Foto/Pantalla)"}
                
                gender, confidence = estimator.estimate_gender(roi)
                
                if gender == "spoof":
                    return {"gender": "spoof", "message": "Suplantación interceptada por DeepFace LivenessCNN"}
                
                detected_gender = gender
                
                # Guarda registro si hay una cámara y es una detección válida
                if request.camera_id > 0:
                    camera = db.query(Camera).filter(Camera.id == request.camera_id).first()
                    if camera:
                        db_detection = Detection(
                            camera_id=request.camera_id,
                            gender=gender,
                            confidence=confidence
                        )
                        db.add(db_detection)
                        db.commit()

        return {"gender": detected_gender}
        
    except Exception as e:
        logger.error(f"Error en analyze_frame: {e}")
        raise HTTPException(status_code=500, detail=str(e))
