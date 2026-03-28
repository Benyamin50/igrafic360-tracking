// src/components/AdminPanel/EstadisticasPanel.jsx
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { format, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import './EstadisticasPanel.css';

const COLORS = {
  pagomovil: '#D4AF37',
  binance: '#f0b90b',
  pendiente: '#f87171',
  pagado: '#4ade80'
};

const estaPagado = (valor) => {
  if (valor === true || valor === 1) return true;
  if (!valor) return false;
  const vStr = String(valor).toLowerCase().trim();
  return vStr === '1' || vStr === 'true' || vStr === 'si' || vStr === 'sí' || vStr === 'pagado';
};

const esFechaValida = (fechaStr) => {
  if (!fechaStr) return false;
  if (fechaStr === '0000-00-00 00:00:00' || fechaStr === '0000-00-00' || fechaStr === 'NULL') return false;
  return true;
};

// 🛠️ LECTOR DE FECHAS INDESTRUCTIBLE
const parseFecha = (fechaStr) => {
  if (!fechaStr) return null;
  try {
    let parsedDate;
    
    if (fechaStr.includes('-') && fechaStr.includes(':')) {
      parsedDate = parseISO(fechaStr.replace(' ', 'T'));
    } else if (fechaStr.includes('/') && fechaStr.includes(',')) {
      const [fechaPart, horaPart] = fechaStr.split(',');
      const [dia, mes, anio] = fechaPart.trim().split('/');
      let horaStr = horaPart.trim();
      let horas = 0, minutos = 0, segundos = 0;
      
      const ampmMatch = horaStr.match(/(\d+):(\d+):(\d+)\s*([ap]\.?\s*m\.?)/i);
      if (ampmMatch) {
        horas = parseInt(ampmMatch[1]);
        minutos = parseInt(ampmMatch[2]);
        segundos = parseInt(ampmMatch[3]);
        const ampm = ampmMatch[4].toLowerCase();
        if (ampm.includes('p') && horas !== 12) horas += 12;
        if (ampm.includes('a') && horas === 12) horas = 0;
      }
      parsedDate = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia), horas, minutos, segundos);
    } else if (fechaStr.includes('/')) {
      const partes = fechaStr.split('/');
      if (partes.length === 3) {
        parsedDate = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
      }
    } else {
      parsedDate = new Date(fechaStr); // Intento genérico de JavaScript
    }

    // 🔥 LA MAGIA ESTÁ AQUÍ: Si es "Invalid Date", devolvemos null para que no rompa el filtro
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      return null;
    }
    
    return parsedDate;
  } catch (e) {
    return null;
  }
};

