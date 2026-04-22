// src/components/MapaRuta/MapaRuta.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapaRuta.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 🔥 COORDENADAS CORREGIDAS: Destino Final en Caracas
const COORDENADAS_POR_EVENTO = {
  // ORIGEN
  'Recibido en Miami': { coords: [25.7963, -80.2620], modo: 'aereo' },
  'Recibido en Miami (MIA)': { coords: [25.7963, -80.2620], modo: 'aereo' },
  
  // AÉREO
  'En vuelo hacia Venezuela': { coords: [18.0000, -73.0000], modo: 'aereo' },
  'Arribo a Maiquetía (CCS)': { coords: [10.6031, -66.9906], modo: 'aereo' },
  'En ruta a sucursal': { coords: [10.4806, -66.9036], modo: 'aereo' }, 
  
  // MARÍTIMO
  'Saliendo de Miami': { coords: [19.5000, -80.5000], modo: 'maritimo' }, 
  'Transbordo en Colon (Panama)': { coords: [9.3595, -79.9015], modo: 'maritimo' },
  'Arribo a Puerto Cabello': { coords: [10.4727, -68.0121], modo: 'maritimo' },
  
  // DESTINO FINAL (Caracas)
  'Llego a Envios Benjamin': { coords: [10.4806, -66.9036], modo: 'destino' },
  'Entregado al cliente': { coords: [10.4806, -66.9036], modo: 'destino' },
};

const obtenerCoordenadas = (evento, modoRuta) => {
  if (evento) {
    if (evento.includes('vuelo') || evento.includes('Vuelo')) {
      return { coords: COORDENADAS_POR_EVENTO['En vuelo hacia Venezuela'].coords, modo: 'aereo' };
    }
    if (evento.includes('Maiquetía')) {
      return { coords: COORDENADAS_POR_EVENTO['Arribo a Maiquetía (CCS)'].coords, modo: 'aereo' };
    }
    if (evento.includes('En ruta a sucursal')) {
      return { coords: COORDENADAS_POR_EVENTO['En ruta a sucursal'].coords, modo: 'aereo' };
    }
    if (evento.includes('Transbordo')) {
      return { coords: COORDENADAS_POR_EVENTO['Transbordo en Colon (Panama)'].coords, modo: 'maritimo' };
    }
    if (evento.includes('Puerto Cabello')) {
      return { coords: COORDENADAS_POR_EVENTO['Arribo a Puerto Cabello'].coords, modo: 'maritimo' };
    }
    if (evento.includes('Saliendo de Miami')) {
      return { coords: COORDENADAS_POR_EVENTO['Saliendo de Miami'].coords, modo: 'maritimo' };
    }
    if (evento.includes('Llego a Envios Benjamin') || evento.includes('Entregado')) {
      return { coords: COORDENADAS_POR_EVENTO['Llego a Envios Benjamin'].coords, modo: 'destino' };
    }
    if (evento.includes('Recibido en Miami')) {
      if (modoRuta === 'aereo') {
        return { coords: [25.7963, -80.2620], modo: 'aereo' }; // Aeropuerto
      } else {
        return { coords: [25.7617, -80.1918], modo: 'maritimo' }; // Puerto
      }
    }
  }
  
  for (const [eventoClave, data] of Object.entries(COORDENADAS_POR_EVENTO)) {
    if (evento && evento.includes(eventoClave)) {
      return data;
    }
  }
  // Si no sabe dónde está, asume que llegó a la sucursal en Caracas
  return { coords: [10.4806, -66.9036], modo: 'destino' }; 
};

const detectarTipoEnvio = (ubicaciones) => {
  if (!ubicaciones || ubicaciones.length === 0) return 'maritimo';
  
  for (const ubic of ubicaciones) {
    const evento = ubic.evento || '';
    if (evento.includes('vuelo') || evento.includes('Vuelo') || evento.includes('Maiquetía') || evento.includes('aereo')) {
      return 'aereo';
    }
    if (evento.includes('Transbordo') || evento.includes('Puerto Cabello') || evento.includes('Colon')) {
      return 'maritimo';
    }
  }
  
  return 'maritimo';
};

const MapaRuta = ({ trackingId, ubicaciones = [], tipoEnvio = null }) => {
  const [ruta, setRuta] = useState([]);
  const [centro, setCentro] = useState([25.7617, -80.1918]);
  const [puntosConInfo, setPuntosConInfo] = useState([]);
  
  const modoRuta = useMemo(() => {
    if (tipoEnvio === 'aereo' || tipoEnvio === 'maritimo') {
      return tipoEnvio;
    }
    return detectarTipoEnvio(ubicaciones);
  }, [tipoEnvio, ubicaciones]);

  useEffect(() => {
    if (ubicaciones.length > 0) {
      const puntos = [];
      const info = [];
      
      ubicaciones.forEach((ubic, idx) => {
        const puntoData = obtenerCoordenadas(ubic.evento, modoRuta);
        
        puntos.push(puntoData.coords);
        info.push({
          evento: ubic.evento,
          fecha: ubic.fecha,
          esActual: idx === ubicaciones.length - 1,
          modo: puntoData.modo
        });
      });
      
      setRuta(puntos);
      setPuntosConInfo(info);
      
      if (puntos.length > 0) {
        setCentro(puntos[puntos.length - 1]);
      }
    }
  }, [ubicaciones, modoRuta]);

  const getLineStyle = () => {
    if (modoRuta === 'aereo') {
      return { color: '#60A5FA', weight: 3, opacity: 0.8, dashArray: '8, 8' };
    }
    return { color: '#10B981', weight: 4, opacity: 0.7 };
  };

  if (ruta.length === 0) {
    return null;
  }

  return (
    <div className="mapa-container">
      <h4 className="mapa-titulo">
        Ruta del paquete ({modoRuta === 'aereo' ? '✈️ Vía Aérea' : '🚢 Vía Marítima'})
      </h4>
      
      <MapContainer
        center={centro}
        zoom={5}
        style={{ height: '350px', width: '100%', borderRadius: '10px' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        {ruta.length > 1 && (
          <Polyline 
            positions={ruta} 
            {...getLineStyle()}
          />
        )}
        
        {ruta.map((pos, idx) => (
          <Marker key={idx} position={pos}>
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>{puntosConInfo[idx]?.evento || 'Ubicación'}</strong>
                <br />
                <small>{puntosConInfo[idx]?.fecha || ''}</small>
                {puntosConInfo[idx]?.esActual && (
                  <div style={{ color: '#D4AF37', marginTop: '5px', fontWeight: 'bold' }}>
                    📍 Ubicación actual
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="mapa-leyenda">
        <div className="leyenda-item">
          <span className="punto-actual"></span> Ubicación actual
        </div>
        <div className="leyenda-item">
          <span className="linea-ruta" style={{ backgroundColor: getLineStyle().color }}></span>
          Ruta {modoRuta === 'aereo' ? 'aérea ✈️' : 'marítima 🚢'}
        </div>
        {modoRuta === 'aereo' && (
          <div className="leyenda-item">
            <span className="linea-punteada" style={{ borderBottom: '3px dashed #60A5FA', display: 'inline-block', width: '20px', marginRight: '8px' }}></span> 
            Trayecto en vuelo
          </div>
        )}
      </div>
    </div>
  );
};

export default MapaRuta;