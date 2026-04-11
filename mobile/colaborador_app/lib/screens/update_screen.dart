import 'package:flutter/material.dart';
import 'package:qr_code_scanner_plus/qr_code_scanner_plus.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../services/cloudinary_service.dart';
import '../utils/coordenadas.dart';
import 'dart:io';

class UpdateScreen extends StatefulWidget {
  final Map<String, dynamic>? usuario;

  const UpdateScreen({super.key, this.usuario});

  @override
  State<UpdateScreen> createState() => _UpdateScreenState();
}

class _UpdateScreenState extends State<UpdateScreen> {
  final TextEditingController _trackingController = TextEditingController();
  final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');
  QRViewController? qrController;
  bool _isScanning = false;

  String? _selectedUbicacion;
  bool _isLoading = false;
  String? _successMessage;
  String? _errorMessage;

  List<Map<String, dynamic>> _historial = [];
  Map<String, dynamic> _estadoActual = {};

  bool _pagado = false;
  String? _estadoPago;
  String? _clienteNombre;

  Map<String, dynamic>? _usuario;

  String? _ultimaFotoUrl;

  final Color midnightBlue = const Color(0xFF0B0F19);
  final Color cardDark = const Color(0xFF162032);
  final Color goldChampagne = const Color(0xFFD4AF37);
  final Color textLight = const Color(0xFFE2E8F0);
  final Color textMuted = const Color(0xFFA0AEC0);

  final List<Map<String, dynamic>> ubicaciones = [
    {
      "columna": "Ubicacion_1",
      "label": "Saliendo de Miami",
      "icon": Icons.directions_boat,
    },
    {
      "columna": "Ubicacion_2",
      "label": "En aduana venezolana",
      "icon": Icons.local_shipping,
    },
    {
      "columna": "Ubicacion_3",
      "label": "En ruta a sucursal",
      "icon": Icons.location_city,
    },
    {
      "columna": "Llegada_Sucursal",
      "label": "Llego a Envios Benjamin",
      "icon": Icons.store,
    },
    {
      "columna": "Entregado",
      "label": "Entregado al cliente",
      "icon": Icons.check_circle,
    },
  ];

  @override
  void initState() {
    super.initState();
    _usuario = widget.usuario;
  }

  @override
  void dispose() {
    qrController?.dispose();
    super.dispose();
  }

