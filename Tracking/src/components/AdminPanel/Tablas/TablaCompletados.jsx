// src/components/AdminPanel/Tablas/TablaCompletados.jsx
import React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const TablaCompletados = ({ paquetes, renderInfoPagoReportado, handleVerQR, marcarComoNoPagado }) => {
  
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
                
                {/* 🔥 Aquí se aplica el formato a la fecha de entrega */}
                <td>{formatearFecha(p?.Fecha_5 || p?.Fecha_Origen)}</td>
                
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