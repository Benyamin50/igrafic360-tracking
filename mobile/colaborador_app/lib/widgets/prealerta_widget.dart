import 'package:flutter/material.dart';

class PrealertaWidget extends StatelessWidget {
  final String? clienteNombre;
  final String? trackingOriginal;
  final String? descripcionCliente;
  final Color goldChampagne;
  final Color textLight;

  const PrealertaWidget({
    super.key,
    this.clienteNombre,
    this.trackingOriginal,
    this.descripcionCliente,
    required this.goldChampagne,
    required this.textLight,
  });

  @override
  Widget build(BuildContext context) {
    if (clienteNombre == null && trackingOriginal == null && descripcionCliente == null) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 24), // Espaciado consistente para que no empuje todo
      decoration: BoxDecoration(
        color: const Color(0xFF162032), // cardDark
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: goldChampagne.withOpacity(0.2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Cabecera con fondo sutil
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: goldChampagne.withOpacity(0.05),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Icon(Icons.assignment_ind, color: goldChampagne, size: 18),
                const SizedBox(width: 10),
                Text(
                  'DATOS DE PREALERTA',
                  style: TextStyle(
                    color: goldChampagne,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (clienteNombre != null) ...[
                  _buildInfoRow(Icons.person_outline, 'Cliente', clienteNombre!),
                  const SizedBox(height: 12),
                ],
                if (trackingOriginal != null) ...[
                  _buildInfoRow(Icons.tag, 'Tracking Original', trackingOriginal!),
                  const SizedBox(height: 12),
                ],
                _buildInfoRow(
                  Icons.description_outlined, 
                  'Descripción', 
                  descripcionCliente ?? 'Sin descripción proporcionada'
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: goldChampagne.withOpacity(0.5)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  color: goldChampagne.withOpacity(0.6),
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  color: textLight,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}