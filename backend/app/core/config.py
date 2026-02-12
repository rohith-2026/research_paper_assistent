from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Research Paper Assistant"
    ENV: str = "dev"

    MONGO_URI: str
    MONGO_DB: str

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES: int = 0

    GEMINI_API_KEY: str | None = None
    GEMINI_API_BASE: str | None = None
    GEMINI_MODEL: str | None = None
    GEMINI_SUMMARY_MODEL: str | None = None
    REDIS_URL: str | None = None
    

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
