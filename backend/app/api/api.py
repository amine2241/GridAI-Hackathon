from fastapi import APIRouter
from .endpoints import auth, chat, tickets, admin, system

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin.router, tags=["agents"]) 
api_router.include_router(system.router, tags=["system"])
