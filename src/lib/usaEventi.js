/*
  usaEventi.js
  ---------------------------------------------------------------
  Un "hook" di React: una funzione che una schermata puo' usare per
  avere sempre l'elenco aggiornato degli eventi.

  Fa tre cose:
   1. carica gli eventi la prima volta
   2. si mette in ascolto: se un'altra schermata li modifica, si aggiorna
   3. quando la schermata si chiude, smette di ascoltare (per non
      sprecare memoria)
*/
import { useEffect, useState } from 'react'
import { leggiEventi, iscriviti } from './archivio.js'

export function usaEventi() {
  const [eventi, setEventi] = useState([])
  const [caricamento, setCaricamento] = useState(true)

  useEffect(() => {
    // "annullato" evita di aggiornare una schermata gia' chiusa,
    // cosa che React segnalerebbe come errore.
    let annullato = false

    leggiEventi().then((elenco) => {
      if (annullato) return
      setEventi(elenco)
      setCaricamento(false)
    })

    // Si registra per essere avvisato dei cambiamenti
    const disiscriviti = iscriviti((elenco) => {
      if (!annullato) setEventi(elenco)
    })

    return () => {
      annullato = true
      disiscriviti()
    }
  }, [])

  return { eventi, caricamento }
}
