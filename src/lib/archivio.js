/*
  archivio.js
  ---------------------------------------------------------------
  QUESTO E' L'UNICO FILE CHE PARLA CON LA MEMORIA DEI DATI.

  Il resto dell'app chiede "dammi gli eventi" / "salva questo evento"
  e non sa - ne' deve sapere - dove finiscono davvero.

  Oggi (FASE 2) i dati stanno nella memoria del telefono
  ("localStorage": uno spazio che il browser riserva a ogni sito).
  In FASE 3 riscriveremo SOLO le funzioni qui sotto per farle parlare
  con il database online. Le schermate non andranno toccate.

  Tutte le funzioni sono "async" (cioe' restituiscono una promessa)
  anche se ora sarebbero istantanee: e' fatto apposta, perche' quando
  ci sara' il database di mezzo servira' aspettare la rete, e cosi'
  non dovremo cambiare il codice delle schermate.
*/

import { nuovoId, ordinaPerOrario } from './modello.js'

// Nome della "cassetta" dove il browser tiene i nostri dati.
// Il ".v1" serve se un domani cambiamo la forma dei dati: potremo
// passare a ".v2" senza far confusione con i dati vecchi.
const CHIAVE_MEMORIA = 'aegis.eventi.v1'

// Descrizione di dove stanno i dati adesso: la mostriamo nell'app
// cosi' e' sempre chiaro se siamo in locale o collegati al database.
export const INFO_ARCHIVIO = {
  tipo: 'locale',
  etichetta: 'Solo su questo dispositivo',
  spiegazione:
    'I dati sono salvati nella memoria di questo telefono. Diventeranno permanenti e sincronizzati nella Fase 3.',
}

// Copia degli eventi tenuta in memoria mentre l'app e' aperta,
// per non rileggere il disco a ogni schermata.
let cache = null

// Elenco delle funzioni da richiamare quando i dati cambiano,
// cosi' le schermate aperte si aggiornano da sole.
const ascoltatori = new Set()

/* ------------------------------------------------------------------ */
/*  Lettura e scrittura grezza sulla memoria del browser              */
/* ------------------------------------------------------------------ */

function leggiDallaMemoria() {
  try {
    const testo = localStorage.getItem(CHIAVE_MEMORIA)
    if (!testo) return []

    const dati = JSON.parse(testo)
    // Controllo di sicurezza: se il contenuto non e' una lista,
    // lo consideriamo corrotto e ripartiamo da vuoto.
    return Array.isArray(dati) ? dati : []
  } catch (errore) {
    // Puo' succedere in navigazione privata o se i dati sono corrotti.
    console.warn('[archivio] lettura fallita, riparto da vuoto:', errore)
    return []
  }
}

function scriviNellaMemoria(eventi) {
  try {
    localStorage.setItem(CHIAVE_MEMORIA, JSON.stringify(eventi))
    return true
  } catch (errore) {
    console.error('[archivio] salvataggio fallito:', errore)
    return false
  }
}

/** Avvisa tutte le schermate aperte che i dati sono cambiati. */
function avvisaAscoltatori() {
  for (const ascoltatore of ascoltatori) {
    try {
      ascoltatore(cache)
    } catch (errore) {
      console.error('[archivio] un ascoltatore ha dato errore:', errore)
    }
  }
}

/** Salva la cache sul disco e avvisa le schermate. */
function salvaEAvvisa() {
  const salvato = scriviNellaMemoria(cache)
  avvisaAscoltatori()
  if (!salvato) {
    throw new Error(
      'Non sono riuscito a salvare. Se stai usando una finestra in incognito, prova in una normale.'
    )
  }
}

/* ------------------------------------------------------------------ */
/*  Le funzioni usate dalle schermate                                 */
/* ------------------------------------------------------------------ */

/**
 * Restituisce TUTTI gli eventi del piano settimanale, di tutti i giorni.
 * @returns {Promise<Array>}
 */
export async function leggiEventi() {
  if (cache === null) cache = leggiDallaMemoria()
  return cache
}

/**
 * Restituisce gli eventi di un singolo giorno, gia' ordinati per orario.
 * @param {number} giorno 0 = lunedi' ... 6 = domenica
 * @returns {Promise<Array>}
 */
export async function leggiEventiDelGiorno(giorno) {
  const eventi = await leggiEventi()
  return ordinaPerOrario(eventi.filter((e) => e.giorno === giorno))
}

/**
 * Aggiunge un nuovo evento al piano.
 * @param {{giorno:number, tipo:string, titolo:string, orario:string}} dati
 * @returns {Promise<object>} l'evento creato, con il suo id
 */
export async function creaEvento(dati) {
  await leggiEventi() // assicura che la cache sia caricata

  const evento = {
    id: nuovoId(),
    giorno: dati.giorno,
    tipo: dati.tipo,
    titolo: dati.titolo.trim(),
    orario: dati.orario,
  }

  cache = [...cache, evento]
  salvaEAvvisa()
  return evento
}

/**
 * Modifica un evento esistente.
 * @param {string} id l'identificativo dell'evento
 * @param {object} modifiche solo i campi da cambiare
 * @returns {Promise<object>} l'evento aggiornato
 */
export async function aggiornaEvento(id, modifiche) {
  await leggiEventi()

  let aggiornato = null
  cache = cache.map((evento) => {
    if (evento.id !== id) return evento
    aggiornato = { ...evento, ...modifiche }
    if (typeof aggiornato.titolo === 'string') {
      aggiornato.titolo = aggiornato.titolo.trim()
    }
    return aggiornato
  })

  if (!aggiornato) throw new Error('Evento non trovato: ' + id)

  salvaEAvvisa()
  return aggiornato
}

/**
 * Elimina un evento dal piano.
 * @param {string} id
 */
export async function eliminaEvento(id) {
  await leggiEventi()
  cache = cache.filter((evento) => evento.id !== id)
  salvaEAvvisa()
}

/**
 * Sostituisce l'intero piano. Serve per caricare il piano di esempio
 * o per svuotare tutto.
 * @param {Array} eventi
 */
export async function sostituisciTutto(eventi) {
  cache = [...eventi]
  salvaEAvvisa()
  return cache
}

/**
 * Permette a una schermata di essere avvisata quando i dati cambiano.
 *
 * @param {(eventi:Array) => void} callback funzione da richiamare
 * @returns {() => void} funzione da chiamare per smettere di ascoltare
 */
export function iscriviti(callback) {
  ascoltatori.add(callback)
  return () => ascoltatori.delete(callback)
}
