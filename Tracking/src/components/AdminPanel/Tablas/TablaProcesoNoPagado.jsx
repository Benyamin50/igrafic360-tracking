import React from 'react';
import BotonesAccion from '../Botones/BotonesAccion';

const TablaProcesoNoPagado = ({ 
  paquetes, 
  renderInfoPagoReportado, 
  handleVerQR, 
  pestanaActiva, 
  marcarComoPagado, 
  marcarComoNoPagado, 
  marcarComoRechazado,
  permisos = [], 
  userRol        
}) => {
  return (
    <div className="wp-table-container">
      <h3>⚠️ Paquetes en Proceso (NO Pagados)</h3>
      <table className="wp-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Peso</th>
            <th>Precio USD</th>
            <th>Estado / Reporte</th>
            <th>Última Ubicación</th>
            <th>QR</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {paquetes.length === 0 ? (
            <tr><td colSpan="7" className="wp-empty">No hay paquetes en proceso sin pagar</td></tr>
          ) : (
            paquetes.map((p, index) => {
              // 1. Calcular ubicación exacta
              let ultimaUbicacion = p.Llegada_Sucursal || p.Ubicacion_3 || p.Ubicacion_2 || p.Ubicacion_1 || 'En tránsito';
              
              // 2. Lógica para ocultar/mostrar QR
              // NOTA: Si en tu base de datos el ID del saco se llama diferente (ej: contenedor_id), cámbialo aquí abajo
              const estaEnContenedor = p.envio_id !== null && p.envio_id !== undefined; 
              const llegoASucursal = Boolean(p.Llegada_Sucursal || p.Entregado);
              const mostrarQR = !estaEnContenedor || llegoASucursal;

              return (
                <tr key={p?.tracking_id || p?.id || index}>
                  <td><strong>{p?.tracking_id || p?.id || '—'}</strong></td>
                  <td>{p?.peso || '—'}</td>
                  <td>{p?.precio || p?.precio_usd || '—'}</td>
                  <td>{renderInfoPagoReportado(p)}</td>
                  <td>{ultimaUbicacion}</td>
                  
                  {/* Celda del QR dinámica */}
                  <td>
                    {mostrarQR ? (
                      <button onClick={() => handleVerQR(p)} className="wp-btn-small">🖨️ QR</button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#718096', fontWeight: 'bold' }}>
                        🔒 En Saco
                      </span>
                    )}
                  </td>

                  <td>
                    <BotonesAccion 
                      paquete={p} 
                      pestanaActiva={pestanaActiva} 
                      marcarComoPagado={marcarComoPagado} 
                      marcarComoNoPagado={marcarComoNoPagado} 
                      marcarComoRechazado={marcarComoRechazado} 
                      permisos={permisos} 
                      userRol={userRol}   
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