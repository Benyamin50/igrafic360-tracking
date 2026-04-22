// lib/screens/envios_screen.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class EnviosScreen extends StatefulWidget {
  final Map<String, dynamic>? usuario;
  const EnviosScreen({super.key, this.usuario});

  @override
  State<EnviosScreen> createState() => _EnviosScreenState();
}

class _EnviosScreenState extends State<EnviosScreen> {
  List<dynamic> _envios = [];
  bool _isLoading = true;
  String? _errorMessage;
  
  final Color midnightBlue = const Color(0xFF0B0F19);
  final Color cardDark = const Color(0xFF162032);
  final Color goldChampagne = const Color(0xFFD4AF37);
  final Color textLight = const Color(0xFFE2E8F0);
  final Color textMuted = const Color(0xFFA0AEC0);

  @override
  void initState() {
    super.initState();
    _cargarEnvios();
  }

  Future<void> _cargarEnvios() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    
    try {
      final response = await ApiService.obtenerEnviosActivos();
      setState(() {
        _envios = response['envios'] ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  // 🔥 DISEÑO DE TICKET MODERNO PARA EL QR
  void _mostrarQrDialog(String codigoQr, String tipo) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent, // Fondo transparente para el diseño personalizado
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: cardDark,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: goldChampagne.withOpacity(0.3)),
            boxShadow: [BoxShadow(color: Colors.black54, blurRadius: 20, offset: Offset(0, 10))],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: tipo == 'aereo' ? Colors.blueAccent.withOpacity(0.1) : Colors.greenAccent.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(tipo == 'aereo' ? Icons.flight_takeoff : Icons.directions_boat, size: 40, color: tipo == 'aereo' ? Colors.blueAccent : Colors.greenAccent),
              ),
              const SizedBox(height: 16),
              Text(
                'CÓDIGO DEL CONTENEDOR',
                style: TextStyle(color: textMuted, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 1.5),
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                decoration: BoxDecoration(
                  color: midnightBlue,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: goldChampagne.withOpacity(0.5)),
                ),
                child: SelectableText( 
                  codigoQr,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: goldChampagne, fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: textMuted.withOpacity(0.5)),
                        padding: EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                      ),
                      child: Text('Cerrar', style: TextStyle(color: textLight)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 🔥 DISEÑO PREMIUM Y CORREGIDO PARA LA LISTA DE PAQUETES
  void _mostrarDialogoPaquetes(int envioId) async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiService.obtenerPaquetesEnvio(envioId);
      final paquetes = response['paquetes'] ?? [];
      
      showDialog(
        context: context,
        builder: (context) => Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 24), // Márgenes seguros
          child: Container(
            decoration: BoxDecoration(
              color: cardDark,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: goldChampagne.withOpacity(0.3)),
              boxShadow: [BoxShadow(color: Colors.black54, blurRadius: 15, offset: Offset(0, 5))],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Cabecera del diálogo
                Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Row(
                    children: [
                      Container(
                        padding: EdgeInsets.all(8),
                        decoration: BoxDecoration(color: goldChampagne.withOpacity(0.15), shape: BoxShape.circle),
                        child: Icon(Icons.inventory_2, color: goldChampagne, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text('Paquetes Asignados', style: TextStyle(color: textLight, fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: midnightBlue, borderRadius: BorderRadius.circular(12)),
                        child: Text('${paquetes.length}', style: TextStyle(color: goldChampagne, fontWeight: FontWeight.bold)),
                      )
                    ],
                  ),
                ),
                
                Divider(color: goldChampagne.withOpacity(0.1), height: 1, thickness: 1),
                
                // Lista de paquetes corregida
                ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.55),
                  child: paquetes.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.all(40.0),
                          child: Text('No hay paquetes en este contenedor', style: TextStyle(color: textMuted)),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          physics: BouncingScrollPhysics(),
                          padding: EdgeInsets.symmetric(vertical: 12),
                          itemCount: paquetes.length,
                          itemBuilder: (context, index) {
                            final p = paquetes[index];
                            final esFantasma = p['cliente_nombre'] == null;
                            
                            return Container(
                              margin: EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              padding: EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: midnightBlue,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: esFantasma ? Colors.redAccent.withOpacity(0.3) : goldChampagne.withOpacity(0.1)),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  // Icono izquierdo
                                  Icon(Icons.unarchive, color: esFantasma ? Colors.redAccent : goldChampagne, size: 24),
                                  const SizedBox(width: 12),
                                  
                                  // Textos centrales (Expanded evita que se monten)
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          p['tracking_id'], 
                                          style: TextStyle(color: Colors.blueAccent.shade100, fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          p['cliente_nombre'] ?? 'Fantasma (Sin asignar)', 
                                          style: TextStyle(color: esFantasma ? Colors.redAccent : textMuted, fontSize: 12),
                                          maxLines: 2, // Si es muy largo, baja a la siguiente línea
                                          overflow: TextOverflow.ellipsis, // Pone "..." si es absurdamente largo
                                        ),
                                      ],
                                    ),
                                  ),
                                  
                                  const SizedBox(width: 8),
                                  
