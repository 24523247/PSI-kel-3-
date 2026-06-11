"""
====================================================
FLASK SERVER - APLIKASI REKOMENDASI KESEHATAN
====================================================

Server Backend untuk menangani Gemini API
API Key tidak perlu dimasukkan di frontend
====================================================
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
import mimetypes

# ============ KONFIGURASI ============
app = Flask(__name__)
CORS(app)

# 1. GANTI dengan API Key asli Anda yang berawalan AIzaSy
API_KEY = "AQ.Ab8RN6KTFlQdyhGJYSL4Dqkad3nEQJQx9dgvHRPDvhuwGibH0g" 

# 2. PERBARUI model menjadi gemini-1.5-flash atau gemini-2.5-flash
MODEL_NAME = "gemini-1.5-flash"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"

print("✅ Koneksi ke Gemini API siap!")

# ============ FUNGSI HELPER ============

def get_recommendation(name: str, age: int, condition: str) -> dict:
    """Dapatkan rekomendasi dari Gemini atau fallback ke database default"""
    
    # Fallback recommendations - selalu tersedia
    fallback_recommendations = {
        "normal": """
## REKOMENDASI UNTUK KESEHATAN NORMAL

Untuk {name} usia {age} tahun, dengan kondisi kesehatan normal:

###  MENU YANG DISARANKAN:
1. **Nasi Merah + Ayam Panggang** - Karbohidrat kompleks + protein berkualitas tinggi
2. **Salmon Baked + Sayuran** - Omega-3 untuk kesehatan jantung dan otak
3. **Salad Sayuran Hijau + Telur Rebus** - Vitamin, mineral, dan protein seimbang
4. **Smoothie Buah Berries** - Antioksidan dan vitamin untuk daya tahan tubuh

### 💡 TIPS KESEHATAN:
- Makan 3 kali sehari dengan porsi seimbang
- Konsumsi air putih 8 gelas per hari
- Tambahkan olahraga ringan 30 menit setiap hari
- Hindari makanan berminyak berlebihan

###  PANTANGAN:
- Makanan cepat saji berlebihan
- Minuman manis dan beralkohol
- Gorengan berlebihan
""",
        "diet": """
##  REKOMENDASI UNTUK PROGRAM DIET

Untuk {name} usia {age} tahun, dengan program diet penurunan berat badan:

### 🍽️ MENU YANG DISARANKAN:
1. **Salad Sayuran Hijau + Daging Tanpa Lemak** - Rendah kalori, tinggi protein
2. **Ikan Putih Panggang + Broccoli** - Tinggi protein, lemak sehat
3. **Sayur Bening + Tofu** - Fiber tinggi, rendah kalori
4. **Buah Segar (Apel, Jeruk, Papaya)** - Sumber vitamin, rendah kalori

### 💡 TIPS KESEHATAN:
- Kalori harian: 1800-2000 kkal
- Makan pagi penting untuk metabolisme
- Snack sehat: Buah atau yogurt rendah lemak
- Hindari makan malam berlebihan
- Minum air hangat sebelum makan

### 🚫 PANTANGAN:
- Makanan berlemak tinggi (gorengan, mentega)
- Karbohidrat sederhana (nasi putih, gula)
- Minuman bersoda dan manis
- Junk food dan snack berkalori tinggi
""",
        "diabetes": """
## ✨ REKOMENDASI UNTUK PENAMBAH BERAT BADAN

Untuk {name} usia {age} tahun, dengan program penambah berat badan sehat:

### 🍽️ MENU YANG DISARANKAN:
1. **Nasi + Daging Berkuah** - Kalori tinggi, nutrisi seimbang
2. **Kacang-kacangan + Minyak Zaitun** - Protein dan kalori tinggi
3. **Susu Penuh Lemak + Telur** - Kalsium dan kalori untuk penambah berat
4. **Avokado + Roti Gandum** - Lemak sehat, kalori tinggi

### 💡 TIPS KESEHATAN:
- Makan 4-5 kali sehari dengan porsi lebih besar
- Tambahkan camilan berkalori: Kacang, cokelat, susu
- Kalori harian: 2500-3000 kkal
- Olahraga beban untuk membangun otot
- Istirahat cukup (8 jam) untuk recovery

### 🚫 PANTANGAN:
- Makanan tanpa nutrisi (junk food murni)
- Minuman diet atau rendah kalori
- Olahraga berlebihan tanpa nutrisi cukup
""",
        "hipertensi": """
## REKOMENDASI UNTUK HIPERTENSI (TEKANAN DARAH TINGGI)

Untuk {name} usia {age} tahun, dengan kondisi hipertensi:

### 🍽️ MENU YANG DISARANKAN:
1. **Sayuran Hijau + Ikan Putih** - Rendah garam, tinggi kalium
2. **Oatmeal + Buah Berries** - Serat untuk kesehatan jantung
3. **Sup Sayuran Tanpa MSG** - Nutrisi lengkap, rendah natrium
4. **Susu Rendah Lemak + Pisang** - Kalium tinggi, rendah garam

### 💡 TIPS KESEHATAN:
- Batasi garam: Maksimal 2000mg per hari (1 sendok teh)
- Hindari MSG dan bumbu penyedap
- Makan kalium tinggi: Pisang, kentang, bayam
- Olahraga ringan 30 menit setiap hari
- Kelola stres dan istirahat cukup
- Hindari kafein berlebihan

### 🚫 PANTANGAN:
- Garam berlebihan dan makanan asin (ikan asin, acar, sosis)
- MSG dan bumbu penyedap
- Minuman beralkohol
- Kopi terlalu banyak
- Makanan berlemak tinggi (gorengan)
"""
    }
    
    # Format template dengan nama dan usia
    fallback_text = fallback_recommendations.get(condition, fallback_recommendations["normal"])
    formatted_fallback = fallback_text.format(name=name, age=age)
    
    # Coba koneksi ke API Gemini (optional - fallback selalu ada)
    try:
        prompt = f"""
Berikan rekomendasi menu makanan yang dipersonalisasi untuk {name} berusia {age} tahun dengan kondisi: {condition}.

Berikan dalam format:
## REKOMENDASI UNTUK [KONDISI]
[Deskripsi singkat]

### MENU YANG DISARANKAN:
[Maksimal 4 menu dengan penjelasan]

### TIPS KESEHATAN:
[Tips praktis]

### PANTANGAN:
[Makanan yang harus dihindari]
"""
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }
        
        # Coba request ke Gemini API
        response = requests.post(
            f"{GEMINI_API_URL}?key={API_KEY}",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if "candidates" in data and len(data["candidates"]) > 0:
                recommendation_text = data["candidates"][0]["content"]["parts"][0]["text"]
                return {
                    "success": True,
                    "recommendation": recommendation_text,
                    "name": name,
                    "age": age,
                    "condition": condition,
                    "source": "Gemini AI"
                }
    except Exception as e:
        print(f"⚠️  Gemini API failed: {str(e)}")
    
    # Fallback ke database lokal jika API gagal
    return {
        "success": True,
        "recommendation": formatted_fallback,
        "name": name,
        "age": age,
        "condition": condition,
        "source": "Database Lokal (Mode Offline)"
    }

# ============ ROUTES ============

@app.route('/')
def index():
    """Serve index.html"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_files(filename):
    """Serve static files"""
    # Ensure proper MIME types for JavaScript
    if filename.endswith('.js'):
        response = send_from_directory('.', filename)
        response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
        return response
    elif filename.endswith('.html'):
        response = send_from_directory('.', filename)
        response.headers['Content-Type'] = 'text/html; charset=utf-8'
        return response
    else:
        return send_from_directory('.', filename)

@app.route('/api/recommendation', methods=['POST'])
def get_api_recommendation():
    """API endpoint untuk mendapatkan rekomendasi"""
    try:
        data = request.json
        
        # Validasi input
        if not data.get('nama') or not data.get('kondisi'):
            return jsonify({
                "success": False,
                "error": "Data tidak lengkap"
            }), 400
        
        name = data.get('nama', 'Pengguna')
        age = data.get('umur', 25)
        condition = data.get('kondisi', 'normal')
        
        # Dapatkan rekomendasi
        result = get_recommendation(name, age, condition)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "message": "Server is running"
    })

# ============ ERROR HANDLERS ============

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# ============ MAIN ============

if __name__ == '__main__':
    print("\n" + "="*60)
    print("  🍽️  APLIKASI REKOMENDASI MENU KESEHATAN - LIVE SERVER")
    print("="*60)
    print("\n✅ Server dimulai di: http://localhost:5000")
    print("✅ Tekan Ctrl+C untuk menghentikan server\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
