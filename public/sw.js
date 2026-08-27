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
const VERSIONE = 'aegis-sw-v5'

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

  // I pulsanti cambiano a seconda del tipo di evento:
  //  - allenamento e pasto -> si risponde "Fatto" o "Saltato"
  //  - peso                -> serve scrivere un numero, e Android NON permette
  //    di scrivere dentro una notifica: quindi un solo pulsante, che apre
  //    l'app gia' sul campo giusto.
  const azioni =
    dati.tipo === 'peso'
      ? [{ action: 'registra-peso', title: 'Registra peso' }]
      : [
          { action: 'fatto', title: 'Fatto' },
          { action: 'saltato', title: 'Saltato' },
        ]

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
    // actions: i pulsanti sotto la notifica (vedi sopra)
    actions: azioni,
  }

  // waitUntil dice ad Android: "non spegnermi finche' non ho finito"
  event.waitUntil(self.registration.showNotification(titolo, opzioni))
})

// --- 4. Tocco sulla notifica o su un pulsante -------------------------
self.addEventListener('notificationclick', (event) => {
  const azione = event.action // 'fatto', 'saltato', oppure '' se ha toccato il corpo
  const dati = event.notification.data || {}

  /*
    DIAGNOSTICA TEMPORANEA
    Premendo "Fatto" l'app ha riportato "saltato", e rileggendo il codice
    non si trova l'errore. Raccogliamo quindi cio' che Android dichiara
    davvero: quali pulsanti dice di aver mostrato, in che ordine, e quale
    dice che e' stato premuto. Da rimuovere quando il caso e' chiarito.
  */
  const pulsantiMostrati = (event.notification.actions || [])
    .map((a) => a.action + ':' + a.title)
    .join('|')

  const diagnostica = {
    versioneSw: VERSIONE,
    pulsantiMostrati,
    azioneRicevuta: azione === '' ? '(corpo della notifica)' : azione,
  }

  // Chiude la notifica appena toccata
  event.notification.close()

  event.waitUntil(
    (async () => {
      // In Fase 5 qui invieremo la risposta al database.
      // Per ora apriamo semplicemente l'app, passandole l'informazione
      // tramite l'indirizzo (es. /?risposta=fatto&evento=abc123)
      const parametri = new URLSearchParams()

      if (azione === 'registra-peso' || dati.tipo === 'peso') {
        // Il peso non e' "fatto/saltato": va scritto un numero.
        // Portiamo l'utente sulla schermata Peso, con il campo gia' aperto.
        parametri.set('vista', 'peso')
        parametri.set('registra', '1')
      } else if (azione) {
        parametri.set('risposta', azione)
      }

      if (dati.eventoId) parametri.set('evento', dati.eventoId)

      // Diagnostica temporanea, vedi sopra
      parametri.set('sw', diagnostica.versioneSw)
      parametri.set('pulsanti', diagnostica.pulsantiMostrati)

      const url = BASE + (parametri.toString() ? '?' + parametri.toString() : '')

      // Se l'app e' gia' aperta la portiamo in primo piano,
      // altrimenti apriamo una nuova finestra.
      const finestre = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      for (const finestra of finestre) {
        if ('focus' in finestra) {
          // Avvisa l'app gia' aperta di cosa e' stato premuto.
          // "origine" serve a capire, in caso di risposta sbagliata, se
          // il valore arriva da qui o dall'indirizzo: sono due percorsi
          // diversi e si sbagliano in modi diversi.
          finestra.postMessage({
            tipo: 'risposta-notifica',
            azione,
            origine: 'messaggio',
            diagnostica,
            dati,
          })
          return finestra.focus()
        }
      }

      return self.clients.openWindow(url)
    })()
  )
})
