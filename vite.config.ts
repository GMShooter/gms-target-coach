import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Load environment variables
const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': './src',
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'build',
  },
  css: {
    postcss: './postcss.config.js',
  },
  // Ensure environment variables are available to client
  define: {
    __APP_ENV__: JSON.stringify(env.NODE_ENV || 'development'),
  },
})