import React from 'react';

const TablaCompletados = ({ paquetes, renderInfoPagoReportado, handleVerQR, marcarComoNoPagado }) => {
  return (
    <div className="wp-table-container">
      <h3>✅ Paquetes Completados</h3>
      <table className="wp-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Peso</th>
            <th>Precio USD</th>
            <th>Estado / Reporte</th>
            <th>Fecha Entrega</th>
            <th>QR</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {paquetes.length === 0 ? (
            <tr><td colSpan="7" className="wp-empty">No hay paquetes completados</td></tr>
          ) : (
            paquetes.map((p, index) => (
              <tr key={p?.tracking_id || p?.id || index}>
                <td><strong>{p?.tracking_id || p?.id || '—'}</strong></td>
                <td>{p?.peso || '—'}</td>
                <td>{p?.precio || p?.precio_usd || '—'}</td>
                <td>{renderInfoPagoReportado(p)}</td>
                <td>{p?.Fecha_5 || p?.Fecha_Origen || '—'}</td>
                
                {/* 🔥 QR Bloqueado automáticamente porque ya se entregó */}
                <td>
                  <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 'bold' }}>
                    ✅ Entregado
                  </span>
                </td>
                
                <td>
                  <button onClick={() => marcarComoNoPagado(p)} className="wp-btn wp-btn-warning">
                    🔄 Desmarcar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaCompletados;