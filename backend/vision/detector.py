import cv2
import numpy as np
from typing import List, Tuple, Optional

class FaceDetector:
    """Detector de rostros usando OpenCV con Haar Cascade"""
    
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
    
    def detect_faces(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detecta rostros en un frame
        Retorna lista de bounding boxes (x, y, w, h)
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        return faces.tolist() if len(faces) > 0 else []
    
    def draw_faces(self, frame: np.ndarray, faces: List[Tuple[int, int, int, int]]) -> np.ndarray:
        """Dibuja rectángulos alrededor de los rostros detectados"""
        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        return frame
    
    def get_face_roi(self, frame: np.ndarray, face_box: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """Extrae la región de interés (ROI) del rostro"""
        x, y, w, h = face_box
        if w > 0 and h > 0:
            return frame[y:y+h, x:x+w]
        return None
