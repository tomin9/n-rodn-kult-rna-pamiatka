-- Každý výskyt (konkrétne dielo) môže mať vlastnú fotografiu.
alter table vyskyty add column if not exists foto_url text not null default '';
