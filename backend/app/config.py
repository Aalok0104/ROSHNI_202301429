from pydantic_settings import BaseSettings

from .env import load_environment

load_environment()


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    FRONTEND_REDIRECT_URL: str


settings = Settings()
