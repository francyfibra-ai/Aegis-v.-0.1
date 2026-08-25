/*
  logica.ts
  ---------------------------------------------------------------
  DECIDE QUALI PROMEMORIA VANNO MANDATI ADESSO.

  E' tenuto separato dal resto apposta: qui non si legge il database e
  non si manda nulla: si fanno solo conti su date e orari. Cosi' la
  parte piu' delicata - fusi orari e cambi di giorno - si puo' provare
  da sola, senza aver bisogno di un database o di un telefono.
*/

export interface Evento {
  id: string
  giorno: number // 0 = lunedi' ... 6 = domenica
  tipo: string
  titolo: string
  orario: string // "HH:MM"
}

export interface OraLocale {
  /** 0 = lunedi' ... 6 = domenica */
  giorno: number
  /** "HH:MM" */
  orario: string
  /** "AAAA-MM-GG" */
  data: string
  /** minuti trascorsi dalla mezzanotte di lunedi' (0 - 10079) */
  minutoDellaSettimana: number
}

const MINUTI_IN_UNA_SETTIMANA = 7 * 24 * 60

/*
  Da lunedi' a domenica come li nomina JavaScript in inglese.
  Serve perche' chiedendo la data "come si vede in Italia" otteniamo
  il nome del giorno, non un numero.
*/
const GIORNI_INGLESE = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * Che ora e' adesso, nel fuso orario di una certa persona.
 *
 * Serve perche' il programma gira su un server che ragiona in orario di
 * Greenwich: senza questa conversione, un promemoria delle 19:00
 * italiane partirebbe alle 21:00.
 *
 * @param adesso l'istante corrente
 * @param fusoOrario per esempio 'Europe/Rome'
 */
export function oraLocale(adesso: Date, fusoOrario: string): OraLocale {
  const formato = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoOrario,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  // formatToParts restituisce i pezzi separati, invece di una frase da
  // dover ritagliare: e' l'unico modo affidabile di leggerli.
  const pezzi: Record<string, string> = {}
  for (const p of formato.formatToParts(adesso)) pezzi[p.type] = p.value

  const giorno = GIORNI_INGLESE.indexOf(pezzi.weekday)
  if (giorno < 0) throw new Error('Giorno non riconosciuto: ' + pezzi.weekday)

  // A mezzanotte alcuni sistemi scrivono "24" invece di "00"
  const ore = pezzi.hour === '24' ? '00' : pezzi.hour
  const orario = `${ore}:${pezzi.minute}`

  return {
    giorno,
    orario,
    data: `${pezzi.year}-${pezzi.month}-${pezzi.day}`,
    minutoDellaSettimana: giorno * 24 * 60 + Number(ore) * 60 + Number(pezzi.minute),
  }
}

/** Da "19:00" a 1140 (minuti dalla mezzanotte). */
function minutiDaOrario(orario: string): number {
  const [ore, minuti] = orario.split(':').map(Number)
  return ore * 60 + minuti
}

export interface Dovuto {
  evento: Evento
  /** Quanti minuti fa era previsto. 0 = adesso. */
  ritardoMinuti: number
  /** La data a cui appartiene questa occorrenza, "AAAA-MM-GG". */
  dataOccorrenza: string
}

/**
 * Quali eventi andrebbero notificati in questo momento.
 *
 * LA FINESTRA DI TOLLERANZA
 * Non guardiamo solo "e' esattamente ora?", ma "era previsto negli
 * ultimi N minuti?". Se la sveglia salta qualche giro - il servizio si
 * riavvia, la rete ha un singhiozzo - il promemoria delle 19:00 arriva
 * comunque alle 19:03 invece di andare perso.
 *
 * Oltre la finestra invece si rinuncia: un promemoria del pranzo
 * recapitato a meta' pomeriggio e' solo fastidio.
 *
 * @param eventi tutti gli eventi del piano
 * @param ora l'ora locale della persona
 * @param finestraMinuti quanti minuti di ritardo si accettano
 */
export function eventiDovuti(eventi: Evento[], ora: OraLocale, finestraMinuti = 10): Dovuto[] {
  const dovuti: Dovuto[] = []

  for (const evento of eventi) {
    const minutoEvento = evento.giorno * 24 * 60 + minutiDaOrario(evento.orario)

    /*
      Differenza calcolata "in cerchio" sulla settimana.
      L'aritmetica modulare risolve in una riga i due casi fastidiosi:
      un evento di ieri sera notificato dopo la mezzanotte, e un evento
      di domenica notte con il lunedi' gia' iniziato.
    */
    let ritardo = (ora.minutoDellaSettimana - minutoEvento) % MINUTI_IN_UNA_SETTIMANA
    if (ritardo < 0) ritardo += MINUTI_IN_UNA_SETTIMANA

    if (ritardo <= finestraMinuti) {
      dovuti.push({
        evento,
        ritardoMinuti: ritardo,
        // A quale giorno appartiene questa occorrenza: se un evento delle
        // 23:58 viene notificato alle 00:03, appartiene a ieri, non a oggi.
        dataOccorrenza: dataMenoMinuti(ora.data, ritardo, ora.orario),
      })
    }
  }

  // Prima i piu' in ritardo: se ne sono accumulati, escono in ordine di orario
  return dovuti.sort((a, b) => b.ritardoMinuti - a.ritardoMinuti)
}

/**
 * Data di appartenenza dell'occorrenza: si torna indietro di "ritardo"
 * minuti a partire dall'ora locale, e si guarda in che giorno si finisce.
 */
function dataMenoMinuti(data: string, ritardoMinuti: number, orario: string): string {
  const minutiOra = minutiDaOrario(orario)
  if (ritardoMinuti <= minutiOra) return data // stesso giorno, nessun salto

  // Si e' passata la mezzanotte: l'occorrenza e' del giorno prima
  const [anno, mese, giorno] = data.split('-').map(Number)
  // Costruita in UTC apposta: qui contiamo giorni sul calendario, non
  // istanti nel tempo, e l'ora legale non deve entrarci.
  const d = new Date(Date.UTC(anno, mese - 1, giorno))
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Il testo della notifica.
 *
 * Il nome non e' cortesia: una notifica che ti chiama per nome si
 * distingue a colpo d'occhio dalle decine di altre sulla schermata.
 */
export function componiNotifica(dovuto: Dovuto, nome: string, orarioPrevisto: string) {
  const { evento } = dovuto
  const chiamata = nome ? `${nome}, ` : ''

  const titolo =
    evento.tipo === 'peso'
      ? `${chiamata}è il momento della pesata`
      : `${chiamata}sono le ${orarioPrevisto}`

  return {
    titolo,
    testo: evento.titolo,
    eventoId: evento.id,
    tipo: evento.tipo,
    data: dovuto.dataOccorrenza,
  }
}
