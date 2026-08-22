"""
Dump all 24 mst_* master tables and master_field_options from local Docker Postgres
into a clean standalone SQL migration script (masters_dump.sql).
Excludes the 'users' table.
"""

import psycopg2

LOCAL_DSN = "postgresql://crm:crm@localhost:5433/crm"

MASTER_TABLES = [
    "mst_booking_platform",
    "mst_leads_booking_source",
    "mst_title",
    "mst_lead_tag",
    "mst_insurance_coverage",
    "mst_hk_gk",
    "mst_transmission",
    "mst_car_provider",
    "mst_call_type",
    "mst_room_type",
    "mst_mco_charges",
    "mst_add_on_services",
    "mst_cabin_class",
    "mst_main_category",
    "mst_booking_status",
    "mst_vehicle_type",
    "mst_flight_ancillaries",
    "mst_hotel_name",
    "mst_class_of_service",
    "mst_transaction_type",
    "mst_booking_source",
    "mst_airline",
    "mst_priority",
    "mst_currency",
    "master_field_options",
]

def format_val(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, (int, float)):
        return str(val)
    # String / UUID / datetime
    s = str(val).replace("'", "''")
    return f"'{s}'"

def dump():
    conn = psycopg2.connect(LOCAL_DSN)
    cur = conn.cursor()
    
    sql_statements = [
        "-- Master Tables Data Dump from Local Database (Excludes users)",
        "-- Safe to execute on Railway PostgreSQL",
        "BEGIN;\n"
    ]
    
    total_records = 0
    
    for tbl in MASTER_TABLES:
        cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = %s)", (tbl,))
        if not cur.fetchone()[0]:
            continue
            
        cur.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_name = %s ORDER BY ordinal_position",
            (tbl,)
        )
        columns = [r[0] for r in cur.fetchall()]
        if not columns:
            continue
            
        col_clause = ", ".join(f'"{c}"' for c in columns)
        cur.execute(f'SELECT {col_clause} FROM "{tbl}"')
        rows = cur.fetchall()
        
        if not rows:
            continue
            
        sql_statements.append(f"-- Table: {tbl} ({len(rows)} records)")
        for row in rows:
            val_clause = ", ".join(format_val(v) for v in row)
            if tbl.startswith("mst_"):
                sql_statements.append(
                    f'INSERT INTO "{tbl}" ({col_clause}) VALUES ({val_clause}) ON CONFLICT (value) DO NOTHING;'
                )
            elif tbl == "master_field_options":
                sql_statements.append(
                    f'INSERT INTO "{tbl}" ({col_clause}) VALUES ({val_clause}) ON CONFLICT (field_key, value) DO NOTHING;'
                )
            else:
                sql_statements.append(
                    f'INSERT INTO "{tbl}" ({col_clause}) VALUES ({val_clause}) ON CONFLICT DO NOTHING;'
                )
        sql_statements.append("")
        total_records += len(rows)
        print(f"Exported {len(rows)} rows from {tbl}")
        
    sql_statements.append("COMMIT;")
    
    output_path = "masters_dump.sql"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))
        
    print(f"\nGenerated {output_path} with {total_records} master records (excluding users).")
    cur.close()
    conn.close()

if __name__ == "__main__":
    dump()
