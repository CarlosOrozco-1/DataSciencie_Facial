import numpy as np
import cv2
from typing import Tuple, Optional
import os

try:
    import onnxruntime as ort
    ONNXRUNTIME_AVAILABLE = True
except ImportError:
    ONNXRUNTIME_AVAILABLE = False

class GenderEstimator:
    """
    Estimador de género usando modelo ONNX
    NOTA: Para producción, usar un modelo entrenado como FairFace
    Este es un ejemplo simplificado
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.session = None
        
        if ONNXRUNTIME_AVAILABLE and model_path and os.path.exists(model_path):
            try:
                self.session = ort.InferenceSession(model_path)
            except Exception as e:
                print(f"Error cargando modelo ONNX: {e}")
    
    def estimate_gender(self, face_roi: np.ndarray) -> Tuple[str, float]:
        """
        Estima el género a partir de una imagen de rostro
        Retorna (género, confianza)
        """
        if self.session is None:
            return self._estimate_heuristic(face_roi)
        
        try:
            return self._estimate_onnx(face_roi)
        except Exception as e:
            print(f"Error en estimación: {e}")
            return "unknown", 0.0
    
    def _estimate_onnx(self, face_roi: np.ndarray) -> Tuple[str, float]:
        """Estimación usando modelo ONNX"""
        img = cv2.resize(face_roi, (64, 64))
        img = img.astype(np.float32) / 255.0
        img = img.transpose(2, 0, 1).reshape(1, 3, 64, 64)
        
        input_name = self.session.get_inputs()[0].name
        output = self.session.run(None, {input_name: img})
        
        prob = output[0][0]
        gender = "male" if prob[0] > 0.5 else "female"
        confidence = float(max(prob[0], 1 - prob[0]))
        
        return gender, confidence
    
    def _estimate_heuristic(self, face_roi: np.ndarray) -> Tuple[str, float]:
        """
        Estimación heurística simple basada en características faciales
        NOTA: Esto es solo para pruebas - usar modelo ONNX en producción
        """
        if face_roi is None or face_roi.size == 0:
            return "unknown", 0.0
        
        h, w = face_roi.shape[:2]
        
        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        
        face_width = w
        face_height = h
        
        aspect_ratio = face_width / face_height if face_height > 0 else 1.0
        
        hair_region = gray[int(h * 0.1):int(h * 0.4), :]
        if hair_region.size > 0:
            hair_brightness = np.mean(hair_region)
            is_male = hair_brightness < 100
            confidence = 0.65
        else:
            is_male = aspect_ratio > 0.75
            confidence = 0.55
        
        gender = "male" if is_male else "female"
        
        return gender, confidence
    
    def preprocess_face(self, face_roi: np.ndarray, target_size: Tuple[int, int] = (64, 64)) -> np.ndarray:
        """Preprocesa la imagen del rostro para el modelo"""
        img = cv2.resize(face_roi, target_size)
        img = img.astype(np.float32) / 255.0
        img = img.transpose(2, 0, 1)
        return img
