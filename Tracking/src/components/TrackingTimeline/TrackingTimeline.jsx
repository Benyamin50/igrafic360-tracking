// src/components/TrackingTimeline/TrackingTimeline.jsx
import React, { useMemo } from 'react';
import './TrackingTimeline.css';

const TrackingTimeline = ({ steps, fotosMap = {}, tiposUbicacion = [], onVerFoto }) => {
  if (!steps || steps.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No hay informacion de seguimiento disponible</p>
      </div>
    );
  }

  const esPendiente = steps[0]?.evento?.includes('Pendiente');

  const elementos = useMemo(() => {
    return steps.map((step, index) => {
      const esActual = index === 0;
      
      let dotClass = 'dot';
      if (esPendiente && esActual) {
        dotClass += ' pending';
      } else if (esActual) {
        dotClass += ' current';
      } else {
        dotClass += ' completed';
      }

      let titleClass = 'event-title';
      if (esPendiente && esActual) {
        titleClass += ' pending';
      } else if (esActual) {
        titleClass += ' active';
      }

      const tipoUbicacion = tiposUbicacion[index];
      const tieneFoto = tipoUbicacion && fotosMap[tipoUbicacion];
      const fotoUrl = tieneFoto ? fotosMap[tipoUbicacion] : null;

      return (
        <div key={index} className="timeline-item">
          <div className="timeline-indicator">
            <div className={dotClass}></div>
            {index !== steps.length - 1 && <div className="line"></div>}
          </div>

          <div className="timeline-content">
            <div className="timeline-header">
              <div className="timeline-info">
                <h4 className={titleClass}>
                  {step.evento}
                </h4>
                {step.fecha && <p className="event-date">{step.fecha}</p>}
              </div>
              
              {tieneFoto && (
                <button 
                  className="foto-btn-timeline"
                  onClick={() => onVerFoto(fotoUrl)}
                  title={`Ver foto de: ${step.evento}`}
                >
                  Ver foto
                </button>
              )}
            </div>
          </div>
        </div>
      );
    });
  }, [steps, fotosMap, tiposUbicacion, onVerFoto, esPendiente]);

  return (
    <div className="timeline-container">
      {elementos}
    </div>
  );
};

export default React.memo(TrackingTimeline);