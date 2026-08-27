/*
  hooks.js
  ---------------------------------------------------------------
  Gli "hook" sono funzioni che una schermata usa per avere sempre i dati
  aggiornati. Ognuno fa tre cose:
   1. carica i dati la prima volta
   2. si mette in ascolto: se un'altra schermata li modifica, si aggiorna
   3. quando la schermata si chiude, smette di ascoltare (per non
      sprecare memoria)

  Sono tutti uguali tra loro, quindi sono costruiti dalla stessa
  funzione "creaHook" qui sotto: cosi' c'e' un solo posto dove
  guardare se qualcosa non si aggiorna.
*/
import { useEffect, useState } from 'react'
import {
  leggiEventi,
  iscriviti,
  leggiMisurazioni,
  iscrivitiMisurazioni,
  leggiPreferenze,
  iscrivitiPreferenze,
  leggiRisposte,
  iscrivitiRisposte,
} from './archivio.js'

/**
 * Costruisce un hook a partire da una funzione di lettura e da una
 * di iscrizione ai cambiamenti.
 */
function creaHook(leggi, iscrivitiA, valoreIniziale) {
  return function usaDati() {
    const [dati, setDati] = useState(valoreIniziale)
    const [caricamento, setCaricamento] = useState(true)

    useEffect(() => {
      // "annullato" evita di aggiornare una schermata gia' chiusa,
      // cosa che React segnalerebbe come errore.
      let annullato = false

      leggi().then((valore) => {
        if (annullato) return
        setDati(valore)
        setCaricamento(false)
      })

      // Quando i dati cambiano rileggiamo passando dalla funzione di
      // lettura, e non usando direttamente quello che ci viene passato:
      // cosi' ordinamenti e filtri restano applicati.
      const disiscriviti = iscrivitiA(() => {
        leggi().then((valore) => {
          if (!annullato) setDati(valore)
        })
      })

      return () => {
        annullato = true
        disiscriviti()
      }
    }, [])

    return { dati, caricamento }
  }
}

const hookEventi = creaHook(leggiEventi, iscriviti, [])
const hookMisurazioni = creaHook(leggiMisurazioni, iscrivitiMisurazioni, [])
const hookPreferenze = creaHook(leggiPreferenze, iscrivitiPreferenze, {})
const hookRisposte = creaHook(leggiRisposte, iscrivitiRisposte, [])

/** Gli eventi del piano settimanale. */
export function usaEventi() {
  const { dati, caricamento } = hookEventi()
  return { eventi: dati, caricamento }
}

/** Le pesate, dalla piu' vecchia alla piu' recente. */
export function usaMisurazioni() {
  const { dati, caricamento } = hookMisurazioni()
  return { misurazioni: dati, caricamento }
}

/** Lo storico delle risposte "fatto / saltato". */
export function usaRisposte() {
  const { dati, caricamento } = hookRisposte()
  return { risposte: dati, caricamento }
}

/** Le impostazioni (per ora solo l'obiettivo di peso). */
export function usaPreferenze() {
  const { dati, caricamento } = hookPreferenze()
  return { preferenze: dati, caricamento }
}
