from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import init_db
from app.models import camera, detection
from app.api import cameras, detections, processing

app = FastAPI(title="Facial Recognition API")

# Configuración añadida: Habilitar CORS para permitir que el frontend React
# (en puerto 8501 u otro origen) pueda consumir la API sin bloqueos del navegador.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Para dev, permite cualquier origen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cameras.router)
app.include_router(detections.router)
app.include_router(processing.router)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
def root():
    return {"message": "Facial Recognition API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
