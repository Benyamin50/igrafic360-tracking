// src/components/Prealerta/Prealerta.jsx
import React, { useState } from 'react';
import { API_URL } from '../../services/api';
import { usePrealertas } from '../../hooks/usePrealertas';
import './Prealerta.css';

const Prealerta = ({ uid, onSuccess }) => {
  const [formData, setFormData] = useState({
    tracking_original: '',
    tipo_envio: 'aereo',
    descripcion: '',
    valor_usd: ''
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  
  // 🔥 USANDO SWR - Carga con caché y actualización automática
  const { 
    prealertas: misPrealertas, 
    isLoading: cargandoLista, 
    mutate: mutatePrealertas 
  } = usePrealertas(uid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tracking_original.trim()) {
      setError('El número de tracking es obligatorio');
      return;
    }
    if (!formData.descripcion.trim()) {
      setError('La descripción del paquete es obligatoria');
      return;
    }

    setEnviando(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/prealerta/registrar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_original: formData.tracking_original,
          tipo_envio: formData.tipo_envio,
          descripcion: formData.descripcion,
          valor_usd: formData.valor_usd || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar prealerta');
      }

      setExito(`✅ Prealerta registrada. Cuando llegue a nuestra bodega, se te asignará un tracking interno.`);
      setFormData({ tracking_original: '', tipo_envio: 'aereo', descripcion: '', valor_usd: '' });
      
      // 🔥 Recargar la lista de prealertas con SWR (sin recargar la página)
      await mutatePrealertas();
      
      if (onSuccess) onSuccess();
      
      setTimeout(() => setExito(''), 5000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // 🔥 Función para obtener el estado de la prealerta
  const obtenerEstadoPrealerta = (prealerta) => {
    if (prealerta.procesado === 1 || prealerta.procesado === true) {
      return {
        texto: 'Atendido',
        clase: 'estado-atendido',
        icono: '✅',
        mensaje: `Tu paquete ya fue recibido en nuestra bodega.`
      };
    }
    return {
      texto: 'Pendiente',
      clase: 'estado-pendiente',
      icono: '⏳',
      mensaje: 'Tu prealerta está registrada. Cuando llegue a Miami, se procesará.'
    };
  };

  return (
    <div className="prealerta-container">
      {/* 🔥 COLUMNA IZQUIERDA - FORMULARIO */}
      <div className="prealerta-col-formulario">
        <div className="prealerta-card">
          <div className="prealerta-header">
            <h2>📋 Registrar Prealerta</h2>
            <p>¿Ya hiciste una compra? Registra aquí el número de tracking de tu paquete que te dio "Amazon, shine, ebay", entre otros</p>
          </div>

          <form onSubmit={handleSubmit} className="prealerta-form">
            <div className="form-group">
              <label>Número de Tracking (de la tienda) *</label>
              <input
                type="text"
                value={formData.tracking_original}
                onChange={(e) => setFormData({...formData, tracking_original: e.target.value})}
                placeholder="Ej: 1Z999AA10123456784"
                disabled={enviando}
              />
              <small>El número que te dio la tienda donde compraste (Amazon, Shein, eBay, etc.)</small>
            </div>

            <div className="form-group">
              <label>Tipo de Envío *</label>
              <div className="tipo-envio-options">
                <label className={`tipo-option ${formData.tipo_envio === 'aereo' ? 'active-aereo' : ''}`}>
                  <input
                    type="radio"
                    value="aereo"
                    checked={formData.tipo_envio === 'aereo'}
                    onChange={(e) => setFormData({...formData, tipo_envio: e.target.value})}
                  />
                  <span>✈️ Aéreo</span>
                </label>
                <label className={`tipo-option ${formData.tipo_envio === 'maritimo' ? 'active-maritimo' : ''}`}>
                  <input
                    type="radio"
                    value="maritimo"
                    checked={formData.tipo_envio === 'maritimo'}
                    onChange={(e) => setFormData({...formData, tipo_envio: e.target.value})}
                  />
                  <span>🚢 Marítimo</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Descripción del paquete *</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                rows="3"
                placeholder="Ej: iPhone 13, color azul, 128GB, con funda"
                disabled={enviando}
              />
              <small>Describe qué contiene el paquete</small>
            </div>

            <div className="form-group">
              <label>Valor (USD) - Opcional</label>
              <input
                type="number"
                value={formData.valor_usd}
                onChange={(e) => setFormData({...formData, valor_usd: e.target.value})}
                placeholder="Ej: 799"
                step="0.01"
                disabled={enviando}
              />
              <small>El valor que pagaste por el producto (para referencia)</small>
            </div>

            {error && <div className="prealerta-error">{error}</div>}
            {exito && <div className="prealerta-exito">{exito}</div>}

            <button type="submit" disabled={enviando} className="btn-prealerta">
              {enviando ? 'Registrando...' : 'Registrar Prealerta'}
            </button>
          </form>
        </div>
      </div>

      {/* 🔥 COLUMNA DERECHA - MIS PREALERTAS */}
      <div className="prealerta-col-lista">
        <div className="prealerta-mis-prealertas">
          <h3>📦 Mis Prealertas</h3>
          
          {cargandoLista ? (
            <div className="prealerta-loading">
              <div className="prealerta-spinner"></div>
              <span>Cargando tus prealertas...</span>
            </div>
          ) : misPrealertas.length === 0 ? (
            <div className="prealerta-vacio">
              <p>No tienes prealertas registradas.</p>
              <p>Registra tu primer paquete usando el formulario de la izquierda.</p>
            </div>
          ) : (
            <div className="prealerta-lista">
              {misPrealertas.map((prealerta) => {
                const estado = obtenerEstadoPrealerta(prealerta);
                return (
                  <div key={prealerta.id} className={`prealerta-item ${estado.clase}`}>
                    <div className="prealerta-item-header">
                      <span className="prealerta-icono">{estado.icono}</span>
                      <div className="prealerta-info">
                        <div className="prealerta-tracking">
                          <strong>Tracking original:</strong> {prealerta.tracking_original}
                        </div>
                        <div className="prealerta-tipo">
                          {prealerta.tipo_envio === 'aereo' ? '✈️ Aéreo' : '🚢 Marítimo'}
                        </div>
                      </div>
                      <span className={`prealerta-estado ${estado.clase}`}>
                        {estado.texto}
                      </span>
                    </div>
                    
                    <div className="prealerta-item-body">
                      <p><strong>Descripción:</strong> {prealerta.descripcion}</p>
                      {prealerta.valor_declarado_usd && (
                        <p><strong>Valor declarado:</strong> ${prealerta.valor_declarado_usd}</p>
                      )}
                      <p className="prealerta-mensaje-estado">{estado.mensaje}</p>
                      
                      {prealerta.procesado === 1 && prealerta.tracking_asignado && (
                        <div className="prealerta-tracking-asignado">
                          <strong>🎯 Tu tracking interno:</strong> 
                          <code>{prealerta.tracking_asignado}</code>
                          <button 
                            onClick={() => navigator.clipboard.writeText(prealerta.tracking_asignado)}
                            className="btn-copiar-mini"
                          >
                            Copiar
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="prealerta-item-footer">
                      <small>Registrado el: {new Date(prealerta.creado_en).toLocaleString()}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Prealerta;