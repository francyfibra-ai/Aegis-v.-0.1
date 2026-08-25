# Scelte tecniche — perché abbiamo deciso così

Questo documento serve a **ricordare i motivi** delle decisioni importanti.
Se tra sei mesi ti chiedi "perché avevamo scelto questo?", la risposta è qui.

---

## Decisione 1 — PWA invece di app nativa Android

**Scelta: PWA (app web installabile).**

| | PWA | App nativa (Play Store) |
|---|---|---|
| Costo di pubblicazione | 0 € | 25 $ una tantum per l'account sviluppatore |
| Aggiornamenti | Immediati, senza revisione | Ogni versione va approvata da Google |
| Notifiche su Android | Sì, funzionanti anche ad app chiusa | Sì |
| Linguaggio | Lo stesso del sito: uno solo da mantenere | Kotlin/Java: un secondo mondo da imparare |

Su Android una PWA fa tutto quello che serve alla v0.1. Su iPhone le notifiche
push per PWA esistono dal 2023 ma solo se l'app viene aggiunta alla schermata
Home: non è un problema oggi, ma va ricordato se un domani cambi telefono.

---

## Decisione 2 — Dove tenere dati, sveglia e pubblicazione

Le tre cose vanno insieme, quindi si decidono insieme:
1. il **database** (piano settimanale e storico)
2. la **sveglia** nel cloud che manda le notifiche all'ora giusta
3. l'**hosting**, cioè dove vive l'app online

### Le due strade valutate

|  | **Firebase** (Google) | **Supabase + Netlify** |
|---|---|---|
| Database | Firestore — proprietario Google | PostgreSQL — standard aperto |
| Portabilità dei dati | Bassa: cambiare fornitore = riscrivere il codice dei dati | Alta: un export, e qualsiasi altro servizio lo riprende |
| Analisi dello storico (v0.2) | Non sa raggruppare/incrociare: serve BigQuery a parte | È il suo mestiere: una query SQL |
| Memoria per un assistente AI (v0.3+) | Prodotto aggiuntivo | `pgvector` già incluso |
| Carta di credito | **Obbligatoria** (piano Blaze, serve per la sveglia) | Non richiesta |
| Come crescono i costi | A consumo, variabile, senza blocco rigido | Gratis fino a un limite, poi 25 $/mese fissi |
| Account da creare | 1 | 2 (Supabase + Netlify) |
| Va mai in pausa? | Mai | Il piano gratuito sì, dopo 7 giorni di inattività totale |
| Documentazione ed esempi | Moltissimi | Buoni, ma meno |

### Nota sul rischio fornitore

Sembra che Google sia la scelta più sicura perché è più grande. Ma il rischio
che conta non è "chi sopravvive", è **quanto costa se sbaglio**:

- Google chiude prodotti anche dentro Firebase (*Dynamic Links*, spento nel 2025).
- Se Supabase chiudesse, sotto c'è PostgreSQL standard: il database si sposta
  altrove in una serata, senza toccare il codice.

Il formato aperto vale più della dimensione dell'azienda.

### Nota sulle notifiche

In entrambe le strade sono **i server di Google a consegnare** materialmente la
notifica al telefono Android: è così che funziona Android, non è una scelta
nostra. La differenza è solo se serve un account Firebase per usarli (Firebase)
oppure si usa lo standard web aperto, che passa dagli stessi server (Supabase).

### Decisione presa

> **Da confermare — vedi conversazione in corso.**
> Raccomandazione: **Supabase + Netlify**, perché i dati restano in un formato
> portabile e le analisi previste per la v0.2 sono esattamente ciò che SQL fa
> bene e Firestore fa male.

---

## Decisione 3 — Pubblicazione automatica da GitHub

**Scelta: automatica.** Ogni modifica salvata su GitHub finisce online da sola
entro un minuto.

Conseguenza pratica: non serve installare niente sul computer e non serve mai
aprire il terminale. Il rovescio della medaglia è che una modifica sbagliata va
online subito — per questo lavoriamo su un ramo separato (`claude/...`) e
uniamo al ramo principale solo quando la cosa è verificata.

---

## Decisione 4 — JavaScript invece di TypeScript

**Scelta: JavaScript semplice.**

TypeScript aiuta a evitare errori nei progetti grandi, ma aggiunge un livello di
sintassi in più da leggere. Visto che la priorità dichiarata è *"il codice deve
restare comprensibile"*, si resta su JavaScript, con commenti in italiano.

Se il progetto crescesse molto (v0.3+, più aree di vita, più dati), questa
decisione si può rivedere: si converte un file alla volta, senza rifare tutto.
