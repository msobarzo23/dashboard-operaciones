import { useState, useEffect, useMemo, useCallback } from "react";
import Papa from "papaparse";

const CSV_VIAJES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv";
const CSV_FLOTA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=923646374&single=true&output=csv";
const CSV_ULTIMOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=1827964132&single=true&output=csv";

const SIN_SOLICITUD = "-Viaje sin solicitud -";

// Detección centralizada de viajes vacíos/remonta/retorno
// Criterios: (1) cliente = SIN_SOLICITUD, (2) cliente vacío/nulo, (3) carga contiene "VACIO"
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
function daysBetween(d1,d2){return Math.floor((d2-d1)/86400000);}

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
          <option value="all">Todo</option>
          <option value="tracto">Tractos</option>
          <option value="rampla">Ramplas</option>
        </select>
        <input style={{...input,flex:1,minWidth:"200px"}} placeholder="Buscar patente (mín. 3 caracteres)..." value={q} onChange={e=>setQ(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="characters"/>
      </div>
      {!results&&<div style={{marginTop:"12px",padding:"14px",background:T.sf2,borderRadius:"8px",border:`1px dashed ${T.bd}`,textAlign:"center",color:T.txM,fontSize:"13px"}}>Ingresa al menos 3 caracteres de la patente para buscar</div>}
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

// ═══ VIEW 2: ESTADO DE FLOTA ═══
function EstadoFlota({data,tractoIdx,ramplaIdx,flota,ultimosMap,today,T}){
  const[days,setDays]=useState(30);
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const tbl={width:"100%",borderCollapse:"collapse",fontSize:"12px"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx};

  const stats=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-days);
    let fT=0,fE=0,fO=0;
    const flotaTractos=new Set();
    const flotaEquipos=new Set();
    for(const[pat,v]of flota.entries()){
      const c=getCategoria(v.tipoequipo);
      if(c==="TRACTOCAMION"){fT++;flotaTractos.add(pat);}
      else if(c==="EQUIPO"){fE++;flotaEquipos.add(pat);}
      else fO++;
    }
    let aT=0,aE=0;
    let totalKm=0,totalTrips=0;
    const sucCount={};
    for(const pat of flotaTractos){
      const tr=tractoIdx.get(pat);
      if(tr?.length>0){
        let hasRecent=false;
        for(const t of tr){
          if(t._date<cutoff) break;
          hasRecent=true;
          if(t.Cliente!==SIN_SOLICITUD){
            totalKm+=(Number(t.Kilometro)||0);
            totalTrips++;
          }
        }
        if(hasRecent) aT++;
      } else {
        if(ultimosMap.get(pat)?._date>=cutoff) aT++;
      }
    }
    for(const pat of flotaEquipos){
      const tr=ramplaIdx.get(pat);
      if(tr?.length>0){
        let hasRecent=false;
        for(const t of tr){
          if(t._date<cutoff) break;
          hasRecent=true;
        }
        if(hasRecent) aE++;
        const sc=getSucursal(tr[0].Destino);
        sucCount[sc]=(sucCount[sc]||0)+1;
      } else {
        const u=ultimosMap.get(pat);
        if(u?._date>=cutoff) aE++;
        if(u){
          const sc=getSucursal(u.Destino||"");
          sucCount[sc]=(sucCount[sc]||0)+1;
        }
      }
    }
    for(const[pat,tr]of tractoIdx.entries()){
      if(flotaTractos.has(pat)) continue;
      for(const t of tr){
        if(t._date<cutoff) break;
        if(t.Cliente!==SIN_SOLICITUD){
          totalKm+=(Number(t.Kilometro)||0);
          totalTrips++;
        }
      }
    }
    const tKm=[];
    for(const[k,tr]of tractoIdx.entries()){
      let km=0;
      for(const t of tr){
        if(t._date<cutoff) break;
        if(t.Cliente!==SIN_SOLICITUD) km+=(Number(t.Kilometro)||0);
      }
      if(km>0)tKm.push([k,km]);
    }
    tKm.sort((a,b)=>b[1]-a[1]);
    return{
      fT,fE,fO,aT,aE,totalKm,totalTrips,sucCount,
      uT:fT?Math.min(100,(aT/fT*100)).toFixed(1):0,
      uE:fE?Math.min(100,(aE/fE*100)).toFixed(1):0,
      uTraw:fT?(aT/fT*100).toFixed(1):0,
      uEraw:fE?(aE/fE*100).toFixed(1):0,
      topT:tKm.slice(0,10),
      totalR:flotaEquipos.size,
    };
  },[data,tractoIdx,ramplaIdx,flota,ultimosMap,today,days]);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>📊 Estado de Flota</h2>
      <select value={days} onChange={e=>setDays(+e.target.value)} style={sel}>
        <option value={1}>Último día</option><option value={7}>7 días</option><option value={15}>15 días</option>
        <option value={30}>30 días</option><option value={60}>60 días</option><option value={90}>90 días</option>
      </select>
    </div>
    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>📈 Utilización de Flota (últimos {days} días)</div>
      <div style={{fontSize:"11px",color:T.txM,marginBottom:"16px"}}>
        Base: equipos registrados en catálogo de flota · KM y tramos excluyen viajes de remonta/vacío
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px"}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
            <span style={{color:T.tx}}>🚛 Tractocamiones</span>
            <span style={{fontWeight:700,color:T.ac}}>
              {stats.aT+" / "+stats.fT}
              <span style={{color:stats.uTraw>100?T.red:T.grn,marginLeft:4}}>({stats.uTraw}%)</span>
            </span>
          </div>
          <div style={{height:"12px",background:T.sf2,borderRadius:"6px",overflow:"hidden",border:`1px solid ${T.bd}`}}>
            <div style={{height:"100%",width:stats.uT+"%",background:`linear-gradient(90deg,${T.grn},${T.ac})`,borderRadius:"6px"}}/>
          </div>
          {stats.uTraw>100&&<div style={{fontSize:"10px",color:T.txM,marginTop:3}}>⚠ Numerador incluye patentes fuera del catálogo de flota</div>}
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
            <span style={{color:T.tx}}>🚃 Equipos</span>
            <span style={{fontWeight:700,color:T.ac}}>
              {stats.aE+" / "+stats.fE}
              <span style={{color:stats.uEraw>100?T.red:T.grn,marginLeft:4}}>({stats.uEraw}%)</span>
            </span>
          </div>
          <div style={{height:"12px",background:T.sf2,borderRadius:"6px",overflow:"hidden",border:`1px solid ${T.bd}`}}>
            <div style={{height:"100%",width:stats.uE+"%",background:`linear-gradient(90deg,${T.blu},${T.ac})`,borderRadius:"6px"}}/>
          </div>
          {stats.uEraw>100&&<div style={{fontSize:"10px",color:T.txM,marginTop:3}}>⚠ Numerador incluye patentes fuera del catálogo de flota</div>}
        </div>
      </div>
    </div>
    <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginBottom:"16px"}}>
      <StatCard T={T} icon="🛣️" value={Math.round(stats.totalKm/1000).toLocaleString("es-CL")+"K"} label="KM Totales" color={T.grn}/>
      <StatCard T={T} icon="📋" value={stats.totalTrips.toLocaleString("es-CL")} label="Tramos"/>
      <StatCard T={T} icon="🏢" value={stats.fT+stats.fE+stats.fO} label="Flota Total"/>
      <StatCard T={T} icon="🔧" value={stats.fO} label="Otros (camiones, grúas)"/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>🗺️ Equipos por Sucursal (última ubicación)</div>
        {Object.entries(stats.sucCount).sort((a,b)=>b[1]-a[1]).map(([sc,c])=>{
          const pct=(c/stats.totalR*100).toFixed(1);
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
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>🏆 Top 10 Tractos por KM</div>
        <table style={tbl}>
          <thead><tr><th style={th}>#</th><th style={th}>Tracto</th><th style={th}>KM</th></tr></thead>
          <tbody>{stats.topT.map(([t,km],i)=>(
            <tr key={t} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={{padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx}}>{i+1}</td>
              <td style={{padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontWeight:600}}>{t}</td>
              <td style={{padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx}}>{km.toLocaleString("es-CL")}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  </div>);
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

// ═══ VIEW 3: INACTIVOS ═══
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

  const allEquipos = useMemo(()=>{
    const idx = tipo==="tracto" ? tractoIdx : ramplaIdx;
    const res = [];
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
      res.push({pat,days,lastRecord,suc:lastRecord?getSucursal(lastRecord.Destino):"OTROS",fi,estado,enCatalogo:true,"lastRecord.Fecha":lastRecord?.Fecha||"","fi.tipoequipo":fi.tipoequipo||"",esSinSol});
    }
    if(!soloDoc){
      for(const[pat,tr] of idx.entries()){
        if(flota.has(pat)) continue;
        const lastDate=tr[0]._date;
        const days=daysBetween(lastDate,today);
        const last=tr[0];
        const estado=getEstadoEquipo(days);
        const esSinSol = last.Cliente === SIN_SOLICITUD;
        res.push({pat,days,lastRecord:last,suc:getSucursal(last.Destino),fi:null,estado,enCatalogo:false,"lastRecord.Fecha":last.Fecha||"","fi.tipoequipo":"",esSinSol});
      }
    }
    return res;
  },[tractoIdx,ramplaIdx,flota,ultimosMap,today,tipo,soloDoc]);

  const estadoCount=useMemo(()=>{
    const m={ACTIVO:0,INACTIVO:0,PARADO:0,"SIN VIAJES":0,total:0};
    for(const r of allEquipos){
      if(!r.enCatalogo) continue;
      m.total++;
      m[r.estado]=(m[r.estado]||0)+1;
    }
    return m;
  },[allEquipos]);

  const sucursales=useMemo(()=>[...new Set(allEquipos.map(r=>r.suc))].sort(),[allEquipos]);

  const filtered=useMemo(()=>{
    let f=allEquipos;
    if(filtroEstado!=="todos") f=f.filter(r=>r.estado===filtroEstado);
    if(filtroSuc!=="todas") f=f.filter(r=>r.suc===filtroSuc);
    return f;
  },[allEquipos,filtroEstado,filtroSuc]);

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

    <div style={{background:soloDoc?`${T.grn}0a`:`${T.ac}0a`,border:`1px solid ${soloDoc?T.grn:T.ac}33`,borderRadius:"10px",padding:"8px 16px",marginBottom:"14px",fontSize:"11px",color:T.txM,display:"flex",alignItems:"center",gap:"8px"}}>
      <span style={{fontSize:"14px"}}>{soloDoc?"📋":"🔍"}</span>
      {soloDoc
        ? <span>Mostrando solo equipos <strong style={{color:T.tx}}>registrados en el catálogo de flota</strong>. La sucursal indicada es la del <strong style={{color:T.tx}}>último destino registrado</strong>, incluyendo viajes de remonta/vacío.</span>
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

// ═══ VIEW 4: POR CLIENTE (HÍBRIDO — tarjeta vacíos + ranking limpio) ═══
function StatsCliente({data,today,T}){
  const[months,setMonths]=useState(1);const[sortBy,setSortBy]=useState("km");
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const thStyle={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};

  // Calcular stats de clientes Y stats de vacíos por separado
  const {rawStats, vacioStats, totalKmConVacios} = useMemo(()=>{
    const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);
    const allFiltered = months===99 ? data : data.filter(d=>d._date>=cutoff);

    // Stats de viajes vacíos/remonta (SIN_SOLICITUD)
    const vacios = allFiltered.filter(d => isVacioTrip(d));
    const vacioKm = vacios.reduce((s, d) => s + (Number(d.Kilometro) || 0), 0);
    const vacioTramos = vacios.length;

    // Top rutas vacías
    const rutasVacias = {};
    vacios.forEach(d => {
      const k = d.Origen + " → " + d.Destino;
      if (!rutasVacias[k]) rutasVacias[k] = {ruta: k, km: 0, count: 0};
      rutasVacias[k].km += Number(d.Kilometro) || 0;
      rutasVacias[k].count++;
    });
    const topRutasVacias = Object.values(rutasVacias).sort((a, b) => b.km - a.km).slice(0, 5);

    // Stats de clientes reales (excluye vacíos)
    const filtered = allFiltered.filter(d => !isVacioTrip(d));
    const byC={};
    filtered.forEach(d=>{const c=d.Cliente;if(!byC[c])byC[c]={cliente:c,km:0,tramos:0,sols:new Set(),cargas:{}};byC[c].km+=Number(d.Kilometro)||0;byC[c].tramos++;if(d.Solicitud)byC[c].sols.add(d.Solicitud);const cg=d.Carga?.trim();if(cg&&!/^\d+$/.test(cg))byC[c].cargas[cg]=(byC[c].cargas[cg]||0)+1;});
    const clienteStats = Object.values(byC).map(c=>({...c,sols:c.sols.size,topCargas:Object.entries(c.cargas).sort((a,b)=>b[1]-a[1]).slice(0,3)}));

    // KM total incluyendo vacíos (para calcular % real sobre el total)
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

    {/* ── TARJETA RESUMEN KM VACÍOS / RETORNO ── */}
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

          {/* Barra visual vacíos vs comerciales */}
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

            {/* Top rutas vacías */}
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

    {/* ── TABLA RANKING CLIENTES (sin vacíos) ── */}
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

// ═══ VIEW 7: INVENTARIO DE FLOTA ═══
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
function ComparacionMes({data, tractoIdx, ramplaIdx, flota, today, T}) {
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

// ═══ VIEW 9: COMBUSTIBLE ═══
function Combustible({data, flota, tractoIdx, today, T}) {
  const card = {background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel = {background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const inputStyle = {background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"10px 14px",color:T.tx,fontSize:"14px",fontFamily:"inherit",outline:"none",boxSizing:"border-box"};
  const thStyle = {textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td = {padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};

  const [months, setMonths] = useState(0);
  const [filtroSuc, setFiltroSuc] = useState("todas");
  const [precioDiesel, setPrecioDiesel] = useState(1244);

  const REND = {SCANIA: 3.3, VOLVO: 2.8};

  const tractoMarca = useMemo(() => {
    const m = new Map();
    for (const [pat, v] of flota.entries()) {
      if (getCategoria(v.tipoequipo) !== "TRACTOCAMION") continue;
      const marca = (v.marca || "").toUpperCase().trim();
      if (marca.includes("SCANIA")) m.set(pat, "SCANIA");
      else m.set(pat, "VOLVO");
    }
    return m;
  }, [flota]);

  const rendPromedio = useMemo(() => {
    let totalW = 0, count = 0;
    for (const [, marca] of tractoMarca) {
      totalW += REND[marca] || REND.VOLVO;
      count++;
    }
    return count > 0 ? (totalW / count) : REND.VOLVO;
  }, [tractoMarca]);

  const monthlyStats = useMemo(() => {
    let filtered;
    if (months === 0) {
      const mk = getMonthKey(today);
      filtered = data.filter(r => getMonthKey(r._date) === mk && r.Cliente !== SIN_SOLICITUD);
    } else if (months === -1) {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const mk = getMonthKey(prev);
      filtered = data.filter(r => getMonthKey(r._date) === mk && r.Cliente !== SIN_SOLICITUD);
    } else {
      const cutoff = new Date(today);
      cutoff.setMonth(cutoff.getMonth() - months);
      filtered = data.filter(r => r._date >= cutoff && r.Cliente !== SIN_SOLICITUD);
    }
    const byMonth = {};
    filtered.forEach(r => {
      const mk = getMonthKey(r._date);
      if (!byMonth[mk]) byMonth[mk] = {km: 0, tramos: 0, tractos: new Set(), bySuc: {}, byMarca: {SCANIA:{km:0,tramos:0}, VOLVO:{km:0,tramos:0}}};
      const km = Number(r.Kilometro) || 0;
      byMonth[mk].km += km;
      byMonth[mk].tramos++;
      if (r.Tracto) byMonth[mk].tractos.add(r.Tracto);
      const suc = getSucursal(r.Destino);
      if (!byMonth[mk].bySuc[suc]) byMonth[mk].bySuc[suc] = {km: 0, tramos: 0};
      byMonth[mk].bySuc[suc].km += km;
      byMonth[mk].bySuc[suc].tramos++;
      const marca = tractoMarca.get(r.Tracto) || "VOLVO";
      byMonth[mk].byMarca[marca].km += km;
      byMonth[mk].byMarca[marca].tramos++;
    });
    const months_sorted = Object.keys(byMonth).sort();
    return months_sorted.map(mk => ({
      mes: mk, label: monthKeyToLabel(mk), km: byMonth[mk].km, tramos: byMonth[mk].tramos,
      tractos: byMonth[mk].tractos.size, kmPorTramo: byMonth[mk].tramos > 0 ? Math.round(byMonth[mk].km / byMonth[mk].tramos) : 0,
      bySuc: byMonth[mk].bySuc, byMarca: byMonth[mk].byMarca,
    }));
  }, [data, today, months, tractoMarca]);

  const sucursalesDisp = useMemo(() => {
    const s = new Set();
    monthlyStats.forEach(m => Object.keys(m.bySuc).forEach(k => s.add(k)));
    return [...s].sort();
  }, [monthlyStats]);

  const displayStats = useMemo(() => {
    if (filtroSuc === "todas") return monthlyStats;
    return monthlyStats.map(m => {
      const sData = m.bySuc[filtroSuc] || {km: 0, tramos: 0};
      return {...m, km: sData.km, tramos: sData.tramos, kmPorTramo: sData.tramos > 0 ? Math.round(sData.km / sData.tramos) : 0};
    });
  }, [monthlyStats, filtroSuc]);

  const maxKm = Math.max(...displayStats.map(m => m.km), 1);

  const calcLitrosMarca = useCallback((byMarca) => {
    const sc = (byMarca.SCANIA?.km || 0) / REND.SCANIA;
    const vo = (byMarca.VOLVO?.km || 0) / REND.VOLVO;
    return {scania: Math.round(sc), volvo: Math.round(vo), total: Math.round(sc + vo)};
  }, []);

  const withDelta = displayStats.map((m, i) => {
    const prev = i > 0 ? displayStats[i - 1] : null;
    const litrosMarca = calcLitrosMarca(m.byMarca || {SCANIA:{km:0},VOLVO:{km:0}});
    return {
      ...m,
      deltaKm: prev ? ((m.km - prev.km) / Math.max(prev.km, 1) * 100) : null,
      litrosEst: litrosMarca.total, litrosMarca,
      costoEst: litrosMarca.total * precioDiesel,
    };
  });

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

  const totalKm = withDelta.reduce((s, m) => s + m.km, 0);
  const totalTramos = withDelta.reduce((s, m) => s + m.tramos, 0);
  const totalLitros = withDelta.reduce((s, m) => s + m.litrosEst, 0);
  const totalCosto = withDelta.reduce((s, m) => s + m.costoEst, 0);
  const avgKmMes = withDelta.length > 0 ? Math.round(totalKm / withDelta.length) : 0;

  const marcaAcum = useMemo(() => {
    const acc = {SCANIA:{km:0,tramos:0}, VOLVO:{km:0,tramos:0}};
    monthlyStats.forEach(m => {
      for (const mk of ["SCANIA","VOLVO"]) {
        acc[mk].km += (m.byMarca[mk]?.km || 0);
        acc[mk].tramos += (m.byMarca[mk]?.tramos || 0);
      }
    });
    return acc;
  }, [monthlyStats]);

  const sucAcum = useMemo(() => {
    const acc = {};
    monthlyStats.forEach(m => {
      Object.entries(m.bySuc).forEach(([s, v]) => {
        if (!acc[s]) acc[s] = {km: 0, tramos: 0};
        acc[s].km += v.km;
        acc[s].tramos += v.tramos;
      });
    });
    return Object.entries(acc).sort((a, b) => b[1].km - a[1].km);
  }, [monthlyStats]);

  const fmtM = (v) => {
    if (v >= 1e9) return "$" + (v/1e9).toFixed(1) + "MM";
    if (v >= 1e6) return "$" + Math.round(v/1e6).toLocaleString("es-CL") + "M";
    return "$" + Math.round(v).toLocaleString("es-CL");
  };

  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>⛽ Combustible y KM</h2>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
        <select value={filtroSuc} onChange={e => setFiltroSuc(e.target.value)} style={sel}>
          <option value="todas">Todas las sucursales</option>
          {sucursalesDisp.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={months} onChange={e => setMonths(+e.target.value)} style={sel}>
          <option value={0}>Mes actual</option><option value={-1}>Mes anterior</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option><option value={99}>Todo</option>
        </select>
      </div>
    </div>

    <div style={{...card,borderLeft:`4px solid ${T.red}`,background:T.isDark?"#1a1518":T.sf}}>
      <div style={{fontSize:"14px",fontWeight:700,marginBottom:"12px",color:T.tx}}>⛽ Parámetros de Costo Combustible</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"16px",alignItems:"end"}}>
        <div>
          <label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:"4px"}}>PRECIO DIÉSEL ($/litro neto)</label>
          <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <span style={{fontSize:"16px",fontWeight:700,color:T.red}}>$</span>
            <input type="number" value={precioDiesel} onChange={e => setPrecioDiesel(Math.max(0, Number(e.target.value) || 0))}
              style={{...inputStyle,width:"130px",fontSize:"18px",fontWeight:700,color:T.red,textAlign:"right"}}
              step={10} min={0}
            />
          </div>
          <div style={{fontSize:"10px",color:T.txM,marginTop:"4px"}}>Edita para simular costos con distintos precios</div>
        </div>
        <div style={{background:T.sf2,borderRadius:"10px",padding:"14px",border:`1px solid ${T.bd}`}}>
          <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"8px"}}>RENDIMIENTO POR MARCA (km/litro)</div>
          <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"20px",fontWeight:700,color:"#3b82f6"}}>{REND.SCANIA}</div>
              <div style={{fontSize:"10px",color:T.txM}}>SCANIA</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"20px",fontWeight:700,color:"#8b5cf6"}}>{REND.VOLVO}</div>
              <div style={{fontSize:"10px",color:T.txM}}>VOLVO</div>
            </div>
          </div>
          <div style={{fontSize:"10px",color:T.txM,marginTop:"6px"}}>Promedio ponderado flota: <strong style={{color:T.tx}}>{rendPromedio.toFixed(2)} km/lt</strong></div>
        </div>
        <div style={{background:`${T.red}0a`,borderRadius:"10px",padding:"14px",border:`1px solid ${T.red}33`}}>
          <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"4px"}}>COSTO ESTIMADO PERÍODO</div>
          <div style={{fontSize:"24px",fontWeight:700,color:T.red}}>{fmtM(totalCosto)}</div>
          <div style={{fontSize:"10px",color:T.txM,marginTop:"2px"}}>{totalLitros.toLocaleString("es-CL")} litros × ${precioDiesel.toLocaleString("es-CL")}/lt</div>
        </div>
      </div>
    </div>

    <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginBottom:"16px"}}>
      <StatCard T={T} icon="🛣️" value={Math.round(totalKm / 1000).toLocaleString("es-CL") + "K"} label="KM Totales" color={T.grn}/>
      <StatCard T={T} icon="📋" value={totalTramos.toLocaleString("es-CL")} label="Tramos"/>
      <StatCard T={T} icon="⛽" value={Math.round(totalLitros / 1000).toLocaleString("es-CL") + "K"} label="Litros Est." color={T.red}/>
      <StatCard T={T} icon="📊" value={avgKmMes.toLocaleString("es-CL")} label="KM Prom./Mes" color={T.blu}/>
    </div>

    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"14px",color:T.tx}}>🚛 Consumo Estimado por Marca de Tracto</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"12px"}}>
        {[
          {marca:"SCANIA",color:"#3b82f6",rend:REND.SCANIA,data:marcaAcum.SCANIA},
          {marca:"VOLVO",color:"#8b5cf6",rend:REND.VOLVO,data:marcaAcum.VOLVO},
        ].map(b => {
          const litros = b.data.km > 0 ? Math.round(b.data.km / b.rend) : 0;
          const costo = litros * precioDiesel;
          const pctKm = totalKm > 0 ? (b.data.km / totalKm * 100) : 0;
          return (
            <div key={b.marca} style={{background:T.sf2,borderRadius:"10px",padding:"16px",border:`1px solid ${T.bd}`,borderTop:`3px solid ${b.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                <span style={{fontSize:"13px",fontWeight:700,color:b.color}}>{b.marca}</span>
                <span style={{fontSize:"10px",color:T.txM}}>{b.rend} km/lt</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                <div>
                  <div style={{fontSize:"10px",color:T.txM}}>KM</div>
                  <div style={{fontSize:"14px",fontWeight:700,color:T.tx}}>{Math.round(b.data.km / 1000).toLocaleString("es-CL")}K</div>
                </div>
                <div>
                  <div style={{fontSize:"10px",color:T.txM}}>Tramos</div>
                  <div style={{fontSize:"14px",fontWeight:700,color:T.tx}}>{b.data.tramos.toLocaleString("es-CL")}</div>
                </div>
                <div>
                  <div style={{fontSize:"10px",color:T.txM}}>Litros Est.</div>
                  <div style={{fontSize:"14px",fontWeight:700,color:T.red}}>{litros.toLocaleString("es-CL")}</div>
                </div>
                <div>
                  <div style={{fontSize:"10px",color:T.txM}}>Costo Est.</div>
                  <div style={{fontSize:"14px",fontWeight:700,color:T.red}}>{fmtM(costo)}</div>
                </div>
              </div>
              <div style={{marginTop:"8px"}}>
                <div style={{height:"6px",background:T.sf,borderRadius:"3px",border:`1px solid ${T.bd}`,overflow:"hidden"}}>
                  <div style={{height:"100%",width:pctKm+"%",background:b.color,borderRadius:"3px"}}/>
                </div>
                <div style={{fontSize:"9px",color:T.txM,marginTop:"2px",textAlign:"right"}}>{pctKm.toFixed(1)}% del KM total</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {displayStats.length > 1 && <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"14px",color:T.tx}}>📈 Evolución Mensual</div>
      <div style={{overflowX:"auto"}}>
        {displayStats.map((m, i) => {
          const prev = i > 0 ? displayStats[i - 1] : null;
          const deltaKm = prev ? ((m.km - prev.km) / Math.max(prev.km, 1) * 100) : null;
          const litros = calcLitrosMarca(m.byMarca || {SCANIA:{km:0},VOLVO:{km:0}});
          const costo = litros.total * precioDiesel;
          return (
            <div key={m.mes} style={{marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                <span style={{fontSize:"12px",fontWeight:600,color:T.tx,minWidth:"80px"}}>{m.label}</span>
                <div style={{display:"flex",gap:"12px",alignItems:"center",fontSize:"11px"}}>
                  <span style={{color:T.tx}}>{m.km.toLocaleString("es-CL")} km</span>
                  <span style={{color:T.red}}>{litros.total.toLocaleString("es-CL")} lt</span>
                  <span style={{color:T.red,fontWeight:600}}>{fmtM(costo)}</span>
                  {deltaKm !== null && <DeltaBadge val={deltaKm}/>}
                </div>
              </div>
              <div style={{height:"14px",background:T.sf2,borderRadius:"7px",border:`1px solid ${T.bd}`,overflow:"hidden",display:"flex"}}>
                {m.byMarca.SCANIA && m.byMarca.SCANIA.km > 0 && (
                  <div style={{height:"100%",width:(m.byMarca.SCANIA.km / maxKm * 100)+"%",background:"#3b82f6",transition:"width 0.3s"}} title={"Scania: "+m.byMarca.SCANIA.km.toLocaleString("es-CL")+" km"}/>
                )}
                {m.byMarca.VOLVO && m.byMarca.VOLVO.km > 0 && (
                  <div style={{height:"100%",width:(m.byMarca.VOLVO.km / maxKm * 100)+"%",background:"#8b5cf6",transition:"width 0.3s"}} title={"Volvo: "+m.byMarca.VOLVO.km.toLocaleString("es-CL")+" km"}/>
                )}
              </div>
            </div>
          );
        })}
        <div style={{display:"flex",gap:"16px",marginTop:"8px",fontSize:"10px",color:T.txM}}>
          <span><span style={{display:"inline-block",width:"10px",height:"10px",borderRadius:"2px",background:"#3b82f6",marginRight:"4px",verticalAlign:"middle"}}/>Scania</span>
          <span><span style={{display:"inline-block",width:"10px",height:"10px",borderRadius:"2px",background:"#8b5cf6",marginRight:"4px",verticalAlign:"middle"}}/>Volvo</span>
        </div>
      </div>
    </div>}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginBottom:"16px"}}>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>📊 Detalle por Mes</div>
        <div style={{maxHeight:"400px",overflowY:"auto",overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
            <thead><tr>
              <th style={thStyle}>Mes</th><th style={thStyle}>KM</th><th style={thStyle}>Δ</th>
              <th style={thStyle}>Tramos</th><th style={thStyle}>Litros</th><th style={thStyle}>Costo Est.</th>
            </tr></thead>
            <tbody>{withDelta.map((m, i) => (
              <tr key={m.mes} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
                <td style={{...td,fontWeight:600}}>{m.label}</td>
                <td style={td}>{m.km.toLocaleString("es-CL")}</td>
                <td style={td}><DeltaBadge val={m.deltaKm}/></td>
                <td style={td}>{m.tramos.toLocaleString("es-CL")}</td>
                <td style={{...td,color:T.red,fontWeight:600}}>{m.litrosEst.toLocaleString("es-CL")}</td>
                <td style={{...td,color:T.red,fontWeight:600}}>{fmtM(m.costoEst)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>🗺️ KM Acumulado por Sucursal</div>
        <div style={{maxHeight:"400px",overflowY:"auto"}}>
          {sucAcum.map(([s, v]) => {
            const litros = Math.round(v.km / rendPromedio);
            const costo = litros * precioDiesel;
            const pct = totalKm > 0 ? (v.km / totalKm * 100) : 0;
            return (
              <div key={s} style={{marginBottom:"10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",alignItems:"center"}}>
                  <SucBadge s={s} T={T}/>
                  <span style={{fontSize:"11px",color:T.txM}}>
                    {Math.round(v.km / 1000).toLocaleString("es-CL")}K km · ~{Math.round(litros / 1000).toLocaleString("es-CL")}K lt · {fmtM(costo)}
                  </span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                  <div style={{flex:1,height:"8px",background:T.sf2,borderRadius:"4px",border:`1px solid ${T.bd}`,overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct+"%",background:T.sucColors[s]?.accent||T.ac,borderRadius:"4px",transition:"width 0.3s"}}/>
                  </div>
                  <span style={{fontSize:"10px",color:T.txM,minWidth:"38px",textAlign:"right"}}>{pct.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>📋 KM Mensual por Sucursal (miles)</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
          <thead><tr>
            <th style={thStyle}>Sucursal</th>
            {monthlyStats.map(m => <th key={m.mes} style={{...thStyle,textAlign:"right"}}>{m.label}</th>)}
            <th style={{...thStyle,textAlign:"right",color:T.ac}}>Total</th>
          </tr></thead>
          <tbody>{sucAcum.map(([s], i) => {
            let rowTotal = 0;
            return (
              <tr key={s} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
                <td style={{...td,fontWeight:600}}><SucBadge s={s} T={T}/></td>
                {monthlyStats.map(m => {
                  const v = m.bySuc[s]?.km || 0;
                  rowTotal += v;
                  return <td key={m.mes} style={{...td,textAlign:"right"}}>{v > 0 ? Math.round(v / 1000).toLocaleString("es-CL") : "—"}</td>;
                })}
                <td style={{...td,textAlign:"right",fontWeight:700,color:T.ac}}>{Math.round(rowTotal / 1000).toLocaleString("es-CL")}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  </div>);
}

// ═══ MAIN APP ═══
const VIEWS=[
  {id:"buscar",label:"Buscador",icon:"🔍"},
  {id:"flota",label:"Estado Flota",icon:"📊"},
  {id:"inactivos",label:"Equipos",icon:"⚠️"},
  {id:"clientes",label:"Por Cliente",icon:"🏢"},
  {id:"rutas",label:"Por Ruta",icon:"🛤️"},
  {id:"comparacion",label:"Comp. Mes",icon:"📅"},
  {id:"combustible",label:"Combustible",icon:"⛽"},
  {id:"detalle",label:"Detalle",icon:"📋"},
  {id:"inventario",label:"Inventario",icon:"🏗️"}
];

export default function App(){
  const[data,setData]=useState([]);const[flota,setFlota]=useState(new Map());const[ultimosMap,setUltimosMap]=useState(new Map());const[loading,setLoading]=useState(true);const[loadMsg,setLoadMsg]=useState("Conectando...");const[error,setError]=useState(null);const[view,setView]=useState("buscar");const[info,setInfo]=useState({});
  const[darkMode,setDarkMode]=useState(()=>{
    try{const s=localStorage.getItem("tb_dark");return s===null?true:s==="true";}catch{return true;}
  });
  const T=useMemo(()=>makeTheme(darkMode),[darkMode]);
  const today=useMemo(()=>new Date(),[]);

  const toggleTheme=()=>{
    setDarkMode(d=>{const next=!d;try{localStorage.setItem("tb_dark",String(next));}catch{}return next;});
  };

  const{tractoIdx,ramplaIdx}=useMemo(()=>{
    const ti=new Map(),ri=new Map();
    for(const row of data){
      if(row.Tracto){if(!ti.has(row.Tracto))ti.set(row.Tracto,[]);ti.get(row.Tracto).push(row);}
      if(row.Rampla){if(!ri.has(row.Rampla))ri.set(row.Rampla,[]);ri.get(row.Rampla).push(row);}
    }
    return{tractoIdx:ti,ramplaIdx:ri};
  },[data]);

  useEffect(()=>{
    let vd=null,fd=null,ud=null;
    let ultimosReady=false;

    const tryFinalize=()=>{
      if(!vd||!fd)return;
      if(!ultimosReady){
        setTimeout(tryFinalize, 500);
        return;
      }

      setLoadMsg("Indexando...");
      setTimeout(()=>{
        try{
          let rows=vd;
          rows=rows.map(r=>({...r,_date:parseDate(r.Fecha)})).filter(r=>r._date);
          rows.sort((a,b)=>b._date-a._date||(b.Expedicion||"").localeCompare(a.Expedicion||""));
          const maxD=rows.length?rows[0]._date:null;const minD=rows.length?rows[rows.length-1]._date:null;
          const fm=new Map();
          fd.forEach(r=>{const pat=cleanPatente(r.patente);if(pat&&pat!=="AA1111"&&pat!=="AAA111")fm.set(pat,{marca:r.marca?.trim()||"",modelo:r.modelo?.trim()||"",fecha:r.fecha?.trim()||"",tipoequipo:r.tipoequipo?.trim()||""});});

          const um=new Map();
          if(ud&&ud.length){
            ud.forEach(r=>{
              const pat=cleanPatente(r["Patente"]||r["patente"]);
              if(!pat)return;
              const rawDate=r["Ult. despacho"]||r["ult_despacho"]||r["Fecha"];
              let d=null;
              if(rawDate){
                const iso=String(rawDate).match(/(\d{4})-(\d{2})-(\d{2})/);
                if(iso)d=new Date(+iso[1],+iso[2]-1,+iso[3]);
                else d=parseDate(rawDate);
              }
              if(!d)return;
              const existing=um.get(pat);
              if(!existing||d>existing._date){
                um.set(pat,{_date:d,Origen:r["Origen"]||"",Destino:r["Destino"]||"",Cliente:r["Cliente"]||"",tipoequipo:r["Tipo equipo"]||""});
              }
            });
          }

          const rowsConSolicitud = rows.filter(r=>r.Cliente!==SIN_SOLICITUD);
          setInfo({
            total:rows.length,
            minDate:minD?formatDate(minD):"-",
            maxDate:maxD?formatDate(maxD):"-",
            tractos:new Set(rows.map(r=>r.Tracto).filter(Boolean)).size,
            ramplas:new Set(rows.map(r=>r.Rampla).filter(Boolean)).size,
            clientes:new Set(rowsConSolicitud.map(r=>r.Cliente).filter(Boolean)).size,
            flotaTotal:fm.size,
            ultimosTotal:um.size
          });
          setData(rows);setFlota(fm);setUltimosMap(um);setLoading(false);
        }catch(e){setError("Error: "+e.message);setLoading(false);}
      },100);
    };

    const ultimosTimeout = setTimeout(()=>{
      if(!ultimosReady){ ultimosReady=true; ud=ud||[]; tryFinalize(); }
    }, 4000);

    setLoadMsg("Descargando viajes...");
    Papa.parse(CSV_VIAJES,{download:true,header:true,skipEmptyLines:true,complete:(r)=>{vd=r.data;setLoadMsg("Descargando flota...");tryFinalize();},error:(e)=>{setError("Error viajes: "+e.message);setLoading(false);}});
    Papa.parse(CSV_FLOTA,{download:true,header:true,skipEmptyLines:true,complete:(r)=>{fd=r.data;tryFinalize();},error:(e)=>{setError("Error flota: "+e.message);setLoading(false);}});
    Papa.parse(CSV_ULTIMOS,{download:true,header:true,skipEmptyLines:true,
      complete:(r)=>{ud=r.data;ultimosReady=true;clearTimeout(ultimosTimeout);tryFinalize();},
      error:()=>{ud=[];ultimosReady=true;clearTimeout(ultimosTimeout);tryFinalize();}
    });
  },[]);

  const spinStyle=`@keyframes spin{to{transform:rotate(360deg)}}`;

  if(loading)return(<div style={{minHeight:"100vh",background:darkMode?"#0a0c10":"#f0f4f8",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{textAlign:"center"}}>
      <div style={{width:"48px",height:"48px",border:`3px solid ${darkMode?"#252a36":"#e2e8f0"}`,borderTopColor:"#f59e0b",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px"}}/>
      <div style={{fontSize:"16px",fontWeight:600,marginBottom:"8px",color:darkMode?"#e0e4ec":"#0f172a"}}>Cargando Dashboard Operaciones</div>
      <div style={{fontSize:"12px",color:darkMode?"#6b7280":"#64748b"}}>{loadMsg}</div>
      <style>{spinStyle}</style>
    </div>
  </div>);

  if(error)return(<div style={{minHeight:"100vh",background:darkMode?"#0a0c10":"#f0f4f8",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:darkMode?"#12151c":"#fff",border:`1px solid #ef444444`,borderRadius:"12px",padding:"32px",maxWidth:"500px",textAlign:"center"}}>
      <div style={{fontSize:"32px",marginBottom:"12px"}}>❌</div>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"8px",color:darkMode?"#e0e4ec":"#0f172a"}}>Error de Carga</div>
      <div style={{fontSize:"12px",color:darkMode?"#6b7280":"#64748b"}}>{error}</div>
    </div>
  </div>);

  return(<div style={{minHeight:"100vh",background:T.bg,color:T.tx,fontFamily:"'JetBrains Mono','Fira Code',monospace",fontSize:"13px",transition:"background 0.2s,color 0.2s"}}>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <header style={{background:T.sf,borderBottom:`1px solid ${T.bd}`,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:T.headerShadow,gap:"12px",flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{width:"36px",height:"36px",background:"linear-gradient(135deg,#f59e0b,#f97316)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"16px",color:"#000",flexShrink:0}}>TB</div>
        <div>
          <div style={{fontSize:"17px",fontWeight:700,letterSpacing:"-0.5px",color:T.tx}}>Dashboard Operaciones</div>
          <div style={{fontSize:"10px",color:T.txM,letterSpacing:"2px",textTransform:"uppercase"}}>Transportes Bello</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
        <ThemeToggle dark={darkMode} onToggle={toggleTheme}/>
      </div>
    </header>
    <div style={{background:T.isDark?"#0d1017":T.sf2,borderBottom:`1px solid ${T.bd}`,padding:"6px 24px",fontSize:"10px",color:T.txM,display:"flex",gap:"16px",flexWrap:"wrap",justifyContent:"space-between"}}>
      <span>{info.total?.toLocaleString("es-CL")} tramos · {info.tractos} tractos · {info.ramplas} ramplas · {info.clientes} clientes · Flota: {info.flotaTotal} equipos{info.ultimosTotal?" · Últimos viajes: "+info.ultimosTotal+" equipos":""}</span>
      <span>{info.minDate} → {info.maxDate}</span>
    </div>
    <div style={{background:T.sf,borderBottom:`1px solid ${T.bd}`,padding:"8px 24px",overflowX:"auto"}}>
      <nav style={{display:"flex",gap:"2px",background:T.navBg,borderRadius:"10px",padding:"3px",width:"fit-content"}}>
        {VIEWS.map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)} style={{padding:"9px 15px",borderRadius:"8px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:view===v.id?700:500,fontFamily:"inherit",background:view===v.id?T.navActiveBg:"transparent",color:view===v.id?T.navActiveText:T.txM,transition:"all 0.15s",whiteSpace:"nowrap",boxShadow:view===v.id?(T.isDark?"0 1px 3px rgba(0,0,0,0.3)":"0 1px 3px rgba(0,0,0,0.12)"):"none"}}>
            {v.icon} {v.label}
          </button>
        ))}
      </nav>
    </div>
    <main style={{maxWidth:"1400px",margin:"0 auto",padding:"24px"}}>
      {view==="buscar"&&<Buscador tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today} T={T}/>}
      {view==="flota"&&<EstadoFlota data={data} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} ultimosMap={ultimosMap} today={today} T={T}/>}
      {view==="inactivos"&&<Inactivos tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} ultimosMap={ultimosMap} today={today} T={T}/>}
      {view==="clientes"&&<StatsCliente data={data} today={today} T={T}/>}
      {view==="rutas"&&<StatsRuta data={data} today={today} T={T}/>}
      {view==="comparacion"&&<ComparacionMes data={data} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today} T={T}/>}
      {view==="combustible"&&<Combustible data={data} flota={flota} tractoIdx={tractoIdx} today={today} T={T}/>}
      {view==="detalle"&&<Detalle data={data} T={T}/>}
      {view==="inventario"&&<Inventario flota={flota} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} ultimosMap={ultimosMap} today={today} T={T}/>}
    </main>
  </div>);
}
