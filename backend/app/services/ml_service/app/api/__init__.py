"""
API router registration for the FastAPI application.
"""

from fastapi import APIRouter

from .routes.predict import router as predict_router


api_router = APIRouter()
api_router.include_router(predict_router)



