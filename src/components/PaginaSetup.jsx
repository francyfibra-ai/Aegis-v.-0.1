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
import {
  leggiEventi,
  sostituisciTutto,
  leggiMisurazioni,
  sostituisciMisurazioni,
  leggiPreferenze,
  salvaPreferenza,
  INFO_ARCHIVIO,
} from '../lib/archivio.js'
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

  /* --- Copia di sicurezza -----------------------------------------
     Salva TUTTO in un unico file: il piano, le pesate e le impostazioni.
     Il campo "versione" serve a noi: se un domani cambiamo la forma dei
     dati, sapremo riconoscere e convertire i file vecchi.            */
  async function esportaTutto() {
    const [eventi, misurazioni, preferenze] = await Promise.all([
      leggiEventi(),
      leggiMisurazioni(),
      leggiPreferenze(),
    ])

    const copia = { versione: 1, salvataIl: new Date().toISOString(), eventi, misurazioni, preferenze }
    const testo = JSON.stringify(copia, null, 2)

    // Creiamo al volo un file in memoria e simuliamo un clic per scaricarlo
    const blob = new Blob([testo], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `aegis-copia-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url) // libera la memoria

    setMessaggio(
      `Salvati ${plurale(eventi.length, 'evento', 'eventi')} del piano e ${plurale(misurazioni.length, 'pesata', 'pesate')}.`
    )
  }

  /* --- Ripristino: rilegge un file salvato in precedenza --- */
  async function importaTutto(fileScelto) {
    if (!fileScelto) return
    try {
      const testo = await fileScelto.text()
      const dati = JSON.parse(testo)

      // Le primissime copie contenevano solo l'elenco degli eventi.
      // Continuiamo ad accettarle, cosi' nessun file vecchio diventa inutile.
      const copia = Array.isArray(dati)
        ? { eventi: dati, misurazioni: [], preferenze: {} }
        : dati

      if (!Array.isArray(copia.eventi)) {
        throw new Error('Il file non contiene una copia di Aegis.')
      }

      await sostituisciTutto(copia.eventi)
      if (Array.isArray(copia.misurazioni)) {
        await sostituisciMisurazioni(copia.misurazioni)
      }
      if (copia.preferenze?.obiettivoPeso) {
        await salvaPreferenza('obiettivoPeso', copia.preferenze.obiettivoPeso)
      }

      setMessaggio(
        `Ripristinati ${plurale(copia.eventi.length, 'evento', 'eventi')} e ${plurale(copia.misurazioni?.length ?? 0, 'pesata', 'pesate')}. I dati precedenti sono stati sostituiti.`
      )
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

      {/* --- Avviso: i promemoria automatici non esistono ancora ---
             Serve perche' la diagnostica qui sopra dice "permesso concesso"
             e verrebbe naturale pensare che gli orari del piano suonino.
             Da togliere quando la Fase 4 sara' completata. --- */}
      <section className="scheda avviso">
        <h3>⏰ Promemoria automatici: non ancora attivi</h3>
        <p className="nota">
          La notifica di prova funziona, ma <strong>gli orari del piano non
          fanno ancora suonare niente</strong>: al momento nessuno controlla
          l'orologio.
        </p>
        <p className="nota">
          Non è un guasto, è che quella parte non è ancora costruita: serve un
          programma nel cloud che ogni minuto guardi l'ora e invii la notifica.
          Il telefono da solo non può farlo, perché Android sospende le app web
          per risparmiare batteria. È la <strong>Fase 4</strong>.
        </p>
        <p className="nota">
          Fino ad allora Aegis serve a tenere il piano e a registrare le pesate.
        </p>
      </section>

      {/* --- Dati e copia di sicurezza --- */}
      <section className="scheda">
        <h3>I tuoi dati</h3>
        <p className="nota">{INFO_ARCHIVIO.spiegazione}</p>

        <div className="pulsantiera">
          <button className="pulsante" onClick={esportaTutto}>
            Salva una copia
          </button>
          <button className="pulsante" onClick={() => selettoreFile.current?.click()}>
            Ripristina da copia
          </button>
        </div>
        <p className="nota">
          La copia contiene il piano settimanale, tutte le pesate e le impostazioni.
        </p>

        {/* Campo per scegliere il file: invisibile, lo apre il pulsante sopra */}
        <input
          ref={selettoreFile}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            importaTutto(e.target.files?.[0])
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

/* Scrive "1 evento" invece di "1 eventi". */
function plurale(quantita, singolare, plurale_) {
  return `${quantita} ${quantita === 1 ? singolare : plurale_}`
}

function etichettaStato(stato) {
  if (stato === 'fatto') return 'completata'
  if (stato === 'in-corso') return 'in corso'
  return 'da fare'
}
