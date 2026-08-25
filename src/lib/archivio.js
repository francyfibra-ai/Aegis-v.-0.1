/*
  archivio.js
  ---------------------------------------------------------------
  QUESTO E' L'UNICO FILE CHE PARLA CON LA MEMORIA DEI DATI.

  Il resto dell'app chiede "dammi gli eventi" / "salva questa pesata"
  e non sa - ne' deve sapere - dove finiscano davvero.

  Oggi (FASE 2) i dati stanno nella memoria del telefono
  ("localStorage": uno spazio che il browser riserva a ogni sito).
  In FASE 3 riscriveremo SOLO le funzioni qui sotto per farle parlare
  con il database online. Le schermate non andranno toccate.

  Tutte le funzioni sono "async" (cioe' restituiscono una promessa)
  anche se ora sarebbero istantanee: e' fatto apposta, perche' quando
  ci sara' il database di mezzo servira' aspettare la rete, e cosi'
  non dovremo cambiare il codice delle schermate.

  Dentro ci sono TRE archivi separati:
    1. eventi        - il piano settimanale (cosa fare e quando)
    2. misurazioni   - le pesate registrate (quanto pesavi e quando)
    3. preferenze    - le impostazioni (per ora solo l'obiettivo di peso)
*/

import { nuovoId, nuovoIdMisurazione, ordinaPerOrario } from './modello.js'

// Descrizione di dove stanno i dati adesso: la mostriamo nell'app
// cosi' e' sempre chiaro se siamo in locale o collegati al database.
export const INFO_ARCHIVIO = {
  tipo: 'locale',
  etichetta: 'Solo su questo dispositivo',
  spiegazione:
    'I dati sono salvati nella memoria di questo telefono. Diventeranno permanenti e sincronizzati nella Fase 3.',
}

/* ==================================================================
   Il meccanismo comune a tutti gli archivi
   ------------------------------------------------------------------
   I tre archivi funzionano allo stesso identico modo: leggere, scrivere,
   avvisare le schermate. Invece di scrivere tre volte lo stesso codice,
   lo scriviamo una volta sola qui dentro.
   ================================================================== */

function creaArchivio(chiaveMemoria, valoreIniziale) {
  // Copia tenuta in memoria mentre l'app e' aperta, per non rileggere
  // il disco a ogni schermata. "null" significa "non ancora letto".
  let cache = null

  // Le funzioni da richiamare quando i dati cambiano, cosi' le schermate
  // aperte si aggiornano da sole.
  const ascoltatori = new Set()

  function leggiDalDisco() {
    try {
      const testo = localStorage.getItem(chiaveMemoria)
      if (!testo) return structuredClone(valoreIniziale)

      const dati = JSON.parse(testo)
      // Controllo di sicurezza: se il contenuto non ha la forma attesa,
      // lo consideriamo corrotto e ripartiamo dal valore iniziale.
      const formaAttesa = Array.isArray(valoreIniziale)
      if (Array.isArray(dati) !== formaAttesa) return structuredClone(valoreIniziale)
      return dati
    } catch (errore) {
      // Puo' succedere in navigazione privata o se i dati sono corrotti.
      console.warn(`[archivio] lettura di ${chiaveMemoria} fallita:`, errore)
      return structuredClone(valoreIniziale)
    }
  }

  function avvisaAscoltatori() {
    for (const ascoltatore of ascoltatori) {
      try {
        ascoltatore(cache)
      } catch (errore) {
        console.error('[archivio] un ascoltatore ha dato errore:', errore)
      }
    }
  }

  return {
    /** Restituisce il contenuto dell'archivio, leggendolo la prima volta. */
    async leggi() {
      if (cache === null) cache = leggiDalDisco()
      return cache
    },

    /** Sostituisce il contenuto, salva su disco e avvisa le schermate. */
    async scrivi(nuovoContenuto) {
      cache = nuovoContenuto
      let salvato = true
      try {
        localStorage.setItem(chiaveMemoria, JSON.stringify(cache))
      } catch (errore) {
        console.error('[archivio] salvataggio fallito:', errore)
        salvato = false
      }

      // Avvisiamo comunque: cosi' la schermata mostra il dato aggiornato
      // anche se il salvataggio permanente non e' riuscito.
      avvisaAscoltatori()

      if (!salvato) {
        throw new Error(
          'Non sono riuscito a salvare. Se stai usando una finestra in incognito, prova in una normale.'
        )
      }
      return cache
    },

    /**
     * Permette a una schermata di essere avvisata quando i dati cambiano.
     * @returns {() => void} funzione da chiamare per smettere di ascoltare
     */
    iscriviti(callback) {
      ascoltatori.add(callback)
      return () => ascoltatori.delete(callback)
    },
  }
}

