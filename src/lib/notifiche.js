/*
  notifiche.js
  ---------------------------------------------------------------
  Tutte le funzioni che riguardano le notifiche stanno qui,
  cosi' se in futuro cambiamo qualcosa sappiamo dove guardare.

  In Fase 1 gestiamo solo le notifiche LOCALI (generate dal telefono
  stesso, per fare una prova). In Fase 4 aggiungeremo quelle PUSH,
  che arrivano da un server anche ad app chiusa.
*/

/*
  DOVE VIVE L'APP
  ------------------------------------------------------------------
  Online l'app sta dentro una sottocartella ("/Aegis-v.-0.1/"), in locale
  sta alla radice ("/"). Vite ci mette a disposizione questo valore gia'
  pronto: usandolo, gli indirizzi qui sotto sono giusti in tutti e due
  i casi, senza doverli riscrivere quando cambiamo hosting.
*/
const BASE = import.meta.env.BASE_URL

/** L'indirizzo di un'icona, valido sia in locale sia online. */
function icona(nome) {
  return BASE + nome
}

/**
 * Registra il service worker (il file public/sw.js).
 * Va chiamata una volta sola all'avvio dell'app.
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
export async function registraServiceWorker() {
  // Alcuni browser molto vecchi non supportano i service worker
  if (!('serviceWorker' in navigator)) {
    console.warn('[aegis] questo browser non supporta i service worker')
    return null
  }

  try {
    // Lo "scope" dice quale parte del sito il service worker controlla:
    // deve essere la cartella dell'app, non tutto il dominio (su
    // github.io il dominio e' condiviso con altri progetti).
    const registrazione = await navigator.serviceWorker.register(BASE + 'sw.js', {
      scope: BASE,
    })
    console.log('[aegis] service worker registrato')
    return registrazione
  } catch (errore) {
    console.error('[aegis] registrazione service worker fallita:', errore)
    return null
  }
}

/**
 * Controlla lo stato del permesso per le notifiche.
 * @returns {'non-supportato'|'default'|'granted'|'denied'}
 *   - 'default'  = non abbiamo ancora chiesto
 *   - 'granted'  = l'utente ha detto si'
 *   - 'denied'   = l'utente ha detto no (va riattivato dalle impostazioni Android)
 */
export function statoPermessoNotifiche() {
  if (!('Notification' in window)) return 'non-supportato'
  return Notification.permission
}

/**
 * Chiede all'utente il permesso di mandargli notifiche.
 * Android mostra il popup di sistema solo se questa funzione viene
 * chiamata come conseguenza di un tocco su un pulsante.
 * @returns {Promise<string>} lo stato del permesso dopo la richiesta
 */
export async function chiediPermessoNotifiche() {
  if (!('Notification' in window)) return 'non-supportato'
  const risultato = await Notification.requestPermission()
  return risultato
}

/**
 * Mostra una notifica di PROVA generata dal telefono stesso.
 * Serve per verificare che il canale funzioni, prima ancora di
 * avere un server che invii le notifiche vere.
 *
 * Nota: la mostriamo tramite il service worker (e non con
 * "new Notification(...)") perche' solo cosi' Android disegna
 * anche i due pulsanti "Fatto" / "Saltato".
 */
export async function notificaDiProva() {
  if (statoPermessoNotifiche() !== 'granted') {
    throw new Error('Permesso notifiche non concesso')
  }

  const registrazione = await navigator.serviceWorker.ready

  await registrazione.showNotification('Aegis - prova', {
    body: 'Se leggi questo, le notifiche funzionano.',
    icon: icona('icon-192.png'),
    badge: icona('icon-192.png'),
    vibrate: [100, 50, 100],
    tag: 'aegis-prova',
    requireInteraction: true,
    data: { eventoId: 'prova' },
    actions: [
      { action: 'fatto', title: 'Fatto' },
      { action: 'saltato', title: 'Saltato' },
    ],
  })
}

/**
 * Dice se l'app e' stata aperta come app installata
 * (icona in home screen) invece che come pagina del browser.
 * @returns {boolean}
 */
export function appInstallata() {
  return window.matchMedia('(display-mode: standalone)').matches
}
