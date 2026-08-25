# Mettere Aegis online e installarla sul telefono

Da fare **una volta sola**. Servono circa 5 minuti e nessun account nuovo:
usiamo GitHub, che hai già.

Da qui in poi, ogni modifica al codice andrà online **da sola** entro un paio
di minuti. Non dovrai più tornare su questa pagina.

---

## Prima: cosa diventa pubblico e cosa no

La repository è **pubblica**, quindi:

| Cosa | Chi può vederlo |
|---|---|
| Il **codice** dell'app | Chiunque |
| Il tuo **piano settimanale** | Solo tu, resta sul telefono |
| Le tue **pesate** | Solo tu, restano sul telefono |

I tuoi dati non passano da GitHub: vivono nella memoria del telefono. Online
finisce solo il programma, non quello che ci scrivi dentro.

Quando in Fase 3 arriverà il database, i dati usciranno dal telefono ma
finiranno in un archivio privato, protetto da password — **mai** nella
repository.

> Se preferisci che anche il codice resti privato, si può rendere privata la
> repository: in quel caso però GitHub Pages richiede un abbonamento a pagamento,
> e conviene pubblicare altrove. Dimmelo e cambiamo strada.

---

## Come è configurata (già fatto, non serve rifarlo)

In **Settings → Pages → Source** è impostato **GitHub Actions**.

Con quell'impostazione, il file `.github/workflows/pubblica.yml` compila l'app
e la mette online da solo a ogni modifica del codice.

> ⚠️ Se un domani quella voce venisse rimessa su *"Deploy from a branch"*, la
> pubblicazione **smetterebbe di funzionare**: i due metodi non sono
> intercambiabili. In quel caso va cambiato anche il workflow.

### Come ci si arriva, se serve rimetterci mano

**📱 Dal telefono** — è la parte scomoda, perché GitHub nasconde metà delle
voci. Il modo più semplice è chiedere a Chrome la versione da computer:

1. In Chrome, tocca i **tre puntini ⋮** in alto a destra
2. Spunta **"Sito desktop"**
3. Vai a `github.com/francyfibra-ai/Aegis-v.-0.1/settings/pages`

La pagina diventa piccola ma completa, e si ingrandisce con le dita.
Senza questo passaggio, "Settings" è sepolto dentro il menu **More ▾**.

**💻 Dal computer** — scheda **Settings** → **Pages** nella colonna di sinistra.

### Se un giorno non pubblicasse più

- **L'email dell'account deve essere verificata.** GitHub rifiuta di pubblicare
  se non lo è, e non lo dice con un messaggio comprensibile.
  Si controlla su <https://github.com/settings/emails>.
- Lo stato di ogni pubblicazione è sempre qui:
  <https://github.com/francyfibra-ai/Aegis-v.-0.1/actions>

---

## Passo 2 — Controllare che sia online

**<https://francyfibra-ai.github.io/Aegis-v.-0.1/>**

---

## Passo 3 — Aprirla sul telefono

Indirizzo dell'app:

**<https://francyfibra-ai.github.io/Aegis-v.-0.1/>**

1. Aprilo con **Chrome** sul telefono Android
2. Se vedi una pagina bianca, **ricarica una volta**: al primissimo accesso il
   telefono sta ancora scaricando il programma di sfondo

---

## Passo 4 — Installarla come app

1. In Chrome, tocca i **tre puntini ⋮** in alto a destra
2. Cerca **"Installa app"** oppure **"Aggiungi a schermata Home"**
3. Conferma

Ora Aegis ha la sua icona (lo scudo blu) tra le altre app. **Aprila sempre da
lì**, non dal browser: solo così va a schermo intero e le notifiche funzionano
come si deve.

---

## Passo 5 — Provare le notifiche

1. Apri Aegis **dall'icona in home screen**
2. Vai su **Setup** (in fondo a destra)
3. Controlla i pallini: devono essere **tutti verdi**
4. Tocca **Attiva notifiche** → Android chiede il permesso → **Consenti**
5. Tocca **Invia notifica di prova**
6. Abbassa la tendina delle notifiche: deve esserci Aegis, con i due pulsanti
   **Fatto** e **Saltato**

Se arriva, il canale funziona: in Fase 4 al posto della prova ci saranno i
promemoria veri, agli orari del tuo piano.

---

## Se qualcosa non va

| Sintomo | Cosa fare |
|---|---|
| Pagina bianca | Ricarica. Se resta bianca, controlla che il Passo 2 sia finito col ✓ verde |
| Non compare "Installa app" | Verifica di essere su **Chrome** (non Samsung Internet o Firefox) e di aver ricaricato almeno una volta |
| Pallino rosso su "Service worker attivo" | Ricarica la pagina: si attiva al secondo caricamento |
| Pallino rosso su "Permesso notifiche" dopo aver detto no | Impostazioni Android → App → Aegis → Notifiche → attiva |
| La notifica di prova non arriva | Controlla che Aegis non sia in "Risparmio energetico": Impostazioni → Batteria → Aegis → Senza restrizioni |
| Le modifiche non si vedono | Chiudi del tutto l'app e riaprila: il programma di sfondo si aggiorna alla riapertura |

---

## Nota: il ramo `gh-pages`

Nella repository c'è un ramo chiamato `gh-pages`, rimasto da un tentativo
precedente fatto quando Pages non era ancora attivo. **Non viene più usato**:
con Source su "GitHub Actions" nessuno lo legge, e contiene solo l'app
compilata (nessun codice sorgente).

Per cancellarlo: <https://github.com/francyfibra-ai/Aegis-v.-0.1/branches> →
riga **gh-pages** → icona del **cestino 🗑**.

> 📱 Da telefono serve la **"Sito desktop"** attiva in Chrome, altrimenti
> l'icona del cestino non compare.

Lasciarlo lì non causa alcun problema.

---

## Cosa succede da adesso in poi

Ogni volta che il codice cambia, GitHub lo ricompila e lo mette online da solo.
Tu non devi fare nulla: chiudi e riapri l'app sul telefono e hai la versione
nuova.

Lo stato di ogni pubblicazione è sempre visibile qui:
<https://github.com/francyfibra-ai/Aegis-v.-0.1/actions>

---

## Attenzione: i dati vivono ancora solo sul telefono

Fino alla **Fase 3** il piano e le pesate stanno soltanto nella memoria di
questo telefono. Se lo cambi, o se cancelli i dati di Chrome, spariscono.

Nel frattempo, la rete di sicurezza è in **Setup → Salva una copia**: scarica un
file con dentro tutto. Vale la pena farlo ogni tanto, finché non c'è il database.
