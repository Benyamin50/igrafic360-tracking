// lib/screens/update_screen.dart
import 'package:flutter/material.dart';
import 'package:qr_code_scanner_plus/qr_code_scanner_plus.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../services/api_service.dart';
import '../services/cloudinary_service.dart';
import '../utils/coordenadas.dart';
import 'envios_screen.dart';
import '../widgets/boton_foto_widget.dart'; 

enum ModoEscaneo { seguimiento, prealerta, contenedor }

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
  
  ModoEscaneo _modoEscaneo = ModoEscaneo.seguimiento;

  String? _selectedUbicacion;
  bool _isLoading = false;
  String? _successMessage;
  String? _errorMessage;

  List<Map<String, dynamic>> _historial = [];
  
  bool _pagado = false;
  String? _clienteNombre;
  String? _tipoEnvio;
  
  bool _esPrealerta = false;
  String? _descripcionCliente;
  String? _trackingOriginal;

  Map<String, dynamic>? _usuario;

  final Color midnightBlue = const Color(0xFF0B0F19);
  final Color cardDark = const Color(0xFF162032);
  final Color goldChampagne = const Color(0xFFD4AF37);
  final Color textLight = const Color(0xFFE2E8F0);
  final Color textMuted = const Color(0xFFA0AEC0);

  @override
  void initState() {
    super.initState();
    _usuario = widget.usuario;
  }

  @override
  void dispose() {
    qrController?.dispose();
    _trackingController.dispose();
    super.dispose();
  }

  // ==========================================
  // LÓGICA DE NEGOCIO
  // ==========================================
  
  void _procesarCodigo(String codigo) {
    final esContenedor = codigo.toUpperCase().startsWith('AEREO-') || codigo.toUpperCase().startsWith('MARITIMO-');
    if (esContenedor) {
      _procesarSalidaContenedor(codigo);
    } else if (_modoEscaneo == ModoEscaneo.prealerta) {
      _procesarPrealerta(codigo);
    } else {
      _consultarEstadoActual(codigo);
    }
  }

  void _scanQR() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: midnightBlue,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.7,
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(width: 50, height: 5, decoration: BoxDecoration(color: goldChampagne.withOpacity(0.3), borderRadius: BorderRadius.circular(10))),
            const SizedBox(height: 24),
            Text('ESCANEAR CÓDIGO QR', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: goldChampagne, letterSpacing: 1.5)),
            const SizedBox(height: 24),
            Expanded(child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: QRView(key: qrKey, onQRViewCreated: _onQRViewCreated,
                overlay: QrScannerOverlayShape(borderColor: goldChampagne, borderRadius: 16, borderLength: 40, borderWidth: 8, cutOutSize: 300)),
            )),
            const SizedBox(height: 20),
            TextButton.icon(
              onPressed: () { qrController?.pauseCamera(); Navigator.pop(context); },
              icon: Icon(Icons.close, color: Colors.redAccent),
              label: Text('Cancelar', style: TextStyle(color: Colors.redAccent, fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  void _onQRViewCreated(QRViewController controller) {
    qrController = controller;
    controller.scannedDataStream.listen((scanData) async {
      final codigo = scanData.code!;
      _trackingController.text = codigo;
      qrController?.pauseCamera();
      Navigator.pop(context);
      _procesarCodigo(codigo);
    });
  }

  Future<void> _procesarSalidaContenedor(String codigoQr) async {
    setState(() { _isLoading = true; _errorMessage = null; _successMessage = null; });
    try {
      final isAereo = codigoQr.toUpperCase().startsWith('AEREO-');
      final enviosResp = await ApiService.obtenerEnviosActivos(todos: true);
      final envios = enviosResp['envios'] as List;
      final envio = envios.firstWhere((e) => e['codigo_qr'] == codigoQr, orElse: () => null);

      if (envio == null) throw Exception('Contenedor no encontrado.');
      if (envio['estado'] == 'finalizado') throw Exception('Este contenedor ya llegó a la Sucursal y está FINALIZADO.');

      final paquetesResp = await ApiService.obtenerPaquetesEnvio(envio['id']);
      final paquetes = paquetesResp['paquetes'] as List;
      if (paquetes.isEmpty) throw Exception('El contenedor está vacío.');

      final primerTracking = paquetes[0]['tracking_id'];
      final estadoActual = await ApiService.obtenerEstado(primerTracking);
      Map<String, String>? siguientePaso;

      if (estadoActual['Ubicacion_1'] == null || estadoActual['Ubicacion_1'].isEmpty) {
        siguientePaso = {'columna': 'Ubicacion_1', 'valor': isAereo ? 'En vuelo hacia Venezuela' : 'Saliendo de Miami', 'titulo': 'PASO 1: Salida de Origen'};
      } else if (estadoActual['Ubicacion_2'] == null || estadoActual['Ubicacion_2'].isEmpty) {
        siguientePaso = {'columna': 'Ubicacion_2', 'valor': isAereo ? 'Arribo a Maiquetía (CCS)' : 'Transbordo en Colon (Panama)', 'titulo': 'PASO 2: Llegada / Transbordo'};
      } else if (estadoActual['Ubicacion_3'] == null || estadoActual['Ubicacion_3'].isEmpty) {
        siguientePaso = {'columna': 'Ubicacion_3', 'valor': isAereo ? 'En ruta a sucursal' : 'Arribo a Puerto Cabello', 'titulo': 'PASO 3: Tránsito Interno'};
      } else if (estadoActual['Llegada_Sucursal'] == null || estadoActual['Llegada_Sucursal'].isEmpty) {
        siguientePaso = {'columna': 'Llegada_Sucursal', 'valor': 'Llego a Envios Benjamin', 'titulo': 'PASO 4: Llegada a Sucursal'};
      } else {
        throw Exception('El contenedor ya completó toda su ruta.');
      }

      setState(() => _isLoading = false);
      final confirmar = await _mostrarDialogoSiguientePaso(codigoQr, siguientePaso, isAereo);
      if (confirmar != true) return;

      setState(() => _isLoading = true);
      final resultado = await ApiService.procesarSalidaEnvioConUbicacion(codigoQr: codigoQr, columna: siguientePaso['columna']!, valor: siguientePaso['valor']!);

      setState(() { _successMessage = '✅ ${resultado['mensaje']}\nℹ️ ${resultado['siguiente_paso']}'; _trackingController.clear(); });
    } catch (e) {
      setState(() => _errorMessage = e.toString().replaceAll('Exception: ', ''));
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<bool?> _mostrarDialogoSiguientePaso(String codigoQr, Map<String, String> paso, bool isAereo) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: goldChampagne.withOpacity(0.3))),
        title: Column(
          children: [
            Container(padding: EdgeInsets.all(16), decoration: BoxDecoration(color: goldChampagne.withOpacity(0.1), shape: BoxShape.circle), child: Icon(isAereo ? Icons.flight_takeoff : Icons.directions_boat, color: goldChampagne, size: 32)),
            const SizedBox(height: 16),
            Text('AVANCE DE CONTENEDOR', style: TextStyle(color: textMuted, fontSize: 12, letterSpacing: 1.5, fontWeight: FontWeight.bold)),
            Text(codigoQr, style: TextStyle(color: goldChampagne, fontSize: 16, fontWeight: FontWeight.w900)),
          ],
        ),
        content: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: midnightBlue, borderRadius: BorderRadius.circular(16), border: Border.all(color: goldChampagne.withOpacity(0.2))),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(paso['titulo']!, style: TextStyle(color: textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(paso['valor']!, style: TextStyle(color: Colors.greenAccent, fontSize: 18, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text('Cancelar', style: TextStyle(color: Colors.redAccent))),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: goldChampagne, foregroundColor: midnightBlue, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            child: Text('Confirmar Avance', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      )
    );
  }

  Future<void> _procesarPrealerta(String trackingId) async {
    setState(() { _isLoading = true; _errorMessage = null; _successMessage = null; });
    try {
      final prealerta = await ApiService.buscarPrealerta(trackingId);
      if (prealerta != null && prealerta['found'] == true) {
        _esPrealerta = true;
        _descripcionCliente = prealerta['descripcion'];
        _trackingOriginal = trackingId;
        _clienteNombre = prealerta['cliente_nombre'];
        final resultado = await ApiService.crearPaqueteDesdePrealerta(trackingOriginal: trackingId, peso: 'Pendiente', precio: 'Pendiente');
        if (resultado != null) {
          setState(() { _successMessage = '✅ Prealerta registrada!\nTracking: ${resultado['tracking_id']}'; _trackingController.clear(); });
        } else { throw Exception('Error al registrar'); }
      } else {
        setState(() { _errorMessage = "No se encontró prealerta para: $trackingId"; });
      }
    } catch (e) { setState(() { _errorMessage = e.toString(); }); }
    finally { setState(() => _isLoading = false); }
  }

  Future<void> _consultarEstadoNormal(String trackingId) async {
    setState(() { _isLoading = true; _errorMessage = null; _historial = []; _selectedUbicacion = null; _pagado = false; _tipoEnvio = null; });
    try {
      final estadoCompleto = await ApiService.obtenerEstadoCompleto(trackingId);
      final estado = estadoCompleto['estado'] as Map<String, dynamic>;
      _pagado = estadoCompleto['pagado'] ?? false;
      _tipoEnvio = estadoCompleto['tipo_envio'] ?? 'maritimo';
      setState(() { _historial = _convertirEstadoAHistorial(estado); });
      
      if (estado['Entregado'].isNotEmpty) { setState(() { _successMessage = "✅ Paquete ya entregado"; }); return; }
      bool isLastStep = estado['Llegada_Sucursal'].isNotEmpty && estado['Entregado'].isEmpty;
      if (isLastStep && !_pagado) { setState(() { _errorMessage = "⚠️ PAGO PENDIENTE. No entregar."; }); return; }
      
      if (estado['Ubicacion_1'].isEmpty) setState(() => _selectedUbicacion = 'Ubicacion_1');
      else if (estado['Ubicacion_2'].isEmpty) setState(() => _selectedUbicacion = 'Ubicacion_2');
      else if (estado['Ubicacion_3'].isEmpty) setState(() => _selectedUbicacion = 'Ubicacion_3');
      else if (estado['Llegada_Sucursal'].isEmpty) setState(() => _selectedUbicacion = 'Llegada_Sucursal');
      else if (estado['Entregado'].isEmpty && _pagado) setState(() => _selectedUbicacion = 'Entregado');
    } catch (e) { setState(() { _errorMessage = e.toString(); }); }
    finally { setState(() => _isLoading = false); }
  }

  Future<void> _consultarEstadoActual(String trackingId) async {
    setState(() { _isLoading = true; _errorMessage = null; _historial = []; _selectedUbicacion = null; _pagado = false; _tipoEnvio = null; _esPrealerta = false; });
    try {
      final prealerta = await ApiService.buscarPrealerta(trackingId);
      if (prealerta != null && prealerta['found'] == true) {
        _esPrealerta = true;
        _descripcionCliente = prealerta['descripcion'];
        _trackingOriginal = trackingId;
        _clienteNombre = prealerta['cliente_nombre'];
        final resultado = await ApiService.crearPaqueteDesdePrealerta(trackingOriginal: _trackingOriginal!, peso: 'Pendiente', precio: 'Pendiente');
        if (resultado != null) { await _consultarEstadoNormal(resultado['tracking_id']); } 
        else { throw Exception('Error prealerta'); }
      } else {
        await _consultarEstadoNormal(trackingId);
      }
    } catch (e) { setState(() { _errorMessage = e.toString(); _isLoading = false; }); }
  }

  List<Map<String, dynamic>> _convertirEstadoAHistorial(Map<String, dynamic> estado) {
    List<Map<String, dynamic>> h = [];
    if (estado['Origen_paquete_recibido'].isNotEmpty) h.add({'evento': estado['Origen_paquete_recibido'], 'fecha': estado['Fecha_Origen'], 'icon': Icons.inventory_2, 'color': goldChampagne});
    if (estado['Ubicacion_1'].isNotEmpty) h.add({'evento': estado['Ubicacion_1'], 'fecha': estado['Fecha_1'], 'icon': Icons.flight_takeoff, 'color': goldChampagne});
    if (estado['Ubicacion_2'].isNotEmpty) h.add({'evento': estado['Ubicacion_2'], 'fecha': estado['Fecha_2'], 'icon': Icons.flight_land, 'color': goldChampagne});
    if (estado['Ubicacion_3'].isNotEmpty) h.add({'evento': estado['Ubicacion_3'], 'fecha': estado['Fecha_3'], 'icon': Icons.local_shipping, 'color': goldChampagne});
    if (estado['Llegada_Sucursal'].isNotEmpty) h.add({'evento': estado['Llegada_Sucursal'], 'fecha': estado['Fecha_4'], 'icon': Icons.warehouse, 'color': goldChampagne});
    if (estado['Entregado'].isNotEmpty) h.add({'evento': estado['Entregado'], 'fecha': estado['Fecha_5'], 'icon': Icons.verified, 'color': Colors.greenAccent});
    return h;
  }

  Future<void> _actualizarConFoto(String trackingId, String columna, String label) async {
    try {
      setState(() => _isLoading = true);
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(source: ImageSource.camera, maxWidth: 1024, maxHeight: 1024, imageQuality: 80);
      if (image == null) { setState(() => _isLoading = false); return; }
      
      String? fotoUrl = await CloudinaryService.subirFoto(File(image.path));
      if (fotoUrl == null) throw Exception('Error al subir foto');
      
      await ApiService.guardarFotoUrl(trackingId, fotoUrl, columna);
      final coords = Coordenadas.getCoordenadas(_tipoEnvio ?? 'maritimo', columna);
      if (coords != null) { await ApiService.actualizarEstadoConCoordenadas(trackingId, columna, label, coords['lat']!, coords['lng']!); }
      else { await ApiService.actualizarEstado(trackingId, columna, label); }
      
      setState(() { _successMessage = '✅ Actualizado correctamente'; _selectedUbicacion = null; _trackingController.clear(); _historial = []; });
    } catch (e) { setState(() => _errorMessage = e.toString()); }
    finally { setState(() => _isLoading = false); }
  }


  // ==========================================
  // CONSTRUCCIÓN DE LA UI 
  // ==========================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: midnightBlue,
      body: SafeArea(
        child: Column(
          children: [
            _buildCustomHeader(),
            _buildModeSelector(),
            
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildMainSearchArea(),
                      
                      AnimatedSize(
                        duration: const Duration(milliseconds: 300),
                        child: Column(
                          children: [
                            if (_errorMessage != null) _buildAlertCard(_errorMessage!, isError: true),
                            if (_successMessage != null) _buildAlertCard(_successMessage!, isError: false),
                            if (_selectedUbicacion == 'Entregado' && !_pagado) 
                              _buildAlertCard("⚠️ PAGO PENDIENTE. El cliente debe pagar antes de entregar.", isError: true),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      if (_esPrealerta) _buildPrealertaCard(),
                      if (_historial.isNotEmpty) _buildModernTimeline(),
                      
                      if (_selectedUbicacion != null && _modoEscaneo == ModoEscaneo.seguimiento) 
                        _buildNextStepHorizontalSelector(),
                        
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
            
            if (_modoEscaneo == ModoEscaneo.seguimiento && _selectedUbicacion != null && _trackingController.text.isNotEmpty)
              Container(
                padding: EdgeInsets.only(left: 20, right: 20, top: 16, bottom: Platform.isIOS ? 32 : 20),
                decoration: BoxDecoration(
                  color: midnightBlue,
                  border: Border(top: BorderSide(color: goldChampagne.withOpacity(0.1))),
                  boxShadow: [BoxShadow(color: Colors.black54, offset: Offset(0, -10), blurRadius: 20)],
                ),
                child: BotonFotoWidget(
                  onPressed: () {
                    String label = "Actualizar";
                    List<Map<String, dynamic>> opciones = _tipoEnvio == 'aereo' 
                      ? [
                          {"columna": "Ubicacion_1", "label": "En vuelo hacia Venezuela"}, 
                          {"columna": "Ubicacion_2", "label": "Arribo a Maiquetía (CCS)"}, 
                          {"columna": "Ubicacion_3", "label": "En ruta a sucursal"}, 
                          {"columna": "Llegada_Sucursal", "label": "Llego a Envios Benjamin"}, 
                          {"columna": "Entregado", "label": "Entregado al cliente"}
                        ]
                      : [
                          {"columna": "Ubicacion_1", "label": "Saliendo de Miami"}, 
                          {"columna": "Ubicacion_2", "label": "Transbordo en Colon (Panama)"}, 
                          {"columna": "Ubicacion_3", "label": "Arribo a Puerto Cabello"}, 
                          {"columna": "Llegada_Sucursal", "label": "Llego a Envios Benjamin"}, 
                          {"columna": "Entregado", "label": "Entregado al cliente"}
                        ];
                    for(var o in opciones) { if(o['columna'] == _selectedUbicacion) label = o['label']; }
                    _actualizarConFoto(_trackingController.text, _selectedUbicacion!, label);
                  },
                  isLoading: _isLoading,
                  isDisabled: _isLoading || _selectedUbicacion == null || _trackingController.text.isEmpty,
                  texto: 'CONFIRMAR Y TOMAR FOTO',
                  goldChampagne: goldChampagne,
                  midnightBlue: midnightBlue,
                  textMuted: textMuted,
                ),
              ),
          ],
        ),
      ),
    );
  }

  // --- COMPONENTES VISUALES ---

  Widget _buildCustomHeader() {
    return Padding(
      padding: const EdgeInsets.only(left: 20, right: 20, top: 20, bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Hola, ${_usuario?['nombre'] ?? 'Equipo'} 👋', style: TextStyle(color: textMuted, fontSize: 14, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              Text('Centro de Control', style: TextStyle(color: goldChampagne, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
            ],
          ),
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => EnviosScreen(usuario: _usuario))),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: cardDark, borderRadius: BorderRadius.circular(14), border: Border.all(color: goldChampagne.withOpacity(0.3))),
              child: Icon(Icons.inventory_2, color: goldChampagne, size: 24),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildModeSelector() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(color: cardDark, borderRadius: BorderRadius.circular(16)),
        child: Row(
          children: [
            _buildModeTab(ModoEscaneo.seguimiento, 'Tracking', Icons.search),
            _buildModeTab(ModoEscaneo.prealerta, 'Prealerta', Icons.notification_add),
            _buildModeTab(ModoEscaneo.contenedor, 'Sacos', Icons.qr_code_scanner),
          ],
        ),
      ),
    );
  }

  Widget _buildModeTab(ModoEscaneo modo, String titulo, IconData icon) {
    bool isSelected = _modoEscaneo == modo;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() { _modoEscaneo = modo; _trackingController.clear(); _historial = []; _selectedUbicacion = null; _successMessage = null; _errorMessage = null; }),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(color: isSelected ? goldChampagne : Colors.transparent, borderRadius: BorderRadius.circular(12)),
          child: Column(
            children: [
              Icon(icon, size: 18, color: isSelected ? midnightBlue : textMuted),
              const SizedBox(height: 4),
              Text(titulo, style: TextStyle(color: isSelected ? midnightBlue : textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMainSearchArea() {
    return Container(
      decoration: BoxDecoration(
        color: cardDark,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: goldChampagne.withOpacity(0.2), width: 1.5),
        boxShadow: [BoxShadow(color: goldChampagne.withOpacity(0.05), blurRadius: 20, offset: Offset(0, 10))],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _trackingController,
              style: TextStyle(color: textLight, fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1),
              decoration: InputDecoration(
                hintText: _modoEscaneo == ModoEscaneo.seguimiento ? 'Ingresar Tracking...' : 'Código aquí...',
                hintStyle: TextStyle(color: textMuted.withOpacity(0.5), fontSize: 16),
                border: InputBorder.none,
                focusedBorder: InputBorder.none,
                enabledBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                prefixIcon: Padding(padding: const EdgeInsets.only(left: 16, right: 8), child: Icon(Icons.qr_code, color: textMuted)),
              ),
              onSubmitted: (val) { if (val.trim().isNotEmpty) _procesarCodigo(val.trim()); },
            ),
          ),
          GestureDetector(
            onTap: _scanQR,
            child: Container(
              margin: const EdgeInsets.all(8),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [goldChampagne, const Color(0xFFAA7C11)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(Icons.camera_alt, color: midnightBlue, size: 28),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertCard(String message, {required bool isError}) {
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: isError ? Colors.redAccent.withOpacity(0.1) : Colors.greenAccent.withOpacity(0.1), borderRadius: BorderRadius.circular(16), border: Border.all(color: isError ? Colors.redAccent.withOpacity(0.3) : Colors.greenAccent.withOpacity(0.3))),
      child: Row(
        children: [
          Icon(isError ? Icons.warning_amber_rounded : Icons.check_circle, color: isError ? Colors.redAccent : Colors.greenAccent, size: 28),
          const SizedBox(width: 12),
          Expanded(child: Text(message, style: TextStyle(color: isError ? Colors.redAccent.shade100 : Colors.greenAccent.shade100, fontSize: 14, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }

  Widget _buildPrealertaCard() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: goldChampagne.withOpacity(0.05), borderRadius: BorderRadius.circular(20), border: Border.all(color: goldChampagne.withOpacity(0.2))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [Icon(Icons.assignment_ind, color: goldChampagne, size: 20), const SizedBox(width: 10), Text('DATOS DE PREALERTA', style: TextStyle(color: goldChampagne, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1))]),
          const SizedBox(height: 16),
          if (_clienteNombre != null) ...[Text('CLIENTE', style: TextStyle(color: textMuted, fontSize: 10, fontWeight: FontWeight.bold)), const SizedBox(height: 4), Text(_clienteNombre!, style: TextStyle(color: textLight, fontSize: 16, fontWeight: FontWeight.w600)), const SizedBox(height: 12)],
          Text('DESCRIPCIÓN', style: TextStyle(color: textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(_descripcionCliente ?? 'Sin descripción', style: TextStyle(color: textLight, fontSize: 14)),
        ],
      ),
    );
  }

  Widget _buildModernTimeline() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('RUTA DEL PAQUETE', style: TextStyle(color: textMuted, fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 1.5)),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: cardDark, borderRadius: BorderRadius.circular(20), border: Border.all(color: goldChampagne.withOpacity(0.1))),
          child: Column(
            children: List.generate(_historial.length, (index) {
              final evento = _historial[index];
              final isLast = index == _historial.length - 1;
              return IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(
                      width: 30,
                      child: Column(
                        children: [
                          Container(padding: EdgeInsets.all(6), decoration: BoxDecoration(color: evento['color'].withOpacity(0.2), shape: BoxShape.circle), child: Icon(evento['icon'], color: evento['color'], size: 14)),
                          if (!isLast) Expanded(child: Container(width: 2, color: goldChampagne.withOpacity(0.2))),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 24.0, top: 4),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(evento['evento'], style: TextStyle(color: textLight, fontSize: 15, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(evento['fecha'], style: TextStyle(color: textMuted, fontSize: 12)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildNextStepHorizontalSelector() {
    List<Map<String, dynamic>> opciones = _tipoEnvio == 'aereo' 
      ? [
          {"columna": "Ubicacion_1", "label": "En vuelo hacia Venezuela", "icon": Icons.flight_takeoff}, 
          {"columna": "Ubicacion_2", "label": "Arribo a Maiquetía (CCS)", "icon": Icons.flight_land}, 
          {"columna": "Ubicacion_3", "label": "En ruta a sucursal", "icon": Icons.local_shipping}, 
          {"columna": "Llegada_Sucursal", "label": "Llego a Envios Benjamin", "icon": Icons.warehouse}, 
          {"columna": "Entregado", "label": "Entregado al cliente", "icon": Icons.verified}
        ]
      : [
          {"columna": "Ubicacion_1", "label": "Saliendo de Miami", "icon": Icons.sailing}, 
          {"columna": "Ubicacion_2", "label": "Transbordo en Colon (Panama)", "icon": Icons.hub}, 
          {"columna": "Ubicacion_3", "label": "Arribo a Puerto Cabello", "icon": Icons.anchor}, 
          {"columna": "Llegada_Sucursal", "label": "Llego a Envios Benjamin", "icon": Icons.warehouse}, 
          {"columna": "Entregado", "label": "Entregado al cliente", "icon": Icons.verified}
        ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('¿A DÓNDE VA AHORA?', style: TextStyle(color: goldChampagne, fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 1.5)),
        const SizedBox(height: 16),
        SizedBox(
          height: 130,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: opciones.length,
            itemBuilder: (context, index) {
              final op = opciones[index];
              final isSelected = _selectedUbicacion == op['columna'];
              
              return GestureDetector(
                onTap: () => setState(() => _selectedUbicacion = op['columna']),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 140,
                  margin: const EdgeInsets.only(right: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isSelected ? goldChampagne.withOpacity(0.15) : cardDark,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: isSelected ? goldChampagne : goldChampagne.withOpacity(0.1), width: isSelected ? 2 : 1),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(op['icon'], color: isSelected ? goldChampagne : textMuted, size: 32),
                      const SizedBox(height: 12),
                      Text(
                        op['label'], 
                        style: TextStyle(color: isSelected ? textLight : textMuted, fontSize: 12, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}