import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Suntik <meta google-site-verification> dari env saat build (agar kode
// verifikasi tidak di-hardcode di repo). Set GOOGLE_SITE_VERIFICATION di
// Environment Variables Vercel lalu rebuild/redeploy.
function googleVerification() {
  return {
    name: 'google-verification',
    transformIndexHtml(html) {
      const code = (process.env.GOOGLE_SITE_VERIFICATION || '').trim()
      const tag = code
        ? `<meta name="google-site-verification" content="${code.replace(/"/g, '&quot;')}" />`
        : ''
      return html.replace('<!--GOOGLE_SITE_VERIFICATION-->', tag)
    },
  }
}

export default defineConfig({
  plugins: [vue(), googleVerification()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
