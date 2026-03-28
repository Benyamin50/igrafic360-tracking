// lib/services/cloudinary_service.dart
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

class CloudinaryService {
  // ============================================
  // TUS DATOS DE CLOUDINARY (YA CONFIGURADOS)
  // ============================================
  static const String cloudName = 'dv7im5w4g';
  static const String uploadPreset = 'tracking_preset';
  
  // URL de subida (no cambiar)
  static const String uploadUrl = 'https://api.cloudinary.com/v1_1/$cloudName/image/upload';

  // ============================================
  // 📸 TOMAR FOTO CON LA CÁMARA
  // ============================================
  static Future<File?> tomarFoto() async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );
      
      if (image != null) {
        print('✅ Foto tomada: ${image.path}');
        return File(image.path);
      } else {
        print('❌ No se tomó ninguna foto');
        return null;
      }
    } catch (e) {
      print('❌ Error al tomar foto: $e');
      return null;
    }
  }

  // ============================================
  // 🖼️ SELECCIONAR DE LA GALERÍA
  // ============================================
  static Future<File?> seleccionarDeGaleria() async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
      );
      
      if (image != null) {
        print('✅ Imagen seleccionada: ${image.path}');
        return File(image.path);
      } else {
        print('❌ No se seleccionó ninguna imagen');
        return null;
      }
    } catch (e) {
      print('❌ Error al seleccionar imagen: $e');
      return null;
    }
  }

  // ============================================
  // ⬆️ SUBIR FOTO A CLOUDINARY (SIN TRANSFORMACIÓN)
  // ============================================
  static Future<String?> subirFoto(File imagen) async {
    try {
      print('📤 Subiendo imagen a Cloudinary...');
      print('📁 Archivo: ${imagen.path}');
      print('📏 Tamaño: ${await imagen.length()} bytes');
      
      // Crear petición multipart
      var request = http.MultipartRequest('POST', Uri.parse(uploadUrl));
      
      // Agregar los campos requeridos (SIN TRANSFORMATION)
      request.fields['upload_preset'] = uploadPreset;
      request.fields['folder'] = 'paquetes';
      
      // Agregar la imagen
      request.files.add(
        await http.MultipartFile.fromPath(
          'file',
          imagen.path,
          filename: 'paquete_${DateTime.now().millisecondsSinceEpoch}.jpg',
        ),
      );
      
      // Enviar petición
      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);
      
      print('📡 Código de respuesta: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        var data = json.decode(response.body);
        String imageUrl = data['secure_url'];
        print('✅ Imagen subida exitosamente: $imageUrl');
        return imageUrl;
      } else {
        print('❌ Error en la respuesta: ${response.body}');
        return null;
      }
      
    } catch (e) {
      print('❌ Excepción al subir: $e');
      return null;
    }
  }

  // ============================================
  // 📸 MÉTODO COMBINADO: TOMAR FOTO Y SUBIR
  // ============================================
  static Future<String?> tomarYSubirFoto() async {
    final foto = await tomarFoto();
    if (foto != null) {
      return await subirFoto(foto);
    }
    return null;
  }

  // ============================================
  // 🖼️ MÉTODO COMBINADO: SELECCIONAR Y SUBIR
  // ============================================
  static Future<String?> seleccionarYSubirFoto() async {
    final foto = await seleccionarDeGaleria();
    if (foto != null) {
      return await subirFoto(foto);
    }
    return null;
  }

  // ============================================
  // 🔗 OBTENER URL EN FORMATO WEBP (para mostrar)
  // ============================================
  static String getWebPUrl(String originalUrl, {int width = 800, int height = 800}) {
    try {
      // Extraer el public_id de la URL original
      final uri = Uri.parse(originalUrl);
      final pathParts = uri.path.split('/');
      final publicId = pathParts.last;
      
      // Construir URL con formato WebP, tamaño optimizado y calidad automática
      return 'https://res.cloudinary.com/$cloudName/image/upload/c_fill,w_$width,h_$height,f_webp,q_auto/paquetes/$publicId';
    } catch (e) {
      print('Error generando WebP URL: $e');
      return originalUrl;
    }
  }
  
  // ============================================
  // 🖼️ VERSIÓN SIMPLIFICADA (solo WebP, sin redimensionar)
  // ============================================
  static String getWebPUrlSimple(String originalUrl) {
    try {
      final uri = Uri.parse(originalUrl);
      final pathParts = uri.path.split('/');
      final publicId = pathParts.last;
      
      return 'https://res.cloudinary.com/$cloudName/image/upload/f_webp,q_auto/paquetes/$publicId';
    } catch (e) {
      return originalUrl;
    }
  }
}