import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/health': 'http://localhost:4000'
    },
	allowedHosts: [
      'fintrack.dauny.org'
    ],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          charts: ['echarts', 'echarts-for-react']
        }
      }
    }
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['echarts']
  }
})


