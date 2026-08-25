/*
  archivioLocale.js
  ---------------------------------------------------------------
  Salvataggio nella memoria del telefono ("localStorage").

  E' la modalita' usata quando non hai fatto l'accesso, o quando
  l'archivio online non e' ancora configurato. I dati restano su
  questo dispositivo e non escono da qui.

  Espone le stesse identiche funzioni di archivioRemoto.js: e' cio'
  che permette ad archivio.js di scambiare l'uno con l'altro senza
  che le schermate cambino di una riga.
*/

import { nuovoId, nuovoIdMisurazione } from './modello.js'

/* ------------------------------------------------------------------
   Il meccanismo comune ai tre elenchi salvati
   ------------------------------------------------------------------ */
function creaContenitore(chiaveMemoria, valoreIniziale) {
  // "null" significa "non ancora letto dal disco"
  let cache = null
  const ascoltatori = new Set()

  function leggiDalDisco() {
    try {
      const testo = localStorage.getItem(chiaveMemoria)
      if (!testo) return structuredClone(valoreIniziale)

      const dati = JSON.parse(testo)
      // Se il contenuto non ha la forma attesa lo consideriamo corrotto
      if (Array.isArray(dati) !== Array.isArray(valoreIniziale)) {
        return structuredClone(valoreIniziale)
      }
      return dati
    } catch (errore) {
      console.warn(`[archivio locale] lettura di ${chiaveMemoria} fallita:`, errore)
      return structuredClone(valoreIniziale)
    }
  }

  return {
    async leggi() {
      if (cache === null) cache = leggiDalDisco()
      return cache
    },

    async scrivi(nuovoContenuto) {
      cache = nuovoContenuto
      let salvato = true
      try {
        localStorage.setItem(chiaveMemoria, JSON.stringify(cache))
      } catch (errore) {
        console.error('[archivio locale] salvataggio fallito:', errore)
        salvato = false
      }

      // Avvisiamo comunque, cosi' la schermata mostra il dato aggiornato
      // anche se il salvataggio permanente non e' riuscito.
      for (const ascoltatore of ascoltatori) {
        try {
          ascoltatore(cache)
        } catch (e) {
          console.error('[archivio locale] ascoltatore in errore:', e)
        }
      }

      if (!salvato) {
        throw new Error(
          'Non sono riuscito a salvare. Se stai usando una finestra in incognito, prova in una normale.'
        )
      }
      return cache
    },

    iscriviti(callback) {
      ascoltatori.add(callback)
      return () => ascoltatori.delete(callback)
    },

    /** Svuota la cache in memoria: la prossima lettura ripartira' dal disco. */
    dimentica() {
      cache = null
    },
  }
}

// Il ".v1" nel nome serve se un domani cambiamo la forma dei dati.
const contenitoreEventi = creaContenitore('aegis.eventi.v1', [])
const contenitoreMisurazioni = creaContenitore('aegis.misurazioni.v1', [])
const contenitorePreferenze = creaContenitore('aegis.preferenze.v1', {})

/* ------------------------------------------------------------------
   Le funzioni usate dall'app
   ------------------------------------------------------------------ */

export const archivioLocale = {
  info: {
    tipo: 'locale',
    etichetta: 'Solo su questo dispositivo',
    spiegazione:
      'I dati sono salvati nella memoria di questo telefono. Accedi per conservarli online e ritrovarli su qualsiasi dispositivo.',
  },

  /* --- Eventi del piano --- */
  async leggiEventi() {
    return contenitoreEventi.leggi()
  },

  async creaEvento(dati) {
    const eventi = await contenitoreEventi.leggi()
    const evento = {
      id: nuovoId(),
      giorno: dati.giorno,
      tipo: dati.tipo,
      titolo: dati.titolo.trim(),
      orario: dati.orario,
    }
    await contenitoreEventi.scrivi([...eventi, evento])
    return evento
  },

  async aggiornaEvento(id, modifiche) {
    const eventi = await contenitoreEventi.leggi()

    let aggiornato = null
    const nuovi = eventi.map((evento) => {
      if (evento.id !== id) return evento
      aggiornato = { ...evento, ...modifiche }
      if (typeof aggiornato.titolo === 'string') {
        aggiornato.titolo = aggiornato.titolo.trim()
      }
      return aggiornato
    })

    if (!aggiornato) throw new Error('Evento non trovato: ' + id)
    await contenitoreEventi.scrivi(nuovi)
    return aggiornato
  },

  async eliminaEvento(id) {
    const eventi = await contenitoreEventi.leggi()
    await contenitoreEventi.scrivi(eventi.filter((e) => e.id !== id))
  },

  async sostituisciEventi(eventi) {
    return contenitoreEventi.scrivi([...eventi])
  },

  iscrivitiEventi(callback) {
    return contenitoreEventi.iscriviti(callback)
  },

  /* --- Pesate --- */
  async leggiMisurazioni() {
    const misurazioni = await contenitoreMisurazioni.leggi()
    // Sempre dalla piu' vecchia alla piu' recente: il grafico
    // e i confronti lo danno per scontato.
    return [...misurazioni].sort((a, b) => a.data.localeCompare(b.data))
  },

  async salvaMisurazione({ data, peso }) {
    const misurazioni = await contenitoreMisurazioni.leggi()

    // La bilancia di casa non e' piu' precisa di un etto: decimali
    // in piu' sporcherebbero il grafico senza aggiungere nulla.
    const pesoArrotondato = Math.round(Number(peso) * 10) / 10

    const esistente = misurazioni.find((m) => m.data === data)

    let salvata
    let elenco
    if (esistente) {
      // Una sola pesata al giorno: la seconda sostituisce la prima
      salvata = { ...esistente, peso: pesoArrotondato }
      elenco = misurazioni.map((m) => (m.data === data ? salvata : m))
    } else {
      salvata = { id: nuovoIdMisurazione(), data, peso: pesoArrotondato }
      elenco = [...misurazioni, salvata]
    }

    await contenitoreMisurazioni.scrivi(elenco)
    return salvata
  },

  async eliminaMisurazione(id) {
    const misurazioni = await contenitoreMisurazioni.leggi()
    await contenitoreMisurazioni.scrivi(misurazioni.filter((m) => m.id !== id))
  },

  async sostituisciMisurazioni(misurazioni) {
    return contenitoreMisurazioni.scrivi([...misurazioni])
  },

  iscrivitiMisurazioni(callback) {
    return contenitoreMisurazioni.iscriviti(callback)
  },

  /* --- Preferenze --- */
  async leggiPreferenze() {
    return contenitorePreferenze.leggi()
  },

  async salvaPreferenza(chiave, valore) {
    const preferenze = await contenitorePreferenze.leggi()
    return contenitorePreferenze.scrivi({ ...preferenze, [chiave]: valore })
  },

  iscrivitiPreferenze(callback) {
    return contenitorePreferenze.iscriviti(callback)
  },

  /** Dice se c'e' qualcosa salvato qui: serve a proporre il trasferimento online. */
  async haDati() {
    const [eventi, misurazioni] = await Promise.all([
      contenitoreEventi.leggi(),
      contenitoreMisurazioni.leggi(),
    ])
    return eventi.length > 0 || misurazioni.length > 0
  },

  /** Svuota tutto, dopo aver trasferito i dati online. */
  async svuota() {
    await contenitoreEventi.scrivi([])
    await contenitoreMisurazioni.scrivi([])
  },
}
