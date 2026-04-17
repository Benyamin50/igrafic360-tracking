// src/components/AdminPanel/Tablas/TablaEmpleados.jsx
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../services/api';

const TablaEmpleados = ({ onRolActualizado, onLoadTotal, currentUserUid, esSuperAdmin }) => {
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [rolSeleccionado, setRolSeleccionado] = useState('');

  const rolesDisponibles = [
    { value: 'super_admin', label: 'Super Administrador', desc: 'Acceso TOTAL + gestionar admins' },
    { value: 'admin', label: 'Administrador', desc: 'Acceso total a todo' },
    { value: 'contador', label: 'Contador', desc: 'Solo ver estadisticas' },
    { value: 'empleado', label: 'Empleado', desc: 'Actualizar paquetes (app colaborador)' },
    { value: 'cliente', label: 'Cliente', desc: 'Ver sus propios paquetes' }
  ];

  const cargarEmpleados = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/empleados`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      const lista = data.empleados || [];
      setEmpleados(lista);
    } catch (error) {
      console.error('Error cargando empleados:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEmpleados();
  }, []);

  // Filtrado de usuarios
  const superAdmins = empleados.filter(e => e.rol === 'super_admin' || e.es_super_admin === 1);
  const equipo = empleados.filter(e => e.rol === 'admin' && e.rol !== 'super_admin' && e.es_super_admin !== 1);
  const staff = empleados.filter(e => (e.rol === 'empleado' || e.rol === 'contador') && e.rol !== 'super_admin');
  const clientes = empleados.filter(e => (e.rol === 'cliente' || !e.rol) && e.rol !== 'super_admin');

  // Avisar al componente padre cuántos trabajadores hay
  useEffect(() => {
    if (onLoadTotal) {
      onLoadTotal(superAdmins.length + equipo.length + staff.length);
    }
  }, [superAdmins.length, equipo.length, staff.length, onLoadTotal]);

  const actualizarRol = async (uid, nuevoRol) => {
    // No permitir editar a un Super Admin
    const usuarioAEditar = empleados.find(e => e.uid === uid);
    if (usuarioAEditar?.es_super_admin === 1 || usuarioAEditar?.rol === 'super_admin') {
      alert('No puedes modificar a un Super Administrador');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/admin/actualizar-rol`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, rol: nuevoRol })
      });
      
      const data = await response.json();
      if (response.ok) {
        alert('Rol actualizado correctamente');
        await cargarEmpleados();
        if (onRolActualizado) onRolActualizado();
        setEditando(null);
      } else {
        alert(data.error || 'Error al actualizar rol');
      }
    } catch (error) {
      alert('Error de conexion');
    }
  };

  const getRolLabel = (rol, esSuper) => {
    if (esSuper === 1 || rol === 'super_admin') return 'Super Administrador';
    const r = rolesDisponibles.find(r => r.value === rol);
    return r ? r.label : rol;
  };

  // Función para renderizar el bloque de edición de Rol
  const renderBloqueEdicion = (emp) => {
    if (emp.es_super_admin === 1 || emp.rol === 'super_admin') {
      return (
        <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(212,175,55,0.1)', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ color: '#D4AF37', fontSize: '12px' }}>👑 Super Administrador - Permisos totales</span>
        </div>
      );
    }
    
    return (
      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', marginTop: '10px' }}>
        <label style={{ fontSize: '12px', color: '#D4AF37', fontWeight: 'bold' }}>Cambiar a nuevo Rol:</label>
        <select 
          value={rolSeleccionado} 
          onChange={(e) => setRolSeleccionado(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', background: '#0B0F19', color: 'white', border: '1px solid #D4AF37', width: '100%', cursor: 'pointer' }}
        >
          {rolesDisponibles.filter(r => r.value !== 'super_admin').map(rol => (
            <option key={rol.value} value={rol.value}>{rol.label}</option>
          ))}
        </select>
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
          <button onClick={() => actualizarRol(emp.uid, rolSeleccionado)} className="wp-btn-small wp-btn-success" style={{ flex: 1 }}>Confirmar</button>
          <button onClick={() => setEditando(null)} className="wp-btn-small" style={{ flex: 1 }}>Cancelar</button>
        </div>
      </div>
    );
  };

  const renderTarjetaUsuario = (emp) => {
    const esSuper = emp.es_super_admin === 1 || emp.rol === 'super_admin';
    
    return (
      <div key={emp.uid} style={{ background: esSuper ? 'rgba(212,175,55,0.1)' : '#1A202C', border: `1px solid ${esSuper ? '#D4AF37' : '#2D3748'}`, borderRadius: '12px', padding: '15px', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#FFF', fontSize: '1rem' }}>{emp.nombre}</h4>
            <p style={{ margin: '0', fontSize: '12px', color: '#A0AEC0' }}>{emp.email}</p>
          </div>
          <span className={`role-badge ${esSuper ? 'role-super-admin' : `role-${emp.rol}`}`} style={{ fontSize: '10px', padding: '4px 8px' }}>
            {getRolLabel(emp.rol, emp.es_super_admin)}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', marginTop: '15px', fontSize: '12px', color: '#A0AEC0', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
          <div><strong>Código:</strong> {emp.codigo_cliente || 'N/A'}</div>
          <div><strong>Paquetes:</strong> {emp.paquetes_procesados || 0}</div>
        </div>

        {editando === emp.uid ? (
          renderBloqueEdicion(emp)
        ) : (
          !esSuper && (
            <button onClick={() => { setEditando(emp.uid); setRolSeleccionado(emp.rol); }} className="wp-btn-small" style={{ marginTop: '15px', width: '100%', borderRadius: '8px' }}>
              Modificar Rango
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <div className="wp-table-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: 0 }}>Gestión de Personal y Clientes</h3>
        <span style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37', padding: '8px 15px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
          {superAdmins.length + equipo.length + staff.length} Trabajadores | {clientes.length} Clientes
        </span>
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><div className="wp-spinner"></div></div>
      ) : (
        <>
          {/* SECCIÓN 1: SUPER ADMINISTRADORES */}
          {superAdmins.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#D4AF37', borderBottom: '2px solid #D4AF37', paddingBottom: '10px', marginBottom: '15px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                👑 Super Administradores ({superAdmins.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {superAdmins.map(emp => renderTarjetaUsuario(emp))}
              </div>
            </div>
          )}

          {/* SECCIÓN 2: ADMINISTRADORES */}
          {equipo.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#48bb78', borderBottom: '1px solid #48bb78', paddingBottom: '10px', marginBottom: '15px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                🛡️ Administradores ({equipo.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {equipo.map(emp => renderTarjetaUsuario(emp))}
              </div>
            </div>
          )}

          {/* SECCIÓN 3: STAFF OPERATIVO */}
          {staff.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h4 style={{ color: '#60a5fa', borderBottom: '1px solid #60a5fa', paddingBottom: '10px', marginBottom: '15px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                💼 Staff Operativo ({staff.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {staff.map(emp => renderTarjetaUsuario(emp))}
              </div>
            </div>
          )}

          {/* SECCIÓN 4: CLIENTES */}
          <div>
            <h4 style={{ color: '#A0AEC0', borderBottom: '1px solid #2D3748', paddingBottom: '10px', marginBottom: '15px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              👤 Clientes Registrados ({clientes.length})
            </h4>
            
            {clientes.length === 0 ? (
              <p style={{ color: '#718096', fontStyle: 'italic' }}>No hay clientes registrados aún.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="wp-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Código</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map(cli => (
                      <tr key={cli.uid}>
                        <td><strong>{cli.nombre}</strong></td>
                        <td>{cli.email}</td>
                        <td>{cli.codigo_cliente || '—'}</td>
                        <td>
                          {editando === cli.uid ? (
                            renderBloqueEdicion(cli)
                          ) : (
                            <button onClick={() => { setEditando(cli.uid); setRolSeleccionado(cli.rol || 'cliente'); }} className="wp-btn-small">
                              Promover Rango
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TablaEmpleados;