/*
  SchedaAccount.jsx
  ---------------------------------------------------------------
  Il riquadro dell'accesso, dentro la schermata Setup.

  Ha tre facce, a seconda della situazione:
   1. archivio online non ancora configurato  -> spiega e basta
   2. non hai fatto l'accesso                 -> modulo entra / registrati
   3. sei collegato                           -> chi sei, e come uscire

  Non e' una barriera: se non entri, l'app continua a funzionare
  salvando sul telefono. L'accesso serve a portare i dati online,
  non a darti il permesso di usare Aegis.
*/
import { useEffect, useState } from 'react'
import { registrati, accedi, esci, reimpostaPassword } from '../lib/supabase.js'
import { supabaseConfigurato } from '../lib/configurazione.js'
import { salvaPreferenza } from '../lib/archivio.js'
import { usaPreferenze } from '../lib/hooks.js'

export default function SchedaAccount({ utente }) {
  // 'entra' | 'registrati' | 'passwordDimenticata'
  const [modo, setModo] = useState('entra')

  // Il nome salvato nel profilo. E' quello che legge il programma delle
  // notifiche: cambiarlo qui cambia come ti chiamano i promemoria.
  const { preferenze } = usaPreferenze()
  const [nomeProfilo, setNomeProfilo] = useState('')
  const [nomeSalvato, setNomeSalvato] = useState(false)
  const [salvandoNome, setSalvandoNome] = useState(false)

  // Quando il profilo arriva dall'archivio, riempiamo il campo.
  useEffect(() => {
    if (preferenze.nome !== undefined) setNomeProfilo(preferenze.nome || '')
  }, [preferenze.nome])

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [errore, setErrore] = useState('')
  const [avviso, setAvviso] = useState('')
  const [inCorso, setInCorso] = useState(false)

  /* --- Caso 1: manca ancora la configurazione --- */
  if (!supabaseConfigurato()) {
    return (
      <section className="scheda">
        <h3>Archivio online</h3>
        <p className="nota">
          Non ancora collegato. I dati restano su questo telefono finché non
          inserisco i due valori del progetto Supabase in
          <code> src/lib/configurazione.js</code>.
        </p>
      </section>
    )
  }

  /* --- Caso 3: sei collegato --- */
  if (utente) {
    // Il nome del profilo ha la precedenza su quello scritto in fase di
    // registrazione: e' quello modificabile, ed e' quello che usano le notifiche.
    const nomeMostrato = preferenze.nome || utente.user_metadata?.nome || utente.email

    async function salvaNome(e) {
      e.preventDefault()
      setSalvandoNome(true)
      setErrore('')
      setNomeSalvato(false)
      try {
        await salvaPreferenza('nome', nomeProfilo.trim())
        setNomeSalvato(true)
      } catch (problema) {
        setErrore(problema.message)
      } finally {
        setSalvandoNome(false)
      }
    }

    return (
      <section className="scheda">
        <h3>Il tuo accesso</h3>
        <p className="nota">
          Collegato come <strong>{nomeMostrato}</strong>
          {preferenze.nome && <> ({utente.email})</>}
        </p>
        <p className="nota">
          I dati sono nel tuo archivio online: li ritrovi su qualsiasi
          dispositivo entrando con questa email.
        </p>

        {/* --- Nome usato dalle notifiche --- */}
        <form onSubmit={salvaNome}>
          <label className="etichetta" htmlFor="campo-nome-profilo">
            Come vuoi essere chiamato
          </label>
          <input
            id="campo-nome-profilo"
            className="campo"
            type="text"
            value={nomeProfilo}
            onChange={(e) => {
              setNomeProfilo(e.target.value)
              setNomeSalvato(false)
            }}
            placeholder="Es. Francesco"
            maxLength={40}
            autoComplete="given-name"
          />
          <p className="nota">
            Compare nei promemoria: «{nomeProfilo.trim() || '…'}, sono le 19:00».
            Lascialo vuoto per notifiche senza nome.
          </p>
          <div className="pulsantiera">
            <button
              type="submit"
              className="pulsante"
              disabled={salvandoNome || nomeProfilo.trim() === (preferenze.nome || '').trim()}
            >
              {salvandoNome ? 'Salvo…' : nomeSalvato ? 'Salvato ✓' : 'Salva il nome'}
            </button>
          </div>
        </form>
        <div className="pulsantiera">
          <button
            className="pulsante"
            onClick={async () => {
              setInCorso(true)
              await esci()
              setInCorso(false)
            }}
            disabled={inCorso}
          >
            Esci
          </button>
        </div>
        <p className="nota">
          Uscendo, i dati restano online: tornano visibili appena rientri.
        </p>
      </section>
    )
  }

  /* --- Caso 2: modulo di accesso --- */

  async function invia(e) {
    e.preventDefault() // impedisce alla pagina di ricaricarsi
    setErrore('')
    setAvviso('')
    setInCorso(true)

    try {
      if (modo === 'passwordDimenticata') {
        await reimpostaPassword(email)
        setAvviso('Ti ho inviato una mail per reimpostare la password.')
      } else if (modo === 'registrati') {
        if (!nome.trim()) throw new Error('Scrivi come vuoi essere chiamato.')

        const { serveConferma } = await registrati({ nome, email, password })
        if (serveConferma) {
          setAvviso(
            'Ti ho inviato una mail: aprila e conferma l\'indirizzo, poi torna qui ed entra.'
          )
        }
        // Se la conferma non serve, l'accesso e' gia' attivo e la
        // schermata cambia da sola (App.jsx sta ascoltando).
      } else {
        await accedi({ email, password })
      }
    } catch (problema) {
      setErrore(problema.message)
    } finally {
      setInCorso(false)
    }
  }

  const titoli = {
    entra: 'Entra',
    registrati: 'Crea il tuo accesso',
    passwordDimenticata: 'Password dimenticata',
  }

  return (
    <section className="scheda">
      <h3>{titoli[modo]}</h3>

      <p className="nota">
        {modo === 'registrati'
          ? 'Serve a conservare i dati online e a ritrovarli se cambi telefono.'
          : modo === 'passwordDimenticata'
            ? 'Scrivi la tua email: ti mando un link per sceglierne una nuova.'
            : 'I tuoi dati sono al sicuro: senza accesso il database non li mostra a nessuno.'}
      </p>

      <form onSubmit={invia}>
        {modo === 'registrati' && (
          <>
            <label className="etichetta" htmlFor="campo-nome">
              Come vuoi essere chiamato
            </label>
            <input
              id="campo-nome"
              className="campo"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Francesco"
              autoComplete="given-name"
            />
            <p className="nota">Comparirà nelle notifiche: «Francesco, sono le 19:00…»</p>
          </>
        )}

        <label className="etichetta" htmlFor="campo-email">
          Email
        </label>
        <input
          id="campo-email"
          className="campo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@esempio.it"
          autoComplete="email"
          required
        />

        {modo !== 'passwordDimenticata' && (
          <>
            <label className="etichetta" htmlFor="campo-password">
              Password
            </label>
            <input
              id="campo-password"
              className="campo"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={modo === 'registrati' ? 'Almeno 6 caratteri' : ''}
              /* Dice ad Android se proporre una password salvata
                 o suggerirne una nuova */
              autoComplete={modo === 'registrati' ? 'new-password' : 'current-password'}
              required
            />
          </>
        )}

        {errore && <p className="errore">{errore}</p>}
        {avviso && <p className="messaggio">{avviso}</p>}

        <div className="pulsantiera">
          <button type="submit" className="pulsante primario" disabled={inCorso}>
            {inCorso
              ? 'Un momento…'
              : modo === 'registrati'
                ? 'Crea accesso'
                : modo === 'passwordDimenticata'
                  ? 'Invia il link'
                  : 'Entra'}
          </button>
        </div>
      </form>

      {/* --- Passaggi tra i tre modi --- */}
      <div className="scelte-accesso">
        {modo === 'entra' && (
          <>
            <button className="pulsante-testo" onClick={() => setModo('registrati')}>
              Non hai un accesso? Crealo
            </button>
            <button
              className="pulsante-testo"
              onClick={() => setModo('passwordDimenticata')}
            >
              Password dimenticata
            </button>
          </>
        )}
        {modo !== 'entra' && (
          <button className="pulsante-testo" onClick={() => setModo('entra')}>
            ← Torna all'accesso
          </button>
        )}
      </div>
    </section>
  )
}
