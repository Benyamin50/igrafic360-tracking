import 'package:flutter/material.dart';

class UbicacionesWidget extends StatelessWidget {
  final String? tipoEnvio;
  final String? selectedUbicacion;
  final Function(String, String) onSeleccionarUbicacion;
  final Color goldChampagne;
  final Color textLight;
  final Color textMuted;

  const UbicacionesWidget({
    super.key,
    this.tipoEnvio,
    this.selectedUbicacion,
    required this.onSeleccionarUbicacion,
    required this.goldChampagne,
    required this.textLight,
    required this.textMuted,
  });

  List<Map<String, dynamic>> get ubicaciones {
    if (tipoEnvio == 'aereo') {
      return [
        {"columna": "Ubicacion_1", "label": "En vuelo hacia Venezuela", "icon": Icons.flight_takeoff},
        {"columna": "Ubicacion_2", "label": "Arribo a Maiquetía (CCS)", "icon": Icons.flight_land},
        {"columna": "Ubicacion_3", "label": "En ruta a sucursal", "icon": Icons.local_shipping},
        {"columna": "Llegada_Sucursal", "label": "Llegó a Envios Benjamin", "icon": Icons.warehouse},
        {"columna": "Entregado", "label": "Entregado al cliente", "icon": Icons.verified},
      ];
    } else {
      return [
        {"columna": "Ubicacion_1", "label": "Saliendo de Miami", "icon": Icons.sailing},
        {"columna": "Ubicacion_2", "label": "Transbordo en Panamá", "icon": Icons.hub},
        {"columna": "Ubicacion_3", "label": "Arribo a Puerto Cabello", "icon": Icons.anchor},
        {"columna": "Llegada_Sucursal", "label": "Llegó a Envios Benjamin", "icon": Icons.warehouse},
        {"columna": "Entregado", "label": "Entregado al cliente", "icon": Icons.verified},
      ];
    }
  }

  @override
  Widget build(BuildContext context) {
    if (selectedUbicacion == null) return const SizedBox.shrink();

    final ubicacionActual = ubicaciones.firstWhere(
      (u) => u['columna'] == selectedUbicacion,
      orElse: () => {"label": "Actualizar Estado", "icon": Icons.help_outline},
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'SIGUIENTE PASO DETECTADO',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: goldChampagne.withOpacity(0.7),
              letterSpacing: 1.5,
            ),
          ),
        ),
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => onSeleccionarUbicacion(selectedUbicacion!, ubicacionActual['label']),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: goldChampagne.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: goldChampagne.withOpacity(0.2),
                  width: 1.5,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: goldChampagne.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      ubicacionActual['icon'],
                      size: 24,
                      color: goldChampagne,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ubicacionActual['label'],
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: textLight,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Toca para tomar foto y confirmar',
                          style: TextStyle(
                            fontSize: 12,
                            color: textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.arrow_forward_ios,
                    size: 14,
                    color: goldChampagne.withOpacity(0.5),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}