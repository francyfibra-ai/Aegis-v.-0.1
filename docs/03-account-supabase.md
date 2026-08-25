# Creare l'account Supabase

Da fare **una volta sola**. Serve a dare ad Aegis un archivio online, così i
dati non vivono più soltanto dentro un telefono.

Circa 5 minuti. **Non serve nessuna carta di credito.**

---

## 📱 Prima di iniziare, dal telefono

Come per GitHub, conviene chiedere a Chrome la versione da computer: i
pannelli di questi servizi sono pensati per schermi grandi.

Tre puntini **⋮** in alto a destra → spunta **"Sito desktop"**.

La pagina diventa piccola ma completa, e si ingrandisce con le dita.

---

## Passo 1 — Registrarsi

1. Vai su <https://supabase.com>
2. Tocca **Start your project** (oppure **Sign in**)
3. Scegli **Continue with GitHub**: usi l'account che hai già, senza
   inventarti un'altra password
4. GitHub chiede di autorizzare Supabase → **Authorize**

---

## Passo 2 — Creare il progetto

Ti troverai su una pagina che chiede di creare un progetto.

| Campo | Cosa mettere |
|---|---|
| **Name** | `aegis` |
| **Database Password** | Tocca **Generate a password** e **salvala subito** (vedi sotto) |
| **Region** | **Central EU (Frankfurt)** — è la più vicina all'Italia, quindi la più veloce |
| **Plan** | **Free** |

Poi **Create new project** e aspetta 1-2 minuti: Supabase sta accendendo il
database.

### ⚠️ La password del database

Quando la generi, **copiala e mettila al sicuro** (nelle note del telefono, in
un gestore di password, dove preferisci).

- Serve solo in casi rari, ma se la perdi va rigenerata
- **Non mandarmela mai**, né a me né a nessun altro. Non mi serve: l'app non
  la usa. Se te la chiedessi, sarebbe sbagliato.

---

## Passo 3 — Copiare i due valori che mi servono

A progetto creato:

1. Nel menu a sinistra, in fondo, tocca **Project Settings** (l'ingranaggio)
2. Cerca la voce **API** (in alcune versioni si chiama **API Keys** o
   **Data API**)
3. Copia **due** cose:

| Cosa | Che aspetto ha |
|---|---|
| **Project URL** | `https://qualcosa.supabase.co` |
| **Chiave pubblica** — indicata come `anon` `public` oppure `publishable` | una stringa lunga di lettere e numeri |

**Mandami questi due valori.** Servono all'app per sapere a quale archivio
collegarsi.

### Perché è sicuro darmeli

Quella chiave si chiama "pubblica" perché **è fatta per stare dentro l'app**,
visibile a chiunque apra la pagina. Da sola non apre niente: i dati sono
protetti da regole scritte nel database, che lasciano passare solo chi ha
effettuato l'accesso con la tua email.

### ⛔ Quella che NON devi darmi mai

Nella stessa pagina c'è anche una chiave chiamata **`service_role`** (o
**`secret`**), spesso nascosta dietro un pulsante *Reveal*.

**Quella scavalca ogni protezione.** Non va mandata a nessuno, non va messa
nell'app, non va scritta su GitHub. Se dovesse servire per qualcosa, esiste un
modo apposito per custodirla — ma per Aegis non serve.

Regola semplice: **se accanto c'è scritto `secret` o `service_role`, non si
condivide.**

---

## Cosa succede dopo

Quando mi mandi i due valori:

1. Ti do un testo da incollare nel pannello di Supabase, che crea le tabelle
   (il piano, le pesate, le preferenze) e le regole di protezione
2. Collego l'app all'archivio
3. Aggiungo la schermata di accesso, dove crei la tua utenza con email e
   password — quella sì che serve, ed è tua

Da quel momento i dati non vivranno più solo sul telefono: cambiando
dispositivo li ritroverai tutti.
