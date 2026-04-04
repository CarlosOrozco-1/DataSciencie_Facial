from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserResetPassword, UserChangePassword
from app.core.security import get_current_user, get_password_hash, verify_password

# Router protegido por JWT: solo usuarios autenticados pueden gestionar usuarios
router = APIRouter(
    prefix="/api/users",
    tags=["users"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[UserResponse])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Listar todos los usuarios registrados en el sistema"""
    return db.query(User).offset(skip).limit(limit).all()

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Obtener los datos del usuario autenticado actual"""
    return current_user

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Obtener un usuario específico por ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Registrar un nuevo usuario en el sistema"""
    # Validar que el username no exista
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="El nombre de usuario ya está registrado"
        )
    
    # Validar que el email no exista
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="El correo electrónico ya está registrado"
        )
    
    # Crear usuario con contraseña hasheada
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_data: UserUpdate, db: Session = Depends(get_db)):
    """Actualizar datos de un usuario (sin contraseña)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_fields = user_data.model_dump(exclude_unset=True)
    
    # Validar unicidad si se cambia username o email
    if "username" in update_fields:
        existing = db.query(User).filter(User.username == update_fields["username"], User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ese nombre de usuario ya existe")
    
    if "email" in update_fields:
        existing = db.query(User).filter(User.email == update_fields["email"], User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ese correo ya está registrado")
    
    for key, value in update_fields.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}/reset-password")
def reset_user_password(user_id: int, data: UserResetPassword, db: Session = Depends(get_db)):
    """Resetear la contraseña de un usuario (acción de admin)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Contraseña restablecida exitosamente"}

@router.put("/me/change-password")
def change_own_password(
    data: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permite al usuario autenticado cambiar su propia contraseña"""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Contraseña actualizada exitosamente"}

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Eliminar un usuario del sistema"""
    # No permitir auto-eliminación
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(user)
    db.commit()
    return {"message": "Usuario eliminado"}
