-- Každý motív môže mať vlastnú referenčnú fotografiu.
alter table motivy add column if not exists foto_url text not null default '';
