# Aegis v0.1 — routine salutare

App personale per gestire una **routine settimanale ricorrente** (allenamenti e
pasti), ricevere **promemoria sul telefono** agli orari previsti e rispondere
**"Fatto" / "Saltato"**, costruendo uno storico nel tempo.

È il primo tassello di un sistema più ampio: la v0.1 fa **solo** questo.

---

## Com'è fatta

È una **PWA** (Progressive Web App): una pagina web che si installa sul telefono
come un'app normale — icona in home screen, schermo intero, notifiche.
Non passa dal Play Store, non serve pubblicarla da nessuna parte se non online.

- **Interfaccia**: React + Vite (JavaScript, senza TypeScript, per restare leggibile)
- **Stile**: CSS semplice, nessuna libreria grafica esterna
- **Notifiche**: service worker (`public/sw.js`) — il programma che gira in
  background sul telefono anche ad app chiusa

---

## Struttura delle cartelle

```
Aegis/
├── index.html                  Pagina di partenza
├── package.json                Elenco delle librerie e dei comandi
├── vite.config.js              Configurazione dello strumento di sviluppo
│
├── public/                     File pubblicati così come sono
│   ├── manifest.webmanifest    Dice ad Android "questa app è installabile"
│   ├── sw.js                   SERVICE WORKER: riceve le notifiche push
│   └── icon-192.png / icon-512.png
│
├── src/                        Codice dell'interfaccia
│   ├── main.jsx                Punto di partenza dell'app
│   ├── App.jsx                 Schermata principale
│   ├── styles.css              Aspetto grafico
│   ├── components/
│   │   ├── PaginaPiano.jsx     Schermata del piano settimanale
│   │   ├── PaginaPeso.jsx      Schermata del controllo peso
│   │   ├── PaginaSetup.jsx     Diagnostica e copie di sicurezza
│   │   ├── EditorEvento.jsx    Pannello per aggiungere/modificare un evento
│   │   ├── EditorPesata.jsx    Pannello per registrare una pesata
│   │   └── GraficoPeso.jsx     Il grafico, disegnato a mano in SVG
│   └── lib/
│       ├── modello.js          FORMA DEI DATI: com'è fatto un evento
│       ├── archivio.js         UNICO FILE CHE SALVA I DATI (vedi sotto)
│       ├── statistichePeso.js  I conti dietro al grafico (medie, scale)
│       ├── hooks.js            Tiene le schermate aggiornate
│       ├── notifiche.js        Tutto ciò che riguarda le notifiche
│       └── fasi.js             Elenco delle fasi di sviluppo
│
└── docs/                       Guide in italiano
    └── architettura.md         Come funziona il sistema, spiegato semplice
```

---

## Comandi (da eseguire nella cartella del progetto)

| Comando           | Cosa fa                                                        |
|-------------------|----------------------------------------------------------------|
| `npm install`     | Scarica le librerie. Una volta sola, o dopo `git pull`.        |
| `npm run dev`     | Avvia l'app in locale su `http://localhost:5173`               |
| `npm run build`   | Prepara la versione da pubblicare (finisce nella cartella `dist/`) |
| `npm run preview` | Mostra il risultato di `npm run build`                         |

> Serve **Node.js** installato sul computer (versione 18 o superiore):
> si scarica da <https://nodejs.org> — scegli la versione "LTS".

---

## Provare l'app dal telefono durante lo sviluppo

1. Sul computer, avvia `npm run dev`
2. Nel terminale compare anche un indirizzo tipo `http://192.168.1.42:5173`
3. Apri quell'indirizzo dal telefono, **collegato allo stesso WiFi**

⚠️ Da questo indirizzo le **notifiche non funzionano**: Android le consente solo
su connessioni sicure `https://` (o su `localhost`). Per provarle davvero
bisogna pubblicare l'app online — è quello che facciamo nella Fase 1.

---

## Stato delle fasi

| # | Fase                          | Stato     |
|---|-------------------------------|-----------|
| 1 | Setup del progetto            | fatta     |
| 2 | Schermata piano settimanale   | in corso  |
|   | └ controllo peso + grafico    | fatta     |
| 3 | Salvataggio dati (database)   | da fare   |
| 4 | Notifiche push                | da fare   |
| 5 | Conferma Fatto / Saltato      | da fare   |

L'elenco è anche dentro l'app: `src/lib/fasi.js`.

---

## I tre tipi di evento

| Tipo | Come si risponde |
|------|------------------|
| 🏋️ Allenamento | Fatto / Saltato |
| 🍽️ Pasto | Fatto / Saltato |
| ⚖️ Peso | Si inserisce un **numero** (i chili) |

Il peso è diverso dagli altri due, e questo ha una conseguenza pratica in Fase 4:
la sua notifica non avrà i pulsanti "Fatto/Saltato" ma un solo pulsante, che apre
l'app sul campo dove scrivere i chili. Android non permette di scrivere testo
dentro una notifica web, quindi quel passaggio in più è inevitabile.

Il promemoria del peso è un normale evento del piano (di partenza: **domenica
08:00**). Si sposta come tutti gli altri, toccandolo nella schermata Piano. Il
giorno conta meno di quanto sembri: è pesarsi sempre nelle **stesse condizioni**
che rende il grafico leggibile.

---

## Il file più importante: `src/lib/archivio.js`

È **l'unico punto del progetto che tocca i dati salvati**. Tutto il resto
dell'app chiede "dammi gli eventi" / "salva questo evento" e non sa dove
finiscano davvero.

Oggi salva nella memoria del telefono. In **Fase 3** riscriveremo solo quel
file per farlo parlare col database online: le schermate non andranno toccate.

Dentro tiene tre archivi separati: gli **eventi** del piano, le **misurazioni**
di peso e le **preferenze**.

> ⚠️ **Fino alla Fase 3 i dati vivono solo sul dispositivo che stai usando.**
> Se cambi telefono o cancelli i dati del browser, spariscono. Nella schermata
> *Setup* c'è **Salva una copia** per scaricare un file di riserva, e
> **Ripristina da copia** per rileggerlo.
