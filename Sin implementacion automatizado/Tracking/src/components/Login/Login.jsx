// src/components/Login/Login.jsx
import React, { useState } from 'react';
import { ApiService, API_URL } from '../../services/api';  
import { countryCodes } from '../../data/countryCodes';
import './Login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [paisCode, setPaisCode] = useState('+58');
  const [numeroLocal, setNumeroLocal] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false); 
  const [esperandoCodigo, setEsperandoCodigo] = useState(false); 
  const [esperandoCodigoRecuperacion, setEsperandoCodigoRecuperacion] = useState(false);
  const [codigoIngresado, setCodigoIngresado] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const handleSolicitarRecuperacion = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Ingresa tu correo electronico.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await ApiService.solicitarRecuperacionPassword(email.trim());
      setMensajeExito('Codigo enviado! Revisa tu correo.');
      setEsperandoCodigoRecuperacion(true);
    } catch (err) {
      setError('No pudimos encontrar una cuenta con ese correo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (codigoIngresado.length !== 6) {
      setError('El codigo debe tener 6 digitos.');
      return;
    }
    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await ApiService.cambiarPasswordConCodigo(email.trim(), codigoIngresado, nuevaPassword);
      
      setMensajeExito('Contraseña actualizada con exito. Ya puedes iniciar sesion.');
      setIsForgotPassword(false);
      setEsperandoCodigoRecuperacion(false);
      setPassword(''); 
      setCodigoIngresado('');
    } catch (err) {
      setError(err.message || 'Codigo incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        if (!numeroLocal.trim()) {
          setError('El telefono es obligatorio');
          setLoading(false);
          return;
        }

        const emailLimpio = email.toLowerCase().trim();
        await ApiService.enviarCodigoEmail(emailLimpio);
        setEsperandoCodigo(true);
        
      } else {
        const data = await ApiService.login(email.trim(), password);
        onLogin(data.cliente, data.cliente.uid);
      }
    } catch (err) {
      setError(err.message || 'Email o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    if (codigoIngresado.length !== 6) {
      setError('El codigo debe tener 6 digitos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const emailLimpio = email.toLowerCase().trim();
      const telefonoLimpio = `${paisCode}${numeroLocal.replace(/\D/g, '')}`;
      
      await ApiService.verificarCodigoEmail(emailLimpio, codigoIngresado);
      const registroData = await ApiService.registrar(emailLimpio, password, nombre, telefonoLimpio);
      
      if (!registroData || !registroData.uid) {
        throw new Error('Error en registro');
      }
      
      const loginData = await ApiService.login(emailLimpio, password);
      onLogin(loginData.cliente, loginData.cliente.uid);

    } catch (err) {
      setError(err.message || 'Codigo incorrecto o expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#D4AF37' }}>Recuperar Cuenta</h2>
          
          {!esperandoCodigoRecuperacion ? (
            <>
              <p style={{ color: '#A0AEC0', marginBottom: '20px' }}>Escribe tu correo y te enviaremos un codigo de seguridad de 6 digitos.</p>
              <form onSubmit={handleSolicitarRecuperacion} className="login-form">
                <div className="form-group">
                  <label>Correo electronico</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ejemplo@correo.com" />
                </div>
                {error && <div className="error-message-box">{error}</div>}
                {mensajeExito && <div style={{ background: '#1A202C', color: '#4ADE80', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{mensajeExito}</div>}
                <button type="submit" disabled={loading} className="submit-button">
                  {loading ? <span className="spinner"></span> : 'Enviar codigo de seguridad'}
                </button>
                <button type="button" className="switch-button" style={{ marginTop: '20px' }} onClick={() => { setIsForgotPassword(false); setError(''); setMensajeExito(''); }}>
                  ← Volver al inicio
                </button>
              </form>
            </>
          ) : (
            <>
              <p style={{ color: '#A0AEC0', marginBottom: '20px' }}>Ingresa el codigo que enviamos a <strong>{email}</strong> y crea tu nueva clave.</p>
              <form onSubmit={handleCambiarPassword} className="login-form">
                <div className="form-group">
                  <label>Codigo de 6 digitos</label>
                  <input 
                    type="text" 
                    placeholder="000000" 
                    value={codigoIngresado} 
                    onChange={(e) => setCodigoIngresado(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '5px' }}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Nueva Contraseña</label>
                  <input type="password" placeholder="••••••••" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} required />
                </div>
                {error && <div className="error-message-box">{error}</div>}
                <button type="submit" disabled={loading} className="submit-button" style={{ marginTop: '10px' }}>
                  {loading ? <span className="spinner"></span> : 'Actualizar contraseña'}
                </button>
                <button type="button" className="switch-button" style={{ marginTop: '20px' }} onClick={() => setEsperandoCodigoRecuperacion(false)}>
                  ← Atras
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  if (esperandoCodigo) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#D4AF37', marginBottom: '10px' }}>Revisa tu Correo</h2>
          <p style={{ color: '#A0AEC0', marginBottom: '20px' }}>Codigo enviado a: <strong style={{ color: 'white' }}>{email}</strong></p>
          <form onSubmit={handleVerificarCodigo} className="login-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="000000"
                value={codigoIngresado}
                onChange={(e) => setCodigoIngresado(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ textAlign: 'center', fontSize: '28px', letterSpacing: '8px', fontWeight: 'bold', padding: '15px' }}
                required
              />
            </div>
            {error && <div className="error-message-box">{error}</div>}
            <button type="submit" disabled={loading} className="submit-button" style={{ marginTop: '15px' }}>
              {loading ? <span className="spinner"></span> : 'Verificar y Crear Cuenta'}
            </button>
            <button type="button" className="switch-button" style={{ marginTop: '20px' }} onClick={() => setEsperandoCodigo(false)}>
              ← Cambiar correo
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
           <h2>{isRegister ? 'Registro' : 'Bienvenida'}</h2>
           <p className="subtitle">iGrafic360 - Sistema de Tracking</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <>
              <div className="form-group">
                <label>Nombre completo</label>
                <input type="text" placeholder="Ej: Juan Perez" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              
              <div className="form-group">
                <label>Telefono</label>
                <div className="telefono-input-group" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <select 
                    value={paisCode} 
                    onChange={(e) => setPaisCode(e.target.value)} 
                    className="pais-select"
                    style={{ flexShrink: 0, width: '100px' }}
                  >
                    {countryCodes.map((pais, index) => (
                      <option key={index} value={pais.code}>{pais.flag} {pais.code}</option>
                    ))}
                  </select>
                  
                  <input 
                    type="tel" 
                    placeholder="4121234567" 
                    value={numeroLocal} 
                    onChange={(e) => {
                      const soloNumeros = e.target.value.replace(/\D/g, '');
                      setNumeroLocal(soloNumeros);
                    }} 
                    required 
                    style={{ flex: 1, minWidth: '150px' }} 
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Correo electronico</label>
            <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <div className="error-message-box">{error}</div>}
          {mensajeExito && <div style={{ background: '#1A202C', color: '#4ADE80', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{mensajeExito}</div>}

          <button type="submit" disabled={loading} className="submit-button">
            {loading ? <span className="spinner"></span> : (isRegister ? 'Siguiente paso →' : 'Entrar al Panel')}
          </button>
        </form>

        <div className="login-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => { setIsRegister(!isRegister); setError(''); setIsForgotPassword(false); setMensajeExito(''); }} 
            className="switch-button" 
            type="button"
          >
            {isRegister ? 'Ya tienes cuenta? Inicia sesion' : 'No tienes cuenta? Registrate aqui'}
          </button>

          {!isRegister && (
            <button 
              type="button" 
              onClick={() => { setIsForgotPassword(true); setError(''); setMensajeExito(''); }} 
              style={{ background: 'none', border: 'none', color: '#A0AEC0', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', marginTop: '5px' }}
            >
              Olvido su contraseña?
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;