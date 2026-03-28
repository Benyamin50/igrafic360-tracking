// src/components/AdminPanel/Tablas/TablaSinIdentificar.jsx
import React from 'react';

const TablaSinIdentificar = ({ paquetes, onAsignar }) => {
  return (
    <div className="wp-table-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ color: '#f87171', margin: 0 }}>👻 Paquetes Sin Identificar</h3>
        <span style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', padding: '5px 10px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
          {paquetes.length} paquetes
        </span>
      </div>

      <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(212,175,55,0.1)', borderRadius: '8px', borderLeft: '3px solid #D4AF37' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#A0AEC0' }}>
          📦 Paquetes que llegaron a Miami sin código de cliente. Usa el código de envío para identificar al dueño.
        </p>
      </div>

      <table className="wp-table">
        <thead>
          <tr>
            <th>ID Interno</th>
            <th>Peso</th>
            <th>Fecha Llegada</th>
            <th>Observaciones</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {paquetes.length === 0 ? (
            <tr>
              {/* Actualizado el colSpan a 6 */}
              <td colSpan="6" className="wp-empty">
                <div style={{ padding: '40px', textAlign: 'center', color: '#A0AEC0' }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>✨</span>
                  <p>No hay paquetes sin identificar</p>
                </div>
              </td>
            </tr>
          ) : (
            paquetes.map((p, index) => {
              const idUnico = p?.tracking_id || p?.id || index;
              const observaciones = p?.observaciones || '';

              return (
                <tr key={idUnico} style={{ background: 'rgba(248,113,113,0.05)' }}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#D4AF37', fontWeight: 'bold' }}>
                      {p?.tracking_id || p?.id || '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ color: p?.peso && p.peso !== 'Pendiente' ? '#4ade80' : '#f87171' }}>
                      {p?.peso || 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#A0AEC0' }}>
                    {p?.fecha_llegada || p?.creado_en || p?.Fecha_Origen || '—'}
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    {observaciones ? (
                      <span title={observaciones} style={{ fontSize: '0.8rem', color: '#A0AEC0', cursor: 'help' }}>
                        📝 {observaciones.length > 40 ? observaciones.substring(0, 40) + '...' : observaciones}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#718096' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      ⚠️ Sin dueño
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => onAsignar(p)}
                      className="wp-btn-small"
                      style={{
                        background: '#D4AF37',
                        color: '#0B0F19',
                        border: 'none',
                        fontWeight: 'bold',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      👤 Asignar cliente
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

export default TablaSinIdentificar;