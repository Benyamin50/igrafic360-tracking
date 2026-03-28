# -*- coding: utf-8 -*-
from flask import Blueprint, jsonify, request
from db_config import get_db_connection
from datetime import datetime
import sys
import io
import json

# Forzar UTF-8 para prints
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
except:
    pass

pagos_bp = Blueprint('pagos', __name__)

# ============================================
# FUNCION DE VALIDACION DE PROPIEDAD (MySQL)
# ============================================
def verificar_propiedad_paquete(tracking_id, uid_usuario):
    """
    Verifica que el usuario sea dueño del paquete o admin.
    Retorna (permitido, mensaje_error, rol_usuario)
    """
    try:
        if not uid_usuario:
            return False, "Usuario no autenticado", None
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Obtener paquete
        cursor.execute("SELECT * FROM paquetes WHERE id = %s OR tracking_id = %s", (tracking_id, tracking_id))
        paquete = cursor.fetchone()
        
        if not paquete:
            cursor.close()
            conn.close()
            return False, "Paquete no existe", None
        
        # Obtener rol del usuario
        cursor.execute("SELECT rol FROM clientes WHERE uid = %s", (uid_usuario,))
        cliente = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not cliente:
            return False, "Usuario no encontrado", None
        
        rol = cliente.get('rol', 'cliente')
        
        # Admin tiene acceso total
        if rol == 'admin':
            return True, None, rol
        
        # Cliente solo puede ver sus paquetes
        if paquete.get('cliente_uid') == uid_usuario:
            return True, None, rol
        
        return False, "No tienes permiso para acceder a este paquete", rol
        
    except Exception as e:
        return False, str(e), None

# ============================================
# REPORTAR PAGO (Cliente) - CON VALIDACION
# ============================================
@pagos_bp.route('/api/reportar-pago', methods=['POST'])
def reportar_pago():
    try:
        datos = request.json
        tid = datos.get('tracking_id')
        metodo_pago = datos.get('metodo_pago')
        referencia_binance = datos.get('referencia_binance', '')
        
        # 👈 LEER DE COOKIE
        uid_usuario = request.cookies.get('uid')
        
        if not tid:
            return jsonify({"error": "Falta el ID del paquete"}), 400
        if not uid_usuario:
            return jsonify({"error": "Usuario no autenticado"}), 401
        if not metodo_pago:
            metodo_pago = 'pagomovil'
        
        permitido, error, rol = verificar_propiedad_paquete(tid, uid_usuario)
        if not permitido:
            return jsonify({"error": error}), 403
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar si ya esta pagado o reportado
        cursor.execute("SELECT pagado, pago_reportado FROM paquetes WHERE id = %s OR tracking_id = %s", (tid, tid))
        paquete = cursor.fetchone()
        
        if not paquete:
            cursor.close()
            conn.close()
            return jsonify({"error": "Paquete no encontrado"}), 404
        
        if paquete[0] == 1:
            cursor.close()
            conn.close()
            return jsonify({"error": "Este paquete ya esta pagado"}), 400
        
        if paquete[1] == 1:
            cursor.close()
            conn.close()
            return jsonify({"error": "Ya has reportado un pago"}), 400
        
        # Construir la actualizacion
        update_fields = [
            "metodo_pago = %s",
            "pago_reportado = 1",
            "estado_pago = %s",
            "reportado_por = %s",
            "fecha_reporte = %s"
        ]
        update_values = [metodo_pago, 'reportado', uid_usuario, datetime.now()]
        
        if metodo_pago == 'binance' and referencia_binance:
            update_fields.append("referencia_binance = %s")
            update_values.append(referencia_binance)
        
        update_values.append(tid)
        update_values.append(tid)
        
        cursor.execute(f"""
            UPDATE paquetes SET {', '.join(update_fields)} 
            WHERE id = %s OR tracking_id = %s
        """, update_values)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"mensaje": "Pago reportado correctamente"}), 200
        
    except Exception as e:
        print(f"ERROR en reportar_pago: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================
# MARCAR PAQUETE COMO PAGADO (Admin) - CON VALIDACION
# ============================================
@pagos_bp.route('/api/paquete/marcar-pagado', methods=['POST'])
def marcar_pagado():
    try:
        datos = request.json
        print("DATOS RECIBIDOS EN MARCAR PAGADO:", datos)
        
        tid = datos.get('tracking_id')
        es_pagado = datos.get('pagado')
        fecha_pago = datos.get('fecha_pago')
        
        # 👈 LEER DE COOKIE
        uid_usuario = request.cookies.get('uid')
        
        if not tid:
            return jsonify({"error": "tracking_id requerido"}), 400
        
        if es_pagado is None:
            return jsonify({"error": "pagado es requerido (true/false)"}), 400
        
        if not uid_usuario:
            return jsonify({"error": "Usuario no autenticado"}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el usuario sea admin
        cursor.execute("SELECT rol FROM clientes WHERE uid = %s", (uid_usuario,))
        cliente = cursor.fetchone()
        
        if not cliente:
            cursor.close()
            conn.close()
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        if cliente.get('rol') != 'admin':
            cursor.close()
            conn.close()
            return jsonify({"error": "No autorizado. Solo administradores pueden marcar pagos"}), 403
        
        # Verificar que el paquete existe
        cursor.execute("SELECT * FROM paquetes WHERE id = %s OR tracking_id = %s", (tid, tid))
        paquete = cursor.fetchone()
        
        if not paquete:
            cursor.close()
            conn.close()
            return jsonify({"error": f"Paquete {tid} no encontrado"}), 404
        
        ahora = datetime.now()
        
        if es_pagado:
            cursor.execute("""
                UPDATE paquetes SET 
                    pagado = 1,
                    pago_reportado = 1,
                    fecha_pago = %s,
                    estado_pago = %s,
                    aprobado_por = %s,
                    fecha_aprobacion = %s
                WHERE id = %s OR tracking_id = %s
            """, (fecha_pago if fecha_pago else ahora, 'aprobado', uid_usuario, ahora, tid, tid))
        else:
            cursor.execute("""
                UPDATE paquetes SET 
                    pagado = 0,
                    pago_reportado = 0,
                    fecha_pago = NULL,
                    estado_pago = NULL,
                    metodo_pago = NULL,
                    referencia_binance = NULL,
                    aprobado_por = %s,
                    fecha_rechazo = %s
                WHERE id = %s OR tracking_id = %s
            """, (uid_usuario, ahora, tid, tid))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        estado_texto = 'APROBADO' if es_pagado else 'RECHAZADO'
        print(f"Pago {estado_texto} para {tid} por admin {uid_usuario}")
        
        return jsonify({
            "mensaje": f"Pago {estado_texto} correctamente",
            "tracking_id": tid,
            "pagado": es_pagado
        }), 200
        
    except Exception as e:
        print(f"Error marcando pago: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500