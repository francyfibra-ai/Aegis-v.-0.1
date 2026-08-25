/*
  notifiche.js
  ---------------------------------------------------------------
  Tutte le funzioni che riguardano le notifiche stanno qui,
  cosi' se in futuro cambiamo qualcosa sappiamo dove guardare.

  In Fase 1 gestiamo solo le notifiche LOCALI (generate dal telefono
  stesso, per fare una prova). In Fase 4 aggiungeremo quelle PUSH,
  che arrivano da un server anche ad app chiusa.
*/

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
    const registrazione = await navigator.serviceWorker.register('/sw.js')
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
    icon: '/icon-192.png',
    badge: '/icon-192.png',
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
