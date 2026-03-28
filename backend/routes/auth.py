# -*- coding: utf-8 -*-
from flask import Blueprint, jsonify, request, make_response
from db_config import get_db_connection
from datetime import datetime, timedelta
import random
import smtplib
import os
import json
import bcrypt
from email.mime.text import MIMEText
import hashlib

auth_bp = Blueprint('auth', __name__)

# ============================================
# CONFIGURACION
# ============================================

ADMIN_EMAILS = os.environ.get('ADMIN_EMAILS', 'locasio918@gmail.com').split(',')
REMITENTE_EMAIL = os.environ.get('EMAIL_USER', 'locasio918@gmail.com')
REMITENTE_PASSWORD = os.environ.get('EMAIL_PASSWORD', '')

def generar_codigo_cliente():
    return 'MOP' + str(random.randint(100000, 999999))

def hash_password(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_uid(email):
    return hashlib.md5(email.encode()).hexdigest()[:28]

# ============================================
# ENVIAR CODIGO POR CORREO
# ============================================
@auth_bp.route('/api/enviar-codigo-email', methods=['POST'])
def enviar_codigo_email():
    try:
        datos = request.json
        email_destino = datos.get('email')
        
        if not email_destino:
            return jsonify({'error': 'Falta el correo destino'}), 400
        
        if not REMITENTE_PASSWORD:
            return jsonify({'error': 'Configuracion de correo no disponible'}), 500
        
        codigo = str(random.randint(100000, 999999))
        expira = datetime.now() + timedelta(minutes=5)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO codigos_verificacion (email, codigo, expira) 
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE codigo = VALUES(codigo), expira = VALUES(expira)
        """, (email_destino, codigo, expira))
        conn.commit()
        cursor.close()
        conn.close()
        
        mensaje_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 30px; background-color: #0b0f19; color: white;">
                <div style="background-color: #161b22; padding: 30px; border-radius: 10px; max-width: 400px; margin: auto; border: 1px solid #D4AF37;">
                    <h2 style="color: #D4AF37; margin-bottom: 5px;">iGrafic360</h2>
                    <p style="color: #A0AEC0; font-size: 16px;">Tu codigo de seguridad es:</p>
                    <h1 style="font-size: 40px; letter-spacing: 8px; color: #D4AF37; background: #0b0f19; padding: 15px; border-radius: 5px;">{codigo}</h1>
                    <p style="color: #718096; font-size: 12px; margin-top: 20px;">Este codigo expira en 5 minutos. No lo compartas con nadie.</p>
                </div>
            </body>
        </html>
        """
        msg = MIMEText(mensaje_html, 'html')
        msg['Subject'] = 'Codigo de Seguridad - iGrafic360'
        msg['From'] = f"iGrafic360 <{REMITENTE_EMAIL}>"
        msg['To'] = email_destino
        
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(REMITENTE_EMAIL, REMITENTE_PASSWORD)
        server.sendmail(REMITENTE_EMAIL, email_destino, msg.as_string())
        server.quit()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# VERIFICAR CODIGO
# ============================================
@auth_bp.route('/api/verificar-codigo-email', methods=['POST'])
def verificar_codigo_email():
    try:
        datos = request.json
        email = datos.get('email')
        codigo = datos.get('codigo')
        
        if not email or not codigo:
            return jsonify({'error': 'Faltan datos'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT codigo, expira FROM codigos_verificacion WHERE email = %s", (email,))
        resultado = cursor.fetchone()
        
        if not resultado:
            cursor.close()
            conn.close()
            return jsonify({'error': 'No hay un codigo pendiente'}), 400
        
        if resultado['expira'] < datetime.now():
            cursor.execute("DELETE FROM codigos_verificacion WHERE email = %s", (email,))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'error': 'Codigo expirado'}), 400
        
        if resultado['codigo'] == str(codigo):
            cursor.execute("DELETE FROM codigos_verificacion WHERE email = %s", (email,))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'success': True})
        
        cursor.close()
        conn.close()
        return jsonify({'error': 'Codigo incorrecto'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# REGISTRO
# ============================================
@auth_bp.route('/api/auth/registro', methods=['POST'])
def api_registro():
    try:
        datos = request.json
        email = datos.get('email', '')
        password = datos.get('password', '')
        nombre = datos.get('nombre', 'Cliente')
        telefono = datos.get('telefono', '')
        
        if not email or not password:
            return jsonify({'error': 'Email y contrasena son requeridos'}), 400
        
        if email in ADMIN_EMAILS:
            rol = 'admin'
        else:
            rol = datos.get('rol', 'cliente')
        
        uid = generate_uid(email)
        password_hash = hash_password(password)
        codigo_cliente = generar_codigo_cliente()
        paquetes_json = json.dumps([])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT email FROM clientes WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'El email ya esta registrado'}), 400
        
        cursor.execute("""
            INSERT INTO clientes (uid, nombre, email, telefono, password_hash, codigo_cliente, rol, fecha_registro, paquetes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (uid, nombre, email, telefono, password_hash, codigo_cliente, rol, datetime.now(), paquetes_json))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'mensaje': 'Registro exitoso',
            'uid': uid,
            'nombre': nombre,
            'rol': rol,
            'codigo_cliente': codigo_cliente
        }), 201
        
    except Exception as e:
        print(f"Error Registro: {e}")
        return jsonify({'error': str(e)}), 400

# ============================================
# LOGIN CON COOKIE HTTPONLY
# ============================================
@auth_bp.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        datos = request.json
        email = datos.get('email', '')
        password = datos.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email y contrasena requeridos'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT uid, nombre, email, telefono, password_hash, codigo_cliente, rol, paquetes 
            FROM clientes WHERE email = %s
        """, (email,))
        cliente = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not cliente:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        if not verify_password(password, cliente['password_hash']):
            return jsonify({'error': 'Contrasena incorrecta'}), 401
        
        cliente_data = {
            'uid': cliente['uid'], 
            'nombre': cliente['nombre'],
            'email': cliente['email'],
            'telefono': cliente['telefono'] or '',
            'codigo_cliente': cliente['codigo_cliente'],
            'rol': cliente['rol'],
            'paquetes': json.loads(cliente['paquetes']) if cliente['paquetes'] else []
        }
        
        # Crear respuesta con cookie HttpOnly
        response = make_response(jsonify({
            'mensaje': 'Login exitoso',
            'cliente': cliente_data
        }), 200)
        
        # 🔥 EL FIX ESTÁ AQUÍ 🔥
        response.set_cookie(
            'uid',
            cliente['uid'],
            httponly=True,       # No accesible desde JavaScript
            secure=True,         # Solo enviar por HTTPS (obligatorio para samesite=None)
            samesite='None',     # 👈 Permitir uso desde localhost hacia el dominio de producción
            domain='.igrafic360.net',
            max_age=86400 * 7    # 7 dias
        )
        
        return response
        
    except Exception as e:
        print(f"Error en login: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================
# OBTENER USUARIO ACTUAL DESDE COOKIE
# ============================================
@auth_bp.route('/api/auth/me', methods=['GET'])
def obtener_usuario_actual():
    try:
        uid = request.cookies.get('uid')
        
        if not uid:
            return jsonify({'error': 'No autenticado'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT uid, nombre, email, telefono, codigo_cliente, rol, paquetes 
            FROM clientes WHERE uid = %s
        """, (uid,))
        cliente = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not cliente:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        cliente['paquetes'] = json.loads(cliente['paquetes']) if cliente['paquetes'] else []
        
        return jsonify({'cliente': cliente}), 200
        
    except Exception as e:
        print(f"Error en obtener_usuario_actual: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================
# LOGOUT - ELIMINAR COOKIE
# ============================================
@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'mensaje': 'Sesion cerrada'}), 200)
    response.delete_cookie('uid', httponly=True, secure=True, samesite='None', domain='.igrafic360.net')  # 👈 AGREGAR DOMAIN
    return response, 200


# ============================================
# BUSCAR CLIENTE
# ============================================
@auth_bp.route('/api/buscar-cliente', methods=['GET'])
def buscar_cliente():
    query = request.args.get('q', '').lower()
    if len(query) < 2:
        return jsonify({"clientes": []})
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT uid, nombre, email, telefono, codigo_cliente, rol 
        FROM clientes 
        WHERE LOWER(nombre) LIKE %s 
           OR LOWER(codigo_cliente) LIKE %s 
           OR telefono LIKE %s
        LIMIT 10
    """, (f'%{query}%', f'%{query}%', f'%{query}%'))
    
    resultados = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return jsonify({"clientes": resultados})

# ============================================
# OBTENER USUARIO POR UID (MANTENER PARA COMPATIBILIDAD)
# ============================================
@auth_bp.route('/api/usuario/<uid>', methods=['GET'])
def obtener_usuario_por_uid(uid):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT uid, nombre, email, telefono, codigo_cliente, rol, paquetes FROM clientes WHERE uid = %s", (uid,))
    cliente = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not cliente:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    
    cliente['paquetes'] = json.loads(cliente['paquetes']) if cliente['paquetes'] else []
    
    return jsonify({
        'cliente': cliente
    }), 200

# ============================================
# OBTENER CODIGO DE CLIENTE
# ============================================
@auth_bp.route('/api/cliente/<uid>/codigo', methods=['GET'])
def obtener_codigo_cliente(uid):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT codigo_cliente FROM clientes WHERE uid = %s", (uid,))
        resultado = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not resultado:
            return jsonify({"error": "Cliente no encontrado"}), 404
        
        return jsonify({
            'uid': uid,
            'codigo_cliente': resultado['codigo_cliente'] or 'PENDIENTE'
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============================================
# RESTABLECER CONTRASEÑA CON CODIGO DE 6 DIGITOS
# ============================================
@auth_bp.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        datos = request.json
        email = datos.get('email')
        codigo = datos.get('codigo')
        nueva_password = datos.get('nueva_password')

        if not email or not codigo or not nueva_password:
            return jsonify({'error': 'Faltan datos requeridos (email, codigo o nueva contrasena)'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT uid FROM clientes WHERE email = %s", (email,))
        cliente = cursor.fetchone()
        if not cliente:
            cursor.close()
            conn.close()
            return jsonify({'error': 'No existe una cuenta registrada con este correo.'}), 404

        cursor.execute("SELECT codigo, expira FROM codigos_verificacion WHERE email = %s", (email,))
        resultado = cursor.fetchone()

        if not resultado:
            cursor.close()
            conn.close()
            return jsonify({'error': 'No hay un codigo pendiente. Solicita uno nuevo.'}), 400

        if resultado['expira'] < datetime.now():
            cursor.execute("DELETE FROM codigos_verificacion WHERE email = %s", (email,))
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({'error': 'El codigo ha expirado. Pide uno nuevo.'}), 400

        if str(resultado['codigo']) != str(codigo):
            cursor.close()
            conn.close()
            return jsonify({'error': 'El codigo es incorrecto.'}), 400

        password_hash = hash_password(nueva_password)
        cursor.execute("UPDATE clientes SET password_hash = %s WHERE email = %s", (password_hash, email))
        
        cursor.execute("DELETE FROM codigos_verificacion WHERE email = %s", (email,))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({'success': True, 'mensaje': 'Contrasena actualizada correctamente'}), 200

    except Exception as e:
        print(f"Error en reset-password: {e}")
        return jsonify({'error': str(e)}), 500