// src/components/TrackingSearch/TrackingSearch.jsx
import React, { useState } from 'react';
import './TrackingSearch.css';

const TrackingSearch = ({ onSearch, misPaquetes = [], userRol }) => {
  const [trackingId, setTrackingId] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorLocal('');

    const idBusqueda = trackingId.trim().toUpperCase();

    if (!idBusqueda) {
      setErrorLocal('Por favor ingresa un numero de guia');
      return;
    }

    const listaPaquetes = Array.isArray(misPaquetes) ? misPaquetes : [];
    
    const listaSegura = listaPaquetes.map(id => {
      if (typeof id === 'object') {
        return String(id.tracking_id || id.id || '').toUpperCase();
      }
      return String(id).toUpperCase();
    }).filter(id => id !== '');

    if (!listaSegura.includes(idBusqueda)) {
      setErrorLocal(`El paquete ${idBusqueda} no esta registrado a tu nombre.`);
      return;
    }

    onSearch(idBusqueda);
  };

  return (
    <div className="search-container">
      <h2 className="search-title">Rastrea tu paquete</h2>
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          placeholder="Ej: VNZ-123456"
          value={trackingId}
          onChange={(e) => {
            setTrackingId(e.target.value);
            setErrorLocal('');
          }}
          className="search-input"
        />
        <button type="submit" className="search-button">
          Consultar
        </button>
      </form>
      
      {errorLocal && (
        <div className="search-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{errorLocal}</span>
        </div>
      )}
    </div>
  );
};

export default TrackingSearch;