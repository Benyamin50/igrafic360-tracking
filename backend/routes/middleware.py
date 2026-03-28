# routes/middleware.py
from collections import defaultdict
import time
from flask import request, jsonify

# Almacenamiento de peticiones por IP
rate_limit_store = defaultdict(list)
RATE_LIMIT_MAX = 100
RATE_LIMIT_WINDOW = 60

def rate_limit_middleware():
    """Middleware para limitar peticiones por IP"""
    try:
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        now = time.time()
        
        # Limpiar peticiones antiguas
        rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
        
        if len(rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
            return jsonify({'error': 'Demasiadas peticiones. Espera un momento.'}), 429
        
        rate_limit_store[client_ip].append(now)
        return None
    except Exception as e:
        print(f"Error en rate_limit_middleware: {e}")
        return None  # No bloquear si hay error