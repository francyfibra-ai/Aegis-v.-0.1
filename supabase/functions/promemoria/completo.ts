/*
  AEGIS - funzione "promemoria", versione da incollare
  ---------------------------------------------------------------
  ⚠️ NON MODIFICARE QUESTO FILE A MANO.

  E' generato unendo i tre file in supabase/functions/promemoria/.
  Per cambiare qualcosa si modificano quelli e si rilancia:
      node supabase/unisci-funzione.mjs

  Da incollare nel pannello Supabase, sezione Edge Functions,
  in una funzione chiamata "promemoria".
*/

/* ============ da webpush.ts ============ */

/*
  webpush.ts
  ---------------------------------------------------------------
  Prepara e invia una notifica push secondo lo standard Web Push.

  PERCHE' SCRITTO A MANO E NON CON UNA LIBRERIA
  Esistono librerie che fanno questo lavoro, ma nell'ambiente in cui e'
  stato sviluppato Aegis non erano raggiungibili, quindi non sarebbe
  stato possibile provarle prima di consegnarle. Questo file usa solo
  funzioni crittografiche standard, presenti sia in Deno (dove gira) sia
  in Node (dove e' stato provato): la stessa identica implementazione e'
  stata verificata prima di essere messa in funzione.

  COSA SUCCEDE, IN BREVE
  Il contenuto della notifica viene cifrato in modo che nemmeno Google,
  che la trasporta, possa leggerlo: solo il tuo telefono ha la chiave per
  aprirla. La firma VAPID serve all'altro scopo, opposto: dimostrare a
  Google che chi manda e' davvero Aegis.

  Riferimenti: RFC 8291 (cifratura) e RFC 8292 (firma VAPID).
*/

/*
  Una sequenza di byte "vera", cioe' appoggiata a una memoria normale.
  L'annotazione esplicita serve perche' le funzioni crittografiche
  rifiutano le sequenze appoggiate a memoria condivisa tra processi,
  che noi non usiamo mai ma che il compilatore non puo' escludere da
  solo. Senza questa riga, Deno rifiuterebbe di pubblicare la funzione.
*/
type Byte = Uint8Array<ArrayBuffer>

/* ------------------------------------------------------------------
   Conversioni tra testo e byte
   ------------------------------------------------------------------ */

/** base64url -> byte. E' il base64 senza i caratteri scomodi negli indirizzi. */
function daBase64Url(testo: string): Byte {
  const base64 = testo.replace(/-/g, '+').replace(/_/g, '/')
  // Reintegra il riempimento finale che il base64url omette
  const conRiempimento = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binario = atob(conRiempimento)
  const byte = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) byte[i] = binario.charCodeAt(i)
  return byte
}

