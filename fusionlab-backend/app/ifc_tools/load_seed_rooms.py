from __future__ import annotations

import pandas as pd
import os
from sqlalchemy import select, func

from app.database.db import SessionLocal
from app.data_models.models import Room


def get_csv_path():
    """Retrieve the CSV file path"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.join(current_dir, "..", "..")
    csv_path = os.path.join(project_root, "data", "spaces.csv")
    abs_path = os.path.abspath(csv_path)
    print(f"Looking for CSV file at: {abs_path}")
    return abs_path


def to_bool(v):
    """Convert to Boolean value"""
    if v is None or pd.isna(v):
        return None
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    if s in ("1", "true", "yes", "y"):
        return True
    if s in ("0", "false", "no", "n"):
        return False
    return None


def to_int(v):
    """Convert to integer"""
    if v is None or pd.isna(v):
        return None
    try:
        return int(float(v))
    except Exception:
        return None


def to_float(v):
    """Convert to floating-point number"""
    if v is None or pd.isna(v):
        return None
    try:
        return float(v)
    except Exception:
        return None


def to_str(v):
    """Convert to string"""
    if v is None or pd.isna(v):
        return None
    return str(v).strip()


def create_room_from_row(row: dict) -> Room:
    """Create Room objects from CSV rows"""
    return Room(
        global_id=to_str(row.get("GlobalId")),
        ifcroom_id=to_str(row.get("IfcRoomId")),
        floor=to_str(row.get("Story")),  # Change to read from the Story column
        spacebooking_allowed_event_types=to_str(row.get("SpaceBooking.AllowedEventTypes")),
        spacebooking_bookable_by_role=to_str(row.get("SpaceBooking.BookableByRole")),
        spacebooking_existing_equipment=to_str(row.get("SpaceBooking.ExistingEquipment")),
        spacebooking_is_bookable=to_bool(row.get("SpaceBooking.IsBookable")),
        spacebooking_is_enclosed_space=to_bool(row.get("SpaceBooking.IsEnclosedSpace")),
        spacebooking_max_occupancy=to_int(row.get("SpaceBooking.MaxOccupancy")),
        spacebooking_noise_sensitivity=to_str(row.get("SpaceBooking.NoiseSensitivity")),
    )


def load_rooms_from_csv(csv_path: str = None) -> bool:
    """Load room data from CSV file"""
    
    if csv_path is None:
        csv_path = get_csv_path()
    
    if not os.path.exists(csv_path):
        print(f"❌ CSV file not found: {csv_path}")
        return False
    
    print(f"📁 Reading CSV file: {csv_path}")
    
    try:
        df = pd.read_csv(csv_path)
        print(f"✅ Successfully read CSV with {len(df)} rows")
        print(f"📋 CSV columns: {list(df.columns)}")

        required_cols = {"GlobalId"}
        missing = required_cols - set(df.columns)
        if missing:
            print(f"❌ Missing required columns: {missing}")
            return False

        with SessionLocal() as db:

            existing_count = db.scalar(select(func.count(Room.id))) or 0
            print(f"📊 Current rooms in database: {existing_count}")

            if existing_count > 0:
                print(f"⚠️  Database already contains {existing_count} rooms. Skipping import.")
                return True

        
            rooms_to_add = []
            processed_count = 0
            
            for index, row in df.iterrows():
                try:
                    global_id = to_str(row.get("GlobalId"))
                    if not global_id:
                        print(f"⚠️  Skipping row {index}: missing GlobalId")
                        continue
                    
                    room = create_room_from_row(row.to_dict())
                    rooms_to_add.append(room)
                    processed_count += 1
                    
                    if processed_count % 10 == 0:
                        print(f"📝 Processed {processed_count} rows...")
                        
                except Exception as e:
                    print(f"❌ Error processing row {index}: {e}")
                    continue

            if rooms_to_add:
                print(f"💾 Adding {len(rooms_to_add)} rooms to database...")
                db.add_all(rooms_to_add)
                db.commit()
                
                # Verification results
                final_count = db.scalar(select(func.count(Room.id))) or 0
                print(f"🎉 Successfully imported {len(rooms_to_add)} rooms!")
                print(f"📊 Total rooms in database: {final_count}")
                return True
            else:
                print("❌ No valid rooms to import")
                return False
                
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Entry function for standalone runtime"""
    print("🚀 Starting CSV import...")
    success = load_rooms_from_csv()
    if success:
        print("✅ CSV import completed successfully!")
    else:
        print("❌ CSV import failed!")


if __name__ == "__main__":
    main()
