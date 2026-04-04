from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import cv2
import io
from app.database.connection import get_db
from app.models.camera import Camera
from app.schemas.camera import CameraCreate, CameraUpdate, CameraResponse
from app.api.processing import active_processors
from app.core.security import get_current_user

router = APIRouter(
    prefix="/api/cameras", 
    tags=["cameras"], 
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[CameraResponse])
def get_cameras(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Camera).offset(skip).limit(limit).all()

@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera(camera_id: int, db: Session = Depends(get_db)):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera

@router.post("/", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
def create_camera(camera: CameraCreate, db: Session = Depends(get_db)):
    db_camera = Camera(**camera.model_dump())
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

@router.put("/{camera_id}", response_model=CameraResponse)
def update_camera(camera_id: int, camera: CameraUpdate, db: Session = Depends(get_db)):
    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    update_data = camera.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_camera, key, value)
    
    db.commit()
    db.refresh(db_camera)
    return db_camera

@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not db_camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    db.delete(db_camera)
    db.commit()
    return {"message": "Camera deleted successfully"}

@router.get("/{camera_id}/status")
def check_camera_status(camera_id: int, db: Session = Depends(get_db)):
    """Verifica si una cámara está accessible"""
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    try:
        url = camera.url
        if camera.username and camera.password:
            if url.startswith("rtsp://"):
                url = url.replace("rtsp://", f"rtsp://{camera.username}:{camera.password}@", 1)
        
        if url.isdigit():
            cap = cv2.VideoCapture(int(url), cv2.CAP_V4L2)
        else:
            cap = cv2.VideoCapture(url)
        
        is_open = cap.isOpened()
        
        if is_open:
            for _ in range(3):
                ret, frame = cap.read()
                if ret and frame is not None:
                    break
        
        cap.release()
        
        return {
            "camera_id": camera_id,
            "name": camera.name,
            "url": camera.url,
            "status": "online" if is_open else "offline",
            "accessible": is_open
        }
    except Exception as e:
        return {
            "camera_id": camera_id,
            "name": camera.name,
            "url": camera.url,
            "status": "error",
            "accessible": False,
            "error": str(e)
        }

@router.post("/{camera_id}/test")
def test_camera_connection(camera_id: int, db: Session = Depends(get_db)):
    """Prueba la conexión a una cámara y retorna un frame"""
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    try:
        url = camera.url
        if camera.username and camera.password:
            if url.startswith("rtsp://"):
                url = url.replace("rtsp://", f"rtsp://{camera.username}:{camera.password}@", 1)
            elif url.startswith("http://"):
                url = url.replace("http://", f"http://{camera.username}:{camera.password}@", 1)
        
        cap = cv2.VideoCapture(url)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 10)
        cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 3000)
        
        if not cap.isOpened():
            cap.release()
            return {
                "camera_id": camera_id,
                "connected": False,
                "message": "No se pudo abrir la cámara"
            }
        
        ret, frame = cap.read()
        cap.release()
        
        if ret and frame is not None:
            return {
                "camera_id": camera_id,
                "connected": True,
                "message": "Cámara conectada exitosamente",
                "frame_resolution": f"{frame.shape[1]}x{frame.shape[0]}"
            }
        else:
            return {
                "camera_id": camera_id,
                "connected": False,
                "message": "No se pudo leer frames de la cámara"
            }
    except Exception as e:
        return {
            "camera_id": camera_id,
            "connected": False,
            "message": f"Error: {str(e)}"
        }

@router.get("/{camera_id}/frame")
def get_camera_frame(camera_id: int, db: Session = Depends(get_db)):
    """Obtiene el frame actual de una cámara activa en procesamiento"""
    if camera_id not in active_processors:
        raise HTTPException(status_code=404, detail="Cámara no está en procesamiento")
    
    processor = active_processors[camera_id]
    frame = processor.get_current_frame()
    
    if frame is None:
        raise HTTPException(status_code=500, detail="No se pudo obtener frame")
    
    # Convertir frame a JPEG
    _, buffer = cv2.imencode('.jpg', frame)
    img_io = io.BytesIO(buffer)
    img_io.seek(0)
    
    return StreamingResponse(img_io, media_type="image/jpeg")
