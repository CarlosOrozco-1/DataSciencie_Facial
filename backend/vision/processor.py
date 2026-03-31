import cv2
import numpy as np
import threading
import time
import logging
from typing import Optional, Callable
from backend.vision.detector import FaceDetector
from backend.vision.estimator import GenderEstimator

# Configurar logging
logger = logging.getLogger(__name__)

class VideoProcessor:
    """
    Procesador de video que detecta rostros y estima género
    """
    
    # Configuración de reintentos
    MAX_RETRIES = 3
    RETRY_DELAY = 2  # segundos
    RECONNECT_TIMEOUT = 5  # segundos
    
    def __init__(self, camera_url: str, camera_id: int, username: Optional[str] = None, password: Optional[str] = None):
        self.camera_url = camera_url
        self.camera_id = camera_id
        self.username = username
        self.password = password
        
        self.detector = FaceDetector()
        self.estimator = GenderEstimator()
        
        self.cap: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        
        self.on_detection_callback: Optional[Callable] = None
        self.on_error_callback: Optional[Callable] = None
        
        self.frame_skip = 5
        self.frame_count = 0
        
        # Tracking de conexión
        self.connection_retries = 0
        self.last_error: Optional[str] = None
    
    def _build_url(self) -> str:
        """Construye la URL con credenciales si es necesario"""
        url = self.camera_url
        
        if self.username and self.password:
            if url.startswith("rtsp://"):
                # Verificar que no tenga ya credenciales
                if "@" not in url:
                    url = url.replace("rtsp://", f"rtsp://{self.username}:{self.password}@", 1)
            elif url.startswith("http://"):
                if "@" not in url:
                    url = url.replace("http://", f"http://{self.username}:{self.password}@", 1)
            elif url.startswith("https://"):
                if "@" not in url:
                    url = url.replace("https://", f"https://{self.username}:{self.password}@", 1)
        
        return url
    
    def connect(self, retry_count: int = 0) -> bool:
        """
        Conecta a la cámara con reintentos
        
        Args:
            retry_count: Número actual de reintento
            
        Returns:
            True si conectó exitosamente, False si falló
        """
        if retry_count > self.MAX_RETRIES:
            error_msg = f"No se pudo conectar a cámara {self.camera_id} después de {self.MAX_RETRIES} intentos"
            self.last_error = error_msg
            logger.error(error_msg)
            return False
        
        try:
            url = self._build_url()
            
            logger.info(f"[Cámara {self.camera_id}] Intento de conexión {retry_count + 1}/{self.MAX_RETRIES + 1}: {self.camera_url}")
            
            self.cap = cv2.VideoCapture(url)
            
            # Configurar timeouts
            self.cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, self.RECONNECT_TIMEOUT * 1000)
            
            if not self.cap.isOpened():
                self.cap.release()
                self.cap = None
                
                if retry_count < self.MAX_RETRIES:
                    logger.warning(f"[Cámara {self.camera_id}] Falló intento {retry_count + 1}, reintentando en {self.RETRY_DELAY}s...")
                    time.sleep(self.RETRY_DELAY)
                    return self.connect(retry_count + 1)
                else:
                    error_msg = f"[Cámara {self.camera_id}] No se pudo abrir stream: URL puede estar inaccesible o credenciales incorrectas"
                    self.last_error = error_msg
                    logger.error(error_msg)
                    return False
            
            self.connection_retries = 0
            logger.info(f"[Cámara {self.camera_id}] Conexión establecida exitosamente")
            return True
            
        except Exception as e:
            error_msg = f"[Cámara {self.camera_id}] Error de conexión: {str(e)}"
            self.last_error = error_msg
            logger.error(error_msg)
            
            if self.cap:
                self.cap.release()
                self.cap = None
            
            if retry_count < self.MAX_RETRIES:
                logger.warning(f"[Cámara {self.camera_id}] Reintentando en {self.RETRY_DELAY}s...")
                time.sleep(self.RETRY_DELAY)
                return self.connect(retry_count + 1)
            
            return False
    
    def disconnect(self):
        """Desconecta de la cámara"""
        if self.cap:
            self.cap.release()
            self.cap = None
            logger.info(f"[Cámara {self.camera_id}] Desconectada")
    
    def set_detection_callback(self, callback: Callable):
        """Configura el callback para recibir detecciones"""
        self.on_detection_callback = callback
    
    def set_error_callback(self, callback: Callable):
        """Configura el callback para errores"""
        self.on_error_callback = callback
    
    def process_frame(self, frame: np.ndarray) -> list:
        """
        Procesa un frame y retorna las detecciones
        """
        detections = []
        
        try:
            faces = self.detector.detect_faces(frame)
            
            for face_box in faces:
                roi = self.detector.get_face_roi(frame, face_box)
                
                if roi is not None and roi.size > 0:
                    gender, confidence = self.estimator.estimate_gender(roi)
                    
                    detection = {
                        "camera_id": self.camera_id,
                        "gender": gender,
                        "confidence": confidence,
                        "face_box": face_box
                    }
                    detections.append(detection)
        except Exception as e:
            error_msg = f"[Cámara {self.camera_id}] Error procesando frame: {str(e)}"
            logger.error(error_msg)
        
        return detections
    
    def start_processing(self, on_detection: Optional[Callable] = None):
        """Inicia el procesamiento en un hilo separado"""
        if self.is_running:
            logger.warning(f"[Cámara {self.camera_id}] Ya está en procesamiento")
            return
        
        if on_detection:
            self.on_detection_callback = on_detection
        
        self.is_running = True
        self.thread = threading.Thread(target=self._process_loop, daemon=True, name=f"VideoProcessor-{self.camera_id}")
        self.thread.start()
        logger.info(f"[Cámara {self.camera_id}] Procesamiento iniciado")
    
    def stop_processing(self):
        """Detiene el procesamiento"""
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=5)
        self.disconnect()
        logger.info(f"[Cámara {self.camera_id}] Procesamiento detenido")
    
    def _process_loop(self):
        """Ciclo principal de procesamiento"""
        if not self.connect():
            self.is_running = False
            if self.on_error_callback:
                self.on_error_callback({
                    "camera_id": self.camera_id,
                    "error": self.last_error
                })
            return
        
        while self.is_running:
            try:
                ret, frame = self.cap.read()
                
                if not ret:
                    logger.warning(f"[Cámara {self.camera_id}] No se pudo leer frame")
                    time.sleep(1)
                    continue
                
                self.frame_count += 1
                
                if self.frame_count % self.frame_skip == 0:
                    detections = self.process_frame(frame)
                    
                    if detections and self.on_detection_callback:
                        for det in detections:
                            self.on_detection_callback(det)
                
                time.sleep(0.01)
                
            except Exception as e:
                error_msg = f"[Cámara {self.camera_id}] Error en loop de procesamiento: {str(e)}"
                self.last_error = error_msg
                logger.error(error_msg)
                break
        
        self.disconnect()
    
    def get_current_frame(self) -> Optional[np.ndarray]:
        """Obtiene el frame actual (para previsualización)"""
        if self.cap and self.cap.isOpened():
            try:
                ret, frame = self.cap.read()
                if ret:
                    return frame
            except Exception as e:
                logger.error(f"[Cámara {self.camera_id}] Error obteniendo frame: {str(e)}")
        return None
    
    def is_connected(self) -> bool:
        """Verifica si está conectado a la cámara"""
        return self.cap is not None and self.cap.isOpened()
    
    def get_status(self) -> dict:
        """Retorna el estado actual del procesador"""
        return {
            "camera_id": self.camera_id,
            "is_running": self.is_running,
            "is_connected": self.is_connected(),
            "last_error": self.last_error,
            "frames_processed": self.frame_count
        }