// I tre archivi. Il ".v1" nel nome serve se un domani cambiamo la forma
// dei dati: potremo passare a ".v2" senza fare confusione con i vecchi.
const archivioEventi = creaArchivio('aegis.eventi.v1', [])
const archivioMisurazioni = creaArchivio('aegis.misurazioni.v1', [])
const archivioPreferenze = creaArchivio('aegis.preferenze.v1', {})

/* ==================================================================
   1. EVENTI - il piano settimanale
   ================================================================== */

/** Tutti gli eventi del piano, di tutti i giorni. */
export async function leggiEventi() {
  return archivioEventi.leggi()
}

/** Gli eventi di un solo giorno, gia' ordinati per orario. */
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
  const eventi = await leggiEventi()

  const evento = {
    id: nuovoId(),
    giorno: dati.giorno,
    tipo: dati.tipo,
    titolo: dati.titolo.trim(),
    orario: dati.orario,
  }

  await archivioEventi.scrivi([...eventi, evento])
  return evento
}

/** Modifica un evento esistente. */
export async function aggiornaEvento(id, modifiche) {
  const eventi = await leggiEventi()

  let aggiornato = null
  const nuoviEventi = eventi.map((evento) => {
    if (evento.id !== id) return evento
    aggiornato = { ...evento, ...modifiche }
    if (typeof aggiornato.titolo === 'string') {
      aggiornato.titolo = aggiornato.titolo.trim()
    }
    return aggiornato
  })

  if (!aggiornato) throw new Error('Evento non trovato: ' + id)

  await archivioEventi.scrivi(nuoviEventi)
  return aggiornato
}

/** Elimina un evento dal piano. */
export async function eliminaEvento(id) {
  const eventi = await leggiEventi()
  await archivioEventi.scrivi(eventi.filter((evento) => evento.id !== id))
}

/** Sostituisce l'intero piano (piano di esempio, ripristino da copia). */
export async function sostituisciTutto(eventi) {
  return archivioEventi.scrivi([...eventi])
}

export function iscriviti(callback) {
  return archivioEventi.iscriviti(callback)
}

/* ==================================================================
   2. MISURAZIONI - le pesate
   ================================================================== */

/**
 * Tutte le pesate, ordinate dalla piu' vecchia alla piu' recente.
 * L'ordine e' importante: il grafico e i confronti lo danno per scontato.
 */
export async function leggiMisurazioni() {
  const misurazioni = await archivioMisurazioni.leggi()
  return [...misurazioni].sort((a, b) => a.data.localeCompare(b.data))
}

/**
 * Registra una pesata.
 *
 * Se esiste gia' una pesata per quella data, la SOSTITUISCE invece di
 * aggiungerne una seconda: una sola misura al giorno tiene il grafico
 * pulito ed e' quasi sempre quello che si intende ("mi sono ripesato,
 * il primo numero non contava").
 *
 * @param {{data:string, peso:number}} dati
 */
export async function salvaMisurazione({ data, peso }) {
  const misurazioni = await archivioMisurazioni.leggi()

  // Arrotondiamo a un decimale: la bilancia di casa non e' piu' precisa
  // di cosi', e i decimali inventati sporcherebbero il grafico.
  const pesoArrotondato = Math.round(Number(peso) * 10) / 10

  const esistente = misurazioni.find((m) => m.data === data)

  let nuovoElenco
  let salvata
  if (esistente) {
    salvata = { ...esistente, peso: pesoArrotondato }
    nuovoElenco = misurazioni.map((m) => (m.data === data ? salvata : m))
  } else {
    salvata = { id: nuovoIdMisurazione(), data, peso: pesoArrotondato }
    nuovoElenco = [...misurazioni, salvata]
  }

  await archivioMisurazioni.scrivi(nuovoElenco)
  return salvata
}

/** Elimina una pesata. */
export async function eliminaMisurazione(id) {
  const misurazioni = await archivioMisurazioni.leggi()
  await archivioMisurazioni.scrivi(misurazioni.filter((m) => m.id !== id))
}

/** Sostituisce tutte le pesate (ripristino da copia di sicurezza). */
export async function sostituisciMisurazioni(misurazioni) {
  return archivioMisurazioni.scrivi([...misurazioni])
}

export function iscrivitiMisurazioni(callback) {
  return archivioMisurazioni.iscriviti(callback)
}

/* ==================================================================
   3. PREFERENZE - le impostazioni
   ================================================================== */

export async function leggiPreferenze() {
  return archivioPreferenze.leggi()
}

/** Imposta una preferenza, lasciando le altre come stanno. */
export async function salvaPreferenza(chiave, valore) {
  const preferenze = await archivioPreferenze.leggi()
  return archivioPreferenze.scrivi({ ...preferenze, [chiave]: valore })
}

export function iscrivitiPreferenze(callback) {
  return archivioPreferenze.iscriviti(callback)
}
