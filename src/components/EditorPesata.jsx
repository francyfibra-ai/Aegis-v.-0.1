/*
  EditorPesata.jsx
  ---------------------------------------------------------------
  Il pannello per registrare o correggere una pesata.
  Stessa forma dell'EditorEvento, cosi' l'app resta prevedibile.
*/
import { useEffect, useState } from 'react'
import { dataInTesto, validaMisurazione, formattaPeso } from '../lib/modello.js'

export default function EditorPesata({ misurazione, onSalva, onElimina, onChiudi }) {
  const inModifica = Boolean(misurazione?.id)

  const [data, setData] = useState(misurazione?.data || dataInTesto())
  // Il peso resta un testo finche' non si salva: cosi' si puo' scrivere
  // "78," senza che il campo si svuoti a meta' digitazione.
  const [peso, setPeso] = useState(misurazione ? String(misurazione.peso) : '')
  const [errore, setErrore] = useState('')
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)

  useEffect(() => {
    function gestisciTasto(e) {
      if (e.key === 'Escape') onChiudi()
    }
    window.addEventListener('keydown', gestisciTasto)
    return () => window.removeEventListener('keydown', gestisciTasto)
  }, [onChiudi])

  function gestisciSalvataggio(e) {
    e.preventDefault()

    // In Italia si scrive "78,4" ma i calcoli vogliono "78.4"
    const pesoNumerico = Number(String(peso).replace(',', '.'))
    const bozza = { data, peso: pesoNumerico }

    const problema = validaMisurazione(bozza)
    if (problema) {
      setErrore(problema)
      return
    }

    onSalva(bozza)
  }

  return (
    <div className="velo" onClick={onChiudi}>
      <form
        className="pannello"
        onClick={(e) => e.stopPropagation()}
        onSubmit={gestisciSalvataggio}
      >
        <div className="maniglia" aria-hidden="true" />

        <h2>{inModifica ? 'Correggi pesata' : 'Registra il peso'}</h2>

        <div className="riga-campi">
          <div>
            <label className="etichetta" htmlFor="campo-peso">
              Peso (kg)
            </label>
            {/* inputMode="decimal" fa comparire il tastierino numerico
                su Android, con la virgola gia' disponibile */}
            <input
              id="campo-peso"
              className="campo"
              type="text"
              inputMode="decimal"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="78,4"
              autoFocus
            />
          </div>

          <div>
            <label className="etichetta" htmlFor="campo-data">
              Data
            </label>
            <input
              id="campo-data"
              className="campo"
              type="date"
              value={data}
              max={dataInTesto()} /* impedisce di scegliere una data futura */
              onChange={(e) => setData(e.target.value)}
            />
          </div>
        </div>

        <p className="nota">
          Se hai già registrato una pesata in questa data, il nuovo valore
          sostituisce il precedente.
        </p>

        {errore && <p className="errore">{errore}</p>}

        <div className="pulsantiera">
          <button type="button" className="pulsante" onClick={onChiudi}>
            Annulla
          </button>
          <button type="submit" className="pulsante primario">
            Salva
          </button>
        </div>

        {inModifica && (
          <div className="zona-eliminazione">
            {confermaEliminazione ? (
              <>
                <p className="nota">
                  Eliminare la pesata da {formattaPeso(misurazione.peso)}? Non si può annullare.
                </p>
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
                    onClick={() => onElimina(misurazione.id)}
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
                Elimina questa pesata
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
