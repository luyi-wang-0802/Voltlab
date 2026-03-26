from logging.config import fileConfig
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from alembic import context
from sqlalchemy import create_engine, pool

# Forcefully add the project root directory to sys.path to prevent importing into the wrong app package
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

load_dotenv()

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

db_url = os.getenv("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

from app.database.db import Base
import app.data_models.models as models  # noqa: F401

target_metadata = Base.metadata

print("ALEMBIC sqlalchemy.url =", config.get_main_option("sqlalchemy.url"))
print("ALEMBIC app.models file =", getattr(models, "__file__", None))
print("ALEMBIC metadata tables =", list(target_metadata.tables.keys()))


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = config.get_main_option("sqlalchemy.url")

    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    engine = create_engine(
        url,
        connect_args=connect_args,
        poolclass=pool.NullPool,
        pool_pre_ping=True,
    )

    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
