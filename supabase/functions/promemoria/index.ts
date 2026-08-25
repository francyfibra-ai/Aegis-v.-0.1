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

import { invia, type Iscrizione } from './webpush.ts'
import { oraLocale, eventiDovuti, componiNotifica, type Evento } from './logica.ts'

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
