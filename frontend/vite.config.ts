import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
<<<<<<< HEAD
import tailwind from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
=======
>>>>>>> 1eb10997e58b843337ae307ea9fb69019075b2b7

export default defineConfig({
  plugins: [
<<<<<<< HEAD
    TanStackRouterVite(),
    tailwind(),
=======
>>>>>>> 1eb10997e58b843337ae307ea9fb69019075b2b7
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})
