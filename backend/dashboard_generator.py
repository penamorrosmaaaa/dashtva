import os
import requests
import shutil
from dashboard_generator import generate_reports

SUPABASE_URL = "https://liomseivquhgogbnwron.supabase.co"
SUPABASE_BUCKET = "files"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # Usa tu clave completa real

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}


def get_latest_file_name():
    url = f"{SUPABASE_URL}/storage/v1/object/list/{SUPABASE_BUCKET}"
    response = requests.get(url, headers=HEADERS)

    if response.status_code != 200:
        raise Exception(f"Failed to fetch file list: {response.text}")

    files = response.json()
    if not files:
        raise Exception("No files found in bucket.")

    # Ordena por fecha de creación
    files.sort(key=lambda x: x["created_at"], reverse=True)
    return files[0]["name"]


def download_file(file_name, local_path="reporte_tarjetas.xlsx"):
    file_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{file_name}"
    response = requests.get(file_url)

    if response.status_code != 200:
        raise Exception(f"Failed to download file: {response.text}")

    with open(local_path, "wb") as f:
        f.write(response.content)

    print(f"✅ Archivo descargado: {file_name}")


def generate_dashboard():
    print("🚀 Generando reportes...")
    generate_reports("reporte_tarjetas.xlsx")
    print("✅ Reportes generados.")


if __name__ == "__main__":
    try:
        latest_file = get_latest_file_name()
        download_file(latest_file)
        generate_dashboard()
    except Exception as e:
        print(f"❌ Error: {e}")
