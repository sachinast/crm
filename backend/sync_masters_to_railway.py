"""
Sync all 24 mst_* master tables and master_field_options from local Docker Postgres to Railway Postgres.
Excludes the 'users' table.

Usage:
  python sync_masters_to_railway.py "<RAILWAY_PUBLIC_URL>"
"""

import sys
import psycopg2

LOCAL_DSN = "postgresql://crm:crm@localhost:5433/crm"

# Default Railway DSN (override via CLI argument)
RAILWAY_DSN = sys.argv[1] if len(sys.argv) > 1 else "postgresql://postgres:pdXDLSWIKYzmHCgYlwznvWfMBfHpEdJg@postgres.railway.internal:5432/railway"

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


def get_columns(cur, table_name):
    cur.execute(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = %s ORDER BY ordinal_position",
        (table_name,),
    )
    return [row[0] for row in cur.fetchall()]


def sync_table(src_cur, dst_conn, dst_cur, table_name):
    src_cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = %s)",
        (table_name,),
    )
    if not src_cur.fetchone()[0]:
        print(f"  SKIP {table_name} -- not in local DB")
        return

    dst_cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = %s)",
        (table_name,),
    )
    if not dst_cur.fetchone()[0]:
        print(f"  SKIP {table_name} -- table does not exist on Railway")
        return

    columns = get_columns(src_cur, table_name)
    if not columns:
        print(f"  SKIP {table_name} -- no columns")
        return

    col_list = ", ".join(f'"{c}"' for c in columns)
    src_cur.execute(f'SELECT {col_list} FROM "{table_name}"')
    rows = src_cur.fetchall()

    if not rows:
        print(f"  SKIP {table_name} -- empty in local DB")
        return

    placeholders = ", ".join(["%s"] * len(columns))
    
    if table_name.startswith("mst_"):
        conflict_clause = 'ON CONFLICT ("value") DO NOTHING'
    elif table_name == "master_field_options":
        conflict_clause = 'ON CONFLICT ("field_key", "value") DO NOTHING'
    else:
        conflict_clause = "ON CONFLICT DO NOTHING"

    insert_sql = f'INSERT INTO "{table_name}" ({col_list}) VALUES ({placeholders}) {conflict_clause}'

    inserted = 0
    for row in rows:
        try:
            dst_cur.execute(insert_sql, row)
            inserted += 1
        except Exception as e:
            print(f"  WARN {table_name} -- {e}")
            dst_conn.rollback()
            return

    dst_conn.commit()
    print(f"  OK   {table_name} -- {inserted} rows processed")


def main():
    print(f"[1/3] Connecting to LOCAL database (localhost:5433)...")
    src_conn = psycopg2.connect(LOCAL_DSN)
    src_cur = src_conn.cursor()
    print("      Connected to local database.")

    print(f"[2/3] Connecting to RAILWAY database ({RAILWAY_DSN.split('@')[-1]})...")
    dst_conn = psycopg2.connect(RAILWAY_DSN)
    dst_cur = dst_conn.cursor()
    print("      Connected to Railway database.")

    print(f"\n[3/3] Syncing {len(MASTER_TABLES)} master tables (users excluded)...\n")
    for table in MASTER_TABLES:
        sync_table(src_cur, dst_conn, dst_cur, table)

    src_cur.close()
    src_conn.close()
    dst_cur.close()
    dst_conn.close()
    print("\nSUCCESS: All master tables synced to Railway (users excluded)!")


if __name__ == "__main__":
    main()
