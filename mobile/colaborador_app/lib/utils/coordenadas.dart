// lib/utils/coordenadas.dart

class Coordenadas {
  // ============================================
  // COORDENADAS PARA RUTAS AÉREAS (Avión)
  // ============================================
  static const Map<String, Map<String, double>> ubicacionesAereas = {
    'Origen_paquete_recibido': {'lat': 25.7963, 'lng': -80.2620},  // Aeropuerto Miami (MIA)
    'Ubicacion_1': {'lat': 18.0, 'lng': -73.0},                    // Sobre el Caribe (en vuelo)
    'Ubicacion_2': {'lat': 10.6031, 'lng': -66.9906},              // Aeropuerto Maiquetía (CCS)
    'Ubicacion_3': {'lat': 10.4806, 'lng': -66.9036},              // En ruta a sucursal
    'Llegada_Sucursal': {'lat': 10.4806, 'lng': -66.9036},         // Oficina
    'Entregado': {'lat': 10.4806, 'lng': -66.9036},                // Destino final
  };

  // ============================================
  // COORDENADAS PARA RUTAS MARÍTIMAS (Barco)
  // ============================================
  static const Map<String, Map<String, double>> ubicacionesMaritimas = {
    'Origen_paquete_recibido': {'lat': 25.7617, 'lng': -80.1918},  // Puerto de Miami
    'Ubicacion_1': {'lat': 23.5, 'lng': -79.5},                    // Estrecho de Florida (saliendo)
    'Ubicacion_2': {'lat': 9.3595, 'lng': -79.9015},               // Puerto de Colón (Panamá)
    'Ubicacion_3': {'lat': 10.4727, 'lng': -68.0121},              // Puerto Cabello
    'Llegada_Sucursal': {'lat': 10.4806, 'lng': -66.9036},         // Oficina
    'Entregado': {'lat': 10.4806, 'lng': -66.9036},                // Destino final
  };

  // ============================================
  // DETECTAR MODO DE TRANSPORTE (aéreo o marítimo)
  // ============================================
  static String detectarModo(String evento) {
    final eventoLower = evento.toLowerCase();
    if (eventoLower.contains('vuelo') || 
        eventoLower.contains('mia') || 
        eventoLower.contains('maiquetía') ||
        eventoLower.contains('aeropuerto') ||
        eventoLower.contains('ccs')) {
      return 'aereo';
    }
    if (eventoLower.contains('puerto') || 
        eventoLower.contains('colón') || 
        eventoLower.contains('cabello') ||
        eventoLower.contains('barco') ||
        eventoLower.contains('saliendo')) {
      return 'maritimo';
    }
    return 'maritimo'; // Por defecto
  }

  // ============================================
  // OBTENER COORDENADAS SEGÚN EL TIPO DE ENVÍO
  // ============================================
  static Map<String, double>? getCoordenadas(String tipoEnvio, String columna) {
    if (tipoEnvio == 'aereo') {
      return ubicacionesAereas[columna];
    } else {
      return ubicacionesMaritimas[columna];
    }
  }
  
  // ============================================
  // OBTENER COLOR DE LÍNEA SEGÚN MODO
  // ============================================
  static int getColorLinea(String modo) {
    if (modo == 'aereo') {
      return 0xFF60A5FA; // Azul para avión
    }
    return 0xFF10B981; // Verde para barco
  }
}