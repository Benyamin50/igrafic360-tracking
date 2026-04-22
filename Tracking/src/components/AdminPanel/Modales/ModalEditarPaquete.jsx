// src/components/AdminPanel/Modales/ModalEditarPaquete.jsx
import React from 'react';
import RegistroForm from '../../RegistroForm/RegistroForm';

const ModalEditarPaquete = ({ editando, paqueteAEditar, setEditando, handleGuardarDatosCompletos, cargando }) => {
  if (!editando || !paqueteAEditar) return null;

  // 1. Verificamos si es un paquete nuevo (sin pesar)
  const esPendiente = paqueteAEditar.peso === 'Pendiente' || paqueteAEditar.peso === '';

  // 2. Lógica blindada: Si el paquete es nuevo (Pendiente) y cumple CUALQUIERA de estas:
  // - El backend manda el flag prealerta == 1
  // - El backend manda un tracking_original
  // - Ya tiene observaciones previas (el cliente escribió qué trae la caja)
  // ENTONCES ES PREALERTA. Si no, es manual.
  const tieneObservacionesPrevias = paqueteAEditar.observaciones && paqueteAEditar.observaciones.trim() !== '';
  const tieneTrackingOriginal = Boolean(paqueteAEditar.tracking_original);
  const flagPrealerta = paqueteAEditar.prealerta == 1 || paqueteAEditar.prealerta === true;

  const esPrealerta = esPendiente && (flagPrealerta || tieneTrackingOriginal || tieneObservacionesPrevias);

  return (
    <div className="wp-modal-overlay" onClick={() => setEditando(false)}>
      <div className="wp-modal wp-modal-edit" onClick={e => e.stopPropagation()}>
        <div className="wp-modal-header">
          <h3>✏️ Completar datos de {paqueteAEditar.tracking_id || paqueteAEditar.id}</h3>
          <button className="wp-modal-close" onClick={() => setEditando(false)}>✕</button>
        </div>
        <div className="wp-modal-body">
          <RegistroForm 
            onSubmit={async (datosFormateados) => {
              // 🔥 ESPERAR a que se complete la actualización
              await handleGuardarDatosCompletos(datosFormateados);
              setEditando(false);
            }} 
            cargando={cargando}
            esPrealerta={esPrealerta}
            datosCliente={{
              tipo_envio: paqueteAEditar.tipo_envio,
              observaciones: paqueteAEditar.observaciones,
              tracking_original: paqueteAEditar.tracking_original,
              peso: paqueteAEditar.peso
            }}
          />
          <div className="wp-modal-actions">
            <button onClick={() => setEditando(false)} className="wp-btn wp-btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarPaquete;