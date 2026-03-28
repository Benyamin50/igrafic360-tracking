// src/components/VerificacionTelefono/VerificacionTelefono.jsx
import React, { useState, useEffect } from 'react';
import './VerificacionTelefono.css';

const VerificacionTelefono = ({ 
  telefono, 
  onVerificado, 
  onCancelar,
  cargandoInicial = false 
}) => {
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [tiempoReenvio, setTiempoReenvio] = useState(0);
  const [codigoEnviado, setCodigoEnviado] = useState(false);

  // Enviar código al cargar el componente
  useEffect(() => {
    enviarCodigo();
  }, []);

  // Timer para reenvío
  useEffect(() => {
    if (tiempoReenvio > 0) {
      const timer = setTimeout(() => setTiempoReenvio(tiempoReenvio - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [tiempoReenvio]);

  const enviarCodigo = async () => {
    setEnviando(true);
    setError('');
    setMensajeExito('');

    try {
      const response = await fetch('https://igrafic360.net/bot/enviar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono })
      });

      const data = await response.json();

      if (data.success) {
        setCodigoEnviado(true);
        setMensajeExito('📱 Código enviado a tu WhatsApp');
        setTiempoReenvio(60);
      } else {
        setError(data.error || 'Error al enviar el código');
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const verificarCodigo = async () => {
    if (!codigo.trim()) {
      setError('Ingresa el código de 6 dígitos');
      return;
    }

    if (codigo.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    setVerificando(true);
    setError('');

    try {
      const response = await fetch('https://igrafic360.net/bot/verificar-codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, codigo })
      });

      const data = await response.json();

      if (data.success) {
        onVerificado(true);
      } else {
        setError(data.error || 'Código incorrecto');
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div className="verificacion-container">
      <div className="verificacion-card">
        <h2>📱 Verifica tu teléfono</h2>
        
        <div className="verificacion-info">
          <p>Hemos enviado un código de 6 dígitos a:</p>
          <p className="telefono-destino">{telefono}</p>
        </div>

        {mensajeExito && (
          <div className="verificacion-success">
            {mensajeExito}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-group">
          <label>Código de verificación</label>
          <input
            type="text"
            placeholder="Ej: 123456"
            value={codigo}
            onChange={(e) => {
              const soloNumeros = e.target.value.replace(/[^0-9]/g, '');
              if (soloNumeros.length <= 6) {
                setCodigo(soloNumeros);
                setError('');
              }
            }}
            maxLength={6}
            autoFocus
            className="codigo-input"
            disabled={verificando}
          />
        </div>

        <button
          onClick={verificarCodigo}
          disabled={verificando || codigo.length !== 6}
          className="submit-button"
        >
          {verificando ? 'Verificando...' : '✅ Verificar código'}
        </button>

        <div className="verificacion-footer">
          <p>¿No recibiste el código?</p>
          <button
            onClick={enviarCodigo}
            disabled={enviando || tiempoReenvio > 0}
            className="switch-button"
          >
            {enviando ? 'Enviando...' : tiempoReenvio > 0 ? `Reenviar en ${tiempoReenvio}s` : '📲 Reenviar código'}
          </button>
        </div>

        <button
          onClick={onCancelar}
          className="switch-button cancelar-btn"
        >
          ← Volver al registro
        </button>
      </div>
    </div>
  );
};

export default VerificacionTelefono;