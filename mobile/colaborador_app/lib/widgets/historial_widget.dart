import 'package:flutter/material.dart';

class HistorialWidget extends StatelessWidget {
  final List<Map<String, dynamic>> historial;
  final Color goldChampagne;
  final Color textLight;
  final Color textMuted;
  final Color cardDark;

  const HistorialWidget({
    super.key,
    required this.historial,
    required this.goldChampagne,
    required this.textLight,
    required this.textMuted,
    required this.cardDark,
  });

  @override
  Widget build(BuildContext context) {
    if (historial.isEmpty) return const SizedBox.shrink();

    // 🔥 Se eliminó el "Expanded" que rompía la pantalla
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: goldChampagne.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Icon(Icons.history, color: goldChampagne, size: 20),
                const SizedBox(width: 10),
                Text(
                  'HISTORIAL DEL PAQUETE',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: goldChampagne,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
          Divider(color: goldChampagne.withOpacity(0.1), height: 1),
          
          // 🔥 Se cambió el ListView por Column para evitar choques de Scroll
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              children: historial.map((evento) {
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: (evento['color'] as Color).withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(evento['icon'], color: evento['color'], size: 18),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              evento['evento'],
                              style: TextStyle(color: textLight, fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              evento['fecha'],
                              style: TextStyle(color: textMuted, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}