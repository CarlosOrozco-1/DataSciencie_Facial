from fastapi import FastAPI
from app.database.connection import init_db
from app.models import camera, detection
from app.api import cameras, detections, processing

app = FastAPI(title="Facial Recognition API")

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
