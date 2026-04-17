import React from 'react';

const TablaPendientes = ({ paquetes, renderInfoPagoReportado, handleVerQR, handleEditar, onAsignar, onMarcarFantasma }) => {
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
            paquetes.map((p, index) => (
              <tr key={p?.tracking_id || p?.id || index}>
                <td><strong>{p?.tracking_id || p?.id || '—'}</strong></td>
                <td>{p?.peso || '—'}</td>
                <td>{p?.precio || p?.precio_usd || '—'}</td>
                <td>{renderInfoPagoReportado(p)}</td>
                <td>
                  {p?.cliente_uid ? (
                    <span className="cliente-asignado" style={{ color: '#4ade80', fontSize: '12px' }}>
                      ✅ {p?.cliente_nombre || 'Asignado'}
                    </span>
                  ) : (
                    <span className="cliente-pendiente" style={{ color: '#f87171', fontSize: '12px' }}>
                      ⚠️ Sin asignar
                    </span>
                  )}
                </td>
                <td>{p?.Fecha_Origen || '—'}</td>
                <td>
                  <button onClick={() => handleVerQR(p)} className="wp-btn-small">🖨️ QR</button>
                </td>
                <td style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <button onClick={() => handleEditar(p)} className="wp-btn-small">✏️ Completar</button>
                  <button onClick={() => onAsignar(p)} className="wp-btn-small wp-btn-success">👤 Asignar</button>
                  
                  {/* 👈 NUEVO BOTÓN: Solo aparece si NO tiene cliente asignado */}
                  {!p?.cliente_uid && (
                    <button 
                      onClick={() => onMarcarFantasma(p)} 
                      className="wp-btn-small" 
                      style={{ background: '#f87171', color: 'white', border: 'none' }}
                      title="Enviar a Paquetes Sin Identificar"
                    >
                      👻
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaPendientes;