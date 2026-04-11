import cv2
import numpy as np
from typing import List, Tuple, Optional

import os

class FaceDetector:
    """Detector de rostros usando OpenCV DNN con ResNet SSD"""
    
    def __init__(self):
        model_dir = os.path.join(os.path.dirname(__file__), "models")
        prototxt = os.path.join(model_dir, "deploy.prototxt")
        weights = os.path.join(model_dir, "res10_300x300_ssd_iter_140000.caffemodel")
        
        if os.path.exists(prototxt) and os.path.exists(weights):
            self.net = cv2.dnn.readNetFromCaffe(prototxt, weights)
        else:
            self.net = None
        self.conf_threshold = 0.5
    
    def detect_faces(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detecta rostros en un frame usando DNN
        Retorna lista de bounding boxes (x, y, w, h)
        """
        if self.net is None:
            return []
            
        h, w = frame.shape[:2]
        blob = cv2.dnn.blobFromImage(cv2.resize(frame, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
        self.net.setInput(blob)
        detections = self.net.forward()
        
        faces = []
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            if confidence > self.conf_threshold:
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (startX, startY, endX, endY) = box.astype("int")
                
                # Expandir el bounding box un ~20%
                # Caffe Model Gender_Net fue entrenado capturando cabello y cuello enteros
                face_w = endX - startX
                face_h = endY - startY
                padding_x = int(face_w * 0.15)
                padding_y = int(face_h * 0.20)
                
                startX = max(0, startX - padding_x)
                startY = max(0, startY - padding_y)
                endX = min(w, endX + padding_x)
                endY = min(h, endY + padding_y)
                
                if endX > startX and endY > startY:
                    faces.append((startX, startY, endX - startX, endY - startY))
        return faces
    
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
