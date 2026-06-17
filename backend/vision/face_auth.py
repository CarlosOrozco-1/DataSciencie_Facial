"""
Módulo de autenticación facial usando face_recognition (dlib).
Genera embeddings de 128 dimensiones para identificar usuarios únicos.
"""

import numpy as np
import cv2
import json
import logging
import os
from typing import List, Optional, Tuple

try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False

logger = logging.getLogger(__name__)

# Tolerancia configurable por entorno. Aumentada a 0.64 para mejor detección
FACE_MATCH_TOLERANCE = float(os.environ.get("FACE_MATCH_TOLERANCE", "0.64"))


class FaceAuthenticator:
    """Motor de autenticación facial usando face_recognition (dlib).
    
    Genera vectores de 128 dimensiones (embeddings) que representan
    la identidad única de un rostro. Permite registrar y verificar usuarios.
    """
    
    def __init__(self):
        if not FACE_RECOGNITION_AVAILABLE:
            logger.warning("face_recognition no disponible. Autenticación facial deshabilitada.")
    
    def generate_embedding(self, image: np.ndarray, face_box: Optional[List[int]] = None) -> Optional[List[float]]:
        """Genera un embedding facial de 128 dimensiones a partir de una imagen.
        
        Args:
            image: Imagen BGR (formato OpenCV). Puede ser el frame completo.
            face_box: Opcional [x, y, w, h]. Si se provee, extrae el embedding directo de ahí sin redetectar.
            
        Returns:
            Lista de 128 floats representando la identidad del rostro, o None si no se detectó rostro.
        """
        if not FACE_RECOGNITION_AVAILABLE:
            return None
            
        # Convertir BGR (OpenCV) a RGB (face_recognition)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        if face_box:
            # face_recognition usa formato (top, right, bottom, left)
            x, y, w, h = face_box
            face_locations = [(max(0, y), min(rgb_image.shape[1], x+w), min(rgb_image.shape[0], y+h), max(0, x))]
        else:
            # Detectar ubicaciones de rostros
            face_locations = face_recognition.face_locations(rgb_image, model="hog")
            
            if len(face_locations) == 0:
                logger.warning("No se detectó ningún rostro en la imagen")
                return None
            
            if len(face_locations) > 1:
                logger.warning(f"Se detectaron {len(face_locations)} rostros. Usando el más grande.")
                # Seleccionar el rostro más grande (mayor área)
                face_locations = [max(face_locations, key=lambda f: (f[2] - f[0]) * (f[1] - f[3]))]
        
        # Generar embedding para el rostro detectado
        encodings = face_recognition.face_encodings(rgb_image, face_locations)
        
        if len(encodings) == 0:
            logger.warning("No se pudo generar encoding del rostro detectado")
            return None
        
        return encodings[0].tolist()
    
    def enroll_face(self, images: List[np.ndarray]) -> Optional[List[float]]:
        """Genera un embedding promedio a partir de múltiples capturas.
        
        Tomar varias fotos con ligeras variaciones mejora la robustez
        del embedding almacenado, haciéndolo más tolerante a cambios
        menores de ángulo e iluminación.
        
        Args:
            images: Lista de imágenes BGR (mínimo 1, recomendado 3)
            
        Returns:
            Embedding promedio de 128D, o None si falló.
        """
        embeddings = []
        
        for i, img in enumerate(images):
            embedding = self.generate_embedding(img)
            if embedding is not None:
                embeddings.append(embedding)
                logger.info(f"Embedding {i+1}/{len(images)} generado exitosamente")
            else:
                logger.warning(f"No se pudo generar embedding para imagen {i+1}/{len(images)}")
        
        if len(embeddings) == 0:
            logger.error("No se pudo generar ningún embedding de las imágenes proporcionadas")
            return None
        
        # Promediar los embeddings para obtener una representación más robusta
        avg_embedding = np.mean(embeddings, axis=0).tolist()
        logger.info(f"Embedding promedio generado a partir de {len(embeddings)} capturas")
        return avg_embedding
    
    def compare_faces(self, known_embedding: List[float], candidate_embedding: List[float], 
                      tolerance: float = None) -> Tuple[bool, float]:
        """Compara dos embeddings faciales.
        
        Args:
            known_embedding: Embedding registrado del usuario
            candidate_embedding: Embedding del rostro candidato
            tolerance: Umbral de distancia (default: FACE_MATCH_TOLERANCE)
            
        Returns:
            Tupla (is_match, distance). is_match es True si distancia < tolerance.
        """
        if tolerance is None:
            tolerance = FACE_MATCH_TOLERANCE
            
        known = np.array(known_embedding)
        candidate = np.array(candidate_embedding)
        
        # Distancia euclidiana entre los dos vectores de 128D
        distance = float(np.linalg.norm(known - candidate))
        is_match = distance < tolerance
        
        return is_match, distance
    
    def find_matching_user(self, candidate_embedding: List[float], 
                           registered_users: list) -> Optional[Tuple[object, float]]:
        """Busca el usuario con el embedding más cercano al candidato.
        
        Args:
            candidate_embedding: Embedding del rostro en el login
            registered_users: Lista de tuplas (user, embedding_json_string)
            
        Returns:
            Tupla (user, distance) del mejor match, o None si no hay match.
        """
        best_match = None
        best_distance = float('inf')
        
        for user, embedding_json in registered_users:
            try:
                known_embedding = json.loads(embedding_json)
                is_match, distance = self.compare_faces(known_embedding, candidate_embedding)
                
                if is_match and distance < best_distance:
                    best_distance = distance
                    best_match = user
                    
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Error al decodificar embedding del usuario {user.id}: {e}")
                continue
        
        if best_match:
            logger.info(f"Match facial encontrado: usuario {best_match.id} (distancia: {best_distance:.4f})")
            return best_match, best_distance
        
        logger.info("No se encontró match facial")
        return None
    
    @staticmethod
    def embedding_to_json(embedding: List[float]) -> str:
        """Serializa un embedding a JSON para almacenar en BD."""
        return json.dumps(embedding)
    
    @staticmethod
    def embedding_from_json(json_str: str) -> List[float]:
        """Deserializa un embedding desde JSON."""
        return json.loads(json_str)
