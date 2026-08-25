/*
  App.jsx - la schermata principale dell'app.

  In FASE 1 mostra un pannello di CONTROLLO SETUP: serve a verificare
  sul telefono che tutti i pezzi tecnici funzionino (app installabile,
  service worker attivo, notifiche permesse) PRIMA di costruire
  le funzioni vere.

  In FASE 2 questa schermata verra' sostituita dal "Piano settimanale".
*/
import { useEffect, useState } from 'react'
import {
  statoPermessoNotifiche,
  chiediPermessoNotifiche,
  notificaDiProva,
  appInstallata,
} from './lib/notifiche.js'
import { FASI } from './lib/fasi.js'

export default function App() {
  // "useState" crea una variabile che, quando cambia,
  // fa ridisegnare automaticamente la schermata.
  const [permesso, setPermesso] = useState(statoPermessoNotifiche())
  const [swPronto, setSwPronto] = useState(false)
  const [messaggio, setMessaggio] = useState('')

  // "useEffect" esegue del codice quando la schermata viene aperta.
  useEffect(() => {
    // Aspetta che il service worker sia attivo e aggiorna la spia verde
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwPronto(true))
    }

    // Ascolta i messaggi che il service worker manda quando l'utente
    // preme "Fatto" o "Saltato" sulla notifica.
    function ascoltaServiceWorker(evento) {
      if (evento.data?.tipo === 'risposta-notifica') {
        setMessaggio(`Hai risposto: "${evento.data.azione}" (in Fase 5 verra' salvato nello storico)`)
      }
    }
    navigator.serviceWorker?.addEventListener('message', ascoltaServiceWorker)

    // Se l'app e' stata APERTA dalla notifica, l'informazione arriva
    // nell'indirizzo (es. /?risposta=fatto)
    const parametri = new URLSearchParams(window.location.search)
    if (parametri.get('risposta')) {
      setMessaggio(`Hai risposto: "${parametri.get('risposta')}" (in Fase 5 verra' salvato nello storico)`)
    }

    // Pulizia: quando la schermata si chiude, smettiamo di ascoltare.
    return () => {
      navigator.serviceWorker?.removeEventListener('message', ascoltaServiceWorker)
    }
  }, [])

  async function gestisciAttivaNotifiche() {
    const risultato = await chiediPermessoNotifiche()
    setPermesso(risultato)
    if (risultato === 'denied') {
      setMessaggio(
        'Permesso negato. Per riattivarlo: Impostazioni Android > App > Aegis > Notifiche.'
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

  return (
    <div className="schermata">
      <header className="intestazione">
        <div className="logo" aria-hidden="true">A</div>
        <div>
          <h1>Aegis</h1>
          <p className="sottotitolo">Routine salutare &middot; versione 0.1</p>
        </div>
      </header>

      {/* --- Pannello diagnostico: verifica che tutto funzioni --- */}
      <section className="scheda">
        <h2>Controllo setup</h2>
        <p className="nota">
          Apri questa pagina dal telefono per verificare che i pezzi tecnici funzionino.
        </p>

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
            dettaglio="Se e' rosso, ricarica la pagina."
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
            dettaglio="Menu di Chrome > Installa app / Aggiungi a schermata Home."
          />
        </ul>

        <div className="pulsantiera">
          {permesso !== 'granted' && (
            <button className="pulsante primario" onClick={gestisciAttivaNotifiche}>
              Attiva notifiche
            </button>
          )}
          <button
            className="pulsante"
            onClick={gestisciProva}
            disabled={permesso !== 'granted'}
          >
            Invia notifica di prova
          </button>
        </div>

        {messaggio && <p className="messaggio">{messaggio}</p>}
      </section>

      {/* --- Avanzamento del progetto, fase per fase --- */}
      <section className="scheda">
        <h2>Avanzamento</h2>
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
    </div>
  )
}

/* Piccolo componente riutilizzabile: una riga con pallino verde/rosso. */
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
