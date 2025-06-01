import os
import requests
import shutil
from dashboard_generator import generate_reports

# Configuración Supabase
SUPABASE_URL = "https://liomseivquhgogbnwron.supabase.co"
SUPABASE_BUCKET = "files"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb21zZWl2cXVoZ29nYm53cm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MzQzMzgsImV4cCI6MjA2NDMxMDMzOH0.PDOowFEDylMBdo3ZOUtl8bVaCP1Zf8TOsc7D8tKVj40"  # tu API key completa aquí
SUPABASE_FILE_NAME = "reporte_tarjetas_1748744878368.xlsx"  # nombre exacto que aparece en Supabase

# URL pública directa
DOWNLOAD_URL = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{SUPABASE_FILE_NAME}"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

def download_file(url, local_path="reporte_tarjetas.xlsx"):
    print("📥 Descargando archivo...")
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to download file: {response.text}")

    with open(local_path, "wb") as f:
        f.write(response.content)

    print(f"✅ Archivo descargado como {local_path}")

def generate_dashboard():
    print("🚀 Generando reportes...")
    generate_reports("reporte_tarjetas.xlsx")
    print("✅ Reportes generados.")

if __name__ == "__main__":
    try:
        download_file(DOWNLOAD_URL)
        generate_dashboard()
    except Exception as e:
        print(f"❌ Error: {e}")
