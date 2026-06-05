import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  define: {
    // Vercel'deki çevre değişkeni hatasını bypass etmek için anahtarları doğrudan buraya gömüyoruz
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://ppebobjdddgnkrwnuyeq.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('sb_publishable_duUP0mqtA3K_8QpcXR8Wrg_KvcH5KZO')
  }
})
