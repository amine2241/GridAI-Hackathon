from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import uuid

from ...core import auth
from ...core.database import User, get_db
from ...schemas.auth import UserRegister, Token, UserUpdate

router = APIRouter()

@router.post("/register", response_model=Token, tags=["auth"])
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        name=user_data.name,
        password_hash=auth.get_password_hash(user_data.password),
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    
    access_token = auth.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token, tags=["auth"])
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", tags=["auth"])
async def get_me(current_user: User = Depends(auth.get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "mobile_phone": current_user.mobile_phone,
        "address": current_user.address,
        "role": current_user.role
    }

@router.patch("/me", tags=["auth"])
async def update_me(update: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    """Update current user's profile (name, phone, address)"""
    if update.name is not None:
        current_user.name = update.name
    if update.mobile_phone is not None:
        current_user.mobile_phone = update.mobile_phone
    if update.address is not None:
        current_user.address = update.address
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "mobile_phone": current_user.mobile_phone,
        "address": current_user.address,
        "role": current_user.role
    }
