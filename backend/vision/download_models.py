import os
import urllib.request
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Diccionario de archivos a descargar
FILES = {
    # Face Detector (OpenCV SSD)
    "deploy.prototxt": "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt",
    "res10_300x300_ssd_iter_140000.caffemodel": "https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel",
    
    # Gender Estimator (Gil Levi & Tal Hassner)
    "deploy_gender.prototxt": "https://raw.githubusercontent.com/GilLevi/AgeGenderDeepLearning/master/models/deploy_gender.prototxt",
    "gender_net.caffemodel": "https://github.com/GilLevi/AgeGenderDeepLearning/raw/master/models/gender_net.caffemodel"
}

def download_models():
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
        logger.info(f"Directorio creado: {MODELS_DIR}")
        
    for filename, url in FILES.items():
        filepath = os.path.join(MODELS_DIR, filename)
        if not os.path.exists(filepath):
            logger.info(f"Descargando {filename}...")
            try:
                urllib.request.urlretrieve(url, filepath)
                logger.info(f"✔ Descarga exitosa: {filename}")
            except Exception as e:
                logger.error(f"Error descargando {filename}: {e}")
        else:
            logger.info(f"✓ El archivo {filename} ya existe.")

if __name__ == "__main__":
    download_models()
