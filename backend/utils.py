# -*- coding: utf-8 -*-
import random
import string

def generar_codigo_cliente():
    letras = ''.join(random.choices(string.ascii_uppercase, k=3))
    numeros = ''.join(random.choices(string.digits, k=6))
    return f"{letras}{numeros}"

def paquete_a_eventos(paquete_data):
    eventos = []
    if not paquete_data.get('Origen_paquete-recibido'):
        eventos.append({
            "evento": " Pendiente de recepcion en Miami",
            "fecha": "",
            "peso": paquete_data.get('peso', 'Pendiente'),
            "precio": paquete_data.get('precio', 'Pendiente')
        })
        return eventos
    
    ubicaciones = [
        ('Origen_paquete-recibido', 'Fecha_Origen'),
        ('Ubicacion_1', 'Fecha_1'),
        ('Ubicacion_2', 'Fecha_2'),
        ('Ubicacion_3', 'Fecha_3'),
        ('Llegada_Sucursal', 'Fecha_4'),
        ('Entregado', 'Fecha_5')
    ]
    
    for campo_lugar, campo_fecha in ubicaciones:
        if paquete_data.get(campo_lugar) and paquete_data[campo_lugar] != "":
            eventos.append({
                "evento": paquete_data[campo_lugar],
                "fecha": paquete_data.get(campo_fecha, ''),
                "peso": paquete_data.get('peso', ''),
                "precio": paquete_data.get('precio', '')
            })
    return eventos