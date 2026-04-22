// lib/widgets/boton_foto_widget.dart
import 'package:flutter/material.dart';

class BotonFotoWidget extends StatelessWidget {
  final VoidCallback onPressed;
  final bool isLoading;
  final bool isDisabled;
  final String texto;
  final Color goldChampagne;
  final Color midnightBlue;
  final Color textMuted;

  const BotonFotoWidget({
    super.key,
    required this.onPressed,
    required this.isLoading,
    required this.isDisabled,
    required this.texto,
    required this.goldChampagne,
    required this.midnightBlue,
    required this.textMuted,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 55,
      margin: EdgeInsets.only(top: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        gradient: isDisabled
            ? null
            : LinearGradient(
                colors: [goldChampagne, const Color(0xFFAA7C11)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
        color: isDisabled ? Colors.white.withOpacity(0.05) : null,
        boxShadow: isDisabled
            ? null
            : [
                BoxShadow(
                  color: goldChampagne.withOpacity(0.3),
                  blurRadius: 15,
                ),
              ],
      ),
      child: ElevatedButton(
        onPressed: isDisabled ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        child: isLoading
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: midnightBlue,
                      strokeWidth: 2,
                    ),
                  ),
                  SizedBox(width: 10),
                  Text(
                    'PROCESANDO...',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: midnightBlue,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              )
            : Text(
                texto,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDisabled ? textMuted : midnightBlue,
                  letterSpacing: 1,
                ),
              ),
      ),
    );
  }
}