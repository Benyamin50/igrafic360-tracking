// src/components/ClienteDashboard/ClienteDashboard.jsx
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { usePaquetes, useTracking } from '../../hooks/usePaquetes';
import TrackingSearch from '../TrackingSearch/TrackingSearch';
import TrackingTimeline from '../TrackingTimeline/TrackingTimeline';
import StatusCard from '../StatusCard/StatusCard';
import MapaRuta from '../MapaRuta/MapaRuta';
import { ApiService } from '../../services/api';
import './ClienteDashboard.css';

const PAQUETES_POR_PAGINA = 20;

const estaPagado = (valor) => {
  return valor === true || valor === 1;
};

const estaReportado = (valor) => {
  return valor === true || valor === 1;
};

const estaEntregado = (paquete) => {
  return paquete.Entregado && paquete.Entregado !== '';
};

let List, AutoSizer;
try {
  const ReactWindow = require('react-window');
  const ReactVirtualizedAutoSizer = require('react-virtualized-auto-sizer');
  List = ReactWindow.FixedSizeList;
  AutoSizer = ReactVirtualizedAutoSizer.default || ReactVirtualizedAutoSizer;
} catch (e) {
  List = null;
  AutoSizer = null;
}

const ITEM_HEIGHT = 100;

const ClienteDashboard = ({ user, uid }) => {
  // USANDO SWR - Carga con caché
  const { 
    paquetes, 
    pagination, 
    isLoading: loadingPaquetes, 
    mutate: mutatePaquetes 
  } = usePaquetes(uid, PAQUETES_POR_PAGINA);
  
  const [selectedPaquete, setSelectedPaquete] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  
  // USANDO SWR PARA TRACKING
  const { 
    trackingData, 
    isLoading: loadingTracking, 
    mutate: mutateTracking 
  } = useTracking(selectedPaquete);
  
  const scrollContainerRef = useRef(null);
  const [fotosMap, setFotosMap] = useState({});
  const [cargandoFotos, setCargandoFotos] = useState(false);
  const [fotoSeleccionada, setFotoSeleccionada] = useState(null);
  const fotosCache = useRef({});

  // Obtener el paquete seleccionado para su tipo_envio
  const paqueteSeleccionado = useMemo(() => {
    return paquetes.find(p => (p.tracking_id || p.id) === selectedPaquete);
  }, [paquetes, selectedPaquete]);

  const tiposUbicacion = useMemo(() => [
    'Origen_paquete-recibido',
    'Ubicacion_1',
    'Ubicacion_2',
    'Ubicacion_3',
    'Llegada_Sucursal',
    'Entregado'
  ], []);

  const ubicaciones = useMemo(() => {
    if (!trackingData || trackingData.length === 0) return [];
    
    const orden = [
      { campo: 'Origen_paquete-recibido', lugar: 'Miami' },
      { campo: 'Ubicacion_1', lugar: 'Panama' },
      { campo: 'Ubicacion_2', lugar: 'Caracas' },
      { campo: 'Ubicacion_3', lugar: 'Valencia' },
      { campo: 'Llegada_Sucursal', lugar: 'Sucursal' },
      { campo: 'Entregado', lugar: 'Destino' }
    ];
    
    const ubicacionesResult = [];
    orden.forEach((item, index) => {
      if (index < trackingData.length && trackingData[index].evento) {
        ubicacionesResult.push({
          lugar: item.lugar,
          fecha: trackingData[index].fecha,
          evento: trackingData[index].evento
        });
      }
    });
    
    return ubicacionesResult;
  }, [trackingData]);

  const estadisticas = useMemo(() => {
    const total = paquetes.length;
    const entregados = paquetes.filter(p => estaEntregado(p)).length;
    const pagados = paquetes.filter(p => estaPagado(p.pagado)).length;
    const enCamino = total - entregados;
    return { total, entregados, pagados, enCamino };
  }, [paquetes]);

  const renderPrecio = useCallback((precioGuardado) => {
    if (!precioGuardado || precioGuardado === 'Pendiente') {
      return <span className="precio-pendiente">Precio: Calculando...</span>;
    }
    const numeroUSD = parseFloat(precioGuardado.replace(/[^0-9.-]+/g, ""));
    if (isNaN(numeroUSD)) return <span>{precioGuardado}</span>;
    return <span>${numeroUSD.toFixed(2)} USD</span>;
  }, []);

  const obtenerPagadoReal = useCallback((trackingId) => {
    const paquete = paquetes.find(p => (p.tracking_id || p.id) === trackingId);
    return estaPagado(paquete?.pagado);
  }, [paquetes]);

  const obtenerMetodoPago = useCallback((trackingId) => {
    const paquete = paquetes.find(p => (p.tracking_id || p.id) === trackingId);
    return paquete?.metodo_pago || null;
  }, [paquetes]);

  const obtenerReferenciaBinance = useCallback((trackingId) => {
    const paquete = paquetes.find(p => (p.tracking_id || p.id) === trackingId);
    return paquete?.referencia_binance || null;
  }, [paquetes]);

  const obtenerPagoReportado = useCallback((trackingId) => {
    const paquete = paquetes.find(p => (p.tracking_id || p.id) === trackingId);
    return estaReportado(paquete?.pago_reportado);
  }, [paquetes]);

  const cargarFotos = useCallback(async (trackingId) => {
    if (fotosCache.current[trackingId]) {
      setFotosMap(fotosCache.current[trackingId]);
      return;
    }
    
    setCargandoFotos(true);
    try {
      const fotosConTipo = await ApiService.obtenerFotosPaquete(trackingId);
      const mapa = {};
      fotosConTipo.forEach(foto => {
        if (foto.tipo && foto.url) {
          mapa[foto.tipo] = foto.url;
        }
      });
      fotosCache.current[trackingId] = mapa;
      setFotosMap(mapa);
    } catch (error) {
      console.log('Error cargando fotos:', error.message);
    } finally {
      setCargandoFotos(false);
    }
  }, []);

  const verTracking = useCallback((id) => {
    setSelectedPaquete(id);
    cargarFotos(id);
  }, [cargarFotos]);

  const obtenerPrecioPaquete = useCallback((trackingId) => {
    const paquete = paquetes.find(p => (p.tracking_id || p.id) === trackingId);
    return paquete?.precio || null;
  }, [paquetes]);

  const cargarMasPaquetes = useCallback(() => {
    if (pagination.has_more && !cargandoMas && !loadingPaquetes) {
      setCargandoMas(true);
      setCargandoMas(false);
    }
  }, [pagination.has_more, cargandoMas, loadingPaquetes]);

  const renderPaquetesLista = () => {
    const listaElementos = paquetes.map(p => {
      const isPagado = estaPagado(p.pagado);
      const isReportado = estaReportado(p.pago_reportado);
      const isEntregadoPaquete = estaEntregado(p);
      
      return (
        <div
          key={p.id}
          className={`client-paquete-item ${selectedPaquete === p.id ? 'active' : ''}`}
          onClick={() => verTracking(p.id)}
        >
          <div className="client-paquete-id">{p.id}</div>
          <div className="client-paquete-info">
            <span className={`client-paquete-estado ${isEntregadoPaquete ? 'entregado' : ''}`}>
              {isEntregadoPaquete ? 'Entregado' : 'En camino'}
            </span>
            <span className="client-paquete-precio">
              {renderPrecio(p.precio || p.precio_usd)}
            </span>
          </div>
          <div className="client-paquete-pago">
            {isPagado ? (
              <span className="client-pago-badge pagado">Pagado</span>
            ) : isReportado ? (
              <span className="client-pago-badge reportado">En revision</span>
            ) : (
              <span className="client-pago-badge pendiente">Pendiente</span>
            )}
          </div>
        </div>
      );
    });
    
    if (List && AutoSizer && paquetes.length > 30) {
      const PaqueteRow = ({ index, style }) => {
        const p = paquetes[index];
        if (!p) return null;
        const isPagado = estaPagado(p.pagado);
        const isReportado = estaReportado(p.pago_reportado);
        const isEntregadoPaquete = estaEntregado(p);
        
        const rowStyle = {
          ...style,
          height: `${parseFloat(style.height) - 10}px`,
          marginBottom: '10px'
        };
        
        return (
          <div 
            style={rowStyle}
            className={`client-paquete-item ${selectedPaquete === p.id ? 'active' : ''}`}
            onClick={() => verTracking(p.id)}
          >
            <div className="client-paquete-id">{p.id}</div>
            <div className="client-paquete-info">
              <span className={`client-paquete-estado ${isEntregadoPaquete ? 'entregado' : ''}`}>
                {isEntregadoPaquete ? 'Entregado' : 'En camino'}
              </span>
              <span className="client-paquete-precio">
                {renderPrecio(p.precio || p.precio_usd)}
              </span>
            </div>
            <div className="client-paquete-pago">
              {isPagado ? (
                <span className="client-pago-badge pagado">Pagado</span>
              ) : isReportado ? (
                <span className="client-pago-badge reportado">En revision</span>
              ) : (
                <span className="client-pago-badge pendiente">Pendiente</span>
              )}
            </div>
          </div>
        );
      };
      
      const handleVirtualScroll = ({ scrollOffset }) => {
        if (!scrollContainerRef.current) return;
        const { scrollHeight, clientHeight } = scrollContainerRef.current;
        if (scrollHeight - scrollOffset - clientHeight < 200) {
          cargarMasPaquetes();
        }
      };
      
      return (
        <div 
          className="client-paquetes-scroll" 
          ref={scrollContainerRef}
          style={{ height: '500px', overflowY: 'auto' }}
        >
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={paquetes.length}
                itemSize={ITEM_HEIGHT}
                width={width}
                onScroll={handleVirtualScroll}
              >
                {PaqueteRow}
              </List>
            )}
          </AutoSizer>
          
          {cargandoMas && (
            <div className="client-loading-more" style={{ textAlign: 'center', padding: '10px' }}>
              <div className="client-spinner-mini"></div>
              <span>Cargando mas paquetes...</span>
            </div>
          )}
          
          {!pagination.has_more && paquetes.length > 0 && (
            <div className="client-end-list" style={{ textAlign: 'center', padding: '10px', color: '#A0AEC0' }}>
              No hay mas paquetes
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div 
        className="client-paquetes-scroll" 
        ref={scrollContainerRef}
        style={{ maxHeight: '500px', overflowY: 'auto' }}
      >
        {listaElementos}
        
        {cargandoMas && (
          <div className="client-loading-more" style={{ textAlign: 'center', padding: '10px' }}>
            <div className="client-spinner-mini"></div>
            <span>Cargando mas paquetes...</span>
          </div>
        )}
        
        {!pagination.has_more && paquetes.length > 0 && (
          <div className="client-end-list" style={{ textAlign: 'center', padding: '10px', color: '#A0AEC0' }}>
            No hay mas paquetes
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="client-dashboard">
      <div className="client-container">
        <aside className={`client-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="client-stats">
            <div className="client-stat-card">
              <span className="client-stat-value">{estadisticas.total}</span>
              <span className="client-stat-label">Total</span>
            </div>
            <div className="client-stat-card">
              <span className="client-stat-value">{estadisticas.pagados}</span>
              <span className="client-stat-label">Pagados</span>
            </div>
            <div className="client-stat-card">
              <span className="client-stat-value">{estadisticas.enCamino}</span>
              <span className="client-stat-label">En camino</span>
            </div>
            <div className="client-stat-card">
              <span className="client-stat-value">{estadisticas.entregados}</span>
              <span className="client-stat-label">Entregados</span>
            </div>
          </div>

          <div className="client-paquetes-list">
            <h3>Mis Paquetes</h3>
            {loadingPaquetes && paquetes.length === 0 ? (
              <div className="client-loading">Cargando...</div>
            ) : paquetes.length === 0 ? (
              <div className="client-empty">No tienes paquetes asignados</div>
            ) : (
              renderPaquetesLista()
            )}
          </div>
        </aside>

        <main className="client-main">
          {!selectedPaquete ? (
            <div className="client-welcome-message">
              <div className="client-welcome-icon">📦</div>
              <h3>Selecciona un paquete para ver su seguimiento</h3>
              <p>Haz clic en cualquiera de tus paquetes en el panel izquierdo para ver el historial de envio, ubicacion actual y detalles de pago.</p>
            </div>
          ) : (
            <>
              {loadingTracking && (
                <div className="client-loading-tracking">
                  <div className="client-spinner"></div>
                  <span>Cargando informacion del paquete...</span>
                </div>
              )}
              
              {trackingData && !loadingTracking && (
                <>
                  <div className="client-tracking-grid">
                    <div className="client-tracking-left">
                      <StatusCard 
                        trackingId={selectedPaquete} 
                        data={trackingData}
                        precioPaquete={obtenerPrecioPaquete(selectedPaquete)}
                        pagadoInicial={obtenerPagadoReal(selectedPaquete)}
                        metodoPagoInicial={obtenerMetodoPago(selectedPaquete)}
                        referenciaBinanceInicial={obtenerReferenciaBinance(selectedPaquete)}
                        pagoReportadoInicial={obtenerPagoReportado(selectedPaquete)}
                      />
                    </div>
                    
                    <div className="client-tracking-right">
                      <h4>Historial del envio</h4>
                      {cargandoFotos ? (
                        <div className="client-fotos-loading">
                          <div className="client-spinner-mini"></div>
                          <span>Cargando fotos...</span>
                        </div>
                      ) : (
                        <TrackingTimeline
                          steps={trackingData}
                          fotosMap={fotosMap}
                          tiposUbicacion={tiposUbicacion}
                          onVerFoto={setFotoSeleccionada}
                        />
                      )}
                    </div>
                  </div>

                  <div className="client-mapa">
                    <MapaRuta 
                      trackingId={selectedPaquete}
                      ubicaciones={ubicaciones}
                      tipoEnvio={paqueteSeleccionado?.tipo_envio}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      {fotoSeleccionada && (
        <div className="client-modal-overlay" onClick={() => setFotoSeleccionada(null)}>
          <div className="client-modal-content" onClick={e => e.stopPropagation()}>
            <button className="client-modal-close" onClick={() => setFotoSeleccionada(null)}>✕</button>
            <img src={fotoSeleccionada} alt="Foto ampliada del paquete" />
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ClienteDashboard);