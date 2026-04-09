import { useState, useEffect, useMemo, useCallback } from "react";
import Papa from "papaparse";

const CSV_VIAJES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv";
const CSV_FLOTA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=923646374&single=true&output=csv";
const CSV_ULTIMOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=1827964132&single=true&output=csv";

const SIN_SOLICITUD = "-Viaje sin solicitud -";

// ─── Rendimiento combustible (km/litro) ───
const RENDIMIENTO = { VOLVO: 2.8, SCANIA: 3.3 };

const SUCURSAL_MAP = {
  "POZO ALMONTE":["POZO ALMONTE","IQUIQUE","ALTO HOSPICIO","COLLAHUASI","QUEBRADA BLANCA","PICA","ARICA","PUERTO PATACHE","PUERTO IQUIQUE","NUDO URIBE","TALABRE"],
  "MEJILLONES":["MEJILLONES"],
  "ANTOFAGASTA":["LA NEGRA","ANTOFAGASTA","CALAMA","MINERA ESCONDIDA","MINERA ESCONDIDA LAGUNA SECA","MINERA ESCONDIDA LOS COLORADOS","MINERA ESCONDIDA OGP1","MINERA ESCONDIDA PUERTO COLOSO","SPENCE","EL ABRA","CENTINELA","SIERRA GORDA","LOMAS BAYAS","MANTOS BLANCOS","MANTOS DE LA LUNA","RADOMIRO TOMIC","MINISTRO HALES","EL TESORO","MINERA ESPERANZA","MINERA ENCUENTRO","MINERA FRANKE","MINERA MICHILLA","MINA GABY","ANTUCOYA","MINERA ANTUCOYA","CERRO DOMINADOR","PUERTO ANGAMOS","AGUA DE MAR","LA PORTADA","MARIA ELENA","PEDRO DE VALDIVIA","EL TOCO","RIO LOA","TOCOPILLA","PAMPA BLANCA","SALAR DE ATACAMA","SALAR DEL CARMEN","ELENITA","NUEVA VICTORIA","AGUAS VERDES","DOMEYKO","EL PEÑON","ZALDIVAR","MINA OESTE","BARRIAL SECO","CERRO NEGRO","COYASUR","EL SALVADOR","EHM"],
  "COPIAPO":["COPIAPO","PAIPOTE","VALLENAR","CANDELARIA","MINA LA COIPA","MANTOS VERDES","MINERA ARQUEROS","OJOS DEL SALADO","PUNTA DE COBRE","PUCOBRE","FENIX GOLD","SALARES NORTE","MINERA GUANACO","GARITA CARRIZALILLO","PORTEZUELO","MINA TERRAEX PAIPOTE","MINERA PLEITO","ATACAMA KOZAN","MANTOVERDE","MAITENCILLO","MINERA EL CRISTO","LAS BARRANCAS","CASERONES"],
  "COQUIMBO":["COQUIMBO","PUNTA TEATINOS","SALADILLO","LOS COLORADOS","LA SERENA","OVALLE","ANDACOLLO","ROMERAL","MINERA LOS PELAMBRES","SALAMANCA"],
  "SANTIAGO":["SANTIAGO","QUILICURA","LAMPA","BUIN","RANCAGUA","SAN ANTONIO","SAN BERNARDO","PEÑAFLOR","PADRE HURTADO","PELDEHUE","ESTACION CENTRAL","AEROPUERTO SANTIAGO","AEROPUERTO ANTOFAGASTA","LOS ANDES","SAN FELIPE","VIÑA DEL MAR","VALPARAISO","CASABLANCA","LIMACHE","RENGO","REQUINOA","TALAGANTE","COLINA","PROVIDENCIA","FLORIDA","NOGALES","QUILLOTA","LOS BRONCES","ANDINA","EL TENIENTE","EL TENIENTE (RAJO SUR)","EL SOLDADO","MINERA VALLE CENTRAL","ALHUE","MINA EL ESPINO","SAN JAVIER","SANTA FE"]
};

const SUCURSAL_COLORS_DARK = {
  "POZO ALMONTE":{bg:"#1a2744",text:"#5b9cf5",accent:"#3b7de0"},
  "MEJILLONES":{bg:"#1a2a3a",text:"#4ecdc4",accent:"#36a89e"},
  "ANTOFAGASTA":{bg:"#2a1f0e",text:"#f5a623",accent:"#d4891a"},
  "COPIAPO":{bg:"#1a2a1a",text:"#6fcf6f",accent:"#4a9f4a"},
  "COQUIMBO":{bg:"#2a1a2a",text:"#cf6fcf",accent:"#9f4a9f"},
  "SANTIAGO":{bg:"#1f1a2a",text:"#8b9cf5",accent:"#6b7ce0"},
  "OTROS":{bg:"#1a1a1a",text:"#999",accent:"#666"}
};
const SUCURSAL_COLORS_LIGHT = {
  "POZO ALMONTE":{bg:"#dbeafe",text:"#1d4ed8",accent:"#3b82f6"},
  "MEJILLONES":{bg:"#ccfbf1",text:"#0f766e",accent:"#14b8a6"},
  "ANTOFAGASTA":{bg:"#fef3c7",text:"#b45309",accent:"#f59e0b"},
  "COPIAPO":{bg:"#dcfce7",text:"#15803d",accent:"#22c55e"},
  "COQUIMBO":{bg:"#fae8ff",text:"#7e22ce",accent:"#a855f7"},
  "SANTIAGO":{bg:"#ede9fe",text:"#5b21b6",accent:"#8b5cf6"},
  "OTROS":{bg:"#f1f5f9",text:"#64748b",accent:"#94a3b8"}
};

const _sucCache = new Map();
function getSucursal(loc) {
  if (!loc) return "OTROS";
  const l = loc.toUpperCase().trim();
  const hit = _sucCache.get(l);
  if (hit !== undefined) return hit;
  for (const [s, ls] of Object.entries(SUCURSAL_MAP)) {
    if (ls.includes(l)) { _sucCache.set(l, s); return s; }
  }
  _sucCache.set(l, "OTROS");
  return "OTROS";
}

const EQUIPO_KEYWORDS = ["RAMPLA","ESTANQUE","FURGON","EXTENSIBLE","CAMA BAJA","MODULAR","MEGALIFT","DOLLY","EQUIPOS ESPECIALES"];
function getCategoria(tipo){
  if(!tipo) return "OTRO";
  const t = tipo.toUpperCase().trim();
  if(t.includes("TRACTOCAMION")) return "TRACTOCAMION";
  if(EQUIPO_KEYWORDS.some(k => t.includes(k))) return "EQUIPO";
  return "OTRO";
}
function cleanPatente(p){if(!p)return "";const s=String(p).trim().toUpperCase();const i=s.lastIndexOf("-");return i>0?s.substring(0,i):s;}
function parseDate(str){if(!str)return null;if(str instanceof Date)return str;const parts=String(str).split("/");if(parts.length!==3)return null;const[d,m,y]=parts;if(!d||!m||!y)return null;return new Date(+y,+m-1,+d);}
function formatDate(d){if(!d)return "-";return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear();}
function daysBetween(d1,d2){return Math.floor((d2-d1)/86400000);}
function fNum(n){return Number(n||0).toLocaleString("es-CL");}
function fPesos(n){return "$"+Number(Math.round(n||0)).toLocaleString("es-CL");}

function getMarca(marcaStr) {
  if (!marcaStr) return "OTRO";
  const m = marcaStr.toUpperCase().trim();
  if (m.includes("VOLVO")) return "VOLVO";
  if (m.includes("SCANIA")) return "SCANIA";
  return "OTRO";
}

function getEstadoEquipo(daysInactive) {
  if (daysInactive === null || daysInactive === undefined) return "SIN VIAJES";
  if (daysInactive <= 30) return "ACTIVO";
  if (daysInactive <= 90) return "INACTIVO";
  return "PARADO";
}
const ESTADO_COLOR = (estado, T) => ({
  "ACTIVO": T.grn, "INACTIVO": T.ac, "PARADO": T.red, "SIN VIAJES": T.txM,
}[estado] || T.txM);

