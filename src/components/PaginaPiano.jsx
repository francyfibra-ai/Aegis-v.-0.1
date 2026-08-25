/*
  PaginaPiano.jsx
  ---------------------------------------------------------------
  La schermata principale: il piano settimanale.
  Mostra i sette giorni, ognuno con i suoi eventi ordinati per orario,
  e permette di aggiungerne, modificarne ed eliminarne.
*/
import { useState } from 'react'
import {
  GIORNI,
  tipoEvento,
  ordinaPerOrario,
  giornoDiOggi,
  pianoDiEsempio,
} from '../lib/modello.js'
import {
  creaEvento,
  aggiornaEvento,
  eliminaEvento,
  sostituisciTutto,
  infoArchivio,
} from '../lib/archivio.js'
import { usaEventi } from '../lib/hooks.js'
import EditorEvento from './EditorEvento.jsx'

export default function PaginaPiano() {
  const { eventi, caricamento } = usaEventi()

  // Quando questo valore non e' null, il pannello di modifica e' aperto.
  // Contiene { evento } se stiamo modificando, { giorno } se stiamo creando.
  const [editor, setEditor] = useState(null)
  const [errore, setErrore] = useState('')

  const oggi = giornoDiOggi()

  async function gestisciSalvataggio(bozza) {
    try {
      if (editor.evento) {
        await aggiornaEvento(editor.evento.id, bozza)
      } else {
        await creaEvento(bozza)
      }
      setEditor(null)
      setErrore('')
    } catch (e) {
      setErrore(e.message)
    }
  }

  async function gestisciEliminazione(id) {
    try {
      await eliminaEvento(id)
      setEditor(null)
      setErrore('')
    } catch (e) {
      setErrore(e.message)
    }
  }

  async function caricaEsempio() {
    try {
      await sostituisciTutto(pianoDiEsempio())
    } catch (e) {
      setErrore(e.message)
    }
  }

  if (caricamento) {
    return <p className="nota">Carico il piano…</p>
  }

  return (
    <>
      <div className="riga-titolo">
        <div>
          <h2>Piano settimanale</h2>
          <p className="nota">
            {eventi.length === 0
              ? 'Nessun evento ancora.'
              : `${eventi.length} eventi a settimana · ${infoArchivio().etichetta}`}
          </p>
        </div>
      </div>

      {errore && <p className="errore">{errore}</p>}

      {/* Promemoria non ancora attivi: lo diciamo dove si inseriscono
          gli orari, che e' il punto in cui uno se lo aspetta.
          Da togliere alla fine della Fase 4. */}
      {eventi.length > 0 && (
        <p className="messaggio tenue">
          ⏰ Gli orari sono salvati ma <strong>non fanno ancora suonare
          niente</strong>: i promemoria automatici arrivano con la Fase 4.
        </p>
      )}

      {/* --- Primo avvio: piano vuoto --- */}
      {eventi.length === 0 && (
        <div className="scheda vuoto">
          <p>
            Il piano è vuoto. Puoi aggiungere gli eventi uno alla volta, oppure
            partire da un piano di esempio e modificarlo: spesso è più veloce.
          </p>
          <div className="pulsantiera">
            <button className="pulsante" onClick={caricaEsempio}>
              Carica piano di esempio
            </button>
            <button className="pulsante primario" onClick={() => setEditor({ giorno: oggi })}>
              Aggiungi il primo evento
            </button>
          </div>
        </div>
      )}

      {/* --- I sette giorni --- */}
      {GIORNI.map((giorno) => {
        const delGiorno = ordinaPerOrario(eventi.filter((e) => e.giorno === giorno.numero))
        const eOggi = giorno.numero === oggi

        return (
          <section
            key={giorno.numero}
            className={'scheda giorno' + (eOggi ? ' oggi' : '')}
          >
            <div className="intestazione-giorno">
              <h3>
                {giorno.nome}
                {eOggi && <span className="pillola">oggi</span>}
              </h3>
              <button
                className="pulsante-tondo"
                onClick={() => setEditor({ giorno: giorno.numero })}
                aria-label={'Aggiungi evento di ' + giorno.nome}
                title={'Aggiungi evento di ' + giorno.nome}
              >
                +
              </button>
            </div>

            {delGiorno.length === 0 ? (
              <p className="nota">Niente in programma.</p>
            ) : (
              <ul className="lista-eventi">
                {delGiorno.map((evento) => {
                  const tipo = tipoEvento(evento.tipo)
                  return (
                    <li key={evento.id}>
                      <button
                        className="evento"
                        onClick={() => setEditor({ evento })}
                      >
                        <span className="orario">{evento.orario}</span>
                        <span
                          className="barra-tipo"
                          style={{ background: tipo.colore }}
                          aria-hidden="true"
                        />
                        <span className="testo-evento">
                          <strong>{evento.titolo}</strong>
                          <span className="nota">
                            {tipo.emoji} {tipo.nome}
                          </span>
                        </span>
                        <span className="freccia" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}

      {/* --- Il pannello di modifica, quando serve --- */}
      {editor && (
        <EditorEvento
          evento={editor.evento}
          giornoIniziale={editor.giorno}
          onSalva={gestisciSalvataggio}
          onElimina={gestisciEliminazione}
          onChiudi={() => setEditor(null)}
        />
      )}
    </>
  )
}
