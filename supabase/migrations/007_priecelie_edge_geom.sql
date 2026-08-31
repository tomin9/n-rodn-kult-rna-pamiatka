-- Uchováva skutočné súradnice krajných bodov steny (priečelia), aby sa dalo
-- priečelie spoľahlivo dohľadať aj vtedy, keď sa poradie alebo počet vrcholov
-- polygónu budovy niekedy zmení (napr. spresnením obrysu inde). Bez toho sa
-- priečelie priraďovalo iba podľa poradového čísla strany, čo pri zmene tvaru
-- budovy vedelo priečelie (aj s jeho motívmi) posunúť na inú stranu domu alebo
-- ho úplne skryť.
alter table priecelia add column if not exists edge_lng1 double precision;
alter table priecelia add column if not exists edge_lat1 double precision;
alter table priecelia add column if not exists edge_lng2 double precision;
alter table priecelia add column if not exists edge_lat2 double precision;
