// Configurazione di Vite: lo strumento che avvia l'app in locale
// e la "compila" per pubblicarla online.
// Non serve toccare quasi mai questo file.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Abilita React (la libreria con cui e' scritta l'interfaccia)
  plugins: [react()],

  server: {
    // "host: true" permette di aprire l'app dal telefono
    // durante lo sviluppo, usando l'indirizzo IP del computer.
    host: true,
    port: 5173,
  },
})
