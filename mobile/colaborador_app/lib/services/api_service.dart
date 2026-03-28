import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiService {
  static const String baseUrl = 'https://igrafic360.net/envio-api';
  
  // UID DEL ADMINISTRADOR PARA AUTENTICACION
  static const String adminUid = '5fb1e57024789180a863264ac9bd';

  // OBTENER ESTADO COMPLETO DEL PAQUETE (TODAS LAS COLUMNAS)
  static Future<Map<String, dynamic>> obtenerEstado(String trackingId) async {
    try {
      print('Consultando tracking: $trackingId');
      
      final response = await http.get(
        Uri.parse('$baseUrl/tracking/$trackingId'),
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': adminUid,
        },
      );
      
      print('Status code: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        print('Datos recibidos: $data');
        
        // Crear mapa con todas las columnas vacias
        Map<String, dynamic> estado = {
          'Origen_paquete-recibido': '',
          'Fecha_Origen': '',
          'Ubicacion_1': '',
          'Fecha_1': '',
          'Ubicacion_2': '',
          'Fecha_2': '',
          'Ubicacion_3': '',
          'Fecha_3': '',
          'Llegada_Sucursal': '',
          'Fecha_4': '',
          'Entregado': '',
          'Fecha_5': '',
        };
        
        // Mapear cada evento a su columna correspondiente segun el indice
        for (int i = 0; i < data.length; i++) {
          final evento = data[i];
          
          switch (i) {
            case 0:
              estado['Origen_paquete-recibido'] = evento['evento'] ?? '';
              estado['Fecha_Origen'] = evento['fecha'] ?? '';
              break;
            case 1:
              estado['Ubicacion_1'] = evento['evento'] ?? '';
              estado['Fecha_1'] = evento['fecha'] ?? '';
              break;
            case 2:
              estado['Ubicacion_2'] = evento['evento'] ?? '';
              estado['Fecha_2'] = evento['fecha'] ?? '';
              break;
            case 3:
              estado['Ubicacion_3'] = evento['evento'] ?? '';
              estado['Fecha_3'] = evento['fecha'] ?? '';
              break;
            case 4:
              estado['Llegada_Sucursal'] = evento['evento'] ?? '';
              estado['Fecha_4'] = evento['fecha'] ?? '';
              break;
            case 5:
              estado['Entregado'] = evento['evento'] ?? '';
              estado['Fecha_5'] = evento['fecha'] ?? '';
              break;
          }
        }
        
        print('Estado mapeado: $estado');
        return estado;
        
      } else if (response.statusCode == 404) {
        print('Tracking no encontrado');
        return {
          'Origen_paquete-recibido': '',
          'Fecha_Origen': '',
          'Ubicacion_1': '',
          'Fecha_1': '',
          'Ubicacion_2': '',
          'Fecha_2': '',
          'Ubicacion_3': '',
          'Fecha_3': '',
          'Llegada_Sucursal': '',
          'Fecha_4': '',
          'Entregado': '',
          'Fecha_5': '',
        };
      } else {
        throw Exception('Error al obtener estado: ${response.statusCode}');
      }
      
    } catch (e) {
      print('Error: $e');
      throw Exception('Error de conexion: $e');
    }
  }

  // OBTENER ESTADO COMPLETO INCLUYENDO DATOS DE PAGO
  static Future<Map<String, dynamic>> obtenerEstadoCompleto(String trackingId) async {
  try {
    print('Consultando estado completo: $trackingId');
    
    // Obtener los eventos del tracking
    final eventos = await obtenerEstado(trackingId);
    
    // Obtener datos de pago del paquete con timestamp anti-cache
    final response = await http.get(
      Uri.parse('$baseUrl/paquete-completo/$trackingId?_t=${DateTime.now().millisecondsSinceEpoch}'),
      headers: {
        'Content-Type': 'application/json',
        'X-User-UID': adminUid,
      },
    );
    
    print('Status code paquete-completo: ${response.statusCode}');
    print('Respuesta raw: ${response.body}');
    
    Map<String, dynamic> datosPago = {
      'pagado': false,
      'estado_pago': 'pendiente',
      'metodo_pago': null,
      'cliente_nombre': null,
    };
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      print('Datos de pago recibidos: $data');
      datosPago = {
        'pagado': data['pagado'] == true || data['pagado'] == 1,
        'estado_pago': data['estado_pago'] ?? 'pendiente',
        'metodo_pago': data['metodo_pago'],
        'cliente_nombre': data['cliente_nombre'],
      };
    }
    
    return {
      'eventos': _convertirEstadoALista(eventos),
      'estado': eventos,
      'pagado': datosPago['pagado'],
      'estado_pago': datosPago['estado_pago'],
      'metodo_pago': datosPago['metodo_pago'],
      'cliente_nombre': datosPago['cliente_nombre'],
    };
    
  } catch (e) {
    print('Error en obtenerEstadoCompleto: $e');
    throw Exception('Error de conexion: $e');
  }
}

  // Convertir estado a lista de eventos
  static List<Map<String, dynamic>> _convertirEstadoALista(Map<String, dynamic> estado) {
    List<Map<String, dynamic>> eventos = [];
    
    if (estado['Origen_paquete-recibido'].isNotEmpty) {
      eventos.add({
        'evento': estado['Origen_paquete-recibido'],
        'fecha': estado['Fecha_Origen'],
      });
    }
    if (estado['Ubicacion_1'].isNotEmpty) {
      eventos.add({
        'evento': estado['Ubicacion_1'],
        'fecha': estado['Fecha_1'],
      });
    }
    if (estado['Ubicacion_2'].isNotEmpty) {
      eventos.add({
        'evento': estado['Ubicacion_2'],
        'fecha': estado['Fecha_2'],
      });
    }
    if (estado['Ubicacion_3'].isNotEmpty) {
      eventos.add({
        'evento': estado['Ubicacion_3'],
        'fecha': estado['Fecha_3'],
      });
    }
    if (estado['Llegada_Sucursal'].isNotEmpty) {
      eventos.add({
        'evento': estado['Llegada_Sucursal'],
        'fecha': estado['Fecha_4'],
      });
    }
    if (estado['Entregado'].isNotEmpty) {
      eventos.add({
        'evento': estado['Entregado'],
        'fecha': estado['Fecha_5'],
      });
    }
    
    return eventos;
  }

  // ACTUALIZAR ESTADO DE UNA COLUMNA ESPECIFICA (SIN COORDENADAS)
  static Future<bool> actualizarEstado(
    String trackingId, 
    String columna, 
    String valor
  ) async {
    try {
      print('Actualizando: $trackingId - $columna - $valor');
      
      final response = await http.post(
        Uri.parse('$baseUrl/actualizar/$trackingId'),
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': adminUid,
        },
        body: json.encode({
          'tracking_id': trackingId,
          'columna': columna,
          'valor': valor,
          'fecha': _getCurrentDate(),
        }),
      );
      
      print('Status code: ${response.statusCode}');
      
      return response.statusCode == 200;
      
    } catch (e) {
      print('Error: $e');
      throw Exception('Error de conexion: $e');
    }
  }

  // GUARDAR URL DE FOTO EN LA BASE DE DATOS
  static Future<bool> guardarFotoUrl(String trackingId, String fotoUrl, String tipo) async {
    try {
      print('Enviando foto URL a backend: $fotoUrl');
      print('   Tipo: $tipo');
      
      final response = await http.post(
        Uri.parse('$baseUrl/api/paquete/agregar-foto'),
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': adminUid,
        },
        body: json.encode({
          'tracking_id': trackingId,
          'foto_url': fotoUrl,
          'tipo': tipo,
          'fecha': DateTime.now().toIso8601String(),
        }),
      );
      
      print('Status code: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        print('Foto URL guardada correctamente');
        return true;
      } else {
        print('Error: ${response.body}');
        return false;
      }
      
    } catch (e) {
      print('Error en guardarFotoUrl: $e');
      return false;
    }
  }

  // OBTENER FOTOS DE UN PAQUETE
  static Future<List<Map<String, dynamic>>> obtenerFotosPaquete(String trackingId) async {
    try {
      print('Obteniendo fotos para: $trackingId');
      
      final response = await http.get(
        Uri.parse('$baseUrl/api/paquete/$trackingId/fotos'),
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': adminUid,
        },
      );
      
      print('Status code: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Respuesta del backend: $data');
        
        if (data['fotos'] != null && data['fotos'] is List) {
          List<dynamic> fotosRaw = data['fotos'];
          List<Map<String, dynamic>> fotos = [];
          
          for (var foto in fotosRaw) {
            if (foto is Map<String, dynamic>) {
              fotos.add({
                'url': foto['url'] ?? '',
                'tipo': foto['tipo'] ?? 'desconocido',
              });
            } else if (foto is String) {
              fotos.add({
                'url': foto,
                'tipo': 'desconocido',
              });
            }
          }
          
          print('Fotos obtenidas: $fotos');
          return fotos;
        }
      }
      
      print('No se encontraron fotos');
      return [];
      
    } catch (e) {
      print('Error obteniendo fotos: $e');
      return [];
    }
  }

  // ACTUALIZAR ESTADO CON COORDENADAS
  static Future<bool> actualizarEstadoConCoordenadas(
    String trackingId, 
    String columna, 
    String valor,
    double lat,
    double lng
  ) async {
    try {
      print('Actualizando con coordenadas: $trackingId - $columna');
      print('Coordenadas: $lat, $lng');
      
      final response = await http.post(
        Uri.parse('$baseUrl/actualizar-con-coordenadas/$trackingId'),
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': adminUid,
        },
        body: json.encode({
          'tracking_id': trackingId,
          'columna': columna,
          'valor': valor,
          'fecha': _getCurrentDate(),
          'lat': lat,
          'lng': lng,
        }),
      );
      
      print('Status code: ${response.statusCode}');
      
      return response.statusCode == 200;
      
    } catch (e) {
      print('Error: $e');
      return false;
    }
  }

  // OBTENER COORDENADAS DE UN PAQUETE
  static Future<List<Map<String, dynamic>>> obtenerCoordenadasPaquete(String trackingId) async {
    try {
      print('Obteniendo coordenadas para: $trackingId');
      
      final response = await http.get(
        Uri.parse('$baseUrl/api/paquete/$trackingId/coordenadas'),
        headers: {
          'Content-Type': 'application/json',
          'X-User-UID': adminUid,
        },
      );
      
      print('Status code: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Coordenadas recibidas: ${data['coordenadas']}');
        
        if (data['coordenadas'] != null && data['coordenadas'] is List) {
          return List<Map<String, dynamic>>.from(data['coordenadas']);
        }
      }
      
      return [];
      
    } catch (e) {
      print('Error obteniendo coordenadas: $e');
      return [];
    }
  }

  // OBTENER FECHA ACTUAL FORMATEADA
  static String _getCurrentDate() {
    final now = DateTime.now();
    
    String minute = now.minute.toString().padLeft(2, '0');
    String second = now.second.toString().padLeft(2, '0');
    String amPm = now.hour < 12 ? 'AM' : 'PM';
    
    int hour12 = now.hour % 12;
    if (hour12 == 0) hour12 = 12;
    
    return '${now.day}/${now.month}/${now.year}, ${hour12}:$minute:$second $amPm';
  }
}