// src/components/AdminPanel/Tablas/TablaProcesoPagado.jsx
import React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TablaProcesoPagado = ({ paquetes, renderInfoPagoReportado, handleVerQR, marcarComoNoPagado }) => {
  
  // 🛠️ Función para darle formato bonito a la fecha (Ej: "23 Abril 2026")
  const formatearFecha = (fechaStr) => {
    if (!fechaStr || fechaStr === '0000-00-00 00:00:00' || fechaStr === '0000-00-00' || fechaStr === 'NULL') {
      return '—';
    }
    
    try {
      let parsedDate;
      
      if (fechaStr.includes('-') && fechaStr.includes(':')) {
        parsedDate = parseISO(fechaStr.replace(' ', 'T'));
      } else if (fechaStr.includes('/') && fechaStr.includes(',')) {
        const [fechaPart] = fechaStr.split(',');
        const [dia, mes, anio] = fechaPart.trim().split('/');
        parsedDate = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
      } else if (fechaStr.includes('/')) {
        const partes = fechaStr.split('/');
        if (partes.length === 3) {
          parsedDate = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
        }
      } else {
        parsedDate = new Date(fechaStr);
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) {
        return fechaStr; // Si falla, devuelve la fecha cruda
      }
      
      const fechaFormateada = format(parsedDate, 'dd MMMM yyyy', { locale: es });
      return fechaFormateada.replace(/\b\w/g, l => l.toUpperCase());
      
    } catch (e) {
      return fechaStr;
    }
  };

  return (
    <div className="wp-table-container">
      <h3>💚 Paquetes en Proceso (Pagados)</h3>
      <table className="wp-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Peso</th>
            <th>Precio USD</th>
            <th>Estado / Reporte</th>
            <th>Última Ubicación</th>
            <th>Fecha Pago</th>
            <th>QR</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {paquetes.length === 0 ? (
            <tr><td colSpan="8" className="wp-empty">No hay paquetes en proceso pagados</td></tr>
          ) : (
            paquetes.map((p, index) => {
              // 1. Calcular ubicación exacta
              let ultimaUbicacion = p.Llegada_Sucursal || p.Ubicacion_3 || p.Ubicacion_2 || p.Ubicacion_1 || 'En tránsito';
              
              // 2. Lógica para ocultar/mostrar QR
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
                  
                  {/* 🔥 Aquí se aplica el formato a la fecha de pago */}
                  <td>{formatearFecha(p?.fecha_pago)}</td>
                  
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
                    <button onClick={() => marcarComoNoPagado(p)} className="wp-btn wp-btn-warning">
                      🔄 Desmarcar
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

export default TablaProcesoPagado;