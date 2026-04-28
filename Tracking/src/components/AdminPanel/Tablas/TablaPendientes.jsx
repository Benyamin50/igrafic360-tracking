// src/components/AdminPanel/Tablas/TablaPendientes.jsx
import React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

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
        return fechaStr; // Si no logra entender la fecha, devuelve lo que venía en la base de datos
      }
      
      // Aquí definimos el formato: "dd MMMM yyyy" da "23 abril 2026"
      // Usamos capitalize para que quede "23 Abril 2026"
      const fechaFormateada = format(parsedDate, 'dd MMMM yyyy', { locale: es });
      return fechaFormateada.replace(/\b\w/g, l => l.toUpperCase());
      
    } catch (e) {
      return fechaStr;
    }
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
                  {/* 🔥 Aquí se aplica el formato a la fecha */}
                  <td>{formatearFecha(p?.Fecha_Origen || p?.creado_en)}</td>
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