-- ==================================================================
--  AEGIS - TABELLE PER LE NOTIFICHE (Fase 4)
-- ==================================================================
--  Da incollare nel pannello Supabase, sezione "SQL Editor", e premere
--  Run. Si aggiunge a supabase/schema.sql, non lo sostituisce.
--
--  Si puo' rieseguire senza danni.
-- ==================================================================


-- ==================================================================
--  1. ISCRIZIONI_PUSH - dove mandare le notifiche
-- ------------------------------------------------------------------
--  Quando accetti le notifiche, il telefono genera un indirizzo unico
--  e una coppia di chiavi, e li comunica all'app. Questa tabella li
--  conserva: e' l'equivalente di un numero di telefono, valido per
--  quel dispositivo e solo per Aegis.
--
--  Una riga per dispositivo: se apri Aegis anche dal tablet, le righe
--  diventano due e le notifiche arrivano a entrambi.
-- ==================================================================
create table if not exists public.iscrizioni_push (
  id uuid primary key default gen_random_uuid(),
  utente uuid not null references auth.users(id) on delete cascade,

  -- L'indirizzo a cui scrivere, fornito dal servizio push del telefono.
  -- E' unico: se lo stesso dispositivo si registra di nuovo, la riga
  -- viene aggiornata invece di duplicarsi.
  endpoint text not null unique,

  -- Le due chiavi con cui si cifra il contenuto. Senza queste, la
  -- notifica sarebbe leggibile da chi la trasporta.
  chiave_p256dh text not null,
  chiave_auth text not null,

  -- Un'etichetta per riconoscere il dispositivo nell'elenco
  dispositivo text not null default '',

  creata_il timestamptz not null default now()
);

create index if not exists iscrizioni_per_utente on public.iscrizioni_push (utente);


-- ==================================================================
--  2. INVII - cosa e' gia' stato mandato
-- ------------------------------------------------------------------
--  La sveglia gira ogni minuto e accetta fino a 10 minuti di ritardo:
--  senza memoria di cosa ha gia' fatto, manderebbe lo stesso
--  promemoria dieci volte di fila.
--
--  Il vincolo di unicita' in fondo e' il meccanismo vero: e' il
--  database a impedire il doppione, non il codice della sveglia. Anche
--  se due esecuzioni partissero insieme, solo una riuscirebbe a
--  inserire la riga, e solo quella manderebbe la notifica.
-- ==================================================================
create table if not exists public.invii (
  id uuid primary key default gen_random_uuid(),
  utente uuid not null references auth.users(id) on delete cascade,
  evento uuid references public.eventi(id) on delete cascade,

  -- Il giorno a cui appartiene l'occorrenza. Non e' sempre "oggi": un
  -- evento delle 23:58 notificato alle 00:03 appartiene a ieri.
  data date not null,

  inviato_il timestamptz not null default now(),

  unique (utente, evento, data)
);

create index if not exists invii_per_utente on public.invii (utente, data);


-- ==================================================================
--  3. REGOLE DI PROTEZIONE
-- ------------------------------------------------------------------
--  Come per le altre tabelle: ognuno vede e modifica solo le proprie
--  righe. La sveglia non passa da queste regole perche' usa la chiave
--  di servizio, l'unica che le scavalca - ed e' il motivo per cui
--  quella chiave non deve uscire da Supabase.
-- ==================================================================

alter table public.iscrizioni_push enable row level security;
alter table public.invii enable row level security;

drop policy if exists "solo le proprie iscrizioni" on public.iscrizioni_push;
create policy "solo le proprie iscrizioni" on public.iscrizioni_push
  for all using (auth.uid() = utente) with check (auth.uid() = utente);

drop policy if exists "solo i propri invii" on public.invii;
create policy "solo i propri invii" on public.invii
  for all using (auth.uid() = utente) with check (auth.uid() = utente);


-- ==================================================================
--  4. PULIZIA AUTOMATICA DELLO STORICO INVII
-- ------------------------------------------------------------------
--  La tabella invii cresce di qualche riga al giorno per sempre. Non
--  e' un problema di spazio, ma non serve ricordare cosa e' stato
--  mandato tre mesi fa: bastano gli ultimi giorni per evitare i
--  doppioni. Questa funzione verra' richiamata dalla sveglia.
-- ==================================================================
create or replace function public.pulisci_invii_vecchi()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.invii where data < current_date - interval '7 days';
$$;
