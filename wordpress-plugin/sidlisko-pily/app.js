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
    id: r.id, nazov: r.nazov||"", farba: r.farba||"#8d939a", popis: r.popis||"", umelecId: r.umelec_id||""
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
      vyskyty: (vyskytyRows||[]).filter(v=>v.priecelie_id===f.id).map(v=>({
        id: v.id, motivId: v.motiv_id||"", x: v.x, y: v.y,
        velkost: v.velkost||"", vrstvy: v.vrstvy||"", stav: v.stav||"",
        popis: v.popis||"", podklady: v.podklady||[]
      }))
    }))
  }));
}

function budovaRow(b){
  return { id:b.id, kod:b.kod, nazov:b.nazov, adresa:b.adresa, rok:b.rok,
    oznacenie:b.oznacenie, typ:b.typ, zateplenie:b.zateplenie, umelec_id:b.umelecId||null,
    stav:b.stav, popis:b.popis, poly:b.poly, podklady:b.podklady,
    updated_at:new Date().toISOString() };
}
function prieceliaRow(f, budovaId){
  return { id:f.id, budova_id:budovaId, edge_index:f.edgeIndex, smer:f.smer, dlzka:f.dlzka,
    nazov:f.nazov, popis:f.popis, vyzdoba:f.vyzdoba, autor:f.autor, rok:f.rok, stav:f.stav,
    podklady:f.podklady, foto_url:f.fotoUrl||null, updated_at:new Date().toISOString() };
}
function motivRow(m){
  return { id:m.id, nazov:m.nazov, farba:m.farba, popis:m.popis, umelec_id:m.umelecId||null, updated_at:new Date().toISOString() };
}
function umelecRow(u){
  return { id:u.id, meno:u.meno, popis:u.popis, updated_at:new Date().toISOString() };
}
function vyskytRow(v, prieceleId){
  return { id:v.id, priecelie_id:prieceleId, motiv_id:v.motivId||null, x:v.x, y:v.y,
    velkost:v.velkost, vrstvy:v.vrstvy, stav:v.stav, popis:v.popis, podklady:v.podklady,
    updated_at:new Date().toISOString() };
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
const saveBudovaDebounced = makeKeyedDebounce(saveBudova, 700);
const savePrieceliaDebounced = makeKeyedDebounce(savePriecelie, 700);
const saveMotivDebounced = makeKeyedDebounce(saveMotiv, 500);
const saveVyskytDebounced = makeKeyedDebounce(saveVyskyt, 700);
const saveUmelecDebounced = makeKeyedDebounce(saveUmelec, 500);
async function deleteBudovaRemote(id){
  const {error} = await sb.from("budovy").delete().eq("id", id);
  if(error) console.error("Zmazanie domu zlyhalo:", error.message);
}
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
function syncPriecelia(b){
  const stare = b.priecelia || [];
  b.priecelia = stare
    .map(s=>{
      let ei = s.edgeIndex;
      if(ei === undefined || ei === null){
        const m = String(s.id||"").match(/^f(\d+)$/);
        ei = m ? +m[1] : null;
      }
      return {...s, edgeIndex: ei};
    })
    .filter(s=> Number.isInteger(s.edgeIndex) && s.edgeIndex >= 0 && s.edgeIndex < b.poly.length)
    .map(s=>{
      const e = edgeInfo(b.poly, s.edgeIndex);
      return {
        id: s.id || ("f"+s.edgeIndex), edgeIndex: s.edgeIndex,
        smer: e.smer, dlzka: e.lenM,
        nazov: s.nazov || "", popis: s.popis || "", vyzdoba: s.vyzdoba || "",
        autor: s.autor || "", rok: s.rok || "", stav: s.stav || "",
        podklady: s.podklady || [], fotoUrl: s.fotoUrl || "",
        vyskyty: s.vyskyty || []
      };
    });
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
    id:"f"+edgeIndex, edgeIndex, smer:e.smer, dlzka:e.lenM,
    nazov:"", popis:"", vyzdoba:"", autor:"", rok:"", stav:"", podklady:[],
    fotoUrl:"", vyskyty:[]
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
const S = { route:{budova:null, priecelie:null, vyskyt:null, umelec:null, list:null}, addingVyskyt:null, budovaTab:"zakladne" };
const panel = document.getElementById("sp-panel");
const appRoot = panel.closest(".sidlisko-pily-app") || document;

const DEFAULT_CENTER = [18.6045, 48.7715];
let map;

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
        properties:{ edgeIndex:i, isFacade: !!f, active: !!f && f.id===S.route.priecelie },
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
  map.addLayer({id:"facades-line", type:"line", source:"facades",
    paint:{"line-color":["case",["any",["get","active"],["get","isFacade"]],"#d0342c","#b9b6ae"],
           "line-width":["case",["get","active"],5,["get","isFacade"],3.5,1.3],
           "line-dasharray":["case",["get","isFacade"],["literal",[1]],["literal",[1,1.6]]]}});

  map.on("mousemove","buildings-fill", ()=> map.getCanvas().style.cursor = "pointer");
  map.on("mouseleave","buildings-fill", ()=> map.getCanvas().style.cursor = "");
  map.on("click","buildings-fill", e=>{
    const id = e.features[0].properties.id;
    go(id, null);
  });
  map.on("click", e=>{
    const hits = map.queryRenderedFeatures(e.point, {layers:["buildings-fill"]});
    if(!hits.length) go(null, null);
  });
  map.on("mousemove","facades-hit", ()=> map.getCanvas().style.cursor = "pointer");
  map.on("mouseleave","facades-hit", ()=> map.getCanvas().style.cursor = "");
  map.on("click","facades-hit", e=>{
    const b = DATA.budovy.find(x=>x.id===S.route.budova);
    if(!b) return;
    toggleEdge(b, e.features[0].properties.edgeIndex);
  });

  render(); note();
  const mu = location.hash.match(/^#\/umelec\/([^/]+)/);
  const ml = location.hash.match(/^#\/(budovy|umelci|motivy)$/);
  const m = location.hash.match(/^#\/budova\/([^/]+)(?:\/prieceli\/([^/]+)(?:\/vyskyt\/([^/]+))?)?/);
  if(mu) goUmelec(mu[1]);
  else if(ml) goList(ml[1]);
  else if(m) go(m[1], m[2]||null, m[3]||null, {noFit:true});
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
  const zmenaBudovy = budovaId !== S.route.budova;
  if(zmenaBudovy) S.budovaTab = "zakladne";
  S.route = {budova:budovaId, priecelie:prieceleId, vyskyt:vyskytId, umelec:null, list:null};
  try{
    let h = budovaId ? ("#/budova/"+budovaId) : "#/";
    if(budovaId && prieceleId) h += "/prieceli/"+prieceleId;
    if(budovaId && prieceleId && vyskytId) h += "/vyskyt/"+vyskytId;
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
function goUmelec(umelecId){
  S.route = {budova:null, priecelie:null, vyskyt:null, umelec:umelecId||null, list:null};
  try{ location.hash = umelecId ? ("#/umelec/"+umelecId) : "#/"; }catch(_){}
  if(map && map.isStyleLoaded()) refreshMapSelection();
  render();
  panel.scrollTop = 0;
}
function goList(name){
  S.route = {budova:null, priecelie:null, vyskyt:null, umelec:null, list:name||null};
  try{ location.hash = name ? ("#/"+name) : "#/"; }catch(_){}
  if(map && map.isStyleLoaded()) refreshMapSelection();
  render();
  panel.scrollTop = 0;
}
function activeTab(){
  if(S.route.list==="budovy" || S.route.budova) return "budovy";
  if(S.route.list==="umelci" || S.route.umelec) return "umelci";
  if(S.route.list==="motivy") return "motivy";
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
    btn.onclick = ()=> goList(btn.dataset.tab==="prehlad" ? null : btn.dataset.tab);
  });
}
window.addEventListener("hashchange", ()=>{
  const mu = location.hash.match(/^#\/umelec\/([^/]+)/);
  if(mu){
    if(S.route.umelec !== mu[1]){
      S.route = {budova:null, priecelie:null, vyskyt:null, umelec:mu[1], list:null};
      if(map && map.isStyleLoaded()) refreshMapSelection(); render();
    }
    return;
  }
  const ml = location.hash.match(/^#\/(budovy|umelci|motivy)$/);
  if(ml){
    if(S.route.list !== ml[1] || S.route.budova || S.route.umelec){
      S.route = {budova:null, priecelie:null, vyskyt:null, umelec:null, list:ml[1]};
      if(map && map.isStyleLoaded()) refreshMapSelection(); render();
    }
    return;
  }
  const m = location.hash.match(/^#\/budova\/([^/]+)(?:\/prieceli\/([^/]+)(?:\/vyskyt\/([^/]+))?)?/);
  const want = m ? {budova:m[1], priecelie:m[2]||null, vyskyt:m[3]||null, umelec:null, list:null} : {budova:null, priecelie:null, vyskyt:null, umelec:null, list:null};
  if(want.budova!==S.route.budova || want.priecelie!==S.route.priecelie || want.vyskyt!==S.route.vyskyt || S.route.umelec || S.route.list){
    if(want.budova !== S.route.budova) S.budovaTab = "zakladne";
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
function render(){
  let handled = false;
  if(S.route.umelec){
    const u = DATA.umelci.find(x=>x.id===S.route.umelec);
    if(u){ renderUmelec(u); handled = true; }
  }
  if(!handled){
    const b = DATA.budovy.find(x=>x.id===S.route.budova);
    if(b){
      const f = b.priecelia.find(x=>x.id===S.route.priecelie);
      if(!f){ renderBudova(b); }
      else {
        const v = f.vyskyty.find(x=>x.id===S.route.vyskyt);
        if(v) renderVyskyt(b,f,v); else renderPriecelie(b,f);
      }
      handled = true;
    }
  }
  if(!handled){
    if(S.route.list==="budovy") renderBudovyList();
    else if(S.route.list==="umelci") renderUmelciList();
    else if(S.route.list==="motivy") renderMotivyList();
    else renderPrehlad();
  }
  updateTabs();
}
function budovaLabel(b){
  return b.nazov || b.adresa || b.kod || b.id;
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
function motivyByUmelec(umelecId){
  return DATA.motivy.filter(m=>m.umelecId===umelecId);
}
function budovyByUmelec(umelecId){
  return DATA.budovy.filter(b=>b.umelecId===umelecId);
}
function crumb(parts){
  return `<nav class="crumb">${parts.map((p,i)=>
    (i?'<span>›</span>':'') + (p.go!==undefined
      ? `<a tabindex="0" data-go='${p.go}'>${esc(p.t)}</a>`
      : `<span>${esc(p.t)}</span>`)).join("")}</nav>`;
}
function motivCountsAll(){
  const counts = {};
  DATA.budovy.forEach(b=> b.priecelia.forEach(f=> f.vyskyty.forEach(v=>{
    const k = v.motivId || "";
    counts[k] = (counts[k]||0)+1;
  })));
  return counts;
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
        const label = budovaLabel(b);
        const kodInFdir = label !== (b.kod||b.id);
        const s = budovaStats(b);
        return `<li><button class="fitem" data-b="${b.id}">
        <span class="fname">${esc(label)}</span>
        <span class="fdir">${kodInFdir?esc(b.kod)+" · ":""}${s.priecelia} priečelí · ${s.motivov} motívov · ${s.diel} diel</span>
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
  const motivyZoradene = [...DATA.motivy].sort((a,b)=> (counts[b.id]||0)-(counts[a.id]||0));
  const bezMotivu = counts[""] || 0;

  panel.innerHTML = crumb([{t:"motívy"}]) + `<div class="pad">
    <p class="eyebrow">Katalóg</p>
    <h2 class="title">Motívy sgrafít <span class="kod">${totalVyskytov} výskytov</span></h2>
    ${motivyZoradene.length ? `<ul class="list">${motivyZoradene.map(m=>`
      <li style="display:block">
        <div class="row" style="margin:0;align-items:center">
          <input type="color" class="in" style="flex:0 0 40px;padding:2px" data-mid="${esc(m.id)}" data-mfield="farba" value="${esc(m.farba)}">
          <input class="in" style="flex:1;min-width:100px" data-mid="${esc(m.id)}" data-mfield="nazov" value="${esc(m.nazov)}" placeholder="názov motívu">
          <select class="in" style="flex:0 0 140px" data-mid="${esc(m.id)}" data-mfield="umelecId">
            <option value=""${!m.umelecId?" selected":""}>— bez umelca —</option>
            ${DATA.umelci.map(u=>`<option value="${esc(u.id)}"${m.umelecId===u.id?" selected":""}>${esc(u.meno)}</option>`).join("")}
          </select>
          <span class="fdir" style="flex:0 0 auto">${counts[m.id]||0}×</span>
          <button class="btn ghost" data-mdel="${esc(m.id)}" title="Zmazať motív">×</button>
        </div>
      </li>`).join("")}</ul>` : `<div class="empty">Zatiaľ žiadne motívy v katalógu. Pridaj prvý nižšie.</div>`}
    ${bezMotivu ? `<p class="hint">${bezMotivu}× výskyt zatiaľ bez priradeného motívu.</p>` : ""}
    <div class="row">
      <input class="in" id="sp-new-motiv-name" style="flex:1;min-width:140px" placeholder="nový motív…">
      <input type="color" class="in" id="sp-new-motiv-color" style="flex:0 0 40px;padding:2px" value="#8d939a">
      <button class="btn ghost" id="sp-new-motiv-add">+ Pridať motív</button>
    </div>
  </div>`;
  wire();
  wireMotivyList();
}
function wireMotivyList(){
  panel.querySelectorAll("[data-mid]").forEach(el=>{
    el.oninput = ()=>{
      const m = DATA.motivy.find(x=>x.id===el.dataset.mid);
      if(!m) return;
      m[el.dataset.mfield] = el.value;
      saveMotivDebounced(m.id, m);
    };
  });
  panel.querySelectorAll("[data-mdel]").forEach(el=>{
    el.onclick = ()=>{
      const id = el.dataset.mdel;
      DATA.motivy = DATA.motivy.filter(x=>x.id!==id);
      DATA.budovy.forEach(b=> b.priecelia.forEach(f=> f.vyskyty.forEach(v=>{ if(v.motivId===id) v.motivId=""; })));
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
function miniPlan(b, activeId){
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
    <div class="legend">Klikni na stranu domu<br>a označíš ju ako<br>priečelie.<br><br>${b.priecelia.length} určených priečelí<br>skutočný kompas</div>
  </div>`;
}
function renderBudova(b){
  const totalVyskytov = b.priecelia.reduce((s,f)=>s+f.vyskyty.length,0);
  const tab = S.budovaTab || "zakladne";
  const tabBtn = (key,label)=>`<button class="tool" data-btab="${key}" aria-pressed="${tab===key}">${esc(label)}</button>`;

  const zakladneTab = `
    <p class="eyebrow">Budova <input class="kod-edit" data-path="kod" value="${esc(b.kod||b.id)}" placeholder="kód"></p>
    <table class="meta">
      ${fieldRow("Pôvodné označenie", b.oznacenie, "oznacenie")}
      ${fieldRow("Adresa", b.adresa, "adresa")}
      ${fieldRow("Rok výstavby", b.rok, "rok")}
      ${fieldRow("Typ objektu", b.typ, "typ")}
      ${selectRow("Zateplenie", b.zateplenie, "zateplenie", ZATEPLENIE_MOZNOSTI)}
      ${umelecSelectRow("Umelec (sgrafitá/reliéfy)", b.umelecId, "umelecId")}
    </table>
    ${b.umelecId ? `<p class="hint">Profil umelca: <a data-u="${esc(b.umelecId)}" tabindex="0" style="cursor:pointer;color:var(--survey);border-bottom:1px solid var(--survey)">${esc((DATA.umelci.find(u=>u.id===b.umelecId)||{}).meno||"")}</a></p>` : ""}
    <h3 class="sec">Popis</h3>
    <textarea class="in" data-path="popis" placeholder="Popis domu, história, kontext…">${esc(b.popis)}</textarea>`;

  const prieceliaTab = `
    <h3 class="sec">Priečelia <span class="kod">${totalVyskytov} výskytov</span></h3>
    ${miniPlan(b, null)}
    ${b.priecelia.length ? `<ul class="list">${b.priecelia.map(f=>`
      <li><button class="fitem" data-b="${b.id}" data-f="${f.id}">
        <span class="fname">${esc(f.nazov || (SMER_NAZOV[f.smer]+" priečelie"))}</span>
        <span class="fdir">${esc(f.smer)} · ${f.dlzka} m${f.vyzdoba?" · "+esc(f.vyzdoba):""} · ${f.vyskyty.length} výskytov</span>
      </button></li>`).join("")}</ul>`
      : `<div class="empty">Zatiaľ žiadne priečelie nie je určené. Klikni na stranu domu v mape alebo v pôdoryse vyššie.</div>`}`;

  const podkladyTab = `
    <h3 class="sec">Podklady</h3>
    ${podkladyBlok(b.podklady, "b")}
    <div class="row" style="margin-top:8px">
      <button class="btn ghost" id="add-podklad">+ Podklad (odkaz)</button>
      <button class="btn ghost" id="upload-podklad-b">+ Nahrať súbor</button>
      <input type="file" id="upload-podklad-b-input" hidden>
    </div>`;

  panel.innerHTML = crumb([{t:"budovy", go:"list:budovy"},{t:b.kod||b.id}]) + `<div class="pad">
    <div class="row" style="margin-top:0">
      ${tabBtn("zakladne","Základné údaje")}
      ${tabBtn("priecelia","Priečelia")}
      ${tabBtn("podklady","Podklady")}
    </div>
    ${tab==="priecelia" ? prieceliaTab : tab==="podklady" ? podkladyTab : zakladneTab}
    <div class="row" style="margin-top:26px">
      <button class="btn warn" id="del-b">Zmazať dom</button>
    </div>
    <p class="hint">Zmeny sa priebežne ukladajú do databázy — vidí ich celý tím.</p>
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
function renderPriecelie(b, f){
  const adding = S.addingVyskyt && S.addingVyskyt.prieceleId===f.id;
  const motivCounts = {};
  f.vyskyty.forEach(v=>{ const k=v.motivId||""; motivCounts[k]=(motivCounts[k]||0)+1; });
  const motivKeys = Object.keys(motivCounts);
  const summary = motivKeys.length
    ? `<ul class="list">${motivKeys.map(mid=>{
        const m = DATA.motivy.find(x=>x.id===mid);
        return `<li><span><span class="mchip" style="--mc:${esc(m?m.farba:'#8d939a')}"></span>${esc(m?m.nazov:'bez motívu')}</span><span class="fdir">${motivCounts[mid]}×</span></li>`;
      }).join("")}</ul>`
    : `<div class="empty">Na tomto priečelí zatiaľ nie je označený žiadny výskyt.</div>`;

  panel.innerHTML = crumb([{t:"budovy", go:"list:budovy"},{t:b.kod||b.id, go:b.id},{t:f.smer}]) + `<div class="pad">
    <p class="eyebrow">Priečelie <span class="kod">${esc(b.kod||b.id)} / ${esc(f.id)}</span></p>
    <input class="in" data-fpath="nazov" value="${esc(f.nazov)}" placeholder="${SMER_NAZOV[f.smer]} priečelie" style="font-family:var(--sans);font-size:24px;text-transform:uppercase">
    <p class="muted" style="font-family:var(--mono);font-size:12px">${esc(b.nazov||b.adresa||b.kod)} · ${esc(f.smer)} · dĺžka ~${f.dlzka} m</p>
    ${miniPlan(b, f.id)}

    <h3 class="sec">Fotografia a výskyty sgrafít <span class="kod">${f.vyskyty.length}</span></h3>
    ${photoBlock(f, null, !!adding)}
    <div class="row">
      <input type="file" id="sp-upload-foto" accept="image/*" hidden>
      <button class="btn ghost" id="sp-btn-upload-foto">${f.fotoUrl?"Nahrať inú fotku":"Nahrať fotku priečelia"}</button>
      ${f.fotoUrl ? `<button class="tool" id="sp-btn-adding" aria-pressed="${!!adding}">${adding?"Ukončiť označovanie":"+ Označiť výskyt"}</button>` : ""}
    </div>
    ${f.fotoUrl && adding ? `
    <div class="row" style="align-items:center">
      <select class="in" id="sp-adding-motiv" style="flex:1;min-width:160px">
        <option value=""${!S.addingVyskyt.motivId?" selected":""}>— bez motívu —</option>
        ${DATA.motivy.map(m=>`<option value="${esc(m.id)}"${S.addingVyskyt.motivId===m.id?" selected":""}>${esc(m.nazov)}</option>`).join("")}
      </select>
    </div>
    <p class="hint">Klikaj priamo na fotku — každý klik pridá výskyt zvoleného motívu. Nový motív pridáš v prehľade sídliska.</p>
    ` : ""}

    <h3 class="sec">Motívy na tomto priečelí</h3>
    ${summary}

    <h3 class="sec">Údaje o priečelí</h3>
    <table class="meta">
      <tr><th>Orientácia</th><td>${esc(SMER_NAZOV[f.smer])} (${f.smer})</td></tr>
      ${fieldRow2("Výtvarné dielo", f.vyzdoba, "vyzdoba")}
      ${fieldRow2("Autor diela", f.autor, "autor")}
      ${fieldRow2("Rok vzniku", f.rok, "rok")}
      ${fieldRow2("Stav a ohrozenie", f.stav, "stav")}
    </table>
    <h3 class="sec">Popis</h3>
    <textarea class="in" data-fpath="popis" placeholder="Popis priečelia, sgrafito, materiál, zásahy…">${esc(f.popis)}</textarea>
    <h3 class="sec">Podklady k priečeliu</h3>
    ${podkladyBlok(f.podklady, "f")}
    <div class="row" style="margin-top:8px">
      <button class="btn ghost" id="add-podklad-f">+ Podklad (odkaz)</button>
      <button class="btn ghost" id="upload-podklad-f">+ Nahrať súbor</button>
      <input type="file" id="upload-podklad-f-input" hidden>
    </div>
    <h3 class="sec">Ostatné priečelia</h3>
    ${b.priecelia.length>1 ? `<ul class="list">${b.priecelia.filter(x=>x.id!==f.id).map(x=>`
      <li><button class="fitem" data-b="${b.id}" data-f="${x.id}">
        <span class="fname">${esc(x.nazov || (SMER_NAZOV[x.smer]+" priečelie"))}</span>
        <span class="fdir">${esc(x.smer)} · ${x.vyskyty.length} výskytov</span>
      </button></li>`).join("")}</ul>`
      : `<div class="empty">Toto je zatiaľ jediné určené priečelie tohto domu.</div>`}
    <div class="row" style="margin-top:26px"><button class="btn warn" id="del-f">Zrušiť toto priečelie</button></div>
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
      S.addingVyskyt = { prieceleId: f.id, motivId: "" };
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
        motivId: S.addingVyskyt.motivId || "",
        x, y, velkost:"", vrstvy:"", stav:"", popis:"", podklady:[]
      };
      f.vyskyty.push(nv);
      saveVyskyt(nv, f.id);
      render();
    };
    wrap.querySelectorAll(".vmark").forEach(dot=>{
      dot.onclick = (e)=>{ e.stopPropagation(); go(b.id, f.id, dot.dataset.v); };
    });
  }
}
function renderVyskyt(b, f, v){
  const idx = f.vyskyty.indexOf(v);
  const m = DATA.motivy.find(x=>x.id===v.motivId);
  panel.innerHTML = crumb([{t:"budovy", go:"list:budovy"},{t:b.kod||b.id, go:b.id},{t:f.smer, go:b.id+"|"+f.id},{t:"výskyt #"+(idx+1)}]) + `<div class="pad">
    <p class="eyebrow">Výskyt sgrafita <span class="kod">${esc(b.kod||b.id)} / ${esc(f.smer)} / #${idx+1}</span></p>
    <h2 class="title" style="font-size:22px">${esc(m?m.nazov:"bez motívu")}</h2>

    ${photoBlock(f, v.id, false)}

    <h3 class="sec">Motív</h3>
    <select class="in" id="sp-vyskyt-motiv">
      <option value=""${!v.motivId?" selected":""}>— bez motívu —</option>
      ${DATA.motivy.map(mo=>`<option value="${esc(mo.id)}"${v.motivId===mo.id?" selected":""}>${esc(mo.nazov)}</option>`).join("")}
    </select>
    <p class="hint">Nový motív do katalógu pridáš v <a data-go="list:motivy" tabindex="0">zozname motívov</a>.</p>

    <h3 class="sec">Údaje o výskyte</h3>
    <table class="meta">
      ${fieldRow3("Veľkosť", v.velkost, "velkost")}
      ${fieldRow3("Počet vrstiev sgrafita", v.vrstvy, "vrstvy")}
      ${fieldRow3("Stav", v.stav, "stav")}
    </table>
    <h3 class="sec">Popis</h3>
    <textarea class="in" data-vpath="popis" placeholder="Popis motívu, technika, farebnosť, poškodenie…">${esc(v.popis)}</textarea>

    <h3 class="sec">Podklady k výskytu</h3>
    <p class="hint" style="margin-top:0">Napr. originálna fotografia, fotka zo súčasnej realizácie, detail poškodenia…</p>
    ${podkladyBlok(v.podklady, "v")}
    <div class="row" style="margin-top:8px">
      <button class="btn ghost" id="add-podklad-v">+ Podklad (odkaz)</button>
      <button class="btn ghost" id="upload-podklad-v">+ Nahrať súbor</button>
      <input type="file" id="upload-podklad-v-input" hidden>
    </div>

    <div class="row" style="margin-top:26px"><button class="btn warn" id="del-v">Zrušiť tento výskyt</button></div>
  </div>`;
  wire(b,f,v);
  wireVyskyt(b,f,v);
}
function wireVyskyt(b, f, v){
  const sel = panel.querySelector("#sp-vyskyt-motiv");
  if(sel) sel.onchange = ()=>{
    v.motivId = sel.value;
    saveVyskyt(v, f.id);
  };
  const wrap = panel.querySelector("#sp-photo");
  if(wrap){
    wrap.querySelectorAll(".vmark").forEach(dot=>{
      dot.onclick = (e)=>{ e.stopPropagation(); go(b.id, f.id, dot.dataset.v); };
    });
  }
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
      : `<div class="empty">Tomuto umelcovi zatiaľ nie je priradený žiadny motív. Priraď ho v prehľade sídliska.</div>`}

    <h3 class="sec">Domy s jeho sgrafitami/reliéfmi <span class="kod">${budovyU.length}</span></h3>
    ${budovyU.length ? `<ul class="list">${budovyU.map(b=>{
        const label = budovaLabel(b);
        const kodInFdir = label !== (b.kod||b.id);
        return `<li><button class="fitem" data-b="${esc(b.id)}">
        <span class="fname">${esc(label)}</span>
        <span class="fdir">${kodInFdir?esc(b.kod):`${b.priecelia.length} priečelí`}</span>
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
function fieldRow2(label,val,path){
  return `<tr><th>${esc(label)}</th><td><input class="in" data-fpath="${path}" value="${esc(val)}"></td></tr>`;
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
  panel.querySelectorAll("[data-btab]").forEach(el=>{
    el.onclick = ()=>{ S.budovaTab = el.dataset.btab; render(); };
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

  const db = panel.querySelector("#del-b");
  if(db) db.onclick = ()=>{
    DATA.budovy.splice(DATA.budovy.indexOf(b),1);
    deleteBudovaRemote(b.id);
    map.getSource("buildings").setData(buildingsFC());
    map.getSource("labels").setData(labelsFC());
    go(null,null,null);
  };
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
