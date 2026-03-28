import React from 'react';
import BotonesAccion from '../Botones/BotonesAccion';

const TablaAdvertencia = ({ paquetes, renderInfoPagoReportado, handleVerQR, pestanaActiva, marcarComoPagado, marcarComoNoPagado, marcarComoRechazado }) => {
  return (
    <div className="wp-table-container">
      <h3>🚨 ADVERTENCIA: Paquetes Entregados sin Pago</h3>
      <div className="wp-alert">⚠️ Estos paquetes fueron entregados pero NO se ha registrado el pago. ¡Revisa y cobra!</div>
      <table className="wp-table">
        <thead>
          <tr><th>ID</th><th>Peso</th><th>Precio USD</th><th>Estado / Reporte</th><th>Fecha Entrega</th><th>QR</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {paquetes.length === 0 ? (
            <tr><td colSpan="7" className="wp-empty">✅ No hay paquetes entregados sin pagar</td></tr>
          ) : (
            paquetes.map((p, index) => (
              <tr key={p?.tracking_id || p?.id || index} className="wp-row-warning">
                <td><strong>{p?.tracking_id || p?.id || '—'}</strong></td>
                <td>{p?.peso || '—'}</td>
                <td>{p?.precio || p?.precio_usd || '—'}</td>
                <td>{renderInfoPagoReportado(p)}</td>
                <td>{p?.Fecha_5 || p?.Fecha_Origen || '—'}</td>
                <td><button onClick={() => handleVerQR(p)} className="wp-btn-small">🖨️ QR</button></td>
                <td>
                  <BotonesAccion 
                    paquete={p} 
                    pestanaActiva={pestanaActiva} 
                    marcarComoPagado={marcarComoPagado} 
                    marcarComoNoPagado={marcarComoNoPagado} 
                    marcarComoRechazado={marcarComoRechazado} 
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaAdvertencia;