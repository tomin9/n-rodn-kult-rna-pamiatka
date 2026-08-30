-- Fotka priečelia, na ktorej sa označujú jednotlivé výskyty sgrafít.
alter table priecelia add column if not exists foto_url text;

-- Spoločný katalóg motívov sgrafít pre celé sídlisko.
create table if not exists motivy (
  id text primary key,
  nazov text not null default '',
  farba text not null default '#8d939a',
  popis text not null default '',
  updated_at timestamptz default now()
);
alter table motivy enable row level security;
drop policy if exists "public rw motivy" on motivy;
create policy "public rw motivy" on motivy for all using (true) with check (true);

-- Jednotlivé výskyty (bodky) motívov na fotke priečelia.
create table if not exists vyskyty (
  id text primary key,
  priecelie_id text not null references priecelia(id) on delete cascade,
  motiv_id text references motivy(id) on delete set null,
  x double precision not null,
  y double precision not null,
  velkost text not null default '',
  vrstvy text not null default '',
  stav text not null default '',
  popis text not null default '',
  podklady jsonb not null default '[]',
  updated_at timestamptz default now()
);
alter table vyskyty enable row level security;
drop policy if exists "public rw vyskyty" on vyskyty;
create policy "public rw vyskyty" on vyskyty for all using (true) with check (true);

-- Úložisko na fotky (priečelia + podklady k domom/priečeliam/výskytom).
insert into storage.buckets (id, name, public)
values ('sidlisko-pily', 'sidlisko-pily', true)
on conflict (id) do nothing;

drop policy if exists "public read sidlisko-pily" on storage.objects;
create policy "public read sidlisko-pily" on storage.objects
  for select using (bucket_id = 'sidlisko-pily');

drop policy if exists "public upload sidlisko-pily" on storage.objects;
create policy "public upload sidlisko-pily" on storage.objects
  for insert with check (bucket_id = 'sidlisko-pily');
