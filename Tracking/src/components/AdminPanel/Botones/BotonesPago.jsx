import React from 'react';

const BotonesPago = ({ paquete, pestanaActiva, marcarComoPagado, marcarComoNoPagado, marcarComoRechazado }) => {
  const estaEnRevision = paquete.pago_reportado === true && paquete.pagado !== true;
  const estaPagado = paquete.pagado === true;
  const esAdvertencia = pestanaActiva === 'advertencia';

  // 1. Si ya está pagado, solo damos la opción de revertir (Desmarcar)
  if (estaPagado) {
    return (
      <button onClick={() => marcarComoNoPagado(paquete)} className="wp-btn wp-btn-warning">
        🔄 Desmarcar
      </button>
    );
  }

  // 2. Si el cliente reportó el pago y estamos revisando
  if (estaEnRevision) {
    return (
      <div className="wp-actions-group">
        <button onClick={() => marcarComoPagado(paquete)} className="wp-btn wp-btn-success">
          💰 Aprobar
        </button>
        <button onClick={() => marcarComoRechazado(paquete)} className="wp-btn wp-btn-danger">
          ❌ Rechazar
        </button>
      </div>
    );
  }

  // 3. Si estamos en la pestaña de advertencia (se entregó pero no ha pagado)
  if (esAdvertencia && !estaEnRevision && !estaPagado) {
    return (
      <button onClick={() => marcarComoPagado(paquete)} className="wp-btn wp-btn-success">
        💰 Marcar Pagado
      </button>
    );
  }

  return null;
};

export default BotonesPago;