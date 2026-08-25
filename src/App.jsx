/*
  App.jsx - la struttura generale dell'app.

  Tiene l'intestazione, la barra di navigazione in basso, e decide
  quale schermata mostrare tra:
   - Piano settimanale  (PaginaPiano)
   - Setup e diagnostica (PaginaSetup)
*/
import { useEffect, useState } from 'react'
import PaginaPiano from './components/PaginaPiano.jsx'
import PaginaPeso from './components/PaginaPeso.jsx'
import PaginaSetup from './components/PaginaSetup.jsx'

// Le voci della barra in fondo allo schermo.
const VISTE = [
  { id: 'piano', nome: 'Piano', emoji: '🗓️' },
  { id: 'peso', nome: 'Peso', emoji: '⚖️' },
  { id: 'setup', nome: 'Setup', emoji: '⚙️' },
]

export default function App() {
  // Quale schermata e' visibile: vedi VISTE qui sopra
  const [schermata, setSchermata] = useState('piano')

  // Se true, la schermata Peso si apre gia' con il campo per scrivere i chili.
  // Succede quando arrivi qui toccando la notifica del controllo peso.
  const [apriEditorPeso, setApriEditorPeso] = useState(false)

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
    // arriva nell'indirizzo, es. /?risposta=fatto oppure /?vista=peso
    const parametri = new URLSearchParams(window.location.search)

    if (parametri.get('risposta')) {
      setRispostaNotifica(parametri.get('risposta'))
    }

    // La notifica del peso porta direttamente sulla schermata giusta,
    // con il campo dei chili gia' aperto: un tocco in meno.
    const vista = parametri.get('vista')
    if (VISTE.some((v) => v.id === vista)) {
      setSchermata(vista)
      if (vista === 'peso' && parametri.get('registra')) setApriEditorPeso(true)
    }

    // Ripulisce l'indirizzo, cosi' ricaricando non si ripete tutto
    if ([...parametri.keys()].length > 0) {
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
        {schermata === 'piano' && <PaginaPiano />}
        {schermata === 'peso' && <PaginaPeso apriSubitoEditor={apriEditorPeso} />}
        {schermata === 'setup' && <PaginaSetup />}
      </main>

      {/* --- Barra di navigazione in basso, comoda col pollice --- */}
      <nav className="barra-navigazione">
        {VISTE.map((vista) => (
          <button
            key={vista.id}
            className={'voce-nav' + (schermata === vista.id ? ' attiva' : '')}
            onClick={() => setSchermata(vista.id)}
            aria-current={schermata === vista.id ? 'page' : undefined}
          >
            <span aria-hidden="true">{vista.emoji}</span>
            {vista.nome}
          </button>
        ))}
      </nav>
    </div>
  )
}
