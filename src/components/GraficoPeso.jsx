/*
  GraficoPeso.jsx
  ---------------------------------------------------------------
  Il grafico dell'andamento del peso.

  E' disegnato a mano in SVG, senza librerie esterne. Sembra piu' lavoro,
  ma vuol dire: nessuna dipendenza da aggiornare, app piu' leggera da
  scaricare, e ogni riga qui dentro e' modificabile senza studiare
  il manuale di qualcun altro.

  SCELTE DI LETTURA (non sono estetiche, servono a non mentire):
   - L'asse verticale NON parte da zero. Su un peso non avrebbe senso:
     schiaccerebbe ogni variazione in una riga piatta in cima.
   - L'asse orizzontale rispetta le date vere. Se salti tre settimane,
     nel grafico si vede il buco.
   - Se le pesate sono quasi identiche, la scala resta larga almeno 2 kg
     (vedi scalaVerticale): mezzo etto non deve sembrare un crollo.
   - Un solo numero e' scritto sul grafico, quello finale. Scriverli tutti
     e' rumore che nessuno legge: gli altri stanno nelle tacche, nel
     riquadro che compare al tocco, e nell'elenco sotto al grafico.
*/
import { useEffect, useRef, useState } from 'react'
import { formattaPeso } from '../lib/modello.js'
import { scalaVerticale } from '../lib/statistichePeso.js'

// Spazi attorno all'area disegnata, in pixel.
// Quello a destra NON e' fisso: dipende da quanto e' lunga l'etichetta
// finale ("80,5 kg" occupa meno di "102,5 kg"). Se fosse fisso, prima o
// poi l'ultima scritta verrebbe tagliata a meta'.
const MARGINE = { sopra: 20, sotto: 24, sinistra: 36 }
const ALTEZZA_AREA = 168 // altezza della sola zona dei dati

// Larghezza media di un carattere dell'etichetta finale (12px, semi-grassetto).
// Serve a prenotare lo spazio giusto PRIMA di disegnare.
const LARGHEZZA_CARATTERE = 7.4
const STACCO_ETICHETTA = 9 // distanza tra l'ultimo pallino e la sua scritta

// Colore della superficie su cui poggia il grafico: serve per gli anelli
// attorno ai pallini, che li rendono leggibili quando si sovrappongono.
const COLORE_SUPERFICIE = '#17222e'

