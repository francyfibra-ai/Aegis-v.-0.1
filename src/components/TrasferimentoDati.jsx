/*
  TrasferimentoDati.jsx
  ---------------------------------------------------------------
  Compare una volta sola, subito dopo il primo accesso, se sul telefono
  c'era gia' un piano o delle pesate.

  Serve a non farti riscrivere da zero quello che avevi gia' inserito
  mentre l'archivio online non esisteva ancora.
*/
import { useEffect, useState } from 'react'
import { ciSonoDatiLocali, trasferisciOnline } from '../lib/archivio.js'

export default function TrasferimentoDati({ utente }) {
  const [daTrasferire, setDaTrasferire] = useState(false)
  const [esito, setEsito] = useState('')
  const [errore, setErrore] = useState('')
  const [inCorso, setInCorso] = useState(false)
  const [nascosto, setNascosto] = useState(false)

  useEffect(() => {
    if (!utente) {
      setDaTrasferire(false)
      return
    }
    // Controlliamo se nella memoria del telefono e' rimasto qualcosa
    ciSonoDatiLocali().then(setDaTrasferire)
  }, [utente])

  // ATTENZIONE ALL'ORDINE DEI CONTROLLI QUI SOTTO.
  // La conferma di avvenuto trasferimento va verificata PRIMA di
  // "non c'e' piu' niente da trasferire": a trasferimento riuscito
  // sono vere tutte e due, e invertendole il messaggio di conferma
  // non comparirebbe mai (e' successo davvero).
  if (esito) {
    return (
      <section className="scheda">
        <h3>Trasferimento completato</h3>
        <p className="nota">{esito}</p>
      </section>
    )
  }

  if (!utente || !daTrasferire || nascosto) return null

  async function trasferisci() {
    setInCorso(true)
    setErrore('')
    try {
      const conteggio = await trasferisciOnline(true)
      setEsito(
        `Trasferiti ${conteggio.eventi} eventi del piano e ${conteggio.misurazioni} ` +
          `${conteggio.misurazioni === 1 ? 'pesata' : 'pesate'}.`
      )
      setDaTrasferire(false)
    } catch (e) {
      setErrore(e.message)
    } finally {
      setInCorso(false)
    }
  }

  return (
    <section className="scheda avviso">
      <h3>📦 Dati salvati su questo telefono</h3>
      <p className="nota">
        Prima di creare l'accesso avevi già inserito qualcosa. Vuoi portarlo
        nel tuo archivio online, così lo ritrovi ovunque?
      </p>
      <p className="nota">
        Se online c'è già qualcosa, quello ha la precedenza: non verrà
        sovrascritto né duplicato.
      </p>

      {errore && <p className="errore">{errore}</p>}

      <div className="pulsantiera">
        <button className="pulsante" onClick={() => setNascosto(true)} disabled={inCorso}>
          Non ora
        </button>
        <button className="pulsante primario" onClick={trasferisci} disabled={inCorso}>
          {inCorso ? 'Trasferisco…' : 'Porta online'}
        </button>
      </div>
    </section>
  )
}
