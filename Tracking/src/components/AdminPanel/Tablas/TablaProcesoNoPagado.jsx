import React from 'react';
import BotonesAccion from '../Botones/BotonesAccion';

const TablaProcesoNoPagado = ({ paquetes, renderInfoPagoReportado, handleVerQR, pestanaActiva, marcarComoPagado, marcarComoNoPagado, marcarComoRechazado }) => {
  return (
    <div className="wp-table-container">
      <h3>⚠️ Paquetes en Proceso (NO Pagados)</h3>
      <table className="wp-table">
        <thead>
          <tr><th>ID</th><th>Peso</th><th>Precio USD</th><th>Estado / Reporte</th><th>Última Ubicación</th><th>QR</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {paquetes.length === 0 ? (
            <tr><td colSpan="7" className="wp-empty">No hay paquetes en proceso sin pagar</td></tr>
          ) : (
            paquetes.map((p, index) => {
              let ultimaUbicacion = p.Ubicacion_3 || p.Ubicacion_2 || p.Ubicacion_1 || 'En tránsito';
              return (
                <tr key={p?.tracking_id || p?.id || index}>
                  <td><strong>{p?.tracking_id || p?.id || '—'}</strong></td>
                  <td>{p?.peso || '—'}</td>
                  <td>{p?.precio || p?.precio_usd || '—'}</td>
                  <td>{renderInfoPagoReportado(p)}</td>
                  <td>{ultimaUbicacion}</td>
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
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaProcesoNoPagado;