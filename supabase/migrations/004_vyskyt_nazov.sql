-- Výskyt bez priradeného katalógového motívu je sám osebe samostatným
-- ("jedinečným") sgrafitom/reliéfom, ktorý potrebuje vlastný názov.
alter table vyskyty add column if not exists nazov text not null default '';
