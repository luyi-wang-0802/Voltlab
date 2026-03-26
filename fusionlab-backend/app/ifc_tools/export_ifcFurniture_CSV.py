from __future__ import annotations
import sys
import pandas as pd


def unwrap(v):
    """Unwrap IFC values to Python primitives."""
    if v is None:
        return None
    if isinstance(v, (str, int, float, bool)):
        return v
    if hasattr(v, "wrappedValue"):
        return v.wrappedValue
    try:
        return float(v)
    except Exception:
        return str(v)


def extract_psets(obj) -> dict[str, dict]:
    """
    Extract property sets from IFC object.
    Returns {PsetName: {PropName: value}}
    """
    psets: dict[str, dict] = {}
    for rel in (getattr(obj, "IsDefinedBy", None) or []):
        if not rel or not rel.is_a("IfcRelDefinesByProperties"):
            continue
        pd_ = rel.RelatingPropertyDefinition
        if not pd_ or not pd_.is_a("IfcPropertySet"):
            continue

        pset_name = pd_.Name or ""
        props = {}

        for p in (pd_.HasProperties or []):
            if p.is_a("IfcPropertySingleValue"):
                props[p.Name] = unwrap(p.NominalValue)
            elif p.is_a("IfcPropertyEnumeratedValue"):
                vals = [unwrap(x) for x in (p.EnumerationValues or [])]
                props[p.Name] = None if not vals else ",".join(str(x) for x in vals if x is not None)
            else:
                props[getattr(p, "Name", "UnknownProperty")] = str(p)

        if pset_name:
            psets[pset_name] = props

    return psets


def fusion_colname(pset_name: str, prop_name: str) -> str | None:
    """
    Map Pset_Fusion_* properties to column names.
    Example: Pset_Fusion_SeatBooking + IsBookable -> SeatBooking.IsBookable
    """
    prefix = "Pset_Fusion_"
    if not pset_name.startswith(prefix):
        return None
    group = pset_name[len(prefix):]
    if not group:
        return None
    return f"{group}.{prop_name}"


def iter_furniture(model):
    """Iterate over all IfcFurniture objects in the model."""
    for furniture in model.by_type("IfcFurniture"):
        gid = getattr(furniture, "GlobalId", None)
        if gid:
            yield furniture


def main(ifc_path: str, out_csv: str):
    """Export IfcFurniture with Pset_Fusion_SeatBooking to CSV."""
    import ifcopenshell

    model = ifcopenshell.open(ifc_path)

    rows = []
    all_fusion_cols = set()

    for furniture in iter_furniture(model):
        gid = furniture.GlobalId

        psets = extract_psets(furniture)

        # Extract Fusion properties
        fusion = {}
        for pset_name, props in psets.items():
            if not pset_name.startswith("Pset_Fusion_"):
                continue
            for prop_name, val in props.items():
                col = fusion_colname(pset_name, prop_name)
                if col is None:
                    continue
                fusion[col] = unwrap(val)
                all_fusion_cols.add(col)

        # Only include furniture with SeatBooking properties
        if any(col.startswith("SeatBooking.") for col in fusion.keys()):
            rows.append(
                {
                    "GlobalId": gid,
                    **fusion,
                }
            )

    if not rows:
        print("⚠️ No furniture with Pset_Fusion_SeatBooking found")
        # Still create empty CSV with expected columns
        expected_cols = [
            "GlobalId",
            "SeatBooking.SeatID",
            "SeatBooking.IsBookable",
            "SeatBooking.IsInIfcSpace",
            "SeatBooking.PowerOutletAvailable",
        ]
        df = pd.DataFrame(columns=expected_cols)
    else:
        fixed = ["GlobalId"]
        fusion_cols = sorted(all_fusion_cols)
        cols = fixed + fusion_cols

        df = pd.DataFrame(rows)
        # Ensure all cols exist
        for c in cols:
            if c not in df.columns:
                df[c] = None
        df = df[cols].drop_duplicates(subset=["GlobalId"])

    df.to_csv(out_csv, index=False, encoding="utf-8")
    print(f"✅ Wrote {len(df)} seats to {out_csv}")
    if rows:
        print(f"📋 Fusion columns: {len(fusion_cols)}")
        print("Non-null counts:")
        print(df.notna().sum().to_string()) 


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python export_ifcFurniture_CSV.py <input.ifc> <output.csv>")
        raise SystemExit(2)
    main(sys.argv[1], sys.argv[2])
