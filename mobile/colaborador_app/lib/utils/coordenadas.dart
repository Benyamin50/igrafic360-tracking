// lib/utils/coordenadas.dart

class Coordenadas {
  // Coordenadas predefinidas para cada ubicación
  static const Map<String, Map<String, double>> ubicaciones = {
    'Ubicacion_1': {'lat': 25.7617, 'lng': -80.1918},  // Miami
    'Ubicacion_2': {'lat': 8.9824, 'lng': -79.5199},   // Panamá
    'Ubicacion_3': {'lat': 10.4806, 'lng': -66.9036},  // Caracas
    'Llegada_Sucursal': {'lat': 10.4806, 'lng': -66.9036}, // Caracas
    'Entregado': {'lat': 10.4806, 'lng': -66.9036},     // Caracas
    'Origen_paquete-recibido': {'lat': 25.7617, 'lng': -80.1918}, // Miami
  };

  // Obtener coordenadas por tipo de ubicación
  static Map<String, double>? getCoordenadas(String tipo) {
    return ubicaciones[tipo];
  }
}