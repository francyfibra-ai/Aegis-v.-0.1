/*
  SchedaPromemoria.jsx
  ---------------------------------------------------------------
  Il riquadro da cui si accendono e si spengono i promemoria
  automatici, nella schermata Setup.

  Sostituisce l'avviso "non ancora attivi" della Fase 3: ora quella
  parte esiste, e questo riquadro dice a che punto sei.
*/
import { useEffect, useState } from 'react'
import { attivaPromemoria, disattivaPromemoria, iscrittoAllePush } from '../lib/push.js'

export default function SchedaPromemoria({ utente }) {
  const [attivi, setAttivi] = useState(false)
  const [caricamento, setCaricamento] = useState(true)
  const [inCorso, setInCorso] = useState(false)
  const [errore, setErrore] = useState('')

  useEffect(() => {
    iscrittoAllePush().then((stato) => {
      setAttivi(stato)
      setCaricamento(false)
    })
  }, [utente])

  async function accendi() {
    setInCorso(true)
    setErrore('')
    const esito = await attivaPromemoria()
    if (esito.ok) setAttivi(true)
    else setErrore(esito.motivo)
    setInCorso(false)
  }

  async function spegni() {
    setInCorso(true)
    setErrore('')
    await disattivaPromemoria()
    setAttivi(false)
    setInCorso(false)
  }

  if (caricamento) return null

  /* --- Senza accesso non si puo' fare nulla: la sveglia deve sapere
         a chi scrivere, e lo sa solo dal tuo archivio online. --- */
  if (!utente) {
    return (
      <section className="scheda avviso">
        <h3>⏰ Promemoria automatici</h3>
        <p className="nota">
          Per riceverli devi prima <strong>effettuare l'accesso</strong>: la sveglia
          legge il piano dal tuo archivio online, e senza accesso non sa a chi scrivere.
        </p>
      </section>
    )
  }

  if (attivi) {
    return (
      <section className="scheda">
        <h3>⏰ Promemoria attivi su questo dispositivo</h3>
        <p className="nota">
          Riceverai una notifica agli orari del tuo piano, anche ad app chiusa.
        </p>
        <p className="nota">
          Se ne vuoi anche sul tablet o su un altro telefono, apri Aegis da lì e
          attivali di nuovo: ogni dispositivo si registra per conto suo.
        </p>

        {errore && <p className="errore">{errore}</p>}

        <div className="pulsantiera">
          <button className="pulsante" onClick={spegni} disabled={inCorso}>
            {inCorso ? 'Un momento…' : 'Disattiva su questo dispositivo'}
          </button>
        </div>

        <p className="nota">
          ⚠️ Android può ritardare le notifiche se mette Aegis in risparmio
          energetico. Se ti capita: Impostazioni → Batteria → Aegis → Senza
          restrizioni.
        </p>
      </section>
    )
  }

  return (
    <section className="scheda avviso">
      <h3>⏰ Promemoria automatici: da attivare</h3>
      <p className="nota">
        Attivandoli, riceverai una notifica agli orari del tuo piano — anche ad app
        chiusa, anche se non apri Aegis per giorni.
      </p>

      {errore && <p className="errore">{errore}</p>}

      <div className="pulsantiera">
        <button className="pulsante primario" onClick={accendi} disabled={inCorso}>
          {inCorso ? 'Un momento…' : 'Attiva i promemoria'}
        </button>
      </div>
    </section>
  )
}
