/*
  supabase.js
  ---------------------------------------------------------------
  Crea il collegamento con l'archivio online e gestisce l'accesso
  (registrazione, entrata, uscita).

  Nessun'altra parte dell'app parla direttamente con Supabase: chi ha
  bisogno dei dati passa da archivio.js, chi ha bisogno di sapere se
  sei collegato passa da qui.
*/
import { createClient } from '@supabase/supabase-js'
import {
  SUPABASE_URL,
  SUPABASE_CHIAVE_PUBBLICA,
  supabaseConfigurato,
} from './configurazione.js'

/*
  Il "client": l'oggetto che sa parlare con Supabase.
  Se i due valori non sono ancora stati inseriti resta null, e tutta
  l'app continua a funzionare in modalita' locale.
*/
export const supabase = supabaseConfigurato()
  ? createClient(SUPABASE_URL, SUPABASE_CHIAVE_PUBBLICA, {
      auth: {
        // Tiene l'accesso valido tra un'apertura e l'altra dell'app:
        // entri una volta e resti dentro.
        persistSession: true,
        // Rinnova da solo il permesso prima che scada, cosi' non ti
        // ritrovi buttato fuori mentre stai usando l'app.
        autoRefreshToken: true,
        // Legge l'esito dell'accesso quando torna dall'indirizzo web
        // (servira' per "Accedi con Google").
        detectSessionInUrl: true,
      },
    })
  : null

/**
 * Registra una nuova utenza.
 * Il nome finisce nei dati dell'utenza e da li' il database lo copia
 * nel profilo, dove il programma delle notifiche potra' leggerlo.
 *
 * @returns {Promise<{utente: object|null, serveConferma: boolean}>}
 */
export async function registrati({ nome, email, password }) {
  if (!supabase) throw new Error('Archivio online non ancora configurato.')

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome: nome.trim() },
      // Dove tornare dopo aver cliccato il link di conferma nella mail
      emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
    },
  })

  if (error) throw new Error(traduciErrore(error.message))

  // Se Supabase e' impostato per chiedere la conferma via email,
  // l'utenza esiste ma non c'e' ancora una sessione attiva.
  return {
    utente: data.user,
    serveConferma: Boolean(data.user && !data.session),
  }
}

/** Entra con un'utenza gia' esistente. */
export async function accedi({ email, password }) {
  if (!supabase) throw new Error('Archivio online non ancora configurato.')

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(traduciErrore(error.message))
  return data.user
}

/** Esce. I dati restano online, semplicemente non sono piu' accessibili. */
export async function esci() {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** Invia la mail per reimpostare la password. */
export async function reimpostaPassword(email) {
  if (!supabase) throw new Error('Archivio online non ancora configurato.')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + import.meta.env.BASE_URL,
  })
  if (error) throw new Error(traduciErrore(error.message))
}

/** L'utenza collegata in questo momento, oppure null. */
export async function utenteAttuale() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user ?? null
}

/**
 * Avvisa quando si entra o si esce, cosi' l'app puo' cambiare schermata
 * da sola (anche quando l'accesso scade da solo dopo molto tempo).
 * @returns {() => void} funzione per smettere di ascoltare
 */
export function ascoltaAccesso(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_evento, sessione) => {
    callback(sessione?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}

/*
  Supabase risponde in inglese e con frasi tecniche. Qui le trasformiamo
  in italiano comprensibile. Se un messaggio non e' nell'elenco lo
  lasciamo com'e': meglio una frase in inglese che una sbagliata.
*/
function traduciErrore(messaggio) {
  const traduzioni = {
    'Invalid login credentials': 'Email o password non corretti.',
    'Email not confirmed': 'Devi prima confermare la mail che ti abbiamo inviato.',
    'User already registered': 'Esiste già un accesso con questa email. Prova a entrare.',
    'Password should be at least 6 characters':
      'La password deve avere almeno 6 caratteri.',
    'Unable to validate email address: invalid format': "L'indirizzo email non è valido.",
    'Email rate limit exceeded':
      'Troppi tentativi ravvicinati. Aspetta qualche minuto e riprova.',
    'For security purposes, you can only request this after 60 seconds.':
      'Per sicurezza puoi riprovare tra un minuto.',
  }
  return traduzioni[messaggio] || messaggio
}
