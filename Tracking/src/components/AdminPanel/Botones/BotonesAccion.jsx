const BotonesAccion = ({ paquete, pestanaActiva, marcarComoPagado, marcarComoNoPagado, marcarComoRechazado }) => {
  // 👈 CAMBIAR: aceptar tanto true como 1
  const estaEnRevision = (paquete.pago_reportado === true || paquete.pago_reportado === 1) && 
                         (paquete.pagado !== true && paquete.pagado !== 1);
  
  const estaPagado = paquete.pagado === true || paquete.pagado === 1;
  const esAdvertencia = pestanaActiva === 'advertencia';

  if (estaPagado) {
    return (
      <button onClick={() => marcarComoNoPagado(paquete)} className="wp-btn wp-btn-warning">
        🔄 Desmarcar
      </button>
    );
  }

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

  if (esAdvertencia && !estaEnRevision && !estaPagado) {
    return (
      <button onClick={() => marcarComoPagado(paquete)} className="wp-btn wp-btn-success">
        💰 Marcar Pagado
      </button>
    );
  }

  return null;
};

export default BotonesAccion;