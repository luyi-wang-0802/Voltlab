"""
Database initialization on startup
"""
from pathlib import Path
from sqlalchemy import inspect

from app.database.db import engine, Base
from app.data_models.models import Room, Seat, Session, RoomBooking, UserLike, SeatBooking


def init_database():
    """Initialize the database: Create tables and load initial data."""
    
    # 1. Create all tables (if they do not exist)）
    print("=" * 60)
    print("Initializing database...")
    
    # Check if the table already exists
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if existing_tables:
        print(f"✓ Database already exists with tables: {existing_tables}")
    else:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tables created successfully")
    
    # 2. Verify that all required tables exist.
    required_tables = ['sessions', 'rooms', 'room_bookings', 'user_likes', 'seats', 'seat_bookings']
    missing_tables = [t for t in required_tables if t not in existing_tables]
    
    if missing_tables:
        print(f"Creating missing tables: {missing_tables}")
        Base.metadata.create_all(bind=engine)
        print("✓ Missing tables created")
    
    # 3. Load initial data (using existing load scripts)
    print("=" * 60)
    load_initial_data()
    print("=" * 60)


def load_initial_data():
    """加载 CSV 数据 - 调用现有的加载脚本"""
    from sqlalchemy.orm import Session as DBSession
    
    with DBSession(engine) as db:
        # Check if data already exists
        existing_rooms = db.query(Room).count()
        existing_seats = db.query(Seat).count()
        
        print(f"Current data: {existing_rooms} rooms, {existing_seats} seats")
        
        # Loading Rooms
        if existing_rooms > 0:
            print(f"✓ Rooms already loaded ({existing_rooms} rooms) - skipping import")
        else:
            print("Loading rooms from CSV...")
            try:
                from app.ifc_tools.load_seed_rooms import load_rooms_from_csv
                
                # Get CSV Path
                project_root = Path(__file__).parent.parent.parent
                csv_path = str(project_root / "data" / "spaces.csv")
                
                # If it's not in the data directory, try the root directory.
                if not Path(csv_path).exists():
                    csv_path = str(project_root / "spaces.csv")
                
                if not Path(csv_path).exists():
                    print(f"⚠ Warning: CSV file not found at {csv_path}")
                else:
                    success = load_rooms_from_csv(csv_path)
                    if success:
                        db.expire_all()  # 刷新查询
                        final_count = db.query(Room).count()
                        print(f"✓ Successfully loaded {final_count} rooms")
                    else:
                        print("⚠ Failed to load rooms")
            except Exception as e:
                print(f"❌ Error loading rooms: {e}")
                import traceback
                traceback.print_exc()
        
        # Loading Seats
        if existing_seats > 0:
            print(f"✓ Seats already loaded ({existing_seats} seats) - skipping import")
        else:
            print("Loading seats from CSV...")
            try:
                from app.ifc_tools.load_seed_seats import load_seats_from_csv
                
                # Get CSV Path
                project_root = Path(__file__).parent.parent.parent
                csv_path = str(project_root / "data" / "seats.csv")
                
                # If it's not in the data directory, try the root directory.
                if not Path(csv_path).exists():
                    csv_path = str(project_root / "seats.csv")
                
                if not Path(csv_path).exists():
                    print(f"⚠ Warning: CSV file not found at {csv_path}")
                else:
                    success = load_seats_from_csv(csv_path)
                    if success:
                        db.expire_all()  # 刷新查询
                        final_count = db.query(Seat).count()
                        print(f"✓ Successfully loaded {final_count} seats")
                    else:
                        print("⚠ Failed to load seats")
            except Exception as e:
                print(f"❌ Error loading seats: {e}")
                import traceback
                traceback.print_exc()


def reset_database():
    """
    Reset Database (Optional) - Delete all tables and recreate them
    Warning: This will delete all data!
    """
    print("=" * 60)
    print("⚠ WARNING: Resetting database - all data will be lost!")
    print("=" * 60)
    
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    print("✓ All tables dropped")
    
    # Recreate
    Base.metadata.create_all(bind=engine)
    print("✓ Tables recreated")
    
    # Loading data
    load_initial_data()
    print("=" * 60)
    print("✓ Database reset complete")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--reset":
        # python -m app.database.init_db --reset
        reset_database()
    else:
        # python -m app.database.init_db
        init_database()