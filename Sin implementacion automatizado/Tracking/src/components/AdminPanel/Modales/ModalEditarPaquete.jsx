import React from 'react';
import RegistroForm from '../../RegistroForm/RegistroForm';

const ModalEditarPaquete = ({ editando, paqueteAEditar, setEditando, handleGuardarDatosCompletos, cargando }) => {
  if (!editando || !paqueteAEditar) return null;

  return (
    <div className="wp-modal-overlay" onClick={() => setEditando(false)}>
      <div className="wp-modal wp-modal-edit" onClick={e => e.stopPropagation()}>
        <div className="wp-modal-header">
          <h3>✏️ Completar datos de {paqueteAEditar.tracking_id || paqueteAEditar.id}</h3>
          <button className="wp-modal-close" onClick={() => setEditando(false)}>✕</button>
        </div>
        <div className="wp-modal-body">
          <RegistroForm onSubmit={handleGuardarDatosCompletos} cargando={cargando} />
          <div className="wp-modal-actions">
            <button onClick={() => setEditando(false)} className="wp-btn wp-btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalEditarPaquete;