// src/components/AdminPanel/AdminPanel.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ApiService, API_URL } from '../../services/api';
import { usePaquetesAdmin } from '../../hooks/usePaquetesAdmin';
import './AdminPanel.css';

import EstadisticasPanel from './EstadisticasPanel/EstadisticasPanel';
import RendimientoPanel from './EstadisticasPanel/RendimientoPanel';
import TablaPendientes from './Tablas/TablaPendientes';
import TablaProcesoPagado from './Tablas/TablaProcesoPagado';
import TablaProcesoNoPagado from './Tablas/TablaProcesoNoPagado';
import TablaCompletados from './Tablas/TablaCompletados';
import TablaAdvertencia from './Tablas/TablaAdvertencia';
import TablaEmpleados from './Tablas/TablaEmpleados';
import TablaEnvios from './Tablas/TablaEnvios';
import ModalComprobante from './Modales/ModalComprobante';
import ModalEditarPaquete from './Modales/ModalEditarPaquete';
import ModalQR from './Modales/ModalQR';
import ModalAsignarCliente from './Modales/ModalAsignarCliente'; 
import TablaSinIdentificar from './Tablas/TablaSinIdentificar'; 

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

const AdminPanel = ({ onRegistroExitoso, onRolActualizado, userRol = 'admin', permisos = [] }) => {
  // USANDO SWR - Carga con caché e infinite scroll
  const { 
    paquetes, 
    isLoading: cargando, 
    hasMore, 
    loadMore, 
    mutate: mutatePaquetes 
  } = usePaquetesAdmin(50);
  
  const [mostrarQR, setMostrarQR] = useState(null);
  const [qrGenerado, setQrGenerado] = useState(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [currentUserUid, setCurrentUserUid] = useState(null);
  
  const [paqueteAEditar, setPaqueteAEditar] = useState(null);
  const [editando, setEditando] = useState(false);
  const [fotoVer, setFotoVer] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [paqueteAsignar, setPaqueteAsignar] = useState(null);
  const [mostrarModalAsignar, setMostrarModalAsignar] = useState(false);

  const [primeraCarga, setPrimeraCarga] = useState(true);
  const scrollContainerRef = useRef(null);

  const [estadisticas, setEstadisticas] = useState({
    total: 0, pendientes: 0, procesoPagado: 0, procesoNoPagado: 0, completados: 0, advertencia: 0, ingresosMes: 0, sinIdentificar: 0
  });
  const [filtros, setFiltros] = useState({ busqueda: '', fechaInicio: '', fechaFin: '', estado: 'todos' });

  const [totalEmpleados, setTotalEmpleados] = useState(0);
  const [totalEnvios, setTotalEnvios] = useState(0); // 🔥 CONTADOR DE CONTENEDORES

  // Calcular estadisticas cuando cambian los paquetes
  useEffect(() => {
    if (paquetes.length > 0) {
      calcularEstadisticas(paquetes);
    }
  }, [paquetes]);

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

  // 🔥 Cargar total de contenedores
  const cargarTotalEnvios = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`${API_URL}/api/envios/activos?todos=true&_t=${timestamp}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTotalEnvios(data.envios?.length || 0);
      }
    } catch (error) {
      console.error('Error cargando total de envíos:', error);
    }
  }, []);

  // Manejar scroll para cargar mas
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        if (hasMore && !cargandoMas && !cargando) {
          setCargandoMas(true);
          loadMore();
          setCargandoMas(false);
        }
      }
    };
    const scrollElement = scrollContainerRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [hasMore, cargandoMas, cargando, loadMore]);

  useEffect(() => {
    const verificarSesion = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: 'include',
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          const rol = data.cliente?.rol;
          const uid = data.cliente?.uid;
          setEsSuperAdmin(data.cliente?.es_super_admin === 1);
          setCurrentUserUid(uid);
          
          if (rol === 'admin' || data.cliente?.es_super_admin === 1) {
            try {
              const respEmp = await fetch(`${API_URL}/api/admin/empleados`, {
                credentials: 'include',
                headers: getAuthHeaders()
              });
              if (respEmp.ok) {
                const dataEmp = await respEmp.json();
                const lista = dataEmp.empleados || [];
                const soloStaff = lista.filter(u => u.rol && u.rol !== 'cliente');
                setTotalEmpleados(soloStaff.length);
              }
            } catch (e) {
              console.error("Error cargando conteo inicial de empleados", e);
            }
          }
          
          // 🔥 Cargar total de contenedores
          cargarTotalEnvios();
          
          setPrimeraCarga(false);
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
  }, [cargarTotalEnvios]);

  // Funcion para refrescar datos despues de acciones
  const refrescarDatos = useCallback(async () => {
    await mutatePaquetes();
    await cargarTotalEnvios(); // 🔥 También recargar contador de contenedores
  }, [mutatePaquetes, cargarTotalEnvios]);

  const marcarComoPagado = async (paquete) => { 
    if (!window.confirm(`Aprobar el pago del paquete ${paquete.tracking_id || paquete.id}?`)) return;
    try {
      const idActual = paquete.tracking_id || paquete.id;
      await ApiService.marcarPaquetePagado(idActual, true);
      setMensajeExito(`Pago APROBADO para el paquete ${idActual}`);
      await refrescarDatos();
    } catch (error) { 
      setError(error.message); 
    }
  };

  const marcarComoRechazado = async (paquete) => { 
    if (!window.confirm(`RECHAZAR el pago del paquete ${paquete.tracking_id || paquete.id}? El cliente tendra que reportarlo de nuevo.`)) return;
    try {
      const idActual = paquete.tracking_id || paquete.id;
      await ApiService.marcarPaquetePagado(idActual, false);
      setMensajeExito(`Pago RECHAZADO para el paquete ${idActual}`);
      await refrescarDatos();
    } catch (error) { 
      setError(error.message); 
    }
  };

  const marcarComoNoPagado = async (paquete) => { 
    if (!window.confirm(`Devolver el paquete ${paquete.tracking_id || paquete.id} a estado pendiente de pago?`)) return;
    try {
      const idActual = paquete.tracking_id || paquete.id;
      await ApiService.marcarPaquetePagado(idActual, false);
      setMensajeExito(`Paquete ${idActual} devuelto a pendiente de pago`);
      await refrescarDatos();
    } catch (error) { 
      setError(error.message); 
    }
  };

  const handleEliminarPaquete = async (paquete) => {
    const idActual = paquete.tracking_id || paquete.id;
    const mensajeConfirmacion = `¿Estas seguro de eliminar el paquete ${idActual}?\n\n` +
      `⚠️ Esta accion NO se puede deshacer.\n\n` +
      `El paquete se eliminara permanentemente del sistema.`;
    
    if (!window.confirm(mensajeConfirmacion)) return;
    
    try {
      await ApiService.eliminarPaquete(idActual);
      setMensajeExito(`Paquete ${idActual} eliminado correctamente`);
      await refrescarDatos();
    } catch (error) { 
      setError(error.message); 
    }
  };

  const handleGuardarDatosCompletos = async (datosCompletos) => {
    if (!paqueteAEditar) return;
    
    console.log("📦 DATOS COMPLETOS RECIBIDOS:", datosCompletos);
    
    try {
      const idActual = paqueteAEditar.tracking_id || paqueteAEditar.id;
      
      const payload = {
        id: idActual,
        peso: datosCompletos.peso || 'Pendiente',
        precio: datosCompletos.precio || 'Pendiente',
        origen: datosCompletos.origen || 'Miami',
        observaciones: datosCompletos.observaciones || '',
        tipoEnvio: datosCompletos.tipoEnvio,
        modoProcesamiento: datosCompletos.modoProcesamiento
      };
      
      const response = await fetch(`${API_URL}/actualizar-datos`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        if (datosCompletos.modoProcesamiento === 'contenedor' && paqueteAEditar.cliente_uid) {
          const envioResponse = await fetch(`${API_URL}/api/paquete/asignar-contenedor`, {
            method: 'POST',
            credentials: 'include',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              tracking_id: idActual,
              tipo_envio: datosCompletos.tipoEnvio || 'aereo'
            })
          });
          
          if (envioResponse.ok) {
            setMensajeExito(`✅ ${idActual} actualizado y asignado al contenedor`);
          } else {
            setMensajeExito(`⚠️ ${idActual} actualizado pero error al asignar al contenedor`);
          }
        } else {
          setMensajeExito(`✈️ ${idActual} actualizado - Modo individual (sin contenedor)`);
        }
        
        setEditando(false);
        setPaqueteAEditar(null);
        await refrescarDatos();
      } else {
        throw new Error('Error al actualizar');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const generarQR = async () => {
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
        body: JSON.stringify({ 
          id: nuevoID, 
          peso: 'Pendiente', 
          precio: 'Pendiente', 
          origen: 'Miami', 
          observaciones: '', 
          pagado: false,
          tipoEnvio: 'aereo'
        })
      });
      if (response.ok) {
        setQrGenerado(nuevoID);
        setMensajeExito(`QR guardado: ${nuevoID}`);
        await refrescarDatos();
      } else if (response.status === 403) {
        throw new Error('No tienes permiso para registrar paquetes');
      }
    } catch (error) { 
      setError(error.message); 
    }
  };

  const handleMarcarFantasma = async (paquete) => {
    if (!window.confirm(`Seguro que quieres enviar el paquete ${paquete.tracking_id || paquete.id} a la lista de Fantasmas?`)) return;
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
        await refrescarDatos();
      } else if (response.status === 403) {
        throw new Error('No tienes permiso para marcar paquetes como fantasma');
      } else throw new Error('Error al enviar a fantasmas');
    } catch (error) { 
      setError(error.message); 
    }
  };

  const handleAsignarCliente = (paquete) => {
    setPaqueteAsignar(paquete);
    setMostrarModalAsignar(true);
  };

  const handleEditar = (paquete) => { setPaqueteAEditar(paquete); setEditando(true); };
  const handleVerQR = (paquete) => { if (paquete) setMostrarQR({ id: paquete.tracking_id || paquete.id }); };
  const paquetesFiltrados = (lista) => filtros.busqueda ? lista.filter(p => (p.tracking_id || p.id || '').toLowerCase().includes(filtros.busqueda.toLowerCase())) : lista;

  const getMenuItems = () => {
    if (esSuperAdmin) {
      return [
        { id: 'estadisticas', label: 'Estadisticas', icon: '📊' },
        { id: 'rendimiento', label: 'Rendimiento', icon: '⏱️' },
        { id: 'empleados', label: 'Empleados', icon: '👥' },
        { id: 'envios', label: 'Envíos', icon: '📦' },
        { id: 'sin-identificar', label: 'Sin Identificar', icon: '👻' },
        { id: 'pendientes', label: 'Por Recibir', icon: '📌' },
        { id: 'proceso-pagado', label: 'Proceso Pagado', icon: '💚' },
        { id: 'proceso-no-pagado', label: 'Proceso No Pagado', icon: '⚠️' },
        { id: 'completados', label: 'Completados', icon: '✅' },
        { id: 'advertencia', label: 'Advertencia', icon: '🔴' },
      ];
    }
    
    if (userRol === 'admin') {
      return [
        { id: 'estadisticas', label: 'Estadisticas', icon: '📊' },
        { id: 'rendimiento', label: 'Rendimiento', icon: '⏱️' },
        { id: 'envios', label: 'Envíos', icon: '📦' },
        { id: 'sin-identificar', label: 'Sin Identificar', icon: '👻' },
        { id: 'pendientes', label: 'Por Recibir', icon: '📌' },
        { id: 'proceso-pagado', label: 'Proceso Pagado', icon: '💚' },
        { id: 'proceso-no-pagado', label: 'Proceso No Pagado', icon: '⚠️' },
        { id: 'completados', label: 'Completados', icon: '✅' },
        { id: 'advertencia', label: 'Advertencia', icon: '🔴' },
      ];
    }
    
    if (userRol === 'contador') {
      return [
        { id: 'estadisticas', label: 'Estadisticas', icon: '📊' },
        { id: 'envios', label: 'Envíos', icon: '📦' },
        { id: 'sin-identificar', label: 'Sin Identificar', icon: '👻' },
        { id: 'pendientes', label: 'Por Recibir', icon: '📌' },
        { id: 'proceso-pagado', label: 'Proceso Pagado', icon: '💚' },
        { id: 'proceso-no-pagado', label: 'Proceso No Pagado', icon: '⚠️' },
        { id: 'completados', label: 'Completados', icon: '✅' },
        { id: 'advertencia', label: 'Advertencia', icon: '🔴' },
      ];
    }
    
    if (userRol === 'empleado') {
      return [
        { id: 'envios', label: 'Envíos', icon: '📦' },
        { id: 'sin-identificar', label: 'Sin Identificar', icon: '👻' },
        { id: 'pendientes', label: 'Por Recibir', icon: '📌' },
        { id: 'proceso-pagado', label: 'Proceso Pagado', icon: '💚' },
        { id: 'proceso-no-pagado', label: 'Proceso No Pagado', icon: '⚠️' },
        { id: 'completados', label: 'Completados', icon: '✅' },
        { id: 'advertencia', label: 'Advertencia', icon: '🔴' },
      ];
    }
    
    return [];
  };

  const menuItems = getMenuItems();
  const [pestanaActiva, setPestanaActiva] = useState(menuItems.length > 0 ? menuItems[0].id : '');

  useEffect(() => {
    if (menuItems.length > 0) {
      const tieneAcceso = menuItems.some(item => item.id === pestanaActiva);
      if (!tieneAcceso) {
        setPestanaActiva(menuItems[0].id);
      }
    }
  }, [userRol, esSuperAdmin, pestanaActiva, menuItems]);

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

  // 🔥 MENÚ CON CONTADORES - AHORA INCLUYE ENVÍOS
  const menuItemsWithCounts = menuItems.map(item => {
    switch(item.id) {
      case 'empleados': return { ...item, count: totalEmpleados };
      case 'envios': return { ...item, count: totalEnvios };
      case 'sin-identificar': return { ...item, count: pSinIdentificar.length };
      case 'pendientes': return { ...item, count: pPendientes.length };
      case 'proceso-pagado': return { ...item, count: pProcesoPagado.length };
      case 'proceso-no-pagado': return { ...item, count: pProcesoNoPagado.length };
      case 'completados': return { ...item, count: pCompletados.length };
      case 'advertencia': return { ...item, count: pAdvertencia.length };
      default: return item;
    }
  });

  const nombreRolHeader = esSuperAdmin ? 'Super Admin' : (userRol.charAt(0).toUpperCase() + userRol.slice(1));

  return (
    <div className="wp-admin">
      <header className="wp-header">
        <div className="wp-header-left">
          <button className="wp-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h1 className="wp-logo">Controla los paquetes</h1>
        </div>
        <div className="wp-header-right">
          <span className="wp-user">{nombreRolHeader}</span>
        </div>
      </header>

      <div className="wp-container">
        <aside className={`wp-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="wp-nav">
            {menuItemsWithCounts.map(item => (
              <button key={item.id} className={`wp-nav-item ${pestanaActiva === item.id ? 'active' : ''}`} onClick={() => { setPestanaActiva(item.id); setSidebarOpen(false); }}>
                <span className="wp-nav-icon">{item.icon}</span>
                <span className="wp-nav-label">{item.label}</span>
                {item.count !== undefined && item.count !== null && <span className="wp-nav-count">{item.count}</span>}
              </button>
            ))}
          </nav>
        </aside>

        <main className="wp-main" ref={scrollContainerRef} style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
          {menuItems.length === 0 ? (
             <div className="wp-notice wp-notice-error">
                <span>No tienes permisos asignados. Contacta a un administrador.</span>
             </div>
          ) : (
            <>
              {cargando && paquetes.length === 0 && <div className="wp-notice wp-notice-loading"><div className="wp-spinner"></div><span>Cargando paquetes...</span></div>}
              {mensajeExito && !cargando && <div className="wp-notice wp-notice-success"><span>{mensajeExito}</span><button onClick={() => setMensajeExito('')} className="wp-notice-close">✕</button></div>}
              {error && !cargando && <div className="wp-notice wp-notice-error"><span>{error}</span><button onClick={() => setError('')} className="wp-notice-close">✕</button></div>}

              {pestanaActiva === 'estadisticas' && <EstadisticasPanel paquetes={paquetes} estadisticas={estadisticas} />}
              {pestanaActiva === 'rendimiento' && <RendimientoPanel paquetes={paquetes} />}
              
              {pestanaActiva === 'empleados' && (
                <TablaEmpleados 
                  onRolActualizado={onRolActualizado} 
                  onLoadTotal={(n) => setTotalEmpleados(n)}
                  currentUserUid={currentUserUid}
                  esSuperAdmin={esSuperAdmin}
                />
              )}

              {pestanaActiva === 'envios' && <TablaEnvios />}

              {pestanaActiva !== 'estadisticas' && pestanaActiva !== 'empleados' && pestanaActiva !== 'rendimiento' && pestanaActiva !== 'envios' && (
                <div className="wp-search-box">
                  <input type="text" placeholder="Buscar por ID..." value={filtros.busqueda} onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })} className="wp-search-input" />
                </div>
              )}

              {pestanaActiva === 'pendientes' && (userRol !== 'cliente') && (
                <div className="wp-plus-button-container" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <button 
                    onClick={generarQR} 
                    className="wp-btn-plus" 
                    disabled={cargando}
                    style={{
                      background: '#D4AF37',
                      color: '#000',
                      border: 'none',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      fontSize: '28px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      transition: 'transform 0.2s, background 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = '#c49b1a'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#D4AF37'; }}
                  >
                    +
                  </button>
                </div>
              )}

              {qrGenerado && pestanaActiva === 'pendientes' && (
                <div className="wp-qr-popup" style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: '#1A202C',
                  padding: '20px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  zIndex: 1000,
                  textAlign: 'center',
                  border: '1px solid #D4AF37'
                }}>
                  <button onClick={() => setQrGenerado(null)} style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: '20px',
                    cursor: 'pointer'
                  }}>✕</button>
                  <QRCodeCanvas value={qrGenerado} size={200} bgColor="#ffffff" fgColor="#000000" level="H" includeMargin={true} />
                  <p className="wp-qr-id" style={{ marginTop: '10px', color: '#D4AF37' }}>{qrGenerado}</p>
                  <div className="wp-qr-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>
                    <button onClick={() => { const canvas = document.querySelector('.wp-qr-popup canvas'); if (canvas) { const link = document.createElement('a'); link.download = `QR-${qrGenerado}.png`; link.href = canvas.toDataURL(); link.click(); } }} style={{ background: '#D4AF37', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Descargar</button>
                    <button onClick={() => setQrGenerado(null)} style={{ background: '#4A5568', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cerrar</button>
                  </div>
                </div>
              )}

              {pestanaActiva === 'sin-identificar' && <TablaSinIdentificar paquetes={pSinIdentificar} onAsignar={handleAsignarCliente} permisos={permisos} userRol={userRol} />}
              
              {pestanaActiva === 'pendientes' && <TablaPendientes 
                paquetes={pPendientes} 
                renderInfoPagoReportado={renderInfoPagoReportado} 
                handleVerQR={handleVerQR} 
                handleEditar={handleEditar} 
                onAsignar={handleAsignarCliente} 
                onMarcarFantasma={handleMarcarFantasma} 
                onEliminar={handleEliminarPaquete}
                permisos={permisos} 
                userRol={userRol} 
              />}
              
              {pestanaActiva === 'proceso-pagado' && <TablaProcesoPagado paquetes={pProcesoPagado} renderInfoPagoReportado={renderInfoPagoReportado} handleVerQR={handleVerQR} marcarComoNoPagado={marcarComoNoPagado} permisos={permisos} userRol={userRol} />}
              
              {pestanaActiva === 'proceso-no-pagado' && <TablaProcesoNoPagado 
                paquetes={pProcesoNoPagado} 
                renderInfoPagoReportado={renderInfoPagoReportado} 
                handleVerQR={handleVerQR} 
                pestanaActiva={pestanaActiva} 
                marcarComoPagado={marcarComoPagado} 
                marcarComoNoPagado={marcarComoNoPagado} 
                marcarComoRechazado={marcarComoRechazado} 
                permisos={permisos}
                userRol={userRol}
              />}
              
              {pestanaActiva === 'completados' && <TablaCompletados paquetes={pCompletados} renderInfoPagoReportado={renderInfoPagoReportado} handleVerQR={handleVerQR} marcarComoNoPagado={marcarComoNoPagado} permisos={permisos} userRol={userRol} />}
              {pestanaActiva === 'advertencia' && <TablaAdvertencia paquetes={pAdvertencia} renderInfoPagoReportado={renderInfoPagoReportado} handleVerQR={handleVerQR} pestanaActiva={pestanaActiva} marcarComoPagado={marcarComoPagado} marcarComoNoPagado={marcarComoNoPagado} marcarComoRechazado={marcarComoRechazado} permisos={permisos} userRol={userRol} />}

              {cargandoMas && (
                <div className="wp-loading-more" style={{ textAlign: 'center', padding: '20px', color: '#A0AEC0' }}>
                  <div className="wp-spinner-mini"></div>
                  <span>Cargando mas paquetes...</span>
                </div>
              )}

              {!hasMore && paquetes.length > 0 && !cargando && (
                <div className="wp-end-list" style={{ textAlign: 'center', padding: '20px', color: '#A0AEC0' }}>
                  No hay mas paquetes para mostrar
                </div>
              )}
            </>
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
            await refrescarDatos();
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;