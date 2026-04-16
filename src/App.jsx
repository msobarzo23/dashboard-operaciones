import { useState, useEffect, useMemo, useCallback } from "react";
import Papa from "papaparse";

const CSV_VIAJES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv";
const CSV_FLOTA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=923646374&single=true&output=csv";
const CSV_ULTIMOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=1827964132&single=true&output=csv";

const SIN_SOLICITUD = "-Viaje sin solicitud -";

// Detección centralizada de viajes vacíos/remonta/retorno
function isVacioTrip(row) {
  if (!row) return false;
  if (row.Cliente === SIN_SOLICITUD) return true;
  if (!row.Cliente || row.Cliente.trim() === "") return true;
  const carga = (row.Carga || "").toUpperCase().trim();
  if (carga === "VACIO" || carga.startsWith("VACIO ") || carga.startsWith("VACIO(")) return true;
  return false;
}

const SUCURSAL_MAP = {
  "POZO ALMONTE": ["POZO ALMONTE","IQUIQUE","ALTO HOSPICIO","COLLAHUASI","QUEBRADA BLANCA","PICA","ARICA","PUERTO PATACHE","PUERTO IQUIQUE","NUDO URIBE","TALABRE"],
  "MEJILLONES": ["MEJILLONES"],
  "ANTOFAGASTA": ["LA NEGRA","ANTOFAGASTA","CALAMA","MINERA ESCONDIDA","MINERA ESCONDIDA LAGUNA SECA","MINERA ESCONDIDA LOS COLORADOS","MINERA ESCONDIDA OGP1","MINERA ESCONDIDA PUERTO COLOSO","SPENCE","EL ABRA","CENTINELA","SIERRA GORDA","LOMAS BAYAS","MANTOS BLANCOS","MANTOS DE LA LUNA","RADOMIRO TOMIC","MINISTRO HALES","EL TESORO","MINERA ESPERANZA","MINERA ENCUENTRO","MINERA FRANKE","MINERA MICHILLA","MINA GABY","ANTUCOYA","MINERA ANTUCOYA","CERRO DOMINADOR","PUERTO ANGAMOS","AGUA DE MAR","LA PORTADA","MARIA ELENA","PEDRO DE VALDIVIA","EL TOCO","RIO LOA","TOCOPILLA","PAMPA BLANCA","SALAR DE ATACAMA","SALAR DEL CARMEN","ELENITA","NUEVA VICTORIA","AGUAS VERDES","DOMEYKO","EL PEÑON","ZALDIVAR","MINA OESTE","BARRIAL SECO","CERRO NEGRO","COYASUR","EL SALVADOR","EHM"],
  "COPIAPO": ["COPIAPO","PAIPOTE","VALLENAR","CANDELARIA","MINA LA COIPA","MANTOS VERDES","MINERA ARQUEROS","OJOS DEL SALADO","PUNTA DE COBRE","PUCOBRE","FENIX GOLD","SALARES NORTE","MINERA GUANACO","GARITA CARRIZALILLO","PORTEZUELO","MINA TERRAEX PAIPOTE","MINERA PLEITO","ATACAMA KOZAN","MANTOVERDE","MAITENCILLO","MINERA EL CRISTO","LAS BARRANCAS","CASERONES"],
  "COQUIMBO": ["COQUIMBO","PUNTA TEATINOS","SALADILLO","LOS COLORADOS","LA SERENA","OVALLE","ANDACOLLO","ROMERAL","MINERA LOS PELAMBRES","SALAMANCA"],
  "SANTIAGO": ["SANTIAGO","QUILICURA","LAMPA","BUIN","RANCAGUA","SAN ANTONIO","SAN BERNARDO","PEÑAFLOR","PADRE HURTADO","PELDEHUE","ESTACION CENTRAL","AEROPUERTO SANTIAGO","AEROPUERTO ANTOFAGASTA","LOS ANDES","SAN FELIPE","VIÑA DEL MAR","VALPARAISO","CASABLANCA","LIMACHE","RENGO","REQUINOA","TALAGANTE","COLINA","PROVIDENCIA","FLORIDA","NOGALES","QUILLOTA","LOS BRONCES","ANDINA","EL TENIENTE","EL TENIENTE (RAJO SUR)","EL SOLDADO","MINERA VALLE CENTRAL","ALHUE","MINA EL ESPINO","SAN JAVIER","SANTA FE"]
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
function parseDate(str){if(!str)return null;if(str instanceof Date)return str;const[d,m,y]=String(str).split("/");if(!d||!m||!y)return null;return new Date(+y,+m-1,+d);}
function formatDate(d){if(!d)return "-";return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear();}
function formatDateTime(d){if(!d)return "-";return formatDate(d)+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+":"+String(d.getSeconds()).padStart(2,"0");}
function daysBetween(d1,d2){return Math.floor((d2-d1)/86400000);}
function dayKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}

function getEstadoEquipo(daysInactive) {
  if (daysInactive === null || daysInactive === undefined) return "SIN VIAJES";
  if (daysInactive <= 30) return "ACTIVO";
  if (daysInactive <= 90) return "INACTIVO";
  return "PARADO";
}
const ESTADO_COLOR = (estado, T) => ({
  "ACTIVO": T.grn,
  "INACTIVO": T.ac,
  "PARADO": T.red,
  "SIN VIAJES": T.txM,
}[estado] || T.txM);

function makeTheme(dark) {
  if (dark) return {
    bg:"#0a0c10", sf:"#12151c", sf2:"#1a1e28", bd:"#252a36",
    tx:"#e0e4ec", txM:"#6b7280", txS:"#9ca3af",
    ac:"#f59e0b", acD:"rgba(245,158,11,0.12)",
    red:"#ef4444", grn:"#22c55e", blu:"#3b82f6",
    cardShadow:"0 1px 3px rgba(0,0,0,0.4)",
    headerShadow:"0 1px 0 #252a36",
    inputBg:"#1a1e28", inputBd:"#252a36",
    navBg:"#1a1e28", navActiveBg:"#f59e0b", navActiveText:"#000",
    sucColors: SUCURSAL_COLORS_DARK,
    isDark: true,
  };
  return {
    bg:"#f0f4f8", sf:"#ffffff", sf2:"#f8fafc", bd:"#e2e8f0",
    tx:"#0f172a", txM:"#64748b", txS:"#94a3b8",
    ac:"#d97706", acD:"rgba(217,119,6,0.10)",
    red:"#dc2626", grn:"#16a34a", blu:"#2563eb",
    cardShadow:"0 1px 4px rgba(0,0,0,0.08)",
    headerShadow:"0 1px 0 #e2e8f0",
    inputBg:"#f8fafc", inputBd:"#cbd5e1",
    navBg:"#f1f5f9", navActiveBg:"#d97706", navActiveText:"#ffffff",
    sucColors: SUCURSAL_COLORS_LIGHT,
    isDark: false,
  };
}

