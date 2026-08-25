/*
  archivioRemoto.js
  ---------------------------------------------------------------
  Salvataggio nell'archivio online (Supabase).

  Espone esattamente le stesse funzioni di archivioLocale.js: e' cio'
  che permette di scambiare l'uno con l'altro senza toccare le schermate.

  DUE COSE DA SAPERE LEGGENDO QUESTO FILE

  1. Non si vede mai un controllo del tipo "questa riga e' mia?".
     Non serve: le regole scritte nel database (supabase/schema.sql)
     fanno sparire le righe altrui gia' in partenza. Se qualcuno
     manomettesse questo file per chiedere i dati di un altro,
     riceverebbe comunque un elenco vuoto.

  2. Dopo ogni scrittura rileggiamo e avvisiamo le schermate.
     E' un giro in piu' rispetto ad aggiornare la copia in memoria,
     ma garantisce che cio' che vedi sia cio' che c'e' davvero
     nell'archivio, non cio' che pensavamo di averci scritto.
*/

import { supabase } from './supabase.js'

// Le funzioni da richiamare quando i dati cambiano
const ascoltatori = { eventi: new Set(), misurazioni: new Set(), preferenze: new Set() }

function avvisa(quale, dati) {
  for (const ascoltatore of ascoltatori[quale]) {
    try {
      ascoltatore(dati)
    } catch (e) {
      console.error('[archivio remoto] ascoltatore in errore:', e)
    }
  }
}

/** L'identificativo di chi e' collegato. Serve a intestargli le righe. */
async function utenteCollegato() {
  const { data } = await supabase.auth.getSession()
  const utente = data.session?.user
  if (!utente) throw new Error('Devi effettuare l\'accesso.')
  return utente.id
}

/*
  Supabase riporta gli errori in inglese e con termini tecnici.
  Qui li trasformiamo in qualcosa di comprensibile, distinguendo il
  caso piu' frequente: la connessione assente.
*/
function segnala(errore, cosa) {
  if (!errore) return
  console.error(`[archivio remoto] ${cosa}:`, errore)

  if (errore.message?.includes('Failed to fetch') || errore.message?.includes('NetworkError')) {
    throw new Error('Nessuna connessione. Riprova quando torni online.')
  }
  throw new Error(`Non sono riuscito a ${cosa}. (${errore.message})`)
}

/* ------------------------------------------------------------------
   Conversioni tra la forma del database e quella dell'app
   ------------------------------------------------------------------
   Nel database i nomi delle colonne sono in minuscolo con l'underscore
   ("obiettivo_peso"), nell'app si scrivono attaccati ("obiettivoPeso").
   Tenere la conversione in un punto solo evita di doverla ricordare.
*/

function eventoDaRiga(riga) {
  return {
    id: riga.id,
    giorno: riga.giorno,
    tipo: riga.tipo,
    titolo: riga.titolo,
    orario: riga.orario,
  }
}

function misurazioneDaRiga(riga) {
  return {
    id: riga.id,
    data: riga.data,
    // Il database restituisce i numeri con la virgola come testo:
    // li riportiamo a numeri, altrimenti i conti del grafico sbagliano.
    peso: Number(riga.peso),
  }
}

/* ------------------------------------------------------------------ */

