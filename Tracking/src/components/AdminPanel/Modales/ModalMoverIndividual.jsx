// src/components/AdminPanel/Modales/ModalMoverIndividual.jsx
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../services/api';

const ModalMoverIndividual = ({ onClose, onMover, tipoEnvio }) => {
  const [paquetesIndividuales, setPaquetesIndividuales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [seleccionados, setSeleccionados] = useState([]);
  const [moviendo, setMoviendo] = useState(false);

  // Cargar paquetes individuales (completos, con cliente, modo='individual')
  const cargarPaquetesIndividuales = async () => {
    setCargando(true);
    try {
      const response = await fetch(`${API_URL}/api/paquetes/individuales?tipo=${tipoEnvio}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setPaquetesIndividuales(data.paquetes || []);
    } catch (error) {
      console.error('Error cargando paquetes:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPaquetesIndividuales();
  }, [tipoEnvio]);

  const toggleSeleccion = (trackingId) => {
    setSeleccionados(prev =>
      prev.includes(trackingId)
        ? prev.filter(id => id !== trackingId)
        : [...prev, trackingId]
    );
  };

  const handleMover = async () => {
    if (seleccionados.length === 0) return;
    
    setMoviendo(true);
    try {
      const response = await fetch(`${API_URL}/api/paquetes/mover-contenedor`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_ids: seleccionados,
          tipo_envio: tipoEnvio
        })
      });
      
      if (response.ok) {
        onMover(seleccionados.length);
        onClose();
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      alert('Error al mover paquetes');
    } finally {
      setMoviendo(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-mover-individual" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {tipoEnvio === 'aereo' ? '✈️' : '🚢'} Mover paquetes INDIVIDUALES a {tipoEnvio === 'aereo' ? 'CONTENEDOR AÉREO' : 'CONTENEDOR MARÍTIMO'}
          </h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="info-text">
            Estos son los paquetes que están en modo <strong>INDIVIDUAL</strong> 
            (completos y con cliente asignado pero sin contenedor).
            <br />
            Selecciona los que quieres mover al contenedor {tipoEnvio === 'aereo' ? 'AÉREO' : 'MARÍTIMO'}.
          </p>

          {cargando ? (
            <div className="loading-spinner">Cargando paquetes...</div>
          ) : paquetesIndividuales.length === 0 ? (
            <div className="empty-message">
              No hay paquetes individuales de tipo {tipoEnvio === 'aereo' ? 'AÉREO' : 'MARÍTIMO'} para mover.
            </div>
          ) : (
            <div className="paquetes-lista">
              <div className="lista-header">
                <input
                  type="checkbox"
                  checked={seleccionados.length === paquetesIndividuales.length && paquetesIndividuales.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSeleccionados(paquetesIndividuales.map(p => p.tracking_id));
                    } else {
                      setSeleccionados([]);
                    }
                  }}
                />
                <span>Seleccionar todos ({paquetesIndividuales.length})</span>
              </div>
              
              <div className="paquetes-grid">
                {paquetesIndividuales.map(paquete => (
                  <div key={paquete.tracking_id} className="paquete-item">
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(paquete.tracking_id)}
                      onChange={() => toggleSeleccion(paquete.tracking_id)}
                    />
                    <div className="paquete-info">
                      <div className="tracking-id">{paquete.tracking_id}</div>
                      <div className="cliente-nombre">{paquete.cliente_nombre || 'Sin cliente'}</div>
                      <div className="precio">{paquete.precio}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
          <button
            className="btn-mover"
            onClick={handleMover}
            disabled={seleccionados.length === 0 || moviendo}
          >
            {moviendo ? 'Moviendo...' : `Mover ${seleccionados.length} paquete(s) al contenedor`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMoverIndividual;