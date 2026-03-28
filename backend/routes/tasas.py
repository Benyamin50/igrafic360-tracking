# -*- coding: utf-8 -*-
from flask import Blueprint, jsonify, request
import requests
import time
from datetime import datetime
from db_config import get_db_connection
import json

tasas_bp = Blueprint('tasas', __name__)
ULTIMA_CONSULTA_TASAS = 0

def obtener_tasas_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT clave, valor, actualizado_en FROM configuracion WHERE clave IN ('dolar_bcv', 'euro_bcv')")
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        tasas = {}
        for row in resultados:
            tasas[row['clave']] = row['valor']
        return tasas
    except Exception as e:
        print(f"Error obteniendo tasas: {e}")
        return {}

def guardar_tasas_db(dolar, euro, fecha):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO configuracion (clave, valor, actualizado_en) 
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_en = VALUES(actualizado_en)
        """, ('dolar_bcv', str(dolar), fecha))
        cursor.execute("""
            INSERT INTO configuracion (clave, valor, actualizado_en) 
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE valor = VALUES(valor), actualizado_en = VALUES(actualizado_en)
        """, ('euro_bcv', str(euro), fecha))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error guardando tasas: {e}")
        return False

@tasas_bp.route('/api/tasa-bcv', methods=['GET'])
def obtener_tasa_bcv_db():
    try:
        tasas = obtener_tasas_db()
        if tasas:
            dolar = float(tasas.get('dolar_bcv', 36.27))
            return jsonify({'tasa': dolar, 'moneda': 'VES', 'fuente': 'MySQL'}), 200
        return jsonify({'tasa': 36.27, 'moneda': 'VES', 'fuente': 'Default'}), 200
    except Exception as e:
        return jsonify({'tasa': 36.27, 'moneda': 'VES', 'error': str(e)}), 200

@tasas_bp.route('/api/tasa-euro', methods=['GET'])
def obtener_tasa_euro_db():
    try:
        tasas = obtener_tasas_db()
        if tasas:
            euro = float(tasas.get('euro_bcv', 40.50))
            return jsonify({'tasa': euro, 'moneda': 'EUR', 'fuente': 'MySQL'}), 200
        return jsonify({'tasa': 40.50, 'moneda': 'EUR', 'fuente': 'Default'}), 200
    except Exception as e:
        return jsonify({'tasa': 40.50, 'moneda': 'EUR', 'error': str(e)}), 200

@tasas_bp.route('/api/actualizar-tasas', methods=['POST'])
def actualizar_tasas_manual():
    global ULTIMA_CONSULTA_TASAS
    ahora = time.time()

    if ahora - ULTIMA_CONSULTA_TASAS < 60:
        tasas = obtener_tasas_db()
        if tasas:
            return jsonify({
                'mensaje': 'Usando cache',
                'dolar_bcv': float(tasas.get('dolar_bcv', 36.27)),
                'euro_bcv': float(tasas.get('euro_bcv', 40.50))
            }), 200

    try:
        print("Consultando DolarApi...")
        res_dolar = requests.get("https://ve.dolarapi.com/v1/dolares/oficial", timeout=5)
        tasa_dolar = float(res_dolar.json()['promedio']) if res_dolar.status_code == 200 else 36.27

        res_euro = requests.get("https://ve.dolarapi.com/v1/euros/oficial", timeout=5)
        tasa_euro = float(res_euro.json()['promedio']) if res_euro.status_code == 200 else 40.50

        fecha_texto = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        guardar_tasas_db(tasa_dolar, tasa_euro, fecha_texto)
        ULTIMA_CONSULTA_TASAS = ahora

        return jsonify({
            'mensaje': 'Tasas actualizadas',
            'dolar_bcv': tasa_dolar,
            'euro_bcv': tasa_euro
        }), 200

    except Exception as e:
        print(f"Error: {e}")
        tasas = obtener_tasas_db()
        if tasas:
            return jsonify({
                'dolar_bcv': float(tasas.get('dolar_bcv', 36.27)),
                'euro_bcv': float(tasas.get('euro_bcv', 40.50))
            }), 200
        return jsonify({'error': 'Servicio no disponible'}), 500
