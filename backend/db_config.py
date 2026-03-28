# -*- coding: utf-8 -*-
import mysql.connector
from mysql.connector import pooling
import os
from contextlib import contextmanager
import time

# Variables de entorno requeridas
DB_HOST = os.environ.get('DB_HOST')
DB_NAME = os.environ.get('DB_NAME')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')

# Validar que todas las variables de entorno estén configuradas
missing_vars = []
if not DB_HOST:
    missing_vars.append('DB_HOST')
if not DB_NAME:
    missing_vars.append('DB_NAME')
if not DB_USER:
    missing_vars.append('DB_USER')
if not DB_PASSWORD:
    missing_vars.append('DB_PASSWORD')

if missing_vars:
    print(f"ERROR: Faltan variables de entorno: {missing_vars}")
    print("Por favor configura las siguientes variables:")
    for var in missing_vars:
        print(f"  export {var}=<valor>")
    connection_pool = None
else:
    db_config = {
        "host": DB_HOST,
        "database": DB_NAME,
        "user": DB_USER,
        "password": DB_PASSWORD
    }

    connection_pool = None

    try:
        connection_pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name="igrafic_pool",
            pool_size=20,
            pool_reset_session=True,
            **db_config
        )
        print("MySQL Pool conectado (pool_size=20)")
    except Exception as e:
        print(f"Error MySQL: {e}")
        connection_pool = None

def get_db_connection():
    """Obtener una conexion del pool"""
    if connection_pool is None:
        raise Exception("No hay conexion a la base de datos. Verifica las variables de entorno.")
    
    try:
        return connection_pool.get_connection()
    except mysql.connector.pooling.PoolError as e:
        print(f"Error obteniendo conexion: {e}")
        time.sleep(0.5)
        return connection_pool.get_connection()

def get_pool_stats():
    """Obtener estadisticas del pool de conexiones"""
    if connection_pool:
        try:
            pool = connection_pool._cnx_pool
            return {
                'pool_name': connection_pool.pool_name,
                'pool_size': connection_pool.pool_size,
                'connections_in_use': pool.qsize() if hasattr(pool, 'qsize') else 'N/A'
            }
        except Exception as e:
            print(f"Error obteniendo stats: {e}")
            return {
                'pool_name': connection_pool.pool_name,
                'pool_size': connection_pool.pool_size
            }
    return None

@contextmanager
def get_db():
    """Context manager para usar conexiones automaticamente"""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        try:
            conn.close()
        except Exception as e:
            print(f"Error cerrando conexion: {e}")

def cleanup_idle_connections():
    """Cerrar conexiones que han estado inactivas por mucho tiempo"""
    if connection_pool:
        try:
            pool = connection_pool._cnx_pool
            if hasattr(pool, 'queue'):
                print(f"Conexiones activas: {pool.qsize()}")
        except Exception as e:
            print(f"No se pudo obtener info del pool: {e}")