/** byte -> base64url */
function aBase64Url(byte: Byte): string {
  let binario = ''
  for (const b of byte) binario += String.fromCharCode(b)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Attacca piu' sequenze di byte una dopo l'altra. */
function unisci(...pezzi: Byte[]): Byte {
  const totale = pezzi.reduce((s, p) => s + p.length, 0)
  const risultato = new Uint8Array(totale)
  let posizione = 0
  for (const pezzo of pezzi) {
    risultato.set(pezzo, posizione)
    posizione += pezzo.length
  }
  return risultato
}

const testoInByte = (s: string): Byte => new TextEncoder().encode(s) as Byte

/* ------------------------------------------------------------------
   HKDF: da un segreto grezzo si ricavano chiavi utilizzabili
   ------------------------------------------------------------------ */

/** Primo passo: "concentra" il materiale grezzo in una chiave intermedia. */
async function hkdfEstrai(sale: Byte, materiale: Byte): Promise<Byte> {
  const chiave = await crypto.subtle.importKey('raw', sale, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', chiave, materiale))
}

/**
 * Secondo passo: dalla chiave intermedia si ricava la chiave finale,
 * di lunghezza voluta e legata a uno scopo preciso ("info").
 * Ci servono sempre meno di 32 byte, quindi basta un solo giro.
 */
async function hkdfEspandi(prk: Byte, info: Byte, lunghezza: number): Promise<Byte> {
  const chiave = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const blocco = new Uint8Array(await crypto.subtle.sign('HMAC', chiave, unisci(info, new Uint8Array([1]))))
  return blocco.subarray(0, lunghezza)
}

/* ------------------------------------------------------------------
   Cifratura del contenuto (RFC 8291, formato aes128gcm)
   ------------------------------------------------------------------ */

interface Iscrizione {
  endpoint: string
  chiavi: { p256dh: string; auth: string }
}

/**
 * Cifra un messaggio per un preciso telefono.
 *
 * @param testo il contenuto della notifica (JSON)
 * @param iscrizione le chiavi che il telefono ha comunicato registrandosi
 * @param saleFisso solo per le prove: normalmente il sale e' casuale
 * @param coppiaFissa solo per le prove: normalmente la coppia e' usa e getta
 */
async function cifra(
  testo: string,
  iscrizione: Iscrizione,
  saleFisso?: Byte,
  coppiaFissa?: CryptoKeyPair
): Promise<Byte> {
  const chiavePubblicaTelefono = daBase64Url(iscrizione.chiavi.p256dh) // 65 byte
  const segretoTelefono = daBase64Url(iscrizione.chiavi.auth) // 16 byte

  // 1. Una coppia di chiavi usa e getta, diversa per ogni notifica.
  //    Se una venisse compromessa, le altre notifiche restano al sicuro.
  const coppia =
    coppiaFissa ??
    ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ])) as CryptoKeyPair)

  const nostraPubblica = new Uint8Array(await crypto.subtle.exportKey('raw', coppia.publicKey)) // 65 byte

  // 2. Il segreto condiviso: lo stesso numero che il telefono sapra'
  //    ricavare dalla propria chiave privata, senza che nessuno lo trasmetta.
  const loroPubblica = await crypto.subtle.importKey(
    'raw',
    chiavePubblicaTelefono,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  const segretoCondiviso = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: loroPubblica }, coppia.privateKey, 256)
  )

  // 3. Si mescola il segreto condiviso con quello dell'iscrizione.
  //    La stringa "WebPush: info" e le due chiavi pubbliche legano il
  //    risultato a questa precisa coppia di interlocutori.
  const prkIniziale = await hkdfEstrai(segretoTelefono, segretoCondiviso)
  const infoChiave = unisci(
    testoInByte('WebPush: info'),
    new Uint8Array([0]),
    chiavePubblicaTelefono,
    nostraPubblica
  )
  const materiale = await hkdfEspandi(prkIniziale, infoChiave, 32)

  // 4. Dal materiale, con un sale casuale, si ricavano la chiave di
  //    cifratura vera e propria e il numero usa-e-getta che l'accompagna.
  const sale = saleFisso ?? crypto.getRandomValues(new Uint8Array(16))
  const prk = await hkdfEstrai(sale, materiale)
  const chiaveCifratura = await hkdfEspandi(
    prk,
    unisci(testoInByte('Content-Encoding: aes128gcm'), new Uint8Array([0])),
    16
  )
  const nonce = await hkdfEspandi(
    prk,
    unisci(testoInByte('Content-Encoding: nonce'), new Uint8Array([0])),
    12
  )

  // 5. Il messaggio termina con 0x02: segnala "questo e' l'ultimo pezzo".
  const daCifrare = unisci(testoInByte(testo), new Uint8Array([2]))

  const chiaveAes = await crypto.subtle.importKey('raw', chiaveCifratura, { name: 'AES-GCM' }, false, [
    'encrypt',
  ])
  const cifrato = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, chiaveAes, daCifrare)
  )

  // 6. Il corpo da spedire: intestazione + contenuto cifrato.
  //    L'intestazione contiene il sale, la dimensione massima del pezzo,
  //    e la nostra chiave pubblica usa e getta, che serve al telefono
  //    per ricavare lo stesso segreto condiviso.
  const dimensione = new Uint8Array(4)
  new DataView(dimensione.buffer).setUint32(0, 4096, false) // false = byte piu' pesante per primo

  return unisci(sale, dimensione, new Uint8Array([nostraPubblica.length]), nostraPubblica, cifrato)
}

/* ------------------------------------------------------------------
   Firma VAPID (RFC 8292): dimostra che il mittente e' Aegis
   ------------------------------------------------------------------ */

/**
 * Costruisce l'intestazione di autorizzazione da mandare al servizio push.
 *
 * @param endpoint l'indirizzo a cui si sta scrivendo
 * @param chiavePubblica la chiave pubblica VAPID (base64url)
 * @param chiavePrivata la chiave privata VAPID (base64url)
 * @param contatto un indirizzo di riferimento, come richiede lo standard
 */
