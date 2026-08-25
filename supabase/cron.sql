-- ==================================================================
--  AEGIS - LA SVEGLIA: accende la funzione ogni minuto
-- ==================================================================
--  PRIMA DI INCOLLARLO: sostituisci IL_TUO_SEGRETO qui sotto con il
--  segreto che ti e' stato comunicato. Serve a impedire che qualcuno
--  possa far girare la sveglia a comando.
--
--  ⚠️ Una volta sostituito, questo testo contiene un segreto: incollalo
--  nel pannello Supabase, non rimandarlo indietro e non salvarlo su
--  GitHub. Nel progetto resta la versione con il segnaposto.
-- ==================================================================

-- ⚠️ IL NOME DELLA FUNZIONE
-- Deve coincidere ESATTAMENTE con quello che compare nel pannello
-- Supabase, sezione Edge Functions. Se non coincide, la sveglia
-- chiama un indirizzo inesistente e riceve 404 a ogni giro, senza
-- che nulla lo segnali nell'app.
-- Qui e' impostato su 'nome-promemoria', il nome effettivamente usato.

-- Due estensioni di PostgreSQL:
--   pg_cron  sa eseguire qualcosa a orari stabiliti
--   pg_net   sa fare richieste web dall'interno del database
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Se una programmazione precedente esiste gia', la togliamo:
-- cosi' questo testo si puo' rieseguire senza accumulare doppioni.
select cron.unschedule('aegis-promemoria')
where exists (select 1 from cron.job where jobname = 'aegis-promemoria');

-- '* * * * *' significa: ogni minuto, di ogni ora, di ogni giorno.
select cron.schedule(
  'aegis-promemoria',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://zikfldmqdsacywvxiuab.supabase.co/functions/v1/nome-promemoria',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-aegis-segreto', 'IL_TUO_SEGRETO'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    );
  $$
);

-- Una volta al giorno, alle 4 del mattino, ripulisce lo storico invii
select cron.unschedule('aegis-pulizia')
where exists (select 1 from cron.job where jobname = 'aegis-pulizia');

select cron.schedule('aegis-pulizia', '0 4 * * *', $$ select public.pulisci_invii_vecchi(); $$);


-- ==================================================================
--  CONTROLLI UTILI
-- ------------------------------------------------------------------
--  Da eseguire separatamente, quando si vuole capire se la sveglia
--  sta girando.
-- ==================================================================

-- Le programmazioni attive:
--   select jobid, jobname, schedule, active from cron.job;

-- Come sono andate le ultime esecuzioni:
--   select jobname, status, return_message, start_time
--   from cron.job_run_details order by start_time desc limit 20;

-- Le risposte ricevute dalla funzione (pg_net le conserva un po'):
--   select id, status_code, content from net._http_response
--   order by created desc limit 10;

-- Per fermare tutto:
--   select cron.unschedule('aegis-promemoria');
