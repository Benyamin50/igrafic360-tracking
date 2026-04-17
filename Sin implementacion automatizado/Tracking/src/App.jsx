// src/App.js
import React, { useState, useEffect } from 'react';
import TrackingSearch from './components/TrackingSearch/TrackingSearch';
import TrackingTimeline from './components/TrackingTimeline/TrackingTimeline';
import StatusCard from './components/StatusCard/StatusCard';
import AdminPanel from './components/AdminPanel/AdminPanel';
import Login from './components/Login/Login';
import ClienteDashboard from './components/ClienteDashboard/ClienteDashboard';
import DireccionesEnvio from './components/DireccionesEnvio/DireccionesEnvio'; 
import { ApiService, API_URL } from './services/api';
import './App.css';

function App() {
  const [modo, setModo] = useState('cliente');
  const [trackingData, setTrackingData] = useState(null);
  const [currentId, setCurrentId] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [user, setUser] = useState(null);
  const [uid, setUid] = useState(null);
  const [userRol, setUserRol] = useState(null);
  const [userPermisos, setUserPermisos] = useState([]); 
  const [authLoading, setAuthLoading] = useState(true);
  
  const [datosPagoPaquete, setDatosPagoPaquete] = useState({
    pagado: false,
    metodo_pago: null,
    referencia_binance: null,
    pago_reportado: false,
    precio: null,
    fecha_pago: null  // 👈 AGREGAR
  });
  
  const [dashboardKey, setDashboardKey] = useState(0);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const userData = await ApiService.obtenerUsuarioActual();
        
        if (userData) {
          let paquetesArray = userData.paquetes;
          if (typeof paquetesArray === 'string') {
            try { paquetesArray = JSON.parse(paquetesArray); } catch (e) { paquetesArray = []; }
          }
          
          const clienteData = { ...userData, paquetes: Array.isArray(paquetesArray) ? paquetesArray : [] };
          
          setUser(clienteData);
          setUid(clienteData.uid);
          setUserRol(clienteData?.rol || 'cliente');
          setUserPermisos(clienteData?.permisos || []);
          
          if (['admin', 'contador', 'empleado'].includes(clienteData?.rol)) {
            setModo('admin');
          } else {
            setModo('cliente');
          }
        }
      } catch (error) {
        // Error silencioso
      } finally {
        setAuthLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const handleSearch = async (id) => {
    setLoading(true);
    setTrackingData(null);
    setDatosPagoPaquete({ 
      pagado: false, 
      metodo_pago: null, 
      referencia_binance: null, 
      pago_reportado: false, 
      precio: null,
      fecha_pago: null  // 👈 AGREGAR
    });

    try {
      const response = await fetch(`${API_URL}/tracking/${id}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (!response.ok) {
        // ✅ AQUÍ ESTÁ LA MAGIA: Quitamos el 403 hardcodeado. 
        // Ahora lee el error real de Flask (Si es tráfico dice "Error temporal", si es intruso dice "No tienes permiso").
        throw new Error(data.error || "Error en la busqueda");
      }
      
      const pagoResponse = await fetch(`${API_URL}/paquete-completo/${id}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (pagoResponse.ok) {
        const pagoData = await pagoResponse.json();
        setDatosPagoPaquete({
          pagado: pagoData.pagado === true || pagoData.pagado === 1,
          metodo_pago: pagoData.metodo_pago,
          referencia_binance: pagoData.referencia_binance,
          pago_reportado: pagoData.pago_reportado === true || pagoData.pago_reportado === 1,
          precio: pagoData.precio,
          fecha_pago: pagoData.fecha_pago  // 👈 AGREGAR
        });
      }
      
      setTrackingData(data);
      setCurrentId(id);
    } catch (error) {
      alert(`Ups: ${error.message}`);
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (userData, userId) => {
    let paquetesArray = userData?.paquetes || [];
    if (typeof paquetesArray === 'string') {
      try { paquetesArray = JSON.parse(paquetesArray); } catch (e) { paquetesArray = []; }
    }
    
    const clienteData = { ...userData, paquetes: Array.isArray(paquetesArray) ? paquetesArray : [] };
    
    setUser(clienteData);
    setUid(clienteData.uid);
    setUserRol(clienteData?.rol || 'cliente');
    setUserPermisos(clienteData?.permisos || []);
    
    if (['admin', 'contador', 'empleado'].includes(clienteData?.rol)) {
      setModo('admin');
    } else {
      setModo('cliente');
    }
    
    setDashboardKey(prev => prev + 1);
  };

  const handleLogout = async () => {
    await ApiService.logout();
    setUser(null); setUid(null); setUserRol(null); setUserPermisos([]); setTrackingData(null); setCurrentId("");
    setModo('cliente');
    setDashboardKey(prev => prev + 1);
  };

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    if (nuevoModo === 'cliente') setDashboardKey(prev => prev + 1);
  };

  const renderContent = () => {
    if (modo === 'cliente') return <ClienteDashboard key={dashboardKey} user={user} uid={uid} onLogout={handleLogout} />;
    
    if (modo === 'rastreo') {
      return (
        <div className="rastreo-container">
          <h2 className="rastreo-main-title">Rastrear un Paquete</h2>
          <div className="rastreo-grid">
            <div className="left-panel">
              <h3 style={{ color: '#D4AF37', marginBottom: '20px', fontSize: '1.3rem' }}>Buscar paquete</h3>
              <p style={{ color: '#A0AEC0', marginBottom: '24px', fontSize: '0.9rem' }}>Ingresa tu numero de guia para ver el estado actual de tu envio.</p>
              <TrackingSearch onSearch={handleSearch} misPaquetes={user?.paquetes || []} userRol={userRol} />
            </div>
            <div className="right-panel">
              {loading && <div className="rastreo-state-box"><div className="spinner-mini" style={{ width: '40px', height: '40px' }}></div><p style={{ color: '#D4AF37', marginTop: '16px' }}>Cargando informacion...</p></div>}
              {!trackingData && !loading && <div className="rastreo-state-box"><span style={{ fontSize: '48px', opacity: 0.5 }}>🔍</span><p style={{ color: '#718096', marginTop: '16px' }}>Ingresa un numero de guia para ver los detalles</p></div>}
              {trackingData && !loading && (
                <div className="results-box">
                  <div className="results-header">
                    <h3>Resultados para: <span>{currentId}</span></h3>
                    <button className="btn-limpiar" onClick={() => { setTrackingData(null); setCurrentId(""); }}>Limpiar</button>
                  </div>
                  <div>
                    <h4 style={{ color: '#D4AF37', marginBottom: '16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><span>📋</span> Historial del envio</h4>
                    <TrackingTimeline steps={trackingData} fotosMap={{}} tiposUbicacion={[]} onVerFoto={(url) => window.open(url, '_blank')} />
                  </div>
                  <div style={{ marginTop: '32px' }}>
                    <StatusCard 
                      trackingId={currentId} 
                      data={trackingData} 
                      precioPaquete={datosPagoPaquete.precio} 
                      pagadoInicial={datosPagoPaquete.pagado} 
                      metodoPagoInicial={datosPagoPaquete.metodo_pago} 
                      referenciaBinanceInicial={datosPagoPaquete.referencia_binance} 
                      pagoReportadoInicial={datosPagoPaquete.pago_reportado}
                      fechaPago={datosPagoPaquete.fecha_pago}  // 👈 AGREGAR
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    if (modo === 'direcciones') return <DireccionesEnvio user={user} />;
    
    if (modo === 'reporte') {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', maxWidth: '600px', margin: '40px auto', background: '#1A202C', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '1px solid #2D3748' }}>
          <h2 style={{ color: '#D4AF37', marginBottom: '15px', fontSize: '1.8rem' }}>Reportar Paquete Perdido o Sin Asignar</h2>
          <p style={{ color: '#A0AEC0', marginBottom: '30px', fontSize: '1.1rem', lineHeight: '1.6' }}>Tienes mucho tiempo esperando tu paquete?<strong> Por favor escribenos en nuestras redes</strong> para poder brindarte un buen servicio.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <a href="https://wa.me/584125309882" target="_blank" rel="noopener noreferrer" style={{ background: '#25D366', color: 'white', padding: '15px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: '0.2s' }}>Escribenos por WhatsApp (+58 412-5309882)</a>
            <a href="mailto:locasio918@gmail.com" style={{ background: '#3182CE', color: 'white', padding: '15px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: '0.2s' }}>Envianos un Correo (locasio918@gmail.com)</a>
          </div>
        </div>
      );
    }
    
    if (modo === 'admin') return <AdminPanel userRol={userRol} permisos={userPermisos} />;
    
    return <div className="error-mensaje">No tienes permisos para acceder a esta seccion</div>;
  };

  if (authLoading) return <div className="loading-container"><div className="spinner"></div><p>Cargando sesion...</p></div>;

  const getMainClass = () => {
    if (modo === 'admin') return 'admin-main';
    if (modo === 'direcciones' || modo === 'reporte' || modo === 'rastreo') return 'client-main';
    if (user) return 'client-main';
    return 'main-content';
  };

  return (
    <div className="app-container">
      <header className="app-header-vip">
        <div className="header-brand">
          <h1>iGrafic360</h1>
          <span className="header-subtitle">Tracking System | Laboratorio</span>
        </div>

        {user && (
          <nav className="header-nav">
            <button className={`nav-item ${modo === 'cliente' ? 'active' : ''}`} onClick={() => cambiarModo('cliente')}>Mis Paquetes</button>
            <button className={`nav-item ${modo === 'rastreo' ? 'active' : ''}`} onClick={() => cambiarModo('rastreo')}>Rastrear</button>
            <button className={`nav-item ${modo === 'direcciones' ? 'active' : ''}`} onClick={() => cambiarModo('direcciones')}>Direcciones</button>
            <button className={`nav-item ${modo === 'reporte' ? 'active' : ''}`} onClick={() => cambiarModo('reporte')}>Reportar paquete</button>

            {['admin', 'contador', 'empleado'].includes(userRol) && (
              <button className={`nav-item ${modo === 'admin' ? 'active' : ''}`} onClick={() => setModo('admin')}>
                Panel de Control
              </button>
            )}
          </nav>
        )}

        <div className="header-user">
          {user ? (
            <div className="user-badge">
              <span className="user-avatar"></span>
              <div className="user-info-text">
                <span className="user-name">{user.nombre}</span>
                <span className={`user-role ${userRol === 'admin' ? 'role-admin' : ''}`}>{userRol}</span>
              </div>
            </div>
          ) : (
            <span className="header-subtitle">Inicia sesion para continuar</span>
          )}
        </div>
      </header>

      <main className={getMainClass()}>
        {!user ? <Login onLogin={handleLogin} /> : renderContent()}
      </main>
    </div>
  );
}

export default App;