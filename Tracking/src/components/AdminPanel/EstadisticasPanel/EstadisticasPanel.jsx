// src/components/AdminPanel/EstadisticasPanel.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
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

    if (!parsedDate || isNaN(parsedDate.getTime())) {
      return null;
    }
    
    return parsedDate;
  } catch (e) {
    return null;
  }
};

const EstadisticasPanel = ({ paquetes, estadisticas }) => {
  const hoy = new Date();
  
  // 🔥 ESTADOS PARA EL SELECTOR DE MES Y AÑO
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());
  
  const [paquetesFiltrados, setPaquetesFiltrados] = useState([]);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const panelRef = useRef(null);

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

  // 🔥 DETECTAR AÑOS DISPONIBLES EN LA BASE DE DATOS
  const aniosDisponibles = useMemo(() => {
    const years = new Set([hoy.getFullYear()]);
    if (paquetes && paquetes.length > 0) {
      paquetes.forEach(p => {
        const f = parseFecha(getFechaPaquete(p));
        if (f) years.add(f.getFullYear());
      });
    }
    return Array.from(years).sort((a, b) => b - a); // Ordenar de más reciente a más viejo
  }, [paquetes, hoy]);

  // FILTRAR PAQUETES CUANDO CAMBIA EL MES O EL AÑO
  useEffect(() => {
    if (!paquetes || paquetes.length === 0) {
      setPaquetesFiltrados([]);
      return;
    }

    const filtrados = paquetes.filter(p => {
      let fechaPaquete = getFechaPaquete(p);
      const fecha = parseFecha(fechaPaquete);
      
      // Si el paquete no tiene fecha, lo ignoramos para los reportes mensuales
      if (!fecha) return false; 
      
      return fecha.getFullYear() === parseInt(anioSeleccionado) && fecha.getMonth() === parseInt(mesSeleccionado);
    });

    setPaquetesFiltrados(filtrados);
  }, [paquetes, mesSeleccionado, anioSeleccionado]);

  // 🔥 PDF PROFESIONAL CON ENCABEZADO
  const exportarPDF = async () => {
    if (!panelRef.current) return;
    setGenerandoPDF(true);
    
    try {
      const canvas = await html2canvas(panelRef.current, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#111827' 
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Texto del Encabezado (Información del Reporte)
      const nombreMes = format(new Date(anioSeleccionado, mesSeleccionado, 15), 'MMMM yyyy', { locale: es }).toUpperCase();
      
      pdf.setTextColor(212, 175, 55); // Color Dorado
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text('REPORTE DE OPERACIONES', pdfWidth / 2, 20, { align: 'center' });
      
      pdf.setTextColor(100, 100, 100); // Color Gris
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`PERÍODO: ${nombreMes}`, pdfWidth / 2, 28, { align: 'center' });
      
      // Línea separadora
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.5);
      pdf.line(15, 33, pdfWidth - 15, 33);
      
      // Pegar la foto del panel debajo de la línea
      const pdfImgHeight = (canvas.height * (pdfWidth - 20)) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 40, pdfWidth - 20, pdfImgHeight);
      
      pdf.save(`Reporte_${nombreMes.replace(/ /g, '_')}.pdf`);
      
    } catch (error) {
      console.error("Error generando PDF", error);
      alert("Hubo un error al generar el PDF. Revisa la consola.");
    } finally {
      setGenerandoPDF(false);
    }
  };

  // 🔥 GRÁFICA EVOLUTIVA (Muestra los 6 meses previos a la fecha elegida para dar contexto)
  const datosIngresosMensuales = () => {
    const meses = {};
    const fechaBase = new Date(anioSeleccionado, mesSeleccionado, 15);
    
    // Preparar los últimos 6 meses hacia atrás desde la fecha seleccionada
    for (let i = 0; i <= 5; i++) {
      const fecha = subMonths(fechaBase, i);
      const mesKey = format(fecha, 'MMM yyyy', { locale: es });
      meses[mesKey] = { mes: mesKey, ingresos: 0, paquetes: 0 };
    }

    // Llenamos con los datos de la base de datos general (no solo el mes filtrado)
    paquetes.forEach(p => {
      if (isPagado(p) && getPrecioNumero(p) > 0) {
        let fechaPaquete = getFechaPaquete(p);
        let fecha = parseFecha(fechaPaquete);
        if (!fecha) return;

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
      totalRecaudado: totalPrecios.toFixed(2),
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

  // Lista de meses para el Select
  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="estadisticas-panel">
      
      {/* HEADER: SELECTORES DE FECHA Y BOTÓN DE PDF */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        
        {/* 🔥 SELECTORES DINÁMICOS */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={mesSeleccionado} 
            onChange={(e) => setMesSeleccionado(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', background: '#1A202C', color: '#fff', border: '1px solid #D4AF37', cursor: 'pointer', outline: 'none' }}
          >
            {mesesNombres.map((mes, index) => (
              <option key={index} value={index}>{mes}</option>
            ))}
          </select>

          <select 
            value={anioSeleccionado} 
            onChange={(e) => setAnioSeleccionado(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', background: '#1A202C', color: '#fff', border: '1px solid #D4AF37', cursor: 'pointer', outline: 'none' }}
          >
            {aniosDisponibles.map(anio => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={exportarPDF} 
          disabled={generandoPDF || paquetesFiltrados.length === 0}
          className="wp-btn-plus"
          style={{ 
            background: '#D4AF37', 
            color: '#000', 
            border: 'none', 
            padding: '10px 20px', 
            borderRadius: '6px', 
            fontWeight: 'bold', 
            cursor: generandoPDF || paquetesFiltrados.length === 0 ? 'not-allowed' : 'pointer',
            opacity: generandoPDF || paquetesFiltrados.length === 0 ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {generandoPDF ? '⏳ Generando PDF...' : '📥 Descargar Reporte PDF'}
        </button>
      </div>

      {paquetesFiltrados.length === 0 ? (
        <div className="no-data-message" style={{ textAlign: 'center', padding: '60px 20px', background: '#111827', borderRadius: '10px', color: '#A0AEC0' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
          <h3>Sin datos registrados</h3>
          <p>No se encontraron paquetes para {mesesNombres[mesSeleccionado]} de {anioSeleccionado}.</p>
        </div>
      ) : (
        // 🔥 CONTENEDOR REF: Todo lo que esté aquí adentro saldrá en el PDF
        <div ref={panelRef} style={{ background: '#111827', padding: '20px', borderRadius: '10px' }}>
          
          {/* RESUMEN RÁPIDO */}
          <div className="resumen-rapido-grid">
            <div className="resumen-card">
              <div className="resumen-icono">💵</div>
              <div className="resumen-info">
                <div className="resumen-valor">${resumen.totalRecaudado}</div>
                <div className="resumen-etiqueta">Total Recaudado USD</div>
              </div>
            </div>
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
          <div className="grafico-container" style={{ marginTop: '20px' }}>
            <h3>📈 Evolución de Ingresos (Últimos 6 meses)</h3>
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
          <div className="two-columns" style={{ marginTop: '20px' }}>
            <div className="top-clientes">
              <h3>🏆 Top 5 Clientes ({mesesNombres[mesSeleccionado]})</h3>
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
      )}
    </div>
  );
};

export default EstadisticasPanel;