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

Nella maggior parte dei casi **non serve fare nulla**: la pubblicazione
avviene da sola. Segui questo passo solo se, dopo qualche minuto,
l'indirizzo del Passo 2 non risponde.

### 📱 Dal telefono (attenzione, qui casca l'asino)

Su GitHub da telefono **la voce "Settings" non è visibile** tra le schede:
si vede `Code · Issues · Pull requests · Actions · More ▾`. È nascosta dentro
**More ▾**.

1. Apri la repository, tocca **More ▾** in fondo alla fila di schede
2. Nell'elenco che si apre, tocca **Settings**
3. Scorri la pagina fino alla sezione **Pages** (su telefono le voci sono una
   sotto l'altra, non in una colonna a sinistra: bisogna scorrere parecchio)

Scorciatoia, se preferisci: incolla direttamente questo indirizzo nel browser
<https://github.com/francyfibra-ai/Aegis-v.-0.1/settings/pages>

### 💻 Dal computer

Scheda **Settings** in alto → voce **Pages** nella colonna di sinistra.

### Cosa impostare, una volta arrivato

Alla voce **Source** (o "Build and deployment") scegli:

- **Deploy from a branch** → ramo **gh-pages** → cartella **/ (root)** → **Save**

---

## Passo 2 — Controllare che sia online

Aspetta un paio di minuti dopo il ✓ verde in **Actions**, poi apri:

**<https://francyfibra-ai.github.io/Aegis-v.-0.1/>**

Se risponde, hai finito: non dovrai più tornare qui.

> ⚠️ **Le X rosse dei primi tentativi sono attese.** I primissimi tentativi
> usavano un metodo di pubblicazione che richiedeva per forza un passaggio
> manuale. Contano solo i tentativi più recenti.

### Se l'email dell'account non è verificata

GitHub **non pubblica** siti se l'indirizzo email dell'account non è confermato.
Si controlla su <https://github.com/settings/emails>: se accanto alla tua email
c'è scritto **Unverified**, tocca *Resend verification email* e conferma dalla
posta. È un blocco che non dà nessun messaggio d'errore comprensibile.

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