function makeTheme(dark) {
  if (dark) return {
    bg:"#0a0c10",sf:"#12151c",sf2:"#1a1e28",bd:"#252a36",
    tx:"#e0e4ec",txM:"#6b7280",txS:"#9ca3af",
    ac:"#f59e0b",acD:"rgba(245,158,11,0.12)",
    red:"#ef4444",grn:"#22c55e",blu:"#3b82f6",
    cardShadow:"0 1px 3px rgba(0,0,0,0.4)",
    headerShadow:"0 1px 0 #252a36",
    inputBg:"#1a1e28",inputBd:"#252a36",
    navBg:"#1a1e28",navActiveBg:"#f59e0b",navActiveText:"#000",
    sucColors:SUCURSAL_COLORS_DARK, isDark:true,
  };
  return {
    bg:"#f0f4f8",sf:"#ffffff",sf2:"#f8fafc",bd:"#e2e8f0",
    tx:"#0f172a",txM:"#64748b",txS:"#94a3b8",
    ac:"#d97706",acD:"rgba(217,119,6,0.10)",
    red:"#dc2626",grn:"#16a34a",blu:"#2563eb",
    cardShadow:"0 1px 4px rgba(0,0,0,0.08)",
    headerShadow:"0 1px 0 #e2e8f0",
    inputBg:"#f8fafc",inputBd:"#cbd5e1",
    navBg:"#f1f5f9",navActiveBg:"#d97706",navActiveText:"#ffffff",
    sucColors:SUCURSAL_COLORS_LIGHT, isDark:false,
  };
}

// ─── Reusable components ───
function useSortable(data, defaultKey, defaultDir = "asc") {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);
  const toggle = useCallback((key) => {
    setSortKey(prev => { setSortDir(d => prev === key ? (d === "asc" ? "desc" : "asc") : "asc"); return key; });
  }, []);
  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (av == null) av = sortDir === "asc" ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === "asc" ? Infinity : -Infinity;
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, sortKey, sortDir]);
  return { sorted, sortKey, sortDir, toggle };
}

function SortTh({label,col,sortKey,sortDir,toggle,style}){
  const active=sortKey===col;
  return(<th onClick={()=>toggle(col)} style={{...style,cursor:"pointer",userSelect:"none",whiteSpace:"nowrap"}}>
    {label}<span style={{marginLeft:4,opacity:active?1:0.3,fontSize:"10px"}}>{active?(sortDir==="asc"?"▲":"▼"):"⇅"}</span>
  </th>);
}

function StatCard({value,label,icon,color,T}){
  return(<div style={{background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",textAlign:"center",flex:"1",minWidth:"150px",boxShadow:T.cardShadow}}>
    <div style={{fontSize:"12px",marginBottom:"6px"}}>{icon}</div>
    <div style={{fontSize:"28px",fontWeight:700,color:color||T.ac,lineHeight:1.2}}>{value}</div>
    <div style={{fontSize:"10px",color:T.txM,marginTop:"4px",textTransform:"uppercase",letterSpacing:"1px"}}>{label}</div>
  </div>);
}

function SucBadge({s,T}){
  const c=T.sucColors[s]||T.sucColors["OTROS"];
  return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:600,background:c.bg,color:c.text,border:`1px solid ${c.accent}44`}}>{s}</span>;
}

