// src/components/AdminPanel/Modales/RegistroForm.jsx
import React, { useState, useEffect } from 'react';
import { calcularEnvio, DESTINOS } from '../../config/tarifas';
import './RegistroForm.css';

const RegistroForm = ({ onSubmit, cargando = false, esPrealerta = false, datosCliente = {} }) => {
  const [formData, setFormData] = useState({
    origen: 'Miami',
    destino: 'Caracas',
    tipoEnvio: esPrealerta ? (datosCliente.tipo_envio || 'aereo') : 'aereo',
    pesoReal: '',
    alto: '',
    largo: '',
    ancho: '',
    // Si NO es prealerta, empezamos con observaciones vacías
    observaciones: !esPrealerta ? '' : (datosCliente.observaciones || '') 
  });

  const [calculo, setCalculo] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [errores, setErrores] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    
    if (name === 'observaciones' && errores.observaciones) {
      setErrores(prev => ({ ...prev, observaciones: '' }));
    }
    
    if (['pesoReal', 'alto', 'largo', 'ancho', 'destino', 'tipoEnvio'].includes(name)) {
      recalcularPrecio(newData);
    }
  };

  const recalcularPrecio = async (data) => {
    const pesoReal = parseFloat(data.pesoReal) || 0;
    const alto = parseFloat(data.alto) || 0;
    const largo = parseFloat(data.largo) || 0;
    const ancho = parseFloat(data.ancho) || 0;
    
    if (pesoReal > 0 || (alto > 0 && largo > 0 && ancho > 0)) {
      setCalculando(true);
      try {
        const resultado = await calcularEnvio({
          pesoRealKg: pesoReal,
          alto, largo, ancho,
          destino: data.destino,
          tipoEnvio: data.tipoEnvio,
          incluirSeguro: true
        });
        setCalculo(resultado);
      } catch (error) {
        // Error silencioso
      } finally {
        setCalculando(false);
      }
    } else {
      setCalculo(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const erroresTemp = {};
    
    // Solo validar observaciones si NO es prealerta
    if (!esPrealerta && !formData.observaciones.trim()) {
      erroresTemp.observaciones = 'Debes agregar una observacion o descripcion del paquete';
    }
    
    if (formData.tipoEnvio === 'aereo' && !formData.pesoReal && (!formData.alto || !formData.largo || !formData.ancho)) {
      erroresTemp.general = 'Debes ingresar peso real o dimensiones para envios aereos';
    }
    if (formData.tipoEnvio === 'maritimo' && (!formData.alto || !formData.largo || !formData.ancho)) {
      erroresTemp.general = 'Los envios maritimos requieren Alto, Largo y Ancho obligatoriamente.';
    }
    
    if (Object.keys(erroresTemp).length > 0) {
      setErrores(erroresTemp);
      return;
    }
    
    const datosFormateados = {
      origen: formData.origen,
      peso: calculo ? calculo.pesoACobrarTexto : '',
      precio: calculo ? `$${calculo.totalUSD}` : '',
      observaciones: esPrealerta 
        ? datosCliente.observaciones // Si es prealerta, usa la original
        : `${formData.tipoEnvio === 'aereo' ? 'Aereo' : 'Maritimo'} Destino: ${formData.destino} | ${formData.observaciones}`,
      peso_volumetrico: calculo?.pesoVolumetricoKg || calculo?.piesCubicos,
      tasa_usada: calculo?.tasaEUR,
      tipoEnvio: formData.tipoEnvio
    };
    
    onSubmit(datosFormateados);
    
    // Solo resetear si NO es prealerta
    if (!esPrealerta) {
      setFormData({
        origen: 'Miami', destino: 'Caracas', tipoEnvio: 'aereo',
        pesoReal: '', alto: '', largo: '', ancho: '', observaciones: ''
      });
      setCalculo(null);
      setErrores({});
    }
  };

  return (
    <form onSubmit={handleSubmit} className="registro-form">
      
      {/* Informacion de prealerta si aplica */}
      {esPrealerta && (
        <div className="prealerta-info" style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ color: '#D4AF37', marginBottom: '5px', fontWeight: 'bold' }}>
            📋 Este paquete fue registrado por el cliente mediante PREALERTA
          </p>
          <p style={{ fontSize: '13px', color: '#A0AEC0', marginBottom: '5px' }}>
            Tracking original: <strong>{datosCliente.tracking_original || 'N/A'}</strong>
          </p>
          <p style={{ fontSize: '13px', color: '#A0AEC0', marginBottom: '5px' }}>
            Tipo de envio elegido por el cliente: 
            <strong style={{ color: datosCliente.tipo_envio === 'aereo' ? '#D4AF37' : '#3182CE', marginLeft: '5px' }}>
              {datosCliente.tipo_envio === 'aereo' ? '✈️ AEREO' : '🚢 MARITIMO'}
            </strong>
          </p>
          <p style={{ fontSize: '13px', color: '#A0AEC0' }}>
            Descripcion: <strong>{datosCliente.observaciones || 'N/A'}</strong>
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <label style={{ 
          flex: 1, 
          padding: '15px', 
          background: formData.tipoEnvio === 'aereo' ? '#D4AF37' : '#1A202C', 
          color: formData.tipoEnvio === 'aereo' ? '#000' : '#fff', 
          textAlign: 'center', 
          borderRadius: '8px', 
          cursor: esPrealerta ? 'not-allowed' : 'pointer', 
          fontWeight: 'bold', 
          border: '1px solid #D4AF37', 
          transition: '0.3s',
          opacity: esPrealerta ? 0.7 : 1
        }}>
          <input 
            type="radio" 
            name="tipoEnvio" 
            value="aereo" 
            checked={formData.tipoEnvio === 'aereo'} 
            onChange={handleChange} 
            disabled={esPrealerta}
            style={{ display: 'none' }} 
          />
          Aereo
        </label>
        <label style={{ 
          flex: 1, 
          padding: '15px', 
          background: formData.tipoEnvio === 'maritimo' ? '#3182CE' : '#1A202C', 
          color: formData.tipoEnvio === 'maritimo' ? '#fff' : '#fff', 
          textAlign: 'center', 
          borderRadius: '8px', 
          cursor: esPrealerta ? 'not-allowed' : 'pointer', 
          fontWeight: 'bold', 
          border: '1px solid #3182CE', 
          transition: '0.3s',
          opacity: esPrealerta ? 0.7 : 1
        }}>
          <input 
            type="radio" 
            name="tipoEnvio" 
            value="maritimo" 
            checked={formData.tipoEnvio === 'maritimo'} 
            onChange={handleChange} 
            disabled={esPrealerta}
            style={{ display: 'none' }} 
          />
          Maritimo
        </label>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label>Origen:</label>
          <select name="origen" value={formData.origen} onChange={handleChange} disabled={cargando}>
            <option value="Miami">Miami</option>
            <option value="China">China</option>
            <option value="Panama">Panama</option>
          </select>
        </div>
        
        <div className="form-group" style={{ flex: 1 }}>
          <label>Destino:</label>
          <select name="destino" value={formData.destino} onChange={handleChange} disabled={cargando}>
            {Object.keys(DESTINOS).map(dest => (
              <option key={dest} value={dest}>{dest}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-section">
        <h4>Datos del paquete</h4>
        
        {formData.tipoEnvio === 'aereo' && (
          <div className="form-group">
            <label>Peso real (kg):</label>
            <input type="number" name="pesoReal" value={formData.pesoReal} onChange={handleChange} placeholder="Ej: 5" step="0.1" disabled={cargando} />
          </div>
        )}

        <div className="form-row tres-columnas">
          <div className="form-group">
            <label>Alto (cm):</label>
            <input type="number" name="alto" value={formData.alto} onChange={handleChange} disabled={cargando} />
          </div>
          <div className="form-group">
            <label>Largo (cm):</label>
            <input type="number" name="largo" value={formData.largo} onChange={handleChange} disabled={cargando} />
          </div>
          <div className="form-group">
            <label>Ancho (cm):</label>
            <input type="number" name="ancho" value={formData.ancho} onChange={handleChange} disabled={cargando} />
          </div>
        </div>
        <small>{formData.tipoEnvio === 'aereo' ? 'Factor: 6000 cm/kg' : 'Se calcularan Pies Cubicos (CFT)'}</small>
      </div>

      {errores.general && <div className="error-general">{errores.general}</div>}
      {calculando && <div className="calculando-mensaje">Calculando tarifa para {formData.destino}...</div>}

      {calculo && !calculando && (
        <div className="preview-precio" style={{ borderLeft: formData.tipoEnvio === 'aereo' ? '4px solid #D4AF37' : '4px solid #3182CE' }}>
          <h4>Resumen {formData.tipoEnvio === 'aereo' ? 'Aereo' : 'Maritimo'}</h4>
          <div className="precio-detalle">
            
            {formData.tipoEnvio === 'aereo' && (
              <>
                <p><strong>Peso mayor entre Real/Volumen:</strong> {calculo.pesoACobrarTexto}</p>
                <p><strong>Tarifa {formData.destino}:</strong> ${calculo.tarifaAplicada}/lb</p>
                {calculo.aplicoMinimo && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>Aplica tarifa minima de ${calculo.minimoReferencia}</p>}
              </>
            )}

            {formData.tipoEnvio === 'maritimo' && (
              <>
                <p><strong>Volumen calculado:</strong> {calculo.pesoACobrarTexto}</p>
                <p><strong>Tarifa {formData.destino}:</strong> ${calculo.tarifaAplicada}/CFT</p>
                <p style={{ color: '#4ade80', fontSize: '0.85rem' }}>Sin costo minimo aplicado</p>
              </>
            )}

            <p><strong>Seguro (5%):</strong> Incluido</p>
            <p className="precio-total-usd" style={{ fontSize: '1.2rem', marginTop: '10px' }}>
              <strong>Total USD:</strong> ${calculo.totalUSD}
            </p>
            <p className="precio-total-bs">
              <strong>En Bs:</strong> {calculo.totalBsFormateado} <br/>
              <small>Tasa: Bs. {calculo.tasaEUR}/USD</small>
            </p>
          </div>
        </div>
      )}

      {/* Campo observaciones - SOLO VISIBLE SI NO ES PREALERTA */}
      {!esPrealerta && (
        <div className="form-group">
          <label>Observaciones <span style={{ color: '#f87171' }}>*</span></label>
          <textarea 
            name="observaciones" 
            value={formData.observaciones} 
            onChange={handleChange} 
            rows="3" 
            disabled={cargando}
            placeholder="Ej: Celular iPhone 13, color azul, con funda..."
            style={{
              borderColor: errores.observaciones ? '#f87171' : 'rgba(212, 175, 55, 0.3)'
            }}
          />
          {errores.observaciones && (
            <small style={{ color: '#f87171', marginTop: '4px', display: 'block' }}>
              ⚠️ {errores.observaciones}
            </small>
          )}
        </div>
      )}

      {/* Si es prealerta, mostrar la descripcion que puso el cliente (solo lectura) */}
      {esPrealerta && datosCliente.observaciones && (
        <div className="form-group">
          <label>Descripcion del cliente:</label>
          <textarea 
            value={datosCliente.observaciones} 
            rows="3" 
            disabled={true}
            style={{
              background: '#0B0F19',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '8px',
              color: '#A0AEC0',
              padding: '12px',
              width: '100%',
              resize: 'vertical'
            }}
          />
          <small style={{ color: '#718096' }}>El cliente ya registro esta descripcion al hacer la prealerta</small>
        </div>
      )}

      <button type="submit" className="btn-submit" disabled={cargando || calculando || (!esPrealerta && !calculo)}>
        {cargando ? 'Registrando...' : calculando ? 'Calculando...' : `Registrar Paquete ${formData.tipoEnvio === 'aereo' ? 'Aereo' : 'Maritimo'}`}
      </button>
    </form>
  );
};

export default RegistroForm;