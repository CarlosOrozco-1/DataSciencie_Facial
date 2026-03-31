from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database.connection import get_db
from app.models.camera import Camera
from app.models.detection import Detection
from backend.vision.processor import VideoProcessor

router = APIRouter(prefix="/api/processing", tags=["processing"])

active_processors: Dict[int, VideoProcessor] = {}

def on_detection_callback(camera_id: int, detection_data: dict, db: Session):
    """Callback para guardar detecciones en la base de datos"""
    db_detection = Detection(
        camera_id=camera_id,
        gender=detection_data["gender"],
        confidence=detection_data["confidence"]
    )
    db.add(db_detection)
    db.commit()

@router.post("/start/{camera_id}")
def start_processing(camera_id: int, db: Session = Depends(get_db)):
    """Inicia el procesamiento de video para una cámara"""
    
    if camera_id in active_processors:
        return {"message": "Procesamiento ya activo", "camera_id": camera_id}
    
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    
    processor = VideoProcessor(
        camera_url=camera.url,
        camera_id=camera.id,
        username=camera.username,
        password=camera.password
    )
    
    def callback(detection_data):
        on_detection_callback(camera_id, detection_data, next(get_db()))
    
    try:
        processor.start_processing(on_detection=callback)
        active_processors[camera_id] = processor
        
        camera.is_processing = True
        db.commit()
        
        return {
            "message": "Procesamiento iniciado",
            "camera_id": camera_id,
            "camera_name": camera.name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al iniciar: {str(e)}")

@router.post("/stop/{camera_id}")
def stop_processing(camera_id: int, db: Session = Depends(get_db)):
    """Detiene el procesamiento de video para una cámara"""
    
    if camera_id not in active_processors:
        return {"message": "Procesamiento no activo", "camera_id": camera_id}
    
    processor = active_processors[camera_id]
    processor.stop_processing()
    del active_processors[camera_id]
    
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if camera:
        camera.is_processing = False
        db.commit()
    
    return {
        "message": "Procesamiento detenido",
        "camera_id": camera_id
    }

@router.get("/status")
def get_processing_status(db: Session = Depends(get_db)):
    """Obtiene el estado de todos los procesamientos activos"""
    # Usar el estado en memoria para que no haya desincronización con la BD tras reinicios
    active_ids = list(active_processors.keys())
    if not active_ids:
        return {"active_cameras": []}
        
    cameras = db.query(Camera).filter(Camera.id.in_(active_ids)).all()
    
    return {
        "active_cameras": [
            {
                "camera_id": cam.id,
                "name": cam.name,
                "url": cam.url,
                "is_processing": True
            }
            for cam in cameras
        ]
    }

@router.get("/status/{camera_id}")
def get_camera_processing_status(camera_id: int, db: Session = Depends(get_db)):
    """Obtiene el estado del procesamiento de una cámara específica"""
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    
    is_active = camera_id in active_processors
    processor = active_processors.get(camera_id)
    
    return {
        "camera_id": camera_id,
        "name": camera.name,
        "is_processing": camera.is_processing,
        "processor_active": is_active,
        "connected": processor.is_connected() if processor else False
    }

@router.get("/frame/{camera_id}")
def get_current_frame(camera_id: int):
    """Obtiene el frame actual de la cámara como imagen"""
    from fastapi.responses import Response
    
    if camera_id not in active_processors:
        raise HTTPException(status_code=404, detail="Procesamiento no activo")
    
    processor = active_processors[camera_id]
    
    if not processor.is_connected():
        raise HTTPException(status_code=400, detail="Cámara no conectada")
    
    try:
        buffer_bytes = processor.get_jpeg_frame()
        if buffer_bytes is None:
            raise HTTPException(status_code=400, detail="No se pudo obtener frame procesado")
        
        return Response(content=buffer_bytes, media_type="image/jpeg")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/video_feed/{camera_id}")
def video_feed(camera_id: int):
    """Endpoint para streaming MJPEG fluido"""
    from fastapi.responses import StreamingResponse
    import time
    
    if camera_id not in active_processors:
        raise HTTPException(status_code=404, detail="Procesamiento no activo")
        
    processor = active_processors[camera_id]
    
    def generate_frames():
        while camera_id in active_processors and processor.is_connected():
            frame_bytes = processor.get_jpeg_frame()
            if frame_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            else:
                time.sleep(0.1)
            time.sleep(0.03) # ~30 fps max
            
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")