async function intestazioneVapid(
  endpoint: string,
  chiavePubblica: string,
  chiavePrivata: string,
  contatto: string
): Promise<string> {
  const destinatario = new URL(endpoint).origin

  const intestazione = { typ: 'JWT', alg: 'ES256' }
  const contenuto = {
    aud: destinatario,
    // Scadenza tra 12 ore. Lo standard non ammette oltre le 24.
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: contatto,
  }

  const parteFissa =
    aBase64Url(testoInByte(JSON.stringify(intestazione))) +
    '.' +
    aBase64Url(testoInByte(JSON.stringify(contenuto)))

  const chiave = await importaChiaveFirma(chiavePubblica, chiavePrivata)
  const firma = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chiave, testoInByte(parteFissa))
  )

  return `vapid t=${parteFissa}.${aBase64Url(firma)}, k=${chiavePubblica}`
}

/**
 * Ricostruisce la chiave privata in un formato utilizzabile per firmare.
 * Le due chiavi arrivano come testo base64url; qui vengono rimesse
 * insieme nel formato JWK, l'unico che le funzioni standard accettano
 * per le curve ellittiche.
 */
async function importaChiaveFirma(pubblica: string, privata: string): Promise<CryptoKey> {
  const punto = daBase64Url(pubblica) // 65 byte: 0x04 + X (32) + Y (32)
  if (punto.length !== 65 || punto[0] !== 4) {
    throw new Error('Chiave pubblica VAPID non valida: attesi 65 byte che iniziano con 0x04.')
  }

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: aBase64Url(punto.subarray(1, 33)),
    y: aBase64Url(punto.subarray(33, 65)),
    d: privata,
    ext: true,
  }

  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

/* ------------------------------------------------------------------
   Invio
   ------------------------------------------------------------------ */

interface EsitoInvio {
  ok: boolean
  stato: number
  /** true quando il telefono non e' piu' raggiungibile e l'iscrizione va cancellata */
  daRimuovere: boolean
  dettaglio?: string
}

/**
 * Manda la notifica al servizio push del telefono.
 *
 * @param durataSecondi per quanto il servizio deve tenerla se il telefono
 *        e' spento. 4 ore: un promemoria delle 19:00 recapitato a mezzanotte
 *        sarebbe solo fastidioso.
 */
async function invia(
  iscrizione: Iscrizione,
  contenuto: unknown,
  chiavePubblica: string,
  chiavePrivata: string,
  contatto: string,
  durataSecondi = 4 * 60 * 60
): Promise<EsitoInvio> {
  const corpo = await cifra(JSON.stringify(contenuto), iscrizione)
  const autorizzazione = await intestazioneVapid(
    iscrizione.endpoint,
    chiavePubblica,
    chiavePrivata,
    contatto
  )

  const risposta = await fetch(iscrizione.endpoint, {
    method: 'POST',
    headers: {
      Authorization: autorizzazione,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(durataSecondi),
    },
    body: corpo,
  })

  // 404 e 410 significano che quel telefono non esiste piu' per il
  // servizio push: app disinstallata, dati cancellati, iscrizione revocata.
  const daRimuovere = risposta.status === 404 || risposta.status === 410

  return {
    ok: risposta.ok,
    stato: risposta.status,
    daRimuovere,
    dettaglio: risposta.ok ? undefined : await risposta.text().catch(() => ''),
  }
}

/* ============ da logica.ts ============ */

/*
  logica.ts
  ---------------------------------------------------------------
  DECIDE QUALI PROMEMORIA VANNO MANDATI ADESSO.

  E' tenuto separato dal resto apposta: qui non si legge il database e
  non si manda nulla: si fanno solo conti su date e orari. Cosi' la
  parte piu' delicata - fusi orari e cambi di giorno - si puo' provare
  da sola, senza aver bisogno di un database o di un telefono.
*/

interface Evento {
  id: string
  giorno: number // 0 = lunedi' ... 6 = domenica
  tipo: string
  titolo: string
  orario: string // "HH:MM"
}

