/*
  modello.js
  ---------------------------------------------------------------
  Qui e' descritta la FORMA dei dati di Aegis: com'e' fatto un evento,
  quali giorni esistono, quali tipi di evento sono ammessi.

  E' il punto di riferimento del progetto: se un domani vogliamo
  aggiungere un campo a un evento (per esempio "durata"), si comincia
  da qui.
*/

// --- I giorni della settimana -----------------------------------------
// Usiamo numeri da 0 a 6 con 0 = lunedi', perche' e' l'ordine con cui
// pensiamo alla settimana in Italia.
// ATTENZIONE: JavaScript, di suo, usa 0 = domenica. Per questo piu' sotto
// c'e' una funzione che fa la conversione. Non farlo a mano.
export const GIORNI = [
  { numero: 0, nome: 'Lunedì', breve: 'Lun' },
  { numero: 1, nome: 'Martedì', breve: 'Mar' },
  { numero: 2, nome: 'Mercoledì', breve: 'Mer' },
  { numero: 3, nome: 'Giovedì', breve: 'Gio' },
  { numero: 4, nome: 'Venerdì', breve: 'Ven' },
  { numero: 5, nome: 'Sabato', breve: 'Sab' },
  { numero: 6, nome: 'Domenica', breve: 'Dom' },
]

// --- I tipi di evento --------------------------------------------------
// Per aggiungere un tipo in futuro (es. "integratore", "sonno")
// basta aggiungere una riga qui: l'interfaccia si adegua da sola.
// Il campo "richiedeMisura" distingue i due comportamenti:
//  - false -> alla notifica si risponde "Fatto" o "Saltato"
//  - true  -> alla notifica si risponde inserendo un NUMERO (i chili)
//
// I colori non sono scelti a occhio: sono i primi tre di una palette
// verificata, gli unici che restano distinguibili anche per chi ha
// difficolta' a percepire i colori. Non cambiarli a caso.
export const TIPI_EVENTO = [
  { id: 'allenamento', nome: 'Allenamento', emoji: '🏋️', colore: '#3987e5', richiedeMisura: false },
  { id: 'pasto', nome: 'Pasto', emoji: '🍽️', colore: '#199e70', richiedeMisura: false },
  { id: 'peso', nome: 'Peso', emoji: '⚖️', colore: '#d95926', richiedeMisura: true },
]

// Colori di stato, usati per dire "stai andando nella direzione giusta".
// Non vengono MAI usati da soli: accanto c'e' sempre una freccia e una scritta,
// altrimenti chi non distingue i colori non capirebbe.
export const COLORI_STATO = {
  bene: '#0ca30c',
  male: '#d03b3b',
  neutro: '#8fa3b5',
}

/**
 * Restituisce le informazioni di un tipo di evento a partire dal suo id.
 * Se l'id non esiste (dato vecchio o corrotto) torna comunque qualcosa
 * di sensato, cosi' l'app non si rompe.
 */
export function tipoEvento(id) {
  return (
    TIPI_EVENTO.find((t) => t.id === id) || {
      id,
      nome: id,
      emoji: '•',
      colore: '#8fa3b5',
    }
  )
}

/**
 * Converte il giorno "alla JavaScript" (0 = domenica) nel nostro
 * (0 = lunedi'). Serve ogni volta che leggiamo la data di oggi.
 */
export function giornoDaDataJs(data = new Date()) {
  const giornoJs = data.getDay() // 0 = domenica, 1 = lunedi', ...
  return (giornoJs + 6) % 7 // sposta tutto in modo che lunedi' diventi 0
}

/**
 * Il numero del giorno di oggi, nella nostra numerazione.
 */
export function giornoDiOggi() {
  return giornoDaDataJs(new Date())
}

/**
 * LA FORMA DI UN EVENTO
 * ---------------------
 * {
 *   id:      'evt_abc123'        identificativo unico, generato da noi
 *   giorno:  0                   0 = lunedi' ... 6 = domenica
 *   tipo:    'allenamento'       vedi TIPI_EVENTO
 *   titolo:  'Petto e tricipiti' testo libero
 *   orario:  '19:00'             sempre in formato 24 ore "HH:MM"
 * }
 *
 * Nota: e' un elenco "piatto" di eventi, ognuno con dentro il proprio
 * giorno, invece di sette liste separate. E' la forma che si trasferisce
 * senza modifiche in una tabella di database (Fase 3): una riga = un evento.
 */

