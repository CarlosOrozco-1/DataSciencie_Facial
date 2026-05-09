from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import init_db, SessionLocal
from app.models import camera, detection, user
from app.api import cameras, detections, processing, auth, users, reports
from app.core import security

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

# Middleware interactivo para el monitoreo Handshake de Tokens JWT (Visible en logs console)
@app.middleware("http")
async def jwt_handshake_monitor(request: Request, call_next):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        print(f"\n🔐 [JWT Handshake Capturado]")
        print(f"  ├─ Origen: {request.client.host}")
        print(f"  ├─ Destino Endpoint: {request.url.path}")
        print(f"  └─ Carga Token JWT: {token[:15]}...{token[-10:]} (Verificado)")
        print(f"─────────────────────────────────────────────────────────────")
        
    response = await call_next(request)
    return response

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(cameras.router)
app.include_router(detections.router)
app.include_router(processing.router)
app.include_router(reports.router)

@app.on_event("startup")
def startup_event():
    init_db()
    # Ejecutar SEED de usuario administrador la primera vez
    db = SessionLocal()
    try:
        admin_email = "admin@generosense.com"
        admin_user = db.query(user.User).filter(user.User.email == admin_email).first()
        if not admin_user:
            print("🌱 Sembrando usuario Administrador de emergencia en la Base de Datos...")
            hashed_pwd = security.get_password_hash("password123")
            new_admin = user.User(username="admin", email=admin_email, hashed_password=hashed_pwd)
            db.add(new_admin)
            db.commit()
            print("✅ Usuario admin (admin@generosense.com) generado con éxito.")
    except Exception as e:
        print(f"Error en seed user: {e}")
    finally:
        db.close()

@app.get("/")
def root():
    return {"message": "Facial Recognition API", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}
