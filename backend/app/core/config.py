from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration, loaded from the .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # SQL Server connection
    db_server: str = r"localhost\SQLEXPRESS"
    db_name: str = "myringgit_db"
    db_trusted_connection: str = "yes"
    db_user: str = ""
    db_password: str = ""
    db_driver: str = "ODBC Driver 17 for SQL Server"

    # JWT auth
    jwt_secret_key: str = "change-this-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # CORS
    cors_origins: str = "http://127.0.0.1:5500,http://localhost:5500"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def database_url(self) -> str:
        """Build a SQLAlchemy connection URL for SQL Server via pyodbc."""
        driver = self.db_driver.replace(" ", "+")
        if self.db_trusted_connection.lower() == "yes":
            return (
                f"mssql+pyodbc://@{self.db_server}/{self.db_name}"
                f"?driver={driver}&trusted_connection=yes"
            )
        return (
            f"mssql+pyodbc://{self.db_user}:{self.db_password}@{self.db_server}/{self.db_name}"
            f"?driver={driver}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
