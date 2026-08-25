/*
  PaginaPeso.jsx
  ---------------------------------------------------------------
  La schermata del controllo peso: il numero attuale, il grafico
  dell'andamento e l'elenco completo delle pesate.

  Nota sull'elenco in fondo: non e' un di piu'. E' il modo di leggere
  TUTTI i valori senza dover toccare il grafico - indispensabile se usi
  la tastiera o un lettore di schermo. Il grafico aggiunge il colpo
  d'occhio, non e' l'unica via ai numeri.
*/
import { useState } from 'react'
import {
  formattaPeso,
  formattaVariazione,
  giudicaVariazione,
  testoInData,
  tipoEvento,
  COLORI_STATO,
  OBIETTIVI,
} from '../lib/modello.js'
import {
  salvaMisurazione,
  eliminaMisurazione,
  salvaPreferenza,
  creaEvento,
} from '../lib/archivio.js'
import { usaMisurazioni, usaPreferenze, usaEventi } from '../lib/hooks.js'
import {
  INTERVALLI,
  serieDelPeriodo,
  riepilogo,
  variazioneDelPeriodo,
} from '../lib/statistichePeso.js'
import GraficoPeso from './GraficoPeso.jsx'
import EditorPesata from './EditorPesata.jsx'

export default function PaginaPeso({ apriSubitoEditor = false }) {
  const { misurazioni, caricamento } = usaMisurazioni()
  const { preferenze } = usaPreferenze()
  const { eventi } = usaEventi()

  const [intervallo, setIntervallo] = useState('settimane')
  const [editor, setEditor] = useState(apriSubitoEditor ? {} : null)
  const [errore, setErrore] = useState('')

  const obiettivo = preferenze.obiettivoPeso || 'nessuno'
  const colorePeso = tipoEvento('peso').colore

  const dati = riepilogo(misurazioni)
  const serie = serieDelPeriodo(misurazioni, intervallo)
  const variazionePeriodo = variazioneDelPeriodo(serie.punti)

  // C'e' gia' un promemoria settimanale nel piano?
  const haPromemoria = eventi.some((e) => e.tipo === 'peso')

  async function gestisciSalvataggio(bozza) {
    try {
      await salvaMisurazione(bozza)
      setEditor(null)
      setErrore('')
    } catch (e) {
      setErrore(e.message)
    }
  }

  async function gestisciEliminazione(id) {
    try {
      await eliminaMisurazione(id)
      setEditor(null)
      setErrore('')
    } catch (e) {
      setErrore(e.message)
    }
  }

  async function aggiungiPromemoria() {
    try {
      // Domenica (giorno 6) alle 08:00: a casa, senza fretta,
      // in condizioni ripetibili. Si puo' spostare dal Piano.
      await creaEvento({ giorno: 6, tipo: 'peso', titolo: 'Controllo peso', orario: '08:00' })
    } catch (e) {
      setErrore(e.message)
    }
  }

  if (caricamento) return <p className="nota">Carico le pesate…</p>

  return (
    <>
      <div className="riga-titolo">
        <div>
          <h2>Peso</h2>
          <p className="nota">
            {dati.conteggio === 0
              ? 'Nessuna pesata registrata.'
              : `${dati.conteggio} ${dati.conteggio === 1 ? 'pesata' : 'pesate'} registrate`}
          </p>
        </div>
      </div>

      {errore && <p className="errore">{errore}</p>}

      {/* --- Primo avvio --- */}
      {dati.conteggio === 0 ? (
        <section className="scheda vuoto">
          <p>
            Registra la prima pesata: il grafico comincia ad avere senso dalla
            seconda in poi, e diventa davvero utile dopo un mese.
          </p>
          <div className="pulsantiera">
            <button className="pulsante primario" onClick={() => setEditor({})}>
              Registra il peso
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* --- Il numero attuale --- */}
          <section className="scheda">
            <p className="etichetta-figura">Peso attuale</p>
            <p className="figura-principale" style={{ color: colorePeso }}>
              {formattaPeso(dati.ultima.peso, false)}
              <span className="unita">kg</span>
            </p>
            <p className="nota">
              Pesata del{' '}
              {testoInData(dati.ultima.data).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>

            <div className="griglia-variazioni">
              <Variazione
                valore={dati.variazioneUltima}
                obiettivo={obiettivo}
                etichetta="dalla volta scorsa"
              />
              <Variazione
                valore={dati.variazioneTotale}
                obiettivo={obiettivo}
                etichetta="dalla prima pesata"
              />
            </div>

            <div className="pulsantiera">
              <button className="pulsante primario" onClick={() => setEditor({})}>
                Registra il peso
              </button>
            </div>
          </section>

          {/* --- I filtri, in una riga sola sopra al grafico --- */}
          <div className="riga-filtri" role="group" aria-label="Periodo mostrato">
            {INTERVALLI.map((iv) => (
              <button
                key={iv.id}
                className={'filtro' + (intervallo === iv.id ? ' attivo' : '')}
                onClick={() => setIntervallo(iv.id)}
                aria-pressed={intervallo === iv.id}
              >
                {iv.nome}
              </button>
            ))}
          </div>

          {/* --- Il grafico --- */}
          <section className="scheda">
            <p className="nota">
              {INTERVALLI.find((iv) => iv.id === intervallo)?.descrizione}
            </p>

            {serie.punti.length === 0 ? (
              <p className="nota vuoto-grafico">
                Nessuna pesata in questo periodo. Prova ad allargare lo sguardo
                con «Mesi» o «Anni».
              </p>
            ) : serie.punti.length === 1 ? (
              <p className="nota vuoto-grafico">
                Una sola pesata in questo periodo ({formattaPeso(serie.punti[0].valore)}):
                serve almeno un secondo punto per disegnare un andamento.
              </p>
            ) : (
              <>
                <GraficoPeso punti={serie.punti} colore={colorePeso} />
                <p className="nota didascalia">
                  Tocca il grafico per leggere i singoli valori. L'elenco completo
                  è qui sotto.
                </p>
              </>
            )}

            {serie.nota && <p className="nota">{serie.nota}</p>}

            {variazionePeriodo !== null && (
              <div className="totale-periodo">
                <Variazione
                  valore={variazionePeriodo}
                  obiettivo={obiettivo}
                  etichetta="nel periodo mostrato"
                />
              </div>
            )}
          </section>
        </>
      )}

      {/* --- Promemoria settimanale, se manca --- */}
      {!haPromemoria && (
        <section className="scheda">
          <h3>Promemoria settimanale</h3>
          <p className="nota">
            Non hai un promemoria per la pesata nel piano. Serve a pesarti sempre
            nelle stesse condizioni: è la costanza che rende il grafico leggibile,
            più del giorno che scegli.
          </p>
          <div className="pulsantiera">
            <button className="pulsante" onClick={aggiungiPromemoria}>
              Aggiungi: domenica 08:00
            </button>
          </div>
        </section>
      )}

      {/* --- Elenco completo: e' anche la versione leggibile senza grafico --- */}
      {dati.conteggio > 0 && (
        <section className="scheda">
          <h3>Tutte le pesate</h3>
          <ul className="lista-pesate">
            {[...misurazioni].reverse().map((m, indice, elenco) => {
              // "elenco" e' gia' rovesciato, quindi la pesata precedente
              // nel tempo e' quella DOPO in questa lista.
              const precedente = elenco[indice + 1]
              const variazione = precedente ? Math.round((m.peso - precedente.peso) * 10) / 10 : null
              const giudizio = giudicaVariazione(variazione, obiettivo)

              return (
                <li key={m.id}>
                  <button className="pesata" onClick={() => setEditor({ misurazione: m })}>
                    <span className="data-pesata">
                      {testoInData(m.data).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                      })}
                    </span>
                    <strong className="peso-pesata">{formattaPeso(m.peso)}</strong>
                    <span className="delta-pesata" style={{ color: COLORI_STATO[giudizio] }}>
                      {variazione === null ? '—' : formattaVariazione(variazione)}
                    </span>
                    <span className="freccia" aria-hidden="true">›</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* --- Obiettivo: decide solo se colorare o no le variazioni --- */}
      <section className="scheda">
        <h3>Obiettivo</h3>
        <p className="nota">
          Serve solo a colorare le variazioni. Senza obiettivo l'app mostra i
          numeri e basta, senza dare giudizi.
        </p>
        <div className="gruppo-scelte a-capo">
          {OBIETTIVI.map((o) => (
            <button
              key={o.id}
              className={'scelta' + (obiettivo === o.id ? ' attiva' : '')}
              onClick={() => salvaPreferenza('obiettivoPeso', o.id)}
              title={o.descrizione}
            >
              {o.nome}
            </button>
          ))}
        </div>
      </section>

      {editor && (
        <EditorPesata
          misurazione={editor.misurazione}
          onSalva={gestisciSalvataggio}
          onElimina={gestisciEliminazione}
          onChiudi={() => setEditor(null)}
        />
      )}
    </>
  )
}

/*
  Mostra una variazione di peso.
  Il colore non basta mai da solo: accanto c'e' sempre una freccia
  e una scritta, cosi' il senso arriva anche a chi non distingue i colori.
*/
function Variazione({ valore, obiettivo, etichetta }) {
  if (valore === null || valore === undefined) {
    return (
      <div className="variazione">
        <span className="valore-variazione">—</span>
        <span className="nota">{etichetta}</span>
      </div>
    )
  }

  const giudizio = giudicaVariazione(valore, obiettivo)
  const freccia = valore > 0 ? '↑' : valore < 0 ? '↓' : '→'

  return (
    <div className="variazione">
      <span className="valore-variazione" style={{ color: COLORI_STATO[giudizio] }}>
        <span aria-hidden="true">{freccia}</span> {formattaVariazione(valore)}
      </span>
      <span className="nota">{etichetta}</span>
    </div>
  )
}
