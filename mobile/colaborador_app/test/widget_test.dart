import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:colaborador_app/main.dart';  // 👈 Mantenemos este nombre (el del pubspec)

void main() {
  testWidgets('App debería iniciar sin errores', (WidgetTester tester) async {
    // Construye la app con el nuevo nombre TrackingApp
    await tester.pumpWidget(const TrackingApp());

    // 👇 AQUÍ ESTÁ EL CAMBIO: Verificamos el nuevo título de lujo (sin emoji y en mayúsculas)
    expect(find.text('ACTUALIZAR ENVÍO'), findsOneWidget);
    
    // Verifica que el campo de texto existe
    expect(find.byType(TextField), findsOneWidget);
    
    // Verifica que el botón de QR existe
    expect(find.byIcon(Icons.qr_code_scanner), findsOneWidget);
  });
}