export default function GraficoPeso({ punti, colore = '#d95926' }) {
  const contenitore = useRef(null)
  const [larghezza, setLarghezza] = useState(320)

  // Quale punto e' evidenziato: dal tocco, dal mouse o dalle frecce
  // della tastiera. null = nessuno.
  const [indiceAttivo, setIndiceAttivo] = useState(null)

  // Misura la larghezza disponibile e la riaggiorna se lo schermo cambia
  // (rotazione del telefono, finestra ridimensionata). Serve per disegnare
  // alla dimensione reale: cosi' le scritte restano nitide e della
  // stessa misura a qualunque larghezza.
  useEffect(() => {
    const elemento = contenitore.current
    if (!elemento) return

    const osservatore = new ResizeObserver((voci) => {
      const nuova = voci[0]?.contentRect?.width
      if (nuova) setLarghezza(nuova)
    })
    osservatore.observe(elemento)
    return () => osservatore.disconnect()
  }, [])

  const altezzaTotale = ALTEZZA_AREA + MARGINE.sopra + MARGINE.sotto

  // Quanto spazio serve a destra per l'etichetta dell'ultimo valore
  const etichettaFinale = punti.length ? formattaPeso(punti[punti.length - 1].valore) : ''
  const larghezzaEtichetta = etichettaFinale.length * LARGHEZZA_CARATTERE

  // Lo spazio richiesto, ma senza mai mangiarsi piu' di un quarto del grafico:
  // su uno schermo molto stretto e' meglio spostare la scritta sopra il punto
  // (vedi "etichettaSopra" piu' avanti) che restare senza spazio per i dati.
  const spazioRichiesto = Math.ceil(larghezzaEtichetta + STACCO_ETICHETTA + 4)
  const margineDestra = Math.min(spazioRichiesto, Math.round(larghezza * 0.25))
  const etichettaSopra = margineDestra < spazioRichiesto

  const larghezzaArea = Math.max(60, larghezza - MARGINE.sinistra - margineDestra)

  // --- Scala verticale: da quale a quale peso, e dove mettere le righe
  const valori = punti.map((p) => p.valore)
  const scala = scalaVerticale(valori)

  /** Da un peso alla sua altezza in pixel (in alto i pesi maggiori). */
  function y(valore) {
    const quota = (valore - scala.minimo) / (scala.massimo - scala.minimo || 1)
    return MARGINE.sopra + ALTEZZA_AREA - quota * ALTEZZA_AREA
  }

  // --- Scala orizzontale: dalla prima all'ultima data
  const primoIstante = punti[0]?.istante ?? 0
  const ultimoIstante = punti[punti.length - 1]?.istante ?? 1
  const durata = ultimoIstante - primoIstante

  /** Da un istante alla sua posizione orizzontale in pixel. */
  function x(istante) {
    // Se c'e' un solo punto (o tutti nello stesso istante) lo mettiamo al centro
    if (durata <= 0) return MARGINE.sinistra + larghezzaArea / 2
    return MARGINE.sinistra + ((istante - primoIstante) / durata) * larghezzaArea
  }

  const coordinate = punti.map((p) => ({ ...p, cx: x(p.istante), cy: y(p.valore) }))

  // --- Le due forme disegnate: la linea e la sfumatura sotto
  const percorsoLinea = coordinate
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`)
    .join(' ')

  const fondo = MARGINE.sopra + ALTEZZA_AREA
  const percorsoArea =
    coordinate.length > 1
      ? `${percorsoLinea} L ${coordinate[coordinate.length - 1].cx.toFixed(1)} ${fondo} L ${coordinate[0].cx.toFixed(1)} ${fondo} Z`
      : ''

  // --- Etichette sull'asse orizzontale, senza sovrapposizioni.
  // Ne disegniamo una solo se dista abbastanza dalla precedente.
  const etichetteX = []
  let ultimaX = -Infinity
  coordinate.forEach((p, i) => {
    const ultimo = i === coordinate.length - 1
    if (p.cx - ultimaX >= 52 || ultimo) {
      // L'ultima ha la precedenza: se e' troppo vicina alla penultima,
      // togliamo la penultima invece di sovrapporle.
      if (ultimo && etichetteX.length && p.cx - etichetteX[etichetteX.length - 1].cx < 52) {
        etichetteX.pop()
      }
      etichetteX.push(p)
      ultimaX = p.cx
    }
  })

  const attivo = indiceAttivo !== null ? coordinate[indiceAttivo] : null
  const finale = coordinate[coordinate.length - 1]

  /** Trova il punto piu' vicino alla posizione orizzontale del dito/mouse. */
  function puntoPiuVicino(clientX) {
    const rettangolo = contenitore.current.getBoundingClientRect()
    const posizione = clientX - rettangolo.left

    let migliore = 0
    let distanzaMinima = Infinity
    coordinate.forEach((p, i) => {
      const distanza = Math.abs(p.cx - posizione)
      if (distanza < distanzaMinima) {
        distanzaMinima = distanza
        migliore = i
      }
    })
    return migliore
  }

  function gestisciPuntatore(e) {
    if (coordinate.length === 0) return
    setIndiceAttivo(puntoPiuVicino(e.clientX))
  }

  function gestisciTastiera(e) {
    if (coordinate.length === 0) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const passo = e.key === 'ArrowRight' ? 1 : -1
      const partenza = indiceAttivo === null ? (passo > 0 ? -1 : coordinate.length) : indiceAttivo
      const nuovo = Math.min(coordinate.length - 1, Math.max(0, partenza + passo))
      setIndiceAttivo(nuovo)
    }
    if (e.key === 'Escape') setIndiceAttivo(null)
  }

  // Il riquadro informativo non deve uscire dai bordi del grafico
  const sinistraRiquadro = attivo
    ? Math.min(Math.max(attivo.cx, 62), larghezza - 62)
    : 0

  return (
    <div
      className="grafico"
      ref={contenitore}
      tabIndex={0}
      role="img"
      aria-label={
        coordinate.length
          ? `Andamento del peso: ${coordinate.length} punti, da ${formattaPeso(coordinate[0].valore)} a ${formattaPeso(finale.valore)}. L'elenco completo delle pesate è sotto al grafico.`
          : 'Grafico del peso, ancora senza dati.'
      }
      onPointerMove={gestisciPuntatore}
      onPointerDown={gestisciPuntatore}
      onPointerLeave={() => setIndiceAttivo(null)}
      onKeyDown={gestisciTastiera}
      onBlur={() => setIndiceAttivo(null)}
    >
      <svg width={larghezza} height={altezzaTotale} style={{ display: 'block' }}>
        {/* --- Righe orizzontali di riferimento e relativi valori --- */}
        {scala.tacche.map((tacca) => (
          <g key={tacca}>
            <line
              x1={MARGINE.sinistra}
              x2={MARGINE.sinistra + larghezzaArea}
              y1={y(tacca)}
              y2={y(tacca)}
              className="griglia"
            />
            <text x={MARGINE.sinistra - 7} y={y(tacca) + 3.5} className="tacca-y">
              {tacca.toLocaleString('it-IT')}
            </text>
          </g>
        ))}

        {/* --- La sfumatura sotto la linea: una velatura, non un blocco pieno --- */}
        {percorsoArea && <path d={percorsoArea} fill={colore} opacity="0.1" />}

        {/* --- La linea --- */}
        {coordinate.length > 1 && (
          <path
            d={percorsoLinea}
            fill="none"
            stroke={colore}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* --- Riga verticale che segue il dito --- */}
        {attivo && (
          <line
            x1={attivo.cx}
            x2={attivo.cx}
            y1={MARGINE.sopra}
            y2={fondo}
            className="mirino"
          />
        )}

        {/* --- I pallini. L'anello del colore dello sfondo li tiene
                leggibili anche quando si sovrappongono alla linea. --- */}
        {coordinate.map((p, i) => (
          <circle
            key={p.chiave}
            cx={p.cx}
            cy={p.cy}
            r={indiceAttivo === i ? 5.5 : 4}
            fill={colore}
            stroke={COLORE_SUPERFICIE}
            strokeWidth="2"
          />
        ))}

        {/* --- L'unico valore scritto sul grafico: quello finale.
                Di norma sta a destra dell'ultimo pallino; se lo schermo
                e' troppo stretto passa sopra, per non venire tagliato. --- */}
        {finale && !attivo && (
          <text
            x={etichettaSopra ? finale.cx : finale.cx + STACCO_ETICHETTA}
            y={etichettaSopra ? finale.cy - 12 : finale.cy + 4}
            textAnchor={etichettaSopra ? 'end' : 'start'}
            className="valore-finale"
          >
            {etichettaFinale}
          </text>
        )}

        {/* --- Etichette delle date, in basso --- */}
        {etichetteX.map((p) => (
          <text key={p.chiave} x={p.cx} y={altezzaTotale - 7} className="tacca-x">
            {p.etichetta}
          </text>
        ))}
      </svg>

      {/* --- Riquadro con i dettagli del punto toccato --- */}
      {attivo && (
        <div className="riquadro-grafico" style={{ left: sinistraRiquadro }}>
          <strong>{formattaPeso(attivo.valore)}</strong>
          <span>{attivo.etichettaEstesa}</span>
        </div>
      )}
    </div>
  )
}
