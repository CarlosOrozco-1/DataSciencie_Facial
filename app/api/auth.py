from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
import os
import logging
import base64
import cv2
import numpy as np
import json

from app.database.connection import get_db
from app.models.user import User
from app.core.security import (
    verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES,
    create_reset_token, verify_reset_token, get_password_hash,
    create_temp_2fa_token, verify_temp_2fa_token,
    generate_totp_secret, generate_qr_code, verify_totp_code,
    get_current_user
)
from app.core.email_service import send_password_reset_email, send_welcome_email
from app.schemas.user import (
    Token, LoginResponse, ForgotPasswordRequest, ResetPasswordRequest,
    TwoFactorSetupResponse, TwoFactorVerifyRequest, TwoFactorValidateRequest,
    GoogleAuthRequest, FaceEnrollRequest, FaceLoginRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ======== LOGIN (con soporte 2FA) ========

@router.post("/login", response_model=LoginResponse)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    """Login con username o email. Si el usuario tiene 2FA activo, retorna un token temporal
    en vez del JWT final, requiriendo validación del código del authenticator."""
    
    # Buscar usuario por username O por email
    user = db.query(User).filter(
        or_(User.username == form_data.username, User.email == form_data.username)
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrecta",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    
    # Si el usuario tiene 2FA activado, no entregar JWT aún
    # En su lugar, entregar un token temporal para el segundo paso
    if user.is_2fa_enabled and user.totp_secret:
        temp_token = create_temp_2fa_token(user.email)
        return LoginResponse(
            requires_2fa=True,
            temp_token=temp_token
        )
    
    # Login normal sin 2FA: entregar JWT inmediatamente
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "is_admin": user.is_admin}, expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        requires_2fa=False
    )

# ======== 2FA: Validación en Login ========

@router.post("/2fa/validate", response_model=Token)
def validate_2fa_login(data: TwoFactorValidateRequest, db: Session = Depends(get_db)):
    """Segundo paso del login: valida el código de 6 dígitos del authenticator.
    Recibe el temp_token del paso 1 + el código del teléfono."""
    
    # Verificar que el token temporal sea válido
    email = verify_temp_2fa_token(data.temp_token)
    
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.totp_secret:
        raise HTTPException(status_code=400, detail="Usuario no encontrado o 2FA no configurado")
    
    # Verificar el código TOTP contra la clave secreta compartida
    if not verify_totp_code(user.totp_secret, data.code):
        raise HTTPException(status_code=400, detail="Código de verificación incorrecto o expirado")
    
    # Código válido: ahora sí entregar el JWT final
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "is_admin": user.is_admin}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# ======== 2FA: Configuración ========

@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
def setup_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Genera la clave secreta TOTP y el código QR para vincular con Microsoft Authenticator.
    El usuario debe escanear el QR y luego verificar con un código para activar 2FA."""
    
    # Generar nueva clave secreta
    secret = generate_totp_secret()
    
    # Guardar el secreto temporalmente (no activar 2FA hasta que se verifique)
    current_user.totp_secret = secret
    db.commit()
    
    # Generar QR code como imagen base64
    qr_base64 = generate_qr_code(secret, current_user.email)
    
    return TwoFactorSetupResponse(
        qr_code=qr_base64,
        secret=secret,
        message="Escanea el código QR con Microsoft Authenticator y luego verifica con el código de 6 dígitos"
    )

@router.post("/2fa/verify")
def verify_2fa_setup(data: TwoFactorVerifyRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verifica que el código del authenticator es correcto y activa 2FA permanentemente.
    Este es el paso final de la configuración: confirma que el usuario tiene la app correctamente vinculada."""
    
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Primero ejecuta /2fa/setup para generar el QR")
    
    # Verificar que el código coincide
    if not verify_totp_code(current_user.totp_secret, data.code):
        raise HTTPException(status_code=400, detail="Código incorrecto. Reintenta con el código actual de tu app Authenticator")
    
    # Activar 2FA permanentemente
    current_user.is_2fa_enabled = True
    db.commit()
    
    return {"message": "✅ Autenticación de doble factor activada exitosamente"}

