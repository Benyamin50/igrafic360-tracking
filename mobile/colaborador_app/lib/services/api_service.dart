import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiService {
  static const String baseUrl = 'https://igrafic360.net/envio-api';
  
  // UID del usuario actual
  static String? _currentUid;
  
  // ============================================
  // AUTENTICACION
  // ============================================
  
  // Login con email y contraseña
  static Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      print('Login: $email');
      
      final response = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'email': email,
          'password': password,
        }),
      );
      
      print('Status code login: ${response.statusCode}');
      print('Respuesta login: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Datos del cliente: ${data['cliente']}');
        print('UID del cliente: ${data['cliente']['uid']}');
        _currentUid = data['cliente']['uid'];
        print('UID guardado: $_currentUid');
        return data['cliente'];
      } else {
        final error = json.decode(response.body);
        throw Exception(error['error'] ?? 'Error en login');
      }
    } catch (e) {
      print('Error en login: $e');
      throw Exception('Error de conexion: $e');
    }
  }
  
  // Obtener usuario actual (para mantener sesion)
  static Future<Map<String, dynamic>?> obtenerUsuarioActual() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/auth/me'),
        headers: {
          'Content-Type': 'application/json',
        },
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['cliente'];
      }
      return null;
    } catch (e) {
      print('Error obteniendo usuario: $e');
      return null;
    }
  }
  
  // Obtener headers de autenticacion con el UID actual
  static Map<String, String> _getAuthHeaders() {
    print('_currentUid al hacer peticion: $_currentUid');
    return {
      'Content-Type': 'application/json',
      'X-User-UID': _currentUid ?? '',
    };
  }
  
  // ============================================
  // METODOS DE TRACKING
  // ============================================
  
  // OBTENER ESTADO COMPLETO DEL PAQUETE (TODAS LAS COLUMNAS)
  static Future<Map<String, dynamic>> obtenerEstado(String trackingId) async {
    try {
      print('Consultando tracking: $trackingId');
      print('Headers: ${_getAuthHeaders()}');
      
      final response = await http.get(
        Uri.parse('$baseUrl/tracking/$trackingId'),
        headers: _getAuthHeaders(),
      );
      
      print('Status code: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        print('Datos recibidos: $data');
        
        // CORREGIDO: usar guion bajo en Origen_paquete_recibido
        Map<String, dynamic> estado = {
          'Origen_paquete_recibido': '',
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
        
        for (int i = 0; i < data.length; i++) {
          final evento = data[i];
          
          switch (i) {
            case 0:
              estado['Origen_paquete_recibido'] = evento['evento'] ?? '';
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
          'Origen_paquete_recibido': '',
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
      
      final eventos = await obtenerEstado(trackingId);
      
      final response = await http.get(
        Uri.parse('$baseUrl/paquete-completo/$trackingId?_t=${DateTime.now().millisecondsSinceEpoch}'),
        headers: _getAuthHeaders(),
      );
      
      print('Status code paquete-completo: ${response.statusCode}');
      print('Respuesta raw: ${response.body}');
      
      // AGREGAR observaciones al mapa de datos de pago
      Map<String, dynamic> datosPago = {
        'pagado': false,
        'estado_pago': 'pendiente',
        'metodo_pago': null,
        'cliente_nombre': null,
        'observaciones': '',
      };
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Datos de pago recibidos: $data');
        datosPago = {
          'pagado': data['pagado'] == true || data['pagado'] == 1,
          'estado_pago': data['estado_pago'] ?? 'pendiente',
          'metodo_pago': data['metodo_pago'],
          'cliente_nombre': data['cliente_nombre'],
          'observaciones': data['observaciones'] ?? '',
        };
      }
      
      return {
        'eventos': _convertirEstadoALista(eventos),
        'estado': eventos,
        'pagado': datosPago['pagado'],
        'estado_pago': datosPago['estado_pago'],
        'metodo_pago': datosPago['metodo_pago'],
        'cliente_nombre': datosPago['cliente_nombre'],
        'observaciones': datosPago['observaciones'],
      };
      
    } catch (e) {
      print('Error en obtenerEstadoCompleto: $e');
      throw Exception('Error de conexion: $e');
    }
  }

  // Convertir estado a lista de eventos
  static List<Map<String, dynamic>> _convertirEstadoALista(Map<String, dynamic> estado) {
    List<Map<String, dynamic>> eventos = [];
    
    if (estado['Origen_paquete_recibido'].isNotEmpty) {
      eventos.add({
        'evento': estado['Origen_paquete_recibido'],
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
        headers: _getAuthHeaders(),
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
        headers: _getAuthHeaders(),
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
        headers: _getAuthHeaders(),
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
        headers: _getAuthHeaders(),
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
        headers: _getAuthHeaders(),
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

  // ============================================
  // PREALERTA
  // ============================================
  
  // Buscar prealerta por tracking original
  static Future<Map<String, dynamic>?> buscarPrealerta(String trackingOriginal) async {
    try {
      print('Buscando prealerta para tracking: $trackingOriginal');
      
      final response = await http.get(
        Uri.parse('$baseUrl/api/prealerta/buscar?tracking=$trackingOriginal'),
        headers: _getAuthHeaders(),
      );
      
      print('Status code buscarPrealerta: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Prealerta encontrada: $data');
        return data;
      } else if (response.statusCode == 404) {
        print('No se encontro prealerta');
        return null;
      } else {
        print('Error buscando prealerta: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('Error en buscarPrealerta: $e');
      return null;
    }
  }

  // Crear paquete desde prealerta (cuando el empleado escanea)
  static Future<Map<String, dynamic>?> crearPaqueteDesdePrealerta({
    required String trackingOriginal,
    required String peso,
    required String precio,
  }) async {
    try {
      print('Creando paquete desde prealerta: $trackingOriginal');
      print('Peso: $peso, Precio: $precio');
      
      final response = await http.post(
        Uri.parse('$baseUrl/api/prealerta/crear-paquete'),
        headers: _getAuthHeaders(),
        body: json.encode({
          'tracking_original': trackingOriginal,
          'peso': peso,
          'precio': precio,
        }),
      );
      
      print('Status code crearPaquete: ${response.statusCode}');
      print('Respuesta: ${response.body}');
      
      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        print('Paquete creado exitosamente: ${data['tracking_id']}');
        return data;
      } else {
        print('Error creando paquete: ${response.body}');
        return null;
      }
    } catch (e) {
      print('Error en crearPaqueteDesdePrealerta: $e');
      return null;
    }
  }

  // OBTENER FECHA ACTUAL FORMATEADA (Hora Local del Celular)
  static String _getCurrentDate() {
    final now = DateTime.now();
    
    String year = now.year.toString();
    String month = now.month.toString().padLeft(2, '0');
    String day = now.day.toString().padLeft(2, '0');
    
    String hour = now.hour.toString().padLeft(2, '0');
    String minute = now.minute.toString().padLeft(2, '0');
    String second = now.second.toString().padLeft(2, '0');
    
    return '$year-$month-$day $hour:$minute:$second';
  }
}