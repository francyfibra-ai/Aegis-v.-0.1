# Come funziona Aegis, spiegato semplice

Questo documento risponde a una domanda: **come fa il telefono a suonare
all'ora giusta, anche se l'app è chiusa?**

---

## 1. I tre pezzi del sistema

```
   ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
   │  IL TELEFONO │        │  IL DATABASE │        │  LA SVEGLIA  │
   │              │        │              │        │  (nel cloud) │
   │  App Aegis   │◄──────►│ Piano sett.  │◄───────│ ogni minuto  │
   │  + notifiche │        │ Storico      │        │ controlla    │
   └──────────────┘        └──────────────┘        └──────┬───────┘
          ▲                                               │
          └───────────────  notifica push  ───────────────┘
```

1. **Il telefono** mostra l'app e riceve le notifiche.
2. **Il database** conserva il piano settimanale e lo storico. Sta online, così
   i dati non si perdono se cambi telefono.
3. **La "sveglia"** è un piccolo programma che gira nel cloud: ogni minuto
   guarda l'orologio, guarda il piano, e se è ora di un evento manda la notifica.

---

## 2. Perché serve la "sveglia" nel cloud

È la parte meno intuitiva, quindi vale la pena spiegarla bene.

Verrebbe naturale pensare: *"l'app sul telefono programma la notifica da sola,
come una sveglia"*. **Su Android + web questo non è possibile.** Motivi:

- Android **sospende** le pagine web quando non le stai guardando, per
  risparmiare batteria. Un timer impostato dall'app smette semplicemente di
  esistere.
- Esisteva uno standard web pensato apposta per questo (*Notification Triggers*),
  ma Chrome l'ha sperimentato e poi **rimosso**. Oggi non c'è.

Quindi l'unico modo affidabile è: **qualcosa fuori dal telefono controlla
l'orologio e "bussa"**. Quando la notifica arriva, Android sveglia il service
worker (`public/sw.js`) anche ad app completamente chiusa, e mostra il messaggio.

### "Serve quindi un server acceso 24 ore su 24?"

**No, e non dovrai gestirne uno.** Si usa un servizio *serverless*: un programma
che sta spento e viene acceso automaticamente ogni minuto da uno *scheduler*
(una sveglia programmata, in gergo "cron"). Resta acceso qualche decimo di
secondo, fa il suo controllo, si rispegne. Nel piano gratuito questo costa 0€.

---

## 3. Cosa succede, passo per passo

**Quando inserisci il piano (Fase 2 e 3)**

1. Scrivi "Lunedì 19:00 — Petto e tricipiti" nell'app
2. L'app lo salva nel database online

**Quando arriva l'ora (Fase 4)**

3. Alle 19:00 la sveglia nel cloud si accende e controlla il piano
4. Trova l'evento delle 19:00 e invia una notifica push al tuo telefono
5. Android sveglia `public/sw.js`, che mostra la notifica con due pulsanti

**Quando rispondi (Fase 5)**

6. Premi "Fatto" (o "Saltato") direttamente dalla notifica
7. Il service worker registra la risposta nel database, con data e ora
8. Nel tempo si costruisce lo storico — la base per le analisi della v0.2

---

## 4. Il "permesso notifiche"

Android chiede il permesso **una volta sola**, e la richiesta deve partire da un
tuo tocco su un pulsante (non all'apertura dell'app). Per questo nell'app c'è il
pulsante **"Attiva notifiche"**.

Se per sbaglio rispondi "No", il pulsante non ricompare più: bisogna riattivarlo
da *Impostazioni Android → App → Aegis → Notifiche*.

---

## 5. Due requisiti tecnici da ricordare

- **HTTPS obbligatorio.** Notifiche e installazione funzionano solo su un
  indirizzo `https://...` (l'unica eccezione è `localhost` sul computer).
  Per questo l'app va pubblicata online prima di poter provare le notifiche.
- **Un solo utente.** La v0.1 è pensata per te soltanto. Non c'è login. Il
  database sarà configurato di conseguenza; se in futuro l'app dovesse essere
  usata da più persone, quella parte va rifatta (è una scelta consapevole per
  tenere semplice la v0.1).
