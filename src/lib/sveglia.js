/*
  sveglia.js
  ---------------------------------------------------------------
  "La sveglia sta girando?"

  Se la sveglia si ferma, i promemoria smettono di arrivare e nessuno
  se ne accorge: semplicemente, non suona niente. Qui chiediamo al
  database quando ha funzionato l'ultima volta (funzione
  stato_sveglia, in supabase/stato-sveglia.sql) e traduciamo la
  risposta in qualcosa da mostrare.

  La sveglia gira ogni minuto: oltre MINUTI_DI_TOLLERANZA senza una
  risposta buona, la consideriamo ferma. Il margine evita falsi
  allarmi per un singolo giro andato storto.
*/
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const MINUTI_DI_TOLLERANZA = 5

// Ogni quanto ricontrollare mentre l'app resta aperta
const OGNI_QUANTO_MS = 2 * 60 * 1000

/**
 * Chiede lo stato al database e lo interpreta.
 *
 * @returns {Promise<{
 *   stato: 'ok' | 'ferma' | 'sconosciuto',
 *   minutiDaUltimoOk?: number | null,
 *   motivo?: string
 * }>}
 *   'sconosciuto' quando non si riesce a chiedere (niente rete, niente
 *   accesso, funzione non ancora installata): in quel caso non diamo
 *   l'allarme, perche' non sappiamo se c'e' un problema.
 */
export async function statoSveglia() {
  if (!supabase) return { stato: 'sconosciuto' }

  const { data, error } = await supabase.rpc('stato_sveglia')
  if (error || !data || data.length === 0) return { stato: 'sconosciuto' }

  const { adesso, ultimo_ok, ultima_risposta, ultimo_codice } = data[0]
  const ora = new Date(adesso)
  const minutiDa = (istante) => (istante ? Math.floor((ora - new Date(istante)) / 60000) : null)

  const minutiDaUltimoOk = minutiDa(ultimo_ok)
  if (minutiDaUltimoOk !== null && minutiDaUltimoOk <= MINUTI_DI_TOLLERANZA) {
    return { stato: 'ok', minutiDaUltimoOk }
  }

  return {
    stato: 'ferma',
    minutiDaUltimoOk,
    motivo: spiegaMotivo(minutiDa(ultima_risposta), ultimo_codice),
  }
}

/** Dal codice dell'ultima risposta, una spiegazione e cosa fare. */
function spiegaMotivo(minutiDaUltimaRisposta, codice) {
  // Nessuna risposta recente di nessun tipo: la sveglia non parte proprio
  if (minutiDaUltimaRisposta === null || minutiDaUltimaRisposta > MINUTI_DI_TOLLERANZA) {
    return 'La sveglia non sta girando: controlla in Supabase che la programmazione "aegis-promemoria" sia attiva (supabase/cron.sql).'
  }
  if (codice === 401) {
    return 'Il segreto della sveglia non corrisponde a AEGIS_SEGRETO: vanno rimessi uguali (docs/04-notifiche.md).'
  }
  if (codice === 404) {
    return 'La sveglia chiama una funzione che non esiste: controlla che in Supabase ci sia "promemoria".'
  }
  if (codice >= 500) {
    return 'La funzione dei promemoria va in errore: i dettagli sono nei log di Supabase, Edge Functions → promemoria.'
  }
  return `La funzione dei promemoria risponde con un errore (codice ${codice ?? 'sconosciuto'}).`
}

/** Testo breve per "da quanto": "da 12 minuti", "da 3 ore". */
export function daQuanto(minuti) {
  if (minuti === null || minuti === undefined) return 'da più di qualche ora'
  if (minuti < 60) return `da ${minuti} minuti`
  const ore = Math.floor(minuti / 60)
  if (ore < 48) return ore === 1 ? "da un'ora" : `da ${ore} ore`
  return `da ${Math.floor(ore / 24)} giorni`
}

/**
 * Hook: lo stato della sveglia, ricontrollato ogni due minuti e
 * ogni volta che l'app torna in primo piano.
 *
 * @param attivo false per non chiedere nulla (es. senza accesso)
 */
export function usaStatoSveglia(attivo = true) {
  const [esito, setEsito] = useState({ stato: 'sconosciuto' })

  useEffect(() => {
    if (!attivo) {
      setEsito({ stato: 'sconosciuto' })
      return
    }
    let annullato = false

    async function controlla() {
      try {
        const nuovo = await statoSveglia()
        if (!annullato) setEsito(nuovo)
      } catch {
        if (!annullato) setEsito({ stato: 'sconosciuto' })
      }
    }

    function tornaVisibile() {
      if (document.visibilityState === 'visible') controlla()
    }

    controlla()
    const timer = setInterval(controlla, OGNI_QUANTO_MS)
    document.addEventListener('visibilitychange', tornaVisibile)
    return () => {
      annullato = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tornaVisibile)
    }
  }, [attivo])

  return esito
}
