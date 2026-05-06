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
    Estimador de género usando OpenCV DNN Caffe y Liveness Detection
    """
    
    def __init__(self):
        model_dir = os.path.join(os.path.dirname(__file__), "models")
        prototxt = os.path.join(model_dir, "deploy_gender.prototxt")
        weights = os.path.join(model_dir, "gender_net.caffemodel")
        
        if os.path.exists(prototxt) and os.path.exists(weights):
            self.gender_net = cv2.dnn.readNetFromCaffe(prototxt, weights)
        else:
            self.gender_net = None
            
        self.gender_list = ['male', 'female']
        self.MODEL_MEAN_VALUES = (78.4263377603, 87.7689143744, 114.895847746)
        
    def check_liveness(self, face_roi: np.ndarray) -> bool:
        """
        Anti-Spoofing heurístico ligero.
        Evalúa el grado de desenfoque. Las fotos a través de pantallas o papel
        suelen estar flat o fuera de foco microscópico relativo.
        """
        if face_roi is None or face_roi.size == 0:
            return False
            
        gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Umbral heurístico ajustado para webcams. Bajado de 120.0 a 35.0.
        # Las webcams estándar tienen resoluciones bajas que naturalmente reducen la varianza.
        # 120 marcaba rostros reales como "SPOOF" con mucha frecuencia.
        if variance < 35.0:
            return False
            
        # Comprobar brillos extremadamente altos (reflejos de pantalla del celular a la webcam)
        bright_pixels = np.sum(gray > 245)
        total_pixels = gray.size
        if (bright_pixels / total_pixels) > 0.08: # Si más del 8% del rostro es completamente blanco
            return False
            
        return True
    
    def estimate_gender(self, face_roi: np.ndarray) -> Tuple[str, float]:
        """
        Estima el género usando ResNet Caffe desde el ROI extraído.
        Retorna (género, confianza)
        """
        if face_roi is None or face_roi.size == 0 or self.gender_net is None:
            return "unknown", 0.0
        
        try:
            # Preprocesamiento: Mejorar contraste para ayudar al modelo Caffe
            img_yuv = cv2.cvtColor(face_roi, cv2.COLOR_BGR2YUV)
            img_yuv[:,:,0] = cv2.equalizeHist(img_yuv[:,:,0])
            enhanced_roi = cv2.cvtColor(img_yuv, cv2.COLOR_YUV2BGR)
            
            blob = cv2.dnn.blobFromImage(enhanced_roi, 1.0, (227, 227), self.MODEL_MEAN_VALUES, swapRB=False)
            self.gender_net.setInput(blob)
            preds = self.gender_net.forward()
            
            # preds[0] -> probabilidad de [male, female] dependiendo del config del modelo de Levi & Hassner.
            # En el modelo oficial de Levi: índice 0 es Male, índice 1 es Female.
            gender_idx = preds[0].argmax()
            gender = self.gender_list[gender_idx]
            confidence = float(preds[0].max())
            
            return gender, confidence
        except Exception as e:
            print(f"Error en estimación DNN de género: {e}")
            return "unknown", 0.0