export const archivioRemoto = {
  info: {
    tipo: 'remoto',
    etichetta: 'Salvato online',
    spiegazione:
      'I dati sono nel tuo archivio online, protetto dal tuo accesso. Li ritrovi su qualsiasi dispositivo.',
  },

  /* --- Eventi del piano --- */
  async leggiEventi() {
    const { data, error } = await supabase
      .from('eventi')
      .select('id, giorno, tipo, titolo, orario')
      .order('giorno')
      .order('orario')

    segnala(error, 'leggere il piano')
    return (data || []).map(eventoDaRiga)
  },

  async creaEvento(dati) {
    const utente = await utenteCollegato()

    const { data, error } = await supabase
      .from('eventi')
      .insert({
        utente,
        giorno: dati.giorno,
        tipo: dati.tipo,
        titolo: dati.titolo.trim(),
        orario: dati.orario,
      })
      .select()
      .single()

    segnala(error, 'aggiungere l\'evento')
    await this.notificaEventi()
    return eventoDaRiga(data)
  },

  async aggiornaEvento(id, modifiche) {
    // Prepariamo solo i campi effettivamente modificati
    const cambi = {}
    if (modifiche.giorno !== undefined) cambi.giorno = modifiche.giorno
    if (modifiche.tipo !== undefined) cambi.tipo = modifiche.tipo
    if (modifiche.titolo !== undefined) cambi.titolo = modifiche.titolo.trim()
    if (modifiche.orario !== undefined) cambi.orario = modifiche.orario

    const { data, error } = await supabase
      .from('eventi')
      .update(cambi)
      .eq('id', id)
      .select()
      .single()

    segnala(error, 'modificare l\'evento')
    await this.notificaEventi()
    return eventoDaRiga(data)
  },

  async eliminaEvento(id) {
    const { error } = await supabase.from('eventi').delete().eq('id', id)
    segnala(error, 'eliminare l\'evento')
    await this.notificaEventi()
  },

  async sostituisciEventi(eventi) {
    const utente = await utenteCollegato()

    // Prima si svuota, poi si riscrive: e' l'operazione richiesta dal
    // ripristino da copia di sicurezza e dal piano di esempio.
    const { error: erroreSvuota } = await supabase.from('eventi').delete().eq('utente', utente)
    segnala(erroreSvuota, 'svuotare il piano')

    if (eventi.length > 0) {
      const righe = eventi.map((e) => ({
        utente,
        giorno: e.giorno,
        tipo: e.tipo,
        titolo: e.titolo,
        orario: e.orario,
      }))
      const { error } = await supabase.from('eventi').insert(righe)
      segnala(error, 'salvare il piano')
    }

    return this.notificaEventi()
  },

  iscrivitiEventi(callback) {
    ascoltatori.eventi.add(callback)
    return () => ascoltatori.eventi.delete(callback)
  },

  async notificaEventi() {
    const eventi = await this.leggiEventi()
    avvisa('eventi', eventi)
    return eventi
  },

  /* --- Pesate --- */
  async leggiMisurazioni() {
    const { data, error } = await supabase
      .from('misurazioni')
      .select('id, data, peso')
      .order('data') // dalla piu' vecchia alla piu' recente

    segnala(error, 'leggere le pesate')
    return (data || []).map(misurazioneDaRiga)
  },

  async salvaMisurazione({ data: giorno, peso }) {
    const utente = await utenteCollegato()
    const pesoArrotondato = Math.round(Number(peso) * 10) / 10

    // "upsert" con onConflict: se esiste gia' una pesata per quel giorno
    // la sostituisce invece di dare errore. E' la stessa regola dell'app,
    // qui garantita dal database.
    const { data, error } = await supabase
      .from('misurazioni')
      .upsert(
        { utente, data: giorno, peso: pesoArrotondato },
        { onConflict: 'utente,data' }
      )
      .select()
      .single()

    segnala(error, 'salvare la pesata')
    await this.notificaMisurazioni()
    return misurazioneDaRiga(data)
  },

  async eliminaMisurazione(id) {
    const { error } = await supabase.from('misurazioni').delete().eq('id', id)
    segnala(error, 'eliminare la pesata')
    await this.notificaMisurazioni()
  },

  async sostituisciMisurazioni(misurazioni) {
    const utente = await utenteCollegato()

    const { error: erroreSvuota } = await supabase
      .from('misurazioni')
      .delete()
      .eq('utente', utente)
    segnala(erroreSvuota, 'svuotare le pesate')

    if (misurazioni.length > 0) {
      const righe = misurazioni.map((m) => ({
        utente,
        data: m.data,
        peso: Math.round(Number(m.peso) * 10) / 10,
      }))
      const { error } = await supabase.from('misurazioni').insert(righe)
      segnala(error, 'salvare le pesate')
    }

    return this.notificaMisurazioni()
  },

  iscrivitiMisurazioni(callback) {
    ascoltatori.misurazioni.add(callback)
    return () => ascoltatori.misurazioni.delete(callback)
  },

  async notificaMisurazioni() {
    const misurazioni = await this.leggiMisurazioni()
    avvisa('misurazioni', misurazioni)
    return misurazioni
  },

  /* --- Preferenze (la riga del profilo) --- */
  async leggiPreferenze() {
    const { data, error } = await supabase
      .from('profili')
      .select('nome, obiettivo_peso, fuso_orario')
      .maybeSingle() // il profilo e' uno solo, e potrebbe non esserci ancora

    segnala(error, 'leggere le impostazioni')
    if (!data) return {}

    return {
      nome: data.nome,
      obiettivoPeso: data.obiettivo_peso,
      fusoOrario: data.fuso_orario,
    }
  },

  async salvaPreferenza(chiave, valore) {
    const utente = await utenteCollegato()

    // Traduzione dai nomi dell'app a quelli delle colonne
    const colonne = { obiettivoPeso: 'obiettivo_peso', nome: 'nome', fusoOrario: 'fuso_orario' }
    const colonna = colonne[chiave]
    if (!colonna) throw new Error('Impostazione sconosciuta: ' + chiave)

    const { error } = await supabase
      .from('profili')
      .upsert({ utente, [colonna]: valore, aggiornato_il: new Date().toISOString() })

    segnala(error, 'salvare le impostazioni')

    const preferenze = await this.leggiPreferenze()
    avvisa('preferenze', preferenze)
    return preferenze
  },

  iscrivitiPreferenze(callback) {
    ascoltatori.preferenze.add(callback)
    return () => ascoltatori.preferenze.delete(callback)
  },
}
