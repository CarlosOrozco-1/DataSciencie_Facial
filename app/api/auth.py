from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.connection import get_db
from app.models.user import User
from app.core.security import (
    verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES,
    create_reset_token, verify_reset_token, get_password_hash,
    create_temp_2fa_token, verify_temp_2fa_token,
    generate_totp_secret, generate_qr_code, verify_totp_code,
    get_current_user
)
from app.core.email_service import send_password_reset_email
from app.schemas.user import (
    Token, LoginResponse, ForgotPasswordRequest, ResetPasswordRequest,
    TwoFactorSetupResponse, TwoFactorVerifyRequest, TwoFactorValidateRequest
)

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
        data={"sub": user.email}, expires_delta=access_token_expires
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
        data={"sub": user.email}, expires_delta=access_token_expires
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
