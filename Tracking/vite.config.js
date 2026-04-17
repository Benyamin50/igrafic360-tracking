import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/tracking/',
  server: {
    proxy: {
      '/envio-api': {
        target: 'https://igrafic360.net',
        changeOrigin: true,
        secure: false, // Permite conexiones locales
        cookieDomainRewrite: "localhost", // Adapta el dominio
        // 🔥 EL TRUCO MAESTRO: Intercepta la respuesta y le quita el 'Secure' a la cookie 
        // para que tu Chrome en localhost la acepte sin chistar.
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            if (proxyRes.headers['set-cookie']) {
              proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie =>
                cookie.replace(/;\s*Secure/gi, '')
              );
            }
          });
        }
      }
    }
  }
})