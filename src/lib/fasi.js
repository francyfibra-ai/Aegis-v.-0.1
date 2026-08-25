/*
  fasi.js - elenco delle fasi di sviluppo di Aegis v0.1.
  Serve solo a mostrare l'avanzamento nella schermata iniziale:
  aggiorna il campo "stato" man mano che completiamo le fasi.
  Valori possibili per "stato": 'fatto' | 'in-corso' | 'da-fare'
*/
export const FASI = [
  {
    numero: 1,
    titolo: 'Setup del progetto',
    stato: 'fatto',
    descrizione: 'Struttura base, app installabile sul telefono, account da creare.',
  },
  {
    numero: 2,
    titolo: 'Schermata piano settimanale',
    stato: 'fatto',
    descrizione:
      'Inserire e modificare allenamenti, pasti e controllo peso, giorno per giorno, con il grafico dell\'andamento.',
  },
  {
    numero: 3,
    titolo: 'Salvataggio dati',
    stato: 'fatto',
    descrizione: 'Il piano è nel database online, protetto dal tuo accesso, e ti segue su ogni dispositivo.',
  },
  {
    numero: 4,
    titolo: 'Notifiche push',
    stato: 'in-corso',
    descrizione: 'Promemoria automatici agli orari del piano, anche ad app chiusa.',
  },
  {
    numero: 5,
    titolo: 'Conferma Fatto / Saltato',
    stato: 'da-fare',
    descrizione:
      'Rispondere dalla notifica e costruire lo storico nel tempo. Per il peso, inserire i chili.',
  },
]
