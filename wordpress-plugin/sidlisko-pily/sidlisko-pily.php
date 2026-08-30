<?php
/**
 * Plugin Name: Sídlisko Píly – pasport budov
 * Description: Vloží interaktívny pasport budov a priečelí (georeferencovaná mapa cez Mapbox, dáta v Supabase) cez shortcode [sidlisko_pily].
 * Version: 1.0.0
 * Author: Ars Preuge
 */

if (!defined('ABSPATH')) exit;

define('SIDLISKO_PILY_VERSION', '1.0.0');

function sidlisko_pily_enqueue_assets() {
    global $post;
    if (!is_a($post, 'WP_Post') || !has_shortcode($post->post_content, 'sidlisko_pily')) return;

    wp_enqueue_style('sidlisko-pily-fonts', 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&display=swap', [], null);
    wp_enqueue_style('sidlisko-pily-mapbox-css', 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css', [], '3.1.2');
    wp_enqueue_script('sidlisko-pily-mapbox-js', 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js', [], '3.1.2', true);
    wp_enqueue_script('sidlisko-pily-supabase-js', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', [], null, true);

    wp_register_style('sidlisko-pily-style', false, [], SIDLISKO_PILY_VERSION);
    wp_enqueue_style('sidlisko-pily-style');
    wp_add_inline_style('sidlisko-pily-style', sidlisko_pily_css());

    wp_register_script('sidlisko-pily-app-js', false, ['sidlisko-pily-mapbox-js', 'sidlisko-pily-supabase-js'], SIDLISKO_PILY_VERSION, true);
    wp_enqueue_script('sidlisko-pily-app-js');
    wp_add_inline_script('sidlisko-pily-app-js', sidlisko_pily_js());
}
add_action('wp_enqueue_scripts', 'sidlisko_pily_enqueue_assets');

function sidlisko_pily_shortcode() {
    ob_start();
    ?>
    <div class="sidlisko-pily-app">
      <header>
        <h1>Sídlisko Píly</h1>
        <span class="sub">pasport budov a priečelí · georeferencovaná mapa (Mapbox)</span>
        <span class="spacer"></span>
      </header>
      <main>
        <div id="sp-viewport">
          <div id="sp-map"></div>
          <div class="geobadge">WGS84 · mapbox://styles/tomin9/cle5ygem4004h01qge9x73z3q</div>
          <div class="mapnote" id="sp-mapnote"></div>
        </div>
        <aside id="sp-panel"></aside>
      </main>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('sidlisko_pily', 'sidlisko_pily_shortcode');

function sidlisko_pily_css() {
    return <<<'CSS'
.sidlisko-pily-app{
  --ink:#14161a;
  --ink-2:#5a6068;
  --ink-3:#8d939a;
  --paper:#f4f3f0;
  --line:#d5d3cd;
  --white:#ffffff;
  --marker:#f2c230;
  --survey:#d0342c;
  --sans:"Barlow Condensed", "Arial Narrow", system-ui, sans-serif;
  --serif:"Newsreader", Georgia, serif;
  --mono:"IBM Plex Mono", ui-monospace, monospace;
  display:flex;flex-direction:column;height:100vh;height:100dvh;
  margin:0;background:var(--paper);color:var(--ink);
  font-family:var(--serif);font-size:15px;line-height:1.55;
  -webkit-font-smoothing:antialiased;overscroll-behavior:none;
}
.sidlisko-pily-app, .sidlisko-pily-app *{box-sizing:border-box}
.sidlisko-pily-app button{font:inherit;color:inherit}
.sidlisko-pily-app :focus-visible{outline:2px solid var(--survey);outline-offset:2px}

.sidlisko-pily-app header{
  display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;
  padding:10px 16px;border-bottom:1px solid var(--line);background:var(--paper);
}
.sidlisko-pily-app header h1{
  font-family:var(--sans);font-weight:700;font-size:19px;letter-spacing:.14em;
  text-transform:uppercase;margin:0;
}
.sidlisko-pily-app header .sub{font-family:var(--mono);font-size:11px;color:var(--ink-2);letter-spacing:.04em}
.sidlisko-pily-app header .spacer{flex:1}
.sidlisko-pily-app .tool{
  font-family:var(--sans);text-transform:uppercase;letter-spacing:.1em;font-size:12px;font-weight:600;
  background:none;border:1px solid var(--line);padding:5px 10px;cursor:pointer;border-radius:0;
}
.sidlisko-pily-app .tool:hover{border-color:var(--ink);}
.sidlisko-pily-app .tool[aria-pressed="true"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}

.sidlisko-pily-app main{flex:1;display:grid;grid-template-columns:1fr 400px;min-height:0}
@media (max-width:900px){
  .sidlisko-pily-app main{grid-template-columns:1fr;grid-template-rows:52vh 1fr}
}

.sidlisko-pily-app #sp-viewport{position:relative;overflow:hidden;background:#ddd;border-right:1px solid var(--line)}
.sidlisko-pily-app #sp-map{position:absolute;inset:0}
.sidlisko-pily-app .mapboxgl-canvas{outline:none}
.sidlisko-pily-app .mapboxgl-ctrl-logo{opacity:.55}

.sidlisko-pily-app .mapnote{
  position:absolute;left:14px;bottom:14px;font-family:var(--mono);font-size:11px;
  color:var(--ink-2);background:rgba(255,255,255,.88);padding:6px 9px;border:1px solid var(--line);
  max-width:min(60ch,70%);z-index:2;pointer-events:none;
}
.sidlisko-pily-app .geobadge{
  position:absolute;left:14px;top:14px;font-family:var(--mono);font-size:10px;letter-spacing:.06em;
  color:var(--ink-2);background:rgba(255,255,255,.88);padding:4px 8px;border:1px solid var(--line);z-index:2;
}

.sidlisko-pily-app #sp-panel{overflow-y:auto;background:var(--paper);padding:0 0 60px}
.sidlisko-pily-app .pad{padding:20px}
.sidlisko-pily-app .crumb{
  display:flex;gap:8px;align-items:center;flex-wrap:wrap;
  font-family:var(--mono);font-size:11px;color:var(--ink-2);
  border-bottom:1px solid var(--line);padding:10px 20px;position:sticky;top:0;background:var(--paper);z-index:3;
}
.sidlisko-pily-app .crumb a{color:var(--ink-2);text-decoration:none;border-bottom:1px solid var(--line);cursor:pointer}
.sidlisko-pily-app .crumb a:hover{color:var(--survey);border-color:var(--survey)}
.sidlisko-pily-app .eyebrow{font-family:var(--sans);text-transform:uppercase;letter-spacing:.16em;font-size:11px;
  font-weight:600;color:var(--ink-2);margin:0 0 6px}
.sidlisko-pily-app h2.title{font-family:var(--sans);font-weight:700;font-size:30px;line-height:1.05;
  letter-spacing:.02em;text-transform:uppercase;margin:0 0 4px}
.sidlisko-pily-app h3.sec{font-family:var(--sans);text-transform:uppercase;letter-spacing:.14em;font-size:12px;
  font-weight:600;margin:26px 0 8px;padding-bottom:5px;border-bottom:1px solid var(--line)}
.sidlisko-pily-app .kod{font-family:var(--mono);font-size:12px;color:var(--survey)}
.sidlisko-pily-app .lead{font-family:var(--serif);font-size:16px;color:var(--ink);margin:10px 0 0}
.sidlisko-pily-app .muted{color:var(--ink-2)}

.sidlisko-pily-app table.meta{width:100%;border-collapse:collapse;font-size:14px}
.sidlisko-pily-app table.meta th{
  text-align:left;font-family:var(--sans);text-transform:uppercase;letter-spacing:.08em;
  font-size:11px;font-weight:600;color:var(--ink-2);width:38%;padding:6px 8px 6px 0;
  vertical-align:top;border-bottom:1px solid var(--line);
}
.sidlisko-pily-app table.meta td{padding:6px 0;border-bottom:1px solid var(--line);vertical-align:top}

.sidlisko-pily-app .plan{display:flex;gap:16px;align-items:flex-start;margin-top:6px}
.sidlisko-pily-app .plan svg{background:var(--white);border:1px solid var(--line);flex:0 0 auto}
.sidlisko-pily-app .plan .legend{font-family:var(--mono);font-size:11px;color:var(--ink-2);line-height:1.7}
.sidlisko-pily-app .fedge{stroke:#c9c6bf;stroke-width:1.4;cursor:pointer;fill:none;stroke-linecap:round;stroke-dasharray:1 2.2}
.sidlisko-pily-app .fedge:hover{stroke:var(--survey);stroke-width:4;stroke-dasharray:none}
.sidlisko-pily-app .fedge.is-facade{stroke:var(--ink);stroke-width:3;stroke-dasharray:none}
.sidlisko-pily-app .fedge.is-active{stroke:var(--survey);stroke-width:5;stroke-dasharray:none}
.sidlisko-pily-app .fhit-mini{stroke:transparent;stroke-width:16;fill:none;cursor:pointer}
.sidlisko-pily-app .plan .fill{fill:var(--ink);fill-opacity:.32;stroke:none}

.sidlisko-pily-app ul.list{list-style:none;margin:0;padding:0}
.sidlisko-pily-app ul.list li{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--line)}
.sidlisko-pily-app ul.list li .tag{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.06em;
  color:var(--ink-2);border:1px solid var(--line);padding:1px 5px;flex:0 0 auto}
.sidlisko-pily-app ul.list li a{color:var(--ink);text-underline-offset:3px}
.sidlisko-pily-app .fitem{display:flex;justify-content:space-between;gap:10px;width:100%;background:none;border:0;
  padding:9px 0;cursor:pointer;text-align:left;border-bottom:1px solid var(--line);align-items:baseline}
.sidlisko-pily-app .fitem:hover .fname{color:var(--survey)}
.sidlisko-pily-app .fname{font-family:var(--sans);text-transform:uppercase;letter-spacing:.08em;font-weight:600;font-size:14px}
.sidlisko-pily-app .fdir{font-family:var(--mono);font-size:11px;color:var(--ink-2)}

.sidlisko-pily-app .empty{border:1px dashed var(--line);padding:18px;text-align:center;color:var(--ink-2);font-size:14px}
.sidlisko-pily-app .in{font-family:var(--serif);font-size:14px;background:var(--white);border:1px solid var(--line);
  padding:5px 7px;width:100%}
.sidlisko-pily-app textarea.in{min-height:80px;resize:vertical;line-height:1.5}
.sidlisko-pily-app .row{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}
.sidlisko-pily-app .btn{font-family:var(--sans);text-transform:uppercase;letter-spacing:.1em;font-size:12px;font-weight:600;
  background:var(--ink);color:var(--paper);border:1px solid var(--ink);padding:7px 12px;cursor:pointer}
.sidlisko-pily-app .btn.ghost{background:none;color:var(--ink)}
.sidlisko-pily-app .btn.warn{background:none;color:var(--survey);border-color:var(--survey)}
.sidlisko-pily-app .btn:hover{opacity:.85}
.sidlisko-pily-app .hint{font-family:var(--mono);font-size:11px;color:var(--ink-2);margin-top:8px}
CSS;
}

function sidlisko_pily_js() {
    return <<<'JS'
(function(){
mapboxgl.accessToken = "pk.eyJ1IjoidG9taW45IiwiYSI6ImNqdWwxZ2M2NjIyN2w0OXBweWhibDN3ZHEifQ.ApzboEsfLMVTQ2px9iOgVw";

const SUPABASE_URL = "https://admpgeethrgplvtjsfmc.supabase.co";
const SUPABASE_KEY = "sb_publishable_XZ8zk7nHCCwavnBPFlwCWg_y44o5TTh";
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const DATA = { budovy: [] };

async function loadFromSupabase(){
  const [{data: budovyRows, error: e1}, {data: prieceliaRows, error: e2}] = await Promise.all([
    sb.from("budovy").select("*"),
    sb.from("priecelia").select("*")
  ]);
  if(e1 || e2){
    alert("Nepodarilo sa načítať dáta z databázy: " + ((e1&&e1.message)||(e2&&e2.message)));
    return;
  }
  DATA.budovy = (budovyRows||[]).map(row=>({
    id: row.id, kod: row.kod, nazov: row.nazov||"", adresa: row.adresa||"",
    rok: row.rok||"", oznacenie: row.oznacenie||"", typ: row.typ||"bytový dom",
    zateplenie: row.zateplenie||"", stav: row.stav||"",
    popis: row.popis||"", poly: row.poly, podklady: row.podklady||[],
    priecelia: (prieceliaRows||[]).filter(f=>f.budova_id===row.id).map(f=>({
      id: f.id, edgeIndex: f.edge_index, smer: f.smer, dlzka: f.dlzka,
      nazov: f.nazov||"", popis: f.popis||"", vyzdoba: f.vyzdoba||"",
      autor: f.autor||"", rok: f.rok||"", stav: f.stav||"", podklady: f.podklady||[]
    }))
  }));
}

function budovaRow(b){
  return { id:b.id, kod:b.kod, nazov:b.nazov, adresa:b.adresa, rok:b.rok,
    oznacenie:b.oznacenie, typ:b.typ, zateplenie:b.zateplenie,
    stav:b.stav, popis:b.popis, poly:b.poly, podklady:b.podklady,
    updated_at:new Date().toISOString() };
}
function prieceliaRow(f, budovaId){
  return { id:f.id, budova_id:budovaId, edge_index:f.edgeIndex, smer:f.smer, dlzka:f.dlzka,
    nazov:f.nazov, popis:f.popis, vyzdoba:f.vyzdoba, autor:f.autor, rok:f.rok, stav:f.stav,
    podklady:f.podklady, updated_at:new Date().toISOString() };
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
const saveBudovaDebounced = makeKeyedDebounce(saveBudova, 700);
const savePrieceliaDebounced = makeKeyedDebounce(savePriecelie, 700);
async function deleteBudovaRemote(id){
  const {error} = await sb.from("budovy").delete().eq("id", id);
  if(error) console.error("Zmazanie domu zlyhalo:", error.message);
}
async function deletePrieceliaRemote(id){
  const {error} = await sb.from("priecelia").delete().eq("id", id);
  if(error) console.error("Zmazanie priečelia zlyhalo:", error.message);
}

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
        podklady: s.podklady || []
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
    nazov:"", popis:"", vyzdoba:"", autor:"", rok:"", stav:"", podklady:[]
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

const S = { route:{budova:null, priecelie:null} };
const panel = document.getElementById("sp-panel");

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
  map.addLayer({id:"buildings-active-line", type:"line", source:"buildings",
    filter:["==",["get","id"], "__none__"],
    paint:{"line-color":"#d0342c", "line-width":3}});
  map.addLayer({id:"buildings-active-fill", type:"fill", source:"buildings",
    filter:["==",["get","id"], "__none__"],
    paint:{"fill-color":"#14161a", "fill-opacity":0.75}});

  map.addLayer({id:"facades-hit", type:"line", source:"facades",
    paint:{"line-width":18, "line-opacity":0}});
  map.addLayer({id:"facades-line", type:"line", source:"facades",
    paint:{"line-color":["case",["get","active"],"#d0342c",["get","isFacade"],"#14161a","#b9b6ae"],
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
  const m = location.hash.match(/^#\/budova\/([^/]+)(?:\/prieceli\/([^/]+))?/);
  if(m) go(m[1], m[2]||null, {noFit:true});
  });
}
boot();

function refreshMapSelection(){
  map.setFilter("buildings-active-line", ["==",["get","id"], S.route.budova||"__none__"]);
  map.setFilter("buildings-active-fill", ["==",["get","id"], S.route.budova||"__none__"]);
  map.getSource("facades") && map.getSource("facades").setData(facadesFC());
}
function go(budovaId, prieceleId, opts={}){
  const zmenaBudovy = budovaId !== S.route.budova;
  S.route = {budova:budovaId, priecelie:prieceleId};
  try{
    location.hash = budovaId ? ("#/budova/"+budovaId + (prieceleId ? "/prieceli/"+prieceleId : "")) : "#/";
  }catch(_){}
  if(map.isStyleLoaded()) refreshMapSelection();
  render();
  if(budovaId && zmenaBudovy && !opts.noFit){
    const b = DATA.budovy.find(x=>x.id===budovaId);
    if(b) map.fitBounds(bboxLL(b.poly), {padding:140, maxZoom:19, duration:600});
  }
  panel.scrollTop = 0;
}
window.addEventListener("hashchange", ()=>{
  const m = location.hash.match(/^#\/budova\/([^/]+)(?:\/prieceli\/([^/]+))?/);
  const want = m ? {budova:m[1], priecelie:m[2]||null} : {budova:null, priecelie:null};
  if(want.budova!==S.route.budova || want.priecelie!==S.route.priecelie){
    S.route = want; if(map.isStyleLoaded()) refreshMapSelection(); render();
  }
});
document.addEventListener("keydown", e=>{
  const t = e.target;
  if(t && (t.tagName==="INPUT" || t.tagName==="TEXTAREA")) return;
  if(e.key==="Escape") go(null,null);
});

function render(){
  const b = DATA.budovy.find(x=>x.id===S.route.budova);
  if(!b) return renderPrehlad();
  const f = b.priecelia.find(x=>x.id===S.route.priecelie);
  return f ? renderPriecelie(b,f) : renderBudova(b);
}
function crumb(parts){
  return `<nav class="crumb">${parts.map((p,i)=>
    (i?'<span>›</span>':'') + (p.go!==undefined
      ? `<a tabindex="0" data-go='${p.go}'>${esc(p.t)}</a>`
      : `<span>${esc(p.t)}</span>`)).join("")}</nav>`;
}
function renderPrehlad(){
  const n = DATA.budovy.length;
  panel.innerHTML = crumb([{t:"prehľad"}]) + `<div class="pad">
    <p class="eyebrow">Podklad</p>
    <h2 class="title">Sídlisko Píly<br>na reálnej mape</h2>
    <p class="lead">Obrysy ${n} domov pochádzajú z tvojho Mapbox datasetu „budovy pily" — reálne súradnice, presná orientácia priečelí podľa skutočného kompasu. Klikni na dom v mape.</p>
    <h3 class="sec">Zaznamenané domy <span class="kod">${n}</span></h3>
    <ul class="list">${DATA.budovy.map(b=>`
      <li><button class="fitem" data-b="${b.id}">
        <span class="fname">${esc(b.nazov || b.adresa || "bez názvu")}</span>
        <span class="fdir">${esc(b.kod)} · ${b.priecelia.length} priečelí</span>
      </button></li>`).join("")}</ul>
  </div>`;
  wire();
}
function fieldRow(label, val, path){
  return `<tr><th>${esc(label)}</th><td><input class="in" data-path="${path}" value="${esc(val)}"></td></tr>`;
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
  panel.innerHTML = crumb([{t:"prehľad", go:""},{t:b.kod||b.id}]) + `<div class="pad">
    <p class="eyebrow">Budova <span class="kod">${esc(b.kod||b.id)}</span></p>
    <input class="in" data-path="nazov" value="${esc(b.nazov)}" placeholder="Názov domu" style="font-family:var(--sans);font-size:24px;text-transform:uppercase;letter-spacing:.02em">
    <h3 class="sec">Základné údaje</h3>
    <table class="meta">
      ${fieldRow("Pôvodné označenie", b.oznacenie, "oznacenie")}
      ${fieldRow("Adresa", b.adresa, "adresa")}
      ${fieldRow("Rok výstavby", b.rok, "rok")}
      ${fieldRow("Typ objektu", b.typ, "typ")}
      ${fieldRow("Zateplenie", b.zateplenie, "zateplenie")}
      ${fieldRow("Stav", b.stav, "stav")}
    </table>
    <h3 class="sec">Popis</h3>
    <textarea class="in" data-path="popis" placeholder="Popis domu, história, kontext…">${esc(b.popis)}</textarea>
    <h3 class="sec">Priečelia</h3>
    ${miniPlan(b, null)}
    ${b.priecelia.length ? `<ul class="list">${b.priecelia.map(f=>`
      <li><button class="fitem" data-b="${b.id}" data-f="${f.id}">
        <span class="fname">${esc(f.nazov || (SMER_NAZOV[f.smer]+" priečelie"))}</span>
        <span class="fdir">${esc(f.smer)} · ${f.dlzka} m${f.vyzdoba?" · "+esc(f.vyzdoba):""}</span>
      </button></li>`).join("")}</ul>`
      : `<div class="empty">Zatiaľ žiadne priečelie nie je určené. Klikni na stranu domu v mape alebo v pôdoryse vyššie.</div>`}
    <h3 class="sec">Podklady</h3>
    ${podkladyBlok(b.podklady, "b")}
    <div class="row" style="margin-top:26px">
      <button class="btn ghost" id="add-podklad">+ Podklad</button>
      <button class="btn warn" id="del-b">Zmazať dom</button>
    </div>
    <p class="hint">Zmeny sa priebežne ukladajú do databázy — vidí ich celý tím.</p>
  </div>`;
  wire(b);
}
function renderPriecelie(b, f){
  panel.innerHTML = crumb([{t:"prehľad", go:""},{t:b.kod||b.id, go:b.id},{t:f.smer}]) + `<div class="pad">
    <p class="eyebrow">Priečelie <span class="kod">${esc(b.kod||b.id)} / ${esc(f.id)}</span></p>
    <input class="in" data-fpath="nazov" value="${esc(f.nazov)}" placeholder="${SMER_NAZOV[f.smer]} priečelie" style="font-family:var(--sans);font-size:24px;text-transform:uppercase">
    <p class="muted" style="font-family:var(--mono);font-size:12px">${esc(b.nazov||b.adresa||b.kod)} · ${esc(f.smer)} · dĺžka ~${f.dlzka} m</p>
    ${miniPlan(b, f.id)}
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
    <div class="row" style="margin-top:26px"><button class="btn ghost" id="add-podklad-f">+ Podklad</button></div>
    <h3 class="sec">Ostatné priečelia</h3>
    ${b.priecelia.length>1 ? `<ul class="list">${b.priecelia.filter(x=>x.id!==f.id).map(x=>`
      <li><button class="fitem" data-b="${b.id}" data-f="${x.id}">
        <span class="fname">${esc(x.nazov || (SMER_NAZOV[x.smer]+" priečelie"))}</span>
        <span class="fdir">${esc(x.smer)}</span>
      </button></li>`).join("")}</ul>`
      : `<div class="empty">Toto je zatiaľ jediné určené priečelie tohto domu.</div>`}
    <div class="row" style="margin-top:26px"><button class="btn warn" id="del-f">Zrušiť toto priečelie</button></div>
  </div>`;
  wire(b,f);
}
function fieldRow2(label,val,path){
  return `<tr><th>${esc(label)}</th><td><input class="in" data-fpath="${path}" value="${esc(val)}"></td></tr>`;
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
function wire(b, f){
  panel.querySelectorAll("[data-go]").forEach(a=>{
    const t = a.dataset.go;
    a.onclick = ()=> go(t || null, null);
    a.onkeydown = e => { if(e.key==="Enter") a.click(); };
  });
  panel.querySelectorAll(".fitem").forEach(el=>{ el.onclick = ()=> go(el.dataset.b, el.dataset.f || null); });
  panel.querySelectorAll(".fhit-mini").forEach(el=>{ el.onclick = ()=> toggleEdge(b, +el.dataset.edge); });
  panel.querySelectorAll("[data-path]").forEach(el=>{
    el.oninput = ()=>{ b[el.dataset.path] = el.value; saveBudovaDebounced(b.id, b); };
  });
  panel.querySelectorAll("[data-fpath]").forEach(el=>{
    el.oninput = ()=>{ f[el.dataset.fpath] = el.value; savePrieceliaDebounced(f.id, f, b.id); };
  });
  panel.querySelectorAll("[data-pk]").forEach(el=>{
    el.oninput = ()=>{
      const [scope,i,key] = el.dataset.pk.split("|");
      (scope==="b"? b.podklady : f.podklady)[+i][key] = el.value;
      if(scope==="b") saveBudovaDebounced(b.id, b); else savePrieceliaDebounced(f.id, f, b.id);
    };
  });
  panel.querySelectorAll("[data-pk-del]").forEach(el=>{
    el.onclick = ()=>{
      const [scope,i] = el.dataset.pkDel.split("|");
      (scope==="b"? b.podklady : f.podklady).splice(+i,1);
      if(scope==="b") saveBudova(b); else savePriecelie(f, b.id);
      render();
    };
  });
  const ap = panel.querySelector("#add-podklad");
  if(ap) ap.onclick = ()=>{ b.podklady.push({typ:"foto",nazov:"",url:""}); saveBudova(b); render(); };
  const apf = panel.querySelector("#add-podklad-f");
  if(apf) apf.onclick = ()=>{ f.podklady.push({typ:"foto",nazov:"",url:""}); savePriecelie(f, b.id); render(); };
  const db = panel.querySelector("#del-b");
  if(db) db.onclick = ()=>{
    DATA.budovy.splice(DATA.budovy.indexOf(b),1);
    deleteBudovaRemote(b.id);
    map.getSource("buildings").setData(buildingsFC());
    map.getSource("labels").setData(labelsFC());
    go(null,null);
  };
  const df = panel.querySelector("#del-f");
  if(df) df.onclick = ()=>{
    b.priecelia = b.priecelia.filter(x=>x.id!==f.id);
    deletePrieceliaRemote(f.id);
    if(map.getSource("facades")) map.getSource("facades").setData(facadesFC());
    go(b.id, null);
  };
}

function note(){
  document.getElementById("sp-mapnote").innerHTML = "Ťahaním posúvaš, kolieskom približuješ · klikni na dom";
}
})();
JS;
}