                                  // Precio a la derecha
                                  Container(
                                    padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: cardDark,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: goldChampagne.withOpacity(0.2))
                                    ),
                                    child: Text(
                                      p['precio'] != null && p['precio'] != 'Pendiente' ? '\$${p['precio']}' : '⏳ Pend.', 
                                      style: TextStyle(color: goldChampagne, fontWeight: FontWeight.bold, fontSize: 12)
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
                
                Divider(color: goldChampagne.withOpacity(0.1), height: 1, thickness: 1),
                
                // Botón de cerrar
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: goldChampagne,
                        foregroundColor: midnightBlue,
                        padding: EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                      ),
                      child: Text('Cerrar', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.redAccent),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: midnightBlue,
      appBar: AppBar(
        title: Text(
          'CONTENEDORES ACTIVOS',
          style: TextStyle(color: goldChampagne, fontWeight: FontWeight.w700, fontSize: 16, letterSpacing: 1.2),
        ),
        backgroundColor: midnightBlue,
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: goldChampagne),
            onPressed: _cargarEnvios,
            tooltip: 'Actualizar',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _cargarEnvios,
        color: goldChampagne,
        backgroundColor: cardDark,
        child: _isLoading
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: goldChampagne),
                    const SizedBox(height: 16),
                    Text('Cargando contenedores...', style: TextStyle(color: textMuted)),
                  ],
                ),
              )
            : _errorMessage != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
                        const SizedBox(height: 16),
                        Text('Error: $_errorMessage', style: TextStyle(color: textMuted)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _cargarEnvios,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: goldChampagne, 
                            foregroundColor: midnightBlue,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                          ),
                          child: Text('Reintentar', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  )
                : _envios.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: EdgeInsets.all(20),
                              decoration: BoxDecoration(color: cardDark, shape: BoxShape.circle),
                              child: Icon(Icons.inbox_outlined, color: goldChampagne.withOpacity(0.5), size: 64),
                            ),
                            const SizedBox(height: 24),
                            Text('No hay contenedores activos', style: TextStyle(color: textLight, fontSize: 18, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 8),
                            Text('Los contenedores abiertos aparecerán aquí.', style: TextStyle(color: textMuted, fontSize: 14)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                        itemCount: _envios.length,
                        itemBuilder: (context, index) {
                          final envio = _envios[index];
                          final esAereo = envio['tipo'] == 'aereo';
                          final paquetesCount = envio['paquetes_actuales'] ?? 0;
                          
                          // 🔥 TARJETAS MODERNAS
                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: cardDark,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: esAereo ? Colors.blueAccent.withOpacity(0.3) : Colors.greenAccent.withOpacity(0.3)),
                              boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 4))],
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.center,
                                    children: [
                                      // Icono del tipo de envío
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: esAereo ? Colors.blueAccent.withOpacity(0.15) : Colors.greenAccent.withOpacity(0.15),
                                          shape: BoxShape.circle,
                                        ),
                                        child: Icon(
                                          esAereo ? Icons.flight_takeoff : Icons.directions_boat,
                                          color: esAereo ? Colors.blueAccent : Colors.greenAccent,
                                          size: 24,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      
                                      // Textos Principales
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              esAereo ? 'VUELO AÉREO' : 'BARCO MARÍTIMO',
                                              style: TextStyle(color: textLight, fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 0.5),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              'Código: ${envio['codigo_qr']}',
                                              style: TextStyle(color: textMuted, fontSize: 12),
                                            ),
                                          ],
                                        ),
                                      ),
                                      
                                      // Badge de Paquetes
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                        decoration: BoxDecoration(
                                          color: paquetesCount > 0 ? goldChampagne.withOpacity(0.15) : midnightBlue,
                                          borderRadius: BorderRadius.circular(20),
                                          border: Border.all(color: paquetesCount > 0 ? goldChampagne.withOpacity(0.3) : Colors.transparent)
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.inventory_2, size: 14, color: paquetesCount > 0 ? goldChampagne : textMuted),
                                            const SizedBox(width: 6),
                                            Text(
                                              '$paquetesCount',
                                              style: TextStyle(
                                                color: paquetesCount > 0 ? goldChampagne : textMuted,
                                                fontSize: 13,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  
                                  const SizedBox(height: 20),
                                  
                                  // Botones de Acción
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: () => _mostrarQrDialog(envio['codigo_qr'], envio['tipo']),
                                          icon: Icon(Icons.qr_code, size: 18, color: goldChampagne),
                                          label: Text('Ver QR', style: TextStyle(color: goldChampagne, fontSize: 13, fontWeight: FontWeight.bold)),
                                          style: OutlinedButton.styleFrom(
                                            side: BorderSide(color: goldChampagne.withOpacity(0.5)),
                                            padding: const EdgeInsets.symmetric(vertical: 12),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                            backgroundColor: midnightBlue,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: () => _mostrarDialogoPaquetes(envio['id']),
                                          icon: Icon(Icons.format_list_bulleted, size: 18),
                                          label: Text('Paquetes', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: goldChampagne,
                                            foregroundColor: midnightBlue,
                                            padding: const EdgeInsets.symmetric(vertical: 12),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                            elevation: 0,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}