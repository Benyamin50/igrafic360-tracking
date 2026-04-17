// src/hooks/usePaquetes.js
import useSWR from 'swr';
import { API_URL } from '../services/api';

const fetcher = async (url) => {
  console.log('🔍 FETCHING:', url);
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
    throw new Error('Error al cargar datos');
  }
  
  return res.json();
};

export function usePaquetes(uid, limit = 20) {
  const url = uid ? `${API_URL}/api/cliente/${uid}/paquetes?limit=${limit}` : null;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    dedupingInterval: 2000,
  });
  
  return {
    paquetes: data?.paquetes || [],
    pagination: data?.pagination || { has_more: true, next_last_id: null, total: 0, loaded: 0 },
    isLoading,
    error,
    mutate,
  };
}

export function useTracking(trackingId) {
  // 🔥 ELIMINA el _t=${Date.now()} de la URL
  const url = trackingId ? `${API_URL}/tracking/${trackingId}` : null;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: true,
    revalidateIfStale: true,
    dedupingInterval: 2000,
  });
  
  return {
    trackingData: data || [],
    isLoading,
    error,
    mutate,
  };
}