interface OraLocale {
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
function oraLocale(adesso: Date, fusoOrario: string): OraLocale {
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

interface Dovuto {
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
function eventiDovuti(eventi: Evento[], ora: OraLocale, finestraMinuti = 10): Dovuto[] {
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
function componiNotifica(dovuto: Dovuto, nome: string, orarioPrevisto: string) {
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

/* ============ da index.ts ============ */

/*
  promemoria - la "sveglia" di Aegis
  ---------------------------------------------------------------
  Viene accesa ogni minuto. Guarda l'ora, guarda i piani, e manda le
  notifiche dovute. Poi si rispegne. Dura frazioni di secondo.

  NESSUNA LIBRERIA ESTERNA, DI PROPOSITO
  Parla col database via richieste web normali invece di usare la
  libreria di Supabase, e cifra le notifiche con webpush.ts invece che
  con un pacchetto di terzi. Il motivo e' pratico: nell'ambiente di
  sviluppo di Aegis i registri dei pacchetti non erano raggiungibili,
  quindi una dipendenza esterna sarebbe arrivata qui senza essere mai
  stata provata. Cosi' invece ogni pezzo e' stato verificato prima.

  COME SI PROVA SENZA MANDARE NULLA
  Aggiungendo ?prova=1 all'indirizzo, risponde elencando cosa
  manderebbe, senza mandarlo. Utile per capire se il piano viene letto
  correttamente prima di aspettare l'orario giusto.
*/


/* ------------------------------------------------------------------
   Impostazioni, lette dalle variabili protette di Supabase
   ------------------------------------------------------------------ */

const URL_DATABASE = Deno.env.get('SUPABASE_URL')!
const CHIAVE_SERVIZIO = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBBLICA = Deno.env.get('AEGIS_VAPID_PUBBLICA')!
const VAPID_PRIVATA = Deno.env.get('AEGIS_VAPID_PRIVATA')!
const CONTATTO = Deno.env.get('AEGIS_CONTATTO') || 'mailto:aegis@example.com'
const SEGRETO = Deno.env.get('AEGIS_SEGRETO')!

// Quanti minuti di ritardo si accettano prima di rinunciare a un promemoria
const FINESTRA_MINUTI = 10

/* ------------------------------------------------------------------
   Accesso al database
   ------------------------------------------------------------------
   Usiamo la chiave di servizio, l'unica che puo' leggere i dati di
   tutti: la sveglia deve sapere cosa mandare a chiunque, e nessuno
   e' collegato mentre lei lavora.

   E' anche il motivo per cui questa funzione va tenuta chiusa dietro
   il segreto: chi riuscisse a farla girare non vedrebbe comunque
   nulla (risponde solo con dei conteggi), ma non c'e' ragione di
   lasciarla aperta.
*/
async function interroga(percorso: string, opzioni: RequestInit = {}) {
  const risposta = await fetch(`${URL_DATABASE}/rest/v1/${percorso}`, {
    ...opzioni,
    headers: {
      apikey: CHIAVE_SERVIZIO,
      Authorization: `Bearer ${CHIAVE_SERVIZIO}`,
      'Content-Type': 'application/json',
      ...(opzioni.headers || {}),
    },
  })

  if (!risposta.ok) {
    const dettaglio = await risposta.text().catch(() => '')
    throw new Error(`Database ha risposto ${risposta.status} su ${percorso}: ${dettaglio}`)
  }

  // Le cancellazioni non restituiscono nulla
  const testo = await risposta.text()
  return testo ? JSON.parse(testo) : null
}

interface RigaIscrizione {
  id: string
  utente: string
  endpoint: string
  chiave_p256dh: string
  chiave_auth: string
}

interface RigaProfilo {
  utente: string
  nome: string
  fuso_orario: string
}

/* ------------------------------------------------------------------
   Il lavoro vero
   ------------------------------------------------------------------ */

async function lavora(soloProva: boolean) {
  const adesso = new Date()
  const resoconto = {
    istante: adesso.toISOString(),
    prova: soloProva,
    personeConsiderate: 0,
    notificheDovute: 0,
    inviate: 0,
    gia_inviate: 0,
    fallite: 0,
    iscrizioniRimosse: 0,
    dettagli: [] as unknown[],
  }

  // 1. Chi ha un telefono registrato per ricevere notifiche
  const iscrizioni: RigaIscrizione[] = await interroga(
    'iscrizioni_push?select=id,utente,endpoint,chiave_p256dh,chiave_auth'
  )
  if (iscrizioni.length === 0) return resoconto

  const utenti = [...new Set(iscrizioni.map((i) => i.utente))]
  resoconto.personeConsiderate = utenti.length

  // 2. I loro profili (nome e fuso orario) e i loro piani, in due sole
  //    richieste invece di due per persona.
  const elenco = utenti.map((u) => `"${u}"`).join(',')
  const profili: RigaProfilo[] = await interroga(
    `profili?select=utente,nome,fuso_orario&utente=in.(${elenco})`
  )
  const eventi: (Evento & { utente: string })[] = await interroga(
    `eventi?select=id,utente,giorno,tipo,titolo,orario&utente=in.(${elenco})`
  )

  // 3. Una persona alla volta
  for (const utente of utenti) {
    const profilo = profili.find((p) => p.utente === utente)
    const fuso = profilo?.fuso_orario || 'Europe/Rome'
    const nome = profilo?.nome || ''

    let ora
    try {
      ora = oraLocale(adesso, fuso)
    } catch {
      // Fuso orario scritto male nel profilo: meglio notificare all'ora
      // italiana che non notificare affatto.
      ora = oraLocale(adesso, 'Europe/Rome')
    }

    const suoi = eventi.filter((e) => e.utente === utente)
    const dovuti = eventiDovuti(suoi, ora, FINESTRA_MINUTI)
    resoconto.notificheDovute += dovuti.length

    for (const dovuto of dovuti) {
      const contenuto = componiNotifica(dovuto, nome, dovuto.evento.orario)

      if (soloProva) {
        resoconto.dettagli.push({ utente, oraLocale: ora.orario, ...contenuto })
        continue
      }

      /*
        Prenotazione dell'invio PRIMA di mandare.
        La riga ha un vincolo di unicita' su (utente, evento, data): se
        due esecuzioni si sovrappongono, solo una riesce a inserirla e
        solo quella manda. E' il database a garantire che non ti arrivi
        due volte la stessa notifica, non il nostro codice.
      */
      const prenotato = await interroga(
        'invii?on_conflict=utente,evento,data',
        {
          method: 'POST',
          headers: { Prefer: 'return=representation,resolution=ignore-duplicates' },
          body: JSON.stringify({
            utente,
            evento: dovuto.evento.id,
            data: dovuto.dataOccorrenza,
          }),
        }
      )

      // Elenco vuoto = la riga esisteva gia' = qualcuno ha gia' mandato
      if (!prenotato || prenotato.length === 0) {
        resoconto.gia_inviate++
        continue
      }

      // 4. Mandiamo a tutti i telefoni di quella persona
      for (const iscrizione of iscrizioni.filter((i) => i.utente === utente)) {
        const destinazione: Iscrizione = {
          endpoint: iscrizione.endpoint,
          chiavi: { p256dh: iscrizione.chiave_p256dh, auth: iscrizione.chiave_auth },
        }

        try {
          const esito = await invia(
            destinazione,
            contenuto,
            VAPID_PUBBLICA,
            VAPID_PRIVATA,
            CONTATTO
          )

          if (esito.ok) {
            resoconto.inviate++
          } else if (esito.daRimuovere) {
            // Il telefono non esiste piu' per il servizio push:
            // app disinstallata, dati cancellati, iscrizione revocata.
            await interroga(`iscrizioni_push?id=eq.${iscrizione.id}`, { method: 'DELETE' })
            resoconto.iscrizioniRimosse++
          } else {
            resoconto.fallite++
            resoconto.dettagli.push({ endpoint: iscrizione.endpoint.slice(0, 50), stato: esito.stato, dettaglio: esito.dettaglio })
          }
        } catch (errore) {
          resoconto.fallite++
          resoconto.dettagli.push({ errore: String(errore) })
        }
      }
    }
  }

  return resoconto
}

/* ------------------------------------------------------------------
   Punto di ingresso
   ------------------------------------------------------------------ */

Deno.serve(async (richiesta) => {
  // Solo chi conosce il segreto puo' far girare la sveglia.
  // Il segreto viaggia in un'intestazione, non nell'indirizzo: gli
  // indirizzi finiscono nei registri dei server, le intestazioni no.
  const segretoRicevuto = richiesta.headers.get('x-aegis-segreto')
  if (!SEGRETO || segretoRicevuto !== SEGRETO) {
    return new Response(JSON.stringify({ errore: 'Non autorizzato' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const soloProva = new URL(richiesta.url).searchParams.get('prova') === '1'

  try {
    const resoconto = await lavora(soloProva)
    return new Response(JSON.stringify(resoconto, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (errore) {
    console.error('[promemoria] errore:', errore)
    return new Response(JSON.stringify({ errore: String(errore) }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
