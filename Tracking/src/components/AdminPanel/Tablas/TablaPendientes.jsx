import React from 'react';

const TablaPendientes = ({ 
  paquetes, 
  renderInfoPagoReportado, 
  handleVerQR, 
  handleEditar, 
  onAsignar, 
  onMarcarFantasma,
  onEliminar 
}) => {
  // 🔥 Función para verificar si el paquete viene de prealerta
  const esDePrealerta = (paquete) => {
    return paquete?.tracking_original || paquete?.prealerta_id;
  };

  // 🔥 Función para verificar si el paquete está completado (tiene peso y precio)
  const estaCompletado = (paquete) => {
    const tienePeso = paquete?.peso && paquete.peso !== 'Pendiente' && paquete.peso !== '';
    const tienePrecio = paquete?.precio && paquete.precio !== 'Pendiente' && paquete.precio !== '';
    return tienePeso && tienePrecio;
  };

  // 🔥 Función para verificar si el paquete tiene cliente asignado
  const tieneCliente = (paquete) => {
    return paquete?.cliente_uid && paquete?.cliente_uid !== 'NULL' && paquete?.cliente_uid !== null;
  };

  return (
    <div className="wp-table-container">
      <h3>📌 Paquetes Pendientes</h3>
      <table className="wp-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Peso</th>
            <th>Precio USD</th>
            <th>Estado / Reporte</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>QR</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {paquetes.length === 0 ? (
            <tr><td colSpan="8" className="wp-empty">No hay paquetes pendientes</td></tr>
          ) : (
            paquetes.map((p, index) => {
              const esPrealerta = esDePrealerta(p);
              const completado = estaCompletado(p);
              const tieneClienteAsignado = tieneCliente(p);
              
              return (
                <tr key={p?.tracking_id || p?.id || index}>
                  <td><strong>{p?.tracking_id || p?.id || '—'}</strong></td>
                  <td>
                    {p?.peso || '—'}
                    {!completado && !esPrealerta && (
                      <span style={{ display: 'block', fontSize: '10px', color: '#f87171' }}>
                        ⚠️ Pendiente
                      </span>
                    )}
                  </td>
                  <td>
                    {p?.precio || p?.precio_usd || '—'}
                    {!completado && !esPrealerta && (
                      <span style={{ display: 'block', fontSize: '10px', color: '#f87171' }}>
                        ⚠️ Pendiente
                      </span>
                    )}
                  </td>
                  <td>{renderInfoPagoReportado(p)}</td>
                  <td>
                    {tieneClienteAsignado ? (
                      <span className="cliente-asignado" style={{ color: '#4ade80', fontSize: '12px' }}>
                        ✅ {p?.cliente_nombre || 'Asignado'}
                        {esPrealerta && (
                          <span style={{ display: 'block', fontSize: '10px', color: '#D4AF37' }}>
                            📋 Prealerta
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="cliente-pendiente" style={{ color: '#f87171', fontSize: '12px' }}>
                        ⚠️ Sin asignar
                        {!completado && !esPrealerta && (
                          <span style={{ display: 'block', fontSize: '10px', color: '#D4AF37' }}>
                            🔧 Complete primero
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td>{p?.Fecha_Origen || '—'}</td>
                  <td>
                    <button onClick={() => handleVerQR(p)} className="wp-btn-small">🖨️ QR</button>
                  </td>
                  <td style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {/* 🔥 Botón Completar: Siempre visible para editar */}
                    <button onClick={() => handleEditar(p)} className="wp-btn-small">✏️ Completar</button>
                    
                    {/* 🔥 Botón Asignar: SOLO si está completado y NO tiene cliente */}
                    {completado && !tieneClienteAsignado && !esPrealerta && (
                      <button onClick={() => onAsignar(p)} className="wp-btn-small wp-btn-success">👤 Asignar</button>
                    )}
                    
                    {/* 🔥 Botón Fantasma: AHORA aparece si NO tiene cliente asignado (sin importar si está completado o no) */}
                    {!tieneClienteAsignado && (
                      <button 
                        onClick={() => onMarcarFantasma(p)} 
                        className="wp-btn-small" 
                        style={{ background: '#f87171', color: 'white', border: 'none' }}
                        title="Enviar a Paquetes Sin Identificar"
                      >
                        👻
                      </button>
                    )}
                    
                    {/* Botón Eliminar: Aparece para todos */}
                    <button 
                      onClick={() => {
                        if (window.confirm(`¿Estás seguro de eliminar el paquete ${p?.tracking_id || p?.id}?\n\nEsta acción no se puede deshacer.`)) {
                          onEliminar(p);
                        }
                      }} 
                      className="wp-btn-small" 
                      style={{ 
                        background: '#dc2626', 
                        color: 'white', 
                        border: 'none',
                        fontWeight: 'bold'
                      }}
                      title="Eliminar paquete (Creado por error)"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaPendientes;