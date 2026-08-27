/*
  SERVICE WORKER  -  public/sw.js
  ---------------------------------------------------------------
  Cos'e': un piccolo programma che il telefono tiene in esecuzione
  IN SECONDO PIANO, anche quando l'app Aegis e' chiusa.

  A cosa serve qui:
   1. Ricevere le notifiche push inviate dal server  (Fase 4)
   2. Gestire il tocco sulla notifica e sui pulsanti
      "Fatto" / "Saltato"                            (Fase 5)

  ATTENZIONE: questo file NON viene elaborato da Vite.
  Va scritto in JavaScript "semplice" e vive dentro /public,
  cosi' viene pubblicato tale e quale all'indirizzo /sw.js
*/

/*
  DOVE VIVE L'APP
  Online l'app sta in una sottocartella ("/Aegis-v.-0.1/"), in locale alla
  radice ("/"). Questo file non passa da Vite, quindi il percorso non puo'
  essergli scritto dentro: se lo ricava da solo, guardando dove si trova.
  Cosi' funziona in tutti e due i casi senza modifiche.
*/
const BASE = new URL('./', self.location).pathname

// Cambia questo numero ogni volta che modifichi il file:
// serve ad Android per accorgersi che c'e' una versione nuova.
const VERSIONE = 'aegis-sw-v6'

// --- 1. Installazione -------------------------------------------------
// Viene eseguita la prima volta che il service worker viene registrato.
self.addEventListener('install', (event) => {
  console.log('[sw] installato', VERSIONE)
  // skipWaiting = attiva subito la versione nuova, senza aspettare
  // che l'utente chiuda tutte le schede.
  self.skipWaiting()
})

// --- 2. Attivazione ---------------------------------------------------
self.addEventListener('activate', (event) => {
  console.log('[sw] attivo', VERSIONE)
  // clients.claim = prende il controllo delle pagine gia' aperte.
  event.waitUntil(self.clients.claim())
})

// --- 3. Arrivo di una notifica push -----------------------------------
// Per ora non e' ancora collegato a nessun server (lo faremo in Fase 4),
// ma il codice e' gia' pronto a ricevere il messaggio.
self.addEventListener('push', (event) => {
  // Il server ci mandera' un messaggio in formato JSON, tipo:
  // { "titolo": "Allenamento", "testo": "Petto e tricipiti", "eventoId": "..." }
  let dati = {}
  try {
    dati = event.data ? event.data.json() : {}
  } catch (e) {
    // Se il messaggio non e' JSON valido, lo trattiamo come testo semplice
    dati = { titolo: 'Aegis', testo: event.data ? event.data.text() : '' }
  }

  const titolo = dati.titolo || 'Aegis'

  /*
    LA NOTIFICA NON CHIEDE NULLA: RICORDA E BASTA.

    Prima aveva i pulsanti "Fatto" e "Saltato". Sono stati tolti dopo
    una verifica sul dispositivo: i pulsanti erano dichiarati
    correttamente e Android confermava di averli mostrati nell'ordine
    giusto, ma riferiva il pulsante sbagliato - premendo "Fatto"
    arrivava "saltato".

    Su uno storico che serve a capire come sei andato nel tempo, un
    dato falso e' peggio di un dato mancante: il vuoto si nota, la
    risposta sbagliata no. Quindi la risposta si da' nell'app, dove
    nessuno puo' fraintenderla, e la notifica fa solo il suo mestiere.
  */

  const opzioni = {
    body: dati.testo || '',
    icon: BASE + 'icon-192.png',
    badge: BASE + 'icon-192.png',
    // vibrate: fa vibrare il telefono (pausa/vibrazione in millisecondi)
    vibrate: [100, 50, 100],
    // tag: notifiche con lo stesso tag si sostituiscono invece di accumularsi
    tag: dati.eventoId || 'aegis-generico',
    // requireInteraction: la notifica resta finche' non la tocchi
    requireInteraction: true,
    // data: informazioni che ci ritroviamo quando l'utente tocca la notifica
    data: dati,
    // Nessun pulsante: si risponde nell'app (vedi sopra)
  }

  // waitUntil dice ad Android: "non spegnermi finche' non ho finito"
  event.waitUntil(self.registration.showNotification(titolo, opzioni))
})

// --- 4. Tocco sulla notifica o su un pulsante -------------------------
self.addEventListener('notificationclick', (event) => {
  const dati = event.notification.data || {}

  // Chiude la notifica appena toccata
  event.notification.close()

  event.waitUntil(
    (async () => {
      const parametri = new URLSearchParams()

      if (dati.tipo === 'peso') {
        // Il peso non e' "fatto/saltato": va scritto un numero.
        // Portiamo direttamente sulla schermata Peso, campo gia' aperto.
        parametri.set('vista', 'peso')
        parametri.set('registra', '1')
      } else if (dati.eventoId) {
        // Per gli altri, si apre il Piano con l'evento evidenziato:
        // i pulsanti Fatto/Saltato sono li' accanto.
        parametri.set('vista', 'piano')
        parametri.set('evento', dati.eventoId)
      }

      const url = BASE + (parametri.toString() ? '?' + parametri.toString() : '')

      // Se l'app e' gia' aperta la portiamo in primo piano, altrimenti
      // apriamo una nuova finestra.
      const finestre = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const finestra of finestre) {
        if ('focus' in finestra) {
          finestra.postMessage({ tipo: 'apri-evento', dati })
          return finestra.focus()
        }
      }

      return self.clients.openWindow(url)
    })()
  )
})
