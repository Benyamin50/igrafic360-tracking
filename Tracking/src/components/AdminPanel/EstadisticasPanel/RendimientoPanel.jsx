import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './EstadisticasPanel.css';

// 🔥 Usamos la misma lógica inteligente que en tu api.js
const esLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = esLocal ? "/envio-api" : "https://igrafic360.net/envio-api";

const RendimientoPanel = ({ paquetes = [] }) => {
  const [empleadosData, setEmpleadosData] = useState({});
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Cargar datos de empleados
  useEffect(() => {
    let montado = true;
    const cargarEmpleados = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/empleados`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const mapa = {};
          
          // 🛠️ FIX: Soportar array directo o envuelto en data.empleados
          const listaEmpleados = Array.isArray(data) ? data : (data.empleados || []);
          
          listaEmpleados.forEach(emp => { 
            // 🛠️ FIX: En PostgreSQL suele ser 'id', cubrimos tanto 'uid' como 'id'
            const idEmpleado = emp.uid || emp.id || emp.ID;
            
            if (idEmpleado) {
              let nombreObtenido = emp.nombre || emp.name || emp.email || `Usuario ${String(idEmpleado).substring(0, 6)}`;
              // Aseguramos que el ID se guarde como string para evitar fallos de match
              mapa[String(idEmpleado).trim()] = {
                nombre: nombreObtenido,
                email: emp.email || '',
                uid: String(idEmpleado).trim(),
                rol: emp.rol || 'N/A'
              };
            }
          });
          
          if (montado) {
            console.log("Empleados mapeados:", mapa); // Para que depures en consola si falla
            setEmpleadosData(mapa);
          }
        }
      } catch (error) { 
        console.error("Error cargando empleados:", error); 
      } finally {
        if (montado) setCargando(false);
      }
    };
    
    cargarEmpleados();
    return () => { montado = false; };
  }, []);

  // Función para obtener nombre
  const getNombreEmpleado = (idStr) => {
    if (!idStr || idStr === 'NULL' || idStr === 'Sistema' || idStr === '') return "Sistema";
    
    const cleanId = String(idStr).trim();
    const empData = empleadosData[cleanId];
    
    if (empData && empData.nombre) {
      return empData.nombre;
    }
    
    // Si no hay nombre, mostrar ID corto
    return `ID: ${cleanId.substring(0, 6)}...`;
  };

  // Procesar datos de rendimiento
  const datosEquipo = useMemo(() => {
    if (!Array.isArray(paquetes) || paquetes.length === 0) return [];

    const registro = {};

    const sumar = (uid, area) => {
      if (!uid || uid === 'NULL' || uid === 'Sistema' || uid === '') return;
      const cleanUid = String(uid).trim();
      if (!registro[cleanUid]) {
        registro[cleanUid] = { uid: cleanUid, logistica: 0, atencion: 0, admin: 0, total: 0 };
      }
      registro[cleanUid][area]++;
      registro[cleanUid].total++;
    };

    paquetes.forEach(p => {
      if (!p) return;

      sumar(p.registrado_por, 'logistica');
      sumar(p.responsable_Origen_paquete_recibido, 'logistica');
      sumar(p.responsable_Ubicacion_1, 'logistica');
      sumar(p.responsable_Ubicacion_2, 'logistica');
      sumar(p.responsable_Ubicacion_3, 'logistica');
      sumar(p.responsable_Llegada_Sucursal, 'logistica');
      sumar(p.entregado_por, 'atencion');
      
      if (p.estado_pago === 'aprobado') {
        sumar(p.aprobado_por, 'admin');
      }
    });

    const resultados = Object.values(registro)
      .filter(emp => emp && emp.total > 0)
      .map(emp => {
        const total = emp.total;
        const pctLogistica = Math.round((emp.logistica / total) * 100);
        const pctAtencion = Math.round((emp.atencion / total) * 100);
        const pctAdmin = Math.round((emp.admin / total) * 100);

        let perfil = "Perfil Mixto";
        let color = "#A0AEC0";
        
        if (pctLogistica > 70) { perfil = "Especialista en Almacén"; color = "#60a5fa"; }
        else if (pctAtencion > 70) { perfil = "Especialista en Entregas"; color = "#4ade80"; }
        else if (pctAdmin > 70) { perfil = "Especialista Administrativo"; color = "#D4AF37"; }
        else if (pctLogistica >= 30 && pctAtencion >= 30 && pctAdmin >= 30) { 
          perfil = "Todoterreno"; color = "#a78bfa"; 
        }

        const nombreEmpleado = getNombreEmpleado(emp.uid);

        return {
          uid: emp.uid,
          nombre: nombreEmpleado,
          nombreCompleto: `${nombreEmpleado} (${emp.total} tareas)`,
          logistica: emp.logistica,
          atencion: emp.atencion,
          admin: emp.admin,
          total: total,
          pctLogistica,
          pctAtencion,
          pctAdmin,
          perfil,
          color,
          radarData: [
            { area: 'Logística', valor: pctLogistica, cantidad: emp.logistica },
            { area: 'Atención', valor: pctAtencion, cantidad: emp.atencion },
            { area: 'Administración', valor: pctAdmin, cantidad: emp.admin }
          ]
        };
      })
      .sort((a, b) => b.total - a.total);

    return resultados;
  }, [paquetes, empleadosData]);

  useEffect(() => {
    if (datosEquipo.length > 0 && !empleadoSeleccionado) {
      setEmpleadoSeleccionado(datosEquipo[0].uid);
    }
  }, [datosEquipo]);

  if (cargando) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#A0AEC0' }}>Cargando datos del equipo...</div>;
  }

  if (datosEquipo.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(22, 32, 50, 0.6)', borderRadius: '12px', color: '#A0AEC0' }}>
        <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🔍</span>
        No hay datos de rendimiento registrados aún.
      </div>
    );
  }

  const empleadoActual = datosEquipo.find(e => e.uid === empleadoSeleccionado) || datosEquipo[0];

  return (
    <div className="estadisticas-panel" style={{ fontFamily: "'Poppins', sans-serif" }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ color: '#E2E8F0', margin: '0 0 8px 0' }}>Perfil y Versatilidad del Equipo</h2>
          <p style={{ color: '#A0AEC0', margin: 0, fontSize: '0.9rem' }}>
            Distribución de tareas por empleado
          </p>
        </div>
        
        <select 
          value={empleadoSeleccionado || ''} 
          onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
          style={{ 
            padding: '10px 16px', 
            borderRadius: '8px', 
            background: '#1A202C', 
            color: '#E2E8F0', 
            border: '1px solid #4A5568', 
            cursor: 'pointer', 
            outline: 'none', 
            fontWeight: 'bold',
            minWidth: '250px',
            fontSize: '0.95rem'
          }}
        >
          {datosEquipo.map(emp => (
            <option key={emp.uid} value={emp.uid}>
              {emp.nombreCompleto}
            </option>
          ))}
        </select>
      </div>

      {empleadoActual && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          
          {/* Tarjeta de perfil y radar */}
          <div style={{ background: 'rgba(22, 32, 50, 0.6)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '12px', width: '100%' }}>
              <h3 style={{ 
                color: '#E2E8F0', 
                margin: '0 0 4px 0', 
                fontSize: '1.5rem', 
                fontWeight: 'bold',
                wordBreak: 'break-word'
              }}>
                {empleadoActual.nombre}
              </h3>
              
              <div style={{ 
                color: '#718096', 
                fontSize: '0.8rem', 
                marginBottom: '12px',
                fontFamily: 'monospace'
              }}>
                ID: {empleadoActual.uid}
              </div>
              
              <span style={{ 
                display: 'inline-block', 
                padding: '6px 14px', 
                borderRadius: '20px', 
                background: `${empleadoActual.color}20`, 
                color: empleadoActual.color, 
                fontWeight: 'bold', 
                fontSize: '0.8rem', 
                border: `1px solid ${empleadoActual.color}50` 
              }}>
                {empleadoActual.perfil}
              </span>
            </div>

            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={empleadoActual.radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="area" tick={{ fill: '#A0AEC0', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar 
                    name={empleadoActual.nombre} 
                    dataKey="valor" 
                    stroke={empleadoActual.color} 
                    fill={empleadoActual.color} 
                    fillOpacity={0.5} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#162032', 
                      borderColor: empleadoActual.color, 
                      borderRadius: '8px', 
                      fontSize: '11px', 
                      padding: '6px 10px' 
                    }}
                    formatter={(value, name, props) => [`${value}% (${props?.payload?.cantidad || 0} tareas)`, 'Dedicación']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              width: '100%', 
              marginTop: '12px', 
              borderTop: '1px solid rgba(255,255,255,0.05)', 
              paddingTop: '12px' 
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {empleadoActual.logistica}
                </div>
                <div style={{ color: '#A0AEC0', fontSize: '0.7rem' }}>Logística</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {empleadoActual.atencion}
                </div>
                <div style={{ color: '#A0AEC0', fontSize: '0.7rem' }}>Entregas</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {empleadoActual.admin}
                </div>
                <div style={{ color: '#A0AEC0', fontSize: '0.7rem' }}>Pagos</div>
              </div>
            </div>
          </div>

          {/* Gráfico de barras */}
          <div style={{ 
            background: 'rgba(22, 32, 50, 0.6)', 
            borderRadius: '12px', 
            padding: '20px', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            <h3 style={{ color: '#E2E8F0', margin: '0 0 4px 0', fontSize: '1rem' }}>
              Comparativa del Equipo
            </h3>
            <p style={{ color: '#A0AEC0', margin: '0 0 15px 0', fontSize: '0.7rem' }}>
              Total de tareas por empleado
            </p>
            
            <div style={{ height: `${Math.max(250, datosEquipo.length * 40)}px`, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={datosEquipo} 
                  layout="vertical" 
                  barSize={20}
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#A0AEC0" fontSize={10} />
                  <YAxis 
                    dataKey="nombre"
                    type="category" 
                    stroke="#E2E8F0" 
                    fontSize={11}
                    width={110} /* 🛠️ FIX: Más espacio para nombres largos */
                    tick={{ fill: '#E2E8F0', fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#162032', 
                      borderColor: '#4A5568', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      padding: '8px 12px' 
                    }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    labelFormatter={(label) => {
                      const emp = datosEquipo.find(e => e.nombre === label);
                      return emp ? `${emp.nombre}` : label;
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '0.75rem' }} />
                  
                  <Bar dataKey="logistica" name="Logística" stackId="a" fill="#60a5fa" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="atencion" name="Entregas" stackId="a" fill="#4ade80" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="admin" name="Pagos" stackId="a" fill="#D4AF37" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default RendimientoPanel;