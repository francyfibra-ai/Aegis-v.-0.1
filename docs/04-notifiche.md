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

Pannello Supabase → **Edge Functions** → **Deploy a new function** →
**Via Editor**

- **Nome della funzione**: `promemoria` (esattamente così: il nome finisce
  nell'indirizzo che la sveglia chiamerà)
- Cancella il codice di esempio e incolla tutto il contenuto di
  **`supabase/functions/promemoria/completo.ts`**
- Se compare l'opzione **Verify JWT** (o "Enforce JWT verification"),
  **disattivala**: la funzione si protegge da sola con un segreto, e con la
  verifica attiva la sveglia non riuscirebbe a chiamarla
- **Deploy**

> Il file da incollare è uno solo ma lungo (circa 750 righe). È generato
> unendo i tre file in `supabase/functions/promemoria/`, che restano la
> versione da leggere e modificare.

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
curl -X POST "https://zikfldmqdsacywvxiuab.supabase.co/functions/v1/promemoria?prova=1" \
  -H "x-aegis-segreto: IL_TUO_SEGRETO"
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
| La funzione risponde `401` | Il segreto non coincide tra Passo 3 e Passo 5 |
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
