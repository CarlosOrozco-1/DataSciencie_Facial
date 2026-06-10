from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from app.database.connection import get_db
from app.models.detection import Detection
from app.models.camera import Camera
from app.schemas.detection import DetectionCreate, DetectionUpdate, DetectionResponse, DetectionStats, FrameAnalysisRequest
from app.core.security import get_current_user
import base64
import cv2
import numpy as np
import logging
import sys
import os
from pathlib import Path
root_dir = str(Path(__file__).resolve().parent.parent.parent)
if root_dir not in sys.path:
    sys.path.append(root_dir)

from backend.vision.detector import FaceDetector
from backend.vision.estimator import FaceAttributesEstimator
from backend.vision.face_auth import FaceAuthenticator
from app.models.person import RegisteredPerson
import hashlib
from pydantic import BaseModel

logger = logging.getLogger(__name__)
detector = FaceDetector()
estimator = FaceAttributesEstimator()
authenticator = FaceAuthenticator()

# Caché en memoria para evitar conteos duplicados de la misma persona (Debounce por Identidad)
recent_detections_cache = {}
DEDUPLICATION_TIME_MINUTES = 5

class RegisterFaceRequest(BaseModel):
    name: str
    images_base64: List[str]

router = APIRouter(
    prefix="/api/detections", 
    tags=["detections"],
    dependencies=[Depends(get_current_user)]
)

public_router = APIRouter(
    prefix="/api/detections", 
    tags=["detections_public"]
)

@router.get("/", response_model=List[DetectionResponse])
def get_detections(
    skip: int = 0, 
    limit: int = 100, 
    camera_id: Optional[int] = None,
    gender: Optional[str] = None,
    location: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Detection)
    
    if camera_id:
        query = query.filter(Detection.camera_id == camera_id)
    if gender:
        query = query.filter(Detection.gender == gender)
    if location:
        query = query.join(Camera).filter(Camera.location == location)
    if start_date:
        query = query.filter(Detection.timestamp >= start_date)
    if end_date:
        query = query.filter(Detection.timestamp <= end_date)
    
    return query.order_by(Detection.timestamp.desc()).offset(skip).limit(limit).all()

from datetime import datetime, timedelta