  void _scanQR() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: midnightBlue,
      shape: Border(
        top: BorderSide(color: goldChampagne.withOpacity(0.5), width: 2),
      ),
      builder: (context) => Container(
        height: 550,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: textMuted.withOpacity(0.5),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'ESCANEAR CODIGO QR',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: goldChampagne,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: QRView(
                  key: qrKey,
                  onQRViewCreated: _onQRViewCreated,
                  overlay: QrScannerOverlayShape(
                    borderColor: goldChampagne,
                    borderRadius: 10,
                    borderLength: 30,
                    borderWidth: 8,
                    cutOutSize: 300,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 15),
            TextButton(
              onPressed: () {
                qrController?.pauseCamera();
                Navigator.pop(context);
              },
              child: Text(
                'Cancelar',
                style: TextStyle(color: textMuted, fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _onQRViewCreated(QRViewController controller) {
    setState(() {
      qrController = controller;
      _isScanning = true;
    });

    controller.scannedDataStream.listen((scanData) {
      if (_isScanning) {
        setState(() {
          _trackingController.text = scanData.code!;
          _isScanning = false;
        });
        qrController?.pauseCamera();
        Navigator.pop(context);

        _consultarEstadoActual(scanData.code!);
      }
    });
  }

  Future<void> _consultarEstadoActual(String trackingId) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _historial = [];
      _selectedUbicacion = null;
      _ultimaFotoUrl = null;
      _pagado = false;
      _estadoPago = null;
      _clienteNombre = null;
    });

    try {
      final estadoCompleto = await ApiService.obtenerEstadoCompleto(trackingId);

      final estado = estadoCompleto['estado'] as Map<String, dynamic>;
      _pagado = estadoCompleto['pagado'] ?? false;
      _estadoPago = estadoCompleto['estado_pago'];
      _clienteNombre = estadoCompleto['cliente_nombre'];

      setState(() {
        _estadoActual = estado;
        _historial = _convertirEstadoAHistorial(estado);
      });

      if (estado['Entregado'].isNotEmpty) {
        setState(() {
          _successMessage = "Este paquete ya fue entregado";
          _selectedUbicacion = null;
        });
        return;
      }

      bool isLastStep =
          estado['Llegada_Sucursal'].isNotEmpty && estado['Entregado'].isEmpty;

      if (isLastStep && !_pagado) {
        setState(() {
          _errorMessage =
              "CLIENTE NO HA PAGADO. No se puede marcar como entregado.";
          _selectedUbicacion = null;
        });
        return;
      }

      if (estado['Ubicacion_1'].isEmpty) {
        _seleccionarUbicacion("Ubicacion_1", "Saliendo de Miami");
      } else if (estado['Ubicacion_2'].isEmpty) {
        _seleccionarUbicacion("Ubicacion_2", "En aduana venezolana");
      } else if (estado['Ubicacion_3'].isEmpty) {
        _seleccionarUbicacion("Ubicacion_3", "En ruta a sucursal");
      } else if (estado['Llegada_Sucursal'].isEmpty) {
        _seleccionarUbicacion("Llegada_Sucursal", "Llego a Envios Benjamin");
      } else if (estado['Entregado'].isEmpty) {
        if (!_pagado) {
          setState(() {
            _errorMessage =
                "CLIENTE NO HA PAGADO. No se puede marcar como entregado.";
            _selectedUbicacion = null;
          });
        } else {
          _seleccionarUbicacion("Entregado", "Entregado al cliente");
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = "Error al consultar: ${e.toString()}";
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  List<Map<String, dynamic>> _convertirEstadoAHistorial(
    Map<String, dynamic> estado,
  ) {
    List<Map<String, dynamic>> historial = [];

    if (estado['Origen_paquete-recibido'].isNotEmpty) {
      historial.add({
        'evento': estado['Origen_paquete-recibido'],
        'fecha': estado['Fecha_Origen'],
        'icon': Icons.inbox,
        'color': textMuted,
      });
    }
    if (estado['Ubicacion_1'].isNotEmpty) {
      historial.add({
        'evento': estado['Ubicacion_1'],
        'fecha': estado['Fecha_1'],
        'icon': Icons.directions_boat,
        'color': textMuted,
      });
    }
    if (estado['Ubicacion_2'].isNotEmpty) {
      historial.add({
        'evento': estado['Ubicacion_2'],
        'fecha': estado['Fecha_2'],
        'icon': Icons.local_shipping,
        'color': textMuted,
      });
    }
    if (estado['Ubicacion_3'].isNotEmpty) {
      historial.add({
        'evento': estado['Ubicacion_3'],
        'fecha': estado['Fecha_3'],
        'icon': Icons.location_city,
        'color': textMuted,
      });
    }
    if (estado['Llegada_Sucursal'].isNotEmpty) {
      historial.add({
        'evento': estado['Llegada_Sucursal'],
        'fecha': estado['Fecha_4'],
        'icon': Icons.store,
        'color': textMuted,
      });
    }
    if (estado['Entregado'].isNotEmpty) {
      historial.add({
        'evento': estado['Entregado'],
        'fecha': estado['Fecha_5'],
        'icon': Icons.check_circle,
        'color': goldChampagne,
      });
    }

    return historial;
  }

  void _seleccionarUbicacion(String columna, String label) {
    setState(() {
      _selectedUbicacion = columna;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          "Siguiente paso: $label",
          style: TextStyle(color: midnightBlue, fontWeight: FontWeight.bold),
        ),
        backgroundColor: goldChampagne,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _actualizarConFoto(
    String trackingId,
    String columna,
    String label,
  ) async {
    try {
      setState(() => _isLoading = true);

      showModalBottomSheet(
        context: context,
        backgroundColor: midnightBlue,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          side: BorderSide(color: goldChampagne.withOpacity(0.3)),
        ),
        builder: (context) => SafeArea(
          child: Wrap(
            children: [
              Container(
                width: double.infinity,
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: goldChampagne.withOpacity(0.2)),
                  ),
                ),
                child: Text(
                  'AGREGAR FOTO',
                  style: TextStyle(
                    color: goldChampagne,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              ListTile(
                leading: Icon(Icons.camera_alt, color: goldChampagne),
                title: Text(
                  'Tomar foto con camara',
                  style: TextStyle(color: textLight),
                ),
                onTap: () async {
                  Navigator.pop(context);
                  await _procesarFoto(
                    trackingId,
                    columna,
                    label,
                    ImageSource.camera,
                  );
                },
              ),
              ListTile(
                leading: Icon(Icons.photo_library, color: goldChampagne),
                title: Text(
                  'Seleccionar de galeria',
                  style: TextStyle(color: textLight),
                ),
                onTap: () async {
                  Navigator.pop(context);
                  await _procesarFoto(
                    trackingId,
                    columna,
                    label,
                    ImageSource.gallery,
                  );
                },
              ),
              ListTile(
                leading: Icon(Icons.close, color: Colors.redAccent),
                title: Text(
                  'Cancelar',
                  style: TextStyle(color: Colors.redAccent),
                ),
                onTap: () => Navigator.pop(context),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      print('Error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _procesarFoto(
    String trackingId,
    String columna,
    String label,
    ImageSource source,
  ) async {
    try {
      setState(() => _isLoading = true);

      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );

      if (image == null) {
        print('Usuario cancelo');
        return;
      }

      String? fotoUrl = await CloudinaryService.subirFoto(File(image.path));

      if (fotoUrl == null) {
        throw Exception('No se pudo subir la foto');
      }

      bool guardado = await ApiService.guardarFotoUrl(
        trackingId,
        fotoUrl,
        columna,
      );

      if (!guardado) {
        throw Exception('Error guardando en base de datos');
      }

      bool actualizado = false;

      final coords = Coordenadas.getCoordenadas(columna);

      if (coords != null) {
        print(
          'Usando coordenadas: ${coords['lat']}, ${coords['lng']} para $columna',
        );

        actualizado = await ApiService.actualizarEstadoConCoordenadas(
          trackingId,
          columna,
          label,
          coords['lat']!,
          coords['lng']!,
        );
      } else {
        print('Sin coordenadas para $columna, usando endpoint normal');
        actualizado = await ApiService.actualizarEstado(
          trackingId,
          columna,
          label,
        );
      }

      if (actualizado) {
        setState(() {
          _successMessage = 'Foto guardada y estado actualizado';
          _selectedUbicacion = null;
          _trackingController.clear();
          _historial = [];
          _ultimaFotoUrl = fotoUrl;
        });

        if (qrController != null) {
          try {
            qrController!.resumeCamera();
          } catch (e) {
            print('Camara ya estaba cerrada');
          }
        }

        _mostrarFotoPreview(fotoUrl);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Foto guardada correctamente'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
      } else {
        throw Exception('Error actualizando estado');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _mostrarFotoPreview(String fotoUrl) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: midnightBlue,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(15),
          side: BorderSide(color: goldChampagne.withOpacity(0.3)),
        ),
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'FOTO GUARDADA',
                style: TextStyle(
                  color: goldChampagne,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.network(
                  CloudinaryService.getWebPUrl(fotoUrl, width: 400),
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Image.network(fotoUrl),
                  loadingBuilder: (_, child, progress) {
                    if (progress == null) return child;
                    return Center(
                      child: CircularProgressIndicator(color: goldChampagne),
                    );
                  },
                ),
              ),
              SizedBox(height: 16),
              Text(
                'La foto se ha guardado correctamente',
                style: TextStyle(color: textMuted),
                textAlign: TextAlign.center,
              ),
              SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: goldChampagne,
                  foregroundColor: midnightBlue,
                  minimumSize: Size(double.infinity, 45),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text('CERRAR'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: midnightBlue,
      appBar: AppBar(
        title: Text(
          'ACTUALIZAR ENVIO',
          style: TextStyle(
            color: goldChampagne,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.5,
            fontSize: 18,
          ),
        ),
        backgroundColor: midnightBlue,
        elevation: 0,
        centerTitle: true,
        bottom: _usuario != null
            ? PreferredSize(
                preferredSize: const Size.fromHeight(30.0),
                child: Container(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    'Empleado: ${_usuario!['nombre']}',
                    style: TextStyle(
                      color: goldChampagne.withValues(alpha: 0.7),
                      fontSize: 12,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            : null,
        actions: [
          IconButton(
            icon: Icon(Icons.qr_code_scanner, color: goldChampagne),
            onPressed: _scanQR,
            tooltip: 'Escanear QR',
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Card(
              elevation: 10,
              color: cardDark,
              shadowColor: Colors.black45,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(15),
                side: BorderSide(color: Colors.white.withOpacity(0.05)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    TextField(
                      controller: _trackingController,
                      style: TextStyle(
                        color: textLight,
                        fontSize: 18,
                        letterSpacing: 1,
                      ),
                      decoration: InputDecoration(
                        labelText: 'Tracking ID',
                        labelStyle: TextStyle(color: textMuted),
                        hintText: 'Ej: VNZ-010',
                        hintStyle: TextStyle(color: Colors.white30),
                        filled: true,
                        fillColor: Colors.black26,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(
                            color: goldChampagne.withOpacity(0.3),
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide(
                            color: goldChampagne,
                            width: 1.5,
                          ),
                        ),
                        prefixIcon: Icon(Icons.qr_code, color: goldChampagne),
                        suffixIcon: IconButton(
                          icon: Icon(
                            Icons.qr_code_scanner,
                            color: goldChampagne,
                          ),
                          onPressed: _scanQR,
                        ),
                      ),
                      readOnly: true,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Escanea el QR para ver el historial y siguiente paso',
                      style: TextStyle(
                        color: textMuted.withOpacity(0.7),
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            if (_selectedUbicacion == 'Entregado' && !_pagado)
              Container(
                margin: const EdgeInsets.symmetric(vertical: 8),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.redAccent.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.redAccent.withOpacity(0.5)),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      color: Colors.redAccent,
                      size: 28,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'PAGO PENDIENTE',
                            style: TextStyle(
                              color: Colors.redAccent,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          Text(
                            'El cliente no ha realizado el pago. No se puede marcar como entregado.',
                            style: TextStyle(
                              color: Colors.redAccent.shade100,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

            if (_historial.isNotEmpty)
              Expanded(
                child: Card(
                  elevation: 10,
                  color: cardDark,
                  shadowColor: Colors.black45,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(15),
                    side: BorderSide(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.history, color: goldChampagne),
                            const SizedBox(width: 8),
                            Text(
                              'HISTORIAL DEL PAQUETE',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: goldChampagne,
                                letterSpacing: 1.5,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 15),
                        Expanded(
                          child: ListView.builder(
                            itemCount: _historial.length,
                            itemBuilder: (context, index) {
                              final evento = _historial[index];
                              return Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                color: Colors.white.withOpacity(0.03),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  side: BorderSide(
                                    color: Colors.white.withOpacity(0.05),
                                  ),
                                ),
                                child: ListTile(
                                  leading: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: evento['color'].withOpacity(0.1),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: evento['color'].withOpacity(0.5),
                                      ),
                                    ),
                                    child: Icon(
                                      evento['icon'],
                                      color: evento['color'],
                                      size: 20,
                                    ),
                                  ),
                                  title: Text(
                                    evento['evento'],
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: textLight,
                                    ),
                                  ),
                                  subtitle: Text(
                                    evento['fecha'],
                                    style: TextStyle(
                                      color: textMuted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

            if (_selectedUbicacion != null)
              Container(
                margin: const EdgeInsets.symmetric(vertical: 16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: goldChampagne.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(
                    color: goldChampagne.withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      'SIGUIENTE PASO:',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: textMuted,
                        letterSpacing: 2,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          ubicaciones.firstWhere(
                            (u) => u['columna'] == _selectedUbicacion,
                            orElse: () => {"icon": Icons.help},
                          )['icon'],
                          size: 35,
                          color: goldChampagne,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            ubicaciones.firstWhere(
                              (u) => u['columna'] == _selectedUbicacion,
                              orElse: () => {"label": "Actualizar"},
                            )['label'],
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: goldChampagne,
                            ),
                            textAlign: TextAlign.left,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

            if (_successMessage != null)
              Container(
                padding: const EdgeInsets.all(15),
                margin: const EdgeInsets.only(bottom: 15),
                decoration: BoxDecoration(
                  color: Colors.greenAccent.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: Colors.greenAccent.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.check_circle,
                      color: Colors.greenAccent.shade400,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _successMessage!,
                        style: TextStyle(color: Colors.greenAccent.shade100),
                      ),
                    ),
                  ],
                ),
              ),

            if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(15),
                margin: const EdgeInsets.only(bottom: 15),
                decoration: BoxDecoration(
                  color: Colors.redAccent.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error, color: Colors.redAccent.shade400),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(color: Colors.redAccent.shade100),
                      ),
                    ),
                  ],
                ),
              ),

            Container(
              width: double.infinity,
              height: 55,
              margin: EdgeInsets.only(top: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                gradient:
                    (_isLoading ||
                        _selectedUbicacion == null ||
                        _trackingController.text.isEmpty ||
                        (_selectedUbicacion == 'Entregado' && !_pagado))
                    ? null
                    : LinearGradient(
                        colors: [goldChampagne, Color(0xFFAA7C11)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                color:
                    (_isLoading ||
                        _selectedUbicacion == null ||
                        _trackingController.text.isEmpty ||
                        (_selectedUbicacion == 'Entregado' && !_pagado))
                    ? Colors.white.withOpacity(0.05)
                    : null,
                boxShadow:
                    (_isLoading ||
                        _selectedUbicacion == null ||
                        _trackingController.text.isEmpty ||
                        (_selectedUbicacion == 'Entregado' && !_pagado))
                    ? null
                    : [
                        BoxShadow(
                          color: goldChampagne.withOpacity(0.3),
                          blurRadius: 15,
                        ),
                      ],
              ),
              child: ElevatedButton(
                onPressed:
                    (_isLoading ||
                        _selectedUbicacion == null ||
                        _trackingController.text.isEmpty ||
                        (_selectedUbicacion == 'Entregado' && !_pagado))
                    ? null
                    : () => _actualizarConFoto(
                        _trackingController.text,
                        _selectedUbicacion!,
                        ubicaciones.firstWhere(
                          (u) => u['columna'] == _selectedUbicacion,
                          orElse: () => {"label": "Actualizar"},
                        )['label'],
                      ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: _isLoading
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
                        _selectedUbicacion == null ||
                                _trackingController.text.isEmpty
                            ? 'ESCANEA UN QR'
                            : (_selectedUbicacion == 'Entregado' && !_pagado)
                            ? 'PAGO PENDIENTE - NO ENTREGAR'
                            : 'TOMAR FOTO Y CONFIRMAR',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color:
                              (_isLoading ||
                                  _selectedUbicacion == null ||
                                  _trackingController.text.isEmpty ||
                                  (_selectedUbicacion == 'Entregado' &&
                                      !_pagado))
                              ? textMuted
                              : midnightBlue,
                          letterSpacing: 1,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
