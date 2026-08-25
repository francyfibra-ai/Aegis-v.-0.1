/*
  EditorEvento.jsx
  ---------------------------------------------------------------
  Il pannello che scorre dal basso quando aggiungi o modifichi un evento.
  Serve sia per creare che per modificare: la differenza e' solo se gli
  passiamo un evento gia' esistente oppure no.
*/
import { useEffect, useState } from 'react'
import { GIORNI, TIPI_EVENTO, validaEvento } from '../lib/modello.js'

export default function EditorEvento({ evento, giornoIniziale, onSalva, onElimina, onChiudi }) {
  // Stiamo modificando un evento esistente o creandone uno nuovo?
  const inModifica = Boolean(evento?.id)

  // I valori attualmente scritti nei campi del modulo.
  const [tipo, setTipo] = useState(evento?.tipo || 'allenamento')
  const [titolo, setTitolo] = useState(evento?.titolo || '')
  const [orario, setOrario] = useState(evento?.orario || '19:00')
  const [giorno, setGiorno] = useState(
    evento?.giorno ?? giornoIniziale ?? 0
  )
  const [errore, setErrore] = useState('')
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)

  // Chiude il pannello con il tasto "indietro" fisico di Android
  // e con il tasto Esc sul computer.
  useEffect(() => {
    function gestisciTasto(e) {
      if (e.key === 'Escape') onChiudi()
    }
    window.addEventListener('keydown', gestisciTasto)
    return () => window.removeEventListener('keydown', gestisciTasto)
  }, [onChiudi])

  function gestisciSalvataggio(e) {
    e.preventDefault() // impedisce alla pagina di ricaricarsi

    const bozza = { giorno, tipo, titolo, orario }
    const problema = validaEvento(bozza)
    if (problema) {
      setErrore(problema)
      return
    }

    onSalva(bozza)
  }

  return (
    // Lo sfondo scuro: toccandolo si chiude il pannello
    <div className="velo" onClick={onChiudi}>
      {/* stopPropagation evita che un tocco DENTRO il pannello lo chiuda */}
      <form
        className="pannello"
        onClick={(e) => e.stopPropagation()}
        onSubmit={gestisciSalvataggio}
      >
        <div className="maniglia" aria-hidden="true" />

        <h2>{inModifica ? 'Modifica evento' : 'Nuovo evento'}</h2>

        {/* --- Tipo: allenamento o pasto --- */}
        <label className="etichetta">Tipo</label>
        <div className="gruppo-scelte">
          {TIPI_EVENTO.map((t) => (
            <button
              key={t.id}
              type="button"
              className={'scelta' + (tipo === t.id ? ' attiva' : '')}
              onClick={() => setTipo(t.id)}
            >
              <span aria-hidden="true">{t.emoji}</span> {t.nome}
            </button>
          ))}
        </div>

        {/* --- Titolo --- */}
        <label className="etichetta" htmlFor="campo-titolo">
          Titolo
        </label>
        <input
          id="campo-titolo"
          className="campo"
          type="text"
          value={titolo}
          onChange={(e) => setTitolo(e.target.value)}
          placeholder={tipo === 'pasto' ? 'Es. Pranzo: pollo e riso' : 'Es. Petto e tricipiti'}
          autoFocus={!inModifica}
        />

        {/* --- Giorno e orario, affiancati --- */}
        <div className="riga-campi">
          <div>
            <label className="etichetta" htmlFor="campo-giorno">
              Giorno
            </label>
            <select
              id="campo-giorno"
              className="campo"
              value={giorno}
              onChange={(e) => setGiorno(Number(e.target.value))}
            >
              {GIORNI.map((g) => (
                <option key={g.numero} value={g.numero}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="etichetta" htmlFor="campo-orario">
              Orario
            </label>
            {/* type="time" fa comparire la rotella dell'orologio di Android */}
            <input
              id="campo-orario"
              className="campo"
              type="time"
              value={orario}
              onChange={(e) => setOrario(e.target.value)}
            />
          </div>
        </div>

        {errore && <p className="errore">{errore}</p>}

        {/* --- Pulsanti finali --- */}
        <div className="pulsantiera">
          <button type="button" className="pulsante" onClick={onChiudi}>
            Annulla
          </button>
          <button type="submit" className="pulsante primario">
            Salva
          </button>
        </div>

        {/* --- Eliminazione, solo quando si modifica --- */}
        {inModifica && (
          <div className="zona-eliminazione">
            {confermaEliminazione ? (
              <>
                <p className="nota">Eliminare "{evento.titolo}"? Non si può annullare.</p>
                <div className="pulsantiera">
                  <button
                    type="button"
                    className="pulsante"
                    onClick={() => setConfermaEliminazione(false)}
                  >
                    No, tieni
                  </button>
                  <button
                    type="button"
                    className="pulsante pericolo"
                    onClick={() => onElimina(evento.id)}
                  >
                    Sì, elimina
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="pulsante-testo pericolo"
                onClick={() => setConfermaEliminazione(true)}
              >
                Elimina evento
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
