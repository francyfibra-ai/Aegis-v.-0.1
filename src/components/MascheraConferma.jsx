/*
  MascheraConferma.jsx
  ---------------------------------------------------------------
  La maschera che compare sopra l'app e chiede: "l'hai fatto?"

  Compare in due casi, con lo stesso aspetto:
   1. tocchi una notifica: si apre Aegis e la maschera mostra
      subito QUELL'evento;
   2. apri Aegis da solo: la maschera mostra gli eventi di oggi
      il cui orario e' gia' passato e a cui non hai ancora risposto.
      Cosi' la conferma non va persa anche se la notifica l'hai ignorata.

  Se ce ne sono piu' d'uno, si passano uno alla volta, e in alto
  c'e' scritto quanti ne restano.

  "Più tardi" chiude la maschera senza registrare niente: tornera'
  alla prossima apertura dell'app. A mezzanotte la giornata si chiude
  e gli eventi senza risposta restano vuoti nello storico, come prima.

  Toccare lo sfondo NON chiude la maschera: una risposta mancata per
  un tocco distratto e' proprio quello che vogliamo evitare.
*/
import { useEffect, useState } from 'react'
import { tipoEvento, ordinaPerOrario, giornoDiOggi, dataInTesto } from '../lib/modello.js'
import { salvaRisposta } from '../lib/archivio.js'
import { usaEventi, usaRisposte, usaMisurazioni } from '../lib/hooks.js'

/** L'ora attuale in formato "HH:MM", confrontabile con evento.orario. */
function oraAttuale() {
  const adesso = new Date()
  return (
    String(adesso.getHours()).padStart(2, '0') + ':' + String(adesso.getMinutes()).padStart(2, '0')
  )
}

/**
 * Tiene il conto delle "aperture" dell'app: aumenta ogni volta che
 * Aegis torna in primo piano dopo essere stata nascosta.
 * Serve a far ricomparire la maschera rimandata con "Più tardi".
 */
function usaAperture() {
  const [aperture, setAperture] = useState(0)
  useEffect(() => {
    function cambioVisibilita() {
      if (document.visibilityState === 'visible') setAperture((n) => n + 1)
    }
    document.addEventListener('visibilitychange', cambioVisibilita)
    return () => document.removeEventListener('visibilitychange', cambioVisibilita)
  }, [])
  return aperture
}

/**
 * Un orologio che scatta ogni minuto: se l'app resta aperta, un evento
 * appena scattato entra nella maschera senza dover ricaricare.
 */
function usaMinuto() {
  const [minuto, setMinuto] = useState(oraAttuale())
  useEffect(() => {
    const timer = setInterval(() => setMinuto(oraAttuale()), 30 * 1000)
    return () => clearInterval(timer)
  }, [])
  return minuto
}

/**
 * @param eventoDaNotifica { id, n } oppure null. "n" cambia a ogni tocco
 *        su una notifica, cosi' la maschera si riapre anche se era stata
 *        rimandata o se tocchi due volte la notifica dello stesso evento.
 * @param nascosta true mentre sei nella schermata Peso: li' stai gia'
 *        registrando, una maschera sopra sarebbe d'intralcio.
 * @param onRegistraPeso porta al campo per scrivere i chili.
 */
export default function MascheraConferma({ eventoDaNotifica, nascosta, onRegistraPeso }) {
  const { eventi, caricamento: caricoEventi } = usaEventi()
  const { risposte, caricamento: caricoRisposte } = usaRisposte()
  const { misurazioni } = usaMisurazioni()

  const aperture = usaAperture()
  const ora = usaMinuto()
  const oggi = giornoDiOggi()
  const dataDiOggi = dataInTesto()

  // Rimandata con "Più tardi": resta chiusa fino alla prossima apertura.
  // Una notifica toccata la riapre comunque: e' una richiesta esplicita.
  const [rimandataA, setRimandataA] = useState(null)
  const rimandata = rimandataA === aperture + '|' + (eventoDaNotifica?.n ?? 0)

  const [errore, setErrore] = useState('')
  const [inSalvataggio, setInSalvataggio] = useState(false)

  if (nascosta || caricoEventi || caricoRisposte || rimandata) return null

  const risposteDiOggi = new Set(risposte.filter((r) => r.data === dataDiOggi).map((r) => r.evento))
  const pesoRegistratoOggi = misurazioni.some((m) => m.data === dataDiOggi)

  // Ha gia' avuto risposta? Per il peso, la "risposta" e' la pesata di oggi.
  const risposto = (evento) =>
    evento.tipo === 'peso' ? pesoRegistratoOggi : risposteDiOggi.has(evento.id)

  // Gli eventi di oggi gia' scattati e ancora senza risposta, in ordine d'orario.
  let inAttesa = ordinaPerOrario(
    eventi.filter((e) => e.giorno === oggi && e.orario <= ora && !risposto(e))
  )

  // Arrivando da una notifica, quell'evento va per primo.
  const idNotifica = eventoDaNotifica?.id
  if (idNotifica) {
    const daNotifica = eventi.find((e) => e.id === idNotifica)
    if (daNotifica && daNotifica.giorno === oggi && !risposto(daNotifica)) {
      inAttesa = [daNotifica, ...inAttesa.filter((e) => e.id !== idNotifica)]
    }
  }

  if (inAttesa.length === 0) return null

  const evento = inAttesa[0]
  const tipo = tipoEvento(evento.tipo)
  const totale = inAttesa.length

  async function rispondi(stato) {
    setInSalvataggio(true)
    try {
      await salvaRisposta({ evento: evento.id, titolo: evento.titolo, data: dataDiOggi, stato })
      setErrore('')
    } catch (e) {
      setErrore(e.message)
    } finally {
      setInSalvataggio(false)
    }
  }

  function piuTardi() {
    setRimandataA(aperture + '|' + (eventoDaNotifica?.n ?? 0))
  }

  return (
    <div className="velo velo-conferma" role="dialog" aria-modal="true" aria-labelledby="titolo-conferma">
      <div className="maschera-conferma">
        <p className="nota conferma-contatore">
          {totale > 1 ? `Da confermare · ancora ${totale}` : 'Da confermare'}
        </p>

        <div className="conferma-evento" style={{ '--colore-tipo': tipo.colore }}>
          <span className="conferma-emoji" aria-hidden="true">{tipo.emoji}</span>
          <h2 id="titolo-conferma">{evento.titolo}</h2>
          <p className="nota">
            {tipo.nome} · oggi alle {evento.orario}
          </p>
        </div>

        <p className="conferma-domanda">
          {evento.tipo === 'peso' ? 'Ti sei pesato?' : 'L’hai fatto?'}
        </p>

        {errore && <p className="errore">{errore}</p>}

        {evento.tipo === 'peso' ? (
          <div className="conferma-pulsanti">
            <button className="conferma-pulsante fatto" onClick={() => onRegistraPeso?.()}>
              ⚖️ Registra il peso
            </button>
          </div>
        ) : (
          <div className="conferma-pulsanti">
            <button
              className="conferma-pulsante fatto"
              onClick={() => rispondi('fatto')}
              disabled={inSalvataggio}
            >
              ✓ Fatto
            </button>
            <button
              className="conferma-pulsante saltato"
              onClick={() => rispondi('saltato')}
              disabled={inSalvataggio}
            >
              × Saltato
            </button>
          </div>
        )}

        <button className="conferma-dopo" onClick={piuTardi}>
          Più tardi
        </button>
      </div>
    </div>
  )
}
