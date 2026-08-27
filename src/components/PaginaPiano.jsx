/*
  PaginaPiano.jsx
  ---------------------------------------------------------------
  La schermata principale: il piano settimanale.
  Mostra i sette giorni, ognuno con i suoi eventi ordinati per orario,
  e permette di aggiungerne, modificarne ed eliminarne.
*/
import { useEffect, useState } from 'react'
import {
  GIORNI,
  tipoEvento,
  ordinaPerOrario,
  giornoDiOggi,
  pianoDiEsempio,
  dataInTesto,
  statoRisposta,
} from '../lib/modello.js'
import {
  creaEvento,
  aggiornaEvento,
  eliminaEvento,
  sostituisciTutto,
  salvaRisposta,
  eliminaRisposta,
  infoArchivio,
} from '../lib/archivio.js'
import { usaEventi, usaRisposte } from '../lib/hooks.js'
import { iscrittoAllePush } from '../lib/push.js'
import EditorEvento from './EditorEvento.jsx'

export default function PaginaPiano({ vaiAlPeso, eventoDaNotifica }) {
  const { eventi, caricamento } = usaEventi()
  const { risposte } = usaRisposte()

  // Quando questo valore non e' null, il pannello di modifica e' aperto.
  // Contiene { evento } se stiamo modificando, { giorno } se stiamo creando.
  const [editor, setEditor] = useState(null)
  const [errore, setErrore] = useState('')

  // L'evento su cui siamo arrivati dalla notifica: lo portiamo a schermo
  // e lo mettiamo in evidenza, cosi' non devi cercarlo nell'elenco.
  useEffect(() => {
    if (!eventoDaNotifica) return
    const elemento = document.getElementById('evento-' + eventoDaNotifica)
    if (elemento) elemento.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [eventoDaNotifica, eventi])

  // I promemoria sono accesi su questo dispositivo? Se si', l'avviso
  // "gli orari non fanno suonare niente" non ha piu' ragione di esserci.
  const [promemoriaAttivi, setPromemoriaAttivi] = useState(true)
  useEffect(() => {
    iscrittoAllePush().then(setPromemoriaAttivi)
  }, [])

  const oggi = giornoDiOggi()
  const dataDiOggi = dataInTesto()

  /*
    Le risposte di oggi, messe in una mappa per ritrovarle in fretta.
    La chiave e' l'identificativo dell'evento: per ogni evento c'e' al
    massimo una risposta al giorno.
  */
  const risposteDiOggi = new Map(
    risposte.filter((r) => r.data === dataDiOggi).map((r) => [r.evento, r])
  )

  /**
   * Registra "fatto" o "saltato" per un evento di oggi.
   * Premendo di nuovo lo stesso pulsante la risposta viene tolta:
   * serve a correggersi senza dover cercare dove si annulla.
   */
  async function rispondi(evento, stato) {
    try {
      const gia = risposteDiOggi.get(evento.id)
      if (gia && gia.stato === stato) {
        await eliminaRisposta({ evento: evento.id, data: dataDiOggi })
      } else {
        await salvaRisposta({
          evento: evento.id,
          titolo: evento.titolo,
          data: dataDiOggi,
          stato,
        })
      }
      setErrore('')
    } catch (e) {
      setErrore(e.message)
    }
  }

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
      {eventi.length > 0 && !promemoriaAttivi && (
        <p className="messaggio tenue">
          ⏰ Gli orari sono salvati ma <strong>non ti avvisa ancora nessuno</strong>:
          i promemoria si attivano dalla schermata Setup.
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
                {eOggi && delGiorno.length > 0 && (
                  <span className="conteggio-oggi">
                    {delGiorno.filter((e) => risposteDiOggi.get(e.id)?.stato === 'fatto').length}
                    /{delGiorno.length} fatti
                  </span>
                )}
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
                  const risposta = eOggi ? risposteDiOggi.get(evento.id) : null
                  const stato = risposta ? statoRisposta(risposta.stato) : null

                  return (
                    <li
                      key={evento.id}
                      id={'evento-' + evento.id}
                      className={eventoDaNotifica === evento.id ? 'in-evidenza' : undefined}
                    >
                      <button
                        className={'evento' + (stato ? ' con-risposta stato-' + risposta.stato : '')}
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

                      {/* Si risponde solo per oggi: il piano e' ricorrente,
                          e rispondere per lunedi' prossimo non vuol dire nulla. */}
                      {eOggi && (
                        <div className="controlli-risposta">
                          {evento.tipo === 'peso' ? (
                            <button
                              className="risposta-pulsante peso"
                              onClick={() => vaiAlPeso?.()}
                            >
                              ⚖️ Registra il peso
                            </button>
                          ) : (
                            <>
                              <button
                                className={
                                  'risposta-pulsante fatto' +
                                  (risposta?.stato === 'fatto' ? ' scelto' : '')
                                }
                                onClick={() => rispondi(evento, 'fatto')}
                                aria-pressed={risposta?.stato === 'fatto'}
                              >
                                ✓ Fatto
                              </button>
                              <button
                                className={
                                  'risposta-pulsante saltato' +
                                  (risposta?.stato === 'saltato' ? ' scelto' : '')
                                }
                                onClick={() => rispondi(evento, 'saltato')}
                                aria-pressed={risposta?.stato === 'saltato'}
                              >
                                × Saltato
                              </button>
                              {risposta && (
                                <span className="nota annulla-suggerimento">
                                  tocca di nuovo per annullare
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
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
