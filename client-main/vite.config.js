import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  const apiUrl = env.VITE_REACT_APP_API_URL
  if (!apiUrl) {
    console.warn('Warning: VITE_REACT_APP_API_URL is not set in environment variables')
  }

  return {
    plugins: [
      react({
        include: "**/*.{jsx,tsx}",
        babel: {
          plugins: [],
          babelrc: false,
          configFile: false,
        },
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/Components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@assets': path.resolve(__dirname, './src/assets')
      }
    },
    server: {
      port: 5173,
      proxy: apiUrl ? {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.error('proxy error', err);
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
              res.end('Proxy error: ' + err.message);
            });
          }
        }
      } : undefined
    },
    build: {
      rollupOptions: {
        external: [],
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
      commonjsOptions: {
        esmExternals: true
      },
      outDir: 'dist',
      sourcemap: true,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000
    },
    define: {
      'process.env.VITE_REACT_APP_API_URL': JSON.stringify(env.VITE_REACT_APP_API_URL || '')
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: []
    }
  }
})