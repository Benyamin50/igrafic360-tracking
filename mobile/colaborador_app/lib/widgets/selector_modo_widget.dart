import 'package:flutter/material.dart';

enum ModoEscaneo { seguimiento, prealerta, contenedor }

class SelectorModoWidget extends StatelessWidget {
  final ModoEscaneo modoEscaneo;
  final Function(ModoEscaneo) onChanged;
  final Map<String, dynamic>? usuario;
  final Color goldChampagne;
  final Color cardDark;
  final Color textMuted;
  final Color midnightBlue;

  const SelectorModoWidget({
    super.key,
    required this.modoEscaneo,
    required this.onChanged,
    this.usuario,
    required this.goldChampagne,
    required this.cardDark,
    required this.textMuted,
    required this.midnightBlue,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: midnightBlue,
        border: Border(bottom: BorderSide(color: goldChampagne.withOpacity(0.1), width: 1)),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: [
                _buildTab(ModoEscaneo.seguimiento, 'SEG.', Icons.track_changes),
                const SizedBox(width: 8),
                _buildTab(ModoEscaneo.prealerta, 'PRE.', Icons.notification_add),
                const SizedBox(width: 8),
                _buildTab(ModoEscaneo.contenedor, 'CONT.', Icons.qr_code_scanner),
              ],
            ),
          ),
          if (usuario != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.person, size: 12, color: goldChampagne.withOpacity(0.5)),
                  const SizedBox(width: 6),
                  Text(
                    '${usuario!['nombre']}'.toUpperCase(),
                    style: TextStyle(
                      color: goldChampagne.withOpacity(0.6),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTab(ModoEscaneo modo, String label, IconData icon) {
    final bool isSelected = modoEscaneo == modo;
    
    return Expanded(
      child: GestureDetector(
        onTap: () => onChanged(modo),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? goldChampagne : cardDark,
            borderRadius: BorderRadius.circular(12),
            boxShadow: isSelected 
              ? [BoxShadow(color: goldChampagne.withOpacity(0.2), blurRadius: 8, offset: const Offset(0, 4))]
              : [],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon, 
                size: 18, 
                color: isSelected ? midnightBlue : textMuted
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? midnightBlue : textMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}