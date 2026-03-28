import React from 'react';

const ModalComprobante = ({ fotoVer, setFotoVer }) => {
  if (!fotoVer) return null;

  return (
    <div className="wp-modal-overlay" onClick={() => setFotoVer(null)}>
      <div className="wp-modal wp-modal-foto" onClick={e => e.stopPropagation()}>
        <div className="wp-modal-header">
          <h3>Comprobante de Pago</h3>
          <button className="wp-modal-close" onClick={() => setFotoVer(null)}>✕</button>
        </div>
        <div className="wp-modal-body">
          <img src={fotoVer} alt="Comprobante" style={{ width: '100%', height: 'auto', borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
};

export default ModalComprobante;