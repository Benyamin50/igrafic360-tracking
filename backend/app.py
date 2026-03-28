# -*- coding: utf-8 -*-
from flask import Flask, jsonify, request, after_this_request
from flask_cors import CORS
import gzip
from io import BytesIO
import os
from dotenv import load_dotenv

# CARGAR VARIABLES DE ENTORNO
load_dotenv()

# IMPORTAR CONFIGURACION DE BASE DE DATOS
from db_config import get_db_connection

# IMPORTAR BLUEPRINTS
from routes.tasas import tasas_bp
from routes.auth import auth_bp
from routes.tracking import tracking_bp
from routes.pagos import pagos_bp
from routes.middleware import rate_limit_middleware

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# CONFIGURACION CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "https://igrafic360.net", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-User-UID", "Authorization", "Cache-Control"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

# ============================================
# MANEJAR OPTIONS ANTES DEL RATE LIMITING
# ============================================
@app.before_request
def handle_preflight():
    """Manejar peticiones OPTIONS antes de cualquier otra cosa"""
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers.add("Access-Control-Allow-Origin", request.headers.get("Origin", "*"))
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, X-User-UID, Authorization, Cache-Control")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        response.headers.add("Access-Control-Max-Age", "3600")
        return response

# ============================================
# RATE LIMITING (Solo para POST/GET, no OPTIONS)
# ============================================
@app.before_request
def before_request():
    """Limitar peticiones por IP (excepto OPTIONS y rutas importantes)"""
    
    if request.method == "OPTIONS":
        return None
    
    rutas_excluidas = [
        '/api/test',
        '/health',
        '/api/auth/login',
        '/api/auth/registro',
        '/api/enviar-codigo-email',
        '/api/verificar-codigo-email',
        '/api/auth/olvido-password',
        '/api/auth/reset-password',  # 👈 AGREGAR
        '/api/auth/me'               # 👈 AGREGAR
    ]
    
    for ruta in rutas_excluidas:
        if request.path.startswith(ruta):
            return None
    
    return rate_limit_middleware()

# ============================================
# COMPRESION GZIP
# ============================================
@app.after_request
def compress_response(response):
    """Comprime respuestas grandes con GZIP"""
    if request.method == "OPTIONS":
        return response
    
    if response.status_code != 200:
        return response
    
    content_type = response.headers.get('Content-Type', '')
    if any(x in content_type for x in ['image/', 'video/', 'audio/', 'application/zip', 'application/pdf']):
        return response
    
    response_data = response.get_data()
    
    if len(response_data) > 1024:
        gzip_buffer = BytesIO()
        with gzip.GzipFile(mode='wb', fileobj=gzip_buffer, compresslevel=6) as gzip_file:
            gzip_file.write(response_data)
        
        compressed_data = gzip_buffer.getvalue()
        
        if len(compressed_data) < len(response_data):
            response.set_data(compressed_data)
            response.headers['Content-Encoding'] = 'gzip'
            response.headers['Content-Length'] = len(compressed_data)
            response.headers['Vary'] = 'Accept-Encoding'
    
    return response

# ============================================
# FUNCION PARA VERIFICAR CONEXION A MySQL
# ============================================
def check_db_connection():
    """Verifica que la conexion a MySQL funcione"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        _ = cursor.fetchone()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error de conexion a MySQL: {e}")
        return False

# REGISTRAR RUTAS
app.register_blueprint(tasas_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(tracking_bp)
app.register_blueprint(pagos_bp)

@app.route('/')
def home():
    db_status = "OK" if check_db_connection() else "ERROR"
    return jsonify({"status": "iGrafic360 modular activo", "mysql": db_status})

@app.route('/health')
def health():
    """Endpoint para verificar estado del servidor"""
    return jsonify({
        "status": "healthy",
        "mysql": "connected" if check_db_connection() else "disconnected",
        "timestamp": __import__('datetime').datetime.now().isoformat()
    })

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"Servidor iGrafic360 iniciando en puerto {port}")
    print(f"Modo debug: {debug}")
    print(f"Email configurado: {'Si' if os.environ.get('EMAIL_PASSWORD') else 'No'}")
    
    if check_db_connection():
        print("Conexion a MySQL establecida")
    else:
        print("ADVERTENCIA: No se pudo conectar a MySQL")
    
    app.run(host='0.0.0.0', port=port, debug=debug)