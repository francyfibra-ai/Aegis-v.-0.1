/*
  main.jsx - punto di partenza dell'applicazione.
  Prende il componente <App /> e lo "attacca" al <div id="root">
  che si trova dentro index.html.
*/
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { registraServiceWorker } from './lib/notifiche.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Appena l'app parte, registriamo il service worker
// (il programma in background che ricevera' le notifiche).
registraServiceWorker()
