import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const TrackingApp());
}

class TrackingApp extends StatelessWidget {
  const TrackingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tracking - Actualizar Envios',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        primaryColor: const Color(0xFFD4AF37),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFD4AF37),
          secondary: Color(0xFFAA7C11),
          surface: Color(0xFF162032),
          background: Color(0xFF0B0F19),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0B0F19),
          elevation: 0,
          centerTitle: true,
          iconTheme: IconThemeData(color: Color(0xFFD4AF37)),
        ),
        textTheme: const TextTheme(
          bodyMedium: TextStyle(color: Color(0xFFE2E8F0)),
          bodyLarge: TextStyle(color: Color(0xFFE2E8F0)),
        ),
      ),
      home: const LoginScreen(),
    );
  }
}