@router.get("/stats", response_model=DetectionStats)
def get_stats(
    camera_id: Optional[int] = None,
    location: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Detection)
    
    if camera_id:
        query = query.filter(Detection.camera_id == camera_id)
    if location:
        query = query.join(Camera).filter(Camera.location == location)
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
    if location:
        history_query = history_query.join(Camera).filter(Camera.location == location)
        
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
        
        detected_results = []
        has_spoof = False
        
        for face_box in faces:
            roi = detector.get_face_roi(frame, face_box)
            if roi is not None and roi.size > 0:
                # Anti-Spoofing: verificar Liveness
                box_list = [int(v) for v in face_box]
                if not estimator.check_liveness(roi):
                    has_spoof = True
                    detected_results.append({"gender": "spoof", "confidence": 0.0, "box": box_list})
                    continue
                
                gender, confidence = estimator.estimate_gender(roi)
                age, age_conf = estimator.estimate_age(roi)
                
                # Reconocimiento de identidad y Deduplicación basada en Embedding
                person_name = None
                embedding = authenticator.generate_embedding(frame, face_box=box_list)
                current_time = datetime.utcnow()
                is_duplicate = False
                
                if embedding:
                    # 1. Comprobar en el caché de recientes (registrados y anónimos)
                    for name, data in list(recent_detections_cache.items()):
                        last_seen = data["last_seen"]
                        if current_time - last_seen > timedelta(minutes=DEDUPLICATION_TIME_MINUTES):
                            del recent_detections_cache[name] # Limpiar expirados
                            continue
                            
                        is_match, dist = authenticator.compare_faces(data["embedding"], embedding)
                        if is_match:
                            person_name = name
                            is_duplicate = True
                            # Actualizamos embedding y timestamp
                            recent_detections_cache[name]["embedding"] = embedding
                            recent_detections_cache[name]["last_seen"] = current_time
                            break
                    
                    # 2. Si no está en caché (es una nueva persona en la escena)
                    if not person_name:
                        registered_persons = db.query(RegisteredPerson).all()
                        users_list = [(p, p.face_embedding) for p in registered_persons]
                        
                        match = authenticator.find_matching_user(embedding, users_list)
                        if match:
                            person_name = match[0].name
                        else:
                            import time
                            hash_str = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]
                            person_name = f"Anon-{hash_str}"
                            
                        # Guardar en caché para futuros frames
                        recent_detections_cache[person_name] = {
                            "embedding": embedding,
                            "last_seen": current_time
                        }
                else:
                    person_name = "Desconocido"

                detected_results.append({
                    "gender": gender, 
                    "age": age,
                    "person_name": person_name,
                    "confidence": confidence, 
                    "box": box_list,
                    "is_duplicate": is_duplicate
                })
                
                # Guarda registro en BD solo si NO es un duplicado
                if not is_duplicate and request.camera_id > 0:
                    camera = db.query(Camera).filter(Camera.id == request.camera_id).first()
                    if camera:
                        db_detection = Detection(
                            camera_id=request.camera_id,
                            gender=gender,
                            age=age,
                            person_name=person_name,
                            confidence=confidence
                        )
                        db.add(db_detection)
        
        if len(detected_results) > 0:
            db.commit()

        return {"detections": detected_results, "has_spoof": has_spoof}
        
    except Exception as e:
        logger.error(f"Error en analyze_frame: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@public_router.post("/register_face")
def register_face(request: RegisterFaceRequest, db: Session = Depends(get_db)):
    try:
        # 1. Validar duplicidad de Nombre
        existing_user = db.query(RegisteredPerson).filter(func.lower(RegisteredPerson.name) == func.lower(request.name.strip())).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="El nombre ingresado ya está registrado. Por favor, usa otro nombre o agrega un apellido.")

        frames = []
        for encoded_data in request.images_base64:
            if ',' in encoded_data:
                encoded_data = encoded_data.split(',')[1]
                
            img_data = base64.b64decode(encoded_data)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is not None:
                frames.append(frame)
        
        if len(frames) == 0:
            raise HTTPException(status_code=400, detail="Invalid image data")
            
        # Utilizamos las imágenes completas para generar un embedding promedio robusto
        embedding = authenticator.enroll_face(frames)
        
        if not embedding:
            raise HTTPException(status_code=400, detail="No se pudo extraer un rostro válido de las imágenes capturadas. Intenta acercarte más a la cámara y buena iluminación.")
            
        # 3. Detectar Rango de Edad (Para feedback en el registro)
        age_range = "(Desconocida)"
        try:
            # Usar la primera imagen para extraer la edad
            first_frame = frames[0]
            rgb_image = cv2.cvtColor(first_frame, cv2.COLOR_BGR2RGB)
            import face_recognition
            face_locations = face_recognition.face_locations(rgb_image, model="hog")
            if len(face_locations) > 0:
                top, right, bottom, left = face_locations[0]
                roi = first_frame[top:bottom, left:right]
                from backend.vision.estimator import FaceAttributesEstimator
                temp_estimator = FaceAttributesEstimator()
                age, _ = temp_estimator.estimate_age(roi)
                age_range = age
        except Exception as e:
            logger.warning(f"No se pudo estimar la edad en el registro: {e}")
            
        # 2. Validar duplicidad de Rostro (Embedding)
        registered_persons = db.query(RegisteredPerson).all()
        users_list = [(p, p.face_embedding) for p in registered_persons]
        match = authenticator.find_matching_user(embedding, users_list)
        
        if match:
            matched_name = match[0].name
            raise HTTPException(status_code=400, detail=f"Este rostro ya se encuentra registrado en el sistema bajo el nombre de '{matched_name}'.")
            
        new_person = RegisteredPerson(
            name=request.name.strip(),
            face_embedding=authenticator.embedding_to_json(embedding)
        )
        db.add(new_person)
        db.commit()
        db.refresh(new_person)
        
        return {"message": "Persona registrada exitosamente", "person_id": new_person.id, "name": new_person.name, "age": age_range}
    except Exception as e:
        logger.error(f"Error registrando rostro: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{detection_id}", response_model=DetectionResponse)
def update_detection(detection_id: int, detection: DetectionUpdate, db: Session = Depends(get_db)):
    db_detection = db.query(Detection).filter(Detection.id == detection_id).first()
    if not db_detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    update_data = detection.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_detection, key, value)
    
    db.commit()
    db.refresh(db_detection)
    return db_detection

@router.delete("/{detection_id}", status_code=204)
def delete_detection(detection_id: int, db: Session = Depends(get_db)):
    db_detection = db.query(Detection).filter(Detection.id == detection_id).first()
    if not db_detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    db.delete(db_detection)
    db.commit()
    return None
