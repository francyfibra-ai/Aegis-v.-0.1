// Configurazione di Vite: lo strumento che avvia l'app in locale
// e la "compila" per pubblicarla online.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
  IN QUALE CARTELLA VIVE L'APP, UNA VOLTA ONLINE
  ------------------------------------------------------------------
  Su GitHub Pages l'app non sta alla radice del sito ma dentro una
  sottocartella che porta il nome della repository:

      https://francyfibra-ai.github.io/Aegis-v.-0.1/
                                       ^^^^^^^^^^^^^

  Questa riga dice a Vite di cercare li' dentro i propri file.
  Senza, l'app li cercherebbe alla radice e resterebbe una pagina bianca.

  SE UN DOMANI SPOSTIAMO L'APP su un indirizzo tutto suo
  (Firebase Hosting, Netlify, un dominio personale), qui va rimesso '/'.
  E' l'unica riga da cambiare: tutto il resto si adatta da solo.
*/
const CARTELLA_ONLINE = '/Aegis-v.-0.1/'

export default defineConfig(({ command }) => ({
  // In locale ('npm run dev') l'app sta alla radice; solo la versione
  // pubblicata usa la sottocartella.
  base: command === 'build' ? CARTELLA_ONLINE : '/',

  plugins: [react()],

  server: {
    // "host: true" permette di aprire l'app dal telefono
    // durante lo sviluppo, usando l'indirizzo IP del computer.
    host: true,
    port: 5173,
  },
}))
