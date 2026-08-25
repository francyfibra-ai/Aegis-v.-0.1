-- ==================================================================
--  AEGIS - STRUTTURA DEL DATABASE
-- ==================================================================
--  Questo testo si incolla UNA VOLTA SOLA nel pannello di Supabase,
--  alla voce "SQL Editor", e poi si preme "Run".
--
--  Crea quattro tabelle (elenchi di dati) e le regole che impediscono
--  a chiunque non sia il proprietario di leggerle o modificarle.
--
--  Si puo' rieseguire senza danni: ogni pezzo controlla prima se
--  esiste gia'.
-- ==================================================================


-- ==================================================================
--  1. PROFILI - una riga per persona
-- ------------------------------------------------------------------
--  Contiene il nome (per personalizzare le notifiche), l'obiettivo di
--  peso e il fuso orario.
--
--  Il fuso orario non e' un dettaglio: il programma che manda le
--  notifiche gira su un server che ragiona in orario di Greenwich.
--  Senza sapere che tu vivi in Italia, un promemoria delle 19:00
--  arriverebbe alle 21:00.
-- ==================================================================
create table if not exists public.profili (
  -- Collegamento all'utenza: se l'utenza viene cancellata, sparisce tutto
  utente uuid primary key references auth.users(id) on delete cascade,

  -- Come vuoi essere chiamato nelle notifiche
  nome text not null default '' check (char_length(nome) <= 40),

  -- Serve solo a decidere se colorare di verde o rosso una variazione
  obiettivo_peso text not null default 'nessuno'
    check (obiettivo_peso in ('nessuno', 'perdere', 'mantenere', 'aumentare')),

  fuso_orario text not null default 'Europe/Rome',

  aggiornato_il timestamptz not null default now()
);


-- ==================================================================
--  2. EVENTI - il piano settimanale
-- ------------------------------------------------------------------
--  Un evento per riga: "lunedi' alle 19:00, allenamento, petto e
--  tricipiti". E' ricorrente: vale ogni settimana.
-- ==================================================================
create table if not exists public.eventi (
  id uuid primary key default gen_random_uuid(),
  utente uuid not null references auth.users(id) on delete cascade,

  -- 0 = lunedi' ... 6 = domenica (la stessa numerazione usata nell'app)
  giorno smallint not null check (giorno between 0 and 6),

  tipo text not null check (tipo in ('allenamento', 'pasto', 'peso')),

  titolo text not null check (char_length(titolo) between 1 and 200),

  -- Salvato come testo "HH:MM" invece che come orario vero: e' la stessa
  -- forma usata dall'app, quindi non serve nessuna conversione, e per
  -- confrontare due orari il testo funziona benissimo ("08:30" viene
  -- prima di "19:00" anche in ordine alfabetico).
  orario text not null check (orario ~ '^[0-2][0-9]:[0-5][0-9]$'),

  creato_il timestamptz not null default now()
);

-- Indice: rende immediato "dammi tutti gli eventi di questa persona"
create index if not exists eventi_per_utente on public.eventi (utente, giorno, orario);


-- ==================================================================
--  3. MISURAZIONI - le pesate
-- ==================================================================
create table if not exists public.misurazioni (
  id uuid primary key default gen_random_uuid(),
  utente uuid not null references auth.users(id) on delete cascade,

  data date not null,

  -- numeric(5,1) = fino a 9999.9, con un solo decimale.
  -- I limiti servono a intercettare un errore di battitura, non a giudicare.
  peso numeric(5,1) not null check (peso between 20 and 400),

  creato_il timestamptz not null default now(),

  -- Una sola pesata al giorno: registrarne una seconda sostituisce
  -- la prima, esattamente come si comporta gia' l'app.
  unique (utente, data)
);

create index if not exists misurazioni_per_utente on public.misurazioni (utente, data);


