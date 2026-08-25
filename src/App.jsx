/*
  App.jsx - la struttura generale dell'app.

  Tiene l'intestazione, la barra di navigazione in basso, e decide
  quale schermata mostrare tra:
   - Piano settimanale  (PaginaPiano)
   - Setup e diagnostica (PaginaSetup)
*/
import { useEffect, useState } from 'react'
import PaginaPiano from './components/PaginaPiano.jsx'
import PaginaSetup from './components/PaginaSetup.jsx'

export default function App() {
  // Quale schermata e' visibile: 'piano' oppure 'setup'
  const [schermata, setSchermata] = useState('piano')

  // Messaggio mostrato quando si risponde a una notifica.
  // Dalla Fase 5 la risposta verra' salvata davvero nello storico.
  const [rispostaNotifica, setRispostaNotifica] = useState('')

  useEffect(() => {
    // Caso 1: l'app era gia' aperta e il service worker ci avvisa
    function ascoltaServiceWorker(evento) {
      if (evento.data?.tipo === 'risposta-notifica') {
        setRispostaNotifica(evento.data.azione)
      }
    }
    navigator.serviceWorker?.addEventListener('message', ascoltaServiceWorker)

    // Caso 2: l'app e' stata APERTA dalla notifica; l'informazione
    // arriva nell'indirizzo, es. /?risposta=fatto
    const parametri = new URLSearchParams(window.location.search)
    if (parametri.get('risposta')) {
      setRispostaNotifica(parametri.get('risposta'))
      // Ripulisce l'indirizzo, cosi' ricaricando non ricompare il messaggio
      window.history.replaceState({}, '', '/')
    }

    return () => {
      navigator.serviceWorker?.removeEventListener('message', ascoltaServiceWorker)
    }
  }, [])

  return (
    <div className="schermata">
      <header className="intestazione">
        <div className="logo" aria-hidden="true">A</div>
        <div>
          <h1>Aegis</h1>
          <p className="sottotitolo">Routine salutare · versione 0.1</p>
        </div>
      </header>

      {rispostaNotifica && (
        <p className="messaggio">
          Hai risposto «{rispostaNotifica}». Dalla Fase 5 finirà nello storico.{' '}
          <button className="pulsante-testo" onClick={() => setRispostaNotifica('')}>
            ok
          </button>
        </p>
      )}

      <main>
        {schermata === 'piano' ? <PaginaPiano /> : <PaginaSetup />}
      </main>

      {/* --- Barra di navigazione in basso, comoda col pollice --- */}
      <nav className="barra-navigazione">
        <button
          className={'voce-nav' + (schermata === 'piano' ? ' attiva' : '')}
          onClick={() => setSchermata('piano')}
        >
          <span aria-hidden="true">🗓️</span>
          Piano
        </button>
        <button
          className={'voce-nav' + (schermata === 'setup' ? ' attiva' : '')}
          onClick={() => setSchermata('setup')}
        >
          <span aria-hidden="true">⚙️</span>
          Setup
        </button>
      </nav>
    </div>
  )
}
