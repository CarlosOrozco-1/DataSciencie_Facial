from datetime import datetime, timedelta
from typing import Optional
import os
import jwt
import pyotp
import qrcode
import io
import base64
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.user import User

# Configuración de cifrado
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración JWT
# Secret key desde environment y cargada en docker-compose
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 días de sesión

def get_token_from_request(request: Request) -> str:
    """Extrae el token JWT del header Authorization o del query param ?token="""
    authorization = request.headers.get("Authorization")
    scheme, token = get_authorization_scheme_param(authorization)
    if not authorization or scheme.lower() != "bearer":
        # Fallback a query parameter (para <img> tags de streams MJPEG)
        token = request.query_params.get("token")
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
    return token

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False  # Usuario sin contraseña (ej: registrado solo con Google)
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Genera un JWT con los datos proporcionados y expiración configurable"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=5) #5 minutos de expiración
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_reset_token(email: str) -> str:
    """Genera un JWT de corta vida (5 minutos) exclusivo para reset de contraseña"""
    return create_access_token(
        data={"sub": email, "purpose": "password_reset"},
        expires_delta=timedelta(minutes=5)
    )

def verify_reset_token(token: str) -> str:
    """Decodifica un token de reset y retorna el email si es válido"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        purpose = payload.get("purpose")
        if email is None or purpose != "password_reset":
            raise HTTPException(status_code=400, detail="Token de recuperación inválido")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="El enlace de recuperación ha expirado (5 min)")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Token de recuperación inválido")

def create_temp_2fa_token(email: str) -> str:
    """Genera un JWT temporal (5 min) para el segundo paso del login 2FA"""
    return create_access_token(
        data={"sub": email, "purpose": "2fa_validation"},
        expires_delta=timedelta(minutes=5)
    )

def verify_temp_2fa_token(token: str) -> str:
    """Decodifica un token temporal de 2FA y retorna el email"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        purpose = payload.get("purpose")
        if email is None or purpose != "2fa_validation":
            raise HTTPException(status_code=400, detail="Token 2FA inválido")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="El código 2FA ha expirado (5 min)")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Token 2FA inválido")

# ======== Funciones TOTP para 2FA ========

def generate_totp_secret() -> str:
    """Genera una clave secreta aleatoria para TOTP"""
    return pyotp.random_base32()

def generate_qr_code(secret: str, email: str) -> str:
    """Genera un QR code en base64 para vincular con Microsoft/Google Authenticator"""
    totp = pyotp.TOTP(secret)
    # URI estándar que las apps de authenticator reconocen
    provisioning_uri = totp.provisioning_uri(
        name=email,
        issuer_name="BioFacial"
    )
    # Generar imagen QR
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convertir a base64 para enviar al frontend
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{img_base64}"

def verify_totp_code(secret: str, code: str) -> bool:
    """Valida un código TOTP de 6 dígitos contra la clave secreta compartida.
    
    Esto es el corazón del 2FA: tanto nuestro servidor como Microsoft Authenticator
    toman la MISMA clave secreta + la hora actual → producen el MISMO código.
    Si coinciden, el usuario es quien dice ser.
    valid_window=1 permite un margen de ±30 segundos por desincronización de reloj.
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=0)

# ======== Dependency de autenticación ========

def get_current_user(token: str = Depends(get_token_from_request), db: Session = Depends(get_db)):
    """Decodifica el JWT y retorna el usuario autenticado o lanza 401"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas, firma o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)):
    """Verifica si el usuario actual tiene privilegios de administrador"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tus privilegios no son suficientes para acceder a este módulo."
        )
    return current_user