-- ==================================================================
--  4. RISPOSTE - lo storico "fatto / saltato"       [serve in Fase 5]
-- ------------------------------------------------------------------
--  La creiamo fin d'ora: aggiungerla dopo avrebbe voluto dire tornare
--  a mettere le mani nel database con dei dati veri gia' dentro.
-- ==================================================================
create table if not exists public.risposte (
  id uuid primary key default gen_random_uuid(),
  utente uuid not null references auth.users(id) on delete cascade,

  -- Se un evento viene cancellato dal piano, la sua storia resta:
  -- il collegamento diventa vuoto ma la riga sopravvive.
  evento uuid references public.eventi(id) on delete set null,

  -- Copia del titolo al momento della risposta: cosi' lo storico resta
  -- leggibile anche se in futuro rinomini o elimini l'evento.
  titolo text not null default '',

  data date not null,

  stato text not null check (stato in ('fatto', 'saltato')),

  registrato_il timestamptz not null default now(),

  -- Una risposta sola per evento per giorno
  unique (utente, evento, data)
);

create index if not exists risposte_per_utente on public.risposte (utente, data);


-- ==================================================================
--  5. LE REGOLE DI PROTEZIONE (Row Level Security)
-- ------------------------------------------------------------------
--  QUESTA E' LA PARTE CHE TIENE AL SICURO I DATI.
--
--  L'indirizzo dell'app e' pubblico e la chiave che l'app usa e'
--  pubblica anch'essa. Cio' che impedisce a un estraneo di leggere il
--  tuo piano non e' la segretezza della chiave: sono queste regole.
--
--  Dicono al database: "mostra ogni riga solo a chi ha effettuato
--  l'accesso ed e' il proprietario di quella riga". Senza accesso,
--  il database risponde come se le tabelle fossero vuote.
-- ==================================================================

alter table public.profili     enable row level security;
alter table public.eventi      enable row level security;
alter table public.misurazioni enable row level security;
alter table public.risposte    enable row level security;

-- "auth.uid()" e' l'identificativo di chi sta facendo la richiesta.
-- "using" governa cosa si puo' leggere, "with check" cosa si puo' scrivere:
-- servono entrambi, altrimenti si potrebbero scrivere righe intestate ad altri.

drop policy if exists "solo il proprio profilo" on public.profili;
create policy "solo il proprio profilo" on public.profili
  for all using (auth.uid() = utente) with check (auth.uid() = utente);

drop policy if exists "solo i propri eventi" on public.eventi;
create policy "solo i propri eventi" on public.eventi
  for all using (auth.uid() = utente) with check (auth.uid() = utente);

drop policy if exists "solo le proprie pesate" on public.misurazioni;
create policy "solo le proprie pesate" on public.misurazioni
  for all using (auth.uid() = utente) with check (auth.uid() = utente);

drop policy if exists "solo le proprie risposte" on public.risposte;
create policy "solo le proprie risposte" on public.risposte
  for all using (auth.uid() = utente) with check (auth.uid() = utente);


-- ==================================================================
--  6. CREAZIONE AUTOMATICA DEL PROFILO
-- ------------------------------------------------------------------
--  Alla registrazione di una nuova utenza, crea subito la sua riga in
--  "profili", prendendo il nome da quello scritto nel modulo di
--  iscrizione. Senza questo, l'app dovrebbe gestire il caso "profilo
--  che non esiste ancora" in ogni schermata.
-- ==================================================================
create or replace function public.crea_profilo_alla_registrazione()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profili (utente, nome)
  values (
    new.id,
    -- coalesce = "prendi il primo valore non vuoto":
    -- il nome scritto in fase di registrazione, altrimenti stringa vuota
    coalesce(new.raw_user_meta_data ->> 'nome', '')
  )
  on conflict (utente) do nothing;
  return new;
end;
$$;

drop trigger if exists al_nuovo_utente on auth.users;
create trigger al_nuovo_utente
  after insert on auth.users
  for each row execute function public.crea_profilo_alla_registrazione();
