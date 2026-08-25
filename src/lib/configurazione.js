/*
  configurazione.js
  ---------------------------------------------------------------
  I DUE VALORI CHE COLLEGANO L'APP AL SUO ARCHIVIO ONLINE.

  Si trovano nel pannello di Supabase:
     Project Settings > API
  (guida passo passo in docs/03-account-supabase.md)

  ------------------------------------------------------------------
  "MA NON E' PERICOLOSO SCRIVERE UNA CHIAVE DENTRO IL CODICE?"

  No, non questa. La chiave "anon" e' progettata apposta per stare
  dentro le app: chiunque apra la pagina puo' leggerla, ed e' previsto.

  Cio' che protegge i dati NON e' la segretezza di questa chiave: sono
  le regole scritte nel database (vedi supabase/schema.sql), che
  mostrano ogni riga soltanto a chi ha effettuato l'accesso ed e' il
  proprietario di quella riga. Senza accesso, il database risponde
  come se le tabelle fossero vuote.

  ⛔ E' invece VIETATO mettere qui la chiave "service_role" (o
  "secret"): quella scavalca ogni regola. Non va nel codice, non va
  su GitHub, non si manda a nessuno.
  ------------------------------------------------------------------
*/

// Indirizzo del progetto, tipo 'https://abcdefgh.supabase.co'
export const SUPABASE_URL = 'https://zikfldmqdsacywvxiuab.supabase.co'

// Chiave pubblica, indicata come "anon public" oppure "publishable"
export const SUPABASE_CHIAVE_PUBBLICA = 'sb_publishable_enjVIUKuaDY_bBvJeK0NNw_8wv65exW'

/*
  LA CHIAVE PUBBLICA DELLE NOTIFICHE (VAPID)

  Fa coppia con una chiave privata custodita in Supabase. Il telefono
  registra questa: da quel momento accettera' notifiche solo se firmate
  con la privata corrispondente. E' cio' che impedisce a chiunque altro
  di mandarti notifiche fingendosi Aegis.

  Anche questa e' pubblica per natura: sta nell'app, visibile a tutti.
  Cambiarla invalida tutte le iscrizioni esistenti, che andrebbero
  rifatte da ogni dispositivo.
*/
export const VAPID_CHIAVE_PUBBLICA =
  'BMTcVq-gMaVSci9uCvjB25s9c9BHCelyx8VAitTrR1YA8h22JXgxdIMP2YI5aKOhZ017l45D1vVxzBQMECqIfF8'

/** Dice se le notifiche push sono state configurate. */
export function pushConfigurato() {
  return Boolean(VAPID_CHIAVE_PUBBLICA)
}

/**
 * Dice se i due valori sono stati inseriti.
 * Finche' sono vuoti l'app continua a funzionare salvando sul telefono:
 * cosi' resta usabile anche prima che l'archivio online esista.
 */
export function supabaseConfigurato() {
  return Boolean(SUPABASE_URL && SUPABASE_CHIAVE_PUBBLICA)
}
