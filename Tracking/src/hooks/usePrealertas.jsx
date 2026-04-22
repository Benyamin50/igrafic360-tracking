// src/hooks/usePrealertas.js
import useSWR from 'swr';
import { API_URL } from '../services/api';

const fetcher = async (url) => {
  console.log('🔍 FETCHING PREALERTAS:', url);
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    window.location.reload();
    return null;
  }
  
  if (!res.ok) {
    throw new Error('Error al cargar prealertas');
  }
  
  const data = await res.json();
  return data.prealertas || [];
};

export function usePrealertas(uid) {
  const url = uid ? `${API_URL}/api/prealerta/mis-prealertas` : null;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,  // ✅ AGREGADO para que sea igual
    revalidateIfStale: true,
    dedupingInterval: 2000,
  });
  
  return {
    prealertas: data || [],
    isLoading,
    error,
    mutate,
  };
}