function Pager({page,total,set,T}){
  if(total<=1)return null;
  const sel={background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  return(<div style={{display:"flex",gap:"6px",alignItems:"center",justifyContent:"center",marginTop:"12px"}}>
    <button onClick={()=>set(Math.max(1,page-1))} disabled={page===1} style={{...sel,opacity:page===1?.3:1}}>Ant</button>
    <span style={{fontSize:"12px",color:T.txM}}>{page}/{total}</span>
    <button onClick={()=>set(Math.min(total,page+1))} disabled={page===total} style={{...sel,opacity:page===total?.3:1}}>Sig</button>
  </div>);
}

function ThemeToggle({dark,onToggle}){
  return(<button onClick={onToggle} title={dark?"Cambiar a tema claro":"Cambiar a tema oscuro"} style={{display:"flex",alignItems:"center",gap:"6px",padding:"7px 13px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:dark?"#252a36":"#e2e8f0",color:dark?"#e0e4ec":"#475569",transition:"all 0.2s",whiteSpace:"nowrap",boxShadow:dark?"0 1px 3px rgba(0,0,0,0.3)":"0 1px 2px rgba(0,0,0,0.08)"}}>
    <span style={{fontSize:"15px"}}>{dark?"☀️":"🌙"}</span>
  </button>);
}

function VariationBadge({current,previous,T,suffix="",invert=false}){
  if(previous===0||previous==null)return <span style={{color:T.txM,fontSize:"11px"}}>—</span>;
  const pct=((current-previous)/previous*100);
  const isPositive = invert ? pct < 0 : pct > 0;
  const color = Math.abs(pct) < 3 ? T.txM : isPositive ? T.grn : T.red;
  const arrow = pct > 0 ? "▲" : pct < 0 ? "▼" : "–";
  return <span style={{color,fontSize:"12px",fontWeight:600}}>{arrow} {Math.abs(pct).toFixed(1)}%{suffix}</span>;
}

// ═══ VIEW 1: BUSCADOR ═══
function Buscador({tractoIdx,ramplaIdx,flota,today,T}){
  const[q,setQ]=useState("");const[tipo,setTipo]=useState("all");
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const input={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"10px 14px",color:T.tx,fontSize:"14px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const badge=(c)=>({display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,background:`${c}22`,color:c,border:`1px solid ${c}44`});
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",fontSize:"12px",color:T.tx};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,whiteSpace:"nowrap"};

  const results=useMemo(()=>{
    const s=q.toUpperCase().trim();if(!s||s.length<3)return null;const out=[];
    if(tipo==="all"||tipo==="tracto")for(const[k,v]of tractoIdx.entries()){if(k.includes(s))out.push({t:"TRACTO",pat:k,tramos:v});}
    if(tipo==="all"||tipo==="rampla")for(const[k,v]of ramplaIdx.entries()){if(k.includes(s))out.push({t:"RAMPLA",pat:k,tramos:v});}
    return out.slice(0,20);
  },[q,tipo,tractoIdx,ramplaIdx]);

  return(<div>
    <div style={card}>
      <div style={{fontSize:"16px",fontWeight:700,marginBottom:"14px",color:T.tx}}>🔍 Buscador de Equipos</div>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        <select value={tipo} onChange={e=>setTipo(e.target.value)} style={{...sel,flexShrink:0}}>
          <option value="all">Todo</option><option value="tracto">Tractos</option><option value="rampla">Ramplas</option>
        </select>
        <input style={{...input,flex:1,minWidth:"200px"}} placeholder="Buscar patente (mín. 3 caracteres)..." value={q} onChange={e=>setQ(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="characters"/>
      </div>
      {!results&&<div style={{marginTop:"12px",padding:"14px",background:T.sf2,borderRadius:"8px",border:`1px dashed ${T.bd}`,textAlign:"center",color:T.txM,fontSize:"13px"}}>Ingresa al menos 3 caracteres de la patente para buscar</div>}
    </div>
    {results&&results.length===0&&<div style={{...card,textAlign:"center",color:T.txM}}>Sin resultados para "{q}"</div>}
    {results&&results.map((r,i)=>{
      const last=r.tramos[0];const d=daysBetween(last._date,today);const suc=getSucursal(last.Destino);const fi=flota.get(r.pat);
      const esSinSolicitud=last.Cliente===SIN_SOLICITUD;
      return(<div key={i} style={{...card,borderLeft:`4px solid ${r.t==="TRACTO"?T.blu:T.ac}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
          <div>
            <span style={badge(r.t==="TRACTO"?T.blu:T.ac)}>{r.t}</span>
            <span style={{fontSize:"22px",fontWeight:700,marginLeft:"10px",color:T.tx}}>{r.pat}</span>
            {fi&&<span style={{fontSize:"11px",color:T.txM,marginLeft:"8px"}}>{fi.marca} {fi.modelo} ({fi.fecha})</span>}
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>ÚLTIMO MOVIMIENTO</div>
            <div style={{fontWeight:700,color:ESTADO_COLOR(getEstadoEquipo(d),T),fontSize:"14px"}}>{last.Fecha} ({d===0?"hoy":`hace ${d}d`})</div>
          </div>
        </div>
        <div style={{background:T.sf2,borderRadius:"8px",padding:"12px",marginBottom:"12px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"10px",border:`1px solid ${T.bd}`}}>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>ÚLTIMO VIAJE</span><br/><strong style={{color:T.tx}}>{last.Origen} → {last.Destino}</strong>
            {esSinSolicitud&&<span style={{display:"inline-block",marginLeft:"6px",padding:"1px 6px",borderRadius:"4px",fontSize:"10px",background:`${T.txM}22`,color:T.txM,border:`1px solid ${T.txM}44`}}>Remonta/Vacío</span>}
          </div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>SUCURSAL</span><br/><SucBadge s={suc} T={T}/></div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{r.t==="TRACTO"?"RAMPLA":"TRACTO"}</span><br/><strong style={{color:T.tx}}>{r.t==="TRACTO"?last.Rampla:last.Tracto}</strong></div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>CLIENTE</span><br/><span style={{color:esSinSolicitud?T.txM:T.tx}}>{esSinSolicitud?"—":last.Cliente}</span></div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>CARGA</span><br/><span style={{color:T.tx}}>{last.Carga}</span></div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>KM</span><br/><span style={{color:T.tx}}>{fNum(last.Kilometro)}</span></div>
          {fi&&<div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>TIPO EQUIPO</span><br/><span style={{color:T.tx}}>{fi.tipoequipo}</span></div>}
        </div>
        <details>
          <summary style={{cursor:"pointer",fontSize:"12px",color:T.ac,marginBottom:"8px",fontWeight:600}}>Últimos {Math.min(r.tramos.length,15)} movimientos (de {r.tramos.length} totales)</summary>
          <div style={{maxHeight:"400px",overflowY:"auto",overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
              <thead><tr><th style={th}>Fecha</th><th style={th}>Origen</th><th style={th}>Destino</th><th style={th}>{r.t==="TRACTO"?"Rampla":"Tracto"}</th><th style={th}>Cliente</th><th style={th}>Carga</th><th style={th}>KM</th></tr></thead>
              <tbody>{r.tramos.slice(0,15).map((t,j)=>{
                const sinSol=t.Cliente===SIN_SOLICITUD;
                return(<tr key={j} style={{background:j%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
                  <td style={td}>{t.Fecha}</td><td style={td}>{t.Origen}</td><td style={td}>{t.Destino}</td>
                  <td style={td}>{r.t==="TRACTO"?t.Rampla:t.Tracto}</td>
                  <td style={{...td,color:sinSol?T.txM:T.tx,fontStyle:sinSol?"italic":"normal"}}>{sinSol?"Remonta/Vacío":t.Cliente}</td>
                  <td style={td}>{t.Carga}</td><td style={td}>{fNum(t.Kilometro)}</td>
                </tr>);
              })}</tbody>
            </table>
          </div>
        </details>
      </div>);
    })}
  </div>);
}

// ═══ VIEW 2: ESTADO DE FLOTA (con Comparación Mes) ═══
function EstadoFlota({data,tractoIdx,ramplaIdx,flota,ultimosMap,today,T}){
  const[days,setDays]=useState(30);
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,whiteSpace:"nowrap"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx};

  const stats=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-days);
    let fT=0,fE=0,fO=0;
    const flotaTractos=new Set();const flotaEquipos=new Set();
    for(const[pat,v]of flota.entries()){
      const c=getCategoria(v.tipoequipo);
      if(c==="TRACTOCAMION"){fT++;flotaTractos.add(pat);}
      else if(c==="EQUIPO"){fE++;flotaEquipos.add(pat);}
      else fO++;
    }
    let aT=0,aE=0,totalKm=0,totalTrips=0;const sucCount={};
    for(const pat of flotaTractos){
      const tr=tractoIdx.get(pat);
      if(tr?.length>0){
        let hasRecent=false;
        for(const t of tr){if(t._date<cutoff)break;hasRecent=true;if(t.Cliente!==SIN_SOLICITUD){totalKm+=(Number(t.Kilometro)||0);totalTrips++;}}
        if(hasRecent)aT++;
      } else { if(ultimosMap.get(pat)?._date>=cutoff) aT++; }
    }
    for(const pat of flotaEquipos){
      const tr=ramplaIdx.get(pat);
      if(tr?.length>0){
        let hasRecent=false;
        for(const t of tr){if(t._date<cutoff)break;hasRecent=true;}
        if(hasRecent)aE++;
        const sc=getSucursal(tr[0].Destino);sucCount[sc]=(sucCount[sc]||0)+1;
      } else {
        const u=ultimosMap.get(pat);
        if(u?._date>=cutoff) aE++;
        if(u){const sc=getSucursal(u.Destino||"");sucCount[sc]=(sucCount[sc]||0)+1;}
      }
    }
    // KM from non-fleet tractos too
    for(const[pat,tr]of tractoIdx.entries()){
      if(flotaTractos.has(pat))continue;
      for(const t of tr){if(t._date<cutoff)break;if(t.Cliente!==SIN_SOLICITUD){totalKm+=(Number(t.Kilometro)||0);totalTrips++;}}
    }
    // Top 10 tractos by KM
    const tKm=[];
    for(const[k,tr]of tractoIdx.entries()){
      let km=0;for(const t of tr){if(t._date<cutoff)break;if(t.Cliente!==SIN_SOLICITUD)km+=(Number(t.Kilometro)||0);}
      if(km>0)tKm.push({pat:k,km});
    }
    tKm.sort((a,b)=>b.km-a.km);
    const sucArr=Object.entries(sucCount).sort((a,b)=>b[1]-a[1]);
    const maxSuc=sucArr.length?sucArr[0][1]:1;
    return{fT,fE,fO,aT,aE,totalKm,totalTrips,tKm:tKm.slice(0,10),sucArr,maxSuc,flotaTotal:fT+fE+fO};
  },[data,tractoIdx,ramplaIdx,flota,ultimosMap,today,days]);

  // ─── COMPARACIÓN MES ACTUAL vs ANTERIOR (mismo corte) ───
  const comparison = useMemo(() => {
    // Find the last date in the data
    const allDates = data.filter(d => d._date).map(d => d._date);
    if (!allDates.length) return null;
    const maxDate = new Date(Math.max(...allDates));
    const dayOfMonth = maxDate.getDate();
    const curMonth = maxDate.getMonth();
    const curYear = maxDate.getFullYear();

    // Current month: day 1 to dayOfMonth of current month
    const curStart = new Date(curYear, curMonth, 1);
    const curEnd = new Date(curYear, curMonth, dayOfMonth, 23, 59, 59);

    // Previous month: day 1 to dayOfMonth of previous month
    const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
    const prevYear = curMonth === 0 ? curYear - 1 : curYear;
    const prevMaxDay = new Date(prevYear, prevMonth + 1, 0).getDate();
    const prevCutDay = Math.min(dayOfMonth, prevMaxDay);
    const prevStart = new Date(prevYear, prevMonth, 1);
    const prevEnd = new Date(prevYear, prevMonth, prevCutDay, 23, 59, 59);

    const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const curLabel = monthNames[curMonth] + " " + curYear;
    const prevLabel = monthNames[prevMonth] + " " + prevYear;

    // Filter data (excluding vacíos)
    const curData = data.filter(d => d._date && d._date >= curStart && d._date <= curEnd && d.Cliente !== SIN_SOLICITUD);
    const prevData = data.filter(d => d._date && d._date >= prevStart && d._date <= prevEnd && d.Cliente !== SIN_SOLICITUD);

    // Total trips
    const curTrips = curData.length;
    const prevTrips = prevData.length;

    // Total KM
    const curKm = curData.reduce((s, r) => s + (Number(r.Kilometro) || 0), 0);
    const prevKm = prevData.reduce((s, r) => s + (Number(r.Kilometro) || 0), 0);

    // Unique tractos
    const curTractos = new Set(curData.map(r => r.Tracto).filter(Boolean)).size;
    const prevTractos = new Set(prevData.map(r => r.Tracto).filter(Boolean)).size;

    // By client
    const clientMap = (arr) => {
      const m = {};
      arr.forEach(r => { if (r.Cliente) m[r.Cliente] = (m[r.Cliente] || 0) + 1; });
      return m;
    };
    const curClients = clientMap(curData);
    const prevClients = clientMap(prevData);
    // Merge all clients
    const allClients = new Set([...Object.keys(curClients), ...Object.keys(prevClients)]);
    const clientComparison = [];
    for (const c of allClients) {
      const cur = curClients[c] || 0;
      const prev = prevClients[c] || 0;
      clientComparison.push({ cliente: c, cur, prev, diff: cur - prev });
    }
    clientComparison.sort((a, b) => b.cur - a.cur);

    // By sucursal
    const sucMap = (arr) => {
      const m = {};
      arr.forEach(r => { const s = getSucursal(r.Destino); m[s] = (m[s] || 0) + 1; });
      return m;
    };
    const curSuc = sucMap(curData);
    const prevSuc = sucMap(prevData);
    const allSuc = new Set([...Object.keys(curSuc), ...Object.keys(prevSuc)]);
    const sucComparison = [];
    for (const s of allSuc) {
      sucComparison.push({ suc: s, cur: curSuc[s] || 0, prev: prevSuc[s] || 0, diff: (curSuc[s] || 0) - (prevSuc[s] || 0) });
    }
    sucComparison.sort((a, b) => b.cur - a.cur);

    return { curLabel, prevLabel, dayOfMonth, prevCutDay, curTrips, prevTrips, curKm, prevKm, curTractos, prevTractos, clientComparison, sucComparison };
  }, [data]);

  const pctT=stats.fT?((stats.aT/stats.fT)*100).toFixed(1):0;
  const pctE=stats.fE?((stats.aE/stats.fE)*100).toFixed(1):0;
  const barStyle=(pct,color)=>({height:"8px",borderRadius:"4px",background:T.sf2,overflow:"hidden",flex:1});

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <div style={{fontSize:"20px",fontWeight:700,color:T.tx}}>📊 Estado de Flota</div>
      <select value={days} onChange={e=>setDays(+e.target.value)} style={sel}>
        {[1,7,15,30,60,90].map(d=><option key={d} value={d}>{d} días</option>)}
      </select>
    </div>

    {/* Utilización */}
    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:700,marginBottom:"4px",color:T.tx}}>📈 Utilización de Flota (últimos {days} días)</div>
      <div style={{fontSize:"11px",color:T.txM,marginBottom:"16px"}}>Base: equipos registrados en catálogo de flota · KM y tramos excluyen viajes de remonta/vacío</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>
        {[{label:"Tractocamiones",icon:"🚛",a:stats.aT,t:stats.fT,pct:pctT,color:T.grn},{label:"Equipos",icon:"🏗️",a:stats.aE,t:stats.fE,pct:pctE,color:T.blu}].map(x=>(
          <div key={x.label}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
              <span style={{fontSize:"13px",fontWeight:600,color:T.tx}}>{x.icon} {x.label}</span>
              <span style={{fontSize:"13px",fontWeight:700,color:x.color}}>{x.a} / {x.t} ({x.pct}%)</span>
            </div>
            <div style={barStyle()}><div style={{height:"100%",borderRadius:"4px",background:x.color,width:`${Math.min(100,+x.pct)}%`,transition:"width 0.5s"}}/></div>
          </div>
        ))}
      </div>
    </div>

    {/* Stat cards */}
    <div style={{display:"flex",gap:"16px",marginBottom:"16px",flexWrap:"wrap"}}>
      <StatCard value={stats.totalKm>=1e6?(stats.totalKm/1e6).toFixed(1)+"M":stats.totalKm>=1e3?Math.round(stats.totalKm/1e3).toLocaleString("es-CL")+"K":fNum(stats.totalKm)} label="KM Totales" icon="🛣️" color={T.ac} T={T}/>
      <StatCard value={fNum(stats.totalTrips)} label="Tramos" icon="📋" color={T.blu} T={T}/>
      <StatCard value={fNum(stats.flotaTotal)} label="Flota Total" icon="🏗️" color={T.grn} T={T}/>
      <StatCard value={fNum(stats.fO)} label="Otros (Camiones, Grúas)" icon="↗️" T={T}/>
    </div>

    {/* Sucursales + Top tractos */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginBottom:"16px"}}>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:700,marginBottom:"14px",color:T.tx}}>🗺️ Equipos por Sucursal (Última ubicación)</div>
        {stats.sucArr.map(([s,n])=>(
          <div key={s} style={{marginBottom:"8px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"3px"}}>
              <SucBadge s={s} T={T}/>
              <span style={{marginLeft:"auto",fontSize:"12px",color:T.tx,fontWeight:600}}>{n} ({(n/(stats.fE||1)*100).toFixed(1)}%)</span>
            </div>
            <div style={{height:"6px",background:T.sf2,borderRadius:"3px",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:"3px",width:`${n/stats.maxSuc*100}%`,background:(T.sucColors[s]||T.sucColors["OTROS"]).accent,transition:"width 0.5s"}}/>
            </div>
          </div>
        ))}
      </div>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:700,marginBottom:"14px",color:T.tx}}>🏆 Top 10 Tractos por KM</div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr><th style={th}>#</th><th style={th}>Tracto</th><th style={{...th,textAlign:"right"}}>KM</th></tr></thead>
          <tbody>{stats.tKm.map((r,i)=>(
            <tr key={r.pat} style={{background:i%2?T.sf2:"transparent"}}>
              <td style={td}>{i+1}</td><td style={{...td,fontWeight:600}}>{r.pat}</td><td style={{...td,textAlign:"right"}}>{fNum(r.km)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>

    {/* ═══ COMPARACIÓN MES ACTUAL vs ANTERIOR ═══ */}
    {comparison && (
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:700,marginBottom:"4px",color:T.tx}}>📅 Comparación: {comparison.curLabel} vs {comparison.prevLabel}</div>
        <div style={{fontSize:"11px",color:T.txM,marginBottom:"16px"}}>
          Comparando primeros {comparison.dayOfMonth} días de {comparison.curLabel} contra primeros {comparison.prevCutDay} días de {comparison.prevLabel} · Excluye viajes vacíos/remonta
        </div>

        {/* KPI summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"12px",marginBottom:"20px"}}>
          {[
            {label:"Viajes",cur:comparison.curTrips,prev:comparison.prevTrips,icon:"📋"},
            {label:"KM Totales",cur:comparison.curKm,prev:comparison.prevKm,icon:"🛣️",formatVal:v=>v>=1e3?Math.round(v/1e3).toLocaleString("es-CL")+"K":fNum(v)},
            {label:"Tractos Activos",cur:comparison.curTractos,prev:comparison.prevTractos,icon:"🚛"},
          ].map(kpi=>(
            <div key={kpi.label} style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"10px",padding:"16px",textAlign:"center"}}>
              <div style={{fontSize:"11px",color:T.txM,marginBottom:"8px"}}>{kpi.icon} {kpi.label}</div>
              <div style={{display:"flex",justifyContent:"center",alignItems:"baseline",gap:"12px"}}>
                <div>
                  <div style={{fontSize:"22px",fontWeight:700,color:T.ac}}>{kpi.formatVal?kpi.formatVal(kpi.cur):fNum(kpi.cur)}</div>
                  <div style={{fontSize:"9px",color:T.txM,textTransform:"uppercase"}}>{comparison.curLabel}</div>
                </div>
                <div style={{fontSize:"14px",color:T.txM}}>vs</div>
                <div>
                  <div style={{fontSize:"18px",fontWeight:600,color:T.txS}}>{kpi.formatVal?kpi.formatVal(kpi.prev):fNum(kpi.prev)}</div>
                  <div style={{fontSize:"9px",color:T.txM,textTransform:"uppercase"}}>{comparison.prevLabel}</div>
                </div>
              </div>
              <div style={{marginTop:"6px"}}><VariationBadge current={kpi.cur} previous={kpi.prev} T={T}/></div>
            </div>
          ))}
        </div>

        {/* By Client */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
          <div>
            <div style={{fontSize:"13px",fontWeight:700,marginBottom:"10px",color:T.tx}}>Por Cliente (viajes)</div>
            <div style={{maxHeight:"400px",overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                <thead><tr><th style={th}>Cliente</th><th style={{...th,textAlign:"right"}}>{comparison.curLabel}</th><th style={{...th,textAlign:"right"}}>{comparison.prevLabel}</th><th style={{...th,textAlign:"right"}}>Var.</th></tr></thead>
                <tbody>{comparison.clientComparison.slice(0,20).map((r,i)=>(
                  <tr key={r.cliente} style={{background:i%2?T.sf2:"transparent"}}>
                    <td style={{...td,maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis"}}>{r.cliente}</td>
                    <td style={{...td,textAlign:"right",fontWeight:600}}>{fNum(r.cur)}</td>
                    <td style={{...td,textAlign:"right",color:T.txM}}>{fNum(r.prev)}</td>
                    <td style={{...td,textAlign:"right"}}><VariationBadge current={r.cur} previous={r.prev} T={T}/></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <div>
            <div style={{fontSize:"13px",fontWeight:700,marginBottom:"10px",color:T.tx}}>Por Sucursal (viajes)</div>
            <div style={{maxHeight:"400px",overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                <thead><tr><th style={th}>Sucursal</th><th style={{...th,textAlign:"right"}}>{comparison.curLabel}</th><th style={{...th,textAlign:"right"}}>{comparison.prevLabel}</th><th style={{...th,textAlign:"right"}}>Var.</th></tr></thead>
                <tbody>{comparison.sucComparison.map((r,i)=>(
                  <tr key={r.suc} style={{background:i%2?T.sf2:"transparent"}}>
                    <td style={td}><SucBadge s={r.suc} T={T}/></td>
                    <td style={{...td,textAlign:"right",fontWeight:600}}>{fNum(r.cur)}</td>
                    <td style={{...td,textAlign:"right",color:T.txM}}>{fNum(r.prev)}</td>
                    <td style={{...td,textAlign:"right"}}><VariationBadge current={r.cur} previous={r.prev} T={T}/></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>);
}

// ═══ VIEW 3: EQUIPOS (Inactivos) ═══
function Inactivos({tractoIdx,ramplaIdx,flota,ultimosMap,today,T}){
  const[threshold,setThreshold]=useState(30);const[catFilter,setCatFilter]=useState("all");const[pg,setPg]=useState(1);
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,whiteSpace:"nowrap"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const perPage=30;

  const items=useMemo(()=>{
    const out=[];
    for(const[pat,fi]of flota.entries()){
      const cat=getCategoria(fi.tipoequipo);
      const idx=cat==="TRACTOCAMION"?tractoIdx:ramplaIdx;
      const trips=idx.get(pat);
      let lastDate=null,lastDest="",lastOrig="";
      if(trips?.length){lastDate=trips[0]._date;lastDest=trips[0].Destino;lastOrig=trips[0].Origen;}
      else{const u=ultimosMap.get(pat);if(u){lastDate=u._date;lastDest=u.Destino||"";lastOrig=u.Origen||"";}}
      const daysI=lastDate?daysBetween(lastDate,today):null;
      const estado=getEstadoEquipo(daysI);
      out.push({pat,cat,tipo:fi.tipoequipo,marca:fi.marca,modelo:fi.modelo,lastDate,lastDest,lastOrig,daysI,estado,suc:getSucursal(lastDest)});
    }
    let f=out;
    if(catFilter!=="all")f=f.filter(x=>x.cat===catFilter);
    f=f.filter(x=>x.daysI===null||x.daysI>=threshold);
    f.sort((a,b)=>(b.daysI||9999)-(a.daysI||9999));
    return f;
  },[flota,tractoIdx,ramplaIdx,ultimosMap,today,threshold,catFilter]);

  const totalP=Math.ceil(items.length/perPage);
  const page=items.slice((pg-1)*perPage,pg*perPage);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <div style={{fontSize:"20px",fontWeight:700,color:T.tx}}>⚠️ Equipos — {items.length} encontrados</div>
      <div style={{display:"flex",gap:"8px"}}>
        <select value={catFilter} onChange={e=>{setCatFilter(e.target.value);setPg(1);}} style={sel}>
          <option value="all">Todos</option><option value="TRACTOCAMION">Tractocamiones</option><option value="EQUIPO">Equipos</option><option value="OTRO">Otros</option>
        </select>
        <select value={threshold} onChange={e=>{setThreshold(+e.target.value);setPg(1);}} style={sel}>
          {[7,15,30,60,90,180,365].map(d=><option key={d} value={d}>≥ {d} días</option>)}
        </select>
      </div>
    </div>
    <div style={{...card,padding:"0",overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr><th style={th}>Patente</th><th style={th}>Categoría</th><th style={th}>Tipo</th><th style={th}>Marca</th><th style={th}>Sucursal</th><th style={th}>Último Destino</th><th style={th}>Última Fecha</th><th style={{...th,textAlign:"right"}}>Días Sin Viaje</th><th style={th}>Estado</th></tr></thead>
          <tbody>{page.map((r,i)=>{
            const ec=ESTADO_COLOR(r.estado,T);
            return(<tr key={r.pat} style={{background:i%2?T.sf2:"transparent"}}>
              <td style={{...td,fontWeight:700}}>{r.pat}</td>
              <td style={td}>{r.cat}</td><td style={td}>{r.tipo}</td><td style={td}>{r.marca}</td>
              <td style={td}><SucBadge s={r.suc} T={T}/></td>
              <td style={td}>{r.lastDest||"—"}</td>
              <td style={td}>{r.lastDate?formatDate(r.lastDate):"—"}</td>
              <td style={{...td,textAlign:"right",fontWeight:600,color:ec}}>{r.daysI!=null?fNum(r.daysI):"—"}</td>
              <td style={td}><span style={{padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,background:`${ec}22`,color:ec,border:`1px solid ${ec}44`}}>{r.estado}</span></td>
            </tr>);
          })}</tbody>
        </table>
      </div>
    </div>
    <Pager page={pg} total={totalP} set={setPg} T={T}/>
  </div>);
}

// ═══ VIEW 4: POR CLIENTE ═══
function StatsCliente({data,today,T}){
  const[months,setMonths]=useState(1);const[pg,setPg]=useState(1);
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,whiteSpace:"nowrap"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const perPage=25;

  const rows=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);
    const filtered=(months===99?data:data.filter(d=>d._date>=cutoff)).filter(d=>d.Cliente!==SIN_SOLICITUD);
    const m={};
    filtered.forEach(r=>{
      if(!r.Cliente)return;
      if(!m[r.Cliente])m[r.Cliente]={cliente:r.Cliente,viajes:0,km:0,rutas:new Set(),tractos:new Set()};
      m[r.Cliente].viajes++;m[r.Cliente].km+=(Number(r.Kilometro)||0);
      m[r.Cliente].rutas.add(r.Origen+"→"+r.Destino);m[r.Cliente].tractos.add(r.Tracto);
    });
    return Object.values(m).map(r=>({...r,rutas:r.rutas.size,tractos:r.tractos.size}));
  },[data,today,months]);

  const{sorted,sortKey,sortDir,toggle}=useSortable(rows,"viajes","desc");
  const totalP=Math.ceil(sorted.length/perPage);
  const page=sorted.slice((pg-1)*perPage,pg*perPage);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <div style={{fontSize:"20px",fontWeight:700,color:T.tx}}>🏢 Por Cliente — {rows.length} clientes</div>
      <select value={months} onChange={e=>{setMonths(+e.target.value);setPg(1);}} style={sel}>
        <option value={1}>Último mes</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={99}>Todo</option>
      </select>
    </div>
    <div style={{...card,padding:"0",overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <SortTh label="Cliente" col="cliente" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="Viajes" col="viajes" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="KM" col="km" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="Rutas" col="rutas" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="Tractos" col="tractos" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
          </tr></thead>
          <tbody>{page.map((r,i)=>(
            <tr key={r.cliente} style={{background:i%2?T.sf2:"transparent"}}>
              <td style={{...td,fontWeight:600,maxWidth:"250px",overflow:"hidden",textOverflow:"ellipsis"}}>{r.cliente}</td>
              <td style={{...td,textAlign:"right"}}>{fNum(r.viajes)}</td>
              <td style={{...td,textAlign:"right"}}>{fNum(r.km)}</td>
              <td style={{...td,textAlign:"right"}}>{r.rutas}</td>
              <td style={{...td,textAlign:"right"}}>{r.tractos}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
    <Pager page={pg} total={totalP} set={setPg} T={T}/>
  </div>);
}

// ═══ VIEW 5: POR RUTA ═══
function StatsRuta({data,today,T}){
  const[months,setMonths]=useState(1);const[pg,setPg]=useState(1);
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,whiteSpace:"nowrap"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const perPage=25;

  const rows=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);
    const filtered=(months===99?data:data.filter(d=>d._date>=cutoff)).filter(d=>d.Cliente!==SIN_SOLICITUD);
    const m={};
    filtered.forEach(r=>{
      const ruta=r.Origen+"→"+r.Destino;
      if(!m[ruta])m[ruta]={ruta,origen:r.Origen,destino:r.Destino,viajes:0,km:0,clientes:new Set()};
      m[ruta].viajes++;m[ruta].km+=(Number(r.Kilometro)||0);m[ruta].clientes.add(r.Cliente);
    });
    return Object.values(m).map(r=>({...r,clientes:r.clientes.size}));
  },[data,today,months]);

  const{sorted,sortKey,sortDir,toggle}=useSortable(rows,"viajes","desc");
  const totalP=Math.ceil(sorted.length/perPage);
  const page=sorted.slice((pg-1)*perPage,pg*perPage);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <div style={{fontSize:"20px",fontWeight:700,color:T.tx}}>🛤️ Por Ruta — {rows.length} rutas</div>
      <select value={months} onChange={e=>{setMonths(+e.target.value);setPg(1);}} style={sel}>
        <option value={1}>Último mes</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={99}>Todo</option>
      </select>
    </div>
    <div style={{...card,padding:"0",overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <SortTh label="Origen" col="origen" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="Destino" col="destino" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="Viajes" col="viajes" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="KM" col="km" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="Clientes" col="clientes" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
          </tr></thead>
          <tbody>{page.map((r,i)=>(
            <tr key={r.ruta} style={{background:i%2?T.sf2:"transparent"}}>
              <td style={td}>{r.origen}</td><td style={td}>{r.destino}</td>
              <td style={{...td,textAlign:"right"}}>{fNum(r.viajes)}</td>
              <td style={{...td,textAlign:"right"}}>{fNum(r.km)}</td>
              <td style={{...td,textAlign:"right"}}>{r.clientes}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
    <Pager page={pg} total={totalP} set={setPg} T={T}/>
  </div>);
}

// ═══ VIEW 6: DETALLE ═══
function Detalle({data,T}){
  const[pg,setPg]=useState(1);const[clienteF,setClienteF]=useState("");const[sucF,setSucF]=useState("");
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,whiteSpace:"nowrap"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const perPage=50;

  const filtered=useMemo(()=>{
    let f=data.filter(d=>d.Cliente!==SIN_SOLICITUD);
    if(clienteF)f=f.filter(d=>(d.Cliente||"").toUpperCase().includes(clienteF.toUpperCase()));
    if(sucF)f=f.filter(d=>getSucursal(d.Destino)===sucF);
    return f;
  },[data,clienteF,sucF]);

  const totalP=Math.ceil(filtered.length/perPage);
  const page=filtered.slice((pg-1)*perPage,pg*perPage);
  const clientes=useMemo(()=>[...new Set(data.filter(d=>d.Cliente&&d.Cliente!==SIN_SOLICITUD).map(d=>d.Cliente))].sort(),[data]);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <div style={{fontSize:"20px",fontWeight:700,color:T.tx}}>📋 Detalle — {fNum(filtered.length)} tramos</div>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        <select value={clienteF} onChange={e=>{setClienteF(e.target.value);setPg(1);}} style={{...sel,maxWidth:"200px"}}>
          <option value="">Todos los clientes</option>
          {clientes.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sucF} onChange={e=>{setSucF(e.target.value);setPg(1);}} style={sel}>
          <option value="">Todas las sucursales</option>
          {Object.keys(SUCURSAL_MAP).map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
    <div style={{...card,padding:"0",overflow:"hidden"}}>
      <div style={{overflowX:"auto",maxHeight:"600px",overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr><th style={th}>Fecha</th><th style={th}>Tracto</th><th style={th}>Rampla</th><th style={th}>Origen</th><th style={th}>Destino</th><th style={th}>Cliente</th><th style={th}>Carga</th><th style={{...th,textAlign:"right"}}>KM</th></tr></thead>
          <tbody>{page.map((r,i)=>(
            <tr key={i} style={{background:i%2?T.sf2:"transparent"}}>
              <td style={td}>{r.Fecha}</td><td style={td}>{r.Tracto}</td><td style={td}>{r.Rampla}</td>
              <td style={td}>{r.Origen}</td><td style={td}>{r.Destino}</td>
              <td style={{...td,maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis"}}>{r.Cliente}</td>
              <td style={td}>{r.Carga}</td><td style={{...td,textAlign:"right"}}>{fNum(r.Kilometro)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
    <Pager page={pg} total={totalP} set={setPg} T={T}/>
  </div>);
}

// ═══ VIEW 7: INVENTARIO ═══
function Inventario({flota,tractoIdx,ramplaIdx,ultimosMap,today,T}){
  const[catFilter,setCatFilter]=useState("all");const[estadoFilter,setEstadoFilter]=useState("all");const[pg,setPg]=useState(1);const[searchQ,setSearchQ]=useState("");
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const input={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,whiteSpace:"nowrap"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const perPage=30;

  const items=useMemo(()=>{
    const out=[];
    for(const[pat,fi]of flota.entries()){
      const cat=getCategoria(fi.tipoequipo);
      const idx=cat==="TRACTOCAMION"?tractoIdx:ramplaIdx;
      const trips=idx.get(pat);
      let lastDate=null,lastDest="";
      if(trips?.length){lastDate=trips[0]._date;lastDest=trips[0].Destino;}
      else{const u=ultimosMap.get(pat);if(u){lastDate=u._date;lastDest=u.Destino||"";}}
      const daysI=lastDate?daysBetween(lastDate,today):null;
      const estado=getEstadoEquipo(daysI);
      const ageStr=fi.fecha||"";
      let age=null;
      if(ageStr){const y=parseInt(ageStr);if(y>1990)age=today.getFullYear()-y;}
      out.push({pat,cat,tipo:fi.tipoequipo,marca:fi.marca,modelo:fi.modelo,fecha:fi.fecha,age,estado,daysI,lastDest,lastDate});
    }
    let f=out;
    if(catFilter!=="all")f=f.filter(x=>x.cat===catFilter);
    if(estadoFilter!=="all")f=f.filter(x=>x.estado===estadoFilter);
    if(searchQ){const s=searchQ.toUpperCase();f=f.filter(x=>x.pat.includes(s)||x.marca.toUpperCase().includes(s)||x.modelo.toUpperCase().includes(s));}
    return f;
  },[flota,tractoIdx,ramplaIdx,ultimosMap,today,catFilter,estadoFilter,searchQ]);

  const{sorted,sortKey,sortDir,toggle}=useSortable(items,"pat","asc");
  const totalP=Math.ceil(sorted.length/perPage);
  const page=sorted.slice((pg-1)*perPage,pg*perPage);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <div style={{fontSize:"20px",fontWeight:700,color:T.tx}}>🏗️ Inventario — {items.length} equipos</div>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        <input value={searchQ} onChange={e=>{setSearchQ(e.target.value);setPg(1);}} placeholder="Buscar patente/marca..." style={{...input,width:"160px"}}/>
        <select value={catFilter} onChange={e=>{setCatFilter(e.target.value);setPg(1);}} style={sel}>
          <option value="all">Todas categorías</option><option value="TRACTOCAMION">Tractocamiones</option><option value="EQUIPO">Equipos</option><option value="OTRO">Otros</option>
        </select>
        <select value={estadoFilter} onChange={e=>{setEstadoFilter(e.target.value);setPg(1);}} style={sel}>
          <option value="all">Todos estados</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option><option value="PARADO">Parado</option><option value="SIN VIAJES">Sin Viajes</option>
        </select>
      </div>
    </div>
    <div style={{...card,padding:"0",overflow:"hidden"}}>
      <div style={{overflowX:"auto",maxHeight:"600px",overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <SortTh label="Patente" col="pat" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="Categoría" col="cat" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <th style={th}>Tipo</th><th style={th}>Marca</th><th style={th}>Modelo</th>
            <SortTh label="Año" col="fecha" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="Edad" col="age" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="Estado" col="estado" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <th style={th}>Último Destino</th><th style={th}>Última Fecha</th>
          </tr></thead>
          <tbody>{page.map((r,i)=>{
            const ec=ESTADO_COLOR(r.estado,T);
            return(<tr key={r.pat} style={{background:i%2?T.sf2:"transparent"}}>
              <td style={{...td,fontWeight:700}}>{r.pat}</td>
              <td style={td}><span style={{padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,background:`${r.cat==="TRACTOCAMION"?T.blu:r.cat==="EQUIPO"?T.ac:T.txM}22`,color:r.cat==="TRACTOCAMION"?T.blu:r.cat==="EQUIPO"?T.ac:T.txM}}>{r.cat}</span></td>
              <td style={td}>{r.tipo}</td><td style={td}>{r.marca}</td><td style={td}>{r.modelo}</td>
              <td style={td}>{r.fecha}</td>
              <td style={{...td,textAlign:"right",color:r.age>10?T.red:r.age>6?T.ac:T.grn,fontWeight:600}}>{r.age!=null?r.age+" años":"—"}</td>
              <td style={td}><span style={{padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,background:`${ec}22`,color:ec,border:`1px solid ${ec}44`}}>{r.estado}</span></td>
              <td style={td}>{r.lastDest||"—"}</td>
              <td style={td}>{r.lastDate?formatDate(r.lastDate):"—"}</td>
            </tr>);
          })}</tbody>
        </table>
      </div>
    </div>
    <Pager page={pg} total={totalP} set={setPg} T={T}/>
  </div>);
}

// ═══ VIEW 8: CONSUMO COMBUSTIBLE ═══
function Combustible({data,tractoIdx,flota,today,T}){
  const[months,setMonths]=useState(1);
  const[precioLitro,setPrecioLitro]=useState("");
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const input={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"10px 14px",color:T.tx,fontSize:"14px",fontFamily:"inherit",outline:"none"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,whiteSpace:"nowrap"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};

  const precio = parseFloat(String(precioLitro).replace(/\./g,"").replace(",",".")) || 0;

  const stats = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setMonth(cutoff.getMonth() - months);

    // Per tracto: accumulate KM, look up marca from flota
    const tractoData = {};
    for (const [pat, trips] of tractoIdx.entries()) {
      const fi = flota.get(pat);
      if (!fi) continue;
      const cat = getCategoria(fi.tipoequipo);
      if (cat !== "TRACTOCAMION") continue;
      const marca = getMarca(fi.marca);

      let km = 0;
      for (const t of trips) {
        if (t._date < cutoff) break;
        if (t.Cliente !== SIN_SOLICITUD) km += (Number(t.Kilometro) || 0);
      }
      if (km > 0) {
        tractoData[pat] = { pat, marca, modelo: fi.modelo, km };
      }
    }

    const all = Object.values(tractoData);
    const volvo = all.filter(x => x.marca === "VOLVO");
    const scania = all.filter(x => x.marca === "SCANIA");
    const otro = all.filter(x => x.marca === "OTRO");

    const sumKm = (arr) => arr.reduce((s, x) => s + x.km, 0);
    const calcLitros = (km, marca) => {
      const rend = RENDIMIENTO[marca];
      return rend ? km / rend : 0;
    };

    const volvoKm = sumKm(volvo);
    const scaniaKm = sumKm(scania);
    const otroKm = sumKm(otro);
    const totalKm = volvoKm + scaniaKm + otroKm;

    const volvoLitros = calcLitros(volvoKm, "VOLVO");
    const scaniaLitros = calcLitros(scaniaKm, "SCANIA");
    // For "OTRO" we use average of both rendimientos
    const otroLitros = otroKm > 0 ? otroKm / ((RENDIMIENTO.VOLVO + RENDIMIENTO.SCANIA) / 2) : 0;
    const totalLitros = volvoLitros + scaniaLitros + otroLitros;

    // Top consumers
    const topTractos = all.map(x => ({
      ...x,
      litros: x.marca === "VOLVO" ? x.km / RENDIMIENTO.VOLVO :
              x.marca === "SCANIA" ? x.km / RENDIMIENTO.SCANIA :
              x.km / ((RENDIMIENTO.VOLVO + RENDIMIENTO.SCANIA) / 2),
    })).sort((a, b) => b.litros - a.litros).slice(0, 15);

    return {
      volvo: { count: volvo.length, km: volvoKm, litros: volvoLitros, rend: RENDIMIENTO.VOLVO },
      scania: { count: scania.length, km: scaniaKm, litros: scaniaLitros, rend: RENDIMIENTO.SCANIA },
      otro: { count: otro.length, km: otroKm, litros: otroLitros },
      totalKm, totalLitros, totalTractos: all.length,
      topTractos,
    };
  }, [data, tractoIdx, flota, today, months]);

  const totalCosto = stats.totalLitros * precio;
  const volvoCosto = stats.volvo.litros * precio;
  const scaniaCosto = stats.scania.litros * precio;

  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <div style={{fontSize:"20px",fontWeight:700,color:T.tx}}>⛽ Consumo de Combustible</div>
      <select value={months} onChange={e=>setMonths(+e.target.value)} style={sel}>
        <option value={1}>Último mes</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={99}>Todo</option>
      </select>
    </div>

    {/* Precio input */}
    <div style={card}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
        <div style={{fontSize:"13px",fontWeight:600,color:T.tx}}>💰 Precio del Diésel (CLP/litro):</div>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",color:T.txM,fontSize:"14px",fontWeight:600}}>$</span>
          <input
            type="text"
            value={precioLitro}
            onChange={e => setPrecioLitro(e.target.value)}
            placeholder="Ej: 850"
            style={{...input,paddingLeft:"28px",width:"150px"}}
          />
        </div>
        {precio > 0 && <span style={{fontSize:"12px",color:T.grn,fontWeight:600}}>✓ {fPesos(precio)}/litro</span>}
        {!precio && <span style={{fontSize:"11px",color:T.txM}}>Ingresa el precio para ver costos en pesos</span>}
      </div>
    </div>

    {/* Summary cards */}
    <div style={{display:"flex",gap:"16px",marginBottom:"16px",flexWrap:"wrap"}}>
      <StatCard value={fNum(Math.round(stats.totalLitros))} label="Litros Totales Estimados" icon="⛽" color={T.red} T={T}/>
      <StatCard value={fNum(stats.totalKm)} label="KM Totales" icon="🛣️" color={T.ac} T={T}/>
      <StatCard value={fNum(stats.totalTractos)} label="Tractos Activos" icon="🚛" color={T.blu} T={T}/>
      {precio > 0 && <StatCard value={totalCosto>=1e6?(totalCosto/1e6).toFixed(1)+"M":fPesos(totalCosto)} label="Costo Total Estimado" icon="💰" color={T.grn} T={T}/>}
    </div>

    {/* Volvo vs Scania */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginBottom:"16px"}}>
      {[
        {label:"VOLVO",data:stats.volvo,color:"#1e3a5f",colorLight:"#3b82f6",icon:"🔵"},
        {label:"SCANIA",data:stats.scania,color:"#5f1e1e",colorLight:"#ef4444",icon:"🔴"},
      ].map(brand=>(
        <div key={brand.label} style={{...card,borderTop:`4px solid ${T.isDark?brand.colorLight:brand.colorLight}`}}>
          <div style={{fontSize:"15px",fontWeight:700,marginBottom:"14px",color:T.tx}}>{brand.icon} {brand.label}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
            <div style={{background:T.sf2,borderRadius:"8px",padding:"12px",textAlign:"center",border:`1px solid ${T.bd}`}}>
              <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",marginBottom:"4px"}}>Tractos</div>
              <div style={{fontSize:"20px",fontWeight:700,color:T.tx}}>{brand.data.count}</div>
            </div>
            <div style={{background:T.sf2,borderRadius:"8px",padding:"12px",textAlign:"center",border:`1px solid ${T.bd}`}}>
              <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",marginBottom:"4px"}}>Rendimiento</div>
              <div style={{fontSize:"20px",fontWeight:700,color:T.ac}}>{brand.data.rend} km/L</div>
            </div>
            <div style={{background:T.sf2,borderRadius:"8px",padding:"12px",textAlign:"center",border:`1px solid ${T.bd}`}}>
              <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",marginBottom:"4px"}}>KM Recorridos</div>
              <div style={{fontSize:"18px",fontWeight:700,color:T.tx}}>{fNum(brand.data.km)}</div>
            </div>
            <div style={{background:T.sf2,borderRadius:"8px",padding:"12px",textAlign:"center",border:`1px solid ${T.bd}`}}>
              <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",marginBottom:"4px"}}>Litros Estimados</div>
              <div style={{fontSize:"18px",fontWeight:700,color:T.red}}>{fNum(Math.round(brand.data.litros))}</div>
            </div>
          </div>
          {precio > 0 && (
            <div style={{marginTop:"12px",background:`${brand.colorLight}15`,borderRadius:"8px",padding:"14px",textAlign:"center",border:`1px solid ${brand.colorLight}33`}}>
              <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",marginBottom:"4px"}}>Costo Estimado</div>
              <div style={{fontSize:"22px",fontWeight:700,color:brand.colorLight}}>{fPesos(brand.data.litros * precio)}</div>
            </div>
          )}
        </div>
      ))}
    </div>

    {/* Otros (si hay) */}
    {stats.otro.count > 0 && (
      <div style={{...card,marginBottom:"16px"}}>
        <div style={{fontSize:"13px",fontWeight:700,color:T.tx,marginBottom:"8px"}}>📌 Otras Marcas ({stats.otro.count} tractos)</div>
        <div style={{fontSize:"12px",color:T.txM}}>
          KM: {fNum(stats.otro.km)} · Litros estimados: {fNum(Math.round(stats.otro.litros))} (rendimiento promedio: {((RENDIMIENTO.VOLVO+RENDIMIENTO.SCANIA)/2).toFixed(1)} km/L)
          {precio>0&&<span> · Costo: {fPesos(stats.otro.litros*precio)}</span>}
        </div>
      </div>
    )}

    {/* Top consumers */}
    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:700,marginBottom:"14px",color:T.tx}}>🏆 Top 15 Tractos por Consumo</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <th style={th}>#</th><th style={th}>Tracto</th><th style={th}>Marca</th><th style={th}>Modelo</th>
            <th style={{...th,textAlign:"right"}}>KM</th><th style={{...th,textAlign:"right"}}>Litros Est.</th>
            {precio>0&&<th style={{...th,textAlign:"right"}}>Costo Est.</th>}
          </tr></thead>
          <tbody>{stats.topTractos.map((r,i)=>(
            <tr key={r.pat} style={{background:i%2?T.sf2:"transparent"}}>
              <td style={td}>{i+1}</td>
              <td style={{...td,fontWeight:700}}>{r.pat}</td>
              <td style={td}><span style={{padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,background:r.marca==="VOLVO"?`${T.blu}22`:r.marca==="SCANIA"?`${T.red}22`:`${T.txM}22`,color:r.marca==="VOLVO"?T.blu:r.marca==="SCANIA"?T.red:T.txM}}>{r.marca}</span></td>
              <td style={td}>{r.modelo}</td>
              <td style={{...td,textAlign:"right"}}>{fNum(r.km)}</td>
              <td style={{...td,textAlign:"right",fontWeight:600,color:T.red}}>{fNum(Math.round(r.litros))}</td>
              {precio>0&&<td style={{...td,textAlign:"right",fontWeight:600,color:T.grn}}>{fPesos(r.litros*precio)}</td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  </div>);
}

// ═══ MAIN APP ═══
const VIEWS = [
  {id:"buscar",label:"Buscador",icon:"🔍"},
  {id:"flota",label:"Estado Flota",icon:"📊"},
  {id:"combustible",label:"Combustible",icon:"⛽"},
  {id:"inactivos",label:"Equipos",icon:"⚠️"},
  {id:"clientes",label:"Por Cliente",icon:"🏢"},
  {id:"rutas",label:"Por Ruta",icon:"🛤️"},
  {id:"detalle",label:"Detalle",icon:"📋"},
  {id:"inventario",label:"Inventario",icon:"🏗️"},
];

export default function App() {
  const [data, setData] = useState([]);
  const [flota, setFlota] = useState(new Map());
  const [ultimosMap, setUltimosMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState("Conectando...");
  const [error, setError] = useState(null);
  const [view, setView] = useState("flota");
  const [info, setInfo] = useState({});
  const [darkMode, setDarkMode] = useState(() => {
    try { const s = localStorage.getItem("tb_dark"); return s === null ? true : s === "true"; } catch { return true; }
  });

  const T = useMemo(() => makeTheme(darkMode), [darkMode]);
  const today = useMemo(() => new Date(), []);

  const toggleTheme = () => {
    setDarkMode(d => { const next = !d; try { localStorage.setItem("tb_dark", String(next)); } catch {} return next; });
  };

  const { tractoIdx, ramplaIdx } = useMemo(() => {
    const ti = new Map(), ri = new Map();
    for (const row of data) {
      if (row.Tracto) { if (!ti.has(row.Tracto)) ti.set(row.Tracto, []); ti.get(row.Tracto).push(row); }
      if (row.Rampla) { if (!ri.has(row.Rampla)) ri.set(row.Rampla, []); ri.get(row.Rampla).push(row); }
    }
    return { tractoIdx: ti, ramplaIdx: ri };
  }, [data]);

  useEffect(() => {
    let vd = null, fd = null, ud = null;
    let ultimosReady = false;

    const tryFinalize = () => {
      if (!vd || !fd) return;
      if (!ultimosReady) { setTimeout(tryFinalize, 500); return; }

      setLoadMsg("Indexando...");
      setTimeout(() => {
        try {
          let rows = vd;
          rows = rows.map(r => ({ ...r, _date: parseDate(r.Fecha) })).filter(r => r._date);
          rows.sort((a, b) => b._date - a._date || (b.Expedicion || "").localeCompare(a.Expedicion || ""));
          const maxD = rows.length ? rows[0]._date : null;
          const minD = rows.length ? rows[rows.length - 1]._date : null;

          const fm = new Map();
          fd.forEach(r => {
            const pat = cleanPatente(r.patente);
            if (pat && pat !== "AA1111" && pat !== "AAA111")
              fm.set(pat, { marca: r.marca?.trim() || "", modelo: r.modelo?.trim() || "", fecha: r.fecha?.trim() || "", tipoequipo: r.tipoequipo?.trim() || "" });
          });

          const um = new Map();
          if (ud && ud.length) {
            ud.forEach(r => {
              const pat = cleanPatente(r["Patente"] || r["patente"]);
              if (!pat) return;
              const rawDate = r["Ult. despacho"] || r["ult. despacho"] || r["Fecha"] || "";
              const d = parseDate(rawDate);
              if (d) um.set(pat, { _date: d, Destino: r["Destino"] || r["destino"] || "", Origen: r["Origen"] || r["origen"] || "" });
            });
          }

          setInfo({
            total: rows.filter(r => r.Cliente !== SIN_SOLICITUD).length,
            minDate: minD ? formatDate(minD) : "-",
            maxDate: maxD ? formatDate(maxD) : "-",
            tractos: new Set(rows.map(r => r.Tracto).filter(Boolean)).size,
            ramplas: new Set(rows.map(r => r.Rampla).filter(Boolean)).size,
            clientes: new Set(rows.filter(r => r.Cliente && r.Cliente !== SIN_SOLICITUD).map(r => r.Cliente)).size,
            flotaTotal: fm.size,
            ultimosTotal: um.size,
          });
          setData(rows);
          setFlota(fm);
          setUltimosMap(um);
          setLoading(false);
        } catch (e) { setError("Error: " + e.message); setLoading(false); }
      }, 100);
    };

    setLoadMsg("Descargando viajes...");
    Papa.parse(CSV_VIAJES, {
      download: true, header: true, skipEmptyLines: true,
      complete: r => { vd = r.data; setLoadMsg("Descargando flota..."); tryFinalize(); },
      error: e => { setError("Error viajes: " + e.message); setLoading(false); }
    });
    Papa.parse(CSV_FLOTA, {
      download: true, header: true, skipEmptyLines: true,
      complete: r => { fd = r.data; setLoadMsg("Descargando últimos viajes..."); tryFinalize(); },
      error: e => { setError("Error flota: " + e.message); setLoading(false); }
    });
    Papa.parse(CSV_ULTIMOS, {
      download: true, header: true, skipEmptyLines: true,
      complete: r => { ud = r.data; ultimosReady = true; tryFinalize(); },
      error: () => { ultimosReady = true; tryFinalize(); }
    });
  }, []);

  const spinStyle = "@keyframes spin{to{transform:rotate(360deg)}}";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: darkMode ? "#0a0c10" : "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", border: `3px solid ${darkMode ? "#252a36" : "#e2e8f0"}`, borderTopColor: darkMode ? "#f59e0b" : "#d97706", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: darkMode ? "#e0e4ec" : "#0f172a" }}>Cargando Dashboard Operaciones</div>
        <div style={{ fontSize: "12px", color: darkMode ? "#6b7280" : "#64748b" }}>{loadMsg}</div>
        <style>{spinStyle}</style>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: darkMode ? "#0a0c10" : "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: darkMode ? "#12151c" : "#fff", border: "1px solid #ef444444", borderRadius: "12px", padding: "32px", maxWidth: "500px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>❌</div>
        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: darkMode ? "#e0e4ec" : "#0f172a" }}>Error de Carga</div>
        <div style={{ fontSize: "12px", color: darkMode ? "#6b7280" : "#64748b" }}>{error}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.tx, fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: "13px", transition: "background 0.2s,color 0.2s" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <header style={{ background: T.sf, borderBottom: `1px solid ${T.bd}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: T.headerShadow, gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg,#f59e0b,#f97316)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "16px", color: "#000", flexShrink: 0 }}>TB</div>
          <div>
            <div style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.5px", color: T.tx }}>Dashboard Operaciones</div>
            <div style={{ fontSize: "10px", color: T.txM, letterSpacing: "2px", textTransform: "uppercase" }}>Transportes Bello</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <ThemeToggle dark={darkMode} onToggle={toggleTheme} />
        </div>
      </header>

      <div style={{ background: T.isDark ? "#0d1017" : T.sf2, borderBottom: `1px solid ${T.bd}`, padding: "6px 24px", fontSize: "10px", color: T.txM, display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "space-between" }}>
        <span>{info.total?.toLocaleString("es-CL")} tramos · {info.tractos} tractos · {info.ramplas} ramplas · {info.clientes} clientes · Flota: {info.flotaTotal} equipos{info.ultimosTotal ? " · Últimos viajes: " + info.ultimosTotal + " equipos" : ""}</span>
        <span>{info.minDate} → {info.maxDate}</span>
      </div>

      <div style={{ background: T.sf, borderBottom: `1px solid ${T.bd}`, padding: "8px 24px", overflowX: "auto" }}>
        <nav style={{ display: "flex", gap: "2px", background: T.navBg, borderRadius: "10px", padding: "3px", width: "fit-content" }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              padding: "9px 15px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "12px",
              fontWeight: view === v.id ? 700 : 500, fontFamily: "inherit",
              background: view === v.id ? T.navActiveBg : "transparent",
              color: view === v.id ? T.navActiveText : T.txM,
              transition: "all 0.15s", whiteSpace: "nowrap",
              boxShadow: view === v.id ? (T.isDark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.12)") : "none"
            }}>
              {v.icon} {v.label}
            </button>
          ))}
        </nav>
      </div>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        {view === "buscar" && <Buscador tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today} T={T} />}
        {view === "flota" && <EstadoFlota data={data} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} ultimosMap={ultimosMap} today={today} T={T} />}
        {view === "combustible" && <Combustible data={data} tractoIdx={tractoIdx} flota={flota} today={today} T={T} />}
        {view === "inactivos" && <Inactivos tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} ultimosMap={ultimosMap} today={today} T={T} />}
        {view === "clientes" && <StatsCliente data={data} today={today} T={T} />}
        {view === "rutas" && <StatsRuta data={data} today={today} T={T} />}
        {view === "detalle" && <Detalle data={data} T={T} />}
        {view === "inventario" && <Inventario flota={flota} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} ultimosMap={ultimosMap} today={today} T={T} />}
      </main>
    </div>
  );
}
