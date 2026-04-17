// src/hooks/usePaquetesAdmin.js
import useSWR from 'swr';
import { API_URL } from '../services/api';

const fetcher = async (url) => {
  console.log('📡 Admin fetcher:', url);
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Error');
  return res.json();
};

export function usePaquetesAdmin(limit = 50) {
  // 🔥 Usamos useSWR normal, no useSWRInfinite
  const url = `${API_URL}/paquetes?limit=${limit}`;
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: true,
    revalidateIfStale: true,
    dedupingInterval: 2000,
  });
  
  console.log('📊 Admin data:', data);
  
  return {
    paquetes: data?.paquetes || [],
    pagination: data?.pagination || { has_more: true, next_last_id: null },
    isLoading,
    error,
    mutate,
  };
}