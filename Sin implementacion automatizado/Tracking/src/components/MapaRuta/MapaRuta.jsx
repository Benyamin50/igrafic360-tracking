// src/components/MapaRuta/MapaRuta.jsx
import React, { useState, useEffect } from 'react';
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

const COORDENADAS_POR_EVENTO = {
  'Recibido en Miami': [25.7617, -80.1918],
  'Saliendo de Miami': [23.5, -79.5],
  'En aduana venezolana': [8.9824, -79.5199],
  'En ruta a sucursal': [12.0, -72.0],
  'Llego a Envios Benjamin': [10.4806, -66.9036],
  'Entregado al cliente': [10.4806, -66.9036],
};

const MapaRuta = ({ trackingId, ubicaciones = [] }) => {
  const [ruta, setRuta] = useState([]);
  const [centro, setCentro] = useState([25.7617, -80.1918]);
  const [puntosConInfo, setPuntosConInfo] = useState([]);

  useEffect(() => {
    if (ubicaciones.length > 0) {
      const puntos = [];
      const info = [];
      
      ubicaciones.forEach(ubic => {
        let coords = null;
        
        for (const [evento, coordenadas] of Object.entries(COORDENADAS_POR_EVENTO)) {
          if (ubic.evento.includes(evento)) {
            coords = coordenadas;
            break;
          }
        }
        
        if (!coords) {
          coords = [10.4806, -66.9036];
        }
        
        puntos.push(coords);
        info.push({
          evento: ubic.evento,
          fecha: ubic.fecha,
          esActual: info.length === 0
        });
      });
      
      setRuta(puntos);
      setPuntosConInfo(info);
      
      if (puntos.length > 0) {
        setCentro(puntos[puntos.length - 1]);
      }
    }
  }, [ubicaciones]);

  if (ruta.length === 0) {
    return null;
  }

  return (
    <div className="mapa-container">
      <h4 className="mapa-titulo">
        <span></span> Ruta del paquete
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
            color="#D4AF37" 
            weight={4} 
            opacity={0.7}
          />
        )}
        
        {ruta.map((pos, idx) => (
          <Marker key={idx} position={pos}>
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>{puntosConInfo[idx]?.evento || 'Ubicacion'}</strong>
                <br />
                <small>{puntosConInfo[idx]?.fecha || ''}</small>
                {idx === ruta.length - 1 && (
                  <div style={{ color: '#D4AF37', marginTop: '5px' }}>
                    Ubicacion actual
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="mapa-leyenda">
        <div className="leyenda-item">
          <span className="punto-actual"></span> Ubicacion actual
        </div>
        <div className="leyenda-item">
          <span className="linea-ruta"></span> Ruta recorrida
        </div>
      </div>
    </div>
  );
};

export default MapaRuta;