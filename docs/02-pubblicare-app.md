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

## Passo 1 — Accendere GitHub Pages

1. Apri: <https://github.com/francyfibra-ai/Aegis-v.-0.1/settings/pages>
   (è la scheda **Settings** della repository, voce **Pages** nella colonna
   di sinistra)
2. Alla voce **Source** (o "Build and deployment") c'è un menu a tendina
3. Scegli **GitHub Actions** — *non* "Deploy from a branch"
4. Non serve premere Salva: la scelta è immediata

---

## Passo 2 — Far partire la pubblicazione

1. Apri la scheda **Actions**:
   <https://github.com/francyfibra-ai/Aegis-v.-0.1/actions>
2. Nella colonna di sinistra clicca **Pubblica Aegis**
3. A destra compare il pulsante **Run workflow** → cliccalo, poi conferma
   cliccando di nuovo **Run workflow** nel riquadro che si apre
4. Aspetta 1-2 minuti. Quando compare il **segno di spunta verde ✓** è online

> ⚠️ **Se avevi già visto una X rossa prima di fare il Passo 1, è normale.**
> Il tentativo automatico parte appena il codice viene salvato, e fallisce
> finché Pages non è acceso. Dopo il Passo 1, rilancialo come sopra.

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