function useSortable(data, defaultKey, defaultDir = "asc") {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);
  const toggle = useCallback((key) => {
    setSortKey(prev => {
      setSortDir(d => prev === key ? (d === "asc" ? "desc" : "asc") : "asc");
      return key;
    });
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

function SortTh({ label, col, sortKey, sortDir, toggle, style }) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => toggle(col)}
      style={{ ...style, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
    >
      {label}
      <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: "10px" }}>
        {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </th>
  );
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

function ThemeToggle({dark, onToggle}) {
  return (
    <button onClick={onToggle} title={dark?"Cambiar a tema claro":"Cambiar a tema oscuro"} style={{display:"flex",alignItems:"center",gap:"6px",padding:"7px 13px",borderRadius:"20px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:600,background:dark?"#252a36":"#e2e8f0",color:dark?"#e0e4ec":"#475569",transition:"all 0.2s",whiteSpace:"nowrap",boxShadow:dark?"0 1px 3px rgba(0,0,0,0.3)":"0 1px 2px rgba(0,0,0,0.08)"}}>
      <span style={{fontSize:"15px"}}>{dark?"☀️":"🌙"}</span>
    </button>
  );
}

// ── Botón Refrescar ──
function RefreshButton({onRefresh, loading, lastLoad, T}) {
  const segundos = lastLoad ? Math.floor((Date.now() - lastLoad) / 1000) : 0;
  const minutos = Math.floor(segundos / 60);
  const ago = segundos < 60 ? "hace " + segundos + "s" : minutos < 60 ? "hace " + minutos + "m" : "hace " + Math.floor(minutos / 60) + "h " + (minutos % 60) + "m";
  const isOld = minutos >= 5;
  return (
    <button onClick={onRefresh} disabled={loading} title={lastLoad ? "Última carga: " + formatDateTime(new Date(lastLoad)) : "Recargar datos"} style={{
      display:"flex",alignItems:"center",gap:"6px",padding:"7px 13px",borderRadius:"20px",
      border:`1px solid ${isOld?T.ac+"88":T.bd}`,cursor:loading?"wait":"pointer",
      fontSize:"11px",fontWeight:600,
      background:isOld?T.acD:(T.isDark?"#1a1e28":"#f8fafc"),
      color:isOld?T.ac:T.tx,fontFamily:"inherit",
      transition:"all 0.2s",whiteSpace:"nowrap",
      opacity:loading?.5:1,
    }}>
      <span style={{fontSize:"13px",animation:loading?"spin 1s linear infinite":"none",display:"inline-block"}}>🔄</span>
      <span>{lastLoad ? ago : "Cargar"}</span>
    </button>
  );
}

// ── Helper: obtener clave YYYY-MM de una Date ──
function getMonthKey(d) {
  if (!d) return null;
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function monthKeyToLabel(mk) {
  if (!mk) return "";
  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const [y, m] = mk.split("-");
  return MESES[parseInt(m) - 1] + " " + y;
}

// ═══ VIEW 1: BUSCADOR (min 2 chars) ═══
function Buscador({tractoIdx,ramplaIdx,flota,today,T}){
  const[q,setQ]=useState("");const[tipo,setTipo]=useState("all");
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const input={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"10px 14px",color:T.tx,fontSize:"14px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const badge=(c)=>({display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,background:`${c}22`,color:c,border:`1px solid ${c}44`});
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",fontSize:"12px",color:T.tx};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,whiteSpace:"nowrap"};

  const results=useMemo(()=>{
    const s=q.toUpperCase().trim();if(!s||s.length<2)return null;const out=[];
    if(tipo==="all"||tipo==="tracto")for(const[k,v]of tractoIdx.entries()){if(k.includes(s))out.push({t:"TRACTO",pat:k,tramos:v});}
    if(tipo==="all"||tipo==="rampla")for(const[k,v]of ramplaIdx.entries()){if(k.includes(s))out.push({t:"RAMPLA",pat:k,tramos:v});}
    return out.slice(0,20);
  },[q,tipo,tractoIdx,ramplaIdx]);

  return(<div>
    <div style={card}>
      <div style={{fontSize:"16px",fontWeight:700,marginBottom:"14px",color:T.tx}}>🔍 Buscador de Equipos</div>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        <select value={tipo} onChange={e=>setTipo(e.target.value)} style={{...sel,flexShrink:0}}>
          <option value="all">Todo</option>
          <option value="tracto">Tractos</option>
          <option value="rampla">Ramplas</option>
        </select>
        <input style={{...input,flex:1,minWidth:"200px"}} placeholder="Buscar patente (mín. 2 caracteres)..." value={q} onChange={e=>setQ(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="characters"/>
      </div>
      {!results&&<div style={{marginTop:"12px",padding:"14px",background:T.sf2,borderRadius:"8px",border:`1px dashed ${T.bd}`,textAlign:"center",color:T.txM,fontSize:"13px"}}>Ingresa al menos 2 caracteres de la patente para buscar</div>}
    </div>
    {results&&results.length===0&&<div style={{...card,textAlign:"center",color:T.txM}}>Sin resultados para "{q}"</div>}
    {results&&results.map((r,i)=>{
      const last=r.tramos[0];const d=daysBetween(last._date,today);const suc=getSucursal(last.Destino);const fi=flota.get(r.pat);
      const esSinSolicitud = last.Cliente === SIN_SOLICITUD;
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
          <div>
            <span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>ÚLTIMO VIAJE</span><br/>
            <strong style={{color:T.tx}}>{last.Origen} → {last.Destino}</strong>
            {esSinSolicitud&&<span style={{display:"inline-block",marginLeft:"6px",padding:"1px 6px",borderRadius:"4px",fontSize:"10px",background:`${T.txM}22`,color:T.txM,border:`1px solid ${T.txM}44`}}>Remonta/Vacío</span>}
          </div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>SUCURSAL</span><br/><SucBadge s={suc} T={T}/></div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{r.t==="TRACTO"?"RAMPLA":"TRACTO"}</span><br/><strong style={{color:T.tx}}>{r.t==="TRACTO"?last.Rampla:last.Tracto}</strong></div>
          <div>
            <span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>CLIENTE</span><br/>
            <span style={{color:esSinSolicitud?T.txM:T.tx}}>{esSinSolicitud?"—":last.Cliente}</span>
          </div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>CARGA</span><br/><span style={{color:T.tx}}>{last.Carga}</span></div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>KM</span><br/><span style={{color:T.tx}}>{Number(last.Kilometro||0).toLocaleString("es-CL")}</span></div>
          {fi&&<div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>TIPO EQUIPO</span><br/><span style={{color:T.tx}}>{fi.tipoequipo}</span></div>}
        </div>
        <details>
          <summary style={{cursor:"pointer",fontSize:"12px",color:T.ac,marginBottom:"8px",fontWeight:600}}>Últimos {Math.min(r.tramos.length,15)} movimientos (de {r.tramos.length} totales)</summary>
          <div style={{maxHeight:"400px",overflowY:"auto",overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
              <thead><tr>
                <th style={th}>Fecha</th><th style={th}>Origen</th><th style={th}>Destino</th>
                <th style={th}>{r.t==="TRACTO"?"Rampla":"Tracto"}</th>
                <th style={th}>Cliente</th><th style={th}>Carga</th><th style={th}>KM</th>
              </tr></thead>
              <tbody>{r.tramos.slice(0,15).map((t,j)=>{
                const sinSol = t.Cliente === SIN_SOLICITUD;
                return(
                  <tr key={j} style={{background:j%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
                    <td style={td}>{t.Fecha}</td><td style={td}>{t.Origen}</td><td style={td}>{t.Destino}</td>
                    <td style={td}>{r.t==="TRACTO"?t.Rampla:t.Tracto}</td>
                    <td style={{...td,color:sinSol?T.txM:T.tx,fontStyle:sinSol?"italic":"normal"}}>{sinSol?"Remonta/Vacío":t.Cliente}</td>
                    <td style={td}>{t.Carga}</td>
                    <td style={td}>{Number(t.Kilometro||0).toLocaleString("es-CL")}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </details>
      </div>);
    })}
  </div>);
}

// ═══ VIEW 2: ESTADO DE FLOTA (utilización diaria real + ratio cargado/vacío) ═══
function EstadoFlota({data,tractoIdx,ramplaIdx,flota,ultimosMap,today,T}){
  const[days,setDays]=useState(30);
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const tbl={width:"100%",borderCollapse:"collapse",fontSize:"12px"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx};

  const stats=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-days+1);
    cutoff.setHours(0,0,0,0);

    // Clasificar flota
    const flotaTractos=new Set();
    const flotaEquipos=new Set();
    let fT=0,fE=0,fO=0;
    for(const[pat,v]of flota.entries()){
      const c=getCategoria(v.tipoequipo);
      if(c==="TRACTOCAMION"){fT++;flotaTractos.add(pat);}
      else if(c==="EQUIPO"){fE++;flotaEquipos.add(pat);}
      else fO++;
    }

    // Lista de días del período
    const dayKeys=[];
    for(let i=0;i<days;i++){
      const d=new Date(cutoff);d.setDate(d.getDate()+i);
      dayKeys.push(dayKey(d));
    }

    // Día → Set de patentes (comercial vs total)
    const tractosComercialPorDia=new Map();
    const tractosTotalPorDia=new Map();
    const equiposComercialPorDia=new Map();
    const equiposTotalPorDia=new Map();
    dayKeys.forEach(k=>{
      tractosComercialPorDia.set(k,new Set());
      tractosTotalPorDia.set(k,new Set());
      equiposComercialPorDia.set(k,new Set());
      equiposTotalPorDia.set(k,new Set());
    });

    // Agregadores
    let totalKm=0,totalTrips=0;
    const viajesPorTractoPorDia=new Map(); // patente → Map<dayKey, count>
    const tractoKmComercial=new Map(); // para top KM
    const tractoKmVacio=new Map(); // para ratio cargado/vacío
    const tractoKmPorMarca={SCANIA:0,VOLVO:0};

    for(const row of data){
      if(!row._date||row._date<cutoff)continue;
      const dk=dayKey(row._date);
      const esVacio=isVacioTrip(row);
      const pat=row.Tracto;
      const ramp=row.Rampla;
      const km=Number(row.Kilometro)||0;

      if(!esVacio){
        totalKm+=km;
        totalTrips++;
      }

      if(pat&&flotaTractos.has(pat)){
        tractosTotalPorDia.get(dk)?.add(pat);
        if(!esVacio){
          tractosComercialPorDia.get(dk)?.add(pat);
          if(!viajesPorTractoPorDia.has(pat)) viajesPorTractoPorDia.set(pat,new Map());
          const m=viajesPorTractoPorDia.get(pat);
          m.set(dk,(m.get(dk)||0)+1);
        }
      }

      if(ramp&&flotaEquipos.has(ramp)){
        equiposTotalPorDia.get(dk)?.add(ramp);
        if(!esVacio) equiposComercialPorDia.get(dk)?.add(ramp);
      }

      // KM por tracto (comercial y vacío) — todos los tractos
      if(pat){
        if(esVacio){
          tractoKmVacio.set(pat,(tractoKmVacio.get(pat)||0)+km);
        }else{
          tractoKmComercial.set(pat,(tractoKmComercial.get(pat)||0)+km);
        }
      }
    }

    // Utilización diaria promedio
    let sumCompTractos=0,sumTotalTractos=0,sumCompEquipos=0,sumTotalEquipos=0;
    const serieTractos=[];
    for(const dk of dayKeys){
      const ct=tractosComercialPorDia.get(dk).size;
      const tt=tractosTotalPorDia.get(dk).size;
      const ce=equiposComercialPorDia.get(dk).size;
      const te=equiposTotalPorDia.get(dk).size;
      sumCompTractos+=ct;sumTotalTractos+=tt;
      sumCompEquipos+=ce;sumTotalEquipos+=te;
      serieTractos.push({day:dk,comercial:ct,total:tt});
    }
    const utilCompTractos=fT?(sumCompTractos/(days*fT)*100):0;
    const utilTotalTractos=fT?(sumTotalTractos/(days*fT)*100):0;
    const utilCompEquipos=fE?(sumCompEquipos/(days*fE)*100):0;
    const utilTotalEquipos=fE?(sumTotalEquipos/(days*fE)*100):0;

    const promTractosActivosComercial=sumCompTractos/days;
    const promTractosActivosTotal=sumTotalTractos/days;
    const promEquiposActivosComercial=sumCompEquipos/days;

    // Distribución de carga por tracto-día
    const distribucion={"0":0,"1":0,"2":0,"3+":0};
    for(const pat of flotaTractos){
      const mDias=viajesPorTractoPorDia.get(pat);
      for(const dk of dayKeys){
        const v=mDias?.get(dk)||0;
        if(v===0)distribucion["0"]++;
        else if(v===1)distribucion["1"]++;
        else if(v===2)distribucion["2"]++;
        else distribucion["3+"]++;
      }
    }

    // Top ociosos con ratio cargado/vacío
    const diasOciososTracto=[];
    for(const pat of flotaTractos){
      const mDias=viajesPorTractoPorDia.get(pat);
      let trabajados=0;
      if(mDias){
        for(const dk of dayKeys){
          if((mDias.get(dk)||0)>0)trabajados++;
        }
      }
      const ociosos=days-trabajados;
      const pctUso=(trabajados/days)*100;
      const fi=flota.get(pat);
      const kmCom=tractoKmComercial.get(pat)||0;
      const kmVac=tractoKmVacio.get(pat)||0;
      const kmTot=kmCom+kmVac;
      const pctVacio=kmTot>0?(kmVac/kmTot*100):null;
      diasOciososTracto.push({
        pat,ociosos,trabajados,pctUso,
        marca:fi?.marca||"-",modelo:fi?.modelo||"-",tipo:fi?.tipoequipo||"-",
        kmCom,kmVac,kmTot,pctVacio,
      });
    }
    diasOciososTracto.sort((a,b)=>b.ociosos-a.ociosos);

    // Equipos por sucursal (catálogo)
    const sucCount={};
    for(const pat of flotaEquipos){
      const tr=ramplaIdx.get(pat);
      let loc=null;
      if(tr?.length>0)loc=tr[0].Destino;
      else{
        const u=ultimosMap.get(pat);
        if(u)loc=u.Destino;
      }
      const sc=loc?getSucursal(loc):"OTROS";
      sucCount[sc]=(sucCount[sc]||0)+1;
    }

    // Top 10 KM
    const topT=[...tractoKmComercial.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);

    // Ratio global cargado/vacío
    let kmTotalCom=0,kmTotalVac=0;
    for(const v of tractoKmComercial.values())kmTotalCom+=v;
    for(const v of tractoKmVacio.values())kmTotalVac+=v;
    const ratioGlobalVacio=(kmTotalCom+kmTotalVac)>0?(kmTotalVac/(kmTotalCom+kmTotalVac)*100):0;

    return{
      fT,fE,fO,
      utilCompTractos,utilTotalTractos,utilCompEquipos,utilTotalEquipos,
      promTractosActivosComercial,promTractosActivosTotal,promEquiposActivosComercial,
      totalKm,totalTrips,
      sucCount,
      topT,
      serieTractos,
      distribucion,
      diasOciososTracto,
      totalR:flotaEquipos.size,
      dayKeys,
      ratioGlobalVacio,kmTotalCom,kmTotalVac,
    };
  },[data,tractoIdx,ramplaIdx,flota,ultimosMap,today,days]);

  const barColor=(pct)=>pct>=70?T.grn:pct>=40?T.ac:T.red;

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>📊 Estado de Flota</h2>
      <select value={days} onChange={e=>setDays(+e.target.value)} style={sel}>
        <option value={1}>Último día</option><option value={7}>7 días</option><option value={15}>15 días</option>
        <option value={30}>30 días</option><option value={60}>60 días</option><option value={90}>90 días</option>
      </select>
    </div>

    {/* ── UTILIZACIÓN DIARIA PROMEDIO ── */}
    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>
        📈 Utilización Diaria Promedio — últimos {days} día{days>1?"s":""}
      </div>
      <div style={{fontSize:"11px",color:T.txM,marginBottom:"16px",lineHeight:1.5}}>
        Fórmula: <strong style={{color:T.tx}}>Σ(equipos activos por día) / ({days} días × flota total)</strong> · Cada día cuenta por separado (L-D) ·
        {" "}<span style={{color:T.grn}}>Comercial</span> = con tramo facturable ·
        {" "}<span style={{color:T.blu}}>Total</span> = incluye remonta/vacío
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px"}}>
        <div>
          <div style={{fontSize:"13px",fontWeight:700,color:T.tx,marginBottom:"10px"}}>🚛 Tractocamiones <span style={{color:T.txM,fontWeight:400,fontSize:"11px"}}>({stats.fT} en flota)</span></div>

          <div style={{marginBottom:"10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",alignItems:"baseline"}}>
              <span style={{fontSize:"11px",color:T.grn,fontWeight:600}}>COMERCIAL</span>
              <span style={{fontWeight:700,color:barColor(stats.utilCompTractos),fontSize:"14px"}}>
                {stats.utilCompTractos.toFixed(1)}%
                <span style={{color:T.txM,fontWeight:400,fontSize:"11px",marginLeft:"6px"}}>
                  ~{stats.promTractosActivosComercial.toFixed(1)} activos/día
                </span>
              </span>
            </div>
            <div style={{height:"14px",background:T.sf2,borderRadius:"7px",overflow:"hidden",border:`1px solid ${T.bd}`}}>
              <div style={{height:"100%",width:Math.min(100,stats.utilCompTractos)+"%",background:`linear-gradient(90deg,${T.grn},${barColor(stats.utilCompTractos)})`,borderRadius:"7px",transition:"width 0.4s"}}/>
            </div>
          </div>

          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",alignItems:"baseline"}}>
              <span style={{fontSize:"11px",color:T.blu,fontWeight:600}}>TOTAL (c/ remonta)</span>
              <span style={{fontWeight:700,color:barColor(stats.utilTotalTractos),fontSize:"14px"}}>
                {stats.utilTotalTractos.toFixed(1)}%
                <span style={{color:T.txM,fontWeight:400,fontSize:"11px",marginLeft:"6px"}}>
                  ~{stats.promTractosActivosTotal.toFixed(1)} activos/día
                </span>
              </span>
            </div>
            <div style={{height:"10px",background:T.sf2,borderRadius:"5px",overflow:"hidden",border:`1px solid ${T.bd}`}}>
              <div style={{height:"100%",width:Math.min(100,stats.utilTotalTractos)+"%",background:`linear-gradient(90deg,${T.blu},${T.ac})`,borderRadius:"5px",transition:"width 0.4s"}}/>
            </div>
          </div>

          {stats.utilTotalTractos>stats.utilCompTractos&&(
            <div style={{marginTop:"8px",fontSize:"10px",color:T.txM,padding:"6px 10px",background:T.sf2,borderRadius:"6px",borderLeft:`3px solid ${T.ac}`}}>
              ⚠ Brecha remonta: <strong style={{color:T.ac}}>{(stats.utilTotalTractos-stats.utilCompTractos).toFixed(1)}pp</strong> de capacidad en reposicionamiento
            </div>
          )}
        </div>

        <div>
          <div style={{fontSize:"13px",fontWeight:700,color:T.tx,marginBottom:"10px"}}>🚃 Ramplas / Equipos <span style={{color:T.txM,fontWeight:400,fontSize:"11px"}}>({stats.fE} en flota)</span></div>

          <div style={{marginBottom:"10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",alignItems:"baseline"}}>
              <span style={{fontSize:"11px",color:T.grn,fontWeight:600}}>COMERCIAL</span>
              <span style={{fontWeight:700,color:barColor(stats.utilCompEquipos),fontSize:"14px"}}>
                {stats.utilCompEquipos.toFixed(1)}%
                <span style={{color:T.txM,fontWeight:400,fontSize:"11px",marginLeft:"6px"}}>
                  ~{stats.promEquiposActivosComercial.toFixed(1)} activos/día
                </span>
              </span>
            </div>
            <div style={{height:"14px",background:T.sf2,borderRadius:"7px",overflow:"hidden",border:`1px solid ${T.bd}`}}>
              <div style={{height:"100%",width:Math.min(100,stats.utilCompEquipos)+"%",background:`linear-gradient(90deg,${T.grn},${barColor(stats.utilCompEquipos)})`,borderRadius:"7px",transition:"width 0.4s"}}/>
            </div>
          </div>

          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",alignItems:"baseline"}}>
              <span style={{fontSize:"11px",color:T.blu,fontWeight:600}}>TOTAL (c/ remonta)</span>
              <span style={{fontWeight:700,color:barColor(stats.utilTotalEquipos),fontSize:"14px"}}>
                {stats.utilTotalEquipos.toFixed(1)}%
              </span>
            </div>
            <div style={{height:"10px",background:T.sf2,borderRadius:"5px",overflow:"hidden",border:`1px solid ${T.bd}`}}>
              <div style={{height:"100%",width:Math.min(100,stats.utilTotalEquipos)+"%",background:`linear-gradient(90deg,${T.blu},${T.ac})`,borderRadius:"5px",transition:"width 0.4s"}}/>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ── STATCARDS ── */}
    <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginBottom:"16px"}}>
      <StatCard T={T} icon="🛣️" value={Math.round(stats.totalKm/1000).toLocaleString("es-CL")+"K"} label="KM Comerciales" color={T.grn}/>
      <StatCard T={T} icon="📋" value={stats.totalTrips.toLocaleString("es-CL")} label="Tramos Comerciales"/>
      <StatCard T={T} icon="🔄" value={stats.ratioGlobalVacio.toFixed(1)+"%"} label="KM Vacío / Total" color={stats.ratioGlobalVacio>25?T.red:stats.ratioGlobalVacio>15?T.ac:T.grn}/>
      <StatCard T={T} icon="🏢" value={stats.fT+stats.fE+stats.fO} label="Flota Total"/>
      <StatCard T={T} icon="🔧" value={stats.fO} label="Otros (camiones, grúas)"/>
    </div>

    {/* ── TENDENCIA DIARIA ── */}
    {days>1&&(
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>
          📉 Tendencia Diaria — Tractocamiones Activos
        </div>
        <div style={{fontSize:"11px",color:T.txM,marginBottom:"14px"}}>
          Cada barra es un día · Verde = comerciales · Azul = remonta · Línea punteada = flota total ({stats.fT})
        </div>
        <TendenciaDiaria serie={stats.serieTractos} flotaTotal={stats.fT} T={T}/>
      </div>
    )}

    {/* ── DISTRIBUCIÓN DE CARGA + EQUIPOS POR SUCURSAL ── */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>
          📊 Distribución de Carga por Tracto/Día
        </div>
        <div style={{fontSize:"11px",color:T.txM,marginBottom:"14px"}}>
          De los {(stats.fT*days).toLocaleString("es-CL")} casos (tracto × día), cuántos viajes comerciales se hicieron
        </div>
        {Object.entries(stats.distribucion).map(([k,v])=>{
          const total=stats.fT*days;
          const pct=total?(v/total*100):0;
          const color=k==="0"?T.red:k==="1"?T.ac:k==="2"?T.blu:T.grn;
          const etiqueta=k==="0"?"Ociosos (0 viajes)":k==="1"?"1 viaje":k==="2"?"2 viajes":"3 o más viajes";
          return(
            <div key={k} style={{marginBottom:"8px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",fontSize:"12px"}}>
                <span style={{color:T.tx,fontWeight:600}}>{etiqueta}</span>
                <span style={{color:T.txM}}>
                  <strong style={{color}}>{v.toLocaleString("es-CL")}</strong> ({pct.toFixed(1)}%)
                </span>
              </div>
              <div style={{height:"10px",background:T.sf2,borderRadius:"5px",overflow:"hidden",border:`1px solid ${T.bd}`}}>
                <div style={{height:"100%",width:pct+"%",background:color,borderRadius:"5px",transition:"width 0.3s"}}/>
              </div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>🗺️ Equipos por Sucursal (última ubicación)</div>
        {Object.entries(stats.sucCount).sort((a,b)=>b[1]-a[1]).map(([sc,c])=>{
          const pct=stats.totalR?(c/stats.totalR*100).toFixed(1):0;
          return(<div key={sc} style={{marginBottom:"8px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
              <SucBadge s={sc} T={T}/>
              <span style={{fontSize:"12px",color:T.txM}}>{c+" ("+pct+"%)"}</span>
            </div>
            <div style={{height:"6px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`}}>
              <div style={{height:"100%",width:pct+"%",background:T.sucColors[sc]?.accent||"#666",borderRadius:"3px"}}/>
            </div>
          </div>);
        })}
      </div>
    </div>

    {/* ── TRACTOS MÁS OCIOSOS (con ratio vacío) + TOP KM ── */}
    <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:"16px",marginTop:"16px"}}>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>
          😴 Top 15 Tractos Más Ociosos
        </div>
        <div style={{fontSize:"11px",color:T.txM,marginBottom:"12px"}}>
          Días sin viaje comercial · % uso y % KM vacío en últimos {days} días
        </div>
        <div style={{maxHeight:"480px",overflowY:"auto"}}>
          <table style={tbl}>
            <thead><tr>
              <th style={th}>Tracto</th>
              <th style={{...th,textAlign:"right"}}>Ocios.</th>
              <th style={{...th,textAlign:"right"}}>% Uso</th>
              <th style={{...th,textAlign:"right"}}>% Vacío</th>
              <th style={th}>Marca</th>
            </tr></thead>
            <tbody>{stats.diasOciososTracto.slice(0,15).map((r,i)=>{
              const cUso=r.pctUso<20?T.red:r.pctUso<50?T.ac:T.grn;
              const cVac=r.pctVacio===null?T.txM:r.pctVacio>30?T.red:r.pctVacio>15?T.ac:T.grn;
              return(
                <tr key={r.pat} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
                  <td style={{...td,fontWeight:700}}>{r.pat}</td>
                  <td style={{...td,textAlign:"right",color:cUso,fontWeight:700}}>{r.ociosos}/{days}</td>
                  <td style={{...td,textAlign:"right",color:cUso,fontWeight:600}}>{r.pctUso.toFixed(0)}%</td>
                  <td style={{...td,textAlign:"right",color:cVac,fontWeight:600}}>{r.pctVacio!==null?r.pctVacio.toFixed(0)+"%":"—"}</td>
                  <td style={{...td,fontSize:"11px",color:T.txM}}>{r.marca}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>

      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>🏆 Top 10 Tractos por KM</div>
        <div style={{fontSize:"11px",color:T.txM,marginBottom:"12px"}}>
          KM comerciales en los últimos {days} días
        </div>
        <table style={tbl}>
          <thead><tr><th style={th}>#</th><th style={th}>Tracto</th><th style={{...th,textAlign:"right"}}>KM</th></tr></thead>
          <tbody>{stats.topT.map(([t,km],i)=>(
            <tr key={t} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={td}>{i+1}</td>
              <td style={{...td,fontWeight:700}}>{t}</td>
              <td style={{...td,textAlign:"right",fontWeight:600}}>{km.toLocaleString("es-CL")}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  </div>);
}

// Sub-componente: gráfico de tendencia diaria
function TendenciaDiaria({serie,flotaTotal,T}){
  const maxVal=Math.max(flotaTotal,...serie.map(d=>d.total),1);
  const H=140;
  const barW=Math.max(6,Math.min(24,Math.floor(700/serie.length)-2));
  const gap=2;
  const totalW=serie.length*(barW+gap);

  return(
    <div style={{overflowX:"auto",paddingBottom:"8px"}}>
      <div style={{position:"relative",minWidth:totalW+"px",height:(H+40)+"px"}}>
        <div style={{
          position:"absolute",left:0,right:0,
          top:(H-(flotaTotal/maxVal)*H)+"px",
          height:"1px",background:T.txM,
          borderTop:`1px dashed ${T.txM}`,
        }}/>
        <div style={{
          position:"absolute",
          top:(H-(flotaTotal/maxVal)*H-14)+"px",right:"4px",
          fontSize:"9px",color:T.txM,background:T.sf,padding:"1px 5px",borderRadius:"3px",
        }}>flota: {flotaTotal}</div>
        <div style={{display:"flex",alignItems:"flex-end",height:H+"px",gap:gap+"px"}}>
          {serie.map((d)=>{
            const hComercial=(d.comercial/maxVal)*H;
            const hRemonta=((d.total-d.comercial)/maxVal)*H;
            const fecha=d.day.slice(8,10)+"/"+d.day.slice(5,7);
            return(
              <div key={d.day} style={{width:barW+"px",display:"flex",flexDirection:"column",justifyContent:"flex-end",position:"relative"}} title={`${fecha}: ${d.comercial} comerciales, ${d.total} total`}>
                {hRemonta>0&&<div style={{height:hRemonta+"px",background:T.blu,opacity:0.5,borderRadius:"2px 2px 0 0"}}/>}
                <div style={{height:hComercial+"px",background:T.grn,borderRadius:hRemonta>0?"0":"2px 2px 0 0"}}/>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:gap+"px",marginTop:"6px",fontSize:"9px",color:T.txM}}>
          {serie.map((d,i)=>{
            const step=serie.length>30?7:serie.length>14?3:1;
            if(i%step!==0&&i!==serie.length-1)return <div key={d.day} style={{width:barW+"px"}}/>;
            const fecha=d.day.slice(8,10)+"/"+d.day.slice(5,7);
            return <div key={d.day} style={{width:barW+"px",textAlign:"center",whiteSpace:"nowrap"}}>{fecha}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

// ═══ PDF PRINT HELPER ═══
function printReporte(rows, tipo, filtroEstado, filtroSuc, today) {
  const fecha = formatDate(today);
  const tipoLabel = tipo === "tracto" ? "Tractocamiones" : "Ramplas / Equipos";
  const estadoLabel = filtroEstado === "todos" ? "Todos" : filtroEstado;
  const sucLabel = filtroSuc === "todas" ? "Todas las sucursales" : filtroSuc;
  const EC = { "ACTIVO":"#16a34a","INACTIVO":"#d97706","PARADO":"#dc2626","SIN VIAJES":"#94a3b8" };
  const filas = rows.map((r, i) => {
    const ec = EC[r.estado] || "#64748b";
    const esSinSol = r.lastRecord?.Cliente === SIN_SOLICITUD;
    return `<tr style="background:${i%2===0?"#fff":"#f8fafc"}">
      <td>${r.pat}</td>
      <td style="color:${ec};font-weight:700">${r.days !== null ? r.days + "d" : "—"}</td>
      <td>${r.lastRecord?.Fecha || "—"}</td>
      <td>${r.lastRecord?.Destino || "—"}${esSinSol?' <span style="font-size:9px;color:#94a3b8">(remonta)</span>':''}</td>
      <td>${r.suc}</td>
      <td><span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:${ec}18;color:${ec};border:1px solid ${ec}44">${r.estado}</span></td>
      <td>${r.fi?.tipoequipo || "—"}</td>
    </tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Equipos ${estadoLabel} – ${sucLabel}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm 12mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #0f172a; margin: 0; }
    .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; margin-bottom: 12px; }
    .logo { width: 36px; height: 36px; background: linear-gradient(135deg,#f59e0b,#f97316); border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 15px; color: #000; margin-right: 10px; }
    .tit { font-size: 17px; font-weight: 700; }
    .sub { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; }
    .meta { font-size: 10px; color: #475569; text-align: right; line-height: 1.9; }
    .chips { display: flex; gap: 10px; margin-bottom: 12px; }
    .chip { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 20px; padding: 3px 12px; font-size: 10px; color: #475569; }
    .chip strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; text-align: left; padding: 7px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; border-bottom: 2px solid #cbd5e1; white-space: nowrap; }
    td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; vertical-align: middle; }
    .footer { position: fixed; bottom: 6mm; left: 12mm; right: 12mm; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 3px; display: flex; justify-content: space-between; }
  </style></head><body>
  <div class="hdr">
    <div style="display:flex;align-items:center">
      <div class="logo">TB</div>
      <div><div class="tit">Reporte de Equipos</div><div class="sub">Transportes Bello e Hijos Ltda.</div></div>
    </div>
    <div class="meta">
      <div><strong>Fecha:</strong> ${fecha}</div>
      <div><strong>Total:</strong> ${rows.length} equipos</div>
    </div>
  </div>
  <div class="chips">
    <div class="chip"><strong>Tipo:</strong> ${tipoLabel}</div>
    <div class="chip"><strong>Estado:</strong> ${estadoLabel}</div>
    <div class="chip"><strong>Sucursal:</strong> ${sucLabel}</div>
  </div>
  <table>
    <thead><tr>
      <th>Patente</th><th>Días</th><th>Último Mov.</th><th>Destino</th>
      <th>Sucursal</th><th>Estado</th><th>Tipo Equipo</th>
    </tr></thead>
    <tbody>${filas}</tbody>
  </table>
  <div class="footer">
    <span>Transportes Bello e Hijos Ltda. · Dashboard Operaciones</span>
    <span>${tipoLabel} · ${estadoLabel} · ${sucLabel} · ${fecha}</span>
  </div>
  </body></html>`;
  const win = window.open("", "_blank", "width=1100,height=800");
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}

// ═══ VIEW 3: INACTIVOS (con contador de equipos ocultos) ═══
function Inactivos({tractoIdx,ramplaIdx,flota,ultimosMap,today,T}){
  const[tipo,setTipo]=useState("rampla");
  const[filtroEstado,setFiltroEstado]=useState("todos");
  const[filtroSuc,setFiltroSuc]=useState("todas");
  const[soloDoc,setSoloDoc]=useState(true);
  const[pg,setPg]=useState(1);
  const PP=100;

  const thStyle={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,zIndex:1};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const badge=(c)=>({display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,background:`${c}22`,color:c,border:`1px solid ${c}44`});

  // Calcula TODOS los equipos (catálogo + fuera de catálogo) para saber cuántos quedan ocultos con el filtro soloDoc
  const {todosEquipos, equiposOcultos} = useMemo(()=>{
    const idx = tipo==="tracto" ? tractoIdx : ramplaIdx;
    const enCatalogoArr = [];
    const fueraCatalogoArr = [];
    for(const[pat,fi] of flota.entries()){
      const cat = getCategoria(fi.tipoequipo);
      if(tipo==="tracto" && cat!=="TRACTOCAMION") continue;
      if(tipo==="rampla" && cat!=="EQUIPO") continue;
      const tr = idx.get(pat);
      let lastDate=null, lastRecord=null;
      if(tr&&tr.length>0){ lastDate=tr[0]._date; lastRecord=tr[0]; }
      const u=ultimosMap.get(pat);
      if(u&&(!lastDate||u._date>lastDate)){
        lastDate=u._date;
        lastRecord={Fecha:formatDate(u._date),Destino:u.Destino,Origen:u.Origen,Cliente:u.Cliente,Tracto:pat,Rampla:pat,_fromUltimos:true};
      }
      const days=lastDate?daysBetween(lastDate,today):null;
      const estado=getEstadoEquipo(days);
      const esSinSol = lastRecord?.Cliente === SIN_SOLICITUD;
      enCatalogoArr.push({pat,days,lastRecord,suc:lastRecord?getSucursal(lastRecord.Destino):"OTROS",fi,estado,enCatalogo:true,"lastRecord.Fecha":lastRecord?.Fecha||"","fi.tipoequipo":fi.tipoequipo||"",esSinSol});
    }
    for(const[pat,tr] of idx.entries()){
      if(flota.has(pat)) continue;
      const lastDate=tr[0]._date;
      const days=daysBetween(lastDate,today);
      const last=tr[0];
      const estado=getEstadoEquipo(days);
      const esSinSol = last.Cliente === SIN_SOLICITUD;
      fueraCatalogoArr.push({pat,days,lastRecord:last,suc:getSucursal(last.Destino),fi:null,estado,enCatalogo:false,"lastRecord.Fecha":last.Fecha||"","fi.tipoequipo":"",esSinSol});
    }
    return {
      todosEquipos: soloDoc ? enCatalogoArr : [...enCatalogoArr, ...fueraCatalogoArr],
      equiposOcultos: soloDoc ? fueraCatalogoArr.length : 0,
    };
  },[tractoIdx,ramplaIdx,flota,ultimosMap,today,tipo,soloDoc]);

  const estadoCount=useMemo(()=>{
    const m={ACTIVO:0,INACTIVO:0,PARADO:0,"SIN VIAJES":0,total:0};
    for(const r of todosEquipos){
      if(!r.enCatalogo) continue;
      m.total++;
      m[r.estado]=(m[r.estado]||0)+1;
    }
    return m;
  },[todosEquipos]);

  const sucursales=useMemo(()=>[...new Set(todosEquipos.map(r=>r.suc))].sort(),[todosEquipos]);

  const filtered=useMemo(()=>{
    let f=todosEquipos;
    if(filtroEstado!=="todos") f=f.filter(r=>r.estado===filtroEstado);
    if(filtroSuc!=="todas") f=f.filter(r=>r.suc===filtroSuc);
    return f;
  },[todosEquipos,filtroEstado,filtroSuc]);

  const {sorted,sortKey,sortDir,toggle}=useSortable(filtered,"days","desc");
  const totalP=Math.ceil(sorted.length/PP);
  const pd=sorted.slice((pg-1)*PP,pg*PP);

  useEffect(()=>setPg(1),[filtroEstado,filtroSuc,tipo,soloDoc]);

  const estadoBtns=[
    {key:"todos",label:"Todos",count:estadoCount.total,color:T.tx},
    {key:"ACTIVO",label:"Activos",count:estadoCount.ACTIVO,color:T.grn},
    {key:"INACTIVO",label:"Inactivos",count:estadoCount.INACTIVO,color:T.ac},
    {key:"PARADO",label:"Parados",count:estadoCount.PARADO,color:T.red},
    {key:"SIN VIAJES",label:"Sin viajes",count:estadoCount["SIN VIAJES"],color:T.txM},
  ];

  const btnPag=(onClick,disabled,label)=>(
    <button onClick={onClick} disabled={disabled} style={{padding:"5px 9px",borderRadius:"6px",border:`1px solid ${T.bd}`,background:T.sf2,color:T.tx,cursor:"pointer",fontSize:"11px",opacity:disabled?.3:1,fontFamily:"inherit"}}>{label}</button>
  );

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>⚠️ Estado de Equipos</h2>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
        <select value={filtroSuc} onChange={e=>setFiltroSuc(e.target.value)} style={sel}>
          <option value="todas">Todas las sucursales</option>
          {sucursales.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={tipo} onChange={e=>setTipo(e.target.value)} style={sel}>
          <option value="rampla">Ramplas / Equipos</option>
          <option value="tracto">Tractocamiones</option>
        </select>
        <button onClick={()=>setSoloDoc(d=>!d)} style={{
          display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",
          borderRadius:"8px",border:`2px solid ${soloDoc?T.grn:T.bd}`,
          background:soloDoc?`${T.grn}12`:T.sf,cursor:"pointer",
          fontSize:"11px",fontWeight:600,color:soloDoc?T.grn:T.txM,fontFamily:"inherit",
          transition:"all 0.15s",
        }}>
          <span style={{fontSize:"14px"}}>{soloDoc?"✅":"☑️"}</span>
          Solo en documentación
        </button>
      </div>
    </div>

    <div style={{background:soloDoc?`${T.grn}0a`:`${T.ac}0a`,border:`1px solid ${soloDoc?T.grn:T.ac}33`,borderRadius:"10px",padding:"8px 16px",marginBottom:"14px",fontSize:"11px",color:T.txM,display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap"}}>
      <span style={{fontSize:"14px"}}>{soloDoc?"📋":"🔍"}</span>
      {soloDoc
        ? <span>Mostrando solo equipos <strong style={{color:T.tx}}>registrados en el catálogo de flota</strong>. {equiposOcultos>0 && <>
            <span style={{color:T.ac,fontWeight:600}}>⚠ {equiposOcultos} equipos con viajes pero fuera de catálogo están ocultos</span>
            {" "}<button onClick={()=>setSoloDoc(false)} style={{background:"none",border:"none",color:T.ac,textDecoration:"underline",cursor:"pointer",fontSize:"11px",fontWeight:600,padding:0,fontFamily:"inherit"}}>(mostrar todos)</button>
          </>}</span>
        : <span>Mostrando <strong style={{color:T.tx}}>todos</strong> incluyendo equipos con viajes pero <strong style={{color:T.ac}}>sin registro en catálogo</strong> (subcontratos, dados de baja, etc).</span>
      }
    </div>

    <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"16px"}}>
      {estadoBtns.map(b=>{
        const active=filtroEstado===b.key;
        return(
          <button key={b.key} onClick={()=>setFiltroEstado(b.key)} style={{
            display:"flex",flexDirection:"column",alignItems:"center",padding:"12px 20px",
            borderRadius:"12px",border:`2px solid ${active?b.color:T.bd}`,
            background:active?`${b.color}18`:T.sf,
            cursor:"pointer",transition:"all 0.15s",minWidth:"100px",fontFamily:"inherit",
            boxShadow:active?`0 0 0 1px ${b.color}44`:T.cardShadow,
          }}>
            <span style={{fontSize:"22px",fontWeight:700,color:b.color,lineHeight:1.2}}>{b.count.toLocaleString("es-CL")}</span>
            <span style={{fontSize:"10px",color:active?b.color:T.txM,marginTop:"4px",textTransform:"uppercase",letterSpacing:"1px",fontWeight:active?700:400}}>{b.label}</span>
          </button>
        );
      })}
    </div>

    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
        <span style={{fontSize:"12px",color:T.txM}}>
          <strong style={{color:T.tx}}>{sorted.length.toLocaleString("es-CL")}</strong> equipos
          {filtroEstado!=="todos"&&<span style={{color:T.ac}}> · {filtroEstado}</span>}
          {filtroSuc!=="todas"&&<span style={{color:T.ac}}> · {filtroSuc}</span>}
          {" · Click columna = ordenar"}
        </span>
        <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap"}}>
          {totalP>1&&<>
            {btnPag(()=>setPg(1),pg===1,"«")}
            {btnPag(()=>setPg(p=>Math.max(1,p-1)),pg===1,"‹")}
            <span style={{fontSize:"11px",color:T.txM,padding:"0 6px"}}>{pg}/{totalP} · {((pg-1)*PP+1)}–{Math.min(pg*PP,sorted.length)} de {sorted.length}</span>
            {btnPag(()=>setPg(p=>Math.min(totalP,p+1)),pg===totalP,"›")}
            {btnPag(()=>setPg(totalP),pg===totalP,"»")}
          </>}
          <button onClick={()=>printReporte(sorted,tipo,filtroEstado,filtroSuc,today)} style={{
            display:"flex",alignItems:"center",gap:"6px",padding:"7px 14px",
            borderRadius:"8px",border:`1px solid ${T.red}44`,
            background:`${T.red}12`,color:T.red,cursor:"pointer",
            fontSize:"11px",fontWeight:700,fontFamily:"inherit",
            boxShadow:`0 1px 3px ${T.red}22`,transition:"all 0.15s",
          }}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <SortTh label="Patente" col="pat" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Días" col="days" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Último Mov." col="lastRecord.Fecha" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <th style={thStyle}>Destino</th>
            <SortTh label="Sucursal" col="suc" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Estado" col="estado" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <th style={thStyle}>{tipo==="tracto"?"Rampla":"Tracto"}</th>
            <th style={thStyle}>Cliente</th>
            <SortTh label="Tipo Equipo" col="fi.tipoequipo" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            {!soloDoc&&<SortTh label="Catálogo" col="enCatalogo" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>}
          </tr></thead>
          <tbody>{pd.map((r,i)=>{
            const ec=ESTADO_COLOR(r.estado,T);
            return(<tr key={r.pat} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={{...td,fontWeight:700}}>{r.pat}</td>
              <td style={{...td,color:ec,fontWeight:600}}>{r.days!==null?r.days+"d":"—"}</td>
              <td style={td}>{r.lastRecord?.Fecha||"—"}</td>
              <td style={td}>
                {r.lastRecord?.Destino||"—"}
                {r.esSinSol&&<span style={{marginLeft:"4px",fontSize:"9px",color:T.txM,fontStyle:"italic"}}>(remonta)</span>}
              </td>
              <td style={td}><SucBadge s={r.suc} T={T}/></td>
              <td style={td}><span style={badge(ec)}>{r.estado}</span></td>
              <td style={td}>{tipo==="tracto"?r.lastRecord?.Rampla:r.lastRecord?.Tracto}</td>
              <td style={{...td,color:r.esSinSol?T.txM:T.tx,fontStyle:r.esSinSol?"italic":"normal"}}>{r.esSinSol?"—":r.lastRecord?.Cliente||"—"}</td>
              <td style={td}>{r.fi?.tipoequipo||"—"}</td>
              {!soloDoc&&<td style={td}><span style={badge(r.enCatalogo?T.grn:T.txM)}>{r.enCatalogo?"Sí":"No"}</span></td>}
            </tr>);
          })}</tbody>
        </table>
      </div>

      {totalP>1&&(
        <div style={{display:"flex",gap:"4px",alignItems:"center",justifyContent:"center",marginTop:"12px"}}>
          {btnPag(()=>setPg(1),pg===1,"«")}
          {btnPag(()=>setPg(p=>Math.max(1,p-1)),pg===1,"‹")}
          {Array.from({length:Math.min(7,totalP)},(_,i)=>{
            let p;
            if(totalP<=7) p=i+1;
            else if(pg<=4) p=i+1;
            else if(pg>=totalP-3) p=totalP-6+i;
            else p=pg-3+i;
            if(p<1||p>totalP) return null;
            return(<button key={p} onClick={()=>setPg(p)} style={{padding:"6px 10px",borderRadius:"6px",border:`1px solid ${p===pg?T.ac:T.bd}`,background:p===pg?T.acD:T.sf2,color:p===pg?T.ac:T.tx,cursor:"pointer",fontSize:"11px",fontWeight:p===pg?700:400,fontFamily:"inherit"}}>{p}</button>);
          })}
          {btnPag(()=>setPg(p=>Math.min(totalP,p+1)),pg===totalP,"›")}
          {btnPag(()=>setPg(totalP),pg===totalP,"»")}
        </div>
      )}
    </div>
  </div>);
}

// ═══ VIEW NUEVA: EFICIENCIA POR TRACTO (ratio cargado/vacío detallado) ═══
function EficienciaTracto({data,flota,today,T}){
  const[months,setMonths]=useState(1);
  const[filtroMarca,setFiltroMarca]=useState("todas");
  const[filtroSuc,setFiltroSuc]=useState("todas");
  const[minKm,setMinKm]=useState(500);
  const[pg,setPg]=useState(1);
  const PP=50;

  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};

  const stats=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);
    const porTracto=new Map(); // pat → {kmCom, kmVac, tramosCom, tramosVac, ultimaSuc, marca}
    for(const row of data){
      if(!row._date||row._date<cutoff)continue;
      const pat=row.Tracto;
      if(!pat)continue;
      const km=Number(row.Kilometro)||0;
      const esVacio=isVacioTrip(row);
      if(!porTracto.has(pat)){
        const fi=flota.get(pat);
        const marca=(fi?.marca||"").toUpperCase().trim();
        porTracto.set(pat,{
          pat,kmCom:0,kmVac:0,tramosCom:0,tramosVac:0,
          ultimaSuc:getSucursal(row.Destino),
          ultimaFecha:row._date,
          marca:marca.includes("SCANIA")?"SCANIA":marca.includes("VOLVO")?"VOLVO":marca||"—",
          modelo:fi?.modelo||"—",
          anio:fi?.fecha||"—",
          enCatalogo:!!fi,
        });
      }
      const t=porTracto.get(pat);
      if(row._date>t.ultimaFecha){
        t.ultimaFecha=row._date;
        t.ultimaSuc=getSucursal(row.Destino);
      }
      if(esVacio){t.kmVac+=km;t.tramosVac++;}
      else{t.kmCom+=km;t.tramosCom++;}
    }
    const arr=[];
    for(const t of porTracto.values()){
      const kmTotal=t.kmCom+t.kmVac;
      if(kmTotal<minKm)continue;
      const pctVacio=kmTotal>0?(t.kmVac/kmTotal*100):0;
      arr.push({...t,kmTotal,pctVacio,tramosTotal:t.tramosCom+t.tramosVac});
    }
    return arr;
  },[data,flota,today,months,minKm]);

  const sucursales=useMemo(()=>[...new Set(stats.map(r=>r.ultimaSuc))].sort(),[stats]);
  const marcas=useMemo(()=>[...new Set(stats.map(r=>r.marca))].sort(),[stats]);

  const filtered=useMemo(()=>{
    let f=stats;
    if(filtroMarca!=="todas") f=f.filter(r=>r.marca===filtroMarca);
    if(filtroSuc!=="todas") f=f.filter(r=>r.ultimaSuc===filtroSuc);
    return f;
  },[stats,filtroMarca,filtroSuc]);

  const {sorted,sortKey,sortDir,toggle}=useSortable(filtered,"pctVacio","desc");
  const totalP=Math.ceil(sorted.length/PP);
  const pd=sorted.slice((pg-1)*PP,pg*PP);
  useEffect(()=>setPg(1),[filtroMarca,filtroSuc,months,minKm]);

  // Resumen global filtrado
  const resumen=useMemo(()=>{
    const kmCom=filtered.reduce((s,r)=>s+r.kmCom,0);
    const kmVac=filtered.reduce((s,r)=>s+r.kmVac,0);
    const pctVacio=(kmCom+kmVac)>0?(kmVac/(kmCom+kmVac)*100):0;
    // Distribución por tramos de eficiencia
    const buckets={excelente:0,bueno:0,regular:0,critico:0};
    filtered.forEach(r=>{
      if(r.pctVacio<=10)buckets.excelente++;
      else if(r.pctVacio<=20)buckets.bueno++;
      else if(r.pctVacio<=35)buckets.regular++;
      else buckets.critico++;
    });
    return{kmCom,kmVac,pctVacio,buckets,total:filtered.length};
  },[filtered]);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>⚖️ Eficiencia por Tracto</h2>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        <select value={months} onChange={e=>setMonths(+e.target.value)} style={sel}>
          <option value={1}>1 mes</option><option value={2}>2 meses</option><option value={3}>3 meses</option><option value={6}>6 meses</option>
        </select>
        <select value={filtroMarca} onChange={e=>setFiltroMarca(e.target.value)} style={sel}>
          <option value="todas">Todas marcas</option>
          {marcas.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroSuc} onChange={e=>setFiltroSuc(e.target.value)} style={sel}>
          <option value="todas">Todas sucursales</option>
          {sucursales.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={minKm} onChange={e=>setMinKm(+e.target.value)} style={sel}>
          <option value={0}>Todos</option>
          <option value={500}>Min. 500km</option>
          <option value={2000}>Min. 2.000km</option>
          <option value={5000}>Min. 5.000km</option>
        </select>
      </div>
    </div>

    <div style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"10px",padding:"10px 16px",marginBottom:"14px",fontSize:"11px",color:T.txM}}>
      <strong style={{color:T.tx}}>Criterio:</strong>
      {" "}<span style={{color:T.grn}}>● ≤10% excelente</span>
      {" · "}<span style={{color:T.blu}}>● 11-20% bueno</span>
      {" · "}<span style={{color:T.ac}}>● 21-35% regular</span>
      {" · "}<span style={{color:T.red}}>● {">"}35% crítico</span>
      {" · % Vacío = km de remonta / km totales del tracto"}
    </div>

    <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginBottom:"16px"}}>
      <StatCard T={T} icon="🚛" value={resumen.total} label="Tractos analizados"/>
      <StatCard T={T} icon="🛣️" value={Math.round(resumen.kmCom/1000).toLocaleString("es-CL")+"K"} label="KM Comercial" color={T.grn}/>
      <StatCard T={T} icon="🔄" value={Math.round(resumen.kmVac/1000).toLocaleString("es-CL")+"K"} label="KM Vacío" color={T.ac}/>
      <StatCard T={T} icon="📊" value={resumen.pctVacio.toFixed(1)+"%"} label="% Vacío Global" color={resumen.pctVacio>25?T.red:resumen.pctVacio>15?T.ac:T.grn}/>
    </div>

    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>📊 Distribución de Eficiencia</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
        {[
          {k:"excelente",label:"Excelente (≤10%)",color:T.grn},
          {k:"bueno",label:"Bueno (11-20%)",color:T.blu},
          {k:"regular",label:"Regular (21-35%)",color:T.ac},
          {k:"critico",label:"Crítico (>35%)",color:T.red},
        ].map(b=>{
          const n=resumen.buckets[b.k];
          const pct=resumen.total>0?(n/resumen.total*100):0;
          return(
            <div key={b.k} style={{background:T.sf2,borderRadius:"8px",padding:"14px",border:`1px solid ${b.color}33`,borderLeft:`4px solid ${b.color}`}}>
              <div style={{fontSize:"24px",fontWeight:700,color:b.color}}>{n}</div>
              <div style={{fontSize:"11px",color:T.txM,marginTop:"2px"}}>{b.label}</div>
              <div style={{fontSize:"11px",color:T.tx,marginTop:"4px",fontWeight:600}}>{pct.toFixed(1)}% de flota</div>
            </div>
          );
        })}
      </div>
    </div>

    <div style={card}>
      <div style={{marginBottom:"8px",fontSize:"11px",color:T.txM}}>
        <strong style={{color:T.tx}}>{sorted.length}</strong> tractos · Click columna para ordenar · Ordenado por mayor % vacío (los más ineficientes arriba)
      </div>
      <div style={{overflowX:"auto",maxHeight:"600px",overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <SortTh label="Tracto" col="pat" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="Marca" col="marca" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="Sucursal" col="ultimaSuc" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="KM Com." col="kmCom" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="KM Vacío" col="kmVac" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="KM Total" col="kmTotal" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="% Vacío" col="pctVacio" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <th style={{...th,textAlign:"center"}}>Distribución</th>
            <SortTh label="Tramos" col="tramosTotal" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
          </tr></thead>
          <tbody>{pd.map((r,i)=>{
            const c=r.pctVacio<=10?T.grn:r.pctVacio<=20?T.blu:r.pctVacio<=35?T.ac:T.red;
            const pctCom=100-r.pctVacio;
            return(
              <tr key={r.pat} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
                <td style={{...td,fontWeight:700}}>{r.pat}</td>
                <td style={td}>{r.marca}</td>
                <td style={td}><SucBadge s={r.ultimaSuc} T={T}/></td>
                <td style={{...td,textAlign:"right",color:T.grn,fontWeight:600}}>{r.kmCom.toLocaleString("es-CL")}</td>
                <td style={{...td,textAlign:"right",color:T.ac,fontWeight:600}}>{r.kmVac.toLocaleString("es-CL")}</td>
                <td style={{...td,textAlign:"right",fontWeight:700}}>{r.kmTotal.toLocaleString("es-CL")}</td>
                <td style={{...td,textAlign:"right",color:c,fontWeight:700}}>{r.pctVacio.toFixed(1)}%</td>
                <td style={{...td,textAlign:"center"}}>
                  <div style={{display:"inline-flex",height:"8px",width:"100px",borderRadius:"4px",overflow:"hidden",border:`1px solid ${T.bd}`,background:T.sf2}}>
                    <div style={{width:pctCom+"%",background:T.grn}} title={"Comercial: "+pctCom.toFixed(1)+"%"}/>
                    <div style={{width:r.pctVacio+"%",background:c}} title={"Vacío: "+r.pctVacio.toFixed(1)+"%"}/>
                  </div>
                </td>
                <td style={{...td,textAlign:"right"}}>{r.tramosTotal}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <Pager T={T} page={pg} total={totalP} set={setPg}/>
    </div>
  </div>);
}

// ═══ VIEW 4: POR CLIENTE ═══
function StatsCliente({data,today,T}){
  const[months,setMonths]=useState(1);const[sortBy,setSortBy]=useState("km");
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const thStyle={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};

  const {rawStats, vacioStats, totalKmConVacios} = useMemo(()=>{
    const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);
    const allFiltered = months===99 ? data : data.filter(d=>d._date>=cutoff);
    const vacios = allFiltered.filter(d => isVacioTrip(d));
    const vacioKm = vacios.reduce((s, d) => s + (Number(d.Kilometro) || 0), 0);
    const vacioTramos = vacios.length;
    const rutasVacias = {};
    vacios.forEach(d => {
      const k = d.Origen + " → " + d.Destino;
      if (!rutasVacias[k]) rutasVacias[k] = {ruta: k, km: 0, count: 0};
      rutasVacias[k].km += Number(d.Kilometro) || 0;
      rutasVacias[k].count++;
    });
    const topRutasVacias = Object.values(rutasVacias).sort((a, b) => b.km - a.km).slice(0, 5);
    const filtered = allFiltered.filter(d => !isVacioTrip(d));
    const byC={};
    filtered.forEach(d=>{const c=d.Cliente;if(!byC[c])byC[c]={cliente:c,km:0,tramos:0,sols:new Set(),cargas:{}};byC[c].km+=Number(d.Kilometro)||0;byC[c].tramos++;if(d.Solicitud)byC[c].sols.add(d.Solicitud);const cg=d.Carga?.trim();if(cg&&!/^\d+$/.test(cg))byC[c].cargas[cg]=(byC[c].cargas[cg]||0)+1;});
    const clienteStats = Object.values(byC).map(c=>({...c,sols:c.sols.size,topCargas:Object.entries(c.cargas).sort((a,b)=>b[1]-a[1]).slice(0,3)}));
    const totalConVacios = clienteStats.reduce((s, c) => s + c.km, 0) + vacioKm;
    return {
      rawStats: clienteStats,
      vacioStats: {km: vacioKm, tramos: vacioTramos, topRutas: topRutasVacias},
      totalKmConVacios: totalConVacios,
    };
  },[data,today,months]);

  const{sorted,sortKey,sortDir,toggle}=useSortable(rawStats,sortBy,"desc");
  const totalKmClientes=rawStats.reduce((s,c)=>s+c.km,0);
  const pctVacio = totalKmConVacios > 0 ? (vacioStats.km / totalKmConVacios * 100) : 0;

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>🏢 Estadísticas por Cliente</h2>
      <select value={months} onChange={e=>setMonths(+e.target.value)} style={sel}><option value={1}>1 mes</option><option value={2}>2 meses</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>1 año</option><option value={99}>Todo</option></select>
    </div>

    {vacioStats.tramos > 0 && (
      <div style={{
        background: T.isDark ? "#1a1820" : "#fefce8",
        border: `1px solid ${T.isDark ? "#3d3520" : "#fde68a"}`,
        borderLeft: `4px solid ${T.ac}`,
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "16px",
        boxShadow: T.cardShadow,
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"16px"}}>
          <div style={{flex:"1",minWidth:"280px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
              <span style={{fontSize:"18px"}}>🔄</span>
              <span style={{fontSize:"15px",fontWeight:700,color:T.tx}}>KM Vacíos / Retorno</span>
              <span style={{
                padding:"3px 10px",borderRadius:"20px",fontSize:"10px",fontWeight:700,
                background:`${T.ac}22`,color:T.ac,border:`1px solid ${T.ac}44`,
              }}>No incluidos en el ranking</span>
            </div>
            <div style={{fontSize:"11px",color:T.txM,marginBottom:"14px",lineHeight:1.6}}>
              Viajes de remonta y retorno vacío (sin cliente asignado). Estos kilómetros representan el costo operacional
              de reposicionamiento de equipos y no se contabilizan en el ranking de clientes.
            </div>
            <div style={{display:"flex",gap:"20px",flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>KM VACÍOS</div>
                <div style={{fontSize:"24px",fontWeight:700,color:T.ac}}>{vacioStats.km.toLocaleString("es-CL")}</div>
              </div>
              <div>
                <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>TRAMOS</div>
                <div style={{fontSize:"24px",fontWeight:700,color:T.tx}}>{vacioStats.tramos.toLocaleString("es-CL")}</div>
              </div>
              <div>
                <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>% DEL KM TOTAL</div>
                <div style={{fontSize:"24px",fontWeight:700,color:pctVacio > 30 ? T.red : T.ac}}>{pctVacio.toFixed(1)}%</div>
              </div>
              <div>
                <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>KM PROM./TRAMO</div>
                <div style={{fontSize:"24px",fontWeight:700,color:T.txS}}>{vacioStats.tramos > 0 ? Math.round(vacioStats.km / vacioStats.tramos).toLocaleString("es-CL") : "—"}</div>
              </div>
            </div>
          </div>

          <div style={{minWidth:"200px",flex:"0 0 240px"}}>
            <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"8px"}}>DISTRIBUCIÓN KM TOTAL</div>
            <div style={{height:"24px",background:T.sf2,borderRadius:"8px",overflow:"hidden",border:`1px solid ${T.bd}`,display:"flex"}}>
              <div style={{height:"100%",width:((totalKmClientes / totalKmConVacios) * 100)+"%",background:`linear-gradient(90deg,${T.grn},${T.blu})`,transition:"width 0.3s"}} title="KM Comerciales"/>
              <div style={{height:"100%",width:(pctVacio)+"%",background:`repeating-linear-gradient(45deg,${T.ac},${T.ac} 4px,${T.ac}88 4px,${T.ac}88 8px)`,transition:"width 0.3s"}} title="KM Vacíos"/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:"6px",fontSize:"10px",color:T.txM}}>
              <span><span style={{display:"inline-block",width:"8px",height:"8px",borderRadius:"2px",background:T.grn,marginRight:"4px",verticalAlign:"middle"}}/>Comercial ({(100 - pctVacio).toFixed(1)}%)</span>
              <span><span style={{display:"inline-block",width:"8px",height:"8px",borderRadius:"2px",background:T.ac,marginRight:"4px",verticalAlign:"middle"}}/>Vacío ({pctVacio.toFixed(1)}%)</span>
            </div>

            {vacioStats.topRutas.length > 0 && (
              <div style={{marginTop:"14px"}}>
                <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"6px"}}>TOP RUTAS VACÍAS</div>
                {vacioStats.topRutas.map((r, i) => (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontSize:"11px",borderBottom:i < vacioStats.topRutas.length - 1 ? `1px solid ${T.bd}` : "none"}}>
                    <span style={{color:T.tx,maxWidth:"160px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.ruta}</span>
                    <span style={{color:T.txM,whiteSpace:"nowrap",marginLeft:"8px"}}>{r.km.toLocaleString("es-CL")} km</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    <div style={card}>
      <div style={{marginBottom:"8px",fontSize:"11px",color:T.txM}}>Click en columna para ordenar · Excluye viajes de remonta/vacío · % calculado sobre KM comerciales</div>
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <th style={thStyle}>#</th>
            <SortTh label="Cliente" col="cliente" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="KM Total" col="km" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <th style={thStyle}>%</th>
            <SortTh label="Tramos" col="tramos" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Solicitudes" col="sols" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <th style={thStyle}>Cargas Ppales.</th>
          </tr></thead>
          <tbody>{sorted.map((c,i)=>(
            <tr key={c.cliente} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={td}>{i+1}</td>
              <td style={{...td,fontWeight:600,maxWidth:"250px",overflow:"hidden",textOverflow:"ellipsis"}}>{c.cliente}</td>
              <td style={{...td,fontWeight:600}}>{c.km.toLocaleString("es-CL")}</td>
              <td style={td}>
                <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                  <div style={{width:"60px",height:"5px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`}}>
                    <div style={{height:"100%",width:(totalKmClientes?(c.km/totalKmClientes*100):0)+"%",background:T.ac,borderRadius:"3px"}}/>
                  </div>
                  <span style={{color:T.txM}}>{totalKmClientes?(c.km/totalKmClientes*100).toFixed(1):0}%</span>
                </div>
              </td>
              <td style={td}>{c.tramos.toLocaleString("es-CL")}</td>
              <td style={td}>{c.sols.toLocaleString("es-CL")}</td>
              <td style={td}>{c.topCargas.map(([cg,n])=>(<span key={cg} style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"2px 8px",borderRadius:"20px",fontSize:"11px",background:T.acD,color:T.ac,marginRight:"4px"}}>{cg} ({n})</span>))}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  </div>);
}

// ═══ VIEW 5: POR RUTA ═══
function StatsRuta({data,today,T}){
  const[months,setMonths]=useState(1);const[minTrips,setMinTrips]=useState(5);
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const thStyle={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};

  const rawStats=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);
    const filtered=(months===99?data:data.filter(d=>d._date>=cutoff))
      .filter(d=>d.Cliente!==SIN_SOLICITUD);
    const byR={};
    filtered.forEach(d=>{const k=d.Origen+" → "+d.Destino;if(!byR[k])byR[k]={ruta:k,o:d.Origen,d:d.Destino,km:0,count:0,cls:new Set(),cargas:{}};byR[k].km+=Number(d.Kilometro)||0;byR[k].count++;byR[k].cls.add(d.Cliente);const cg=d.Carga?.trim();if(cg&&!/^\d+$/.test(cg))byR[k].cargas[cg]=(byR[k].cargas[cg]||0)+1;});
    return Object.values(byR).filter(r=>r.count>=minTrips).map(r=>({...r,avg:Math.round(r.km/r.count),cls:r.cls.size,topCarga:Object.entries(r.cargas).sort((a,b)=>b[1]-a[1])[0]?.[0]||"-"}));
  },[data,today,months,minTrips]);

  const{sorted,sortKey,sortDir,toggle}=useSortable(rawStats,"count","desc");

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>🛤️ Estadísticas por Ruta</h2>
      <div style={{display:"flex",gap:"8px"}}>
        <select value={months} onChange={e=>setMonths(+e.target.value)} style={sel}><option value={1}>1 mes</option><option value={2}>2 meses</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={99}>Todo</option></select>
        <select value={minTrips} onChange={e=>setMinTrips(+e.target.value)} style={sel}><option value={1}>Min.1</option><option value={5}>Min.5</option><option value={10}>Min.10</option><option value={20}>Min.20</option><option value={50}>Min.50</option></select>
      </div>
    </div>
    <div style={card}>
      <div style={{marginBottom:"8px",fontSize:"11px",color:T.txM}}>Click en columna para ordenar · Excluye viajes de remonta/vacío</div>
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <th style={thStyle}>#</th>
            <SortTh label="Ruta" col="ruta" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <th style={thStyle}>Suc. O-D</th>
            <SortTh label="Viajes" col="count" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="KM Total" col="km" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="KM Prom." col="avg" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Clientes" col="cls" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <th style={thStyle}>Carga Ppal.</th>
          </tr></thead>
          <tbody>{sorted.slice(0,80).map((r,i)=>(
            <tr key={r.ruta} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={td}>{i+1}</td>
              <td style={{...td,fontWeight:600}}>{r.ruta}</td>
              <td style={td}><SucBadge s={getSucursal(r.o)} T={T}/> → <SucBadge s={getSucursal(r.d)} T={T}/></td>
              <td style={{...td,fontWeight:600,color:T.ac}}>{r.count}</td>
              <td style={td}>{r.km.toLocaleString("es-CL")}</td>
              <td style={td}>{r.avg.toLocaleString("es-CL")}</td>
              <td style={td}>{r.cls}</td>
              <td style={td}>{r.topCarga}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  </div>);
}

// ═══ VIEW 6: DETALLE TRAMOS ═══
function Detalle({data,T}){
  const[fd,setFd]=useState("");const[fh,setFh]=useState("");const[cl,setCl]=useState("");const[tr,setTr]=useState("");const[ra,setRa]=useState("");const[or,setOr]=useState("");const[de,setDe]=useState("");const[cg,setCg]=useState("");const[pg,setPg]=useState(1);const pp=50;
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const input={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"10px 14px",color:T.tx,fontSize:"14px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const thStyle={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};

  const dataFiltrada = useMemo(()=>data.filter(d=>d.Cliente!==SIN_SOLICITUD),[data]);

  const cls=useMemo(()=>[...new Set(dataFiltrada.map(d=>d.Cliente))].sort(),[dataFiltrada]);
  const cgs=useMemo(()=>[...new Set(dataFiltrada.map(d=>d.Carga?.trim()).filter(c=>c&&!/^\d+$/.test(c)))].sort(),[dataFiltrada]);

  const filtered=useMemo(()=>{
    const dateFrom = fd ? new Date(fd) : null;
    let dateTo = null;
    if (fh) { dateTo = new Date(fh); dateTo.setDate(dateTo.getDate() + 1); }
    const trUp = tr ? tr.toUpperCase() : null;
    const raUp = ra ? ra.toUpperCase() : null;
    const orUp = or ? or.toUpperCase() : null;
    const deUp = de ? de.toUpperCase() : null;
    return dataFiltrada.filter(r => {
      if (dateFrom && r._date < dateFrom) return false;
      if (dateTo && r._date >= dateTo) return false;
      if (cl && r.Cliente !== cl) return false;
      if (trUp && !r.Tracto?.toUpperCase().includes(trUp)) return false;
      if (raUp && !r.Rampla?.toUpperCase().includes(raUp)) return false;
      if (orUp && !r.Origen?.toUpperCase().includes(orUp)) return false;
      if (deUp && !r.Destino?.toUpperCase().includes(deUp)) return false;
      if (cg && r.Carga !== cg) return false;
      return true;
    });
  },[dataFiltrada,fd,fh,cl,tr,ra,or,de,cg]);

  const{sorted,sortKey,sortDir,toggle}=useSortable(filtered,"_date","desc");
  const totalP=Math.ceil(sorted.length/pp);const pd=sorted.slice((pg-1)*pp,pg*pp);
  const totalKm=useMemo(()=>filtered.reduce((s,d)=>s+(Number(d.Kilometro)||0),0),[filtered]);
  useEffect(()=>setPg(1),[fd,fh,cl,tr,ra,or,de,cg]);

  return(<div>
    <h2 style={{margin:"0 0 16px",fontSize:"16px",color:T.tx}}>📋 Detalle de Tramos</h2>
    <div style={card}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:"8px"}}>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>DESDE</label><input type="date" value={fd} onChange={e=>setFd(e.target.value)} style={input}/></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>HASTA</label><input type="date" value={fh} onChange={e=>setFh(e.target.value)} style={input}/></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>CLIENTE</label><select value={cl} onChange={e=>setCl(e.target.value)} style={{...input,padding:"9px 12px"}}><option value="">Todos</option>{cls.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>TRACTO</label><input value={tr} onChange={e=>setTr(e.target.value)} placeholder="Filtrar..." style={input}/></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>RAMPLA</label><input value={ra} onChange={e=>setRa(e.target.value)} placeholder="Filtrar..." style={input}/></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>ORIGEN</label><input value={or} onChange={e=>setOr(e.target.value)} placeholder="Filtrar..." style={input}/></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>DESTINO</label><input value={de} onChange={e=>setDe(e.target.value)} placeholder="Filtrar..." style={input}/></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>CARGA</label><select value={cg} onChange={e=>setCg(e.target.value)} style={{...input,padding:"9px 12px"}}><option value="">Todas</option>{cgs.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
      </div>
    </div>
    <div style={{display:"flex",gap:"16px",marginBottom:"16px",flexWrap:"wrap"}}>
      <div style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"5px 12px",borderRadius:"20px",fontSize:"12px",fontWeight:600,background:T.acD,color:T.ac,border:`1px solid ${T.ac}44`}}>{filtered.length.toLocaleString("es-CL")} tramos</div>
      <div style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"5px 12px",borderRadius:"20px",fontSize:"12px",fontWeight:600,background:"rgba(34,197,94,0.1)",color:T.grn,border:`1px solid ${T.grn}44`}}>{totalKm.toLocaleString("es-CL")} km</div>
      <div style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"5px 12px",borderRadius:"20px",fontSize:"12px",fontWeight:600,background:"rgba(59,130,246,0.1)",color:T.blu,border:`1px solid ${T.blu}44`}}>{new Set(filtered.map(d=>d.Solicitud)).size.toLocaleString("es-CL")} solicitudes</div>
    </div>
    <div style={card}>
      <div style={{marginBottom:"8px",fontSize:"11px",color:T.txM}}>Click en columna para ordenar</div>
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <SortTh label="Fecha" col="_date" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <th style={thStyle}>Solicitud</th>
            <SortTh label="Cliente" col="Cliente" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Tracto" col="Tracto" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Rampla" col="Rampla" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Origen" col="Origen" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Destino" col="Destino" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="KM" col="Kilometro" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <th style={thStyle}>Carga</th>
          </tr></thead>
          <tbody>{pd.map((d,i)=>(
            <tr key={d.Expedicion+"-"+i} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={td}>{d.Fecha}</td><td style={td}>{d.Solicitud}</td>
              <td style={{...td,maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis"}}>{d.Cliente}</td>
              <td style={{...td,fontWeight:600}}>{d.Tracto}</td><td style={{...td,fontWeight:600}}>{d.Rampla}</td>
              <td style={td}>{d.Origen}</td><td style={td}>{d.Destino}</td>
              <td style={td}>{Number(d.Kilometro||0).toLocaleString("es-CL")}</td>
              <td style={td}>{d.Carga}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Pager T={T} page={pg} total={totalP} set={setPg}/>
    </div>
  </div>);
}

// ═══ VIEW 7: INVENTARIO ═══
function Inventario({flota,tractoIdx,ramplaIdx,ultimosMap,today,T}){
  const[filtTipo,setFiltTipo]=useState("");const[filtYear,setFiltYear]=useState("");const[filtMarca,setFiltMarca]=useState("");const[filtCat,setFiltCat]=useState("");const[filtEstado,setFiltEstado]=useState("");const[pg,setPg]=useState(1);const pp=50;
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const input={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"9px 12px",color:T.tx,fontSize:"13px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const thStyle={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const badge=(c)=>({display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,background:`${c}22`,color:c,border:`1px solid ${c}44`});

  const flotaArr=useMemo(()=>{const arr=[];
    for(const[pat,v]of flota.entries()){
      const cat=getCategoria(v.tipoequipo);
      const tramos=tractoIdx.get(pat)||ramplaIdx.get(pat);
      let lastTrip=tramos?tramos[0]:null;
      let lastDate=lastTrip?lastTrip._date:null;
      const u=ultimosMap.get(pat);
      if(u&&(!lastDate||u._date>lastDate)){
        lastDate=u._date;
        lastTrip={Fecha:formatDate(u._date),Destino:u.Destino,Origen:u.Origen,Cliente:u.Cliente,_fromUltimos:true};
      }
      const daysI=lastDate?daysBetween(lastDate,today):null;
      const age=v.fecha?(today.getFullYear()-parseInt(v.fecha)):null;
      const estado=getEstadoEquipo(daysI);
      const esSinSol = lastTrip?.Cliente === SIN_SOLICITUD;
      arr.push({pat,...v,cat,lastTrip,daysI,age,estado,esSinSol});
    }
    return arr;
  },[flota,tractoIdx,ramplaIdx,ultimosMap,today]);

  const tipos=useMemo(()=>[...new Set(flotaArr.map(f=>f.tipoequipo))].sort(),[flotaArr]);
  const years=useMemo(()=>[...new Set(flotaArr.map(f=>f.fecha).filter(Boolean))].sort(),[flotaArr]);
  const marcas=useMemo(()=>[...new Set(flotaArr.map(f=>f.marca).filter(Boolean))].sort(),[flotaArr]);
  const filtered=useMemo(()=>{let f=flotaArr;if(filtTipo)f=f.filter(r=>r.tipoequipo===filtTipo);if(filtYear)f=f.filter(r=>r.fecha===filtYear);if(filtMarca)f=f.filter(r=>r.marca===filtMarca);if(filtCat)f=f.filter(r=>r.cat===filtCat);if(filtEstado)f=f.filter(r=>r.estado===filtEstado);return f;},[flotaArr,filtTipo,filtYear,filtMarca,filtCat,filtEstado]);
  useEffect(()=>setPg(1),[filtTipo,filtYear,filtMarca,filtCat,filtEstado]);

  const{sorted,sortKey,sortDir,toggle}=useSortable(filtered,"daysI","desc");
  const totalP=Math.ceil(sorted.length/pp);const pd=sorted.slice((pg-1)*pp,pg*pp);

  const summary=useMemo(()=>{const byYear={};const byEstado={};let totalAge=0,ageCount=0;
    filtered.forEach(f=>{if(f.fecha)byYear[f.fecha]=(byYear[f.fecha]||0)+1;byEstado[f.estado]=(byEstado[f.estado]||0)+1;if(f.age!==null){totalAge+=f.age;ageCount++;}});
    return{byYear:Object.entries(byYear).sort((a,b)=>a[0].localeCompare(b[0])),byEstado,avgAge:ageCount?(totalAge/ageCount).toFixed(1):"-"};},[filtered]);

  const byTypeEntries = useMemo(() => {
    const byT = {};
    filtered.forEach(f => { byT[f.tipoequipo] = (byT[f.tipoequipo] || 0) + 1; });
    return Object.entries(byT).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  return(<div>
    <h2 style={{margin:"0 0 16px",fontSize:"16px",color:T.tx}}>🏗️ Inventario de Flota</h2>
    <div style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"10px",padding:"10px 16px",marginBottom:"12px",fontSize:"11px",color:T.txM}}>
      <strong style={{color:T.tx}}>Criterio estado:</strong>
      {" "}<span style={{color:T.grn}}>● ACTIVO</span> ≤30d sin viaje
      {" · "}<span style={{color:T.ac}}>● INACTIVO</span> 31–90d
      {" · "}<span style={{color:T.red}}>● PARADO</span> +90d
      {" · "}<span style={{color:T.txM}}>● SIN VIAJES</span> sin historial
      {" · Incluye viajes de remonta/vacío para determinar última ubicación"}
    </div>
    <div style={card}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"8px"}}>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>CATEGORÍA</label><select value={filtCat} onChange={e=>setFiltCat(e.target.value)} style={input}><option value="">Todas</option><option value="TRACTOCAMION">Tractocamiones</option><option value="EQUIPO">Equipos</option><option value="OTRO">Otros</option></select></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>TIPO EQUIPO</label><select value={filtTipo} onChange={e=>setFiltTipo(e.target.value)} style={input}><option value="">Todos</option>{tipos.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>AÑO</label><select value={filtYear} onChange={e=>setFiltYear(e.target.value)} style={input}><option value="">Todos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>MARCA</label><select value={filtMarca} onChange={e=>setFiltMarca(e.target.value)} style={input}><option value="">Todas</option>{marcas.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>ESTADO</label><select value={filtEstado} onChange={e=>setFiltEstado(e.target.value)} style={input}><option value="">Todos</option><option value="ACTIVO">Activo (≤30d)</option><option value="INACTIVO">Inactivo (31-90d)</option><option value="PARADO">Parado (+90d)</option><option value="SIN VIAJES">Sin viajes</option></select></div>
      </div>
    </div>
    <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginBottom:"16px"}}>
      <StatCard T={T} icon="📦" value={filtered.length} label="Equipos" color={T.ac}/>
      <StatCard T={T} icon="📅" value={summary.avgAge+" años"} label="Antigüedad Promedio" color={T.blu}/>
      <StatCard T={T} icon="✅" value={summary.byEstado["ACTIVO"]||0} label="Activos (≤30d)" color={T.grn}/>
      <StatCard T={T} icon="⏸️" value={(summary.byEstado["INACTIVO"]||0)} label="Inactivos (31-90d)" color={T.ac}/>
      <StatCard T={T} icon="🛑" value={(summary.byEstado["PARADO"]||0)} label="Parados (+90d)" color={T.red}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginBottom:"16px"}}>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>📅 Distribución por Año</div>
        <div style={{maxHeight:"300px",overflowY:"auto"}}>
          {summary.byYear.map(([y,c])=>{const pct=(c/filtered.length*100);const age=today.getFullYear()-parseInt(y);return(<div key={y} style={{marginBottom:"6px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px",fontSize:"12px"}}>
              <span style={{color:T.tx}}><strong>{y}</strong> <span style={{color:T.txM}}>({age} años)</span></span>
              <span style={{color:T.txM}}>{c} equipos</span>
            </div>
            <div style={{height:"6px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`}}>
              <div style={{height:"100%",width:pct+"%",background:age>10?T.red:age>6?T.ac:T.grn,borderRadius:"3px"}}/>
            </div>
          </div>);})}
        </div>
      </div>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>🏷️ Por Tipo de Equipo</div>
        <div style={{maxHeight:"300px",overflowY:"auto"}}>
          {byTypeEntries.map(([t,c])=>{
            const pct=(c/filtered.length*100);
            return(<div key={t} style={{marginBottom:"6px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px",fontSize:"12px"}}>
                <span style={{color:T.tx}}>{t}</span><span style={{fontWeight:600,color:T.tx}}>{c}</span>
              </div>
              <div style={{height:"6px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`}}>
                <div style={{height:"100%",width:pct+"%",background:T.ac,borderRadius:"3px"}}/>
              </div>
            </div>);
          })}
        </div>
      </div>
    </div>
    <div style={card}>
      <div style={{marginBottom:"8px",fontSize:"11px",color:T.txM}}>Click en columna para ordenar · {sorted.length} equipos</div>
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <SortTh label="Patente" col="pat" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Categoría" col="cat" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Tipo" col="tipoequipo" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Marca" col="marca" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Modelo" col="modelo" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Año" col="fecha" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Antigüedad" col="age" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Estado" col="estado" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Días" col="daysI" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <th style={thStyle}>Último Destino</th>
            <SortTh label="Última Fecha" col="lastTrip.Fecha" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
          </tr></thead>
          <tbody>{pd.map((f,i)=>{const ec=ESTADO_COLOR(f.estado,T);return(
            <tr key={f.pat} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={{...td,fontWeight:700}}>{f.pat}</td>
              <td style={td}><span style={badge(f.cat==="TRACTOCAMION"?T.blu:f.cat==="EQUIPO"?T.ac:T.txM)}>{f.cat}</span></td>
              <td style={td}>{f.tipoequipo}</td><td style={td}>{f.marca}</td><td style={td}>{f.modelo}</td><td style={td}>{f.fecha}</td>
              <td style={{...td,color:f.age>10?T.red:f.age>6?T.ac:T.grn,fontWeight:600}}>{f.age!==null?f.age+" años":"-"}</td>
              <td style={td}><span style={badge(ec)}>{f.estado}</span></td>
              <td style={{...td,color:ec,fontWeight:600}}>{f.daysI!==null?f.daysI+"d":"—"}</td>
              <td style={td}>
                {f.lastTrip?.Destino||"-"}
                {f.esSinSol&&<span style={{marginLeft:"4px",fontSize:"9px",color:T.txM,fontStyle:"italic"}}>(remonta)</span>}
              </td>
              <td style={td}>{f.lastTrip?.Fecha||"-"}</td>
            </tr>
          );})}
          </tbody>
        </table>
      </div>
      <Pager T={T} page={pg} total={totalP} set={setPg}/>
    </div>
  </div>);
}

// ═══ VIEW 8: COMPARACIÓN MES ═══
function ComparacionMes({data, today, T}) {
  const card = {background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel = {background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const thStyle = {textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td = {padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};

  const availableMonths = useMemo(() => {
    const set = new Set();
    for (const r of data) {
      const mk = getMonthKey(r._date);
      if (mk) set.add(mk);
    }
    return [...set].sort().reverse();
  }, [data]);

  const [mesA, setMesA] = useState(() => availableMonths[1] || "");
  const [mesB, setMesB] = useState(() => availableMonths[0] || "");
  const [vistaDetalle, setVistaDetalle] = useState("clientes");

  const calcStats = useCallback((rows) => {
    const real = rows.filter(r => r.Cliente !== SIN_SOLICITUD);
    const km = real.reduce((s, r) => s + (Number(r.Kilometro) || 0), 0);
    const tramos = real.length;
    const solicitudes = new Set(real.map(r => r.Solicitud).filter(Boolean)).size;
    const tractos = new Set(real.map(r => r.Tracto).filter(Boolean)).size;
    const ramplas = new Set(real.map(r => r.Rampla).filter(Boolean)).size;
    const clientes = new Set(real.map(r => r.Cliente).filter(Boolean)).size;
    const byCliente = {};
    real.forEach(r => {
      const c = r.Cliente;
      if (!byCliente[c]) byCliente[c] = {km: 0, tramos: 0};
      byCliente[c].km += Number(r.Kilometro) || 0;
      byCliente[c].tramos++;
    });
    const bySuc = {};
    real.forEach(r => {
      const s = getSucursal(r.Destino);
      if (!bySuc[s]) bySuc[s] = {km: 0, tramos: 0};
      bySuc[s].km += Number(r.Kilometro) || 0;
      bySuc[s].tramos++;
    });
    const byRuta = {};
    real.forEach(r => {
      const k = r.Origen + " → " + r.Destino;
      if (!byRuta[k]) byRuta[k] = {km: 0, tramos: 0};
      byRuta[k].km += Number(r.Kilometro) || 0;
      byRuta[k].tramos++;
    });
    const kmPromedio = tramos > 0 ? Math.round(km / tramos) : 0;
    return {km, tramos, solicitudes, tractos, ramplas, clientes, kmPromedio, byCliente, bySuc, byRuta, totalRows: rows.length};
  }, []);

  const statsA = useMemo(() => {
    if (!mesA) return null;
    return calcStats(data.filter(r => getMonthKey(r._date) === mesA));
  }, [data, mesA, calcStats]);

  const statsB = useMemo(() => {
    if (!mesB) return null;
    return calcStats(data.filter(r => getMonthKey(r._date) === mesB));
  }, [data, mesB, calcStats]);

  const delta = (a, b) => {
    if (!a || !b || b === 0) return null;
    return ((a - b) / Math.abs(b) * 100);
  };

  const DeltaBadge = ({val}) => {
    if (val === null || val === undefined || !isFinite(val)) return <span style={{color:T.txM,fontSize:"11px"}}>—</span>;
    const pos = val >= 0;
    const color = pos ? T.grn : T.red;
    return (
      <span style={{display:"inline-flex",alignItems:"center",gap:"2px",padding:"2px 8px",borderRadius:"20px",fontSize:"11px",fontWeight:700,background:`${color}18`,color,border:`1px solid ${color}44`}}>
        {pos ? "▲" : "▼"} {Math.abs(val).toFixed(1)}%
      </span>
    );
  };

  const CompBar = ({valA, valB, maxVal, colorA, colorB}) => {
    const pA = maxVal > 0 ? (valA / maxVal * 100) : 0;
    const pB = maxVal > 0 ? (valB / maxVal * 100) : 0;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"3px",width:"100%",minWidth:"80px"}}>
        <div style={{height:"6px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`,overflow:"hidden"}}>
          <div style={{height:"100%",width:pA+"%",background:colorA,borderRadius:"3px",transition:"width 0.3s"}}/>
        </div>
        <div style={{height:"6px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`,overflow:"hidden"}}>
          <div style={{height:"100%",width:pB+"%",background:colorB,borderRadius:"3px",transition:"width 0.3s"}}/>
        </div>
      </div>
    );
  };

  const detalleData = useMemo(() => {
    if (!statsA || !statsB) return [];
    let mapA, mapB;
    if (vistaDetalle === "clientes") { mapA = statsA.byCliente; mapB = statsB.byCliente; }
    else if (vistaDetalle === "sucursales") { mapA = statsA.bySuc; mapB = statsB.bySuc; }
    else { mapA = statsA.byRuta; mapB = statsB.byRuta; }
    const keys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    const arr = [];
    for (const k of keys) {
      const a = mapA[k] || {km: 0, tramos: 0};
      const b = mapB[k] || {km: 0, tramos: 0};
      arr.push({
        nombre: k,
        kmA: a.km, kmB: b.km,
        tramosA: a.tramos, tramosB: b.tramos,
        deltaKm: delta(b.km, a.km),
        deltaTramos: delta(b.tramos, a.tramos),
      });
    }
    arr.sort((a, b) => (b.kmB + b.kmA) - (a.kmB + a.kmA));
    return arr.slice(0, 40);
  }, [statsA, statsB, vistaDetalle]);

  const metrics = statsA && statsB ? [
    {label:"KM Totales",icon:"🛣️",vA:statsA.km,vB:statsB.km,fmt:v=>v.toLocaleString("es-CL")},
    {label:"Tramos",icon:"📋",vA:statsA.tramos,vB:statsB.tramos,fmt:v=>v.toLocaleString("es-CL")},
    {label:"Solicitudes",icon:"📝",vA:statsA.solicitudes,vB:statsB.solicitudes,fmt:v=>v.toLocaleString("es-CL")},
    {label:"Tractos Activos",icon:"🚛",vA:statsA.tractos,vB:statsB.tractos,fmt:v=>v.toLocaleString("es-CL")},
    {label:"Equipos Activos",icon:"🚃",vA:statsA.ramplas,vB:statsB.ramplas,fmt:v=>v.toLocaleString("es-CL")},
    {label:"Clientes",icon:"🏢",vA:statsA.clientes,vB:statsB.clientes,fmt:v=>v.toLocaleString("es-CL")},
    {label:"KM Promedio/Tramo",icon:"📐",vA:statsA.kmPromedio,vB:statsB.kmPromedio,fmt:v=>v.toLocaleString("es-CL")},
  ] : [];

  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>📅 Comparación por Mes</h2>
      <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          <span style={{fontSize:"11px",color:T.txM,fontWeight:600}}>MES A</span>
          <select value={mesA} onChange={e => setMesA(e.target.value)} style={{...sel,borderColor:T.blu,color:T.blu}}>
            {availableMonths.map(m => <option key={m} value={m}>{monthKeyToLabel(m)}</option>)}
          </select>
        </div>
        <span style={{color:T.txM,fontWeight:700}}>vs</span>
        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          <span style={{fontSize:"11px",color:T.txM,fontWeight:600}}>MES B</span>
          <select value={mesB} onChange={e => setMesB(e.target.value)} style={{...sel,borderColor:T.ac,color:T.ac}}>
            {availableMonths.map(m => <option key={m} value={m}>{monthKeyToLabel(m)}</option>)}
          </select>
        </div>
      </div>
    </div>

    <div style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"10px",padding:"8px 16px",marginBottom:"14px",fontSize:"11px",color:T.txM,display:"flex",alignItems:"center",gap:"8px"}}>
      <span style={{fontSize:"14px"}}>💡</span>
      <span>
        <span style={{display:"inline-block",width:"10px",height:"10px",borderRadius:"2px",background:T.blu,marginRight:"4px",verticalAlign:"middle"}}/>
        <strong style={{color:T.blu}}>Mes A</strong> ({monthKeyToLabel(mesA)})
        {" vs "}
        <span style={{display:"inline-block",width:"10px",height:"10px",borderRadius:"2px",background:T.ac,marginRight:"4px",verticalAlign:"middle"}}/>
        <strong style={{color:T.ac}}>Mes B</strong> ({monthKeyToLabel(mesB)})
        {" · Δ% = variación de A → B · Excluye viajes de remonta/vacío"}
      </span>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px",marginBottom:"16px"}}>
      {metrics.map(m => {
        const d = delta(m.vB, m.vA);
        return (
          <div key={m.label} style={{...card,marginBottom:0,padding:"16px"}}>
            <div style={{fontSize:"11px",color:T.txM,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.8px"}}>{m.icon} {m.label}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"6px"}}>
              <div>
                <div style={{fontSize:"11px",color:T.blu,fontWeight:600}}>{m.fmt(m.vA)}</div>
                <div style={{fontSize:"11px",color:T.ac,fontWeight:600}}>{m.fmt(m.vB)}</div>
              </div>
              <DeltaBadge val={d}/>
            </div>
            <CompBar valA={m.vA} valB={m.vB} maxVal={Math.max(m.vA, m.vB)} colorA={T.blu} colorB={T.ac}/>
          </div>
        );
      })}
    </div>

    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
        <div style={{fontSize:"14px",fontWeight:600,color:T.tx}}>📊 Detalle Comparativo</div>
        <div style={{display:"flex",gap:"4px"}}>
          {[{k:"clientes",l:"Clientes",ic:"🏢"},{k:"sucursales",l:"Sucursales",ic:"🗺️"},{k:"rutas",l:"Rutas",ic:"🛤️"}].map(o => (
            <button key={o.k} onClick={() => setVistaDetalle(o.k)} style={{
              padding:"7px 14px",borderRadius:"8px",border:`1px solid ${vistaDetalle===o.k?T.ac:T.bd}`,
              background:vistaDetalle===o.k?T.acD:T.sf2,color:vistaDetalle===o.k?T.ac:T.txM,
              cursor:"pointer",fontSize:"11px",fontWeight:vistaDetalle===o.k?700:400,fontFamily:"inherit",
            }}>{o.ic} {o.l}</button>
          ))}
        </div>
      </div>
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <th style={thStyle}>{vistaDetalle==="clientes"?"Cliente":vistaDetalle==="sucursales"?"Sucursal":"Ruta"}</th>
            <th style={{...thStyle,color:T.blu}}>KM (A)</th>
            <th style={{...thStyle,color:T.ac}}>KM (B)</th>
            <th style={thStyle}>Δ KM</th>
            <th style={{...thStyle,color:T.blu}}>Tramos (A)</th>
            <th style={{...thStyle,color:T.ac}}>Tramos (B)</th>
            <th style={thStyle}>Δ Tramos</th>
          </tr></thead>
          <tbody>{detalleData.map((r,i) => (
            <tr key={r.nombre} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={{...td,fontWeight:600,maxWidth:"250px",overflow:"hidden",textOverflow:"ellipsis"}}>
                {vistaDetalle==="sucursales" ? <SucBadge s={r.nombre} T={T}/> : r.nombre}
              </td>
              <td style={{...td,color:T.blu}}>{r.kmA.toLocaleString("es-CL")}</td>
              <td style={{...td,color:T.ac}}>{r.kmB.toLocaleString("es-CL")}</td>
              <td style={td}><DeltaBadge val={r.deltaKm}/></td>
              <td style={{...td,color:T.blu}}>{r.tramosA.toLocaleString("es-CL")}</td>
              <td style={{...td,color:T.ac}}>{r.tramosB.toLocaleString("es-CL")}</td>
              <td style={td}><DeltaBadge val={r.deltaTramos}/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  </div>);
}

// ═══ VIEW 9: COMBUSTIBLE (rendPromedio ponderado por KM recorridos) ═══
function Combustible({data, flota, today, T}) {
  const [months, setMonths] = useState(1);
  const [rendScania, setRendScania] = useState(3.3);
  const [rendVolvo, setRendVolvo] = useState(2.8);
  const [precioLitro, setPrecioLitro] = useState(1244);

  const card = {background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel = {background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const input = {background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"13px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
  const thStyle = {textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td = {padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};

  // Normalizador de marca
  const getMarcaNorm = useCallback((pat) => {
    const fi = flota.get(pat);
    if (!fi) return "VOLVO"; // default conservador
    const m = (fi.marca || "").toUpperCase().trim();
    if (m.includes("SCANIA")) return "SCANIA";
    if (m.includes("VOLVO")) return "VOLVO";
    return "VOLVO";
  }, [flota]);

  const stats = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setMonth(cutoff.getMonth() - months);

    // KM por tracto + por marca (SOLO comercial, sin vacío)
    const kmPorTracto = new Map();
    let kmScaniaCom = 0, kmVolvoCom = 0;
    let kmScaniaVac = 0, kmVolvoVac = 0;

    for (const row of data) {
      if (!row._date || row._date < cutoff) continue;
      const pat = row.Tracto;
      if (!pat) continue;
      const km = Number(row.Kilometro) || 0;
      const marca = getMarcaNorm(pat);
      const esVacio = isVacioTrip(row);

      if (!kmPorTracto.has(pat)) {
        kmPorTracto.set(pat, {pat, marca, kmCom: 0, kmVac: 0, tramosCom: 0, tramosVac: 0});
      }
      const t = kmPorTracto.get(pat);
      if (esVacio) {
        t.kmVac += km;
        t.tramosVac++;
        if (marca === "SCANIA") kmScaniaVac += km;
        else kmVolvoVac += km;
      } else {
        t.kmCom += km;
        t.tramosCom++;
        if (marca === "SCANIA") kmScaniaCom += km;
        else kmVolvoCom += km;
      }
    }

    const kmTotalCom = kmScaniaCom + kmVolvoCom;
    const kmTotalVac = kmScaniaVac + kmVolvoVac;
    const kmTotal = kmTotalCom + kmTotalVac;

    // Litros consumidos por marca (comercial + vacío — ambos consumen diesel)
    const litrosScania = (kmScaniaCom + kmScaniaVac) / rendScania;
    const litrosVolvo = (kmVolvoCom + kmVolvoVac) / rendVolvo;
    const litrosTotal = litrosScania + litrosVolvo;

    // RENDIMIENTO PROMEDIO PONDERADO POR KM REALES
    // Si SCANIA recorre más km que VOLVO, su rendimiento pesa más en el promedio
    const rendPromedio = litrosTotal > 0 ? (kmTotal / litrosTotal) : rendVolvo;

    // Costo total
    const costoTotal = litrosTotal * precioLitro;
    const costoScania = litrosScania * precioLitro;
    const costoVolvo = litrosVolvo * precioLitro;

    // Costo por km (promedio real)
    const costoPorKm = kmTotal > 0 ? (costoTotal / kmTotal) : 0;
    const costoPorKmComercial = kmTotalCom > 0 ? (costoTotal / kmTotalCom) : 0;

    // Ranking de tractos por consumo
    const rankingTractos = [];
    for (const t of kmPorTracto.values()) {
      const rend = t.marca === "SCANIA" ? rendScania : rendVolvo;
      const kmT = t.kmCom + t.kmVac;
      if (kmT === 0) continue;
      const litros = kmT / rend;
      const costo = litros * precioLitro;
      const pctVacio = kmT > 0 ? (t.kmVac / kmT * 100) : 0;
      rankingTractos.push({
        ...t,
        kmTotal: kmT,
        litros,
        costo,
        costoVacio: (t.kmVac / rend) * precioLitro,
        pctVacio,
      });
    }
    rankingTractos.sort((a, b) => b.costo - a.costo);

    return {
      kmScaniaCom, kmVolvoCom, kmScaniaVac, kmVolvoVac,
      kmTotalCom, kmTotalVac, kmTotal,
      litrosScania, litrosVolvo, litrosTotal,
      costoScania, costoVolvo, costoTotal,
      costoPorKm, costoPorKmComercial,
      rendPromedio,
      tractosScania: [...kmPorTracto.values()].filter(t => t.marca === "SCANIA").length,
      tractosVolvo: [...kmPorTracto.values()].filter(t => t.marca === "VOLVO").length,
      rankingTractos,
    };
  }, [data, today, months, rendScania, rendVolvo, precioLitro, getMarcaNorm]);

  const {sorted, sortKey, sortDir, toggle} = useSortable(stats.rankingTractos, "costo", "desc");
  const fmtCLP = (v) => "$" + Math.round(v).toLocaleString("es-CL");

  const pctVacioGlobal = stats.kmTotal > 0 ? (stats.kmTotalVac / stats.kmTotal * 100) : 0;
  const costoVacioTotal = (stats.kmScaniaVac / rendScania + stats.kmVolvoVac / rendVolvo) * precioLitro;

  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>⛽ Estimación de Combustible</h2>
      <select value={months} onChange={e => setMonths(+e.target.value)} style={sel}>
        <option value={1}>1 mes</option><option value={2}>2 meses</option>
        <option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>1 año</option>
      </select>
    </div>

    <div style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"10px",padding:"10px 16px",marginBottom:"14px",fontSize:"11px",color:T.txM,display:"flex",alignItems:"flex-start",gap:"8px"}}>
      <span style={{fontSize:"14px",marginTop:"1px"}}>ℹ️</span>
      <span>
        <strong style={{color:T.tx}}>Rendimiento promedio ponderado por KM recorridos:</strong>
        {" "}si SCANIA recorre más km que VOLVO, su rendimiento pesa más en el cálculo global.
        Formula: <code style={{background:T.sf,padding:"1px 5px",borderRadius:"3px",color:T.ac}}>KM Total / (KM_Scania÷Rend_Scania + KM_Volvo÷Rend_Volvo)</code>.
        El consumo se calcula sobre KM comerciales + vacío (ambos consumen diesel).
      </span>
    </div>

    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>⚙️ Parámetros de Cálculo</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px"}}>
        <div>
          <label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>REND. SCANIA (km/lt)</label>
          <input type="number" step="0.1" min="0" value={rendScania} onChange={e => setRendScania(+e.target.value || 0)} style={input}/>
        </div>
        <div>
          <label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>REND. VOLVO (km/lt)</label>
          <input type="number" step="0.1" min="0" value={rendVolvo} onChange={e => setRendVolvo(+e.target.value || 0)} style={input}/>
        </div>
        <div>
          <label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>PRECIO DIESEL ($/lt)</label>
          <input type="number" step="1" min="0" value={precioLitro} onChange={e => setPrecioLitro(+e.target.value || 0)} style={input}/>
        </div>
      </div>
    </div>

    <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginBottom:"16px"}}>
      <StatCard T={T} icon="🛣️" value={Math.round(stats.kmTotal/1000).toLocaleString("es-CL")+"K"} label="KM Totales"/>
      <StatCard T={T} icon="⛽" value={Math.round(stats.litrosTotal).toLocaleString("es-CL")+" L"} label="Consumo Total" color={T.ac}/>
      <StatCard T={T} icon="💰" value={fmtCLP(stats.costoTotal)} label="Costo Total" color={T.red}/>
      <StatCard T={T} icon="📊" value={stats.rendPromedio.toFixed(2)+" km/L"} label="Rend. Promedio" color={T.blu}/>
      <StatCard T={T} icon="💵" value={fmtCLP(stats.costoPorKm)+"/km"} label="Costo/KM"/>
    </div>

    {/* Breakdown por marca */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginBottom:"16px"}}>
      <div style={{...card,borderLeft:`4px solid ${T.blu}`}}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.blu}}>🔵 SCANIA ({stats.tractosScania} tractos)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",fontSize:"12px"}}>
          <div>
            <div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>KM COMERCIAL</div>
            <div style={{fontWeight:700,color:T.grn,fontSize:"16px"}}>{stats.kmScaniaCom.toLocaleString("es-CL")}</div>
          </div>
          <div>
            <div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>KM VACÍO</div>
            <div style={{fontWeight:700,color:T.ac,fontSize:"16px"}}>{stats.kmScaniaVac.toLocaleString("es-CL")}</div>
          </div>
          <div>
            <div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>LITROS</div>
            <div style={{fontWeight:700,color:T.tx,fontSize:"16px"}}>{Math.round(stats.litrosScania).toLocaleString("es-CL")} L</div>
          </div>
          <div>
            <div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>COSTO</div>
            <div style={{fontWeight:700,color:T.red,fontSize:"16px"}}>{fmtCLP(stats.costoScania)}</div>
          </div>
        </div>
        <div style={{marginTop:"12px",paddingTop:"12px",borderTop:`1px solid ${T.bd}`,fontSize:"11px",color:T.txM}}>
          Rend: <strong style={{color:T.blu}}>{rendScania} km/L</strong> · Costo/km: <strong style={{color:T.red}}>{fmtCLP(precioLitro/rendScania)}/km</strong>
        </div>
      </div>

      <div style={{...card,borderLeft:`4px solid ${T.ac}`}}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.ac}}>🟠 VOLVO ({stats.tractosVolvo} tractos)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",fontSize:"12px"}}>
          <div>
            <div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>KM COMERCIAL</div>
            <div style={{fontWeight:700,color:T.grn,fontSize:"16px"}}>{stats.kmVolvoCom.toLocaleString("es-CL")}</div>
          </div>
          <div>
            <div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>KM VACÍO</div>
            <div style={{fontWeight:700,color:T.ac,fontSize:"16px"}}>{stats.kmVolvoVac.toLocaleString("es-CL")}</div>
          </div>
          <div>
            <div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>LITROS</div>
            <div style={{fontWeight:700,color:T.tx,fontSize:"16px"}}>{Math.round(stats.litrosVolvo).toLocaleString("es-CL")} L</div>
          </div>
          <div>
            <div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>COSTO</div>
            <div style={{fontWeight:700,color:T.red,fontSize:"16px"}}>{fmtCLP(stats.costoVolvo)}</div>
          </div>
        </div>
        <div style={{marginTop:"12px",paddingTop:"12px",borderTop:`1px solid ${T.bd}`,fontSize:"11px",color:T.txM}}>
          Rend: <strong style={{color:T.ac}}>{rendVolvo} km/L</strong> · Costo/km: <strong style={{color:T.red}}>{fmtCLP(precioLitro/rendVolvo)}/km</strong>
        </div>
      </div>
    </div>

    {/* Alerta de costo vacío */}
    <div style={{background:pctVacioGlobal>25?`${T.red}0a`:`${T.ac}0a`,border:`1px solid ${pctVacioGlobal>25?T.red:T.ac}33`,borderLeft:`4px solid ${pctVacioGlobal>25?T.red:T.ac}`,borderRadius:"10px",padding:"14px 18px",marginBottom:"16px",fontSize:"12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"10px"}}>
        <div>
          <div style={{fontWeight:700,color:pctVacioGlobal>25?T.red:T.ac,marginBottom:"3px",fontSize:"13px"}}>🔄 Costo por KM vacío / remonta</div>
          <div style={{color:T.txM,fontSize:"11px"}}>
            {stats.kmTotalVac.toLocaleString("es-CL")} km vacíos ({pctVacioGlobal.toFixed(1)}% del total)
          </div>
        </div>
        <div style={{fontSize:"20px",fontWeight:700,color:pctVacioGlobal>25?T.red:T.ac}}>
          {fmtCLP(costoVacioTotal)}
        </div>
      </div>
    </div>

    {/* Top 20 consumidores */}
    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>🏆 Ranking de Consumo por Tracto</div>
      <div style={{fontSize:"11px",color:T.txM,marginBottom:"12px"}}>
        Top 20 tractos ordenados por costo de combustible estimado · Click columna para ordenar
      </div>
      <div style={{overflowX:"auto",maxHeight:"500px",overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <th style={thStyle}>#</th>
            <SortTh label="Tracto" col="pat" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="Marca" col="marca" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={thStyle}/>
            <SortTh label="KM Com." col="kmCom" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="KM Vac." col="kmVac" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="% Vacío" col="pctVacio" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="Litros" col="litros" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="Costo Total" col="costo" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="Costo Vacío" col="costoVacio" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...thStyle,textAlign:"right"}}/>
          </tr></thead>
          <tbody>{sorted.slice(0, 20).map((r, i) => (
            <tr key={r.pat} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={td}>{i+1}</td>
              <td style={{...td,fontWeight:700}}>{r.pat}</td>
              <td style={td}><span style={{display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"10px",fontWeight:600,background:r.marca==="SCANIA"?`${T.blu}22`:`${T.ac}22`,color:r.marca==="SCANIA"?T.blu:T.ac,border:`1px solid ${r.marca==="SCANIA"?T.blu:T.ac}44`}}>{r.marca}</span></td>
              <td style={{...td,textAlign:"right",color:T.grn}}>{r.kmCom.toLocaleString("es-CL")}</td>
              <td style={{...td,textAlign:"right",color:T.ac}}>{r.kmVac.toLocaleString("es-CL")}</td>
              <td style={{...td,textAlign:"right",color:r.pctVacio>30?T.red:r.pctVacio>15?T.ac:T.grn,fontWeight:600}}>{r.pctVacio.toFixed(1)}%</td>
              <td style={{...td,textAlign:"right"}}>{Math.round(r.litros).toLocaleString("es-CL")} L</td>
              <td style={{...td,textAlign:"right",color:T.red,fontWeight:700}}>{fmtCLP(r.costo)}</td>
              <td style={{...td,textAlign:"right",color:T.ac}}>{fmtCLP(r.costoVacio)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  </div>);
}

// ═══════════════════════════════════════════════
// ═══ MAIN APP ═══
// ═══════════════════════════════════════════════

const VIEWS = [
  {id:"buscar",label:"Buscador",icon:"🔍"},
  {id:"flota",label:"Estado Flota",icon:"📊"},
  {id:"inactivos",label:"Equipos",icon:"⚠️"},
  {id:"eficiencia",label:"Eficiencia",icon:"⚖️"},
  {id:"clientes",label:"Por Cliente",icon:"🏢"},
  {id:"rutas",label:"Por Ruta",icon:"🛤️"},
  {id:"comparacion",label:"Comp. Mes",icon:"📅"},
  {id:"combustible",label:"Combustible",icon:"⛽"},
  {id:"detalle",label:"Detalle",icon:"📋"},
  {id:"inventario",label:"Inventario",icon:"🏗️"},
];

export default function App() {
  const [view, setView] = useState("buscar");
  const [data, setData] = useState([]);
  const [flota, setFlota] = useState(new Map());
  const [ultimosMap, setUltimosMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastLoad, setLastLoad] = useState(null);

  // Tema: persiste en localStorage
  const [dark, setDark] = useState(() => {
    try {
      const v = localStorage.getItem("dashops_dark");
      if (v === "0") return false;
      if (v === "1") return true;
    } catch(e) {}
    return true; // default dark
  });
  useEffect(() => {
    try { localStorage.setItem("dashops_dark", dark ? "1" : "0"); } catch(e) {}
  }, [dark]);

  const T = useMemo(() => makeTheme(dark), [dark]);
  const today = useMemo(() => new Date(), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Descargar los 3 CSV en paralelo con cache-busting
      const bust = "&_=" + Date.now();
      const [rV, rF, rU] = await Promise.all([
        fetch(CSV_VIAJES + bust).then(r => r.text()),
        fetch(CSV_FLOTA + bust).then(r => r.text()),
        fetch(CSV_ULTIMOS + bust).then(r => r.text()),
      ]);

      // Viajes
      const pV = Papa.parse(rV, {header: true, skipEmptyLines: true});
      const rowsV = pV.data.map(r => ({
        ...r,
        Tracto: cleanPatente(r.Tracto),
        Rampla: cleanPatente(r.Rampla),
        _date: parseDate(r.Fecha),
      })).filter(r => r._date);

      // Flota
      const pF = Papa.parse(rF, {header: true, skipEmptyLines: true});
      const flotaMap = new Map();
      pF.data.forEach(r => {
        const pat = cleanPatente(r.Patente || r.patente);
        if (!pat) return;
        flotaMap.set(pat, {
          marca: (r.Marca || r.marca || "").trim(),
          modelo: (r.Modelo || r.modelo || "").trim(),
          fecha: (r.Fecha || r.fecha || r.Año || r["Año"] || "").trim(),
          tipoequipo: (r.TipoEquipo || r.Tipo || r.tipoequipo || r.tipo || "").trim(),
        });
      });

      // Últimos despachos
      const pU = Papa.parse(rU, {header: true, skipEmptyLines: true});
      const ultMap = new Map();
      pU.data.forEach(r => {
        const pat = cleanPatente(r.Patente || r.patente || r.Tracto || r.Rampla);
        const d = parseDate(r.Fecha || r.FechaMovimiento);
        if (!pat || !d) return;
        ultMap.set(pat, {
          _date: d,
          Origen: r.Origen || "",
          Destino: r.Destino || "",
          Cliente: r.Cliente || "",
          tipoequipo: r.TipoEquipo || r.Tipo || "",
        });
      });

      setData(rowsV);
      setFlota(flotaMap);
      setUltimosMap(ultMap);
      setLastLoad(Date.now());
    } catch(e) {
      console.error(e);
      setError("Error cargando datos: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Índices por tracto/rampla
  const {tractoIdx, ramplaIdx} = useMemo(() => {
    const tIdx = new Map();
    const rIdx = new Map();
    for (const row of data) {
      if (row.Tracto) {
        if (!tIdx.has(row.Tracto)) tIdx.set(row.Tracto, []);
        tIdx.get(row.Tracto).push(row);
      }
      if (row.Rampla) {
        if (!rIdx.has(row.Rampla)) rIdx.set(row.Rampla, []);
        rIdx.get(row.Rampla).push(row);
      }
    }
    // Ordenar desc por fecha
    for (const arr of tIdx.values()) arr.sort((a, b) => b._date - a._date);
    for (const arr of rIdx.values()) arr.sort((a, b) => b._date - a._date);
    return {tractoIdx: tIdx, ramplaIdx: rIdx};
  }, [data]);

  const wrap = {maxWidth:"1400px",margin:"0 auto",padding:"16px"};
  const navBtn = (v) => ({
    display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",
    borderRadius:"10px",border:"none",cursor:"pointer",
    fontSize:"12px",fontWeight:600,fontFamily:"inherit",
    background: view === v.id ? T.navActiveBg : T.navBg,
    color: view === v.id ? T.navActiveText : T.tx,
    transition:"all 0.15s",whiteSpace:"nowrap",
    boxShadow: view === v.id ? `0 2px 6px ${T.ac}44` : "none",
  });

  if (loading && data.length === 0) {
    return (
      <div style={{minHeight:"100vh",background:T.bg,color:T.tx,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"40px",marginBottom:"14px",animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔄</div>
          <div style={{fontSize:"16px",fontWeight:600}}>Cargando datos...</div>
          <div style={{fontSize:"12px",color:T.txM,marginTop:"6px"}}>Viajes, flota y últimos despachos</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{minHeight:"100vh",background:T.bg,color:T.tx,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
        <div style={{textAlign:"center",background:T.sf,border:`1px solid ${T.red}44`,borderRadius:"12px",padding:"24px",maxWidth:"480px"}}>
          <div style={{fontSize:"36px",marginBottom:"10px"}}>⚠️</div>
          <div style={{fontSize:"16px",fontWeight:600,color:T.red,marginBottom:"8px"}}>Error cargando datos</div>
          <div style={{fontSize:"13px",color:T.txM,marginBottom:"16px"}}>{error}</div>
          <button onClick={loadData} style={{padding:"10px 20px",borderRadius:"8px",border:"none",background:T.ac,color:"#000",fontWeight:700,cursor:"pointer",fontSize:"13px"}}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.tx,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
      `}</style>

      {/* HEADER */}
      <div style={{background:T.sf,borderBottom:`1px solid ${T.bd}`,boxShadow:T.headerShadow,position:"sticky",top:0,zIndex:10}}>
        <div style={{...wrap,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",flexWrap:"wrap",gap:"8px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"32px",height:"32px",background:`linear-gradient(135deg,${T.ac},#f97316)`,borderRadius:"7px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"14px",color:"#000"}}>TB</div>
            <div>
              <div style={{fontSize:"14px",fontWeight:700,color:T.tx}}>Dashboard Operaciones</div>
              <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"1px"}}>Transportes Bello e Hijos Ltda.</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap"}}>
            <RefreshButton onRefresh={loadData} loading={loading} lastLoad={lastLoad} T={T}/>
            <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)}/>
          </div>
        </div>

        {/* NAV */}
        <div style={{...wrap,padding:"0 16px 12px",display:"flex",gap:"4px",overflowX:"auto",flexWrap:"wrap"}}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={navBtn(v)}>
              <span style={{fontSize:"13px"}}>{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={wrap}>
        {view === "buscar" && <Buscador tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today} T={T}/>}
        {view === "flota" && <EstadoFlota data={data} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} ultimosMap={ultimosMap} today={today} T={T}/>}
        {view === "inactivos" && <Inactivos tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} ultimosMap={ultimosMap} today={today} T={T}/>}
        {view === "eficiencia" && <EficienciaTracto data={data} flota={flota} today={today} T={T}/>}
        {view === "clientes" && <StatsCliente data={data} today={today} T={T}/>}
        {view === "rutas" && <StatsRuta data={data} today={today} T={T}/>}
        {view === "comparacion" && <ComparacionMes data={data} today={today} T={T}/>}
        {view === "combustible" && <Combustible data={data} flota={flota} today={today} T={T}/>}
        {view === "detalle" && <Detalle data={data} T={T}/>}
        {view === "inventario" && <Inventario flota={flota} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} ultimosMap={ultimosMap} today={today} T={T}/>}
      </div>

      {/* FOOTER */}
      <div style={{...wrap,padding:"24px 16px 12px",textAlign:"center",fontSize:"10px",color:T.txM,borderTop:`1px solid ${T.bd}`,marginTop:"24px"}}>
        Transportes Bello e Hijos Ltda. · Dashboard Operaciones · {data.length.toLocaleString("es-CL")} tramos · {flota.size} equipos en catálogo
      </div>
    </div>
  );
}
