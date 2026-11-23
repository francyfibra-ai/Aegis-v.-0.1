/*
  nuove-chiavi-vapid.mjs
  ---------------------------------------------------------------
  Genera una nuova coppia di chiavi per le notifiche (VAPID).

  Lo lancia GitHub, dal comando "Cambia le chiavi delle notifiche"
  (.github/workflows/cambia-chiavi.yml). Non va lanciato a mano.

  Cosa fa:
   - la chiave PUBBLICA la scrive dentro src/lib/configurazione.js:
     e' pubblica per natura, sta nell'app e la vede chiunque;
   - la chiave PRIVATA la scrive in un file temporaneo (il percorso
     arriva come argomento), da cui GitHub la passa a Supabase.
     Non viene mai stampata ne' salvata nel progetto.

  Il formato e' quello che si aspetta la sveglia
  (supabase/functions/promemoria/webpush.ts):
   - pubblica: 65 byte (0x04 + X + Y) in base64url
   - privata:  il numero segreto "d" della curva P-256, in base64url
*/
import { generateKeyPairSync } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const fileSegreti = process.argv[2]
const fileConfigurazione = process.argv[3] || 'src/lib/configurazione.js'
if (!fileSegreti) {
  console.error('Uso: node supabase/nuove-chiavi-vapid.mjs <file-temporaneo> [configurazione.js]')
  process.exit(1)
}

const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const jwk = privateKey.export({ format: 'jwk' })

const daB64u = (t) => Buffer.from(t, 'base64url')
const pubblica = Buffer.concat([Buffer.from([4]), daB64u(jwk.x), daB64u(jwk.y)]).toString('base64url')
const privata = jwk.d

// Su GitHub, "add-mask" fa si' che il valore, se mai comparisse nei
// registri, venga sostituito da asterischi.
if (process.env.GITHUB_ACTIONS) console.log('::add-mask::' + privata)

writeFileSync(fileSegreti, `AEGIS_VAPID_PUBBLICA=${pubblica}\nAEGIS_VAPID_PRIVATA=${privata}\n`, { mode: 0o600 })

const configurazione = readFileSync(fileConfigurazione, 'utf8')
const aggiornata = configurazione.replace(
  /(export const VAPID_CHIAVE_PUBBLICA =\s*\n?\s*)'[^']*'/,
  `$1'${pubblica}'`
)
if (aggiornata === configurazione) {
  console.error('Non trovo VAPID_CHIAVE_PUBBLICA in ' + fileConfigurazione)
  process.exit(1)
}
writeFileSync(fileConfigurazione, aggiornata)

console.log('Nuova chiave pubblica: ' + pubblica)
