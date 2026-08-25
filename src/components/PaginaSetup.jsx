/*
  PaginaSetup.jsx
  ---------------------------------------------------------------
  Schermata di servizio. Serve a due cose:
   1. verificare che i pezzi tecnici funzionino sul telefono
      (pallini verdi/rossi) e provare una notifica
   2. gestire i dati: fare una copia di sicurezza e ricaricarla

  La copia di sicurezza e' importante FINCHE' SIAMO IN FASE 2, perche'
  il piano vive solo dentro questo telefono. Dalla Fase 3 in poi ci
  pensera' il database.
*/
import { useEffect, useRef, useState } from 'react'
import {
  statoPermessoNotifiche,
  chiediPermessoNotifiche,
  notificaDiProva,
  appInstallata,
} from '../lib/notifiche.js'
import { leggiEventi, sostituisciTutto, INFO_ARCHIVIO } from '../lib/archivio.js'
import { FASI } from '../lib/fasi.js'

export default function PaginaSetup() {
  const [permesso, setPermesso] = useState(statoPermessoNotifiche())
  const [swPronto, setSwPronto] = useState(false)
  const [messaggio, setMessaggio] = useState('')

  // "ref" serve a raggiungere l'elemento nascosto per scegliere un file
  const selettoreFile = useRef(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwPronto(true))
    }
  }, [])

  async function gestisciAttivaNotifiche() {
    const risultato = await chiediPermessoNotifiche()
    setPermesso(risultato)
    if (risultato === 'denied') {
      setMessaggio(
        'Permesso negato. Per riattivarlo: Impostazioni Android → App → Aegis → Notifiche.'
      )
    }
  }

  async function gestisciProva() {
    try {
      await notificaDiProva()
      setMessaggio('Notifica inviata: controlla la barra delle notifiche.')
    } catch (errore) {
      setMessaggio('Errore: ' + errore.message)
    }
  }

  /* --- Copia di sicurezza: scarica un file con dentro il piano --- */
  async function esportaPiano() {
    const eventi = await leggiEventi()
    const testo = JSON.stringify(eventi, null, 2)

    // Creiamo al volo un file in memoria e simuliamo un clic per scaricarlo
    const blob = new Blob([testo], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aegis-piano-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url) // libera la memoria

    setMessaggio(`Esportati ${eventi.length} eventi.`)
  }

  /* --- Ripristino: rilegge un file esportato in precedenza --- */
  async function importaPiano(fileScelto) {
    if (!fileScelto) return
    try {
      const testo = await fileScelto.text()
      const dati = JSON.parse(testo)
      if (!Array.isArray(dati)) throw new Error('Il file non contiene un piano valido.')

      await sostituisciTutto(dati)
      setMessaggio(`Ripristinati ${dati.length} eventi. Il piano precedente è stato sostituito.`)
    } catch (errore) {
      setMessaggio('Errore nel ripristino: ' + errore.message)
    }
  }

  return (
    <>
      <div className="riga-titolo">
        <div>
          <h2>Setup e diagnostica</h2>
          <p className="nota">Serve a controllare che tutto funzioni sul telefono.</p>
        </div>
      </div>

      {/* --- Controlli tecnici --- */}
      <section className="scheda">
        <h3>Controllo tecnico</h3>

        <ul className="lista-controlli">
          <Controllo
            ok={window.isSecureContext}
            etichetta="Connessione sicura (HTTPS)"
            dettaglio="Necessaria per notifiche e installazione."
          />
          <Controllo
            ok={'serviceWorker' in navigator}
            etichetta="Service worker supportato"
            dettaglio="Il programma che gira in background."
          />
          <Controllo
            ok={swPronto}
            etichetta="Service worker attivo"
            dettaglio="Se è rosso, ricarica la pagina."
          />
          <Controllo
            ok={'Notification' in window && 'PushManager' in window}
            etichetta="Notifiche push supportate"
            dettaglio="Su Android Chrome deve essere verde."
          />
          <Controllo
            ok={permesso === 'granted'}
            etichetta="Permesso notifiche concesso"
            dettaglio={'Stato attuale: ' + permesso}
          />
          <Controllo
            ok={appInstallata()}
            etichetta="App installata in home screen"
            dettaglio="Menu di Chrome → Installa app / Aggiungi a schermata Home."
          />
        </ul>

        <div className="pulsantiera">
          {permesso !== 'granted' && (
            <button className="pulsante primario" onClick={gestisciAttivaNotifiche}>
              Attiva notifiche
            </button>
          )}
          <button className="pulsante" onClick={gestisciProva} disabled={permesso !== 'granted'}>
            Invia notifica di prova
          </button>
        </div>
      </section>

      {/* --- Dati e copia di sicurezza --- */}
      <section className="scheda">
        <h3>I tuoi dati</h3>
        <p className="nota">{INFO_ARCHIVIO.spiegazione}</p>

        <div className="pulsantiera">
          <button className="pulsante" onClick={esportaPiano}>
            Salva una copia
          </button>
          <button className="pulsante" onClick={() => selettoreFile.current?.click()}>
            Ripristina da copia
          </button>
        </div>

        {/* Campo per scegliere il file: invisibile, lo apre il pulsante sopra */}
        <input
          ref={selettoreFile}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            importaPiano(e.target.files?.[0])
            e.target.value = '' // permette di riscegliere lo stesso file
          }}
        />
      </section>

      {messaggio && <p className="messaggio">{messaggio}</p>}

      {/* --- Avanzamento del progetto --- */}
      <section className="scheda">
        <h3>Avanzamento</h3>
        <ol className="lista-fasi">
          {FASI.map((fase) => (
            <li key={fase.numero} className={'fase fase-' + fase.stato}>
              <span className="fase-numero">{fase.numero}</span>
              <div>
                <strong>{fase.titolo}</strong>
                <span className="fase-stato">{etichettaStato(fase.stato)}</span>
                <p className="nota">{fase.descrizione}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

/* Riga con pallino verde o rosso. */
function Controllo({ ok, etichetta, dettaglio }) {
  return (
    <li className={'controllo ' + (ok ? 'ok' : 'ko')}>
      <span className="pallino" aria-hidden="true" />
      <div>
        <strong>{etichetta}</strong>
        <p className="nota">{dettaglio}</p>
      </div>
    </li>
  )
}

function etichettaStato(stato) {
  if (stato === 'fatto') return 'completata'
  if (stato === 'in-corso') return 'in corso'
  return 'da fare'
}
