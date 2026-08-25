/*
  push.js
  ---------------------------------------------------------------
  Registra questo telefono per ricevere le notifiche, e lo cancella.

  COSA SUCCEDE QUANDO ATTIVI I PROMEMORIA
   1. Android chiede il permesso (una volta sola)
   2. Il telefono genera un indirizzo unico e una coppia di chiavi
   3. Salviamo quei dati nel tuo archivio online
   4. Da li' la "sveglia" sa dove scriverti

  L'indirizzo del punto 2 vale solo per Aegis e solo per questo
  dispositivo: non e' un identificativo che ti segue altrove.
*/

import { supabase } from './supabase.js'
import { VAPID_CHIAVE_PUBBLICA } from './configurazione.js'

/**
 * La chiave pubblica va consegnata ad Android come sequenza di byte,
 * non come testo. Questa conversione fa esattamente quello.
 */
function chiaveInByte(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const conRiempimento = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binario = atob(conRiempimento)
  const byte = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) byte[i] = binario.charCodeAt(i)
  return byte
}

/** Il contrario: da byte a testo, per poter salvare le chiavi nel database. */
function byteInTesto(buffer) {
  const byte = new Uint8Array(buffer)
  let binario = ''
  for (const b of byte) binario += String.fromCharCode(b)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Questo telefono e' gia' registrato?
 * @returns {Promise<boolean>}
 */
export async function iscrittoAllePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const registrazione = await navigator.serviceWorker.ready
    const iscrizione = await registrazione.pushManager.getSubscription()
    return Boolean(iscrizione)
  } catch (errore) {
    console.warn('[push] non riesco a leggere lo stato:', errore)
    return false
  }
}

/**
 * Attiva i promemoria su questo dispositivo.
 * Va chiamata da un tocco su un pulsante: Android mostra la richiesta
 * di permesso solo come conseguenza di un gesto dell'utente.
 *
 * @returns {Promise<{ok: boolean, motivo?: string}>}
 */
export async function attivaPromemoria() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, motivo: 'Questo browser non supporta le notifiche push. Su Android usa Chrome.' }
  }
  if (!supabase) {
    return { ok: false, motivo: 'Archivio online non configurato.' }
  }

  const { data } = await supabase.auth.getSession()
  const utente = data.session?.user
  if (!utente) {
    return { ok: false, motivo: 'Devi prima effettuare l\'accesso: la sveglia deve sapere a chi scrivere.' }
  }

  // 1. Il permesso di Android
  const permesso = await Notification.requestPermission()
  if (permesso !== 'granted') {
    return {
      ok: false,
      motivo:
        permesso === 'denied'
          ? 'Permesso negato. Per riattivarlo: Impostazioni Android → App → Aegis → Notifiche.'
          : 'Permesso non concesso.',
    }
  }

  const registrazione = await navigator.serviceWorker.ready

  // 2. L'iscrizione vera e propria
  let iscrizione = await registrazione.pushManager.getSubscription()
  if (!iscrizione) {
    try {
      iscrizione = await registrazione.pushManager.subscribe({
        // Obbligatorio su Chrome: significa "ogni notifica sara' visibile,
        // nessuna verra' usata di nascosto".
        userVisibleOnly: true,
        applicationServerKey: chiaveInByte(VAPID_CHIAVE_PUBBLICA),
      })
    } catch (errore) {
      console.error('[push] iscrizione fallita:', errore)
      return { ok: false, motivo: 'Android ha rifiutato la registrazione: ' + errore.message }
    }
  }

  // 3. Salvataggio nell'archivio online
  const dati = iscrizione.toJSON()
  const { error } = await supabase.from('iscrizioni_push').upsert(
    {
      utente: utente.id,
      endpoint: dati.endpoint,
      chiave_p256dh: dati.keys.p256dh,
      chiave_auth: dati.keys.auth,
      dispositivo: descriviDispositivo(),
    },
    // Se questo stesso dispositivo era gia' registrato, la riga viene
    // aggiornata invece di crearne una seconda.
    { onConflict: 'endpoint' }
  )

  if (error) {
    console.error('[push] salvataggio fallito:', error)
    if (error.message?.includes('schema cache') || error.code === 'PGRST205') {
      return {
        ok: false,
        motivo:
          'Mancano le tabelle delle notifiche. Va incollato una volta sola supabase/schema-notifiche.sql nel pannello Supabase.',
      }
    }
    return { ok: false, motivo: 'Non sono riuscito a registrare il telefono: ' + error.message }
  }

  return { ok: true }
}

/**
 * Disattiva i promemoria su questo dispositivo.
 * L'iscrizione viene tolta sia dal telefono sia dall'archivio: senza la
 * seconda parte, la sveglia continuerebbe a scrivere nel vuoto.
 */
export async function disattivaPromemoria() {
  const registrazione = await navigator.serviceWorker.ready
  const iscrizione = await registrazione.pushManager.getSubscription()
  if (!iscrizione) return { ok: true }

  const endpoint = iscrizione.endpoint
  await iscrizione.unsubscribe()

  if (supabase) {
    const { error } = await supabase.from('iscrizioni_push').delete().eq('endpoint', endpoint)
    if (error) console.warn('[push] non sono riuscito a cancellare la riga:', error)
  }

  return { ok: true }
}

/** Un'etichetta leggibile per riconoscere il dispositivo nell'elenco. */
function descriviDispositivo() {
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad/i.test(ua)) return 'iPhone/iPad'
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Mac/i.test(ua)) return 'Mac'
  return 'Altro dispositivo'
}
