/*
  statistichePeso.js
  ---------------------------------------------------------------
  Trasforma l'elenco grezzo delle pesate nei numeri che servono a
  disegnare il grafico e a scrivere i riepiloghi.

  E' tenuto separato dalle schermate apposta: qui non si disegna nulla,
  si fanno solo conti. Cosi' i conti si possono controllare da soli.
*/

import { testoInData, dataInTesto } from './modello.js'

// I tre livelli di ingrandimento del grafico.
// Cambiano DUE cose insieme: quanto indietro si guarda, e quanto
// si riassume. Guardare tre anni pesata per pesata sarebbe illeggibile,
// quindi piu' si allarga lo sguardo, piu' i punti vengono raggruppati.
export const INTERVALLI = [
  {
    id: 'settimane',
    nome: 'Settimane',
    descrizione: 'Ultime 12 settimane, una pesata per punto',
  },
  {
    id: 'mesi',
    nome: 'Mesi',
    descrizione: 'Ultimi 12 mesi, media di ogni mese',
  },
  {
    id: 'anni',
    nome: 'Anni',
    descrizione: 'Tutto lo storico, media di ogni mese',
  },
]

const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const MESI_INTERI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

/**
 * Prepara i punti da disegnare per l'intervallo scelto.
 *
 * @param {Array} misurazioni elenco ordinato dalla piu' vecchia
 * @param {string} intervalloId 'settimane' | 'mesi' | 'anni'
 * @param {Date} adesso passabile dall'esterno per poter fare le prove
 * @returns {{punti:Array, aggregato:boolean, nota:string}}
 */
export function serieDelPeriodo(misurazioni, intervalloId, adesso = new Date()) {
  if (intervalloId === 'settimane') {
    // 12 settimane = 84 giorni. Togliamo 83 perche' oggi conta come primo giorno.
    const inizio = new Date(adesso)
    inizio.setDate(inizio.getDate() - 83)
    const limite = dataInTesto(inizio)

    const dentro = misurazioni.filter((m) => m.data >= limite)

    return {
      aggregato: false,
      nota: '',
      punti: dentro.map((m) => ({
        chiave: m.data,
        // "istante" e' la data trasformata in numero. Serve al grafico per
        // mettere ogni punto nella sua vera posizione nel tempo: se salti
        // tre settimane, nel grafico si vede il buco invece di essere nascosto.
        istante: testoInData(m.data).getTime(),
        etichetta: etichettaGiorno(m.data),
        etichettaEstesa: etichettaGiornoEstesa(m.data),
        valore: m.peso,
        conteggio: 1,
      })),
    }
  }

  if (intervalloId === 'mesi') {
    // Dall'inizio del mese di 11 mesi fa: cosi' i mesi mostrati sono 12.
    const inizio = new Date(adesso.getFullYear(), adesso.getMonth() - 11, 1)
    const limite = dataInTesto(inizio)
    const dentro = misurazioni.filter((m) => m.data >= limite)

    return {
      aggregato: true,
      nota: '',
      punti: raggruppaPerMese(dentro, false),
    }
  }

  // 'anni': tutto lo storico, sempre raggruppato per mese.
  const punti = raggruppaPerMese(misurazioni, true)

  // Se lo storico e' ancora corto, diciamolo invece di far finta
  // che il grafico stia mostrando anni di dati.
  const nota =
    punti.length > 0 && punti.length < 12
      ? `Hai ${punti.length} ${punti.length === 1 ? 'mese' : 'mesi'} di storico: questa vista diventerà più interessante col tempo.`
      : ''

  return { aggregato: true, nota, punti }
}

/**
 * Raggruppa le pesate mese per mese e ne fa la media.
 * @param {boolean} conAnno se true l'etichetta include l'anno
 */
function raggruppaPerMese(misurazioni, conAnno) {
  // Una "mappa" e' un elenco di coppie chiave-valore:
  // qui la chiave e' "2026-08" e il valore sono le pesate di quel mese.
  const perMese = new Map()

  for (const m of misurazioni) {
    const chiave = m.data.slice(0, 7) // da '2026-08-23' prende '2026-08'
    if (!perMese.has(chiave)) perMese.set(chiave, [])
    perMese.get(chiave).push(m.peso)
  }

  // Ordiniamo le chiavi: '2026-01' viene prima di '2026-08' anche come testo.
  const chiaviOrdinate = [...perMese.keys()].sort()

  return chiaviOrdinate.map((chiave) => {
    const pesi = perMese.get(chiave)
    const media = pesi.reduce((somma, p) => somma + p, 0) / pesi.length
    const [anno, mese] = chiave.split('-')
    const indiceMese = Number(mese) - 1

    return {
      chiave,
      // Il mese viene collocato al suo giorno 15, cioe' al centro:
      // e' il punto che rappresenta meglio una media mensile.
      istante: new Date(Number(anno), indiceMese, 15).getTime(),
      etichetta: conAnno
        ? `${MESI_BREVI[indiceMese]} ${anno.slice(2)}`
        : MESI_BREVI[indiceMese],
      etichettaEstesa:
        `${MESI_INTERI[indiceMese]} ${anno} · media di ${pesi.length} ${pesi.length === 1 ? 'pesata' : 'pesate'}`,
      // Arrotondiamo la media a un decimale, come le pesate singole
      valore: Math.round(media * 10) / 10,
      conteggio: pesi.length,
    }
  })
}

