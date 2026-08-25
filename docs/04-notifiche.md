# Accendere i promemoria automatici

Da fare **una volta sola**. Circa 15 minuti.

Al termine, Aegis ti manderà una notifica agli orari del tuo piano — anche ad
app chiusa, anche se non la apri per giorni.

> 📱 Come sempre: in Chrome, tre puntini **⋮** → **"Sito desktop"**. I pannelli
> di Supabase da telefono sono inservibili senza.

---

## Com'è fatta la sveglia

```
   ogni minuto                    ┌──────────────┐
   ┌──────────┐   "e' ora?"       │  IL DATABASE │
   │  pg_cron │ ────────────────► │  piano, fuso │
   └──────────┘                   │  orario, nome│
        │                         └──────────────┘
        ▼
   ┌─────────────────┐   notifica cifrata   ┌────────────┐
   │  promemoria     │ ───────────────────► │ IL TELEFONO│
   │ (Edge Function) │                      └────────────┘
   └─────────────────┘
```

`pg_cron` è una sveglia dentro il database. Ogni minuto accende la funzione
`promemoria`, che legge i piani, guarda l'ora **nel fuso di ciascuno**, e manda
le notifiche dovute. Poi si rispegne. Dura frazioni di secondo.

Consumo previsto: circa **43.800 accensioni al mese**, su 500.000 comprese nel
piano gratuito. Siamo sotto il 9%.

---

## Passo 1 — Le tabelle nuove

Pannello Supabase → **SQL Editor** → **New query**

Copia tutto il contenuto di **`supabase/schema-notifiche.sql`** e premi **Run**.

Deve rispondere *Success. No rows returned*.

