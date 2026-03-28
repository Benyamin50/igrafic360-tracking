import 'package:flutter/material.dart';
import 'screens/update_screen.dart';

void main() {
  runApp(const TrackingApp());
}

class TrackingApp extends StatelessWidget {
  const TrackingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tracking - Actualizar Envíos',
      debugShowCheckedModeBanner: false, // Oculta la etiqueta de "DEBUG"
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark, // Fuerza el modo oscuro en toda la app
        scaffoldBackgroundColor: const Color(0xFF0B0F19), // Azul Medianoche
        primaryColor: const Color(0xFFD4AF37), // Dorado Champagne
        
        // Define la paleta de colores global
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFD4AF37), // Color principal para botones e inputs
          secondary: Color(0xFFAA7C11), // Dorado más oscuro para acentos
          surface: Color(0xFF162032), // Color para las tarjetas (Cards)
          background: Color(0xFF0B0F19),
        ),

        // Configuración global de la barra superior
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0B0F19),
          elevation: 0,
          centerTitle: true,
          iconTheme: IconThemeData(color: Color(0xFFD4AF37)),
        ),

        // Configuración global de los textos base
        textTheme: const TextTheme(
          bodyMedium: TextStyle(color: Color(0xFFE2E8F0)), // Blanco roto elegante
          bodyLarge: TextStyle(color: Color(0xFFE2E8F0)),
        ),
      ),
      home: const UpdateScreen(),
    );
  }
}