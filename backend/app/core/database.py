from typing import AsyncGenerator
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False, "timeout": 30} if "sqlite" in settings.DATABASE_URL else {}
)

# Enable WAL mode and busy timeout for concurrent SQLite reads/writes
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if "sqlite" in settings.DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=10000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db() -> None:
    def _run_migrations(connection):
        from sqlalchemy import text
        try:
            result = connection.execute(text("PRAGMA table_info(cases)")).fetchall()
            if result:
                col_names = [row[1] for row in result]
                if "tags" not in col_names:
                    connection.execute(text("ALTER TABLE cases ADD COLUMN tags JSON DEFAULT '[]'"))
                if "notes" not in col_names:
                    connection.execute(text("ALTER TABLE cases ADD COLUMN notes TEXT DEFAULT ''"))

            target_res = connection.execute(text("PRAGMA table_info(targets)")).fetchall()
            if target_res:
                t_cols = [row[1] for row in target_res]
                if "status" not in t_cols:
                    connection.execute(text("ALTER TABLE targets ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE'"))
                if "tags" not in t_cols:
                    connection.execute(text("ALTER TABLE targets ADD COLUMN tags JSON DEFAULT '[]'"))
        except Exception as e:
            # If not SQLite or table doesn't exist yet, create_all handles it
            pass


    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_run_migrations)
