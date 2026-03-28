// src/components/AdminPanel/AdminPanel.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ApiService } from '../../services/api';
import './AdminPanel.css';

import EstadisticasPanel from './EstadisticasPanel/EstadisticasPanel';
import TablaPendientes from './Tablas/TablaPendientes';
import TablaProcesoPagado from './Tablas/TablaProcesoPagado';
import TablaProcesoNoPagado from './Tablas/TablaProcesoNoPagado';
import TablaCompletados from './Tablas/TablaCompletados';
import TablaAdvertencia from './Tablas/TablaAdvertencia';
import ModalComprobante from './Modales/ModalComprobante';
import ModalEditarPaquete from './Modales/ModalEditarPaquete';
import ModalQR from './Modales/ModalQR';
import ModalAsignarCliente from './Modales/ModalAsignarCliente'; 
import TablaSinIdentificar from './Tablas/TablaSinIdentificar'; 

const API_URL = "https://igrafic360.net/envio-api";
const PAQUETES_POR_PAGINA = 50;

const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

const parseFotos = (fotos) => {
  if (!fotos) return [];
  if (Array.isArray(fotos)) return fotos;
  if (typeof fotos === 'string') {
    try {
      return JSON.parse(fotos);
    } catch (e) {
      return [];
    }
  }
  return [];
};

const estaPagado = (valor) => {
  return valor === true || valor === 1;
};

const esFantasma = (valor) => {
  return valor === true || valor === 1;
};

