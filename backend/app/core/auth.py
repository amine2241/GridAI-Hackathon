import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import SessionLocal, User, UserRole

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    logger.error("SECRET_KEY not found in environment!")

    SECRET_KEY = "PLEASE_SET_A_SECURE_SECRET_KEY_IN_ENV" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "my-realm")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "my-client")
KEYCLOAK_PUBLIC_KEY = os.getenv("KEYCLOAK_PUBLIC_KEY", "") 

import logging
logger = logging.getLogger(__name__)

import bcrypt
try:
    if not hasattr(bcrypt, "__about__"):
        class About:
            __version__ = getattr(bcrypt, "__version__", "4.0.0")
        bcrypt.__about__ = About()
except Exception:
    pass

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password, hashed_password):
    try:
        if not plain_password:
            return False
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def get_password_hash(password):
    try:
        if not password:
             raise ValueError("Empty password")
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Password hashing error: {e}")
        raise e

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        user = db.query(User).filter(User.email == email).first()
        if user is None:
             raise credentials_exception
        return user
    except Exception:
        raise credentials_exception

    return user

async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Optional authentication - returns None if no valid token is provided.
    Used for endpoints that support both authenticated and public access.
    """
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            logger.warning("[AUTH] Token payload missing 'sub'")
            return None
        user = db.query(User).filter(User.email == email).first()
        if not user:
            logger.warning(f"[AUTH] No user found for email: {email}")
        return user
    except JWTError as e:
        logger.warning(f"[AUTH] JWT Decode Error: {e}")
        return None
    except Exception as e:
        logger.error(f"[AUTH] Unexpected Error: {e}")
        return None

def seed_admin_user(db: Session) -> User:
    """
    Creates a default admin user if one does not already exist.
    Email: admin@example.com
    Password: admin
    """
    admin_email = "admin@example.com"
    existing_admin = db.query(User).filter(User.email == admin_email).first()
    
    if not existing_admin:
        logger.info(f"Seeding default admin user: {admin_email}")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin")
        hashed_pw = get_password_hash(admin_password)
        
        new_admin = User(
            id="admin-user-001",
            email=admin_email,
            password_hash=hashed_pw,
            role=UserRole.ADMIN,
            workflow_id=None  
        )
        db.add(new_admin)
        try:
            db.commit()
            db.refresh(new_admin)
            logger.info("Default admin created successfully.")
            return new_admin
        except Exception as e:
            logger.error(f"Failed to seed admin: {e}")
            db.rollback()
            return None
    
    return existing_admin

def check_admin_role(user: User = Depends(get_current_user)):
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return user
