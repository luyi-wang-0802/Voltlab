from __future__ import annotations
import sys
import pandas as pd


def unwrap(v):
    if v is None:
        return None
    if isinstance(v, (str, int, float, bool)):
        return v
    if hasattr(v, "wrappedValue"):
        return v.wrappedValue
    # quantities fallback
    for attr in ("AreaValue", "LengthValue", "VolumeValue", "CountValue"):
        if hasattr(v, attr):
            return getattr(v, attr)
    try:
        return float(v)
    except Exception:
        return str(v)


def extract_psets(obj) -> dict[str, dict]:
    """
    Hard parse:
    - IfcRelDefinesByProperties -> IfcPropertySet
    returns {PsetName: {PropName: value}}
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
                # other property types: stringify
                props[getattr(p, "Name", "UnknownProperty")] = str(p)

        if pset_name:
            psets[pset_name] = props

    return psets


def fusion_colname(pset_name: str, prop_name: str) -> str | None:
    """
    Map:
      Pset_Fusion_SpaceBooking + AllowedEventTypes -> SpaceBooking.AllowedEventTypes
    Only keep psets that start with 'Pset_Fusion_'.
    """
    prefix = "Pset_Fusion_"
    if not pset_name.startswith(prefix):
        return None
    group = pset_name[len(prefix):]  # SpaceBooking
    if not group:
        return None
    return f"{group}.{prop_name}"


def iter_spaces(model):
    # Cover IfcSpace; if you confirm it's all IfcSpace, you can keep only that here.
    for sp in model.by_type("IfcSpace"):
        gid = getattr(sp, "GlobalId", None)
        if gid:
            yield sp


def main(ifc_path: str, out_csv: str):
    import ifcopenshell

    model = ifcopenshell.open(ifc_path)

    rows = []
    all_fusion_cols = set()

    for sp in iter_spaces(model):
        gid = sp.GlobalId
        ifcroom_id = getattr(sp, "Name", None)  # ifc_name corresponds to the Name property

        psets = extract_psets(sp)

        # Debug: print all psets for first 3 spaces
        if len(rows) < 3:
            print(f"\n=== Space {len(rows)+1}: {gid} ===")
            print(f"Name: {getattr(sp, 'Name', None)}")
            print(f"LongName: {getattr(sp, 'LongName', None)}")
            print(f"PropertySets found: {list(psets.keys())}")
            for pname, props in psets.items():
                print(f"  {pname}:")
                for k, v in props.items():
                    print(f"    {k} = {v}")

        home_story = psets.get("ArchiCADProperties", {}).get("Home Story Name")

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

        rows.append(
            {
                "GlobalId": gid,
                "IfcRoomId": unwrap(ifcroom_id),
                "Story": unwrap(home_story),
                **fusion,
            }
        )

    fixed = ["GlobalId", "IfcRoomId", "Story"]
    fusion_cols = sorted(all_fusion_cols)
    cols = fixed + fusion_cols

    df = pd.DataFrame(rows)
    # 确保所有列存在；缺失 -> NaN（读入数据库时可视为 null）
    for c in cols:
        if c not in df.columns:
            df[c] = None
    df = df[cols].drop_duplicates(subset=["GlobalId"])

    df.to_csv(out_csv, index=False, encoding="utf-8")
    print(f"\nWrote {len(df)} rooms to {out_csv}")
    print(f"Fusion columns: {len(fusion_cols)}")
    print("Non-null counts (fixed):")
    print(df[fixed].notna().sum().to_string())


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/export_rooms_csv_fme_style.py <input.ifc> <output.csv>")
        raise SystemExit(2)
    main(sys.argv[1], sys.argv[2])
