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
import { ascoltaAccesso, utenteAttuale } from './lib/supabase.js'
import { impostaUtente, inLinea } from './lib/archivio.js'
import { supabaseConfigurato } from './lib/configurazione.js'

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

  // Chi e' collegato, oppure null. Da qui dipende se i dati vanno
  // online o restano sul telefono.
  const [utente, setUtente] = useState(null)

  // Finche' non sappiamo se c'e' un accesso valido, evitiamo di mostrare
  // "i dati sono solo sul telefono" a chi in realta' e' collegato.
  const [accessoVerificato, setAccessoVerificato] = useState(!supabaseConfigurato())

  // L'evento su cui aprire il Piano, arrivando da una notifica.
  const [eventoDaNotifica, setEventoDaNotifica] = useState(null)

  // --- Accesso: leggiamo la situazione all'avvio e restiamo in ascolto ---
  useEffect(() => {
    if (!supabaseConfigurato()) return

    let annullato = false

    utenteAttuale().then((chi) => {
      if (annullato) return
      setUtente(chi)
      impostaUtente(chi) // dice all'archivio quale modalita' usare
      setAccessoVerificato(true)
    })

    // Scatta quando entri, quando esci, e anche quando l'accesso
    // viene rinnovato o scade da solo dopo molto tempo.
    const smetti = ascoltaAccesso((chi) => {
      if (annullato) return
      setUtente(chi)
      impostaUtente(chi)
      setAccessoVerificato(true)
    })

    return () => {
      annullato = true
      smetti()
    }
  }, [])

  useEffect(() => {
    // Caso 1: l'app era gia' aperta e il service worker ci avvisa
    function ascoltaServiceWorker(evento) {
      // La notifica non chiede nulla: porta soltanto sul punto giusto
      // dell'app, dove si risponde.
      if (evento.data?.tipo === 'apri-evento') {
        const dati = evento.data.dati || {}
        if (dati.tipo === 'peso') {
          setSchermata('peso')
          setApriEditorPeso(true)
        } else {
          setSchermata('piano')
          setEventoDaNotifica(dati.eventoId || null)
        }
      }
    }
    navigator.serviceWorker?.addEventListener('message', ascoltaServiceWorker)

    // Caso 2: l'app e' stata APERTA dalla notifica; l'informazione
    // arriva nell'indirizzo, es. /?vista=piano&evento=abc123
    const parametri = new URLSearchParams(window.location.search)

    if (parametri.get('evento')) {
      setEventoDaNotifica(parametri.get('evento'))
    }

    // La notifica del peso porta direttamente sulla schermata giusta,
    // con il campo dei chili gia' aperto: un tocco in meno.
    const vista = parametri.get('vista')
    if (VISTE.some((v) => v.id === vista)) {
      setSchermata(vista)
      if (vista === 'peso' && parametri.get('registra')) setApriEditorPeso(true)
    }

    // Ripulisce l'indirizzo, cosi' ricaricando non si ripete tutto.
    // BASE_URL e' la cartella in cui vive l'app: '/' in locale,
    // '/Aegis-v.-0.1/' online. Scrivere '/' fisso qui butterebbe fuori
    // dall'app una volta pubblicata.
    if ([...parametri.keys()].length > 0) {
      window.history.replaceState({}, '', import.meta.env.BASE_URL)
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

      <main>
        {schermata === 'piano' && (
          <PaginaPiano
            eventoDaNotifica={eventoDaNotifica}
            vaiAlPeso={() => setSchermata('peso')}
          />
        )}
        {schermata === 'peso' && <PaginaPeso apriSubitoEditor={apriEditorPeso} />}
        {schermata === 'setup' && <PaginaSetup utente={utente} />}
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
