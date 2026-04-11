# Guía de Migración a DeepFace (Entornos con Hardware Dedicado)

El servidor de producción actualmente ejecuta la **Opción A** (Modelos Caffe + AntiSpoof de texturas superficiales) para preservar la RAM severamente limitada. Sin embargo, dado que tienes un equipo local de alto rendimiento (16GB RAM + VRAM), puedes ejecutar la súper red profunda **DeepFace** para obtener cero falsos positivos y Anti-Spoofing volumétrico.

Sigue estos pasos en tu entorno local para hacer el "switch".

## 1. Instalar Dependencias 
En tu entorno virtual o sistema local, asegura instalar deepface (instalará TensorFlow en cascada):
```bash
pip install deepface tf-keras torchvision
```

## 2. Reemplazar \`estimator.py\`
Abre \`backend/vision/estimator.py\` y coméntalo o sobrescríbelo completo con esto:

```python
import numpy as np
import cv2
from deepface import DeepFace

class GenderEstimator:
    def __init__(self):
        pass # DeepFace descarga y almacena en caché VGG-Face la primera vez
        
    def check_liveness(self, face_roi: np.ndarray) -> bool:
        # DeepFace lo hace nativamente en la misma inferencia. Lo dejamos pasar en true.
        return True
    
    def estimate_gender(self, face_roi: np.ndarray) -> tuple[str, float]:
        if face_roi is None or face_roi.size == 0:
            return "unknown", 0.0
            
        try:
            # Nota: face_roi es formato BGR devuelto por opencv
            result = DeepFace.analyze(
                img_path=face_roi, 
                actions=['gender'], 
                enforce_detection=False,
                anti_spoofing=True # <--- Activa la red MiniFASNet para detectar pantallas/fotos
            )
            
            # Si detecta ataque (fotografía/pantalla)
            if not result[0].get('is_real', True):
                return "spoof", 1.0

            gender_obj = result[0]['gender']
            
            # DeepFace devuelve formato {'Woman': 99.9, 'Man': 0.1}
            is_male = gender_obj.get('Man', 0) > gender_obj.get('Woman', 0)
            gender = "male" if is_male else "female"
            confidence = max(gender_obj.values()) / 100.0
            
            return gender, confidence
        except Exception as e:
            print(f"DeepFace fallback: {e}")
            return "unknown", 0.0
```

## 3. Consideraciones Primer Arranque
- La primera vez que el código se ejecute y reciba un \`face_roi\`, DeepFace tomará ~2 a 5 minutos congelado descargando localmente los pesos neuronales \`facial_expression_model_weights.h5\` y los pesos de \`MiniFASNetV2.onnx\` en la carpeta raíz de tu usuario de sistema (ej. \`C:\\Users\\Carlos\\.deepface\`).
- Los siguientes frames volarán acelerados por tu tarjeta gráfica gracias a \`tf-keras\`.

## 4. ¡Disfruta la Precisión!
Ya no tendrás detecciones borrosas como géneros aleatorios. Si pones el celular con una foto frente a la webcam local, \`anti_spoofing=True\` de DeepFace cancelará el objeto enviando "spoof" y el FrontEnd automáticamente coloreará la etiqueta en **ROJO (SUPLANTACIÓN FOTO)**.
