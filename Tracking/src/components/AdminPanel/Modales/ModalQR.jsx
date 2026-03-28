import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const ModalQR = ({ mostrarQR, setMostrarQR }) => {
  if (!mostrarQR || !mostrarQR.id) return null;

  const descargarQR = () => {
    const canvas = document.querySelector('.wp-qr-container canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `QR-${mostrarQR.id}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="wp-modal-overlay" onClick={() => setMostrarQR(null)}>
      <div className="wp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px', textAlign: 'center' }}>
        <div className="wp-modal-header">
          <h3>🎫 QR del Paquete</h3>
          <button className="wp-modal-close" onClick={() => setMostrarQR(null)}>✕</button>
        </div>
        <div className="wp-modal-body wp-qr-container">
          <QRCodeCanvas value={mostrarQR.id} size={200} bgColor="#ffffff" fgColor="#000000" level="H" includeMargin={true} />
          <p className="wp-qr-id" style={{ marginTop: '10px', fontWeight: 'bold' }}>{mostrarQR.id}</p>
          <div className="wp-qr-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={descargarQR} className="wp-btn wp-btn-primary">⬇️ Descargar</button>
            <button onClick={() => setMostrarQR(null)} className="wp-btn wp-btn-secondary">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalQR;