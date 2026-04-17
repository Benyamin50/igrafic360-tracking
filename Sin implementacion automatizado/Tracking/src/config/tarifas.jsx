// src/config/tarifas.js

// ============================================
// CONFIGURACIÓN Y DESTINOS (EN USD)
// ============================================
export const DESTINOS = {
  'Caracas': { aereo: 5.75, minAereo: 35, maritimo: 33.00 },
  'Gran Caracas': { aereo: 5.85, minAereo: 35, maritimo: 34.00 },
  'Centro (Valencia, Maracay)': { aereo: 6.00, minAereo: 40, maritimo: 37.00 },
  'Barquisimeto': { aereo: 6.25, minAereo: 40, maritimo: 37.00 },
  'Oriente y Occidente': { aereo: 6.70, minAereo: 40, maritimo: 38.00 },
  'Maracaibo y Falcón': { aereo: 7.50, minAereo: 45, maritimo: 40.00 }
};

export const CONFIG = {
  factorVolumetrico: 6000, // Para aéreo (cm³/kg)
  seguro: 0.05, // 5% de seguro (puedes poner 0 si quieres quitarlo)
  KG_TO_LB: 2.20462,
  LB_TO_KG: 0.453592,
  CM3_TO_CFT: 28316.8466, // Divisor exacto de cm³ a Pie Cúbico (CFT)
  TASA_EURO_DEFAULT: 520.64,
  TASA_API_URL: 'https://igrafic360.net/envio-api/api/tasa-euro'
};

// ============================================
// OBTENER TASA ACTUAL
// ============================================
export const obtenerTasaActual = async () => {
  try {
    const response = await fetch(CONFIG.TASA_API_URL);
    const data = await response.json();
    if (data.tasa) return data.tasa;
  } catch (error) {
    console.error('❌ Error obteniendo tasa:', error);
  }
  return CONFIG.TASA_EURO_DEFAULT;
};

// ============================================
// FUNCIÓN PRINCIPAL DE CÁLCULO
// ============================================
export const calcularEnvio = async (datos) => {
  const {
    alto = 0, largo = 0, ancho = 0,
    pesoRealKg = 0,
    destino = 'Caracas', // 👈 Nuevo parámetro obligatorio
    tipoEnvio = 'aereo', // 👈 'aereo' o 'maritimo'
    incluirSeguro = true,
    tasaPersonalizada = null
  } = datos;

  const tarifasDestino = DESTINOS[destino];
  if (!tarifasDestino) throw new Error("Destino no configurado");

  let totalUSD = 0;
  let pesoACobrarTexto = "";
  let detalle = {};

  if (tipoEnvio === 'aereo') {
    // ✈️ LÓGICA AÉREO (Peso Real vs Volumétrico en Libras)
    const pesoVolumetricoKg = (alto && largo && ancho) ? (alto * largo * ancho) / CONFIG.factorVolumetrico : 0;
    const pesoRealLb = pesoRealKg * CONFIG.KG_TO_LB;
    const pesoVolumetricoLb = pesoVolumetricoKg * CONFIG.KG_TO_LB;
    
    // El mayor en libras
    const pesoFinalLb = Math.max(pesoRealLb, pesoVolumetricoLb);
    
    // Cálculo inicial
    let subtotalAereo = pesoFinalLb * tarifasDestino.aereo;
    let aplicoMinimo = false;

    // Verificar Mínimo
    if (subtotalAereo < tarifasDestino.minAereo) {
      totalUSD = tarifasDestino.minAereo;
      aplicoMinimo = true;
    } else {
      totalUSD = subtotalAereo;
    }

    pesoACobrarTexto = `${pesoFinalLb.toFixed(2)} lb`;
    detalle = { 
      pesoRealLb: pesoRealLb.toFixed(2), 
      pesoVolumetricoLb: pesoVolumetricoLb.toFixed(2), 
      tarifaAplicada: tarifasDestino.aereo,
      aplicoMinimo,
      minimoReferencia: tarifasDestino.minAereo
    };

  } else {
    // 🚢 LÓGICA MARÍTIMA (Pies Cúbicos, sin mínimo)
    const volumenCm3 = alto * largo * ancho;
    const piesCubicos = volumenCm3 / CONFIG.CM3_TO_CFT; // Convertir de cm³ a ft³
    
    totalUSD = piesCubicos * tarifasDestino.maritimo;
    
    pesoACobrarTexto = `${piesCubicos.toFixed(2)} ft³ (CFT)`;
    detalle = { 
      piesCubicos: piesCubicos.toFixed(2), 
      tarifaAplicada: tarifasDestino.maritimo 
    };
  }

  // 🛡️ Aplicar seguro si está activo
  if (incluirSeguro) {
    totalUSD = totalUSD * (1 + CONFIG.seguro);
  }

  // 💶 Calcular Bolívares con la tasa actual
  const tasaEUR = tasaPersonalizada || await obtenerTasaActual();
  const totalBs = totalUSD * tasaEUR;

  return {
    tipoEnvio,
    destino,
    pesoACobrarTexto,
    totalUSD: totalUSD.toFixed(2),
    tasaEUR: tasaEUR.toFixed(2),
    totalBs: totalBs.toFixed(2),
    totalBsFormateado: `Bs. ${totalBs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`,
    ...detalle
  };
};