const AdminPanel = ({ onRegistroExitoso }) => {
  const [paquetes, setPaquetes] = useState([]);
  const [mostrarQR, setMostrarQR] = useState(null);
  const [qrGenerado, setQrGenerado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pestanaActiva, setPestanaActiva] = useState('pendientes');
  const [paqueteAEditar, setPaqueteAEditar] = useState(null);
  const [editando, setEditando] = useState(false);
  const [fotoVer, setFotoVer] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [paqueteAsignar, setPaqueteAsignar] = useState(null);
  const [mostrarModalAsignar, setMostrarModalAsignar] = useState(false);

  const [pagination, setPagination] = useState({
    has_more: true,
    next_last_id: null,
    loaded: 0
  });
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const scrollContainerRef = useRef(null);

  const [estadisticas, setEstadisticas] = useState({
    total: 0, pendientes: 0, procesoPagado: 0, procesoNoPagado: 0, completados: 0, advertencia: 0, ingresosMes: 0, sinIdentificar: 0
  });
  const [filtros, setFiltros] = useState({ busqueda: '', fechaInicio: '', fechaFin: '', estado: 'todos' });

  const cargarPaquetes = useCallback(async (cargarMas = false, forzarFresco = false, reset = false) => {
    if (cargarMas && !pagination.has_more) return;
    if (cargarMas && cargandoMas) return;
    if (!cargarMas && cargando && !primeraCarga) return;

    if (cargarMas) {
      setCargandoMas(true);
    } else {
      setCargando(true);
    }

    try {
      const lastIdParam = reset ? null : pagination.next_last_id;
      const url = `${API_URL}/paquetes?limit=${PAQUETES_POR_PAGINA}${lastIdParam ? `&last_id=${lastIdParam}` : ''}&_t=${Date.now()}`;
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      const data = await response.json();

      if (response.ok) {
        let nuevosPaquetes;
        if (cargarMas && !reset) {
          nuevosPaquetes = [...paquetes, ...data.paquetes];
          setPaquetes(nuevosPaquetes);
        } else {
          nuevosPaquetes = data.paquetes;
          setPaquetes(data.paquetes);
        }
        
        setPagination(data.pagination);
        calcularEstadisticas(nuevosPaquetes);
      } else if (response.status === 403) {
        setError('No tienes permiso para ver los paquetes. Solo administradores.');
      } else if (response.status === 429) {
        setError('Demasiadas peticiones. Espera un momento.');
      } else if (response.status === 401) {
        setError('Usuario no autenticado. Por favor, inicia sesion nuevamente.');
      } else {
        setError(data.error || 'Error al cargar paquetes');
      }
    } catch (error) {
      setError('Error al cargar paquetes: ' + error.message);
    } finally {
      setCargando(false);
      setCargandoMas(false);
      setPrimeraCarga(false);
    }
  }, [pagination.has_more, pagination.next_last_id, paquetes, cargando, cargandoMas, primeraCarga]);

  const calcularEstadisticas = (paquetesArray) => {
    const sinIdentificar = paquetesArray.filter(p => esFantasma(p.es_fantasma)).length;
    const pendientes = paquetesArray.filter(p => !esFantasma(p.es_fantasma) && (p.peso === 'Pendiente' || p.precio === 'Pendiente' || p.precio_usd === 'Pendiente' || !p.peso || p.peso === 'N/A' || !p.cliente_uid)).length;
    const procesoPagado = paquetesArray.filter(p => 
      !esFantasma(p.es_fantasma) && 
      p.peso !== 'Pendiente' && 
      p.peso !== 'N/A' && 
      (p.precio !== 'Pendiente' || p.precio_usd !== 'Pendiente') && 
      estaPagado(p.pagado) && 
      (!p.Entregado || p.Entregado === '') && 
      p.cliente_uid
    ).length;
    
    const procesoNoPagado = paquetesArray.filter(p => 
      !esFantasma(p.es_fantasma) && 
      p.peso !== 'Pendiente' && 
      p.peso !== 'N/A' && 
      (p.precio !== 'Pendiente' || p.precio_usd !== 'Pendiente') && 
      !estaPagado(p.pagado) && 
      (p.pago_reportado === true || p.pago_reportado === 1) &&
      (!p.Entregado || p.Entregado === '') && 
      p.cliente_uid
    ).length;
    
    const completados = paquetesArray.filter(p => !esFantasma(p.es_fantasma) && p.Entregado && p.Entregado !== '' && estaPagado(p.pagado) && p.cliente_uid).length;
    const advertencia = paquetesArray.filter(p => !esFantasma(p.es_fantasma) && p.Entregado && p.Entregado !== '' && !estaPagado(p.pagado) && p.cliente_uid).length;
    const ingresosMes = paquetesArray.filter(p => !esFantasma(p.es_fantasma) && p.Entregado && p.Entregado !== '' && estaPagado(p.pagado) && p.cliente_uid && ((p.precio && p.precio !== 'Pendiente') || (p.precio_usd && p.precio_usd !== 'Pendiente'))).reduce((acc, p) => acc + parseFloat((p.precio || p.precio_usd || '0').replace('$', '') || 0), 0);

    setEstadisticas({ 
      total: paquetesArray.length, 
      sinIdentificar, 
      pendientes, 
      procesoPagado, 
      procesoNoPagado, 
      completados, 
      advertencia, 
      ingresosMes 
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        if (pagination.has_more && !cargandoMas && !cargando) cargarPaquetes(true);
      }
    };
    const scrollElement = scrollContainerRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [pagination.has_more, cargandoMas, cargando, cargarPaquetes]);

  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          cargarPaquetes(false, true);
        } else {
          setError('No hay sesion activa. Por favor, inicia sesion.');
        }
      } catch (error) {
        setError('Error de autenticacion. Por favor, recarga la pagina.');
      } finally {
        setAuthChecked(true);
      }
    };
    
    verificarSesion();
  }, []);

  const marcarComoPagado = async (paquete) => { 
    if (!window.confirm(`Aprobar el pago del paquete ${paquete.tracking_id || paquete.id}?`)) return;
    setCargando(true);
    try {
      const idActual = paquete.tracking_id || paquete.id;
      await ApiService.marcarPaquetePagado(idActual, true);
      setMensajeExito(`Pago APROBADO para el paquete ${idActual}`);
      await cargarPaquetes(false, true, true); 
    } catch (error) { 
      setError(error.message); 
      setCargando(false);
    }
  };

  const marcarComoRechazado = async (paquete) => { 
    if (!window.confirm(`RECHAZAR el pago del paquete ${paquete.tracking_id || paquete.id}? El cliente tendra que reportarlo de nuevo.`)) return;
    setCargando(true);
    try {
      const idActual = paquete.tracking_id || paquete.id;
      await ApiService.marcarPaquetePagado(idActual, false);
      setMensajeExito(`Pago RECHAZADO para el paquete ${idActual}`);
      await cargarPaquetes(false, true, true);
    } catch (error) { 
      setError(error.message); 
      setCargando(false);
    }
  };

  const marcarComoNoPagado = async (paquete) => { 
    if (!window.confirm(`Devolver el paquete ${paquete.tracking_id || paquete.id} a estado pendiente de pago?`)) return;
    setCargando(true);
    try {
      const idActual = paquete.tracking_id || paquete.id;
      await ApiService.marcarPaquetePagado(idActual, false);
      setMensajeExito(`Paquete ${idActual} devuelto a pendiente de pago`);
      await cargarPaquetes(false, true, true);
    } catch (error) { 
      setError(error.message); 
      setCargando(false);
    }
  };

  const handleGuardarDatosCompletos = async (datosCompletos) => {
    if (!paqueteAEditar) return;
    setCargando(true);
    try {
      const idActual = paqueteAEditar.tracking_id || paqueteAEditar.id;
      const response = await fetch(`${API_URL}/actualizar-datos`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: idActual, peso: datosCompletos.peso || 'Pendiente', precio: datosCompletos.precio || 'Pendiente', origen: datosCompletos.origen || 'Miami', observaciones: datosCompletos.observaciones || '' })
      });
      if (response.ok) {
        setMensajeExito(`Datos de ${idActual} actualizados correctamente`);
        setEditando(false); 
        setPaqueteAEditar(null);
        await cargarPaquetes(false, true, true);
      } else if (response.status === 403) {
        throw new Error('No tienes permiso para editar paquetes');
      } else throw new Error('Error al actualizar');
    } catch (error) { 
      setError(error.message); 
      setCargando(false);
    }
  };

  const generarQR = async () => {
    setCargando(true);
    try {
      const responsePaquetes = await fetch(`${API_URL}/paquetes?limit=100&_t=${Date.now()}`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      const data = await responsePaquetes.json();
      const paquetesExistentes = data.paquetes || [];
      let ultimoNumero = paquetesExistentes.length > 0 ? Math.max(...paquetesExistentes.map(p => {
        const id = p.tracking_id || p.id;
        return id && id.includes('-') ? parseInt(id.split('-')[1]) || 0 : 0;
      }), 0) : 0;
      const nuevoID = `VNZ-${String(ultimoNumero + 1).padStart(3, '0')}`;
      
      const response = await fetch(`${API_URL}/registrar`, {
        method: 'POST', 
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: nuevoID, peso: 'Pendiente', precio: 'Pendiente', origen: 'Miami', observaciones: '', pagado: false })
      });
      if (response.ok) {
        setQrGenerado(nuevoID);
        setMensajeExito(`QR guardado: ${nuevoID}`);
        await cargarPaquetes(false, true, true);
      } else if (response.status === 403) {
        throw new Error('No tienes permiso para registrar paquetes');
      }
    } catch (error) { 
      setError(error.message); 
      setCargando(false);
    }
  };

  const handleMarcarFantasma = async (paquete) => {
    if (!window.confirm(`Seguro que quieres enviar el paquete ${paquete.tracking_id || paquete.id} a la lista de Fantasmas?`)) return;
    setCargando(true);
    try {
      const idActual = paquete.tracking_id || paquete.id;
      const response = await fetch(`${API_URL}/actualizar-datos`, {
        method: 'POST', 
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: idActual, es_fantasma: true })
      });
      if (response.ok) {
        setMensajeExito(`Paquete ${idActual} enviado al Limbo.`);
        await cargarPaquetes(false, true, true);
      } else if (response.status === 403) {
        throw new Error('No tienes permiso para marcar paquetes como fantasma');
      } else throw new Error('Error al enviar a fantasmas');
    } catch (error) { 
      setError(error.message); 
      setCargando(false);
    }
  };

  const handleAsignarCliente = (paquete) => {
    setPaqueteAsignar(paquete);
    setMostrarModalAsignar(true);
  };

  const handleEditar = (paquete) => { setPaqueteAEditar(paquete); setEditando(true); };
  const handleVerQR = (paquete) => { if (paquete) setMostrarQR({ id: paquete.tracking_id || paquete.id }); };
  const paquetesFiltrados = (lista) => filtros.busqueda ? lista.filter(p => (p.tracking_id || p.id || '').toLowerCase().includes(filtros.busqueda.toLowerCase())) : lista;

  const renderInfoPagoReportado = (paquete) => {
    if (estaPagado(paquete.pagado)) return <span className="wp-badge wp-badge-success">Pagado</span>;
    const esBinance = paquete.metodo_pago === 'binance';
    
    let fotosArray = parseFotos(paquete.fotos);
    const comprobante = fotosArray.find(f => f.tipo === 'comprobante_pago');

    if (paquete.pago_reportado === true || paquete.pago_reportado === 1) {
      if (comprobante) return <div className="wp-reporte"><span className="wp-badge wp-badge-warning">P. Movil (En revision)</span><button onClick={() => setFotoVer(comprobante.url)} className="wp-btn-small">Ver</button></div>;
      if (esBinance) return <div className="wp-reporte"><span className="wp-badge wp-badge-warning">Binance (En revision)</span><small className="wp-ref">{paquete.referencia_binance || 'N/A'}</small></div>;
      return <span className="wp-badge wp-badge-warning">En revision</span>;
    }

    if (comprobante && !paquete.pago_reportado) return <div className="wp-reporte"><span className="wp-badge wp-badge-info">P. Movil (Esperando)</span><button onClick={() => setFotoVer(comprobante.url)} className="wp-btn-small">Ver</button></div>;
    if (esBinance && !paquete.pago_reportado) return <div className="wp-reporte"><span className="wp-badge wp-badge-info">Binance (Esperando)</span><small className="wp-ref">{paquete.referencia_binance || 'N/A'}</small></div>;
    return <span className="wp-badge wp-badge-danger">Pendiente</span>;
  };

  const pSinIdentificar = paquetesFiltrados(paquetes.filter(p => esFantasma(p.es_fantasma)));
  const pPendientes = paquetesFiltrados(paquetes.filter(p => !esFantasma(p.es_fantasma) && (p.peso === 'Pendiente' || p.precio === 'Pendiente' || p.precio_usd === 'Pendiente' || !p.peso || p.peso === 'N/A' || !p.cliente_uid)));
  const pProcesoPagado = paquetesFiltrados(paquetes.filter(p => 
    !esFantasma(p.es_fantasma) && 
    p.peso !== 'Pendiente' && 
    p.peso !== 'N/A' && 
    (p.precio !== 'Pendiente' || p.precio_usd !== 'Pendiente') && 
    estaPagado(p.pagado) && 
    (!p.Entregado || p.Entregado === '') && 
    p.cliente_uid
  ));
  
  const pProcesoNoPagado = paquetesFiltrados(paquetes.filter(p => 
    !esFantasma(p.es_fantasma) && 
    p.peso !== 'Pendiente' && 
    p.peso !== 'N/A' && 
    (p.precio !== 'Pendiente' || p.precio_usd !== 'Pendiente') && 
    !estaPagado(p.pagado) && 
    (!p.Entregado || p.Entregado === '') && 
    p.cliente_uid
  ));
  
  const pCompletados = paquetesFiltrados(paquetes.filter(p => !esFantasma(p.es_fantasma) && p.Entregado && p.Entregado !== '' && estaPagado(p.pagado) && p.cliente_uid));
  const pAdvertencia = paquetesFiltrados(paquetes.filter(p => !esFantasma(p.es_fantasma) && p.Entregado && p.Entregado !== '' && !estaPagado(p.pagado) && p.cliente_uid));

  const menuItems = [
    { id: 'estadisticas', label: 'Estadisticas', icon: '📊' },
    { id: 'sin-identificar', label: 'Sin Identificar', icon: '👻', count: pSinIdentificar.length },
    { id: 'pendientes', label: 'Por Recibir', icon: '📌', count: pPendientes.length },
    { id: 'proceso-pagado', label: 'Proceso Pagado', icon: '💚', count: pProcesoPagado.length },
    { id: 'proceso-no-pagado', label: 'Proceso No Pagado', icon: '⚠️', count: pProcesoNoPagado.length },
    { id: 'completados', label: 'Completados', icon: '✅', count: pCompletados.length },
    { id: 'advertencia', label: 'Advertencia', icon: '🔴', count: pAdvertencia.length },
  ];

  return (
    <div className="wp-admin">
      <header className="wp-header">
        <div className="wp-header-left">
          <button className="wp-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h1 className="wp-logo">Controla los paquetes</h1>
        </div>
        <div className="wp-header-right"><span className="wp-user">Admin</span></div>
      </header>

      <div className="wp-container">
        <aside className={`wp-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="wp-nav">
            {menuItems.map(item => (
              <button key={item.id} className={`wp-nav-item ${pestanaActiva === item.id ? 'active' : ''}`} onClick={() => { setPestanaActiva(item.id); setSidebarOpen(false); }}>
                <span className="wp-nav-icon">{item.icon}</span>
                <span className="wp-nav-label">{item.label}</span>
                {item.count !== undefined && <span className="wp-nav-count">{item.count}</span>}
              </button>
            ))}
          </nav>
        </aside>

        <main className="wp-main" ref={scrollContainerRef} style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          {cargando && primeraCarga && <div className="wp-notice wp-notice-loading"><div className="wp-spinner"></div><span>Cargando paquetes...</span></div>}
          {mensajeExito && !cargando && <div className="wp-notice wp-notice-success"><span>{mensajeExito}</span><button onClick={() => setMensajeExito('')} className="wp-notice-close">✕</button></div>}
          {error && !cargando && <div className="wp-notice wp-notice-error"><span>{error}</span><button onClick={() => setError('')} className="wp-notice-close">✕</button></div>}

          {pestanaActiva === 'estadisticas' && <EstadisticasPanel paquetes={paquetes} estadisticas={estadisticas} />}

          {pestanaActiva !== 'estadisticas' && (
            <div className="wp-search-box">
              <input type="text" placeholder="Buscar por ID..." value={filtros.busqueda} onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })} className="wp-search-input" />
            </div>
          )}

          {pestanaActiva !== 'estadisticas' && (
            <div className="wp-qr-grid">
              <div className="wp-qr-card">
                <h3>Generar QR / Registro</h3>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button onClick={generarQR} className="wp-btn wp-btn-primary" disabled={cargando}>Generar QR VNZ</button>
                </div>
                {qrGenerado && (
                  <div className="wp-qr-container" style={{ marginTop: '20px' }}>
                    <QRCodeCanvas value={qrGenerado} size={200} bgColor="#ffffff" fgColor="#000000" level="H" includeMargin={true} />
                    <p className="wp-qr-id" style={{ marginTop: '10px' }}>{qrGenerado}</p>
                    <div className="wp-qr-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>
                      <button onClick={() => { const c = document.querySelector('.wp-qr-container canvas'); if (c) { const l = document.createElement('a'); l.download = `QR-${qrGenerado}.png`; l.href = c.toDataURL(); l.click(); } }} className="wp-btn wp-btn-secondary">Descargar</button>
                      <button onClick={() => setQrGenerado(null)} className="wp-btn wp-btn-secondary">Cerrar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {pestanaActiva === 'sin-identificar' && <TablaSinIdentificar paquetes={pSinIdentificar} onAsignar={handleAsignarCliente} />}
          {pestanaActiva === 'pendientes' && <TablaPendientes paquetes={pPendientes} renderInfoPagoReportado={renderInfoPagoReportado} handleVerQR={handleVerQR} handleEditar={handleEditar} onAsignar={handleAsignarCliente} onMarcarFantasma={handleMarcarFantasma} />}
          {pestanaActiva === 'proceso-pagado' && <TablaProcesoPagado paquetes={pProcesoPagado} renderInfoPagoReportado={renderInfoPagoReportado} handleVerQR={handleVerQR} marcarComoNoPagado={marcarComoNoPagado} />}
          {pestanaActiva === 'proceso-no-pagado' && <TablaProcesoNoPagado 
            paquetes={pProcesoNoPagado} 
            renderInfoPagoReportado={renderInfoPagoReportado} 
            handleVerQR={handleVerQR} 
            pestanaActiva={pestanaActiva} 
            marcarComoPagado={marcarComoPagado} 
            marcarComoNoPagado={marcarComoNoPagado} 
            marcarComoRechazado={marcarComoRechazado} 
          />}
          {pestanaActiva === 'completados' && <TablaCompletados paquetes={pCompletados} renderInfoPagoReportado={renderInfoPagoReportado} handleVerQR={handleVerQR} marcarComoNoPagado={marcarComoNoPagado} />}
          {pestanaActiva === 'advertencia' && <TablaAdvertencia paquetes={pAdvertencia} renderInfoPagoReportado={renderInfoPagoReportado} handleVerQR={handleVerQR} pestanaActiva={pestanaActiva} marcarComoPagado={marcarComoPagado} marcarComoNoPagado={marcarComoNoPagado} marcarComoRechazado={marcarComoRechazado} />}

          {cargandoMas && (
            <div className="wp-loading-more" style={{ textAlign: 'center', padding: '20px', color: '#A0AEC0' }}>
              <div className="wp-spinner-mini"></div>
              <span>Cargando mas paquetes...</span>
            </div>
          )}

          {!pagination.has_more && paquetes.length > 0 && !cargando && (
            <div className="wp-end-list" style={{ textAlign: 'center', padding: '20px', color: '#A0AEC0' }}>
              No hay mas paquetes para mostrar
            </div>
          )}
        </main>
      </div>

      <ModalComprobante fotoVer={fotoVer} setFotoVer={setFotoVer} />
      <ModalEditarPaquete editando={editando} paqueteAEditar={paqueteAEditar} setEditando={setEditando} handleGuardarDatosCompletos={handleGuardarDatosCompletos} cargando={cargando} />
      <ModalQR mostrarQR={mostrarQR} setMostrarQR={setMostrarQR} />

      {mostrarModalAsignar && paqueteAsignar && (
        <ModalAsignarCliente
          paquete={paqueteAsignar}
          onClose={() => setMostrarModalAsignar(false)}
          onAsignado={async () => {
            setMensajeExito('Paquete asignado con exito. Ya no es un fantasma.');
            setMostrarModalAsignar(false);
            await cargarPaquetes(false, true, true);
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;