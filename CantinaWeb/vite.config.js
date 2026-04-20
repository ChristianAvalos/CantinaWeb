import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('chart.js')) {
            return 'vendor-chart'
          }

          if (id.includes('@lottiefiles')) {
            return 'vendor-lottie'
          }

          if (id.includes('@fortawesome')) {
            return 'vendor-icons'
          }

          if (id.includes('react-router')) {
            return 'vendor-router'
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'vendor-react'
          }

          if (id.includes('axios') || id.includes('swr') || id.includes('dayjs') || id.includes('react-toastify')) {
            return 'vendor-app'
          }

          return 'vendor-misc'
        },
      },
    },
  },
})
