/*
  unisci-funzione.mjs
  ---------------------------------------------------------------
  Unisce i tre file della funzione "promemoria" in un file solo,
  da incollare nel pannello di Supabase.

  PERCHE'
  Il codice e' scritto in tre file perche' cosi' la parte delicata
  (calcoli su orari e fusi) si puo' provare da sola. Ma il pannello di
  Supabase e' comodo con un file solo. Questo script tiene allineate
  le due cose: si modificano i tre file, si rilancia
      node supabase/unisci-funzione.mjs
  e il file da incollare si aggiorna.
*/
import { readFileSync, writeFileSync } from 'node:fs'

const cartella = 'supabase/functions/promemoria/'

/** Toglie le righe di import tra i nostri file: uniti, non servono piu'. */
function senzaImportInterni(testo) {
  return testo
    .split('\n')
    .filter((riga) => !/^import .*from '\.\/.*\.ts'/.test(riga.trim()))
    .join('\n')
}

/** Toglie "export" dalle dichiarazioni: in un file solo non serve. */
function senzaExport(testo) {
  return testo.replace(/^export (function|async function|interface|const|type) /gm, '$1 ')
}

const pezzi = ['webpush.ts', 'logica.ts', 'index.ts'].map((nome) => {
  const contenuto = readFileSync(cartella + nome, 'utf8')
  const pulito = nome === 'index.ts'
    ? senzaImportInterni(contenuto)
    : senzaExport(senzaImportInterni(contenuto))
  return `/* ============ da ${nome} ============ */\n\n${pulito.trim()}\n`
})

const intestazione = `/*
  AEGIS - funzione "promemoria", versione da incollare
  ---------------------------------------------------------------
  ⚠️ NON MODIFICARE QUESTO FILE A MANO.

  E' generato unendo i tre file in supabase/functions/promemoria/.
  Per cambiare qualcosa si modificano quelli e si rilancia:
      node supabase/unisci-funzione.mjs

  Serve SOLO per incollare a mano nel pannello Supabase, quando non si
  usa la pubblicazione automatica da GitHub (vedi il workflow
  .github/workflows/pubblica-funzione.yml, che e' la via consigliata).

  Se lo incolli nel pannello, il file li' dentro deve chiamarsi
  index.ts: e' il nome che Supabase cerca come punto di partenza.
*/

`

// Il file unito sta FUORI dalla cartella della funzione: dentro, la
// riga di comando di Supabase lo troverebbe accanto a index.ts e
// proverebbe a interpretarlo come codice a se' stante.
writeFileSync('supabase/funzione-da-incollare.ts', intestazione + pezzi.join('\n'))
console.log('creato supabase/funzione-da-incollare.ts')