/**
 * Genera un identificativo unico per un nuovo evento.
 * Usa lo strumento del browser quando disponibile; altrimenti ripiega
 * su una combinazione di data e numero casuale (succede solo aprendo
 * l'app da un indirizzo non sicuro, tipo in fase di prova sulla rete di casa).
 */
export function nuovoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'evt_' + crypto.randomUUID()
  }
  return 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * Controlla che un evento sia compilato correttamente.
 * @returns {string|null} il messaggio d'errore, oppure null se va tutto bene.
 */
export function validaEvento(evento) {
  if (!evento.titolo || !evento.titolo.trim()) {
    return 'Scrivi un titolo (es. "Petto e tricipiti").'
  }
  if (!/^\d{2}:\d{2}$/.test(evento.orario || '')) {
    return "Scegli un orario."
  }
  if (!TIPI_EVENTO.some((t) => t.id === evento.tipo)) {
    return 'Scegli il tipo di evento.'
  }
  if (!Number.isInteger(evento.giorno) || evento.giorno < 0 || evento.giorno > 6) {
    return 'Giorno non valido.'
  }
  return null
}

/**
 * Ordina una lista di eventi per orario crescente.
 * Funziona confrontando le stringhe perche' "HH:MM" a 24 ore
 * si ordina alfabeticamente esattamente come si ordina nel tempo
 * ("08:30" viene prima di "19:00").
 */
export function ordinaPerOrario(eventi) {
  return [...eventi].sort((a, b) => a.orario.localeCompare(b.orario))
}

/**
 * LA FORMA DI UNA MISURAZIONE DI PESO
 * -----------------------------------
 * {
 *   id:    'msr_abc123'
 *   data:  '2026-08-23'    giorno della pesata, in formato anno-mese-giorno
 *   peso:  78.4            in chilogrammi, con al massimo un decimale
 * }
 *
 * Sta in un elenco separato dagli eventi del piano: il piano dice QUANDO
 * pesarsi, le misurazioni dicono QUANTO pesavi.
 */

/** Genera un identificativo unico per una misurazione. */
export function nuovoIdMisurazione() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'msr_' + crypto.randomUUID()
  }
  return 'msr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * Trasforma una data in testo nel formato che usiamo per salvarla.
 * Lo facciamo a mano invece di usare toISOString() perche' quello
 * converte in orario di Greenwich e in Italia puo' far slittare
 * la data al giorno prima.
 */
export function dataInTesto(data = new Date()) {
  const anno = data.getFullYear()
  const mese = String(data.getMonth() + 1).padStart(2, '0')
  const giorno = String(data.getDate()).padStart(2, '0')
  return `${anno}-${mese}-${giorno}`
}

/**
 * Il contrario: da '2026-08-23' a una data vera.
 * La "T00:00:00" serve a farla interpretare come mezzanotte LOCALE
 * e non come orario di Greenwich (stesso problema di prima).
 */
export function testoInData(testo) {
  return new Date(testo + 'T00:00:00')
}

/** Scrive un peso in modo leggibile: 78.4 -> "78,4 kg" */
export function formattaPeso(kg, conUnita = true) {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return '—'
  const numero = Number(kg).toLocaleString('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return conUnita ? numero + ' kg' : numero
}

/** Scrive una differenza col segno: -0.6 -> "−0,6 kg", 0 -> "invariato" */
export function formattaVariazione(kg) {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return '—'
  const arrotondato = Math.round(kg * 10) / 10
  if (arrotondato === 0) return 'invariato'
  const segno = arrotondato > 0 ? '+' : '−' // "−" e' il vero segno meno, piu' leggibile del trattino
  return segno + formattaPeso(Math.abs(arrotondato))
}

/**
 * Controlla che una misurazione sia sensata.
 * @returns {string|null} messaggio d'errore, oppure null se va bene
 */
export function validaMisurazione({ data, peso }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) return 'Scegli una data.'
  const numero = Number(peso)
  if (!Number.isFinite(numero)) return 'Scrivi il peso in chili (es. 78,4).'
  // Limiti larghi: servono solo a intercettare un errore di battitura
  // (una virgola nel posto sbagliato), non a giudicare nessuno.
  if (numero < 20 || numero > 400) return 'Il peso deve essere tra 20 e 400 kg.'
  if (testoInData(data) > new Date()) return 'Non puoi registrare una pesata futura.'
  return null
}

