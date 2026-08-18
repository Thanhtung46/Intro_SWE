"""Environment configuration and the read-only Postgres connection pool.

Reads the same Supabase Postgres database spot-backend uses (see
research.md decision 3) — this service never writes to it. No new
dependency is added for .env loading (PROJECT_RULES.md §1.6 doesn't lock
python-dotenv for spot-ai-services/*); `.env` is parsed with a small
built-in loader instead.
"""

import os
from pathlib import Path

from psycopg2.pool import ThreadedConnectionPool

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv(_ENV_PATH)


class Settings:
    """Process-wide settings, read once from the environment."""

    def __init__(self) -> None:
        self.port = int(os.environ.get("PORT", "5001"))
        self.db_host = os.environ.get("DB_HOST", "localhost")
        self.db_port = int(os.environ.get("DB_PORT", "5432"))
        self.db_name = os.environ.get("DB_NAME", "postgres")
        self.db_user = os.environ.get("DB_USER", "postgres")
        self.db_password = os.environ.get("DB_PASSWORD", "")
        self.db_ssl = os.environ.get("DB_SSL", "true").lower() == "true"
        self.db_pool_max = int(os.environ.get("DB_POOL_MAX", "5"))
        self.internal_service_key = os.environ.get("INTERNAL_SERVICE_KEY", "")


settings = Settings()

_pool: ThreadedConnectionPool | None = None


def get_pool() -> ThreadedConnectionPool:
    """Lazily create the process-wide connection pool (min 1, max DB_POOL_MAX)."""
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=settings.db_pool_max,
            host=settings.db_host,
            port=settings.db_port,
            dbname=settings.db_name,
            user=settings.db_user,
            password=settings.db_password,
            sslmode="require" if settings.db_ssl else "prefer",
        )
    return _pool


class connection:
    """Context manager that checks a connection out of the pool and back in.

    Usage:
        with connection() as conn:
            with conn.cursor() as cur:
                cur.execute(...)
    """

    def __enter__(self):
        self._conn = get_pool().getconn()
        return self._conn

    def __exit__(self, exc_type, exc, tb):
        pool = get_pool()
        if exc_type is not None:
            self._conn.rollback()
        pool.putconn(self._conn)
