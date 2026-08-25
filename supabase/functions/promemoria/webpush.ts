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
  Le funzioni crittografiche standard vogliono un tipo ("BufferSource")
  che il compilatore non riconosce automaticamente in una normale
  sequenza di byte, perche' non puo' escludere che sia appoggiata a
  memoria condivisa tra processi - cosa che qui non succede mai.

  Questo aiutante glielo dice esplicitamente. E' scritto in una forma
  che funziona con qualunque versione del compilatore: la notazione
  piu' moderna avrebbe fatto rifiutare la pubblicazione dove Deno ne
  monta una piu' vecchia.
*/
function comeBuffer(byte: Uint8Array): BufferSource {
  return byte as unknown as BufferSource
}

/* ------------------------------------------------------------------
   Conversioni tra testo e byte
   ------------------------------------------------------------------ */

/** base64url -> byte. E' il base64 senza i caratteri scomodi negli indirizzi. */
export function daBase64Url(testo: string): Uint8Array {
  const base64 = testo.replace(/-/g, '+').replace(/_/g, '/')
  // Reintegra il riempimento finale che il base64url omette
  const conRiempimento = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binario = atob(conRiempimento)
  const byte = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) byte[i] = binario.charCodeAt(i)
  return byte
}

/** byte -> base64url */
export function aBase64Url(byte: Uint8Array): string {
  let binario = ''
  for (const b of byte) binario += String.fromCharCode(b)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Attacca piu' sequenze di byte una dopo l'altra. */
function unisci(...pezzi: Uint8Array[]): Uint8Array {
  const totale = pezzi.reduce((s, p) => s + p.length, 0)
  const risultato = new Uint8Array(totale)
  let posizione = 0
  for (const pezzo of pezzi) {
    risultato.set(pezzo, posizione)
    posizione += pezzo.length
  }
  return risultato
}

const testoInByte = (s: string): Uint8Array => new TextEncoder().encode(s)

/* ------------------------------------------------------------------
   HKDF: da un segreto grezzo si ricavano chiavi utilizzabili
   ------------------------------------------------------------------ */

/** Primo passo: "concentra" il materiale grezzo in una chiave intermedia. */
async function hkdfEstrai(sale: Uint8Array, materiale: Uint8Array): Promise<Uint8Array> {
  const chiave = await crypto.subtle.importKey('raw', comeBuffer(sale), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', chiave, comeBuffer(materiale)))
}

/**
 * Secondo passo: dalla chiave intermedia si ricava la chiave finale,
 * di lunghezza voluta e legata a uno scopo preciso ("info").
 * Ci servono sempre meno di 32 byte, quindi basta un solo giro.
 */
async function hkdfEspandi(prk: Uint8Array, info: Uint8Array, lunghezza: number): Promise<Uint8Array> {
  const chiave = await crypto.subtle.importKey('raw', comeBuffer(prk), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const blocco = new Uint8Array(await crypto.subtle.sign('HMAC', chiave, comeBuffer(unisci(info, new Uint8Array([1])))))
  return blocco.subarray(0, lunghezza)
}

/* ------------------------------------------------------------------
   Cifratura del contenuto (RFC 8291, formato aes128gcm)
   ------------------------------------------------------------------ */

export interface Iscrizione {
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
export async function cifra(
  testo: string,
  iscrizione: Iscrizione,
  saleFisso?: Uint8Array,
  coppiaFissa?: CryptoKeyPair
): Promise<Uint8Array> {
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
    comeBuffer(chiavePubblicaTelefono),
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

  const chiaveAes = await crypto.subtle.importKey('raw', comeBuffer(chiaveCifratura), { name: 'AES-GCM' }, false, [
    'encrypt',
  ])
  const cifrato = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: comeBuffer(nonce), tagLength: 128 }, chiaveAes, comeBuffer(daCifrare))
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
export async function intestazioneVapid(
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
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chiave, comeBuffer(testoInByte(parteFissa)))
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

export interface EsitoInvio {
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
export async function invia(
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
    body: comeBuffer(corpo),
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
