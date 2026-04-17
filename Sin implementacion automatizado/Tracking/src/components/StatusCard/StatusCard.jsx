// src/components/StatusCard/StatusCard.jsx
import React, { useState, useRef, useEffect } from 'react';
import GaleriaFotos from '../GaleriaFotos/GaleriaFotos';
import { ApiService } from '../../services/api';
import './StatusCard.css';

const API_URL = "https://igrafic360.net/envio-api";

const LazyImage = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
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
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`lazy-image-container ${className || ''}`}>
      {!isLoaded && (
        <div className="image-placeholder">
          <div className="placeholder-spinner"></div>
        </div>
      )}
      {isVisible && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          style={{ display: isLoaded ? 'block' : 'none' }}
        />
      )}
    </div>
  );
};

const StatusCard = ({ 
  trackingId, 
  data, 
  precioPaquete,
  pagadoInicial = false, 
  metodoPagoInicial = null, 
  referenciaBinanceInicial = null,
  pagoReportadoInicial = false
}) => {
  const [pagado, setPagado] = useState(pagadoInicial);
  const [pagoReportado, setPagoReportado] = useState(pagoReportadoInicial);
  const [metodoPagoGuardado, setMetodoPagoGuardado] = useState(metodoPagoInicial);
  const [referenciaBinanceGuardada, setReferenciaBinanceGuardada] = useState(referenciaBinanceInicial);
  
  const [bsCalculados, setBsCalculados] = useState(null);
  const [consultandoTasa, setConsultandoTasa] = useState(false);

  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState('pagomovil');
  
  const [comprobante, setComprobante] = useState(null);
  const [comprobantePreview, setComprobantePreview] = useState(null);
  
  const [referenciaBinance, setReferenciaBinance] = useState('');
  
  const [enviando, setEnviando] = useState(false);
  const [mensajeSubida, setMensajeSubida] = useState('');
  const [mostrarOpcionesNotificacion, setMostrarOpcionesNotificacion] = useState(false);
  const [mensajeListo, setMensajeListo] = useState('');
  const [fotoUrlLista, setFotoUrlLista] = useState('');

  const montoUSDLimpio = precioPaquete && precioPaquete !== 'Pendiente' 
    ? parseFloat(String(precioPaquete).replace(/[^0-9.-]+/g, "")) 
    : 0;

  if (!data || data.length === 0 || data[0].evento?.includes('Pendiente')) {
    return (
      <div className="status-card-container">
        <h2 className="main-tracking-id">{trackingId}</h2>
        <div className="pending-message">
          <p>Este paquete esta en camino a Miami</p>
          <p>Cuando llegue a nuestra bodega, se actualizaran los datos</p>
        </div>
      </div>
    );
  }

  const ultimoEvento = data[data.length - 1];
  const eventoConPeso = data.find(item => item.peso && item.peso !== 'Pendiente') || ultimoEvento;

  const handleCalcularBs = async () => {
    if (montoUSDLimpio === 0) {
      alert('El precio aun no esta disponible para este paquete');
      return;
    }

    setConsultandoTasa(true);
    try {
      const res = await fetch(`${API_URL}/api/tasa-euro`);
      const tasaData = await res.json();

      const tasaOficial = tasaData.tasa || 40.50;
      const totalBs = (montoUSDLimpio * tasaOficial).toFixed(2);

      setBsCalculados({
        monto: totalBs.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
        montoPuro: totalBs,
        tasa: tasaOficial
      });
    } catch (error) {
      alert("Error al obtener la tasa. Intente de nuevo.");
    } finally {
      setConsultandoTasa(false);
    }
  };

  const getMensajeEstado = () => {
    const evento = ultimoEvento.evento || '';
    
    if (pagado) {
      if (evento.includes('Llego a Envios Benjamin')) {
        return { mensaje: 'Listo! Puedes retirar tu paquete', clase: 'mensaje-exito' };
      }
      if (evento.includes('En ruta a sucursal')) {
        return { mensaje: 'Pago confirmado, espera a que llegue a sucursal', clase: 'mensaje-confirmado' };
      }
      if (evento.includes('En aduana venezolana')) {
        return { mensaje: 'Pago confirmado - Paquete en aduana', clase: 'mensaje-confirmado' };
      }
      if (evento.includes('Saliendo de Miami')) {
        return { mensaje: 'Pago confirmado - Paquete en transito', clase: 'mensaje-confirmado' };
      }
      return { mensaje: 'Pago confirmado - Gracias por confiar en nosotros', clase: 'mensaje-confirmado' };
    }
    
    if (evento.includes('Llego a Envios Benjamin')) {
      return { mensaje: 'Necesitas cancelar el envio para poder retirar', clase: 'mensaje-urgente' };
    }
    if (evento.includes('En ruta a sucursal')) {
      return { mensaje: 'Paquete en camino - Recuerda pagar para retirar', clase: 'mensaje-advertencia' };
    }
    if (evento.includes('En aduana venezolana')) {
      return { mensaje: 'Paquete en aduana - Realiza el pago para agilizar la entrega', clase: 'mensaje-advertencia' };
    }
    if (evento.includes('Saliendo de Miami')) {
      return { mensaje: 'Paquete en transito - Puedes pagar desde ya', clase: 'mensaje-advertencia' };
    }
    return { mensaje: 'Pago pendiente - Realiza el pago para agilizar la entrega', clase: 'mensaje-advertencia' };
  };

  const mensajeEstado = getMensajeEstado();

  const getMetodoPagoTexto = () => {
    if (metodoPagoGuardado === 'binance') {
      return `Binance Pay ${referenciaBinanceGuardada ? `(ID: ${referenciaBinanceGuardada})` : ''}`;
    }
    if (metodoPagoGuardado === 'pagomovil') {
      return 'Pago Movil';
    }
    return '';
  };

  const handleComprobanteChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setComprobante(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprobantePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const copiarPayId = () => {
    navigator.clipboard.writeText("732006712");
    alert("Pay ID copiado al portapapeles");
  };

  const enviarComprobante = async () => {
    setEnviando(true);
    
    try {
      let mensajeTexto = '';
      let fotoUrl = '';

      if (metodoPagoSeleccionado === 'pagomovil') {
        if (!comprobante) {
          alert('Por favor, selecciona el comprobante de pago');
          setEnviando(false);
          return;
        }
        
        const bolivaresUsados = bsCalculados ? bsCalculados.monto : "No calculado";
        
        setMensajeSubida('Subiendo comprobante...');
        
        fotoUrl = await ApiService.subirFoto(comprobante, trackingId, 'comprobante_pago');
        
        await ApiService.reportarPago(trackingId, 'pagomovil');
        
        setMensajeSubida('Comprobante subido correctamente');
        
        mensajeTexto = `PAGO DE PAQUETE\n\nTracking: ${trackingId}\nMonto: Bs. ${bolivaresUsados} (USD ${montoUSDLimpio.toFixed(2)})\nMetodo: Pago Movil\nFecha: ${new Date().toLocaleString()}\n\nComprobante subido exitosamente.\nEnlace: ${fotoUrl}`;
      
      } else if (metodoPagoSeleccionado === 'binance') {
        if (!referenciaBinance.trim()) {
          alert('Por favor, ingresa el ID de Orden de Binance');
          setEnviando(false);
          return;
        }
        
        setMensajeSubida('Procesando pago Binance...');
        
        await ApiService.reportarPago(trackingId, 'binance', referenciaBinance);
        
        setMensajeSubida('Referencia procesada correctamente');
        mensajeTexto = `PAGO DE PAQUETE\n\nTracking: ${trackingId}\nMonto: $${montoUSDLimpio.toFixed(2)} USDT\nMetodo: Binance Pay\nOrder ID: ${referenciaBinance}\nFecha: ${new Date().toLocaleString()}`;
      }

      setMensajeListo(mensajeTexto);
      setFotoUrlLista(fotoUrl);
      setPagoReportado(true);
      setMensajeSubida('Pago registrado. Elige como notificar:');
      setMostrarOpcionesNotificacion(true);
      setEnviando(false);
      
      setTimeout(() => {
        if (metodoPagoSeleccionado === 'pagomovil') {
          setComprobante(null);
          setComprobantePreview(null);
        } else {
          setReferenciaBinance('');
        }
      }, 500);
      
    } catch (error) {
      alert(error.message || 'Error al procesar el pago. Intenta de nuevo.');
      setMensajeSubida('');
      setEnviando(false);
    }
  };

  return (
    <div className="status-card-container">
      <h2 className="main-tracking-id">{trackingId}</h2>
      
      <div className="details-grid">
        <h3 className="details-title">Detalles del pedido</h3>
        
        <div className="detail-item">
          <span className="detail-label">Tracking</span>
          <span className="detail-value">{trackingId}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Peso</span>
          <span className="detail-value">{eventoConPeso.peso || 'Pendiente'}</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Ultimo estado</span>
          <span className="status-badge">{ultimoEvento.evento || 'En transito'}</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Precio en Dolares</span>
          <span className="detail-value usd-highlight">{precioPaquete || 'Pendiente'}</span>
        </div>

        {precioPaquete && precioPaquete !== 'Pendiente' && (
          <div className="detail-item bs-calc-container">
            <span className="detail-label">Total en Bolivares</span>
            {!bsCalculados ? (
              <button 
                className="btn-calcular-bcv" 
                onClick={handleCalcularBs} 
                disabled={consultandoTasa}
              >
                {consultandoTasa ? 'Consultando BCV...' : 'Ver pago en Bs (Tasa Euro)'}
              </button>
            ) : (
              <div className="bs-resultado-box">
                <span className="bs-monto-grande">Bs. {bsCalculados.monto}</span>
                <small className="bs-tasa-info">
                  Tasa Euro BCV: {bsCalculados.tasa.toFixed(2)}
                  <br/>
                  <span className="bs-updated-tag">Actualizada al instante</span>
                </small>
                <button className="btn-recalcular-mini" onClick={() => setBsCalculados(null)}>
                  Recalcular
                </button>
              </div>
            )}
          </div>
        )}

        {ultimoEvento.fecha && (
          <div className="detail-item">
            <span className="detail-label">Fecha de ultima actualizacion</span>
            <span className="detail-value">{ultimoEvento.fecha}</span>
          </div>
        )}

        <div className="detail-item">
          <span className="detail-label">Estado de pago</span>
          <div className="estado-pago-info">
            {pagado ? (
              <>
                <span className="estado-pago-badge pagado">Pagado</span>
                {metodoPagoGuardado && (
                  <span className="metodo-pago-badge">
                    {getMetodoPagoTexto()}
                  </span>
                )}
              </>
            ) : pagoReportado ? (
              <span className="estado-pago-badge reportado">En revision</span>
            ) : (
              <span className="estado-pago-badge no-pagado">Pendiente</span>
            )}
          </div>
        </div>
      </div>

      <div className={`mensaje-estado ${mensajeEstado.clase}`}>
        {mensajeEstado.mensaje}
      </div>

      {!pagado && (
        <div className="pago-section">
          <div className="datos-bancarios">
            <h4>Realizar Pago</h4>
            
            {pagoReportado && (
              <div className="alerta-espera">
                Ya reportaste un pago para este paquete. Espera a que el administrador lo confirme.
              </div>
            )}
            
            {!pagoReportado && (
              <>
                <div className="metodos-pago">
                  <label className={`metodo-option ${metodoPagoSeleccionado === 'pagomovil' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="metodoPago"
                      value="pagomovil"
                      checked={metodoPagoSeleccionado === 'pagomovil'}
                      onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                    />
                    <span>Pago Movil</span>
                  </label>
                  
                  <label className={`metodo-option ${metodoPagoSeleccionado === 'binance' ? 'active-binance' : ''}`}>
                    <input
                      type="radio"
                      name="metodoPago"
                      value="binance"
                      checked={metodoPagoSeleccionado === 'binance'}
                      onChange={(e) => setMetodoPagoSeleccionado(e.target.value)}
                    />
                    <span>Binance Pay</span>
                  </label>
                </div>

                {metodoPagoSeleccionado === 'pagomovil' && (
                  <>
                    <div className="banco-info">
                      <div className="info-line">
                        <strong>Telefono:</strong>
                        <span>0412-5309882</span>
                      </div>
                      <div className="info-line">
                        <strong>Cedula:</strong>
                        <span>V-30019921</span>
                      </div>
                      <div className="info-line">
                        <strong>Banco:</strong>
                        <span>Provincial</span>
                      </div>
                      <div className="info-line destacado">
                        <strong>Monto a pagar:</strong>
                        <span className="monto-destacado">
                          {bsCalculados ? `Bs. ${bsCalculados.monto}` : <button className="btn-link-oro" onClick={handleCalcularBs}>Calcular Bs.</button>}
                        </span>
                      </div>
                      <div className="info-line">
                        <strong>Referencia:</strong>
                        <span>{trackingId}</span>
                      </div>
                    </div>

                    <div className="comprobante-section">
                      <label className="comprobante-label">
                        Adjuntar comprobante
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleComprobanteChange}
                          className="comprobante-input"
                        />
                      </label>
                      
                      {comprobantePreview && (
                        <div className="comprobante-preview">
                          <LazyImage src={comprobantePreview} alt="Comprobante" />
                          <button 
                            className="btn-eliminar"
                            onClick={() => {
                              setComprobante(null);
                              setComprobantePreview(null);
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {metodoPagoSeleccionado === 'binance' && (
                  <>
                    <div className="banco-info binance-box">
                      <div className="info-line">
                        <strong>Pay ID:</strong>
                        <span className="pay-id-box">
                          732006712 
                          <button onClick={copiarPayId} className="btn-copiar-mini">Copiar</button>
                        </span>
                      </div>
                      <div className="info-line">
                        <strong>Usuario:</strong>
                        <span>Musiclife2003</span>
                      </div>
                      <div className="info-line">
                        <strong>Correo:</strong>
                        <span>locasio918@gmail.com</span>
                      </div>
                      <div className="info-line destacado binance-destacado">
                        <strong>Monto a enviar:</strong>
                        <span className="monto-destacado">${montoUSDLimpio.toFixed(2)} USDT</span>
                      </div>
                    </div>

                    <div className="referencia-section">
                      <label className="comprobante-label">Numero de Orden (Order ID)</label>
                      <input
                        type="text"
                        placeholder="Ej: 1548796541"
                        value={referenciaBinance}
                        onChange={(e) => setReferenciaBinance(e.target.value)}
                        className="input-referencia"
                      />
                      <small className="nota-binance">Ingresa el ID numerico que Binance te da al completar el pago.</small>
                    </div>
                  </>
                )}

                {mensajeSubida && (
                  <div className="mensaje-subida">
                    {mensajeSubida}
                  </div>
                )}

                <button 
                  onClick={enviarComprobante}
                  className={`whatsapp-btn ${metodoPagoSeleccionado === 'binance' ? 'btn-binance' : ''}`}
                  disabled={enviando || (metodoPagoSeleccionado === 'pagomovil' && !comprobante) || (metodoPagoSeleccionado === 'binance' && !referenciaBinance)}
                >
                  {enviando 
                    ? 'Procesando...' 
                    : (metodoPagoSeleccionado === 'pagomovil' ? 'Subir comprobante y notificar por WhatsApp' : 'Notificar Pago por WhatsApp')}
                </button>
              </>
            )}
            
            <p className="nota-pago">
              <small>Al hacer clic: <br />1. Se registrara el pago en el sistema  <br />2. Podras elegir como notificar</small>
            </p>
          </div>
        </div>
      )}

      {mostrarOpcionesNotificacion && (
        <div className="modal-opciones-overlay" onClick={() => setMostrarOpcionesNotificacion(false)}>
          <div className="modal-opciones-card" onClick={e => e.stopPropagation()}>
            <h4>Notificar Pago</h4>
            <p>Tu pago ya esta registrado en el sistema. Elige como enviar la notificacion al administrador:</p>
            
            <div className="opciones-botones">
              <button 
                className="opcion-whatsapp"
                onClick={() => {
                  const url = `https://wa.me/584125309882?text=${encodeURIComponent(mensajeListo)}`;
                  window.open(url, '_blank');
                  setMostrarOpcionesNotificacion(false);
                  setMensajeSubida('');
                }}
              >
                Abrir WhatsApp
              </button>
              
              <button 
                className="opcion-copiar"
                onClick={() => {
                  navigator.clipboard.writeText(mensajeListo);
                  alert('Mensaje copiado al portapapeles');
                  setMostrarOpcionesNotificacion(false);
                  setMensajeSubida('');
                }}
              >
                Copiar mensaje
              </button>
            </div>
            
            <p className="nota-opciones">
              <small>Si se fue la luz o WhatsApp no abre, copia el mensaje y pegalo despues en WhatsApp o Telegram.</small>
            </p>
            
            <button 
              className="opcion-cerrar"
              onClick={() => {
                setMostrarOpcionesNotificacion(false);
                setMensajeSubida('');
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {pagado && (
        <div className="pago-confirmado-section">
          <div className="pago-confirmado-detalle">
            <strong>Pago confirmado</strong>
            
            {metodoPagoGuardado && (
              <div className="metodo-pago-usado">
                <span className="metodo-icono">
                  {metodoPagoGuardado === 'binance' ? '🟡' : '📱'}
                </span>
                <span className="metodo-texto">
                  Pagaste con: <strong>
                    {metodoPagoGuardado === 'binance' ? 'Binance Pay' : 'Pago Movil'}
                  </strong>
                  {metodoPagoGuardado === 'binance' && referenciaBinanceGuardada && (
                    <> <span style={{ color: '#A0AEC0' }}>(ID: {referenciaBinanceGuardada})</span></>
                  )}
                </span>
              </div>
            )}
            
            <p className="gracias-msg">Gracias por confiar en nosotros.</p>
          </div>
        </div>
      )}

      <GaleriaFotos trackingId={trackingId} />
    </div>
  );
};

export default StatusCard;