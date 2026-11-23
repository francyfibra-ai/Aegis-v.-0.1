-- ==================================================================
--  AEGIS - LO STATO DELLA SVEGLIA, LEGGIBILE DALL'APP
-- ==================================================================
--  A cosa serve: se la sveglia si ferma (segreto sbagliato, funzione
--  cancellata, programmazione tolta), i promemoria smettono di
--  arrivare senza che niente lo dica. Con questa funzione l'app puo'
--  chiedere "quando ha funzionato l'ultima volta?" e avvisarti.
--
--  Da dove prende la risposta: ogni minuto la sveglia chiama la
--  funzione "promemoria" tramite pg_net, che conserva per qualche ora
--  le risposte ricevute (tabella net._http_response). Una risposta 200
--  significa che la funzione e' stata raggiunta, ha accettato il
--  segreto e ha fatto il suo giro.
--
--  COSA ESPONE, E A CHI
--  Solo tre orari e un codice numerico: niente contenuti, niente
--  indirizzi, niente dati di altre persone. La puo' chiamare solo chi
--  ha fatto l'accesso.
--
--  "security definer" serve perche' la tabella di pg_net non e'
--  leggibile da chi usa l'app: la funzione la legge con i permessi di
--  chi l'ha creata, ma restituisce solo i quattro valori qui sotto.
--  "search_path = ''" impedisce che qualcuno la inganni con tabelle
--  omonime in altri schemi: per questo ogni nome e' scritto per intero.
--
--  Si puo' rieseguire senza problemi.
-- ==================================================================

-- Cambiando le colonne restituite, la versione precedente va tolta prima.
drop function if exists public.stato_sveglia();

create function public.stato_sveglia()
returns table (
  adesso timestamptz,           -- l'ora del server: il confronto non dipende
                                -- dall'orologio del telefono
  ultimo_ok timestamptz,        -- ultima risposta 200
  ultima_risposta timestamptz,  -- ultima risposta di qualunque tipo
  ultimo_codice integer         -- il codice di quest'ultima (200, 401, 500...)
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    now(),
    (select max(r.created) from net._http_response r where r.status_code = 200),
    ultima.created,
    ultima.status_code
  from (select 1) as uno
  left join lateral (
    select r.created, r.status_code
    from net._http_response r
    order by r.id desc
    limit 1
  ) as ultima on true;
$$;

-- Nessuno puo' chiamarla, tranne chi ha fatto l'accesso.
revoke all on function public.stato_sveglia() from public, anon;
grant execute on function public.stato_sveglia() to authenticated;
