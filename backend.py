from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import requests
import io
import os
import math

app = Flask(__name__)

# Configure CORS to allow requests from frontend
CORS(app, resources={
    r"/api/*": {"origins": "http://localhost:3000"},
    r"/summary": {"origins": "http://localhost:3000"},
    r"/analyze": {"origins": "http://localhost:3000"}
})

CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzIonikYeUwzVTUUO7bDLQ1DDzqzKB-BFIJ4tzJMqMlNFnxPF0eVRypNmykYVP0Pn-w1tfnOCTaKaP/pub?output=csv"
OPENAI_KEY = os.getenv("OPENAI_API_KEY")

OUTLETS = [
    'Heraldo', 'Televisa', 'Milenio', 'Universal', 'As', 'Infobae',
    'NyTimes', 'Terra', 'Azteca 7', 'Azteca UNO', 'ADN40', 'Deportes',
    'A+', 'Noticias', 'Quintana Roo', 'Bajío', 'Ciudad Juárez', 'Yúcatan',
    'Jalisco', 'Puebla', 'Veracruz', 'Baja California', 'Morelos', 'Guerrero',
    'Chiapas', 'Sinaloa', 'Aguascalientes', 'Queretaro', 'Chihuahua', 'Laguna',
    'img.Azteca7', 'img.AztecaUNO', 'img.AztecaNoticias'
]
METRICS = ["Score", "CLS", "LCP", "SI", "TBT", "FCP"]

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

def safe_float(value):
    try:
        return float(value) if not pd.isna(value) and value != '' else None
    except (ValueError, TypeError):
        return None

@app.route("/summary", methods=["GET", "OPTIONS"])
def summary():
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
        
    try:
        response = requests.get(CSV_URL)
        response.raise_for_status()
        df = pd.read_csv(io.StringIO(response.text))
        
        results = {}
        
        for outlet in OUTLETS:
            outlet_cols = [col for col in df.columns if col.strip() == outlet]
            
            for col in outlet_cols:
                idx = df.columns.get_loc(col)
                date_col = df.columns[idx - 2]
                type_col = df.columns[idx - 1]
                metric_cols = df.columns[idx+1:idx+7]
                
                for _, row in df.iterrows():
                    date = row[date_col]
                    if pd.isna(date) or str(date).strip() == '':
                        continue
                    
                    date = str(date).strip()
                    outlet_data = {
                        "Outlet": outlet,
                        "Type": str(row[type_col]).strip() if not pd.isna(row[type_col]) else "N/A",
                        "URL": str(row[col]).strip() if not pd.isna(row[col]) else "N/A",
                        "Score": safe_float(row[metric_cols[0]]),
                        "CLS": safe_float(row[metric_cols[1]]),
                        "LCP": safe_float(row[metric_cols[2]]),
                        "SI": safe_float(row[metric_cols[3]]),
                        "TBT": safe_float(row[metric_cols[4]]),
                        "FCP": safe_float(row[metric_cols[5]]),
                    }
                    
                    if date not in results:
                        results[date] = []
                    results[date].append(outlet_data)
        
        def clean_data(data):
            if isinstance(data, dict):
                return {k: clean_data(v) for k, v in data.items()}
            elif isinstance(data, list):
                return [clean_data(item) for item in data]
            elif data is None or (isinstance(data, float) and math.isnan(data)):
                return None
            return data
        
        cleaned_results = clean_data(results)
        return _corsify_actual_response(jsonify(cleaned_results))
        
    except Exception as e:
        return _corsify_actual_response(jsonify({"error": f"Server error: {str(e)}"}), 500)

@app.route("/analyze", methods=["POST", "OPTIONS"])
def analyze():
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
        
    try:
        if not request.is_json:
            return _corsify_actual_response(jsonify({"error": "Missing JSON in request"}), 400)

        data = request.get_json()
        date = data.get("date")
        question = data.get("question")

        if not date or not question:
            return _corsify_actual_response(jsonify({"error": "Missing date or question"}), 400)

        # Reuse summary logic
        summary_response = summary()
        if summary_response.status_code != 200:
            return summary_response
            
        summary_data = summary_response.get_json()
        if date not in summary_data:
            return _corsify_actual_response(jsonify({"error": f"No data for date {date}"}), 404)
            
        filtered = summary_data[date]
        
        block = "\n\n".join(
            f"📊 {entry['Outlet']} ({entry['Type']})\n"
            f"🔗 {entry['URL']}\n"
            f"Score: {entry.get('Score', 'N/A')}, "
            f"CLS: {entry.get('CLS', 'N/A')}, "
            f"LCP: {entry.get('LCP', 'N/A')}, "
            f"SI: {entry.get('SI', 'N/A')}, "
            f"TBT: {entry.get('TBT', 'N/A')}, "
            f"FCP: {entry.get('FCP', 'N/A')}"
            for entry in filtered
        )

        prompt = f"""/* Your prompt here */"""
        
        # OpenAI API call here
        
        return _corsify_actual_response(jsonify({"answer": content}))
        
    except Exception as e:
        return _corsify_actual_response(jsonify({"error": f"Server error: {str(e)}"}), 500)

def _build_cors_preflight_response():
    response = jsonify({"success": True})
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response

def _corsify_actual_response(response):
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:3000")
    return response

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)