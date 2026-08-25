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
export const TIPI_EVENTO = [
  { id: 'allenamento', nome: 'Allenamento', emoji: '🏋️', colore: '#4ea3ff' },
  { id: 'pasto', nome: 'Pasto', emoji: '🍽️', colore: '#3ecf8e' },
]

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
  ]

  return bozza.map(([giorno, tipo, titolo, orario]) => ({
    id: nuovoId(),
    giorno,
    tipo,
    titolo,
    orario,
  }))
}
