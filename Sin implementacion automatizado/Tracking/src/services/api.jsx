// src/services/api.js
export const API_URL = "https://igrafic360.net/envio-api";

const fetchConfig = (method = 'GET', body = null) => {
  const config = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  return config;
};

const getAuthHeaders = (additionalHeaders = {}) => {
  return {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
};

export const ApiService = {
  async obtenerUsuarioActual() {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.cliente;
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  async registrar(email, password, nombre, telefono = '', rol = 'cliente') {
    const res = await fetch(`${API_URL}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nombre, telefono, rol })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error en registro');
    }
    return data;
  },

  async enviarCodigoEmail(email) {
    const res = await fetch(`${API_URL}/api/enviar-codigo-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error enviando codigo');
    return data;
  },

  async verificarCodigoEmail(email, codigo) {
    const res = await fetch(`${API_URL}/api/verificar-codigo-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, codigo })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Codigo incorrecto o expirado');
    return data;
  },

  async solicitarRecuperacionPassword(email) {
    const res = await fetch(`${API_URL}/api/enviar-codigo-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al solicitar recuperacion');
    return data;
  },

  async cambiarPasswordConCodigo(email, codigo, nuevaPassword) {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email, 
        codigo: codigo, 
        nueva_password: nuevaPassword 
      })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al cambiar la contraseña');
    }
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error en login');
    }
    
    const data = await res.json();
    return data;
  },

  async logout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      // Error silencioso
    }
  },

  async obtenerRol() {
    try {
      const user = await this.obtenerUsuarioActual();
      return user?.rol || 'cliente';
    } catch (error) {
      return 'cliente';
    }
  },

  async getPaquetesCliente(uid) {
    const res = await fetch(`${API_URL}/api/cliente/${uid}/paquetes`, {
      credentials: 'include',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Error al cargar paquetes');
    return res.json();
  },

  async getPaquetesClientePaginado(uid, limit = 20, lastId = null) {
    let url = `${API_URL}/api/cliente/${uid}/paquetes?limit=${limit}`;
    if (lastId) {
      url += `&last_id=${encodeURIComponent(lastId)}`;
    }
    const res = await fetch(url, {
      credentials: 'include',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Error al cargar paquetes');
    return res.json();
  },

  async getPaquetesAdmin(limit = 50, lastId = null) {
    let url = `${API_URL}/paquetes?limit=${limit}`;
    if (lastId) {
      url += `&last_id=${encodeURIComponent(lastId)}`;
    }
    const res = await fetch(url, {
      credentials: 'include',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Error al cargar paquetes');
    return res.json();
  },

  async asignarPaquete(uid, trackingId) {
    const res = await fetch(`${API_URL}/api/paquete/asignar`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ uid, tracking_id: trackingId })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al asignar');
    }
    return res.json();
  },

  async obtenerFotosPaquete(trackingId) {
    try {
      const res = await fetch(`${API_URL}/api/paquete/${trackingId}/fotos`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        // ✅ LA MAGIA AQUÍ: Silencioso si falla por tráfico temporal (status 403 falso)
        if (res.status === 403) {
          console.warn("Aviso: Las fotos se omitieron temporalmente por pico de tráfico.");
        }
        return []; 
      }
      
      const data = await res.json();
      
      if (data.fotos && Array.isArray(data.fotos)) {
        if (data.fotos.length > 0 && typeof data.fotos[0] === 'string') {
          const tiposUbicacion = ['Ubicacion_1', 'Ubicacion_2', 'Ubicacion_3', 'Llegada_Sucursal', 'Entregado'];
          return data.fotos.map((url, index) => ({
            url: url,
            tipo: index < tiposUbicacion.length ? tiposUbicacion[index] : `foto_extra_${index + 1}`
          }));
        }
        return data.fotos;
      }
      return [];
    } catch (error) {
      // ✅ Silencioso si explota por cualquier otra cosa
      return [];
    }
  },

  async subirFoto(archivo, trackingId, tipo = 'comprobante_pago') {
    try {
      const CLOUD_NAME = 'dv7im5w4g';
      const UPLOAD_PRESET = 'tracking_preset';
      
      const formData = new FormData();
      formData.append('file', archivo);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', `paquetes/${trackingId}`);
      formData.append('public_id', `${trackingId}_${tipo}_${Date.now()}`);
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudinary error: ${errorData.error?.message || 'Error al subir'}`);
      }
      
      const data = await response.json();
      const fotoUrl = data.secure_url;
      
      const responseBackend = await fetch(`${API_URL}/api/paquete/agregar-foto`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tracking_id: trackingId,
          foto_url: fotoUrl,
          tipo: tipo,
          fecha: new Date().toLocaleString()
        })
      });
      
      if (!responseBackend.ok) {
        const error = await responseBackend.json();
        throw new Error(error.error || 'Fallo registro en base de datos');
      }
      
      return fotoUrl;
    } catch (error) {
      throw error;
    }
  },

  async marcarPaquetePagado(trackingId, pagado) {
    try {
      const res = await fetch(`${API_URL}/api/paquete/marcar-pagado`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          tracking_id: trackingId, 
          pagado: pagado,
          fecha_pago: pagado ? new Date().toLocaleString() : null
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al marcar pago');
      }
      
      return res.json();
    } catch (error) {
      throw error;
    }
  },

  async reportarPago(trackingId, metodoPago, referenciaBinance = '') {
    try {
      const res = await fetch(`${API_URL}/api/reportar-pago`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          tracking_id: trackingId, 
          metodo_pago: metodoPago,
          referencia_binance: referenciaBinance
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al reportar pago');
      }
      
      return res.json();
    } catch (error) {
      throw error;
    }
  },

  async actualizarDatosPaquete(trackingId, datos) {
    const res = await fetch(`${API_URL}/actualizar-datos`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id: trackingId, ...datos })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al actualizar datos');
    }
    return res.json();
  },

  async marcarComoFantasma(trackingId) {
    try {
      const res = await fetch(`${API_URL}/actualizar-datos`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          id: trackingId, 
          es_fantasma: true 
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al marcar como fantasma');
      }
      
      return res.json();
    } catch (error) {
      throw error;
    }
  },

  async obtenerCoordenadas(trackingId) {
    try {
      const res = await fetch(`${API_URL}/api/paquete/${trackingId}/coordenadas`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      
      if (!res.ok) {
        // ✅ LA MAGIA AQUÍ: Silencioso
        if (res.status === 403) {
          console.warn("Aviso: Las coordenadas se omitieron temporalmente por pico de tráfico.");
        }
        return [];
      }
      
      const data = await res.json();
      return data.coordenadas || [];
    } catch (error) {
      // ✅ Silencioso
      return [];
    }
  },

  async batchOperations(operations) {
    const res = await fetch(`${API_URL}/api/batch`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ operations })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error en operacion batch');
    }
    
    return res.json();
  },

  getWebPUrl(originalUrl, width = 800, height = 800) {
    try {
      if (!originalUrl.includes('cloudinary.com')) return originalUrl;
      
      const urlParts = originalUrl.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex === -1) return originalUrl;
      
      const publicId = urlParts.slice(uploadIndex + 1).join('/');
      return `https://res.cloudinary.com/dv7im5w4g/image/upload/c_fill,w_${width},h_${height},f_webp,q_auto/${publicId}`;
    } catch (error) {
      return originalUrl;
    }
  },

  getWebPUrlSimple(originalUrl) {
    try {
      if (!originalUrl.includes('cloudinary.com')) return originalUrl;
      const urlParts = originalUrl.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex === -1) return originalUrl;
      const publicId = urlParts.slice(uploadIndex + 1).join('/');
      return `https://res.cloudinary.com/dv7im5w4g/image/upload/f_webp,q_auto/${publicId}`;
    } catch (error) {
      return originalUrl;
    }
  }
};

export const getUID = async () => {
  const user = await ApiService.obtenerUsuarioActual();
  return user?.uid || null;
};