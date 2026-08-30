-- Katalóg umelcov (autorov sgrafít a reliéfov).
create table if not exists umelci (
  id text primary key,
  meno text not null default '',
  popis text not null default '',
  updated_at timestamptz default now()
);
alter table umelci enable row level security;
drop policy if exists "public rw umelci" on umelci;
create policy "public rw umelci" on umelci for all using (true) with check (true);

-- Umelec priradený k budove (kto robil sgrafitá/reliéfy na dome)
-- a k motívu (kto konkrétny motív navrhol/vytvoril).
alter table budovy add column if not exists umelec_id text references umelci(id) on delete set null;
alter table motivy add column if not exists umelec_id text references umelci(id) on delete set null;
