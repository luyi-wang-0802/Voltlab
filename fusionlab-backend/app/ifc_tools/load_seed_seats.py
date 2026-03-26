from __future__ import annotations

import pandas as pd
import os
import sys
from pathlib import Path
from sqlalchemy import select, func

# Add parent directory to path for imports
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent.parent
sys.path.insert(0, str(backend_dir))

from app.database.db import SessionLocal
from app.data_models.models import Seat


def get_csv_path():
    """Get CSV file path for seats."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.join(current_dir, "..", "..")
    csv_path = os.path.join(project_root, "seats.csv")
    abs_path = os.path.abspath(csv_path)
    print(f"Looking for CSV file at: {abs_path}")
    return abs_path


def to_bool(v):
    """Convert value to boolean."""
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


def to_str(v):
    """Convert value to string."""
    if v is None or pd.isna(v):
        return None
    return str(v).strip()


def create_seat_from_row(row: dict) -> Seat:
    """Create Seat object from CSV row."""
    return Seat(
        global_id=to_str(row.get("GlobalId")),
        seat_id=to_str(row.get("SeatBooking.SeatID")),
        is_bookable=to_bool(row.get("SeatBooking.IsBookable")),
        is_in_ifc_space=to_str(row.get("SeatBooking.IsInIfcSpace")),
        power_outlet_available=to_bool(row.get("SeatBooking.PowerOutletAvailable")),
    )


def load_seats_from_csv(csv_path: str = None) -> bool:
    """Load seats from CSV file into database."""
    
    if csv_path is None:
        csv_path = get_csv_path()
    
    if not os.path.exists(csv_path):
        print(f"❌ CSV file not found: {csv_path}")
        return False
    
    print(f"📁 Reading CSV file: {csv_path}")
    
    try:
        # Read CSV
        df = pd.read_csv(csv_path)
        print(f"✅ Successfully read CSV with {len(df)} rows")
        print(f"📋 CSV columns: {list(df.columns)}")

        # Check required columns
        required_cols = {"GlobalId"}
        missing = required_cols - set(df.columns)
        if missing:
            print(f"❌ Missing required columns: {missing}")
            return False

        # Connect to database
        db = SessionLocal()
        
        try:
            # Check if seats already exist
            existing_count = db.scalar(select(func.count()).select_from(Seat))
            
            if existing_count > 0:
                print(f"⚠️ Database already has {existing_count} seats")
                response = input("Do you want to delete existing seats and reload? (yes/no): ")
                if response.lower() in ("yes", "y"):
                    db.query(Seat).delete()
                    db.commit()
                    print("✅ Deleted existing seats")
                else:
                    print("❌ Operation cancelled")
                    return False

            # Load seats
            seats_added = 0
            seats_skipped = 0
            
            for idx, row in df.iterrows():
                try:
                    seat = create_seat_from_row(row.to_dict())
                    
                    # Skip if GlobalId is missing
                    if not seat.global_id:
                        seats_skipped += 1
                        continue
                    
                    # Check if seat already exists
                    existing = db.scalar(
                        select(Seat).where(Seat.global_id == seat.global_id)
                    )
                    
                    if existing:
                        seats_skipped += 1
                        continue
                    
                    db.add(seat)
                    seats_added += 1
                    
                    # Commit in batches
                    if seats_added % 100 == 0:
                        db.commit()
                        print(f"  ... {seats_added} seats added")
                
                except Exception as e:
                    print(f"⚠️ Error processing row {idx}: {e}")
                    continue
            
            # Final commit
            db.commit()
            
            print(f"\n✅ Successfully loaded seats:")
            print(f"   - Added: {seats_added}")
            print(f"   - Skipped: {seats_skipped}")
            
            # Show statistics
            total_seats = db.scalar(select(func.count()).select_from(Seat))
            bookable_seats = db.scalar(
                select(func.count()).select_from(Seat).where(Seat.is_bookable == True)
            )
            seats_with_power = db.scalar(
                select(func.count()).select_from(Seat).where(Seat.power_outlet_available == True)
            )
            
            print(f"\n📊 Database statistics:")
            print(f"   - Total seats: {total_seats}")
            print(f"   - Bookable seats: {bookable_seats}")
            print(f"   - Seats with power outlets: {seats_with_power}")
            
            return True
            
        except Exception as e:
            db.rollback()
            print(f"❌ Database error: {e}")
            return False
        
        finally:
            db.close()
    
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return False


def main():
    """Main entry point."""
    success = load_seats_from_csv()
    if not success:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
