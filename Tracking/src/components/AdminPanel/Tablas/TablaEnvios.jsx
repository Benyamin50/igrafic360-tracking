// src/components/AdminPanel/Tablas/TablaEnvios.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { API_URL } from '../../../services/api';
import ModalMoverIndividual from '../Modales/ModalMoverIndividual';

const TablaEnvios = () => {
  const [envios, setEnvios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [envioExpandido, setEnvioExpandido] = useState(null);
  const [paquetesPorEnvio, setPaquetesPorEnvio] = useState({});
  const [cargandoPaquetes, setCargandoPaquetes] = useState({});
  const [qrModal, setQrModal] = useState(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // 🔥 CLAVE PARA FORZAR REFRESH
  
  const [mostrarModalMover, setMostrarModalMover] = useState(false);
  const [tipoEnvioSeleccionado, setTipoEnvioSeleccionado] = useState(null);
  
  // Referencia para el contenedor que se está moviendo
  const contenedorMoviendoRef = useRef(null);

  const cargarEnvios = useCallback(async () => {
    setCargando(true);
    try {
      const timestamp = Date.now();
      const url = mostrarTodos 
        ? `${API_URL}/api/envios/activos?todos=true&_t=${timestamp}` 
        : `${API_URL}/api/envios/activos?_t=${timestamp}`;
        
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      setEnvios(data.envios || []);
      
      // 🔥 Si hay un contenedor que se estaba moviendo, recargar sus paquetes
      if (contenedorMoviendoRef.current) {
        const envioId = contenedorMoviendoRef.current;
        contenedorMoviendoRef.current = null;
        setTimeout(() => {
          cargarPaquetesEnvio(envioId, true);
          setEnvioExpandido(envioId);
        }, 100);
      }
    } catch (error) {
      console.error('Error cargando envíos:', error);
    } finally {
      setCargando(false);
    }
  }, [mostrarTodos]);

  const cargarPaquetesEnvio = useCallback(async (envioId, forceReload = false) => {
    if (!forceReload && paquetesPorEnvio[envioId]) return;
    
    setCargandoPaquetes(prev => ({ ...prev, [envioId]: true }));
    try {
      const timestamp = Date.now();
      const response = await fetch(`${API_URL}/api/envio/${envioId}/paquetes?_t=${timestamp}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      setPaquetesPorEnvio(prev => ({ ...prev, [envioId]: data.paquetes || [] }));
      return data.paquetes || [];
    } catch (error) {
      console.error('Error cargando paquetes:', error);
      return [];
    } finally {
      setCargandoPaquetes(prev => ({ ...prev, [envioId]: false }));
    }
  }, [paquetesPorEnvio]);

  const getEstadoPagoBadge = (pagado) => {
    if (pagado === 1 || pagado === true) {
      return <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 'bold', background: 'rgba(74, 222, 128, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>✅ Pagado</span>;
    }
    return <span style={{ color: '#f87171', fontSize: '12px', fontWeight: 'bold', background: 'rgba(248, 113, 113, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>⚠️ Pendiente</span>;
  };

  const descargarQR = () => {
    const canvas = document.getElementById('qr-canvas-download');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `Etiqueta-Contenedor-${qrModal.codigoQr}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const quitarPaqueteDelContenedor = async (envioId, trackingId, estadoContenedor) => {
    if (estadoContenedor !== 'abierto') {
      alert('❌ No se puede quitar: el contenedor ya no está ABIERTO');
      return;
    }
    
    if (!window.confirm(`¿Seguro que quieres quitar el paquete ${trackingId} de este contenedor?\n\nEl paquete volverá a modo INDIVIDUAL.`)) return;
    
    try {
      const response = await fetch(`${API_URL}/api/paquete/quitar-contenedor`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracking_id: trackingId })
      });
      
      if (response.ok) {
        alert(`✅ Paquete ${trackingId} removido del contenedor`);
        
        // Actualizar localmente
        setPaquetesPorEnvio(prev => {
          const paquetesActuales = prev[envioId] || [];
          const paquetesFiltrados = paquetesActuales.filter(p => p.tracking_id !== trackingId);
          return { ...prev, [envioId]: paquetesFiltrados };
        });
        
        setEnvios(prevEnvios => 
          prevEnvios.map(envio => 
            envio.id === envioId 
              ? { ...envio, paquetes_actuales: Math.max(0, (envio.paquetes_actuales || 1) - 1) }
              : envio
          )
        );
        
        // Si el contenedor se quedó vacío, cerrarlo
        if (paquetesPorEnvio[envioId]?.length === 1) {
          setPaquetesPorEnvio(prev => {
            const nuevos = { ...prev };
            delete nuevos[envioId];
            return nuevos;
          });
          setEnvioExpandido(null);
        }
        
        // Forzar refresh general
        setRefreshKey(prev => prev + 1);
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Error al quitar el paquete');
    }
  };

  // 🔥 FUNCIÓN MEJORADA PARA MOVER PAQUETES
  const handleMoverCompletado = useCallback(async (cantidad) => {
    alert(`✅ ${cantidad} paquete(s) movidos al contenedor ${tipoEnvioSeleccionado === 'aereo' ? 'AÉREO' : 'MARÍTIMO'}`);
    
    // Limpiar toda la caché
    setPaquetesPorEnvio({});
    setEnvioExpandido(null);
    
    // Recargar envíos
    await cargarEnvios();
    
    // Buscar el contenedor activo y recargar sus paquetes
    setTimeout(async () => {
      // Obtener la lista actualizada de envíos
      const timestamp = Date.now();
      const url = mostrarTodos 
        ? `${API_URL}/api/envios/activos?todos=true&_t=${timestamp}` 
        : `${API_URL}/api/envios/activos?_t=${timestamp}`;
        
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      const enviosActualizados = data.envios || [];
      setEnvios(enviosActualizados);
      
      // Buscar el contenedor activo del tipo seleccionado
      const contenedorActivo = enviosActualizados.find(e => e.tipo === tipoEnvioSeleccionado && e.estado === 'abierto');
      if (contenedorActivo && contenedorActivo.paquetes_actuales > 0) {
        // Marcar que estamos moviendo a este contenedor
        contenedorMoviendoRef.current = contenedorActivo.id;
        // Forzar recarga de paquetes
        const paquetes = await cargarPaquetesEnvio(contenedorActivo.id, true);
        if (paquetes.length > 0) {
          setEnvioExpandido(contenedorActivo.id);
        }
      }
      
      // Forzar refresh general
      setRefreshKey(prev => prev + 1);
    }, 500);
  }, [cargarEnvios, cargarPaquetesEnvio, mostrarTodos, tipoEnvioSeleccionado]);

  // 🔥 EFECTO PARA RECARGAR CUANDO CAMBIA refreshKey
  useEffect(() => {
    if (refreshKey > 0) {
      cargarEnvios();
    }
  }, [refreshKey, cargarEnvios]);

  useEffect(() => {
    cargarEnvios();
  }, [cargarEnvios, mostrarTodos]);

  if (cargando && envios.length === 0) return <div className="wp-loading">Cargando envíos...</div>;

  return (
    <div className="wp-table-container">
      {qrModal && (
        <div className="wp-modal-overlay" onClick={() => setQrModal(null)}>
          <div className="wp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="wp-modal-header">
              <h3>🎫 QR DEL CONTENEDOR</h3>
              <button className="wp-modal-close" onClick={() => setQrModal(null)}>✕</button>
            </div>
            <div className="wp-modal-body">
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', background: '#fff', borderRadius: '10px', margin: '0 auto', width: 'fit-content' }}>
                <QRCodeCanvas 
                  id="qr-canvas-download" 
                  value={qrModal.codigoQr} 
                  size={250} 
                  bgColor="#ffffff" 
                  fgColor="#000000" 
                  level="H" 
                  includeMargin={true}
                />
              </div>
              <p style={{ marginTop: '15px', fontWeight: 'bold', wordBreak: 'break-all', fontSize: '18px', color: '#1A202C' }}>
                {qrModal.codigoQr}
              </p>
              <p style={{ fontSize: '14px', color: '#718096', marginTop: '5px', fontWeight: 'bold' }}>
                {qrModal.tipo === 'aereo' ? '✈️ VUELO AÉREO' : '🚢 BARCO MARÍTIMO'}
              </p>
              <div className="wp-qr-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={descargarQR} className="wp-btn" style={{ background: '#D4AF37', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ⬇️ Descargar
                </button>
                <button onClick={() => setQrModal(null)} className="wp-btn" style={{ background: '#4A5568', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarModalMover && (
        <ModalMoverIndividual
          onClose={() => setMostrarModalMover(false)}
          onMover={handleMoverCompletado}
          tipoEnvio={tipoEnvioSeleccionado}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h3>📦 CONTENEDORES {mostrarTodos ? 'LOGÍSTICOS (TODOS)' : 'ACTIVOS (MIAMI)'}</h3>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setTipoEnvioSeleccionado('aereo');
              setMostrarModalMover(true);
            }}
            className="btn-mover-individual btn-mover-aereo"
          >
            ✈️ Mover Individuales AÉREOS
          </button>
          
          <button
            onClick={() => {
              setTipoEnvioSeleccionado('maritimo');
              setMostrarModalMover(true);
            }}
            className="btn-mover-individual btn-mover-maritimo"
          >
            🚢 Mover Individuales MARÍTIMOS
          </button>
          
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#A0AEC0', fontSize: '14px' }}>
            <input 
              type="checkbox" 
              checked={mostrarTodos} 
              onChange={() => setMostrarTodos(!mostrarTodos)}
              style={{ marginRight: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            Ver Historial (Cerrados/En Tránsito)
          </label>
          
          <button onClick={() => cargarEnvios()} className="wp-btn-small" style={{ background: '#D4AF37', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            🔄 Refrescar
          </button>
        </div>
      </div>

      {envios.length === 0 ? (
        <div className="wp-empty" style={{ textAlign: 'center', padding: '40px', background: '#1A202C', borderRadius: '12px', color: '#A0AEC0' }}>
          {mostrarTodos ? 'No hay ningún contenedor registrado en el sistema.' : 'No hay contenedores abiertos en este momento.'}
        </div>
      ) : (
        envios.map((envio) => {
          const esAereo = envio.tipo === 'aereo';
          const estadoContenedor = envio.estado || 'desconocido';
          
          let colorEstado = '#60A5FA';
          let textoEstado = '🔵 EN TRÁNSITO';
          
          if (estadoContenedor === 'abierto') {
            colorEstado = '#4ade80';
            textoEstado = '🟢 ABIERTO (Recibiendo)';
          } else if (estadoContenedor === 'cerrado') {
            colorEstado = '#f87171';
            textoEstado = '🔴 CERRADO (Listo para salir)';
          } else if (estadoContenedor === 'finalizado') {
            colorEstado = '#D4AF37';
            textoEstado = '🏆 FINALIZADO (En Sucursal)';
          }

          const paquetes = paquetesPorEnvio[envio.id] || [];
          const cargandoPaq = cargandoPaquetes[envio.id];
          
          return (
            <div key={`${envio.id}-${refreshKey}`} className="envio-card" style={{
              background: '#1A202C',
              borderRadius: '12px',
              marginBottom: '20px',
              border: `1px solid ${esAereo ? '#60A5FA' : '#10B981'}`,
              overflow: 'hidden',
              opacity: estadoContenedor === 'finalizado' ? 0.7 : 1
            }}>
              <div className="envio-header" style={{
                padding: '16px',
                background: esAereo ? 'rgba(96, 165, 250, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ margin: 0, color: esAereo ? '#60A5FA' : '#10B981', fontSize: '16px' }}>
                      {esAereo ? '✈️ VUELO AÉREO' : '🚢 BARCO MARÍTIMO'}
                    </h4>
                    <div style={{ fontSize: '13px', color: '#A0AEC0', marginTop: '4px', fontWeight: 'bold' }}>
                      Código: <span style={{ color: '#E2E8F0' }}>{envio.codigo_qr}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: `rgba(${colorEstado === '#4ade80' ? '74, 222, 128' : colorEstado === '#f87171' ? '248, 113, 113' : colorEstado === '#D4AF37' ? '212, 175, 55' : '59, 130, 246'}, 0.2)`,
                      color: colorEstado
                    }}>
                      {textoEstado}
                    </span>
                    
                    <button
                      onClick={() => setQrModal({ codigoQr: envio.codigo_qr, tipo: envio.tipo })}
                      style={{ background: '#D4AF37', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      🖨️ Ver QR
                    </button>
                    
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(envio.codigo_qr);
                        alert('Código copiado');
                      }}
                      style={{ background: '#4A5568', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      📋 Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap', fontSize: '14px', color: '#E2E8F0' }}>
                  <div style={{ background: '#2D3748', padding: '8px 12px', borderRadius: '8px' }}><strong>📦 Paquetes:</strong> {envio.paquetes_actuales || 0}</div>
                  <div style={{ background: '#2D3748', padding: '8px 12px', borderRadius: '8px' }}><strong>📅 Creado:</strong> {new Date(envio.creado_en).toLocaleDateString()}</div>
                  {envio.procesado_en && <div style={{ background: '#2D3748', padding: '8px 12px', borderRadius: '8px' }}><strong>⏱️ Última act.:</strong> {new Date(envio.procesado_en).toLocaleString()}</div>}
                </div>

                {envio.paquetes_actuales > 0 && (
                  <button
                    onClick={async () => {
                      if (envioExpandido !== envio.id) {
                        await cargarPaquetesEnvio(envio.id, true);
                      }
                      setEnvioExpandido(envioExpandido === envio.id ? null : envio.id);
                    }}
                    style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    {envioExpandido === envio.id ? '▲ Ocultar paquetes' : '▼ Ver paquetes asignados'}
                  </button>
                )}

                {envioExpandido === envio.id && (
                  <div style={{ marginTop: '16px', maxHeight: '350px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #2D3748' }}>
                    {cargandoPaq ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#A0AEC0' }}>Cargando información de los paquetes...</div>
                    ) : paquetes.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#A0AEC0' }}>No hay paquetes en este contenedor</div>
                    ) : (
                      <table style={{ fontSize: '13px', width: '100%', borderCollapse: 'collapse', color: '#E2E8F0' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#0B0F19', zIndex: 1 }}>
                          <tr>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2D3748' }}>Tracking</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2D3748' }}>Cliente</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2D3748' }}>Precio</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2D3748' }}>Estado Pago</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2D3748' }}>Ubicación Actual</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2D3748' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paquetes.map((paquete, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #2D3748', background: idx % 2 === 0 ? '#1A202C' : '#171D27' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#60A5FA' }}>{paquete.tracking_id}</td>
                              <td style={{ padding: '10px 12px' }}>{paquete.cliente_nombre || <span style={{color: '#FBBF24'}}>Sin asignar (Fantasma)</span>}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{paquete.precio && paquete.precio !== 'Pendiente' ? `${paquete.precio}` : '⏳ Pendiente'}</td>
                              <td style={{ padding: '10px 12px' }}>{getEstadoPagoBadge(paquete.pagado)}</td>
                              <td style={{ padding: '10px 12px', color: '#A0AEC0' }}>{paquete.ubicacion_actual || 'En bodega Miami'}</td>
                              <td style={{ padding: '10px 12px' }}>
                                {estadoContenedor === 'abierto' && (
                                  <button
                                    onClick={() => quitarPaqueteDelContenedor(envio.id, paquete.tracking_id, estadoContenedor)}
                                    className="btn-quitar-paquete"
                                    title="Quitar paquete del contenedor"
                                  >
                                    🗑️ Quitar
                                  </button>
                                )}
                                {estadoContenedor !== 'abierto' && (
                                  <span style={{ fontSize: '10px', color: '#718096' }}>🔒 Bloqueado</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TablaEnvios;