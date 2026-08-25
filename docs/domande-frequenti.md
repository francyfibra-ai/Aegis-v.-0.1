# Domande frequenti sulla scelta dell'infrastruttura

Raccolta dei dubbi emersi prima di decidere, con le risposte in numeri.
Serve a poterci tornare sopra senza rifare i conti a memoria.

---

## "Se metto la carta di credito su Firebase, quanto rischio davvero?"

Consumo previsto per Aegis v0.1, con i limiti gratuiti a confronto:

| Cosa | Ne useremmo | Gratis fino a | Siamo al |
|---|---|---|---|
| Accensioni della sveglia | ~43.800 / mese | 2.000.000 / mese | 2 % |
| Letture del piano | ~1.440 / giorno | 50.000 / giorno | 3 % |
| Sveglie programmate | 1 | 3 | 33 % |
| Spazio e traffico | trascurabile | 1 GB / 10 GB | ~0 % |

Il consumo normale costa **0 €**, con circa 30 volte il margine.

**Il rischio vero è un altro:** un errore di programmazione che si auto-alimenta
— una funzione che scrive nel database e, così facendo, risveglia sé stessa
all'infinito. È l'origine delle "bollette a sorpresa" di cui si legge online.

Come lo escludiamo:
- la sveglia si accende **a orario**, non "quando cambia un dato": è
  l'architettura stessa a rendere il loop impossibile;
- limite tecnico di 1 sola copia della funzione in esecuzione per volta;
- avviso di budget impostato a 1 €.

Rischio residuo: basso, ma non zero. Con Supabase è zero, perché senza carta
registrata non c'è nulla da addebitare.

---

## "E se scelgo male e voglio cambiare?"

| Quando cambi idea | Costo del cambio |
|---|---|
| Adesso (v0.1, due tabelle, nessuno storico) | mezza giornata di lavoro, nessun dato perso |
| Fra un anno (12 mesi di storico, più aree di vita) | giorni, con dati veri da spostare |
| Da PostgreSQL verso qualunque altra cosa | sempre facile |
| Da Firestore verso qualunque altra cosa | sempre difficile |

**La decisione non è irreversibile oggi: lo diventa col tempo.**

In ogni caso, tutto il codice che tocca il database sta in un **unico file**
(`src/lib/archivio.js`). Il resto dell'app non sa quale database ci sia sotto.
Cambiare fornitore significa riscrivere quel file, non l'applicazione.

---

## "Cosa devo saper fare io, concretamente?"

- **Setup, una volta sola:** 30-40 minuti di clic seguendo una guida passo
  passo — creare l'account, creare il progetto, copiare due chiavi. Uguale
  in entrambe le strade.
- **Dopo il setup:** nulla. Quei pannelli non si riaprono più.
- **Unica differenza:** Firebase = 1 pannello da ricordare, Supabase +
  Netlify = 2.

---

## "La pausa dopo 7 giorni fa perdere i dati?"

No. Il progetto va in stand-by e si riattiva con un clic; i dati restano.

Inoltre, per finire in pausa serve che **nessuno** tocchi il database per 7
giorni consecutivi — ma la sveglia lo interroga ogni minuto. Accadrebbe solo
smettendo di usare l'app e spegnendo la sveglia.

---

## "La documentazione in meno di Supabase è un problema per me?"

Non direttamente: quella documentazione la legge chi scrive il codice, non tu.

Diventerebbe un problema solo dovendo chiedere aiuto a **un altro
sviluppatore**: di persone che conoscono Firebase ce ne sono più che di persone
che conoscono Supabase. Però di persone che conoscono SQL e PostgreSQL ce ne
sono più che di entrambe messe insieme — è lo standard più diffuso e più
insegnato in assoluto quando si parla di dati. Su questo punto le due strade
sostanzialmente pareggiano.