@router.post("/2fa/disable")
def disable_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Desactiva 2FA para el usuario autenticado. Elimina la clave secreta."""
    current_user.is_2fa_enabled = False
    current_user.totp_secret = None
    db.commit()
    return {"message": "2FA desactivado. Ahora solo necesitas usuario y contraseña para ingresar"}

# ======== Google OAuth 2.0 ========

@router.post("/google", response_model=Token)
def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Autenticación con Google. Recibe el id_token de Google Identity Services,
    lo verifica contra los servidores de Google, y emite un JWT propio de GenderSense.
    
    Si el usuario no existe, lo crea automáticamente (auto-registro).
    Si ya existe con el mismo email, vincula la cuenta Google."""
    
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
    
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID no configurado en el servidor")
    
    try:
        # Verificar el token con Google (valida firma, expiración, audience)
        idinfo = id_token.verify_oauth2_token(
            data.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        # Extraer datos del usuario desde el payload del token
        google_sub = idinfo.get("sub")       # ID único de Google
        email = idinfo.get("email")
        name = idinfo.get("name", "")
        
        if not email:
            raise HTTPException(status_code=400, detail="El token de Google no contiene email")
        
    except ValueError as e:
        logger.error(f"Error verificando token de Google: {e}")
        raise HTTPException(status_code=401, detail="Token de Google inválido o expirado")
    
    # Buscar usuario existente por google_id o email
    user = db.query(User).filter(
        or_(User.google_id == google_sub, User.email == email)
    ).first()
    
    if user:
        # Usuario existente: vincular google_id si aún no lo tiene
        if not user.google_id:
            user.google_id = google_sub
            user.is_google_enabled = True
            db.commit()
            logger.info(f"Cuenta Google vinculada al usuario existente: {email}")
    else:
        # Usuario nuevo: auto-registro con datos de Google
        # Generar username único basado en el email
        base_username = email.split("@")[0]
        username = base_username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User(
            username=username,
            email=email,
            hashed_password=None,  # Sin contraseña (solo Google)
            google_id=google_sub,
            is_google_enabled=True,
            is_admin=False,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info(f"Nuevo usuario creado via Google: {email} (username: {username})")
        
        # Enviar correo de bienvenida al nuevo usuario
        send_welcome_email(email, username, auth_method="Google")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    
    # Emitir JWT de GenderSense
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "is_admin": user.is_admin}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/google/unlink")
def unlink_google(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Desvincula la cuenta de Google del usuario actual.
    Solo se permite si el usuario tiene contraseña configurada (para no quedarse sin acceso)."""
    
    if not current_user.google_id:
        raise HTTPException(status_code=400, detail="No tienes una cuenta de Google vinculada")
    
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=400, 
            detail="No puedes desvincular Google sin tener una contraseña configurada. Primero establece una contraseña."
        )
    
    current_user.google_id = None
    current_user.is_google_enabled = False
    db.commit()
    
    return {"message": "Cuenta de Google desvinculada exitosamente"}

# ======== Reconocimiento Facial ========

@router.post("/face/enroll")
def enroll_face(data: FaceEnrollRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Registra el rostro del usuario autenticado.
    
    Recibe una lista de imágenes base64 (3 capturas recomendadas),
    genera embeddings para cada una y almacena el promedio en la BD."""
    
    from backend.vision.face_auth import FaceAuthenticator, FACE_RECOGNITION_AVAILABLE
    from backend.vision.estimator import GenderEstimator
    
    if not FACE_RECOGNITION_AVAILABLE:
        raise HTTPException(status_code=500, detail="face_recognition no está instalado en el servidor")
    
    if len(data.images) < 1:
        raise HTTPException(status_code=400, detail="Se requiere al menos 1 imagen")
    
    if len(data.images) > 5:
        raise HTTPException(status_code=400, detail="Máximo 5 imágenes permitidas")
    
    authenticator = FaceAuthenticator()
    estimator = GenderEstimator()
    decoded_images = []
    
    for i, img_b64 in enumerate(data.images):
        try:
            # Extraer base64 si incluye el prefijo data:image/...
            encoded_data = img_b64
            if ',' in encoded_data:
                encoded_data = encoded_data.split(',')[1]
            
            img_data = base64.b64decode(encoded_data)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                raise HTTPException(status_code=400, detail=f"Imagen {i+1} inválida")
            
            # Verificar liveness (anti-spoofing) usando el detector existente
            from backend.vision.detector import FaceDetector
            detector = FaceDetector()
            faces = detector.detect_faces(frame)
            
            if len(faces) == 0:
                raise HTTPException(status_code=400, detail=f"No se detectó rostro en la imagen {i+1}")
            
            face_box = faces[0]
            roi = detector.get_face_roi(frame, face_box)
            
            if roi is not None and not estimator.check_liveness(roi):
                raise HTTPException(status_code=400, detail=f"La imagen {i+1} parece ser una foto o pantalla (anti-spoofing)")
            
            decoded_images.append(frame)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error procesando imagen {i+1}: {e}")
            raise HTTPException(status_code=400, detail=f"Error procesando imagen {i+1}: {str(e)}")
    
    # Generar embedding promedio
    embedding = authenticator.enroll_face(decoded_images)
    
    if embedding is None:
        raise HTTPException(status_code=400, detail="No se pudo generar el embedding facial. Asegúrate de que tu rostro sea claramente visible.")
    
    # Guardar en la BD
    current_user.face_embedding = FaceAuthenticator.embedding_to_json(embedding)
    current_user.has_face_enrolled = True
    db.commit()
    
    return {"message": "✅ Rostro registrado exitosamente. Ya puedes iniciar sesión con reconocimiento facial."}

@router.delete("/face/enroll")
def delete_face_enrollment(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Elimina el rostro registrado del usuario actual.
    Solo se permite si tiene otro método de acceso disponible."""
    
    if not current_user.has_face_enrolled:
        raise HTTPException(status_code=400, detail="No tienes un rostro registrado")
    
    # Verificar que no se quede sin método de acceso
    has_password = current_user.hashed_password is not None
    has_google = current_user.is_google_enabled
    
    if not has_password and not has_google:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar tu rostro sin tener contraseña o Google configurado."
        )
    
    current_user.face_embedding = None
    current_user.has_face_enrolled = False
    db.commit()
    
    return {"message": "Rostro eliminado exitosamente"}

@router.post("/face/login", response_model=Token)
def face_login(data: FaceLoginRequest, db: Session = Depends(get_db)):
    """Login mediante reconocimiento facial.
    
    Recibe una imagen base64, genera el embedding y lo compara
    contra todos los embeddings registrados en la BD."""
    
    from backend.vision.face_auth import FaceAuthenticator, FACE_RECOGNITION_AVAILABLE
    
    if not FACE_RECOGNITION_AVAILABLE:
        raise HTTPException(status_code=500, detail="face_recognition no está instalado en el servidor")
    
    # Decodificar imagen
    try:
        encoded_data = data.image
        if ',' in encoded_data:
            encoded_data = encoded_data.split(',')[1]
        
        img_data = base64.b64decode(encoded_data)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Imagen inválida")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error decodificando imagen: {str(e)}")
    
    # Verificar liveness (anti-spoofing)
    from backend.vision.detector import FaceDetector
    from backend.vision.estimator import GenderEstimator
    
    detector = FaceDetector()
    estimator = GenderEstimator()
    faces = detector.detect_faces(frame)
    
    if len(faces) == 0:
        raise HTTPException(status_code=400, detail="No se detectó ningún rostro en la imagen")
    
    face_box = faces[0]
    roi = detector.get_face_roi(frame, face_box)
    
    if roi is not None and not estimator.check_liveness(roi):
        raise HTTPException(status_code=400, detail="Posible ataque detectado: la imagen parece ser una foto o pantalla")
    
    # Generar embedding del candidato
    authenticator = FaceAuthenticator()
    candidate_embedding = authenticator.generate_embedding(frame)
    
    if candidate_embedding is None:
        raise HTTPException(status_code=400, detail="No se pudo generar el embedding facial")
    
    # Obtener todos los usuarios con rostro registrado
    enrolled_users = db.query(User).filter(
        User.has_face_enrolled == True,
        User.face_embedding.isnot(None),
        User.is_active == True
    ).all()
    
    if not enrolled_users:
        raise HTTPException(status_code=401, detail="No hay usuarios con rostro registrado")
    
    # Buscar match
    registered = [(u, u.face_embedding) for u in enrolled_users]
    result = authenticator.find_matching_user(candidate_embedding, registered)
    
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Rostro no reconocido. Si no has registrado tu rostro, hazlo desde tu perfil.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user, distance = result
    logger.info(f"Login facial exitoso: {user.email} (distancia: {distance:.4f})")
    
    # Emitir JWT
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "is_admin": user.is_admin}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

# ======== Recuperación de Contraseña ========

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Envía un correo con enlace temporal de recuperación de contraseña.
    Por seguridad, siempre responde con éxito incluso si el email no existe."""
    
    user = db.query(User).filter(User.email == data.email).first()
    
    if user:
        # Generar token de reset de 15 min
        reset_token = create_reset_token(user.email)
        # Enviar correo con el enlace
        send_password_reset_email(user.email, reset_token)
    
    # Siempre responder con el mismo mensaje (seguridad: no revelar si el email existe)
    return {"message": "Si el correo está registrado, recibirás un enlace de recuperación en tu bandeja"}

@router.post("/reset-password")
def reset_password_with_token(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Recibe el token de reset + nueva contraseña y actualiza en BD."""
    
    # Verificar y decodificar el token
    email = verify_reset_token(data.token)
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Actualizar contraseña
    user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña"}
