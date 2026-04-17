// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// TU CONFIGURACIÓN DE FIREBASE (copiada de la consola)
const firebaseConfig = {
  apiKey: "AIzaSyA6cClwrxLPXflKvgD5tKp5V6cjI4zM_k0",
  authDomain: "sistema-tracking-38b94.firebaseapp.com",
  projectId: "sistema-tracking-38b94",
  storageBucket: "sistema-tracking-38b94.firebasestorage.app",
  messagingSenderId: "340946025418",
  appId: "1:340946025418:web:4b4463ac956b9e95962d33"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar la autenticación para usarla en otros archivos
export const auth = getAuth(app);