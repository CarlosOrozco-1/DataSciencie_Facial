import numpy as np
import cv2
import logging
import os

try:
    from deepface import DeepFace
except ImportError:
    DeepFace = None
    logging.warning("DeepFace no detectado. Ejecute pip install deepface tf-keras torch torchvision")

class GenderEstimator:
    """
    Estimador de género usando DeepFace (Opción B Integral)
    Incluye MiniFASNet para Liveness Detection (Anti-Spoofing) Nativamente.
    """
    
    def __init__(self):
        self.gender_list = ['male', 'female']
        
    def check_liveness(self, face_roi: np.ndarray) -> bool:
        """
        By-pass de la bandera, ya que DeepFace calculará el Liveness
        y lo devolverá en el método estimate_gender simultáneamente.
        """
        return True
    
    def estimate_gender(self, face_roi: np.ndarray) -> tuple[str, float]:
        """
        Estima el género y liveness usando DeepFace
        """
        if face_roi is None or face_roi.size == 0 or DeepFace is None:
            return "unknown", 0.0
        
        try:
            # Llama a DeepFace para analizar (Anti-Spoofing en red neuronal MiniFASNet)
            results = DeepFace.analyze(
                img_path=face_roi, 
                actions=['gender'], 
                enforce_detection=False,
                anti_spoofing=True 
            )
            
            result = results[0]
            
            # Evaluación del Liveness de DeepFace
            if not result.get('is_real', True):
                return "spoof", 1.0

            gender_obj = result.get('gender', {})
            
            # DeepFace estructura {'Man': 99.9, 'Woman': 0.1}
            man_conf = gender_obj.get('Man', 0)
            woman_conf = gender_obj.get('Woman', 0)
            
            is_male = man_conf > woman_conf
            gender = "male" if is_male else "female"
            confidence = max(man_conf, woman_conf) / 100.0
            
            return gender, confidence
        except Exception as e:
            logging.error(f"Error en estimación DeepFace: {e}")
            return "unknown", 0.0
