# Far usare Aegis a un'altra persona

Aegis è costruita per più persone fin dallo schema del database: ogni riga —
ogni evento, ogni pesata — porta scritto a chi appartiene, e le regole del
database mostrano a ciascuno soltanto le proprie.

Non serve quindi nessuna modifica al codice. Serve solo creare l'accesso.

---

## Perché lo crei tu e non si registra da solo

Le registrazioni libere sono **disattivate** (*Authentication → Sign In /
Providers → Allow new users to sign up*). È una scelta: l'indirizzo dell'app è
pubblico, e senza quella levetta chiunque lo trovasse potrebbe crearsi
un'utenza.

Non vedrebbe comunque una riga dei tuoi dati — ma non c'è ragione di lasciare
la porta aperta.

---

## Come creare l'accesso

Pannello Supabase → **Authentication** → **Users** → **Add user** →
*Create new user*

| Campo | Cosa mettere |
|---|---|
| **Email** | l'indirizzo della persona |
| **Password** | una password che le comunicherai |
| **Auto Confirm User** | ✅ **spuntalo** |

> La spunta di conferma automatica è importante: senza, l'utenza resta in
> attesa di una mail di verifica che il servizio di posta gratuito recapita
> male o non recapita affatto.

Se il pannello offre un campo **User Metadata**, puoi già mettere il nome:

```json
{ "nome": "Marco" }
```

Non è obbligatorio: il nome si può impostare dall'app (vedi sotto).

---

## Cosa deve fare la persona

1. Aprire <https://francyfibra-ai.github.io/Aegis-v.-0.1/> con **Chrome**
2. Tre puntini **⋮** → **Installa app**
3. Aprirla **dall'icona**, non dal browser
4. **Setup** → entrare con email e password
5. **Setup** → campo **«Come vuoi essere chiamato»** → scrivere il proprio nome
   → **Salva il nome**
6. **Setup** → **Attiva i promemoria**
7. **Piano** → inserire il proprio piano settimanale

Da quel momento riceve i suoi promemoria, ai suoi orari, con il suo nome. La
stessa sveglia serve tutti: gira una volta al minuto e considera ogni persona
separatamente, ciascuna nel proprio fuso orario.

---

## Cosa vede, e cosa non vede

| | |
|---|---|
| Il proprio piano e le proprie pesate | ✅ |
| Il piano e le pesate di chiunque altro | ❌ mai, nemmeno per errore |

Non è una questione di buona educazione del codice: sono le regole scritte nel
database. Anche modificando l'app, un utente collegato riceverebbe un elenco
vuoto per i dati altrui. È la stessa protezione verificata con due utenti finti
quando lo schema è stato scritto.

---

## Prima di aprirlo a più di due o tre persone

Tre cose che oggi non sono un problema e lo diventerebbero:

- **Le mail.** Il servizio di posta incluso è limitato e finisce nello spam.
  Finché crei tu le utenze non serve, ma al primo «ho dimenticato la password»
  servirebbe un servizio vero.
- **La schermata Setup.** È una diagnostica scritta per capire cosa non
  funzionava. Per una persona che non ha seguito lo sviluppo è incomprensibile.
- **I dati di salute altrui.** Nel momento in cui nel tuo database finiscono
  peso e abitudini di altre persone, ti assumi delle responsabilità reali:
  dover dire come li usi, poterli cancellare su richiesta. Tra amici è
  informale; oltre, non più.
