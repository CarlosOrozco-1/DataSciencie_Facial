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
        
        # Guardar frames para API
        self.frame_lock = threading.Lock()
        self.latest_processed_frame: Optional[np.ndarray] = None
        self.last_faces = []  # Para mantener los cuadros suaves entre frame skips
        
        # Tracking de rostros (Debounce)
        self.recent_faces = [] # [{'center': (cx, cy), 'timestamp': t}]
        self.DISTANCE_THRESHOLD = 60 # Píxeles de tolerancia de movimiento para misma persona
        self.TIME_THRESHOLD = 5.0 # Segundos de espera antes de volver a registrarla
        
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
            
            # Detectar si es webcam local (número)
            if self.camera_url.isdigit():
                # Usar V4L2 para webcam local
                self.cap = cv2.VideoCapture(int(self.camera_url), cv2.CAP_V4L2)
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                logger.info(f"[Cámara {self.camera_id}] Usando V4L2 para webcam local")
            else:
                # RTSP/HTTP
                import os
                if url.startswith("rtsp://"):
                    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
                self.cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
                self.cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, self.RECONNECT_TIMEOUT * 1000)
            
            # Intentar leer algunos frames para verificar
            if self.cap.isOpened():
                for _ in range(5):
                    ret, frame = self.cap.read()
                    if ret and frame is not None:
                        logger.info(f"[Cámara {self.camera_id}] Frame recibido: {frame.shape}")
                        break
                    time.sleep(0.1)
            
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
    
    def process_frame(self, frame: np.ndarray) -> tuple[list, list]:
        """
        Procesa un frame y retorna (detecciones_nuevas_para_bd, caras_para_dibujar)
        """
        detections = []
        faces_to_draw = []
        
        try:
            faces = self.detector.detect_faces(frame)
            current_time = time.time()
            
            # Limpiar rostros antiguos del tracker de debounce
            self.recent_faces = [f for f in self.recent_faces if current_time - f['timestamp'] < self.TIME_THRESHOLD]
            
            for face_box in faces:
                x, y, w, h = face_box
                cx, cy = x + w//2, y + h//2
                
                roi = self.detector.get_face_roi(frame, face_box)
                
                if roi is not None and roi.size > 0:
                    gender, confidence = self.estimator.estimate_gender(roi)
                    
                    # Preparar guardado en BD usando lógica debounce
                    is_new = True
                    for f in self.recent_faces:
                        dist = ((cx - f['center'][0])**2 + (cy - f['center'][1])**2)**0.5
                        if dist < self.DISTANCE_THRESHOLD:
                            is_new = False
                            # Actualizar tiempo para mantenerlo activo y actualizar centro
                            f['timestamp'] = current_time
                            f['center'] = (cx, cy)
                            break
                    
                    if is_new:
                        self.recent_faces.append({'center': (cx, cy), 'timestamp': current_time})
                        detection = {
                            "camera_id": self.camera_id,
                            "gender": gender,
                            "confidence": confidence,
                            "face_box": face_box
                        }
                        detections.append(detection)
                    
                    label = f"{'Hombre' if gender == 'male' else 'Mujer'} {confidence:.0%}"
                    faces_to_draw.append((x, y, w, h, gender, label))
                    
        except Exception as e:
            error_msg = f"[Cámara {self.camera_id}] Error procesando frame: {str(e)}"
            logger.error(error_msg)
        
        return detections, faces_to_draw
    
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
                    self.connection_retries += 1
                    logger.warning(f"[Cámara {self.camera_id}] No se pudo leer frame ({self.connection_retries}/{self.MAX_RETRIES})")
                    if self.connection_retries > self.MAX_RETRIES:
                        logger.error(f"[Cámara {self.camera_id}] Se perdió conexión con la cámara de forma definitiva.")
                        break
                    time.sleep(1)
                    continue
                else:
                    self.connection_retries = 0
                
                self.frame_count += 1
                
                if self.frame_count % self.frame_skip == 0:
                    detections, self.last_faces = self.process_frame(frame)
                    
                    if detections and self.on_detection_callback:
                        for det in detections:
                            self.on_detection_callback(det)
                
                # Dibujar las caras siempre, logrando visualización fluida
                draw_frame = frame.copy()
                for (x, y, w, h, gender, label) in self.last_faces:
                    color = (255, 0, 0) if gender == "male" else (0, 0, 255)  # BGR
                    # Añadir estilo al recuadro
                    cv2.rectangle(draw_frame, (x, y), (x+w, y+h), color, 2)
                    cv2.rectangle(draw_frame, (x, y-25), (x + w, y), color, cv2.FILLED)
                    cv2.putText(draw_frame, label, (x+5, y-8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                with self.frame_lock:
                    self.latest_processed_frame = draw_frame
                
                time.sleep(0.01)
                
            except Exception as e:
                error_msg = f"[Cámara {self.camera_id}] Error en loop de procesamiento: {str(e)}"
                self.last_error = error_msg
                logger.error(error_msg)
                break
        
        self.disconnect()
    
    def get_current_frame(self) -> Optional[np.ndarray]:
        """Obtiene el frame actual procesado (thread-safe, sin interferir con la lectura)"""
        with self.frame_lock:
            if self.latest_processed_frame is not None:
                return self.latest_processed_frame.copy()
        # Si aún no hay frame procesado, intentamos uno directo pero sin bloquear cv2.read() del hilo.
        # Preferiblemente devolvemos None o un placeholder.
        return None
        
    def get_jpeg_frame(self) -> Optional[bytes]:
        """Genera el byte stream en JPEG del fotograma actual listo para ser emitido"""
        frame = self.get_current_frame()
        if frame is not None:
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                return buffer.tobytes()
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