const EstadisticasPanel = ({ paquetes, estadisticas }) => {
  const [filtroFecha, setFiltroFecha] = useState('6meses');
  const [paquetesFiltrados, setPaquetesFiltrados] = useState([]);

  const isPagado = (p) => estaPagado(p.pagado);

  const getPrecioNumero = (p) => {
    let precioValor = p.precio;
    if (!precioValor || precioValor === 'Pendiente' || precioValor === 'NULL') {
      precioValor = p.precio_usd;
    }
    if (!precioValor || precioValor === 'Pendiente' || precioValor === 'NULL') return 0;
    
    let precioStr = String(precioValor).replace(/\$/g, '').replace(/usd/gi, '').trim();
    if (precioStr.includes(',') && !precioStr.includes('.')) {
      precioStr = precioStr.replace(',', '.');
    } else {
      precioStr = precioStr.replace(/,/g, '');
    }
    return parseFloat(precioStr) || 0;
  };

  const getFechaPaquete = (p) => {
    if (esFechaValida(p.fecha_pago) && isPagado(p)) return p.fecha_pago;
    if (esFechaValida(p.creado_en)) return p.creado_en;
    if (esFechaValida(p.fecha_asignacion)) return p.fecha_asignacion;
    if (esFechaValida(p.Fecha_Origen)) return p.Fecha_Origen;
    return null;
  };

  useEffect(() => {
    filtrarPaquetesPorFecha();
  }, [filtroFecha, paquetes]);

  const filtrarPaquetesPorFecha = () => {
    if (!paquetes || paquetes.length === 0) {
      setPaquetesFiltrados([]);
      return;
    }

    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    let fechaInicio;

    switch (filtroFecha) {
      case 'mes': fechaInicio = subMonths(hoy, 1); break;
      case '3meses': fechaInicio = subMonths(hoy, 3); break;
      case '6meses': fechaInicio = subMonths(hoy, 6); break;
      case 'anio': fechaInicio = subMonths(hoy, 12); break;
      default: fechaInicio = subMonths(hoy, 6);
    }
    fechaInicio.setHours(0, 0, 0, 0);

    const filtrados = paquetes.filter(p => {
      let fechaPaquete = getFechaPaquete(p);
      const fecha = parseFecha(fechaPaquete);
      
      // 🛡️ SI NO PODEMOS LEER LA FECHA, LO DEJAMOS PASAR DE TODOS MODOS
      if (!fecha) return true; 
      
      const fechaMs = fecha.getTime();
      return fechaMs >= fechaInicio.getTime() && fechaMs <= hoy.getTime();
    });

    setPaquetesFiltrados(filtrados);
  };

  const datosIngresosMensuales = () => {
    const meses = {};
    const hoy = new Date();
    
    // Preparar los últimos meses vacíos para que la gráfica no se vea pelona
    for (let i = 0; i <= 6; i++) {
      const fecha = subMonths(hoy, i);
      const mesKey = format(fecha, 'MMM yyyy', { locale: es });
      meses[mesKey] = { mes: mesKey, ingresos: 0, paquetes: 0 };
    }

    paquetesFiltrados.forEach(p => {
      if (isPagado(p) && getPrecioNumero(p) > 0) {
        let fechaPaquete = getFechaPaquete(p);
        let fecha = parseFecha(fechaPaquete);
        
        // Si no tiene fecha válida, lo sumamos al mes actual
        if (!fecha) fecha = new Date(); 

        const mesKey = format(fecha, 'MMM yyyy', { locale: es });
        if (meses[mesKey]) {
          meses[mesKey].ingresos += getPrecioNumero(p);
          meses[mesKey].paquetes += 1;
        }
      }
    });
    return Object.values(meses).reverse();
  };

  const topClientes = () => {
    const clientesMap = {};
    paquetesFiltrados.forEach(p => {
      if (p.cliente_nombre && isPagado(p)) {
        const nombre = p.cliente_nombre;
        if (!clientesMap[nombre]) {
          clientesMap[nombre] = { nombre, paquetes: 0, totalGastado: 0 };
        }
        clientesMap[nombre].paquetes += 1;
        clientesMap[nombre].totalGastado += getPrecioNumero(p);
      }
    });
    return Object.values(clientesMap).sort((a, b) => b.paquetes - a.paquetes).slice(0, 5);
  };

  const resumenRapido = () => {
    let totalPrecios = 0;
    let paquetesConPrecio = 0;
    let paqueteMasCaro = 0;
    let paqueteMasBarato = Infinity;
    let totalPaquetesPagados = 0;

    paquetesFiltrados.forEach(p => {
      if (isPagado(p)) {
        totalPaquetesPagados++;
        const precioNum = getPrecioNumero(p);
        if (precioNum > 0) {
          totalPrecios += precioNum;
          paquetesConPrecio++;
          if (precioNum > paqueteMasCaro) paqueteMasCaro = precioNum;
          if (precioNum < paqueteMasBarato) paqueteMasBarato = precioNum;
        }
      }
    });

    const promedio = paquetesConPrecio > 0 ? totalPrecios / paquetesConPrecio : 0;
    const totalEntregados = paquetesFiltrados.filter(p => p.Entregado && p.Entregado !== '' && isPagado(p)).length;
    const tasaEntrega = totalPaquetesPagados > 0 ? (totalEntregados / totalPaquetesPagados) * 100 : 0;

    return {
      promedio: promedio.toFixed(2),
      masCaro: paqueteMasCaro === 0 ? 'N/A' : `$${paqueteMasCaro.toFixed(2)}`,
      masBarato: paqueteMasBarato === Infinity ? 'N/A' : `$${paqueteMasBarato.toFixed(2)}`,
      tasaEntrega: tasaEntrega.toFixed(1),
      totalEntregados,
      totalPaquetes: totalPaquetesPagados
    };
  };

  const distribucionPagos = () => {
    const metodos = { pagomovil: 0, binance: 0, pendiente: 0 };

    paquetesFiltrados.forEach(p => {
      if (isPagado(p)) {
        if (p.metodo_pago && String(p.metodo_pago).toLowerCase().includes('binance')) {
          metodos.binance++;
        } else {
          metodos.pagomovil++;
        }
      } else {
        metodos.pendiente++;
      }
    });

    const resultado = [];
    if (metodos.pagomovil > 0) resultado.push({ name: 'Pago Móvil', value: metodos.pagomovil, color: COLORS.pagomovil });
    if (metodos.binance > 0) resultado.push({ name: 'Binance', value: metodos.binance, color: COLORS.binance });
    if (metodos.pendiente > 0) resultado.push({ name: 'Pendientes', value: metodos.pendiente, color: COLORS.pendiente });
    
    return resultado;
  };

  const ingresosData = datosIngresosMensuales();
  const clientes = topClientes();
  const resumen = resumenRapido();
  const distribucion = distribucionPagos();

  if (paquetesFiltrados.length === 0) {
    return (
      <div className="estadisticas-panel">
        <div className="no-data-message" style={{ textAlign: 'center', padding: '40px', color: '#A0AEC0' }}>
          <p>📊 No hay paquetes registrados en este rango de fechas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="estadisticas-panel">
      {/* FILTROS DE FECHA */}
      <div className="filtros-fecha">
        <button className={`filtro-fecha-btn ${filtroFecha === 'mes' ? 'active' : ''}`} onClick={() => setFiltroFecha('mes')}>Último mes</button>
        <button className={`filtro-fecha-btn ${filtroFecha === '3meses' ? 'active' : ''}`} onClick={() => setFiltroFecha('3meses')}>3 meses</button>
        <button className={`filtro-fecha-btn ${filtroFecha === '6meses' ? 'active' : ''}`} onClick={() => setFiltroFecha('6meses')}>6 meses</button>
        <button className={`filtro-fecha-btn ${filtroFecha === 'anio' ? 'active' : ''}`} onClick={() => setFiltroFecha('anio')}>Último año</button>
      </div>

      {/* RESUMEN RÁPIDO */}
      <div className="resumen-rapido-grid">
        <div className="resumen-card">
          <div className="resumen-icono">💰</div>
          <div className="resumen-info">
            <div className="resumen-valor">${resumen.promedio}</div>
            <div className="resumen-etiqueta">Promedio por paquete</div>
          </div>
        </div>
        <div className="resumen-card">
          <div className="resumen-icono">🏆</div>
          <div className="resumen-info">
            <div className="resumen-valor">{resumen.masCaro}</div>
            <div className="resumen-etiqueta">Paquete más caro</div>
          </div>
        </div>
        <div className="resumen-card">
          <div className="resumen-icono">📦</div>
          <div className="resumen-info">
            <div className="resumen-valor">{resumen.masBarato}</div>
            <div className="resumen-etiqueta">Paquete más barato</div>
          </div>
        </div>
        <div className="resumen-card">
          <div className="resumen-icono">✅</div>
          <div className="resumen-info">
            <div className="resumen-valor">{resumen.tasaEntrega}%</div>
            <div className="resumen-etiqueta">Tasa de entrega</div>
          </div>
        </div>
        <div className="resumen-card">
          <div className="resumen-icono">📊</div>
          <div className="resumen-info">
            <div className="resumen-valor">{resumen.totalEntregados}/{resumen.totalPaquetes}</div>
            <div className="resumen-etiqueta">Entregados / Pagados</div>
          </div>
        </div>
      </div>

      {/* GRÁFICO DE INGRESOS */}
      <div className="grafico-container">
        <h3>📈 Evolución de Ingresos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ingresosData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="mes" stroke="#A0AEC0" />
            <YAxis stroke="#A0AEC0" />
            <Tooltip contentStyle={{ backgroundColor: '#162032', borderColor: '#D4AF37' }} labelStyle={{ color: '#D4AF37' }} />
            <Legend />
            <Line type="monotone" dataKey="ingresos" name="Ingresos (USD)" stroke="#D4AF37" strokeWidth={2} dot={{ fill: '#D4AF37', r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="paquetes" name="Paquetes Pagados" stroke="#60a5fa" strokeWidth={2} dot={{ fill: '#60a5fa', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* TOP CLIENTES Y DISTRIBUCIÓN DE PAGOS */}
      <div className="two-columns">
        <div className="top-clientes">
          <h3>🏆 Top 5 Clientes</h3>
          {clientes.length === 0 ? (
            <p className="sin-datos" style={{ color: '#A0AEC0', padding: '20px' }}>No hay paquetes pagados suficientes</p>
          ) : (
            <table className="top-clientes-tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Paquetes</th>
                  <th>Total gastado</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{cliente.nombre}</td>
                    <td>{cliente.paquetes}</td>
                    <td>${cliente.totalGastado.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="distribucion-pagos">
          <h3>💳 Distribución de Pagos</h3>
          {distribucion.length === 0 ? (
            <p className="sin-datos" style={{ color: '#A0AEC0', padding: '20px' }}>No hay datos de pagos</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={distribucion}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {distribucion.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#162032', borderColor: '#D4AF37' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="leyenda-pagos">
                {distribucion.map((item, i) => (
                  <div key={i} className="leyenda-item">
                    <span className="color-dot" style={{ backgroundColor: item.color }}></span>
                    <span>{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstadisticasPanel;