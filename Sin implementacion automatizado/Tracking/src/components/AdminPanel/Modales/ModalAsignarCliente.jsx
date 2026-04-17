// src/components/AdminPanel/Modales/ModalAsignarCliente.jsx
import React, { useState } from 'react';
import { ApiService } from '../../../services/api';

const API_URL = "https://igrafic360.net/envio-api";

const ModalAsignarCliente = ({ paquete, onClose, onAsignado }) => {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');

  const buscarCliente = async () => {
    if (!busqueda.trim() || busqueda.length < 2) {
      setError('Ingresa al menos 2 caracteres');
      return;
    }
    
    setBuscando(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/buscar-cliente?q=${encodeURIComponent(busqueda)}`);
      const data = await response.json();
      setResultados(data.clientes || []);
      if (data.clientes?.length === 0) {
        setError('No se encontraron clientes');
      }
    } catch (error) {
      setError('Error al buscar');
    } finally {
      setBuscando(false);
    }
  };

  const asignar = async (cliente) => {
    try {
      await ApiService.asignarPaquete(cliente.uid, paquete.tracking_id || paquete.id);
      alert(`✅ Paquete asignado a ${cliente.nombre}`);
      onAsignado();
      onClose();
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="wp-modal-overlay" onClick={onClose}>
      <div className="wp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="wp-modal-header">
          <h3>📦 Asignar paquete {paquete.tracking_id || paquete.id}</h3>
          <button className="wp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="wp-modal-body">
          <p>Buscar cliente por código, teléfono o nombre:</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Ej: MOP396185, 584125309882, Benjamin"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ flex: 1, padding: '10px', background: '#0B0F19', border: '1px solid #D4AF37', borderRadius: '5px', color: 'white' }}
            />
            <button onClick={buscarCliente} disabled={buscando} className="wp-btn wp-btn-primary">
              {buscando ? 'Buscando...' : '🔍 Buscar'}
            </button>
          </div>
          
          {error && <div className="error-message" style={{ color: '#ff6b6b', marginBottom: '15px' }}>{error}</div>}
          
          {resultados.length > 0 && (
            <div className="resultados-lista">
              <p style={{ marginBottom: '10px', color: '#A0AEC0' }}>Clientes encontrados:</p>
              {resultados.map(cliente => (
                <div key={cliente.uid} style={{ 
                  padding: '10px', 
                  border: '1px solid rgba(212,175,55,0.2)', 
                  borderRadius: '8px', 
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>{cliente.nombre}</strong><br/>
                    <small style={{ color: '#A0AEC0' }}>Código: {cliente.codigo_cliente} | Tel: {cliente.telefono}</small>
                  </div>
                  <button onClick={() => asignar(cliente)} className="wp-btn wp-btn-success">
                    Asignar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalAsignarCliente;