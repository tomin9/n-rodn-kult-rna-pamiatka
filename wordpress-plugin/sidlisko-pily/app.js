(function(){
mapboxgl.accessToken = "pk.eyJ1IjoidG9taW45IiwiYSI6ImNqdWwxZ2M2NjIyN2w0OXBweWhibDN3ZHEifQ.ApzboEsfLMVTQ2px9iOgVw";

const SUPABASE_URL = "https://admpgeethrgplvtjsfmc.supabase.co";
const SUPABASE_KEY = "sb_publishable_XZ8zk7nHCCwavnBPFlwCWg_y44o5TTh";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const STORAGE_BUCKET = "sidlisko-pily";

const DATA = { budovy: [], motivy: [], umelci: [] };

async function loadFromSupabase(){
  const [
    {data: budovyRows, error: e1},
    {data: prieceliaRows, error: e2},
    {data: vyskytyRows, error: e3},
    {data: motivyRows, error: e4},
    {data: umelciRows, error: e5}
  ] = await Promise.all([
    sb.from("budovy").select("*"),
    sb.from("priecelia").select("*"),
    sb.from("vyskyty").select("*"),
    sb.from("motivy").select("*").order("nazov"),
    sb.from("umelci").select("*").order("meno")
  ]);
  if(e1 || e2 || e3 || e4 || e5){
    alert("Nepodarilo sa načítať dáta z databázy: " + ((e1&&e1.message)||(e2&&e2.message)||(e3&&e3.message)||(e4&&e4.message)||(e5&&e5.message)));
    return;
  }
  DATA.umelci = (umelciRows||[]).map(r=>({ id: r.id, meno: r.meno||"", popis: r.popis||"" }));
  DATA.motivy = (motivyRows||[]).map(r=>({
    id: r.id, nazov: r.nazov||"", farba: r.farba||"#8d939a", popis: r.popis||"", umelecId: r.umelec_id||"", fotoUrl: r.foto_url||""
  }));
  DATA.budovy = (budovyRows||[]).map(row=>({
    id: row.id, kod: row.kod, nazov: row.nazov||"", adresa: row.adresa||"",
    rok: row.rok||"", oznacenie: row.oznacenie||"", typ: row.typ||"bytový dom",
    zateplenie: row.zateplenie||"", stav: row.stav||"", umelecId: row.umelec_id||"",
    popis: row.popis||"", poly: row.poly, podklady: row.podklady||[],
    priecelia: (prieceliaRows||[]).filter(f=>f.budova_id===row.id).map(f=>({
      id: f.id, edgeIndex: f.edge_index, smer: f.smer, dlzka: f.dlzka,
      nazov: f.nazov||"", popis: f.popis||"", vyzdoba: f.vyzdoba||"",
      autor: f.autor||"", rok: f.rok||"", stav: f.stav||"", podklady: f.podklady||[],
      fotoUrl: f.foto_url||"",
      edgeLL: (f.edge_lng1!=null && f.edge_lat1!=null && f.edge_lng2!=null && f.edge_lat2!=null)
        ? [[f.edge_lng1, f.edge_lat1],[f.edge_lng2, f.edge_lat2]]
        : null,
      vyskyty: (vyskytyRows||[]).filter(v=>v.priecelie_id===f.id).map(v=>({
        id: v.id, motivId: v.motiv_id||"", nazov: v.nazov||"", x: v.x, y: v.y,
        velkost: v.velkost||"", vrstvy: v.vrstvy||"", stav: v.stav||"",
        popis: v.popis||"", podklady: v.podklady||[], fotoUrl: v.foto_url||""
      }))
    }))
  }));
}

function budovaRow(b){
  // poly (tvar budovy) sa v appke nikdy needituje, preto sa zámerne neposiela pri
  // bežnom ukladaní — inak by zastaraná verzia v pamäti prehliadača mohla ticho
  // prepísať tvar, ktorý bol medzičasom spresnený/zmenený inak (napr. importom).
  return { id:b.id, kod:b.kod, nazov:b.nazov, adresa:b.adresa, rok:b.rok,
    oznacenie:b.oznacenie, typ:b.typ, zateplenie:b.zateplenie, umelec_id:b.umelecId||null,
    stav:b.stav, popis:b.popis, podklady:b.podklady,
    updated_at:new Date().toISOString() };
}
function prieceliaRow(f, budovaId){
  const ll = f.edgeLL || [[null,null],[null,null]];
  return { id:f.id, budova_id:budovaId, edge_index:f.edgeIndex, smer:f.smer, dlzka:f.dlzka,
    nazov:f.nazov, popis:f.popis, vyzdoba:f.vyzdoba, autor:f.autor, rok:f.rok, stav:f.stav,
    podklady:f.podklady, foto_url:f.fotoUrl||null,
    edge_lng1: ll[0][0], edge_lat1: ll[0][1], edge_lng2: ll[1][0], edge_lat2: ll[1][1],
    updated_at:new Date().toISOString() };
}
function motivRow(m){
  return { id:m.id, nazov:m.nazov, farba:m.farba, popis:m.popis, umelec_id:m.umelecId||null, foto_url:m.fotoUrl||null, updated_at:new Date().toISOString() };
}
function umelecRow(u){
  return { id:u.id, meno:u.meno, popis:u.popis, updated_at:new Date().toISOString() };
}
function vyskytRow(v, prieceleId){
  return { id:v.id, priecelie_id:prieceleId, motiv_id:v.motivId||null, nazov:v.nazov, x:v.x, y:v.y,
    velkost:v.velkost, vrstvy:v.vrstvy, stav:v.stav, popis:v.popis, podklady:v.podklady,
    foto_url:v.fotoUrl||null, updated_at:new Date().toISOString() };
}
function makeKeyedDebounce(fn, ms){
  const timers = {};
  return (key, ...args) => {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(()=>fn(...args), ms);
  };
}
async function saveBudova(b){
  const {error} = await sb.from("budovy").upsert(budovaRow(b));
  if(error) console.error("Uloženie domu zlyhalo:", error.message);
}
async function savePriecelie(f, budovaId){
  const {error} = await sb.from("priecelia").upsert(prieceliaRow(f, budovaId));
  if(error) console.error("Uloženie priečelia zlyhalo:", error.message);
}
async function saveMotiv(m){
  const {error} = await sb.from("motivy").upsert(motivRow(m));
  if(error) console.error("Uloženie motívu zlyhalo:", error.message);
}
async function saveUmelec(u){
  const {error} = await sb.from("umelci").upsert(umelecRow(u));
  if(error) console.error("Uloženie umelca zlyhalo:", error.message);
}
async function saveVyskyt(v, prieceleId){
  const {error} = await sb.from("vyskyty").upsert(vyskytRow(v, prieceleId));
  if(error) console.error("Uloženie výskytu zlyhalo:", error.message);
}
function clearMotivFromVyskyty(motivId){
  DATA.budovy.forEach(b=> b.priecelia.forEach(f=> f.vyskyty.forEach(v=>{
    if(v.motivId===motivId){ v.motivId=""; saveVyskyt(v, f.id); }
  })));
}
const saveBudovaDebounced = makeKeyedDebounce(saveBudova, 700);
const savePrieceliaDebounced = makeKeyedDebounce(savePriecelie, 700);
const saveMotivDebounced = makeKeyedDebounce(saveMotiv, 500);
const saveVyskytDebounced = makeKeyedDebounce(saveVyskyt, 700);
const saveUmelecDebounced = makeKeyedDebounce(saveUmelec, 500);
async function deletePrieceliaRemote(id){
  const {error} = await sb.from("priecelia").delete().eq("id", id);
  if(error) console.error("Zmazanie priečelia zlyhalo:", error.message);
}
async function deleteMotivRemote(id){
  const {error} = await sb.from("motivy").delete().eq("id", id);
  if(error) console.error("Zmazanie motívu zlyhalo:", error.message);
}
async function deleteUmelecRemote(id){
  const {error} = await sb.from("umelci").delete().eq("id", id);
  if(error) console.error("Zmazanie umelca zlyhalo:", error.message);
}
async function deleteVyskytRemote(id){
  const {error} = await sb.from("vyskyty").delete().eq("id", id);
  if(error) console.error("Zmazanie výskytu zlyhalo:", error.message);
}
async function uploadToStorage(file){
  const ext = ((file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")) || "jpg";
  const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36)+Math.random().toString(36).slice(2));
  const path = id + "." + ext;
  const {error} = await sb.storage.from(STORAGE_BUCKET).upload(path, file, {upsert:false, contentType: file.type || undefined});
  if(error) throw error;
  const {data} = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/* =========================================================================
   GEOMETRIA
   ========================================================================= */
const SMERY = ["S","SV","V","JV","J","JZ","Z","SZ"];
const SMER_NAZOV = {S:"severné",SV:"severovýchodné",V:"východné",JV:"juhovýchodné",
                    J:"južné",JZ:"juhozápadné",Z:"západné",SZ:"severozápadné"};
const R_EARTH = 6371000;

function localXY(lng, lat, refLng, refLat){
  const x = (lng-refLng)*Math.PI/180*R_EARTH*Math.cos(refLat*Math.PI/180);
  const y = (lat-refLat)*Math.PI/180*R_EARTH;
  return [x,y];
}
function toLocalPoly(poly){
  const [refLng, refLat] = poly[0];
  return poly.map(([lng,lat])=>localXY(lng,lat,refLng,refLat));
}
function inPoly(pt, poly){
  let c = false;
  for(let i=0, j=poly.length-1; i<poly.length; j=i++){
    const [xi,yi]=poly[i], [xj,yj]=poly[j];
    if(((yi>pt[1])!==(yj>pt[1])) && (pt[0] < (xj-xi)*(pt[1]-yi)/(yj-yi)+xi)) c=!c;
  }
  return c;
}
function edgeInfo(polyLL, i){
  const local = toLocalPoly(polyLL);
  const a = local[i], b = local[(i+1)%local.length];
  const dx = b[0]-a[0], dy = b[1]-a[1];
  const len = Math.hypot(dx,dy) || 1;
  const mid = [(a[0]+b[0])/2, (a[1]+b[1])/2];
  let n = [dy/len, -dx/len];
  if(inPoly([mid[0]+n[0]*2, mid[1]+n[1]*2], local)) n = [-n[0], -n[1]];
  let deg = (Math.atan2(n[0], n[1]) * 180/Math.PI + 360) % 360;
  const smer = SMERY[Math.round(deg/45) % 8];
  return {smer, deg: Math.round(deg), lenM: Math.round(len)};
}
function edgeLLOf(poly, i){
  return [poly[i], poly[(i+1)%poly.length]];
}
function llDistanceMeters(p1, p2, refLng, refLat){
  const [x1,y1] = localXY(p1[0], p1[1], refLng, refLat);
  const [x2,y2] = localXY(p2[0], p2[1], refLng, refLat);
  return Math.hypot(x2-x1, y2-y1);
}
function findMatchingEdge(poly, edgeLL, refLng, refLat){
  if(!edgeLL) return null;
  const [sa, sc] = edgeLL;
  let best = null, bestDist = Infinity;
  for(let i=0;i<poly.length;i++){
    const a = poly[i], c = poly[(i+1)%poly.length];
    const d1 = llDistanceMeters(a, sa, refLng, refLat) + llDistanceMeters(c, sc, refLng, refLat);
    const d2 = llDistanceMeters(a, sc, refLng, refLat) + llDistanceMeters(c, sa, refLng, refLat);
    const d = Math.min(d1, d2);
    if(d < bestDist){ bestDist = d; best = i; }
  }
  // Prísna tolerancia: má chytiť iba zaokrúhľovanie pri prenose súradníc,
  // nie skutočne odlišné (aj keď blízke) steny — pri cik-cakovitých domoch
  // s množstvom krátkych susediacich úsekov by voľnejšia tolerancia vedela
  // priečelie omylom priradiť na susednú stenu.
  return bestDist <= 0.3 ? best : null;
}
function syncPriecelia(b){
  const stare = b.priecelia || [];
  const [refLng, refLat] = b.poly[0];
  const toSave = [];
  const result = [];
  stare.forEach(s=>{
    let ei = s.edgeIndex;
    if(ei === undefined || ei === null){
      const m = String(s.id||"").match(/^f(\d+)$/);
      ei = m ? +m[1] : null;
    }
    let changed = false;
    const matched = findMatchingEdge(b.poly, s.edgeLL, refLng, refLat);
    if(matched !== null && matched !== ei){
      console.warn("Priečelie preradené na inú stranu (podľa uloženej geometrie steny):", {budova: b.kod||b.id, priecelieId: s.id, staryIndex: ei, novyIndex: matched});
      ei = matched;
      changed = true;
    }
    const valid = Number.isInteger(ei) && ei >= 0 && ei < b.poly.length;
    if(!valid){
      console.warn("Priečelie sa nedá spoľahlivo umiestniť na aktuálny tvar budovy — zostáva v zozname ako nepriradené:", {budova: b.kod||b.id, priecelieId: s.id, edgeIndex: ei, pocetVrcholovPoly: b.poly.length});
      result.push({
        id: s.id, edgeIndex: null, smer: s.smer || "", dlzka: s.dlzka || 0,
        nazov: s.nazov || "", popis: s.popis || "", vyzdoba: s.vyzdoba || "",
        autor: s.autor || "", rok: s.rok || "", stav: s.stav || "",
        podklady: s.podklady || [], fotoUrl: s.fotoUrl || "",
        edgeLL: s.edgeLL || null, unresolved: true,
        vyskyty: s.vyskyty || []
      });
      return;
    }
    const e = edgeInfo(b.poly, ei);
    if(!s.edgeLL) changed = true;
    const nf = {
      id: s.id || ("f"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)), edgeIndex: ei,
      smer: e.smer, dlzka: e.lenM,
      nazov: s.nazov || "", popis: s.popis || "", vyzdoba: s.vyzdoba || "",
      autor: s.autor || "", rok: s.rok || "", stav: s.stav || "",
      podklady: s.podklady || [], fotoUrl: s.fotoUrl || "",
      edgeLL: edgeLLOf(b.poly, ei), unresolved: false,
      vyskyty: s.vyskyty || []
    };
    result.push(nf);
    if(changed) toSave.push(nf);
  });
  b.priecelia = result;
  toSave.forEach(nf=> savePriecelie(nf, b.id));
  return b;
}
function findFacadeByEdge(b, edgeIndex){
  return b.priecelia.find(f=>f.edgeIndex===edgeIndex);
}
function toggleEdge(b, edgeIndex){
  const existing = findFacadeByEdge(b, edgeIndex);
  if(existing){ go(b.id, existing.id); return; }
  const e = edgeInfo(b.poly, edgeIndex);
  const nf = {
    id: "f"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), edgeIndex, smer:e.smer, dlzka:e.lenM,
    nazov:"", popis:"", vyzdoba:"", autor:"", rok:"", stav:"", podklady:[],
    fotoUrl:"", vyskyty:[], edgeLL: edgeLLOf(b.poly, edgeIndex), unresolved:false
  };
  b.priecelia.push(nf);
  savePriecelie(nf, b.id);
  if(map.getSource("facades")) map.getSource("facades").setData(facadesFC());
  go(b.id, nf.id);
}
function centroidLL(poly){
  let lng=0, lat=0;
  poly.forEach(p=>{lng+=p[0]; lat+=p[1];});
  return [lng/poly.length, lat/poly.length];
}
function bboxLL(poly){
  const lngs=poly.map(p=>p[0]), lats=poly.map(p=>p[1]);
  return [[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]];
}
const esc = s => String(s??"").replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* =========================================================================
   STAV a MAPA
   ========================================================================= */
const S = { route:{budova:null, priecelie:null, vyskyt:null, umelec:null, motiv:null, list:null}, addingVyskyt:null, budovaTab:"zakladne", budovaEdit:false, priecelieEdit:false, motivyEdit:false, motivDetailEdit:false, reassignPriecelie:null };
const panel = document.getElementById("sp-panel");
const appRoot = panel.closest(".sidlisko-pily-app") || document;

const DEFAULT_CENTER = [18.6045, 48.7715];
let map;
let hoveredEdgeIndex = null;

function computeFitBounds(){
  if(!DATA.budovy.length) return null;
  const allLngs = DATA.budovy.flatMap(b=>b.poly.map(p=>p[0]));
  const allLats = DATA.budovy.flatMap(b=>b.poly.map(p=>p[1]));
  return [[Math.min(...allLngs),Math.min(...allLats)],[Math.max(...allLngs),Math.max(...allLats)]];
}

function buildingsFC(){
  return {
    type:"FeatureCollection",
    features: DATA.budovy.map(b=>({
      type:"Feature",
      properties:{ id:b.id, kod:b.kod },
      geometry:{ type:"Polygon", coordinates:[[...b.poly, b.poly[0]]] }
    }))
  };
}
function labelsFC(){
  return {
    type:"FeatureCollection",
    features: DATA.budovy.map(b=>({
      type:"Feature",
      properties:{ kod:b.kod },
      geometry:{ type:"Point", coordinates: centroidLL(b.poly) }
    }))
  };
}
function facadesFC(){
  const b = DATA.budovy.find(x=>x.id===S.route.budova);
  if(!b) return {type:"FeatureCollection", features:[]};
  return {
    type:"FeatureCollection",
    features: b.poly.map((_,i)=>{
      const a = b.poly[i], c = b.poly[(i+1)%b.poly.length];
      const f = findFacadeByEdge(b, i);
      return {
        type:"Feature",
        properties:{ edgeIndex:i, isFacade: !!f, active: !!f && f.id===S.route.priecelie, hover: i===hoveredEdgeIndex },
        geometry:{ type:"LineString", coordinates:[a,c] }
      };
    })
  };
}

async function boot(){
  try{
    await loadFromSupabase();
  }catch(err){
    console.error("Načítanie zo Supabase zlyhalo:", err);
    document.getElementById("sp-mapnote").innerHTML = "Chyba pri načítaní databázy: " + err.message;
    return;
  }
  DATA.budovy.forEach(syncPriecelia);

  const fitBounds = computeFitBounds();
  const initialCenter = fitBounds
    ? [(fitBounds[0][0]+fitBounds[1][0])/2, (fitBounds[0][1]+fitBounds[1][1])/2]
    : DEFAULT_CENTER;

  try{
    map = new mapboxgl.Map({
      container: "sp-map",
      style: "mapbox://styles/tomin9/cle5ygem4004h01qge9x73z3q",
      center: initialCenter,
      zoom: 15
    });
  }catch(err){
    console.error("Vytvorenie mapy zlyhalo:", err);
    document.getElementById("sp-map").innerHTML =
      '<div style="padding:20px;font-family:monospace;color:#d0342c">Mapu sa nepodarilo vytvoriť: ' + err.message + '</div>';
    return;
  }
  map.addControl(new mapboxgl.NavigationControl({showCompass:false}), "bottom-right");

  map.on("load", ()=>{
  if(fitBounds) map.fitBounds(fitBounds, {padding:60, duration:0});
  map.addSource("buildings", {type:"geojson", data:buildingsFC()});
  map.addSource("labels", {type:"geojson", data:labelsFC()});
  map.addSource("facades", {type:"geojson", data:facadesFC()});

  map.addLayer({id:"buildings-fill", type:"fill", source:"buildings",
    paint:{"fill-color":"#14161a", "fill-opacity":0.55}});
  map.addLayer({id:"buildings-line", type:"line", source:"buildings",
    paint:{"line-color":"#14161a", "line-width":1.3}});
  map.addLayer({id:"buildings-active-fill", type:"fill", source:"buildings",
    filter:["==",["get","id"], "__none__"],
    paint:{"fill-color":"#14161a", "fill-opacity":0.75}});

  map.addLayer({id:"facades-hit", type:"line", source:"facades",
    paint:{"line-width":18, "line-opacity":0}});
  map.addLayer({id:"facades-active-halo", type:"line", source:"facades",
    filter:["any",["get","active"],["all",["get","hover"],["get","isFacade"]]],
    paint:{"line-color":"#f28b82", "line-width":16, "line-opacity":0.45, "line-blur":6}});
  map.addLayer({id:"facades-line", type:"line", source:"facades",
    paint:{"line-color":["case",
             ["any",["get","active"],["all",["get","hover"],["get","isFacade"]]], "#f28b82",
             ["get","isFacade"], "#d0342c",
             "#b9b6ae"],
           "line-width":["case",
             ["any",["get","active"],["all",["get","hover"],["get","isFacade"]]], 5,
             ["get","isFacade"], 3.5, 1.3],
           "line-dasharray":["case",["get","isFacade"],["literal",[1]],["literal",[1,1.6]]]}});

  function facadeHitAt(point){
    const tol = 8;
    const bbox = [[point.x-tol, point.y-tol],[point.x+tol, point.y+tol]];
    const feats = map.queryRenderedFeatures(bbox, {layers:["facades-hit"]});
    return feats.length ? feats[0] : null;
  }
  map.on("mousemove", e=>{
    const b = DATA.budovy.find(x=>x.id===S.route.budova);
    const facadeFeat = b ? facadeHitAt(e.point) : null;
    if(facadeFeat){
      map.getCanvas().style.cursor = "pointer";
      const ei = facadeFeat.properties.edgeIndex;
      if(hoveredEdgeIndex !== ei){
        hoveredEdgeIndex = ei;
        if(map.getSource("facades")) map.getSource("facades").setData(facadesFC());
      }
      return;
    }
    if(hoveredEdgeIndex !== null){
      hoveredEdgeIndex = null;
      if(map.getSource("facades")) map.getSource("facades").setData(facadesFC());
    }
    const bldHits = map.queryRenderedFeatures(e.point, {layers:["buildings-fill"]});
    map.getCanvas().style.cursor = bldHits.length ? "pointer" : "";
  });
  map.on("click", e=>{
    const b = DATA.budovy.find(x=>x.id===S.route.budova);
    if(b){
      const facadeFeat = facadeHitAt(e.point);
      if(facadeFeat){ toggleEdge(b, facadeFeat.properties.edgeIndex); return; }
    }
    const bldHits = map.queryRenderedFeatures(e.point, {layers:["buildings-fill"]});
    if(bldHits.length){ go(bldHits[0].properties.id, null); return; }
    go(null, null);
  });

  render(); note();
  const mml = location.hash.match(/^#\/motivy\/([^/]+)/);
  const mm = location.hash.match(/^#\/motiv\/([^/]+)/);
  const mu = location.hash.match(/^#\/umelec\/([^/]+)/);
  const ml = location.hash.match(/^#\/(budovy|umelci|motivy|diela)$/);
  const m = location.hash.match(/^#\/budova\/([^/]+)(?:\/prieceli\/([^/]+)(?:\/motiv\/([^/]+))?)?/);
  if(mml) goMotivDetail(mml[1]);
  else if(mm) goMotiv(mm[1]);
  else if(mu) goUmelec(mu[1]);
  else if(ml) goList(ml[1]);
  else if(m && m[2] && m[3]) goPrieceliaMotiv(m[1], m[2], m[3]);
  else if(m) go(m[1], m[2]||null, null, {noFit:true});
  });
}
boot();
wireTabs();

function refreshMapSelection(){
  map.setFilter("buildings-active-fill", ["==",["get","id"], S.route.budova||"__none__"]);
  map.getSource("facades") && map.getSource("facades").setData(facadesFC());
}
/* =========================================================================
   NAVIGÁCIA
   ========================================================================= */
function go(budovaId, prieceleId, vyskytId, opts){
  vyskytId = vyskytId || null;
  opts = opts || {};
  let motivId = null;
  if(vyskytId){
    const b0 = DATA.budovy.find(x=>x.id===budovaId);
    const f0 = b0 && b0.priecelia.find(x=>x.id===prieceleId);
    const v0 = f0 && f0.vyskyty.find(x=>x.id===vyskytId);
    motivId = v0 ? (v0.motivId || null) : null;
  }
  const zmenaBudovy = budovaId !== S.route.budova;
  const zmenaPriecelia = prieceleId !== S.route.priecelie;
  const zmenaMotivu = motivId !== S.route.motiv;
  if(zmenaBudovy){ S.budovaTab = "zakladne"; S.budovaEdit = false; }
  if(zmenaPriecelia){ S.priecelieEdit = false; S.reassignPriecelie = null; }
  if(zmenaMotivu){ S.motivDetailEdit = false; const d=document.getElementById("sp-detail"); if(d) d.scrollTop=0; }
  S.route = {budova:budovaId, priecelie:prieceleId, vyskyt:vyskytId, umelec:null, motiv:motivId, list:null};
  try{
    let h = budovaId ? ("#/budova/"+budovaId) : "#/";
    if(budovaId && prieceleId) h += "/prieceli/"+prieceleId;
    if(budovaId && prieceleId && motivId) h += "/motiv/"+motivId;
    location.hash = h;
  }catch(_){}
  if(map && map.isStyleLoaded()) refreshMapSelection();
  render();
  if(budovaId && zmenaBudovy && !opts.noFit && map){
    const b = DATA.budovy.find(x=>x.id===budovaId);
    if(b) map.fitBounds(bboxLL(b.poly), {padding:140, maxZoom:19, duration:600});
  }
  panel.scrollTop = 0;
}
function goPrieceliaMotiv(budovaId, prieceleId, motivId){
  const zmenaMotivu = motivId !== S.route.motiv || S.route.vyskyt;
  if(zmenaMotivu){ S.motivDetailEdit = false; const d=document.getElementById("sp-detail"); if(d) d.scrollTop=0; }
  S.route = {budova:budovaId, priecelie:prieceleId, vyskyt:null, umelec:null, motiv:motivId||null, list:null};
  try{
    let h = "#/budova/"+budovaId+"/prieceli/"+prieceleId;
    if(motivId) h += "/motiv/"+motivId;
    location.hash = h;
  }catch(_){}
  if(map && map.isStyleLoaded()) refreshMapSelection();
  render();
}
function goMotiv(motivId){
  S.route = {budova:null, priecelie:null, vyskyt:null, umelec:null, motiv:motivId||null, list:null};
  try{ location.hash = motivId ? ("#/motiv/"+motivId) : "#/"; }catch(_){}
  if(map && map.isStyleLoaded()) refreshMapSelection();
  render();
  panel.scrollTop = 0;
}
function goMotivDetail(motivId){
  const zmenaMotivu = motivId !== S.route.motiv || S.route.list !== "motivy";
  if(zmenaMotivu){ S.motivDetailEdit = false; const d=document.getElementById("sp-detail"); if(d) d.scrollTop=0; }
  S.route = {budova:null, priecelie:null, vyskyt:null, umelec:null, motiv:motivId, list:"motivy"};
  try{ location.hash = "#/motivy/"+motivId; }catch(_){}
  if(map && map.isStyleLoaded()) refreshMapSelection();
  render();
}
function goUmelec(umelecId){
  S.route = {budova:null, priecelie:null, vyskyt:null, umelec:umelecId||null, motiv:null, list:null};
  try{ location.hash = umelecId ? ("#/umelec/"+umelecId) : "#/"; }catch(_){}
  if(map && map.isStyleLoaded()) refreshMapSelection();
  render();
  panel.scrollTop = 0;
}
function goList(name){
  S.route = {budova:null, priecelie:null, vyskyt:null, umelec:null, motiv:null, list:name||null};
  try{ location.hash = name ? ("#/"+name) : "#/"; }catch(_){}
  if(map && map.isStyleLoaded()) refreshMapSelection();
  render();
  panel.scrollTop = 0;
}
function activeTab(){
  if(S.route.list==="budovy" || S.route.budova) return "budovy";
  if(S.route.list==="umelci" || S.route.umelec) return "umelci";
  if(S.route.list==="motivy" || S.route.motiv) return "motivy";
  if(S.route.list==="diela") return "diela";
  return "prehlad";
}
function updateTabs(){
  const at = activeTab();
  appRoot.querySelectorAll("[data-tab]").forEach(btn=>{
    btn.setAttribute("aria-pressed", btn.dataset.tab===at ? "true" : "false");
  });
}
function wireTabs(){
  appRoot.querySelectorAll("[data-tab]").forEach(btn=>{
    btn.onclick = ()=> goList(btn.dataset.tab);
  });
}
window.addEventListener("hashchange", ()=>{
  const mml = location.hash.match(/^#\/motivy\/([^/]+)/);
  if(mml){
    if(S.route.motiv !== mml[1] || S.route.list !== "motivy"){
      S.route = {budova:null, priecelie:null, vyskyt:null, umelec:null, motiv:mml[1], list:"motivy"};
      if(map && map.isStyleLoaded()) refreshMapSelection(); render();
    }
    return;
  }
  const mm = location.hash.match(/^#\/motiv\/([^/]+)/);
  if(mm){
    if(S.route.motiv !== mm[1]){
      S.route = {budova:null, priecelie:null, vyskyt:null, umelec:null, motiv:mm[1], list:null};
      if(map && map.isStyleLoaded()) refreshMapSelection(); render();
    }
    return;
  }
  const mu = location.hash.match(/^#\/umelec\/([^/]+)/);
  if(mu){
    if(S.route.umelec !== mu[1]){
      S.route = {budova:null, priecelie:null, vyskyt:null, umelec:mu[1], motiv:null, list:null};
      if(map && map.isStyleLoaded()) refreshMapSelection(); render();
    }
    return;
  }
  const ml = location.hash.match(/^#\/(budovy|umelci|motivy|diela)$/);
  if(ml){
    if(S.route.list !== ml[1] || S.route.budova || S.route.umelec){
      S.route = {budova:null, priecelie:null, vyskyt:null, umelec:null, list:ml[1]};
      if(map && map.isStyleLoaded()) refreshMapSelection(); render();
    }
    return;
  }
  const m = location.hash.match(/^#\/budova\/([^/]+)(?:\/prieceli\/([^/]+)(?:\/motiv\/([^/]+))?)?/);
  const want = m ? {budova:m[1], priecelie:m[2]||null, vyskyt:null, motiv:m[3]||null, umelec:null, list:null} : {budova:null, priecelie:null, vyskyt:null, motiv:null, umelec:null, list:null};
  if(want.budova!==S.route.budova || want.priecelie!==S.route.priecelie || want.motiv!==S.route.motiv || S.route.umelec || S.route.list){
    if(want.budova !== S.route.budova){ S.budovaTab = "zakladne"; S.budovaEdit = false; }
    S.route = want; if(map && map.isStyleLoaded()) refreshMapSelection(); render();
  }
});
document.addEventListener("keydown", e=>{
  const t = e.target;
  if(t && (t.tagName==="INPUT" || t.tagName==="TEXTAREA")) return;
  if(e.key==="Escape") go(null,null);
});

/* =========================================================================
   PANEL
   ========================================================================= */
const detailPanel = document.getElementById("sp-detail");
function render(){
  let handled = false;
  if(S.route.motiv && S.route.list==="motivy"){
    const m = DATA.motivy.find(x=>x.id===S.route.motiv);
    if(m){
      appRoot.classList.add("has-detail");
      renderMotivyList();
      renderMotivDetailPanel(m);
      handled = true;
    }
  }
  if(!handled && S.route.umelec){
    const u = DATA.umelci.find(x=>x.id===S.route.umelec);
    if(u){ appRoot.classList.remove("has-detail"); detailPanel.innerHTML=""; renderUmelec(u); handled = true; }
  }
  if(!handled){
    const b = DATA.budovy.find(x=>x.id===S.route.budova);
    if(b){
      const f = b.priecelia.find(x=>x.id===S.route.priecelie);
      if(!f){ appRoot.classList.remove("has-detail"); detailPanel.innerHTML=""; renderBudova(b); }
      else {
        const m = S.route.motiv ? DATA.motivy.find(x=>x.id===S.route.motiv) : null;
        const v = S.route.vyskyt ? f.vyskyty.find(x=>x.id===S.route.vyskyt) : null;
        if(m){
          appRoot.classList.add("has-detail");
          renderPriecelie(b, f, S.route.vyskyt||null);
          renderMotivDetailPanel(m, v ? {b, f, v} : null);
        } else if(v){
          appRoot.classList.add("has-detail");
          renderPriecelie(b, f, v.id);
          renderAssignMotivPanel(b, f, v);
        } else {
          appRoot.classList.remove("has-detail");
          detailPanel.innerHTML="";
          renderPriecelie(b, f, null);
        }
      }
      handled = true;
    }
  }
  if(!handled && S.route.motiv){
    const m = DATA.motivy.find(x=>x.id===S.route.motiv);
    if(m){ appRoot.classList.remove("has-detail"); detailPanel.innerHTML=""; renderMotiv(m); handled = true; }
  }
  if(!handled){
    appRoot.classList.remove("has-detail");
    detailPanel.innerHTML="";
    if(S.route.list==="budovy") renderBudovyList();
    else if(S.route.list==="umelci") renderUmelciList();
    else if(S.route.list==="motivy") renderMotivyList();
    else if(S.route.list==="diela") renderDielaList();
    else renderPrehlad();
  }
  updateTabs();
}
function budovaStats(b){
  let diel = 0;
  const motivy = new Set();
  b.priecelia.forEach(f=> f.vyskyty.forEach(v=>{
    diel++;
    if(v.motivId) motivy.add(v.motivId);
  }));
  return { priecelia: b.priecelia.length, motivov: motivy.size, diel };
}
function facadeStats(f){
  const motivy = new Set();
  f.vyskyty.forEach(v=>{ if(v.motivId) motivy.add(v.motivId); });
  return { motivov: motivy.size, diel: f.vyskyty.length };
}
function facadeLabel(b, f){
  const i = b.priecelia.indexOf(f);
  return "P" + (i>=0 ? i+1 : "?");
}
function vyskytTitle(v){
  const m = DATA.motivy.find(x=>x.id===v.motivId);
  if(m) return m.nazov || "bez názvu";
  return v.nazov || "bez názvu";
}
function motivLabel(m){
  if(!m) return "neznámy motív";
  const u = DATA.umelci.find(x=>x.id===m.umelecId);
  const nazov = m.nazov || "bez názvu";
  return u ? `${u.meno} – ${nazov}` : nazov;
}
function motivyByUmelec(umelecId){
  return DATA.motivy.filter(m=>m.umelecId===umelecId);
}
function budovyByUmelec(umelecId){
  return DATA.budovy.filter(b=>b.umelecId===umelecId);
}
function crumb(parts){
  return `<nav class="crumb">${parts.map((p,i)=>
    (i?'<span>›</span>':'') + (p.go!==undefined
      ? `<a tabindex="0" data-go='${p.go}'${p.red?' style="color:var(--survey)"':''}>${esc(p.t)}</a>`
      : `<span${p.red?' style="color:var(--survey)"':''}>${esc(p.t)}</span>`)).join("")}</nav>`;
}
function motivCountsAll(){
  const counts = {};
  DATA.budovy.forEach(b=> b.priecelia.forEach(f=> f.vyskyty.forEach(v=>{
    const k = v.motivId || "";
    counts[k] = (counts[k]||0)+1;
  })));
  return counts;
}
function motivStats(motivId){
  const budovySet = new Set();
  const prieceliaSet = new Set();
  let diel = 0;
  DATA.budovy.forEach(b=> b.priecelia.forEach(f=> f.vyskyty.forEach(v=>{
    if(v.motivId===motivId){
      budovySet.add(b.id);
      prieceliaSet.add(f.id);
      diel++;
    }
  })));
  return { budov: budovySet.size, priecelia: prieceliaSet.size, diel };
}
function renderPrehlad(){
  const n = DATA.budovy.length;
  const counts = motivCountsAll();
  const totalVyskytov = Object.values(counts).reduce((a,c)=>a+c,0);

  panel.innerHTML = crumb([{t:"prehľad"}]) + `<div class="pad">
    <p class="eyebrow">Podklad</p>
    <h2 class="title">Sídlisko Píly<br>na reálnej mape</h2>
    <p class="lead">Obrysy ${n} domov pochádzajú z tvojho Mapbox datasetu „budovy pily" — reálne súradnice, presná orientácia priečelí podľa skutočného kompasu. Klikni na dom v mape alebo použi záložky hore.</p>
    <h3 class="sec">Sídlisko v číslach</h3>
    <table class="meta">
      <tr><th>Domy</th><td>${n}</td></tr>
      <tr><th>Umelci</th><td>${DATA.umelci.length}</td></tr>
      <tr><th>Motívy v katalógu</th><td>${DATA.motivy.length}</td></tr>
      <tr><th>Výskyty sgrafít/reliéfov</th><td>${totalVyskytov}</td></tr>
    </table>
  </div>`;
  wire();
}
function renderBudovyList(){
  const n = DATA.budovy.length;
  panel.innerHTML = crumb([{t:"budovy"}]) + `<div class="pad">
    <p class="eyebrow">Zoznam</p>
    <h2 class="title">Budovy <span class="kod">${n}</span></h2>
    ${n ? `<ul class="list">${DATA.budovy.map(b=>{
        const kod = b.kod || b.id;
        const extra = b.nazov || b.adresa || "";
        const s = budovaStats(b);
        return `<li><button class="fitem" data-b="${b.id}">
        <span class="fname">${esc(kod)}</span>
        <span class="fdir">${extra?esc(extra)+" · ":""}${s.priecelia} priečelí · ${s.motivov} motívov · ${s.diel} diel</span>
      </button></li>`;
      }).join("")}</ul>` : `<div class="empty">Zatiaľ žiadne domy.</div>`}
  </div>`;
  wire();
}
function renderUmelciList(){
  panel.innerHTML = crumb([{t:"umelci"}]) + `<div class="pad">
    <p class="eyebrow">Katalóg</p>
    <h2 class="title">Umelci <span class="kod">${DATA.umelci.length}</span></h2>
    ${DATA.umelci.length ? `<ul class="list">${DATA.umelci.map(u=>`
      <li><button class="fitem" data-u="${esc(u.id)}">
        <span class="fname">${esc(u.meno || "bez mena")}</span>
        <span class="fdir">${motivyByUmelec(u.id).length} motívov · ${budovyByUmelec(u.id).length} domov</span>
      </button></li>`).join("")}</ul>` : `<div class="empty">Zatiaľ žiadni umelci. Pridaj prvého nižšie.</div>`}
    <div class="row">
      <input class="in" id="sp-new-umelec-name" style="flex:1;min-width:140px" placeholder="meno umelca…">
      <button class="btn ghost" id="sp-new-umelec-add">+ Pridať umelca</button>
    </div>
  </div>`;
  wire();
  wireUmelciList();
}
function wireUmelciList(){
  const addUmelecBtn = panel.querySelector("#sp-new-umelec-add");
  if(addUmelecBtn) addUmelecBtn.onclick = ()=>{
    const nameInput = panel.querySelector("#sp-new-umelec-name");
    const meno = (nameInput.value||"").trim();
    if(!meno){ nameInput.focus(); return; }
    const u = { id:"u"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), meno, popis:"" };
    DATA.umelci.push(u);
    saveUmelec(u);
    render();
  };
}
function renderMotivyList(){
  const counts = motivCountsAll();
  const totalVyskytov = Object.values(counts).reduce((a,c)=>a+c,0);
  const bezMotivu = counts[""] || 0;
  const editing = !!S.motivyEdit;

  const motivStatsLabel = m => {
    const st = motivStats(m.id);
    return `${st.budov} ${st.budov===1?"dome":"domoch"} · ${st.priecelia} ${st.priecelia===1?"priečelí":"priečeliach"} · ${st.diel}×`;
  };

  const motivItemView = m => `<li><button class="fitem" data-mid="${esc(m.id)}">
      <span class="fname" style="display:flex;align-items:center;gap:8px"><span class="mchip" style="--mc:${esc(m.farba)}"></span>${esc(m.nazov || "bez názvu")}</span>
      <span class="fdir">${motivStatsLabel(m)}</span>
    </button></li>`;

  const motivItemEdit = m => `<li style="display:block">
    <div class="row" style="margin:0;align-items:center">
      <input type="color" class="in" style="flex:0 0 40px;padding:2px" data-mid="${esc(m.id)}" data-mfield="farba" value="${esc(m.farba)}">
      <input class="in" style="flex:1;min-width:100px" data-mid="${esc(m.id)}" data-mfield="nazov" value="${esc(m.nazov)}" placeholder="názov motívu">
      <select class="in" style="flex:0 0 140px" data-mid="${esc(m.id)}" data-mfield="umelecId">
        <option value=""${!m.umelecId?" selected":""}>— bez umelca —</option>
        ${DATA.umelci.map(u=>`<option value="${esc(u.id)}"${m.umelecId===u.id?" selected":""}>${esc(u.meno)}</option>`).join("")}
      </select>
      <span class="fdir" style="flex:0 0 auto">${motivStatsLabel(m)}</span>
      <button class="btn ghost" data-mid="${esc(m.id)}" title="Detail motívu">→</button>
      <button class="btn ghost" data-mdel="${esc(m.id)}" title="Zmazať motív">×</button>
    </div>
  </li>`;

  const motivItemHtml = editing ? motivItemEdit : motivItemView;

  // Group by artist, sorted by artist name; unassigned last
  const groups = {};
  DATA.motivy.forEach(m=>{ const k=m.umelecId||""; (groups[k]||(groups[k]=[])).push(m); });
  const sortedKeys = Object.keys(groups).filter(k=>k).sort((a,b)=>{
    const ua=DATA.umelci.find(x=>x.id===a), ub=DATA.umelci.find(x=>x.id===b);
    return (ua?ua.meno:"").localeCompare(ub?ub.meno:"", "sk");
  });
  if(groups[""]) sortedKeys.push("");

  const groupsHtml = sortedKeys.map(key=>{
    const u = key ? DATA.umelci.find(x=>x.id===key) : null;
    const motList = [...groups[key]].sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0));
    const header = (u || DATA.umelci.length)
      ? `<h3 class="sec">${esc(u?u.meno:"Bez umelca")} <span class="kod">${motList.length}</span></h3>`
      : "";
    return header + `<ul class="list">${motList.map(motivItemHtml).join("")}</ul>`;
  }).join("");

  const editToggle = `<div class="row" style="justify-content:flex-end;margin-top:0">
    <a data-motivy-edit-toggle tabindex="0" class="edit-toggle">${editing?"Hotovo":"Editovať"}</a>
  </div>`;

  panel.innerHTML = crumb([{t:"motívy"}]) + `<div class="pad">
    <p class="eyebrow">Katalóg</p>
    <h2 class="title">Motívy sgrafít <span class="kod">${totalVyskytov} výskytov</span></h2>
    ${editToggle}
    ${DATA.motivy.length ? groupsHtml : `<div class="empty">Zatiaľ žiadne motívy v katalógu. Pridaj prvý nižšie.</div>`}
    ${bezMotivu ? `<p class="hint">${bezMotivu}× výskyt zatiaľ bez priradeného motívu. <a data-go="list:diela" tabindex="0">Zobraziť v zozname Diela</a>.</p>` : ""}
    ${editing ? `
    <div class="row">
      <input class="in" id="sp-new-motiv-name" style="flex:1;min-width:140px" placeholder="nový motív…">
      <input type="color" class="in" id="sp-new-motiv-color" style="flex:0 0 40px;padding:2px" value="#8d939a">
      <button class="btn ghost" id="sp-new-motiv-add">+ Pridať motív</button>
    </div>` : ""}
  </div>`;
  wire();
  wireMotivyList();
}
function wireMotivyList(){
  panel.querySelectorAll("[data-motivy-edit-toggle]").forEach(el=>{
    el.onclick = ()=>{ S.motivyEdit = !S.motivyEdit; render(); };
    el.onkeydown = e => { if(e.key==="Enter") el.click(); };
  });
  panel.querySelectorAll("[data-mid]").forEach(el=>{
    if(el.tagName==="BUTTON") el.onclick = ()=> goMotivDetail(el.dataset.mid);
  });
  panel.querySelectorAll("[data-mfield]").forEach(el=>{
    el.oninput = ()=>{
      const m = DATA.motivy.find(x=>x.id===el.dataset.mid);
      if(!m) return;
      m[el.dataset.mfield] = el.value;
      saveMotivDebounced(m.id, m);
      if(el.dataset.mfield==="umelecId") render();
    };
  });
  panel.querySelectorAll("[data-mdel]").forEach(el=>{
    el.onclick = ()=>{
      const id = el.dataset.mdel;
      DATA.motivy = DATA.motivy.filter(x=>x.id!==id);
      clearMotivFromVyskyty(id);
      deleteMotivRemote(id);
      render();
    };
  });
  const addBtn = panel.querySelector("#sp-new-motiv-add");
  if(addBtn) addBtn.onclick = ()=>{
    const nameInput = panel.querySelector("#sp-new-motiv-name");
    const colorInput = panel.querySelector("#sp-new-motiv-color");
    const nazov = (nameInput.value||"").trim();
    if(!nazov){ nameInput.focus(); return; }
    const m = { id:"m"+Date.now().toString(36)+Math.random().toString(36).slice(2,6), nazov, farba: colorInput.value||"#8d939a", popis:"", umelecId:"" };
    DATA.motivy.push(m);
    saveMotiv(m);
    render();
  };
}
function renderDielaList(){
  const rows = [];
  DATA.budovy.forEach(b=> b.priecelia.forEach(f=> f.vyskyty.forEach(v=>{
    rows.push({b, f, v});
  })));
  rows.sort((x,y)=>{
    const xu = x.v.motivId ? 1 : 0, yu = y.v.motivId ? 1 : 0;
    if(xu !== yu) return xu - yu;
    const bc = (x.b.kod||x.b.id).localeCompare(y.b.kod||y.b.id, "sk");
    if(bc) return bc;
    return facadeLabel(x.b,x.f).localeCompare(facadeLabel(y.b,y.f), "sk");
  });
  const bezMotivuCount = rows.filter(r=>!r.v.motivId).length;

  const itemHtml = ({b,f,v})=>{
    const m = v.motivId ? DATA.motivy.find(x=>x.id===v.motivId) : null;
    const u = m ? DATA.umelci.find(x=>x.id===m.umelecId) : null;
    const label = m ? motivLabel(m) : (v.nazov ? v.nazov+" — bez motívu" : "bez motívu");
    return `<li><button class="fitem" data-b="${esc(b.id)}" data-f="${esc(f.id)}" data-v="${esc(v.id)}">
      <span class="fname"${!m?' style="color:var(--survey)"':""}>${esc(label)}</span>
      <span class="fdir">${esc(b.kod||b.id)} / ${esc(facadeLabel(b,f))}${u?" · "+esc(u.meno):""}</span>
    </button></li>`;
  };

  panel.innerHTML = crumb([{t:"diela"}]) + `<div class="pad">
    <p class="eyebrow">Databáza</p>
    <h2 class="title">Diela <span class="kod">${rows.length}</span></h2>
    ${bezMotivuCount ? `<p class="hint" style="color:var(--survey)">${bezMotivuCount}× bez priradeného motívu — sú na začiatku zoznamu nižšie.</p>` : ""}
    ${rows.length ? `<ul class="list">${rows.map(itemHtml).join("")}</ul>` : `<div class="empty">Zatiaľ žiadne výskyty.</div>`}
  </div>`;
  wire();
}
function fieldRow(label, val, path){
  return `<tr><th>${esc(label)}</th><td><input class="in" data-path="${path}" value="${esc(val)}"></td></tr>`;
}
function umelecSelectRow(label, val, path){
  return `<tr><th>${esc(label)}</th><td><select class="in" data-path="${path}">
    <option value=""${!val?" selected":""}>— bez umelca —</option>
    ${DATA.umelci.map(u=>`<option value="${esc(u.id)}"${val===u.id?" selected":""}>${esc(u.meno)}</option>`).join("")}
  </select></td></tr>`;
}
const ZATEPLENIE_MOZNOSTI = ["nezateplené", "zateplené", "čiastočne zateplené", "príprava zateplenia"];
function selectRow(label, val, path, options){
  return `<tr><th>${esc(label)}</th><td><select class="in" data-path="${path}">
    <option value=""${!val?" selected":""}>— nevybrané —</option>
    ${options.map(o=>`<option value="${esc(o)}"${val===o?" selected":""}>${esc(o)}</option>`).join("")}
  </select></td></tr>`;
}
function miniPlan(b, activeId, legendHtml){
  const local = toLocalPoly(b.poly);
  const xs=local.map(p=>p[0]), ys=local.map(p=>p[1]);
  const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  const W=250,H=190,pad=22;
  const s = Math.min((W-pad*2)/Math.max(x1-x0,1), (H-pad*2)/Math.max(y1-y0,1));
  const ox = (W-(x1-x0)*s)/2 - x0*s, oy = (H-(y1-y0)*s)/2 + y1*s;
  const P = p => [p[0]*s+ox, oy-p[1]*s];
  const pts = local.map(p=>P(p).join(",")).join(" ");
  const edges = local.map((_,i)=>{
    const a=P(local[i]), c=P(local[(i+1)%local.length]);
    const f = findFacadeByEdge(b, i);
    const cls = (f && f.id===activeId) ? " is-active" : (f ? " is-facade" : "");
    return `<line class="fedge${cls}" x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}"></line>
            <line class="fhit-mini" x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" data-edge="${i}"></line>`;
  }).join("");
  return `<div class="plan">
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pôdorys s priečeliami">
      <polygon class="fill" points="${pts}"></polygon>${edges}
      <g transform="translate(${W-20},20)" font-family="IBM Plex Mono" font-size="10" fill="#5a6068">
        <line x1="0" y1="12" x2="0" y2="-4" stroke="#5a6068" stroke-width="1"></line>
        <text x="0" y="-7" text-anchor="middle">S</text>
      </g>
    </svg>
    <div class="legend">${legendHtml||""}</div>
  </div>`;
}
function budovaTabsHtml(activeTab){
  const btn = (key,label)=>`<button class="tool" data-btab="${key}" aria-pressed="${activeTab===key}">${esc(label)}</button>`;
  return `<div class="row" style="margin-top:0">
    ${btn("zakladne","Základné údaje")}
    ${btn("priecelia","Priečelia")}
    ${btn("motivy","Motívy")}
    ${btn("podklady","Podklady")}
  </div>`;
}
function renderBudova(b){
  const tab = S.budovaTab || "zakladne";
  const editing = !!S.budovaEdit;
  const editToggle = `<div class="row" style="justify-content:flex-end;margin-top:0">
    <a data-edit-toggle tabindex="0" class="edit-toggle">${editing?"Hotovo":"Editovať"}</a>
  </div>`;
  const umelec = DATA.umelci.find(u=>u.id===b.umelecId);
  const umelecView = umelec
    ? `<a data-u="${esc(umelec.id)}" tabindex="0" style="cursor:pointer;color:var(--survey);text-decoration:none">${esc(umelec.meno)}</a>`
    : `<span class="muted">— bez umelca —</span>`;
  const viewRow = (label, html)=> `<tr><th>${esc(label)}</th><td>${html || `<span class="muted">—</span>`}</td></tr>`;

  const zakladneTab = editing ? `
    ${editToggle}
    <table class="meta">
      <tr><th>Budova</th><td><input class="kod-edit" data-path="kod" value="${esc(b.kod||b.id)}" placeholder="kód"></td></tr>
      ${fieldRow("Pôvodné označenie", b.oznacenie, "oznacenie")}
      ${fieldRow("Adresa", b.adresa, "adresa")}
      ${fieldRow("Rok výstavby", b.rok, "rok")}
      ${fieldRow("Typ objektu", b.typ, "typ")}
      ${selectRow("Zateplenie", b.zateplenie, "zateplenie", ZATEPLENIE_MOZNOSTI)}
      ${umelecSelectRow("Umelec", b.umelecId, "umelecId")}
    </table>
    ${b.umelecId ? `<p class="hint">Profil umelca: ${umelecView}</p>` : ""}
    <h3 class="sec">Popis</h3>
    <textarea class="in" data-path="popis" placeholder="Popis domu, história, kontext…">${esc(b.popis)}</textarea>` : `
    ${editToggle}
    <table class="meta">
      <tr><th>Budova</th><td><input class="kod-edit" data-path="kod" value="${esc(b.kod||b.id)}" placeholder="kód"></td></tr>
      ${viewRow("Pôvodné označenie", esc(b.oznacenie))}
      ${viewRow("Adresa", esc(b.adresa))}
      ${viewRow("Rok výstavby", esc(b.rok))}
      ${viewRow("Typ objektu", esc(b.typ))}
      ${viewRow("Zateplenie", esc(b.zateplenie))}
      ${viewRow("Umelec", umelecView)}
    </table>
    ${b.popis ? `<h3 class="sec">Popis</h3><p class="lead" style="font-size:14px">${esc(b.popis)}</p>` : ""}`;

  const bs = budovaStats(b);
  const prieceliaTab = `
    ${miniPlan(b, null, `${bs.motivov} motívov<br>${bs.diel} diel`)}
    ${b.priecelia.length ? `<ul class="list">${b.priecelia.map((f,i)=>{
        const fs = facadeStats(f);
        const label = f.nazov || (SMER_NAZOV[f.smer] ? SMER_NAZOV[f.smer]+" priečelie" : "priečelie");
        return `<li><button class="fitem" data-b="${b.id}" data-f="${f.id}">
        <span class="fname"><span class="kod" style="margin-right:6px">P${i+1}</span>${esc(label)}${f.unresolved?' <span style="color:var(--survey)">· nepriradené k strane domu</span>':""}</span>
        <span class="fdir">${fs.motivov} motívov · ${fs.diel} diel</span>
      </button></li>`;
      }).join("")}</ul>`
      : `<div class="empty">Zatiaľ žiadne priečelie nie je určené. Klikni na stranu domu v mape alebo v pôdoryse vyššie.</div>`}`;

  const groupedB = {};
  const standaloneB = [];
  b.priecelia.forEach(f=> f.vyskyty.forEach(v=>{
    if(v.motivId) groupedB[v.motivId] = (groupedB[v.motivId]||0)+1;
    else standaloneB.push({f, v});
  }));
  const groupedBKeys = Object.keys(groupedB);
  const motivyTab = `
    <h3 class="sec">Motívy na budove <span class="kod">${groupedBKeys.length + standaloneB.length}</span></h3>
    ${(groupedBKeys.length || standaloneB.length) ? `<ul class="list">${groupedBKeys.map(mid=>{
        const m = DATA.motivy.find(x=>x.id===mid);
        return `<li><button class="fitem" data-mid="${esc(mid)}">
          <span class="fname" style="display:flex;align-items:center;gap:8px"><span class="mchip" style="--mc:${esc(m?m.farba:'#8d939a')}"></span>${esc(m ? motivLabel(m) : "neznámy motív")}</span>
          <span class="fdir">${groupedB[mid]}×</span>
        </button></li>`;
      }).join("")}${standaloneB.map(({f,v})=>`
      <li><button class="fitem" data-b="${b.id}" data-f="${f.id}" data-v="${v.id}">
        <span class="fname">${esc(vyskytTitle(v))}</span>
        <span class="fdir">${facadeLabel(b,f)} · bez motívu</span>
      </button></li>`).join("")}</ul>`
      : `<div class="empty">Na tejto budove zatiaľ nie je označený žiadny motív. Označ výskyty na fotke priečelia v záložke Priečelia.</div>`}
  <p class="hint">Klikni na motív pre jeho detail a nahranie fotografie.</p>`;

  const podkladyTab = `
    <h3 class="sec">Podklady</h3>
    ${podkladyBlok(b.podklady, "b")}
    <div class="row" style="margin-top:8px">
      <button class="btn ghost" id="add-podklad">+ Podklad (odkaz)</button>
      <button class="btn ghost" id="upload-podklad-b">+ Nahrať súbor</button>
      <input type="file" id="upload-podklad-b-input" hidden>
    </div>`;

  panel.innerHTML = crumb([{t:b.kod||b.id, red:true}]) + `<div class="pad">
    ${budovaTabsHtml(tab)}
    ${tab==="priecelia" ? prieceliaTab : tab==="motivy" ? motivyTab : tab==="podklady" ? podkladyTab : zakladneTab}
  </div>`;
  wire(b);
}
function photoBlock(f, activeVyskytId, addingMode){
  if(!f.fotoUrl){
    return `<div class="empty">Zatiaľ žiadna fotografia priečelia. Nahraj ju nižšie a označíš na nej jednotlivé výskyty sgrafít.</div>`;
  }
  const dots = f.vyskyty.map((v,i)=>{
    const m = DATA.motivy.find(x=>x.id===v.motivId);
    const farba = m ? m.farba : "#8d939a";
    const cls = v.id===activeVyskytId ? " is-active" : "";
    return `<button type="button" class="vmark${cls}" style="left:${(v.x*100).toFixed(3)}%;top:${(v.y*100).toFixed(3)}%;--mc:${esc(farba)}" data-v="${esc(v.id)}" title="${esc(m?m.nazov:'bez motívu')} · #${i+1}">${i+1}</button>`;
  }).join("");
  return `<div class="photo-wrap${addingMode?" adding":""}" id="sp-photo">
    <img src="${esc(f.fotoUrl)}" alt="Fotografia priečelia" draggable="false">
    ${dots}
  </div>`;
}
function renderPriecelie(b, f, activeVid){
  const adding = S.addingVyskyt && S.addingVyskyt.prieceleId===f.id;
  const editing = !!S.priecelieEdit;
  const reassigning = S.reassignPriecelie === f.id;
  const grouped = {};
  const standalone = [];
  f.vyskyty.forEach(v=>{
    if(v.motivId) grouped[v.motivId] = (grouped[v.motivId]||0)+1;
    else standalone.push(v);
  });
  const groupedKeys = Object.keys(grouped);
  const summary = (groupedKeys.length || standalone.length)
    ? `<ul class="list">${groupedKeys.map(mid=>{
        const m = DATA.motivy.find(x=>x.id===mid);
        return `<li><button class="fitem" data-mid="${esc(mid)}">
          <span class="fname" style="display:flex;align-items:center;gap:8px"><span class="mchip" style="--mc:${esc(m?m.farba:'#8d939a')}"></span>${esc(m ? motivLabel(m) : 'neznámy motív')}</span>
          <span class="fdir">${grouped[mid]}×</span>
        </button></li>`;
      }).join("")}${standalone.map(v=>`
      <li><button class="fitem" data-b="${b.id}" data-f="${f.id}" data-v="${v.id}">
        <span class="fname">${esc(vyskytTitle(v))}</span>
        <span class="fdir">bez motívu</span>
      </button></li>`).join("")}</ul>`
    : `<div class="empty">Na tomto priečelí zatiaľ nie je označený žiadny výskyt.</div>`;

  panel.innerHTML = crumb([{t:b.kod||b.id, go:b.id, red:true},{t:facadeLabel(b,f)}]) + `<div class="pad">
    ${budovaTabsHtml("priecelia")}
    ${f.unresolved ? `<div class="empty" style="border-color:var(--survey);color:var(--survey)">Toto priečelie sa nepodarilo umiestniť na správnu stranu domu (napr. po zmene tvaru budovy). Údaje a motívy zostali zachované — klikni na Editovať a použi "Presunúť na inú stranu domu".</div>` : ""}
    ${photoBlock(f, activeVid||null, !!adding)}
    <div class="row" style="justify-content:flex-end;margin-top:6px;margin-bottom:4px">
      <a data-priecelie-edit tabindex="0" class="edit-toggle">${editing?"Hotovo":"Editovať"}</a>
    </div>
    ${editing ? `
    <input type="file" id="sp-upload-foto" accept="image/*" hidden>
    <div class="row">
      <button class="btn ghost" id="sp-btn-upload-foto">${f.fotoUrl?"Nahrať inú fotku":"Nahrať fotku priečelia"}</button>
      ${f.fotoUrl ? (DATA.motivy.length
        ? `<button class="tool" id="sp-btn-adding" aria-pressed="${!!adding}">${adding?"Ukončiť označovanie":"+ Označiť výskyt"}</button>`
        : `<span class="hint">Najprv pridaj motív do <a data-go="list:motivy" tabindex="0">katalógu motívov</a>.</span>`) : ""}
    </div>
    ${f.fotoUrl && adding ? `
    <div class="row" style="align-items:center">
      <select class="in" id="sp-adding-motiv" style="flex:1;min-width:160px">
        ${DATA.motivy.map(m=>`<option value="${esc(m.id)}"${S.addingVyskyt.motivId===m.id?" selected":""}>${esc(motivLabel(m))}</option>`).join("")}
      </select>
    </div>
    <p class="hint">Klikaj priamo na fotku — každý klik pridá výskyt zvoleného motívu. Nový motív pridáš v zozname motívov.</p>
    ` : ""}
    <div class="row" style="margin-top:12px">
      <button class="btn ghost" id="sp-btn-reassign" aria-pressed="${reassigning}">${reassigning?"Zrušiť presun":"Presunúť na inú stranu domu"}</button>
    </div>
    ${reassigning ? miniPlan(b, f.id, "Klikni na stranu domu, kam chceš toto priečelie (aj s jeho motívmi) presunúť.") : ""}
    <div class="row" style="margin-top:12px"><button class="btn warn" id="del-f">Zrušiť toto priečelie</button></div>
    ` : ""}

    <h3 class="sec">Motívy na tomto priečelí</h3>
    ${summary}
  </div>`;
  wire(b,f);
  wirePriecelie(b,f);
}
function wirePriecelie(b, f){
  wireUpload(panel.querySelector("#sp-btn-upload-foto"), panel.querySelector("#sp-upload-foto"), async (file)=>{
    const url = await uploadToStorage(file);
    f.fotoUrl = url;
    savePriecelie(f, b.id);
    render();
  });

  const toggleBtn = panel.querySelector("#sp-btn-adding");
  if(toggleBtn) toggleBtn.onclick = ()=>{
    if(S.addingVyskyt && S.addingVyskyt.prieceleId===f.id){
      S.addingVyskyt = null;
    } else {
      S.addingVyskyt = { prieceleId: f.id, motivId: DATA.motivy.length ? DATA.motivy[0].id : "" };
    }
    render();
  };

  const motivSel = panel.querySelector("#sp-adding-motiv");
  if(motivSel) motivSel.onchange = ()=>{
    if(S.addingVyskyt) S.addingVyskyt.motivId = motivSel.value;
  };

  const wrap = panel.querySelector("#sp-photo");
  if(wrap){
    const img = wrap.querySelector("img");
    if(img) img.onclick = (e)=>{
      if(!(S.addingVyskyt && S.addingVyskyt.prieceleId===f.id)) return;
      const r = img.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      const nv = {
        id: "v"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),
        motivId: S.addingVyskyt.motivId || "", nazov:"",
        x, y, velkost:"", vrstvy:"", stav:"", popis:"", podklady:[], fotoUrl:""
      };
      f.vyskyty.push(nv);
      saveVyskyt(nv, f.id);
      render();
    };
    wrap.querySelectorAll(".vmark").forEach(dot=>{
      dot.onclick = (e)=>{ e.stopPropagation(); go(b.id, f.id, dot.dataset.v); };
    });
  }
  panel.querySelectorAll("[data-mid]").forEach(el=>{
    if(el.tagName==="BUTTON") el.onclick = ()=> goPrieceliaMotiv(b.id, f.id, el.dataset.mid);
  });
  const reassignBtn = panel.querySelector("#sp-btn-reassign");
  if(reassignBtn) reassignBtn.onclick = ()=>{
    S.reassignPriecelie = (S.reassignPriecelie === f.id) ? null : f.id;
    render();
  };
  if(S.reassignPriecelie === f.id){
    panel.querySelectorAll(".fhit-mini").forEach(el=>{
      el.onclick = ()=> reassignPriecelieToEdge(b, f, +el.dataset.edge);
    });
  }
}
function reassignPriecelieToEdge(b, f, edgeIndex){
  if(edgeIndex === f.edgeIndex){ S.reassignPriecelie = null; render(); return; }
  const existing = findFacadeByEdge(b, edgeIndex);
  if(existing){
    alert("Na tejto strane domu už existuje iné priečelie. Najprv ho zruš alebo presuň inam.");
    return;
  }
  const e = edgeInfo(b.poly, edgeIndex);
  f.edgeIndex = edgeIndex;
  f.smer = e.smer;
  f.dlzka = e.lenM;
  f.edgeLL = edgeLLOf(b.poly, edgeIndex);
  f.unresolved = false;
  savePriecelie(f, b.id);
  S.reassignPriecelie = null;
  if(map.getSource("facades")) map.getSource("facades").setData(facadesFC());
  render();
}
function renderAssignMotivPanel(b, f, v){
  detailPanel.innerHTML = `<div class="pad">
    <p class="eyebrow" style="color:var(--survey)">Bez motívu</p>
    <h2 class="title" style="font-size:22px">${esc(v.nazov || "bez názvu")}</h2>
    <div class="empty">Tento výskyt zatiaľ nemá priradený motív z katalógu.</div>
    <h3 class="sec">Priradiť motív</h3>
    ${DATA.motivy.length
      ? `<select class="in" id="sp-assign-motiv">
          <option value="" selected disabled>— vyber motív —</option>
          ${DATA.motivy.map(m=>`<option value="${esc(m.id)}">${esc(motivLabel(m))}</option>`).join("")}
        </select>
        <p class="hint">Po priradení motívu sa otvorí jeho karta s fotkou a údajmi.</p>`
      : `<p class="hint">Katalóg motívov je zatiaľ prázdny. Najprv pridaj motív v zozname Motívy.</p>`}
    <div class="row" style="margin-top:26px"><button class="btn warn" id="del-v">Zrušiť tento výskyt</button></div>
  </div>`;
  wireAssignMotivPanel(b, f, v);
}
function wireAssignMotivPanel(b, f, v){
  const sel = detailPanel.querySelector("#sp-assign-motiv");
  if(sel) sel.onchange = ()=>{
    v.motivId = sel.value;
    saveVyskyt(v, f.id);
    go(b.id, f.id, v.id);
  };
  const dv = detailPanel.querySelector("#del-v");
  if(dv) dv.onclick = ()=>{
    f.vyskyty = f.vyskyty.filter(x=>x.id!==v.id);
    deleteVyskytRemote(v.id);
    go(b.id, f.id, null);
  };
}
function renderMotivDetailPanel(m, ctx){
  const editing = !!S.motivDetailEdit;
  const u = DATA.umelci.find(x=>x.id===m.umelecId);
  const st = motivStats(m.id);
  const vyskyty = [];
  DATA.budovy.forEach(b=> b.priecelia.forEach(f=> f.vyskyty.forEach(v=>{
    if(v.motivId===m.id) vyskyty.push({b, f, v});
  })));

  detailPanel.innerHTML = `<div class="pad">
    <p class="eyebrow">${u?esc(u.meno):"Bez umelca"}</p>
    <h2 class="title" style="font-size:22px">${esc(m.nazov || "bez názvu")}</h2>
    ${ctx ? `
    <h3 class="sec">Toto sgrafito na priečelí ${esc(facadeLabel(ctx.b, ctx.f))}</h3>
    <select class="in" id="sp-vyskyt-reassign-motiv">
      ${DATA.motivy.map(mo=>`<option value="${esc(mo.id)}"${mo.id===m.id?" selected":""}>${esc(motivLabel(mo))}</option>`).join("")}
    </select>
    <p class="hint" style="margin-top:6px">Zmenou výberu preradíš toto konkrétne sgrafito k inému motívu v katalógu.</p>
    ` : ""}
    ${m.fotoUrl
      ? `<div class="photo-wrap" style="margin-top:8px"><img src="${esc(m.fotoUrl)}" alt="Fotografia motívu"></div>`
      : `<div class="empty">Zatiaľ žiadna fotografia motívu.</div>`}
    <div class="row" style="justify-content:flex-end;margin-top:6px;margin-bottom:4px">
      <a data-motivdetail-edit tabindex="0" class="edit-toggle">${editing?"Hotovo":"Editovať"}</a>
    </div>
    ${editing ? `
    <input type="file" id="sp-upload-motivdetail-foto" accept="image/*" hidden>
    <div class="row">
      <button class="btn ghost" id="sp-btn-upload-motivdetail-foto">${m.fotoUrl?"Nahrať inú fotku":"Nahrať fotku motívu"}</button>
    </div>
    <h3 class="sec">Názov</h3>
    <input class="in" id="sp-motivdetail-nazov" value="${esc(m.nazov)}" placeholder="Názov motívu">
    <h3 class="sec">Farba</h3>
    <input type="color" class="in" id="sp-motivdetail-farba" style="flex:0 0 40px;padding:2px" value="${esc(m.farba)}">
    <h3 class="sec">Umelec</h3>
    <select class="in" id="sp-motivdetail-umelec">
      <option value=""${!m.umelecId?" selected":""}>— bez umelca —</option>
      ${DATA.umelci.map(uu=>`<option value="${esc(uu.id)}"${m.umelecId===uu.id?" selected":""}>${esc(uu.meno)}</option>`).join("")}
    </select>
    <h3 class="sec">Popis</h3>
    <textarea class="in" id="sp-motivdetail-popis" placeholder="Technika, rozmer, farebnosť…">${esc(m.popis)}</textarea>
    <div class="row" style="margin-top:26px"><button class="btn warn" id="del-motivdetail">Zmazať motív</button></div>
    ` : ""}

    <h3 class="sec">Výskyty <span class="kod">${st.diel}</span></h3>
    <p class="hint" style="margin-top:0">${st.budov} domov · ${st.priecelia} priečelí</p>
    ${vyskyty.length ? `<ul class="list">${vyskyty.map(({b,f,v},i)=>{
        const fLabel = facadeLabel(b, f);
        return `<li><button class="fitem" data-b="${esc(b.id)}" data-f="${esc(f.id)}" data-v="${esc(v.id)}">
          <span class="fname">${esc(b.kod||b.id)} / ${esc(fLabel)}</span>
          <span class="fdir">#${i+1}</span>
        </button></li>`;
      }).join("")}</ul>`
      : `<div class="empty">Tento motív zatiaľ nemá zaznamenaný žiadny výskyt.</div>`}
  </div>`;
  wireMotivDetailPanel(m, ctx);
}
function wireMotivDetailPanel(m, ctx){
  const reassignSel = detailPanel.querySelector("#sp-vyskyt-reassign-motiv");
  if(reassignSel) reassignSel.onchange = ()=>{
    ctx.v.motivId = reassignSel.value;
    saveVyskyt(ctx.v, ctx.f.id);
    go(ctx.b.id, ctx.f.id, ctx.v.id);
  };
  detailPanel.querySelectorAll("[data-motivdetail-edit]").forEach(el=>{
    el.onclick = ()=>{ S.motivDetailEdit = !S.motivDetailEdit; render(); };
    el.onkeydown = e => { if(e.key==="Enter") el.click(); };
  });
  wireUpload(
    detailPanel.querySelector("#sp-btn-upload-motivdetail-foto"),
    detailPanel.querySelector("#sp-upload-motivdetail-foto"),
    async (file)=>{ const url = await uploadToStorage(file); m.fotoUrl = url; saveMotiv(m); render(); }
  );
  const nazovEl = detailPanel.querySelector("#sp-motivdetail-nazov");
  if(nazovEl) nazovEl.oninput = ()=>{ m.nazov = nazovEl.value; saveMotivDebounced(m.id, m); };
  const farbaEl = detailPanel.querySelector("#sp-motivdetail-farba");
  if(farbaEl) farbaEl.oninput = ()=>{ m.farba = farbaEl.value; saveMotivDebounced(m.id, m); };
  const umelecEl = detailPanel.querySelector("#sp-motivdetail-umelec");
  if(umelecEl) umelecEl.onchange = ()=>{ m.umelecId = umelecEl.value; saveMotiv(m); render(); };
  const popisEl = detailPanel.querySelector("#sp-motivdetail-popis");
  if(popisEl) popisEl.oninput = ()=>{ m.popis = popisEl.value; saveMotivDebounced(m.id, m); };
  const delBtn = detailPanel.querySelector("#del-motivdetail");
  if(delBtn) delBtn.onclick = ()=>{
    DATA.motivy = DATA.motivy.filter(x=>x.id!==m.id);
    clearMotivFromVyskyty(m.id);
    deleteMotivRemote(m.id);
    goList("motivy");
  };
  detailPanel.querySelectorAll(".fitem").forEach(el=>{
    el.onclick = ()=> go(el.dataset.b, el.dataset.f||null, el.dataset.v||null);
  });
}
function renderMotiv(m){
  const countsAll = motivCountsAll();
  const vyskyty = [];
  DATA.budovy.forEach(b=> b.priecelia.forEach(f=> f.vyskyty.forEach(v=>{
    if(v.motivId===m.id) vyskyty.push({b, f, v});
  })));
  const u = DATA.umelci.find(x=>x.id===m.umelecId);

  panel.innerHTML = crumb([{t:"motívy", go:"list:motivy"},{t:motivLabel(m)}]) + `<div class="pad">
    <p class="eyebrow">Motív</p>
    <div class="row" style="margin:0;align-items:center;gap:10px">
      <input type="color" class="in" id="sp-motiv-farba" style="flex:0 0 40px;padding:2px" value="${esc(m.farba)}">
      <input class="in" id="sp-motiv-nazov" value="${esc(m.nazov)}" placeholder="Názov motívu"
        style="font-family:var(--sans);font-size:22px;text-transform:uppercase;letter-spacing:.02em;flex:1">
    </div>
    <table class="meta" style="margin-top:16px">
      <tr><th>Umelec</th><td>
        <select class="in" id="sp-motiv-umelec">
          <option value=""${!m.umelecId?" selected":""}>— bez umelca —</option>
          ${DATA.umelci.map(u=>`<option value="${esc(u.id)}"${m.umelecId===u.id?" selected":""}>${esc(u.meno)}</option>`).join("")}
        </select>
      </td></tr>
    </table>

    <h3 class="sec">Fotografia motívu</h3>
    ${m.fotoUrl
      ? `<div class="photo-wrap"><img src="${esc(m.fotoUrl)}" alt="Fotografia motívu"></div>`
      : `<div class="empty">Zatiaľ žiadna fotografia motívu.</div>`}
    <div class="row" style="margin-top:8px">
      <input type="file" id="sp-upload-motiv-foto" accept="image/*" hidden>
      <button class="btn ghost" id="sp-btn-upload-motiv-foto">${m.fotoUrl?"Nahrať inú fotku":"Nahrať fotku motívu"}</button>
    </div>

    <h3 class="sec">Popis</h3>
    <textarea class="in" id="sp-motiv-popis" placeholder="Technika, rozmer, farebnosť…">${esc(m.popis)}</textarea>

    <h3 class="sec">Výskyty na sídlisku <span class="kod">${vyskyty.length}</span></h3>
    ${vyskyty.length ? `<ul class="list">${vyskyty.map(({b,f,v},i)=>{
        const fLabel = facadeLabel(b, f);
        return `<li><button class="fitem" data-b="${esc(b.id)}" data-f="${esc(f.id)}" data-v="${esc(v.id)}">
          <span class="fname">${esc(b.kod||b.id)} / ${esc(fLabel)}</span>
          <span class="fdir">#${i+1}</span>
        </button></li>`;
      }).join("")}</ul>`
      : `<div class="empty">Tento motív zatiaľ nemá zaznamenaný žiadny výskyt. Označ ho na fotke priečelia.</div>`}

    <div class="row" style="margin-top:26px"><button class="btn warn" id="del-motiv">Zmazať motív</button></div>
  </div>`;
  wireMotiv(m);
}
function wireMotiv(m){
  panel.querySelectorAll("[data-go]").forEach(a=>{
    const t = a.dataset.go;
    a.onclick = ()=> t && t.indexOf("list:")===0 ? goList(t.slice(5)) : go(t||null,null,null);
    a.onkeydown = e => { if(e.key==="Enter") a.click(); };
  });
  panel.querySelectorAll(".fitem").forEach(el=>{
    el.onclick = ()=> go(el.dataset.b, el.dataset.f||null, el.dataset.v||null);
  });
  const nazovEl = panel.querySelector("#sp-motiv-nazov");
  if(nazovEl) nazovEl.oninput = ()=>{ m.nazov = nazovEl.value; saveMotivDebounced(m.id, m); };
  const farbaEl = panel.querySelector("#sp-motiv-farba");
  if(farbaEl) farbaEl.oninput = ()=>{ m.farba = farbaEl.value; saveMotivDebounced(m.id, m); };
  const umelecEl = panel.querySelector("#sp-motiv-umelec");
  if(umelecEl) umelecEl.onchange = ()=>{ m.umelecId = umelecEl.value; saveMotiv(m); render(); };
  const opisEl = panel.querySelector("#sp-motiv-popis");
  if(opisEl) opisEl.oninput = ()=>{ m.popis = opisEl.value; saveMotivDebounced(m.id, m); };
  wireUpload(
    panel.querySelector("#sp-btn-upload-motiv-foto"),
    panel.querySelector("#sp-upload-motiv-foto"),
    async (file)=>{ const url = await uploadToStorage(file); m.fotoUrl = url; saveMotiv(m); render(); }
  );
  const delBtn = panel.querySelector("#del-motiv");
  if(delBtn) delBtn.onclick = ()=>{
    DATA.motivy = DATA.motivy.filter(x=>x.id!==m.id);
    clearMotivFromVyskyty(m.id);
    deleteMotivRemote(m.id);
    goList("motivy");
  };
}
function renderUmelec(u){
  const motivyU = motivyByUmelec(u.id);
  const budovyU = budovyByUmelec(u.id);
  const countsAll = motivCountsAll();
  panel.innerHTML = crumb([{t:"umelci", go:"list:umelci"},{t:u.meno||"bez mena"}]) + `<div class="pad">
    <p class="eyebrow">Umelec</p>
    <input class="in" data-upath="meno" value="${esc(u.meno)}" placeholder="Meno umelca" style="font-family:var(--sans);font-size:24px;text-transform:uppercase;letter-spacing:.02em">
    <h3 class="sec">Popis</h3>
    <textarea class="in" data-upath="popis" placeholder="Životopis, pôsobenie, poznámky…">${esc(u.popis)}</textarea>

    <h3 class="sec">Motívy tohto umelca <span class="kod">${motivyU.length}</span></h3>
    ${motivyU.length ? `<ul class="list">${motivyU.map(m=>`
      <li><span class="fname" style="display:flex;align-items:center;gap:8px"><span class="mchip" style="--mc:${esc(m.farba)}"></span>${esc(m.nazov||"bez názvu")}</span>
        <span class="fdir">${countsAll[m.id]||0}× na sídlisku</span></li>`).join("")}</ul>`
      : `<div class="empty">Tomuto umelcovi zatiaľ nie je priradený žiadny motív. Priraď ho v zozname motívov.</div>`}

    <h3 class="sec">Domy s jeho sgrafitami/reliéfmi <span class="kod">${budovyU.length}</span></h3>
    ${budovyU.length ? `<ul class="list">${budovyU.map(b=>{
        const kod = b.kod || b.id;
        const extra = b.nazov || b.adresa || "";
        return `<li><button class="fitem" data-b="${esc(b.id)}">
        <span class="fname">${esc(kod)}</span>
        <span class="fdir">${extra?esc(extra)+" · ":""}${b.priecelia.length} priečelí</span>
      </button></li>`;
      }).join("")}</ul>`
      : `<div class="empty">Tomuto umelcovi zatiaľ nie je priradený žiadny dom.</div>`}

    <div class="row" style="margin-top:26px"><button class="btn warn" id="del-u">Zmazať umelca</button></div>
  </div>`;
  wireUmelec(u);
}
function wireUmelec(u){
  panel.querySelectorAll("[data-go]").forEach(a=>{
    const t = a.dataset.go;
    a.onclick = ()=> t && t.indexOf("list:")===0 ? goList(t.slice(5)) : go(t || null, null, null);
    a.onkeydown = e => { if(e.key==="Enter") a.click(); };
  });
  panel.querySelectorAll("[data-upath]").forEach(el=>{
    el.oninput = ()=>{ u[el.dataset.upath] = el.value; saveUmelecDebounced(u.id, u); };
  });
  panel.querySelectorAll(".fitem").forEach(el=>{
    el.onclick = ()=> go(el.dataset.b, null, null);
  });
  const du = panel.querySelector("#del-u");
  if(du) du.onclick = ()=>{
    DATA.umelci = DATA.umelci.filter(x=>x.id!==u.id);
    DATA.budovy.forEach(b=>{ if(b.umelecId===u.id) b.umelecId=""; });
    DATA.motivy.forEach(m=>{ if(m.umelecId===u.id) m.umelecId=""; });
    deleteUmelecRemote(u.id);
    goUmelec(null);
  };
}
function fieldRow3(label,val,path){
  return `<tr><th>${esc(label)}</th><td><input class="in" data-vpath="${path}" value="${esc(val)}"></td></tr>`;
}
function podkladyBlok(arr, scope){
  if(!arr || !arr.length) return `<div class="empty">Žiadne podklady. Pridaj prvý nižšie.</div>`;
  return `<ul class="list">${arr.map((p,i)=>`
    <li style="display:block">
      <div class="row" style="margin:0">
        <input class="in" style="flex:0 0 90px" data-pk="${scope}|${i}|typ" value="${esc(p.typ)}" placeholder="typ">
        <input class="in" style="flex:1;min-width:120px" data-pk="${scope}|${i}|nazov" value="${esc(p.nazov)}" placeholder="názov">
      </div>
      <div class="row" style="margin-top:6px">
        <input class="in" style="flex:1" data-pk="${scope}|${i}|url" value="${esc(p.url||"")}" placeholder="odkaz (Drive, foto, PDF…)">
        <button class="btn ghost" data-pk-del="${scope}|${i}">×</button>
      </div>
    </li>`).join("")}</ul>`;
}
function scopeObj(scope, b, f, v){
  return scope==="b" ? b : scope==="f" ? f : v;
}
function wireUpload(btn, input, onFile){
  if(!btn || !input) return;
  btn.onclick = ()=> input.click();
  input.onchange = async ()=>{
    const file = input.files[0];
    input.value = "";
    if(!file) return;
    const prevText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Nahrávam…";
    try{
      await onFile(file);
    }catch(err){
      alert("Nahranie súboru zlyhalo: "+err.message);
      btn.disabled = false;
      btn.textContent = prevText;
    }
  };
}
function wire(b, f, v){
  panel.querySelectorAll("[data-go]").forEach(a=>{
    const t = a.dataset.go;
    a.onclick = ()=>{
      if(t && t.indexOf("list:")===0){
        goList(t.slice(5));
      } else if(t && t.indexOf("|")>-1){
        const parts = t.split("|");
        go(parts[0], parts[1], null);
      } else {
        go(t || null, null, null);
      }
    };
    a.onkeydown = e => { if(e.key==="Enter") a.click(); };
  });
  panel.querySelectorAll(".fitem").forEach(el=>{
    el.onclick = ()=> go(el.dataset.b, el.dataset.f || null, el.dataset.v || null);
  });
  panel.querySelectorAll("[data-u]").forEach(el=>{
    el.onclick = ()=> goUmelec(el.dataset.u);
    el.onkeydown = e => { if(e.key==="Enter") el.click(); };
  });
  panel.querySelectorAll("[data-mid]").forEach(el=>{
    if(el.tagName==="BUTTON") el.onclick = ()=> goMotiv(el.dataset.mid);
  });
  panel.querySelectorAll("[data-btab]").forEach(el=>{
    el.onclick = ()=>{
      S.budovaTab = el.dataset.btab;
      if(S.route.priecelie || S.route.vyskyt) go(b.id, null, null);
      else render();
    };
  });
  panel.querySelectorAll("[data-edit-toggle]").forEach(el=>{
    el.onclick = ()=>{ S.budovaEdit = !S.budovaEdit; render(); };
    el.onkeydown = e => { if(e.key==="Enter") el.click(); };
  });
  panel.querySelectorAll("[data-priecelie-edit]").forEach(el=>{
    el.onclick = ()=>{ S.priecelieEdit = !S.priecelieEdit; if(!S.priecelieEdit) S.addingVyskyt=null; render(); };
    el.onkeydown = e => { if(e.key==="Enter") el.click(); };
  });
  panel.querySelectorAll(".fhit-mini").forEach(el=>{ el.onclick = ()=> toggleEdge(b, +el.dataset.edge); });
  panel.querySelectorAll("[data-path]").forEach(el=>{
    el.oninput = ()=>{ b[el.dataset.path] = el.value; saveBudovaDebounced(b.id, b); };
  });
  panel.querySelectorAll("[data-fpath]").forEach(el=>{
    el.oninput = ()=>{ f[el.dataset.fpath] = el.value; savePrieceliaDebounced(f.id, f, b.id); };
  });
  panel.querySelectorAll("[data-vpath]").forEach(el=>{
    el.oninput = ()=>{ v[el.dataset.vpath] = el.value; saveVyskytDebounced(v.id, v, f.id); };
  });
  panel.querySelectorAll("[data-pk]").forEach(el=>{
    el.oninput = ()=>{
      const parts = el.dataset.pk.split("|");
      const scope = parts[0], i = parts[1], key = parts[2];
      const owner = scopeObj(scope, b, f, v);
      owner.podklady[+i][key] = el.value;
      if(scope==="b") saveBudovaDebounced(b.id, b);
      else if(scope==="f") savePrieceliaDebounced(f.id, f, b.id);
      else saveVyskytDebounced(v.id, v, f.id);
    };
  });
  panel.querySelectorAll("[data-pk-del]").forEach(el=>{
    el.onclick = ()=>{
      const parts = el.dataset.pkDel.split("|");
      const scope = parts[0], i = parts[1];
      const owner = scopeObj(scope, b, f, v);
      owner.podklady.splice(+i,1);
      if(scope==="b") saveBudova(b);
      else if(scope==="f") savePriecelie(f, b.id);
      else saveVyskyt(v, f.id);
      render();
    };
  });
  const ap = panel.querySelector("#add-podklad");
  if(ap) ap.onclick = ()=>{ b.podklady.push({typ:"foto",nazov:"",url:""}); saveBudova(b); render(); };
  const apf = panel.querySelector("#add-podklad-f");
  if(apf) apf.onclick = ()=>{ f.podklady.push({typ:"foto",nazov:"",url:""}); savePriecelie(f, b.id); render(); };
  const apv = panel.querySelector("#add-podklad-v");
  if(apv) apv.onclick = ()=>{ v.podklady.push({typ:"foto",nazov:"",url:""}); saveVyskyt(v, f.id); render(); };

  wireUpload(panel.querySelector("#upload-podklad-b"), panel.querySelector("#upload-podklad-b-input"), async (file)=>{
    const url = await uploadToStorage(file);
    b.podklady.push({typ:"foto", nazov:file.name, url});
    saveBudova(b); render();
  });
  wireUpload(panel.querySelector("#upload-podklad-f"), panel.querySelector("#upload-podklad-f-input"), async (file)=>{
    const url = await uploadToStorage(file);
    f.podklady.push({typ:"foto", nazov:file.name, url});
    savePriecelie(f, b.id); render();
  });
  wireUpload(panel.querySelector("#upload-podklad-v"), panel.querySelector("#upload-podklad-v-input"), async (file)=>{
    const url = await uploadToStorage(file);
    v.podklady.push({typ:"foto", nazov:file.name, url});
    saveVyskyt(v, f.id); render();
  });

  const df = panel.querySelector("#del-f");
  if(df) df.onclick = ()=>{
    b.priecelia = b.priecelia.filter(x=>x.id!==f.id);
    deletePrieceliaRemote(f.id);
    if(map.getSource("facades")) map.getSource("facades").setData(facadesFC());
    go(b.id, null, null);
  };
  const dv = panel.querySelector("#del-v");
  if(dv) dv.onclick = ()=>{
    f.vyskyty = f.vyskyty.filter(x=>x.id!==v.id);
    deleteVyskytRemote(v.id);
    go(b.id, f.id, null);
  };
}

function note(){
  document.getElementById("sp-mapnote").innerHTML = "Ťahaním posúvaš, kolieskom približuješ · klikni na dom";
}
})();
