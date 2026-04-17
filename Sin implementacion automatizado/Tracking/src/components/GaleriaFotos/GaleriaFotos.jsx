// src/components/GaleriaFotos/GaleriaFotos.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ApiService } from '../../services/api';
import './GaleriaFotos.css';

const LazyGalleryImage = ({ src, alt, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && !isLoaded && !hasError) {
      const img = new Image();
      img.src = src;
      img.onload = () => setIsLoaded(true);
      img.onerror = () => setHasError(true);
    }
  }, [isVisible, src, isLoaded, hasError]);

  return (
    <div 
      ref={imgRef} 
      className="foto-item"
      onClick={onClick}
    >
      {!isLoaded && !hasError && (
        <div className="foto-placeholder">
          <div className="placeholder-spinner-mini"></div>
          <span>Cargando...</span>
        </div>
      )}
      {hasError && (
        <div className="foto-placeholder">
          <span>Error al cargar</span>
        </div>
      )}
      {isVisible && isLoaded && (
        <img
          src={src}
          alt={alt}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    </div>
  );
};

const GaleriaFotos = ({ trackingId }) => {
  const [fotos, setFotos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [fotoSeleccionada, setFotoSeleccionada] = useState(null);

  useEffect(() => {
    cargarFotos();
  }, [trackingId]);

  const cargarFotos = async () => {
    setCargando(true);
    try {
      const fotosConTipo = await ApiService.obtenerFotosPaquete(trackingId);
      const soloUrls = fotosConTipo.map(foto => foto.url);
      setFotos(soloUrls);
    } catch (error) {
      // Error silencioso
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="galeria-cargando">
        <div className="spinner"></div>
        <p>Cargando fotos...</p>
      </div>
    );
  }

  if (fotos.length === 0) return null;

  return (
    <>
      <div className="galeria-container">
        <h3 className="galeria-titulo">
          <span className="icono"></span> Fotos del paquete
        </h3>
        
        <div className="galeria-grid">
          {fotos.map((url, index) => (
            <LazyGalleryImage
              key={index}
              src={url}
              alt={`Foto ${index + 1}`}
              onClick={() => setFotoSeleccionada(url)}
            />
          ))}
        </div>
      </div>

      {fotoSeleccionada && (
        <div className="modal-vip-overlay" onClick={() => setFotoSeleccionada(null)}>
          <div className="modal-vip-contenido" onClick={e => e.stopPropagation()}>
            <button 
              className="modal-vip-cerrar"
              onClick={() => setFotoSeleccionada(null)}
            >
              ✕
            </button>
            <img 
              src={fotoSeleccionada} 
              alt="Foto ampliada"
              className="modal-vip-imagen"
            />
          </div>
        </div>
      )}
    </> 
  );
};

export default GaleriaFotos;