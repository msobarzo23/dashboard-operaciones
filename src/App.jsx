import { useState, useEffect, useMemo, useCallback } from "react";
import Papa from "papaparse";

const CSV_VIAJES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv";
const CSV_FLOTA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=923646374&single=true&output=csv";
const CSV_ULTIMOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=1827964132&single=true&output=csv";

const SIN_SOLICITUD = "-Viaje sin solicitud -";

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
    <th onClick={() => toggle(col)} style={{ ...style, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
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

    let aT=0,aE=0,totalKm=0,totalTrips=0;
    const sucCount={};

    for(const pat of flotaTractos){
      const tr=tractoIdx.get(pat);
      if(tr?.length>0){
        let hasRecent=false;
        for(const t of tr){
          if(t._date<cutoff) break;
          hasRecent=true;
          if(t.Cliente!==SIN_SOLICITUD){ totalKm+=(Number(t.Kilometro)||0); totalTrips++; }
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
        for(const t of tr){ if(t._date<cutoff) break; hasRecent=true; }
        if(hasRecent) aE++;
        const sc=getSucursal(tr[0].Destino);
        sucCount[sc]=(sucCount[sc]||0)+1;
      } else {
        const u=ultimosMap.get(pat);
        if(u?._date>=cutoff) aE++;
        if(u){ const sc=getSucursal(u.Destino||""); sucCount[sc]=(sucCount[sc]||0)+1; }
      }
    }

    for(const[pat,tr]of tractoIdx.entries()){
      if(flotaTractos.has(pat)) continue;
      for(const t of tr){
        if(t._date<cutoff) break;
        if(t.Cliente!==SIN_SOLICITUD){ totalKm+=(Number(t.Kilometro)||0); totalTrips++; }
      }
    }

    const tKm=[];
    for(const[k,tr]of tractoIdx.entries()){
      let km=0;
      for(const
