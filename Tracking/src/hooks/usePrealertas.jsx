// src/hooks/usePrealertas.js
import useSWR from 'swr';
import { API_URL } from '../services/api';

const fetcher = async (url) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al cargar prealertas');
  }
  
  const data = await response.json();
  return data.prealertas || [];
};

export const usePrealertas = (uid) => {
  const { data, error, isLoading, mutate } = useSWR(
    uid ? `${API_URL}/api/prealerta/mis-prealertas` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minuto de caché
      refreshInterval: 30000, // Actualizar cada 30 segundos en segundo plano
    }
  );

  return {
    prealertas: data || [],
    isLoading: isLoading,
    isError: error,
    mutate: mutate
  };
};