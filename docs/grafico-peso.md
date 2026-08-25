# Il grafico del peso: perché è fatto così

Un grafico può mentire senza dire una sola cosa falsa: basta scegliere male la
scala. Queste sono le scelte fatte per evitarlo, con il motivo di ognuna.
Se un domani il grafico va modificato, conviene rileggere prima questa pagina.

---

## 1. L'asse verticale non parte da zero

Su un peso partire da zero non avrebbe senso: tra 0 e 80 kg non succede nulla,
e tutte le variazioni verrebbero schiacciate in una riga piatta in cima.
(La regola del "parti sempre da zero" vale per i grafici a barre, dove è la
*lunghezza* della barra a rappresentare il valore. Qui conta la posizione.)

## 2. Ma la scala non si stringe mai sotto i 2 kg

È l'errore opposto, e più subdolo. Se in un mese oscilli tra 80,3 e 80,5 kg, una
scala "aderente ai dati" riempirebbe tutto lo schermo con 200 grammi di
oscillazione: sembrerebbe un crollo, o un disastro, quando non è successo nulla.

Per questo `scalaVerticale()` allarga sempre la finestra ad almeno 2 kg. Il
grafico piatto, quando il peso è piatto, **è** l'informazione corretta.

## 3. L'asse orizzontale rispetta le date vere

I punti non sono equidistanti: sono messi alla loro posizione reale nel tempo.
Se salti tre settimane, nel grafico si vede il buco. Distribuire i punti a
distanza uguale avrebbe nascosto le interruzioni, facendo sembrare costante una
misurazione che costante non è stata.

## 4. Tre livelli di ingrandimento, non tre periodi

I filtri **Settimane / Mesi / Anni** non cambiano solo quanto indietro si guarda:
cambiano anche quanto si riassume.

| Filtro | Periodo | Ogni punto è |
|---|---|---|
| Settimane | ultime 12 settimane | una singola pesata |
| Mesi | ultimi 12 mesi | la media di quel mese |
| Anni | tutto lo storico | la media di quel mese |

Il motivo: tre anni di pesate settimanali sono 150 punti, illeggibili su un
telefono. La media mensile toglie il rumore e lascia vedere la tendenza — che
su tre anni è esattamente ciò che interessa.

## 5. Un solo numero scritto sul grafico

Solo l'ultimo valore è scritto accanto al suo punto. Mettere un numero su ogni
punto è rumore che nessuno legge. Gli altri valori si raggiungono in tre modi:
le tacche a sinistra, il riquadro che compare toccando il grafico, e **l'elenco
completo sotto** — che è anche l'unico modo di leggerli con un lettore di
schermo o senza usare le mani.

Il riquadro al tocco *aggiunge* comodità, non è mai l'unica via a un numero.

## 6. I colori non sono scelti a occhio

I tre tipi di evento (allenamento, pasto, peso) usano i primi tre colori di una
palette verificata con uno strumento automatico, che misura quanto restano
distinguibili anche per chi ha difficoltà a percepire i colori. Non vanno
cambiati a intuito: se servisse un quarto tipo, va rifatta la verifica.

Le variazioni di peso usano verde e rosso, ma **mai da soli**: accanto c'è
sempre una freccia (↑ ↓ →) e una scritta. Chi non distingue i colori legge
comunque la stessa informazione.

## 7. Il verde e il rosso dipendono da te

Un'app che colora di rosso "+0,5 kg" sta dando per scontato che tu voglia
dimagrire. Non è affar suo deciderlo.

Per questo esiste l'impostazione **Obiettivo** (perdere / mantenere / aumentare /
nessuno). Il valore di partenza è **nessuno**: finché non scegli, l'app mostra i
numeri e basta, in grigio, senza giudicare. Con "mantenere", vengono considerati
positivi gli scostamenti entro il mezzo chilo.

---

## Dove mettere le mani

| Cosa vuoi cambiare | File |
|---|---|
| I conti: medie, periodi, scala verticale | `src/lib/statistichePeso.js` |
| Il disegno: linea, pallini, tacche, tocco | `src/components/GraficoPeso.jsx` |
| La schermata attorno al grafico | `src/components/PaginaPeso.jsx` |
| I colori dei tipi, gli obiettivi, i formati | `src/lib/modello.js` |