function etichettaGiorno(testoData) {
  const d = testoInData(testoData)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function etichettaGiornoEstesa(testoData) {
  const d = testoInData(testoData)
  return `${d.getDate()} ${MESI_INTERI[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * I numeri di riepilogo mostrati sopra il grafico.
 *
 * @param {Array} misurazioni ordinate dalla piu' vecchia alla piu' recente
 */
export function riepilogo(misurazioni) {
  if (misurazioni.length === 0) {
    return { conteggio: 0, ultima: null, precedente: null, prima: null,
             variazioneUltima: null, variazioneTotale: null, minimo: null, massimo: null }
  }

  const ultima = misurazioni[misurazioni.length - 1]
  const precedente = misurazioni.length > 1 ? misurazioni[misurazioni.length - 2] : null
  const prima = misurazioni[0]
  const pesi = misurazioni.map((m) => m.peso)

  return {
    conteggio: misurazioni.length,
    ultima,
    precedente,
    prima,
    // Differenza rispetto alla pesata precedente
    variazioneUltima: precedente ? arrotonda(ultima.peso - precedente.peso) : null,
    // Differenza rispetto alla primissima pesata registrata
    variazioneTotale: misurazioni.length > 1 ? arrotonda(ultima.peso - prima.peso) : null,
    minimo: Math.min(...pesi),
    massimo: Math.max(...pesi),
  }
}

/** Differenza tra il primo e l'ultimo punto effettivamente mostrati nel grafico. */
export function variazioneDelPeriodo(punti) {
  if (punti.length < 2) return null
  return arrotonda(punti[punti.length - 1].valore - punti[0].valore)
}

function arrotonda(numero) {
  return Math.round(numero * 10) / 10
}

/**
 * Calcola i valori delle righe orizzontali del grafico (le "tacche").
 *
 * Due accortezze importanti per non mentire con il grafico:
 *  - l'asse NON parte da zero: su un peso non avrebbe senso, schiaccerebbe
 *    tutto in una linea piatta in cima;
 *  - se le pesate sono tutte molto vicine, allarghiamo comunque la scala
 *    ad almeno 2 kg. Senza questa regola, mezzo etto di oscillazione
 *    riempirebbe tutto il grafico sembrando un crollo.
 *
 * @returns {{minimo:number, massimo:number, tacche:number[]}}
 */
export function scalaVerticale(valori, ampiezzaMinima = 2) {
  if (valori.length === 0) return { minimo: 0, massimo: 1, tacche: [] }

  let minimo = Math.min(...valori)
  let massimo = Math.max(...valori)

  // Allarghiamo fino all'ampiezza minima, restando centrati sui dati
  const ampiezza = massimo - minimo
  if (ampiezza < ampiezzaMinima) {
    const centro = (massimo + minimo) / 2
    minimo = centro - ampiezzaMinima / 2
    massimo = centro + ampiezzaMinima / 2
  } else {
    // Un po' d'aria sopra e sotto, cosi' i punti non toccano i bordi
    const aria = ampiezza * 0.12
    minimo -= aria
    massimo += aria
  }

  // Scegliamo un passo "tondo" tra quelli plausibili per dei chili
  const passi = [0.5, 1, 2, 5, 10, 20]
  const passo = passi.find((p) => (massimo - minimo) / p <= 5) || 50

  // Arrotondiamo gli estremi al passo, cosi' le tacche sono numeri puliti
  const daTacca = Math.floor(minimo / passo) * passo
  const aTacca = Math.ceil(massimo / passo) * passo

  const tacche = []
  // Il +0.0001 evita che un errore di arrotondamento faccia saltare
  // l'ultima tacca (i decimali in informatica non sono mai esatti).
  for (let v = daTacca; v <= aTacca + 0.0001; v += passo) {
    tacche.push(Math.round(v * 100) / 100)
  }

  return { minimo: daTacca, massimo: aTacca, tacche }
}
