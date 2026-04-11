import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './EstadisticasPanel.css';

const API_URL = "https://igrafic360.net/envio-api";

const RendimientoPanel = ({ paquetes = [] }) => {
  const [empleadosNombres, setEmpleadosNombres] = useState({});
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Cargar nombres de empleados
  useEffect(() => {
    let montado = true;
    const cargarNombres = async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/empleados`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          const data = await response.json();
          const mapa = {};
          if (data && Array.isArray(data.empleados)) {
            data.empleados.forEach(emp => { 
              if (emp && emp.uid) mapa[emp.uid] = emp.nombre; 
            });
          }
          if (montado) setEmpleadosNombres(mapa);
        }
      } catch (error) { 
        console.error("Error cargando empleados:", error); 
      } finally {
        if (montado) setCargando(false);
      }
    };
    cargarNombres();
    return () => { montado = false; };
  }, []);

  const getNombre = (uid) => {
    if (!uid || uid === 'NULL' || uid === 'Sistema') return "Sistema";
    return empleadosNombres[uid] || `ID: ${String(uid).substring(0, 6)}...`;
  };

  // Procesar datos de rendimiento
  const datosEquipo = useMemo(() => {
    if (!Array.isArray(paquetes) || paquetes.length === 0) return [];

    const registro = {};

    const sumar = (uid, area) => {
      if (!uid || uid === 'NULL' || uid === 'Sistema' || uid === '') return;
      if (!registro[uid]) {
        registro[uid] = { uid, logistica: 0, atencion: 0, admin: 0, total: 0 };
      }
      registro[uid][area]++;
      registro[uid].total++;
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
          perfil = "⭐ Todoterreno"; color = "#a78bfa"; 
        }

        return {
          uid: emp.uid,
          nombre: getNombre(emp.uid),
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
  }, [paquetes, empleadosNombres]);

  useEffect(() => {
    if (datosEquipo.length > 0 && !empleadoSeleccionado) {
      setEmpleadoSeleccionado(datosEquipo[0].uid);
    }
  }, [datosEquipo]);

  if (cargando) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#A0AEC0' }}>⏳ Cargando datos del equipo...</div>;
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
          <h2 style={{ color: '#E2E8F0', margin: '0 0 8px 0' }}>🧬 Perfil y Versatilidad del Equipo</h2>
          <p style={{ color: '#A0AEC0', margin: 0, fontSize: '0.9rem' }}>
            Distribución de tareas por empleado
          </p>
        </div>
        
        <select 
          value={empleadoSeleccionado || ''} 
          onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: '8px', background: '#1A202C', color: '#E2E8F0', border: '1px solid #4A5568', cursor: 'pointer', outline: 'none', fontWeight: 'bold' }}
        >
          {datosEquipo.map(emp => (
            <option key={emp.uid} value={emp.uid}>{emp.nombre} ({emp.total} tareas)</option>
          ))}
        </select>
      </div>

      {empleadoActual && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          
          {/* Tarjeta de perfil y radar */}
          <div style={{ background: 'rgba(22, 32, 50, 0.6)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: '#E2E8F0', margin: '0 0 4px 0', fontSize: '1.2rem' }}>{empleadoActual.nombre}</h3>
              <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', background: `${empleadoActual.color}20`, color: empleadoActual.color, fontWeight: 'bold', fontSize: '0.75rem', border: `1px solid ${empleadoActual.color}50` }}>
                {empleadoActual.perfil}
              </span>
            </div>

            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="60%" data={empleadoActual.radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="area" tick={{ fill: '#A0AEC0', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name={empleadoActual.nombre} dataKey="valor" stroke={empleadoActual.color} fill={empleadoActual.color} fillOpacity={0.5} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#162032', borderColor: empleadoActual.color, borderRadius: '8px', fontSize: '11px', padding: '6px 10px' }}
                    formatter={(value, name, props) => [`${value}% (${props?.payload?.cantidad || 0} tareas)`, 'Dedicación']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '1rem' }}>{empleadoActual.logistica}</div>
                <div style={{ color: '#A0AEC0', fontSize: '0.7rem' }}>Logística</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1rem' }}>{empleadoActual.atencion}</div>
                <div style={{ color: '#A0AEC0', fontSize: '0.7rem' }}>Entregas</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#D4AF37', fontWeight: 'bold', fontSize: '1rem' }}>{empleadoActual.admin}</div>
                <div style={{ color: '#A0AEC0', fontSize: '0.7rem' }}>Pagos</div>
              </div>
            </div>
          </div>

          {/* Gráfico de barras apiladas - MÁS PEQUEÑO */}
          <div style={{ background: 'rgba(22, 32, 50, 0.6)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: '#E2E8F0', margin: '0 0 4px 0', fontSize: '1rem' }}>📊 Comparativa del Equipo</h3>
            <p style={{ color: '#A0AEC0', margin: '0 0 15px 0', fontSize: '0.7rem' }}>Total de tareas por empleado</p>
            
            <div style={{ height: `${Math.max(200, datosEquipo.length * 32)}px`, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={datosEquipo} 
                  layout="vertical" 
                  barSize={18}
                  margin={{ top: 5, right: 20, left: 85, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#A0AEC0" fontSize={10} />
                  <YAxis 
                    dataKey="nombre" 
                    type="category" 
                    stroke="#E2E8F0" 
                    fontSize={10} 
                    width={85} 
                    tick={{ fill: '#E2E8F0', fontSize: 10 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#162032', borderColor: '#4A5568', borderRadius: '8px', fontSize: '11px', padding: '6px 10px' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '0.7rem' }} />
                  
                  <Bar dataKey="logistica" name="📦 Logística" stackId="a" fill="#60a5fa" />
                  <Bar dataKey="atencion" name="🚚 Entregas" stackId="a" fill="#4ade80" />
                  <Bar dataKey="admin" name="💰 Pagos" stackId="a" fill="#D4AF37" />
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