/**
 * L'obiettivo dichiarato dall'utente. Serve SOLO a decidere se colorare
 * di verde o di rosso una variazione: senza obiettivo l'app non da'
 * giudizi, mostra il numero e basta.
 */
export const OBIETTIVI = [
  { id: 'nessuno', nome: 'Nessuno', descrizione: "Mostra i numeri senza giudicarli" },
  { id: 'perdere', nome: 'Perdere', descrizione: 'Scendere è positivo' },
  { id: 'mantenere', nome: 'Mantenere', descrizione: 'Restare stabile è positivo' },
  { id: 'aumentare', nome: 'Aumentare', descrizione: 'Salire è positivo' },
]

/**
 * Dato un obiettivo e una variazione, dice se e' un progresso.
 * @returns {'bene'|'male'|'neutro'}
 */
export function giudicaVariazione(variazione, obiettivo) {
  if (obiettivo === 'nessuno' || variazione === null || variazione === undefined) return 'neutro'

  const v = Math.round(variazione * 10) / 10
  if (v === 0) return obiettivo === 'mantenere' ? 'bene' : 'neutro'

  if (obiettivo === 'perdere') return v < 0 ? 'bene' : 'male'
  if (obiettivo === 'aumentare') return v > 0 ? 'bene' : 'male'
  // "mantenere": va bene finche' lo scostamento resta sotto il mezzo chilo
  if (obiettivo === 'mantenere') return Math.abs(v) <= 0.5 ? 'bene' : 'male'
  return 'neutro'
}

/**
 * Un piano settimanale di esempio, da caricare al primo avvio
 * per capire subito come funziona. E' pensato per essere modificato.
 */
export function pianoDiEsempio() {
  const bozza = [
    // giorno, tipo, titolo, orario
    [0, 'pasto', 'Colazione proteica', '07:30'],
    [0, 'pasto', 'Pranzo: pollo e riso', '13:00'],
    [0, 'allenamento', 'Petto e tricipiti', '19:00'],
    [0, 'pasto', 'Cena leggera', '21:00'],

    [1, 'pasto', 'Colazione proteica', '07:30'],
    [1, 'pasto', 'Pranzo: pesce e verdure', '13:00'],
    [1, 'pasto', 'Cena leggera', '21:00'],

    [2, 'pasto', 'Colazione proteica', '07:30'],
    [2, 'allenamento', 'Schiena e bicipiti', '19:00'],
    [2, 'pasto', 'Cena leggera', '21:00'],

    [3, 'pasto', 'Colazione proteica', '07:30'],
    [3, 'pasto', 'Pranzo: pollo e riso', '13:00'],
    [3, 'pasto', 'Cena leggera', '21:00'],

    [4, 'pasto', 'Colazione proteica', '07:30'],
    [4, 'allenamento', 'Gambe e spalle', '19:00'],
    [4, 'pasto', 'Cena leggera', '21:00'],

    [5, 'allenamento', 'Corsa leggera', '10:00'],
    [5, 'pasto', 'Pranzo libero', '13:30'],

    [6, 'pasto', 'Pranzo in famiglia', '13:00'],
    // Il controllo del peso: una volta a settimana, la domenica mattina.
    // La domenica perche' sei a casa senza fretta, e per un grafico leggibile
    // conta piu' la costanza delle condizioni che il giorno scelto.
    // Se preferisci il lunedi', basta toccare l'evento e cambiare giorno.
    [6, 'peso', 'Controllo peso', '08:00'],
  ]

  return bozza.map(([giorno, tipo, titolo, orario]) => ({
    id: nuovoId(),
    giorno,
    tipo,
    titolo,
    orario,
  }))
}
