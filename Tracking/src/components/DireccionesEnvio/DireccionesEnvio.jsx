// src/components/DireccionesEnvio/DireccionesEnvio.jsx
import React, { useState } from 'react';
import './DireccionesEnvio.css';

const DireccionesEnvio = ({ user }) => {
  const [tipoEnvio, setTipoEnvio] = useState('aereo');
  const [copiado, setCopiado] = useState(false);
  
  // 👈 TOMA EL CÓDIGO DIRECTAMENTE DEL USUARIO (viene de Firebase)
  const codigoCliente = user?.codigo_cliente || 'PENDIENTE';
  const nombreEmpresa = 'iGrafic360 Logistics';
  
  const tipos = {
    aereo: {
      nombre: 'AÉREO',
      prefijo: 'AEREO',
      tiempo: '5-7 días hábiles',
      icono: '✈️'
    },
    maritimo: {
      nombre: 'MARÍTIMO',
      prefijo: 'MARITIMO',
      tiempo: '20-25 días hábiles',
      icono: '🚢'
    }
  };
  
  const tipo = tipos[tipoEnvio];
  const nombreDestinatario = `${tipo.prefijo} - ${codigoCliente} - ${nombreEmpresa}`;
  
  const direccion = {
    calle: '13850 NW 4th St, Suite 101',
    ciudad: 'Miami',
    estado: 'FL',
    zip: '33182',
    pais: 'USA',
    telefono: '(305) 555-1234'
  };
  
  const direccionCompleta = `${nombreDestinatario}\n${direccion.calle}\n${direccion.ciudad}, ${direccion.estado} ${direccion.zip}\n${direccion.pais}\nTel: ${direccion.telefono}`;
  
  const copiarDireccion = () => {
    navigator.clipboard.writeText(direccionCompleta);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };
  
  return (
    <div className="direcciones-container">
      <div className="direcciones-header">
        <h2>📍 ¿Cómo comprar en USA?</h2>
        <p>Usa esta dirección cuando compres en Amazon, eBay, AliExpress o cualquier tienda online</p>
      </div>
      
      {/* Tarjeta con código del cliente */}
      <div className="codigo-cliente-card">
        <div className="codigo-icono">🔑</div>
        <h3>Tu código de cliente único</h3>
        <div className="codigo-grande">{codigoCliente}</div>
        <p>Este código te identifica. Úsalo en <strong>TODAS</strong> tus compras internacionales.</p>
      </div>
      
      {/* Selector de tipo de envío */}
      <div className="tipo-envio-selector">
        <button 
          className={`tipo-btn ${tipoEnvio === 'aereo' ? 'active-aereo' : ''}`}
          onClick={() => setTipoEnvio('aereo')}
        >
          ✈️ AÉREO (Rápido)
        </button>
        <button 
          className={`tipo-btn ${tipoEnvio === 'maritimo' ? 'active-maritimo' : ''}`}
          onClick={() => setTipoEnvio('maritimo')}
        >
          🚢 MARÍTIMO (Económico)
        </button>
      </div>
      
      {/* Tarjeta con la dirección */}
      <div className={`direccion-card ${tipoEnvio}`}>
        <div className="direccion-badge">
          {tipo.icono} ENVÍO {tipo.nombre} {tipo.icono}
        </div>
        
        <div className="direccion-contenido">
          <div className="campo">
            <label>👤 Nombre del destinatario:</label>
            <div className="valor nombre-destinatario">
              {nombreDestinatario}
            </div>
          </div>
          
          <div className="campo">
            <label>📍 Dirección:</label>
            <div className="valor">{direccion.calle}</div>
          </div>
          
          <div className="campo-row">
            <div className="campo">
              <label>🏙️ Ciudad:</label>
              <div className="valor">{direccion.ciudad}</div>
            </div>
            <div className="campo">
              <label>🗺️ Estado:</label>
              <div className="valor">{direccion.estado}</div>
            </div>
            <div className="campo">
              <label>📮 Código Postal:</label>
              <div className="valor">{direccion.zip}</div>
            </div>
          </div>
          
          <div className="campo">
            <label>🌎 País:</label>
            <div className="valor">{direccion.pais}</div>
          </div>
          
          <div className="campo">
            <label>📞 Teléfono de contacto:</label>
            <div className="valor">{direccion.telefono}</div>
          </div>
          
          <div className="campo instrucciones">
            <label>⏱️ Tiempo estimado a Venezuela:</label>
            <div className="valor">{tipo.tiempo}</div>
          </div>
        </div>
        
        <div className="direccion-actions">
          <button onClick={copiarDireccion} className="btn-copiar">
            {copiado ? '✅ ¡Copiado!' : '📋 Copiar dirección completa'}
          </button>
        </div>
      </div>
      
      {/* Instrucciones paso a paso */}
      <div className="instrucciones-pasos">
        <h3>📌 ¿Cómo usar esta dirección?</h3>
        <div className="pasos-grid">
          <div className="paso">
            <span className="paso-numero">1</span>
            <p>Compra en Amazon, eBay, AliExpress o cualquier tienda online</p>
          </div>
          <div className="paso">
            <span className="paso-numero">2</span>
            <p>En la dirección de envío, pega la dirección que copiaste arriba</p>
          </div>
          <div className="paso">
            <span className="paso-numero">3</span>
            <p>Asegúrate que el nombre tenga tu código: <strong>{codigoCliente}</strong></p>
          </div>
          <div className="paso">
            <span className="paso-numero">4</span>
            <p>Cuando el paquete llegue a Miami, lo verás en tu panel de tracking</p>
          </div>
        </div>
      </div>
      
      {/* Nota importante */}
      <div className="direccion-nota">
        <p>⚠️ <strong>IMPORTANTE:</strong> Siempre usa el código <strong>{codigoCliente}</strong> en el nombre del destinatario. Sin este código, no podremos identificar tu paquete.</p>
      </div>
    </div>
  );
};

export default DireccionesEnvio;