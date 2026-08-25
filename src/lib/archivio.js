/*
  archivio.js
  ---------------------------------------------------------------
  IL PUNTO UNICO DA CUI L'APP CHIEDE E SALVA I DATI.

  Le schermate chiamano queste funzioni e non sanno - ne' devono
  sapere - dove finiscano davvero i dati. Qui dentro si decide:

     hai fatto l'accesso?  ->  archivio online  (archivioRemoto.js)
     no, oppure Supabase non e' configurato
                           ->  memoria del telefono (archivioLocale.js)

  Il passaggio da una modalita' all'altra avviene da solo quando entri
  o esci, e le schermate aperte si aggiornano senza doverle ricaricare.
*/

import { archivioLocale } from './archivioLocale.js'
import { archivioRemoto } from './archivioRemoto.js'
import { supabaseConfigurato } from './configurazione.js'

// Quale dei due e' in uso adesso. Si parte sempre dal locale:
// finche' non sappiamo se sei collegato, i dati del telefono ci sono
// di sicuro e l'app e' subito utilizzabile.
let attivo = archivioLocale

/*
  Le schermate si iscrivono QUI, non ai due archivi. Cosi', quando la
  modalita' cambia, non devono riagganciarsi a nulla: ci pensa questo
  file a ripuntare l'ascolto e a riavvisarle con i dati nuovi.
*/
const ascoltatori = { eventi: new Set(), misurazioni: new Set(), preferenze: new Set() }

// Le funzioni per disiscriversi dall'archivio attualmente in uso
let disiscrizioni = []

function collegaAscolto() {
  for (const stop of disiscrizioni) stop()

  disiscrizioni = [
    attivo.iscrivitiEventi((dati) => propaga('eventi', dati)),
    attivo.iscrivitiMisurazioni((dati) => propaga('misurazioni', dati)),
    attivo.iscrivitiPreferenze((dati) => propaga('preferenze', dati)),
  ]
}

function propaga(quale, dati) {
  for (const ascoltatore of ascoltatori[quale]) {
    try {
      ascoltatore(dati)
    } catch (e) {
      console.error('[archivio] ascoltatore in errore:', e)
    }
  }
}

collegaAscolto()

/* ==================================================================
   Cambio di modalita'
   ================================================================== */

/**
 * Da chiamare quando si entra o si esce.
 * @param {object|null} utente l'utenza collegata, oppure null
 */
export function impostaUtente(utente) {
  const nuovo = utente && supabaseConfigurato() ? archivioRemoto : archivioLocale
  if (nuovo === attivo) return

  attivo = nuovo
  collegaAscolto()

  // Avvisa tutte le schermate aperte: i dati da mostrare sono altri.
  // Se la lettura fallisce (per esempio senza connessione) mandiamo
  // elenchi vuoti invece di lasciare a schermo i dati di prima, che
  // non sarebbero piu' veri.
  attivo.leggiEventi().then((d) => propaga('eventi', d)).catch(() => propaga('eventi', []))
  attivo.leggiMisurazioni().then((d) => propaga('misurazioni', d)).catch(() => propaga('misurazioni', []))
  attivo.leggiPreferenze().then((d) => propaga('preferenze', d)).catch(() => propaga('preferenze', {}))
}

/** Descrive dove stanno i dati adesso: lo mostriamo nell'app. */
export function infoArchivio() {
  return attivo.info
}

/** Dice se in questo momento i dati vanno online. */
export function inLinea() {
  return attivo === archivioRemoto
}

/* ==================================================================
   Eventi del piano settimanale
   ================================================================== */

export async function leggiEventi() {
  return attivo.leggiEventi()
}

export async function creaEvento(dati) {
  return attivo.creaEvento(dati)
}

export async function aggiornaEvento(id, modifiche) {
  return attivo.aggiornaEvento(id, modifiche)
}

export async function eliminaEvento(id) {
  return attivo.eliminaEvento(id)
}

/** Sostituisce l'intero piano (piano di esempio, ripristino da copia). */
export async function sostituisciTutto(eventi) {
  return attivo.sostituisciEventi(eventi)
}

export function iscriviti(callback) {
  ascoltatori.eventi.add(callback)
  return () => ascoltatori.eventi.delete(callback)
}

/* ==================================================================
   Pesate
   ================================================================== */

export async function leggiMisurazioni() {
  return attivo.leggiMisurazioni()
}

export async function salvaMisurazione(dati) {
  return attivo.salvaMisurazione(dati)
}

export async function eliminaMisurazione(id) {
  return attivo.eliminaMisurazione(id)
}

export async function sostituisciMisurazioni(misurazioni) {
  return attivo.sostituisciMisurazioni(misurazioni)
}

export function iscrivitiMisurazioni(callback) {
  ascoltatori.misurazioni.add(callback)
  return () => ascoltatori.misurazioni.delete(callback)
}

/* ==================================================================
   Preferenze
   ================================================================== */

export async function leggiPreferenze() {
  return attivo.leggiPreferenze()
}

export async function salvaPreferenza(chiave, valore) {
  return attivo.salvaPreferenza(chiave, valore)
}

export function iscrivitiPreferenze(callback) {
  ascoltatori.preferenze.add(callback)
  return () => ascoltatori.preferenze.delete(callback)
}

/* ==================================================================
   Trasferimento dei dati dal telefono all'archivio online
   ------------------------------------------------------------------
   Al primo accesso puo' esserci gia' un piano inserito sul telefono.
   Invece di farlo riscrivere, lo si carica online.
   ================================================================== */

/** Dice se sul telefono c'e' qualcosa da trasferire. */
export async function ciSonoDatiLocali() {
  return archivioLocale.haDati()
}

/**
 * Copia online il piano e le pesate salvati sul telefono.
 *
 * @param {boolean} svuotaDopo se togliere i dati dal telefono a
 *        trasferimento riuscito. Chiamarla con false lascia una copia
 *        locale come rete di sicurezza.
 * @returns {Promise<{eventi:number, misurazioni:number}>} quanto e' stato trasferito
 */
export async function trasferisciOnline(svuotaDopo = true) {
  if (!inLinea()) throw new Error('Devi prima effettuare l\'accesso.')

  const [eventi, misurazioni] = await Promise.all([
    archivioLocale.leggiEventi(),
    archivioLocale.leggiMisurazioni(),
  ])

  // I dati online hanno la precedenza: se online c'e' gia' qualcosa,
  // aggiungere ciecamente il contenuto del telefono creerebbe doppioni.
  const [eventiOnline, misurazioniOnline] = await Promise.all([
    archivioRemoto.leggiEventi(),
    archivioRemoto.leggiMisurazioni(),
  ])

  if (eventiOnline.length === 0 && eventi.length > 0) {
    await archivioRemoto.sostituisciEventi(eventi)
  }
  if (misurazioniOnline.length === 0 && misurazioni.length > 0) {
    await archivioRemoto.sostituisciMisurazioni(misurazioni)
  }

  // Trasferiamo anche l'obiettivo di peso, se era stato scelto
  const preferenzeLocali = await archivioLocale.leggiPreferenze()
  if (preferenzeLocali.obiettivoPeso && preferenzeLocali.obiettivoPeso !== 'nessuno') {
    await archivioRemoto.salvaPreferenza('obiettivoPeso', preferenzeLocali.obiettivoPeso)
  }

  if (svuotaDopo) await archivioLocale.svuota()

  return { eventi: eventi.length, misurazioni: misurazioni.length }
}