Aggiunge due tabelle: dove mandare le notifiche, e quali sono già state mandate
(quest'ultima è ciò che impedisce di riceverne dieci uguali di fila).

---

## Passo 2 — Pubblicare la sveglia

Ci sono due strade. **La prima è molto più affidabile**: l'editor del pannello
richiede di azzeccare il nome del file, di cancellare ogni riga del codice di
esempio e di incollarne 750 da telefono — tre modi diversi di sbagliare, e
nessuno dei tre dà un errore comprensibile.

### 🅰️ Da GitHub, automaticamente (consigliato)

Una volta impostata, ogni modifica al codice della funzione si pubblica da
sola, come già succede per l'app.

**Serve una chiave d'accesso, una volta sola:**

1. Vai su <https://supabase.com/dashboard/account/tokens>
2. **Generate new token**, chiamalo `aegis-github`
3. **Copialo subito**: Supabase lo mostra una volta sola
4. Vai su
   <https://github.com/francyfibra-ai/Aegis-v.-0.1/settings/secrets/actions>
   *(da telefono serve la "Sito desktop" di Chrome)*
5. **New repository secret**
   - **Name**: `SUPABASE_ACCESS_TOKEN`
   - **Secret**: la chiave copiata
6. **Add secret**

**Poi pubblica:**

<https://github.com/francyfibra-ai/Aegis-v.-0.1/actions> → **Pubblica la
sveglia** → **Run workflow**

> ⚠️ Quella chiave dà accesso al tuo progetto Supabase: va solo nel segreto di
> GitHub, che è cifrato e non compare nei registri. Non va mandata a nessuno.

La funzione viene pubblicata con il nome **`promemoria`**, e con la verifica
del gettone già disattivata (è scritto in `supabase/config.toml`): un problema
in meno da cercare nel pannello.

### 🅱️ A mano, dall'editor del pannello

Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**

- ⚠️ **Il file deve chiamarsi `index.ts`.** È il nome che Supabase cerca come
  punto di partenza: rinominarlo fa fallire la pubblicazione con
  *«Entrypoint path does not exist … /source/index.ts»*
- ⚠️ **Cancella tutto** il codice di esempio. Se ne resta anche una riga, la
  funzione risponde `{"message":"Hello undefined!"}`: sembra funzionare, e
  invece non fa nulla
- Incolla il contenuto di **`supabase/funzione-da-incollare.ts`**
- Se compare l'opzione **Verify JWT**, disattivala
- **Deploy**

---

## Passo 3 — Le variabili protette

Pannello Supabase → **Edge Functions** → **Secrets** (in alcune versioni:
**Settings → Edge Functions → Secrets**)

Aggiungi **quattro** voci. I valori ti sono stati comunicati a parte:

| Nome | Cosa contiene |
|---|---|
| `AEGIS_VAPID_PUBBLICA` | la chiave pubblica delle notifiche |
| `AEGIS_VAPID_PRIVATA` | la chiave privata — **solo qui, mai altrove** |
| `AEGIS_CONTATTO` | `mailto:` con il tuo indirizzo, richiesto dallo standard |
| `AEGIS_SEGRETO` | la parola d'ordine che protegge la sveglia |

> Non serve aggiungere l'indirizzo del database né la chiave di servizio:
> Supabase li fornisce già da sé alle proprie funzioni.

---

## Passo 4 — Provare senza aspettare l'orario

La funzione ha una modalità di prova: dice cosa *manderebbe*, senza mandarlo.

Nel pannello della funzione c'è un riquadro per invocarla. In alternativa, da
un computer:

```
curl -X POST "https://zikfldmqdsacywvxiuab.supabase.co/functions/v1/nome-promemoria?prova=1" \
  -H "apikey: LA_CHIAVE_PUBBLICA" \
  -H "x-aegis-segreto: IL_TUO_SEGRETO"
```

Oppure, senza uscire dal pannello, dal **SQL Editor**:

```sql
select net.http_post(
  url := 'https://zikfldmqdsacywvxiuab.supabase.co/functions/v1/nome-promemoria?prova=1',
  headers := jsonb_build_object(
    'apikey', 'LA_CHIAVE_PUBBLICA',
    'x-aegis-segreto', 'IL_TUO_SEGRETO'
  ),
  body := '{}'::jsonb
);
-- poi, dopo qualche secondo:
select status_code, content from net._http_response order by id desc limit 1;
```

Risponde con un resoconto in formato JSON:

- `personeConsiderate: 0` → nessun telefono registrato: fai prima il Passo 6
- `notificheDovute: 0` → nessun evento previsto in questo momento. Normale:
  prova mettendo nel piano un evento fra due minuti
- `notificheDovute: 1` con i dettagli → **funziona**

---

## Passo 5 — Programmare la sveglia

Pannello Supabase → **SQL Editor** → **New query**

Copia **`supabase/cron.sql`**, e **prima di premere Run** sostituisci
`IL_TUO_SEGRETO` con il segreto vero (compare due volte, ma solo una conta:
quella dentro `jsonb_build_object`).

Per controllare che sia partita:

```sql
select jobname, schedule, active from cron.job;

select jobname, status, return_message, start_time
from cron.job_run_details order by start_time desc limit 10;
```

---

## Passo 6 — Attivare i promemoria sul telefono

Apri Aegis **dall'icona in home screen** → **Setup** →
**Attiva i promemoria** → concedi il permesso.

Il riquadro deve diventare *«Promemoria attivi su questo dispositivo»*.

Da questo momento le notifiche arrivano da sole.

> Vuoi riceverle anche su un altro dispositivo? Apri Aegis da lì e ripeti:
> ogni dispositivo si registra per conto suo.

---

## Come provarlo davvero

Nel Piano, aggiungi un evento **fra tre minuti** (di oggi). Chiudi l'app.
Aspetta.

Se la notifica arriva con i pulsanti *Fatto* e *Saltato*, la Fase 4 è finita.

---

## Se qualcosa non torna

| Sintomo | Dove guardare |
|---|---|
| La prova dice `personeConsiderate: 0` | Il telefono non è registrato: rifai il Passo 6 |
| La prova dice `notificheDovute: 0` sempre | Controlla di avere un evento nell'orario giusto, e il fuso orario nel profilo |
| Risposta `{"message":"Hello undefined!"}` | Nella funzione c'è ancora il codice di esempio di Supabase: non è mai stato sostituito |
| *«Entrypoint path does not exist»* | Il file nell'editor non si chiama `index.ts` |
| `401` con `{"errore":"Non autorizzato"}` | È la funzione: il segreto non coincide tra Passo 3 e Passo 5 |
| `401` con `INVALID_CREDENTIALS` | È il portone di Supabase, non la funzione. Serve l'intestazione **`apikey`** con la chiave pubblica. Non basta metterla in `Authorization`, e non basta disattivare *Verify JWT*: il portone chiede le credenziali comunque |
| La funzione risponde `404` | Il nome nel `cron.sql` non coincide con quello reale della funzione |
| `cron.job_run_details` mostra errori | La chiamata non parte: controlla l'indirizzo dentro `cron.sql` |
| La sveglia gira ma non arriva nulla | Guarda i registri della funzione nel pannello: `fallite` maggiore di zero indica cosa ha risposto il servizio push |
| Le notifiche arrivano in ritardo | Android in risparmio energetico: Impostazioni → Batteria → Aegis → Senza restrizioni |

---

## Un limite onesto

Su Android le notifiche web passano dai server di Google, e il telefono può
ritardarle se decide di risparmiare batteria. Non dipende da Aegis: è come
Android tratta le app web. Nella pratica arrivano puntuali, ma capiterà
qualche ritardo di qualche minuto.

La finestra di tolleranza è di **10 minuti**: se la sveglia salta qualche giro,
il promemoria delle 19:00 arriva comunque fino alle 19:10. Oltre, rinuncia —
un promemoria del pranzo recapitato a metà pomeriggio è solo fastidio.
