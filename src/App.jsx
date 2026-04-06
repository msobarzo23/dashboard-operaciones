import { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";

const CSV_VIAJES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv";
const CSV_FLOTA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=923646374&single=true&output=csv";

// ─── Sucursales ───
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

function getSucursal(loc){if(!loc)return "OTROS";const l=loc.toUpperCase().trim();for(const[s,ls]of Object.entries(SUCURSAL_MAP)){if(ls.includes(l))return s;}return "OTROS";}

const EQUIPO_KEYWORDS = ["RAMPLA","ESTANQUE","FURGON","EXTENSIBLE","CAMA BAJA","MODULAR","MEGALIFT","DOLLY","EQUIPOS ESPECIALES"];
function getCategoria(tipo){
  if(!tipo) return "OTRO";
  const t = tipo.toUpperCase().trim();
  if(t.includes("TRACTOCAMION")) return "TRACTOCAMION";
  if(EQUIPO_KEYWORDS.some(k => t.includes(k))) return "EQUIPO";
  return "OTRO";
}
function cleanPatente(p){if(!p)return "";const s=p.trim().toUpperCase();const i=s.lastIndexOf("-");return i>0?s.substring(0,i):s;}
function parseDate(str){if(!str)return null;const[d,m,y]=str.split("/");return new Date(+y,+m-1,+d);}
function formatDate(d){if(!d)return "-";return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear();}
function daysBetween(d1,d2){return Math.floor((d2-d1)/86400000);}

// ─── THEME TOKENS ───
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

// ─── THEME TOGGLE BUTTON ───
function ThemeToggle({dark, onToggle}) {
  return (
    <button
      onClick={onToggle}
      title={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      style={{
        display:"flex", alignItems:"center", gap:"6px",
        padding:"7px 13px", borderRadius:"20px", border:"none",
        cursor:"pointer", fontSize:"12px", fontWeight:600,
        background: dark ? "#252a36" : "#e2e8f0",
        color: dark ? "#e0e4ec" : "#475569",
        transition:"all 0.2s", whiteSpace:"nowrap",
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.08)",
      }}
    >
      <span style={{fontSize:"15px"}}>{dark ? "☀️" : "🌙"}</span>
      <span style={{display:"none"}}>{dark ? "Claro" : "Oscuro"}</span>
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
          <option value="all">Todo</option>
          <option value="tracto">Tractos</option>
          <option value="rampla">Ramplas</option>
        </select>
        <input
          style={{...input,flex:1,minWidth:"200px"}}
          placeholder="Buscar patente (mín. 3 caracteres)..."
          value={q}
          onChange={e=>setQ(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
        />
      </div>
      {!results && (
        <div style={{marginTop:"12px",padding:"14px",background:T.sf2,borderRadius:"8px",border:`1px dashed ${T.bd}`,textAlign:"center",color:T.txM,fontSize:"13px"}}>
          Ingresa al menos 3 caracteres de la patente para buscar
        </div>
      )}
    </div>
    {results&&results.length===0&&<div style={{...card,textAlign:"center",color:T.txM}}>Sin resultados para "{q}"</div>}
    {results&&results.map((r,i)=>{
      const last=r.tramos[0];const d=daysBetween(last._date,today);const suc=getSucursal(last.Destino);const fi=flota.get(r.pat);
      return(<div key={i} style={{...card,borderLeft:`4px solid ${r.t==="TRACTO"?T.blu:T.ac}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
          <div>
            <span style={badge(r.t==="TRACTO"?T.blu:T.ac)}>{r.t}</span>
            <span style={{fontSize:"22px",fontWeight:700,marginLeft:"10px",color:T.tx}}>{r.pat}</span>
            {fi&&<span style={{fontSize:"11px",color:T.txM,marginLeft:"8px"}}>{fi.marca} {fi.modelo} ({fi.fecha})</span>}
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>ÚLTIMO MOVIMIENTO</div>
            <div style={{fontWeight:700,color:d>30?T.red:d>15?T.ac:T.grn,fontSize:"14px"}}>{last.Fecha} ({d===0?"hoy":`hace ${d}d`})</div>
          </div>
        </div>
        <div style={{background:T.sf2,borderRadius:"8px",padding:"12px",marginBottom:"12px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"10px",border:`1px solid ${T.bd}`}}>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>ÚLTIMO VIAJE</span><br/><strong style={{color:T.tx}}>{last.Origen} → {last.Destino}</strong></div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>SUCURSAL</span><br/><SucBadge s={suc} T={T}/></div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{r.t==="TRACTO"?"RAMPLA":"TRACTO"}</span><br/><strong style={{color:T.tx}}>{r.t==="TRACTO"?last.Rampla:last.Tracto}</strong></div>
          <div><span style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>CLIENTE</span><br/><span style={{color:T.tx}}>{last.Cliente}</span></div>
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
              <tbody>{r.tramos.slice(0,15).map((t,j)=>(
                <tr key={j} style={{background:j%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
                  <td style={td}>{t.Fecha}</td><td style={td}>{t.Origen}</td><td style={td}>{t.Destino}</td>
                  <td style={td}>{r.t==="TRACTO"?t.Rampla:t.Tracto}</td>
                  <td style={td}>{t.Cliente}</td><td style={td}>{t.Carga}</td>
                  <td style={td}>{Number(t.Kilometro||0).toLocaleString("es-CL")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      </div>);
    })}
  </div>);
}

// ═══ VIEW 2: ESTADO DE FLOTA ═══
function EstadoFlota({data,tractoIdx,ramplaIdx,flota,today,T}){
  const[days,setDays]=useState(30);
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const tbl={width:"100%",borderCollapse:"collapse",fontSize:"12px"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx};

  const stats=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-days);
    let fT=0,fE=0,fO=0;for(const[,v]of flota.entries()){const c=getCategoria(v.tipoequipo);if(c==="TRACTOCAMION")fT++;else if(c==="EQUIPO")fE++;else fO++;}
    let aT=0,aE=0,totalKm=0,totalTrips=0;const sucCount={};
    for(const[,tr]of tractoIdx.entries()){const rec=tr.filter(t=>t._date>=cutoff);if(rec.length>0){aT++;totalKm+=rec.reduce((s,t)=>s+(Number(t.Kilometro)||0),0);totalTrips+=rec.length;}}
    for(const[,tr]of ramplaIdx.entries()){if(tr.some(t=>t._date>=cutoff))aE++;const last=tr[0];const sc=getSucursal(last.Destino);sucCount[sc]=(sucCount[sc]||0)+1;}
    const tKm=[];for(const[k,tr]of tractoIdx.entries()){const km=tr.filter(t=>t._date>=cutoff).reduce((s,t)=>s+(Number(t.Kilometro)||0),0);if(km>0)tKm.push([k,km]);}tKm.sort((a,b)=>b[1]-a[1]);
    return{fT,fE,fO,aT,aE,totalKm,totalTrips,sucCount,uT:fT?((aT/fT)*100).toFixed(1):0,uE:fE?((aE/fE)*100).toFixed(1):0,topT:tKm.slice(0,10),totalR:ramplaIdx.size};
  },[data,tractoIdx,ramplaIdx,flota,today,days]);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>📊 Estado de Flota</h2>
      <select value={days} onChange={e=>setDays(+e.target.value)} style={sel}>
        <option value={1}>Último día</option><option value={7}>7 días</option><option value={15}>15 días</option>
        <option value={30}>30 días</option><option value={60}>60 días</option><option value={90}>90 días</option>
      </select>
    </div>
    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"16px",color:T.tx}}>📈 Utilización de Flota (últimos {days} días)</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px"}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
            <span style={{color:T.tx}}>🚛 Tractocamiones</span>
            <span style={{fontWeight:700,color:T.ac}}>{stats.aT+" / "+stats.fT+" ("+stats.uT+"%)"}</span>
          </div>
          <div style={{height:"12px",background:T.sf2,borderRadius:"6px",overflow:"hidden",border:`1px solid ${T.bd}`}}>
            <div style={{height:"100%",width:stats.uT+"%",background:`linear-gradient(90deg,${T.grn},${T.ac})`,borderRadius:"6px"}}/>
          </div>
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
            <span style={{color:T.tx}}>🚃 Equipos</span>
            <span style={{fontWeight:700,color:T.ac}}>{stats.aE+" / "+stats.fE+" ("+stats.uE+"%)"}</span>
          </div>
          <div style={{height:"12px",background:T.sf2,borderRadius:"6px",overflow:"hidden",border:`1px solid ${T.bd}`}}>
            <div style={{height:"100%",width:stats.uE+"%",background:`linear-gradient(90deg,${T.blu},${T.ac})`,borderRadius:"6px"}}/>
          </div>
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
              <td style={td}>{i+1}</td>
              <td style={{...td,fontWeight:600}}>{t}</td>
              <td style={td}>{km.toLocaleString("es-CL")}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  </div>);
}

// ═══ VIEW 3: INACTIVOS ═══
function Inactivos({tractoIdx,ramplaIdx,flota,today,T}){
  const[th,setTh]=useState(30);const[tipo,setTipo]=useState("rampla");
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const tth={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};

  const inactive=useMemo(()=>{
    const idx=tipo==="tracto"?tractoIdx:ramplaIdx;const res=[];
    for(const[k,tr]of idx.entries()){const last=tr[0];const d=daysBetween(last._date,today);if(d>=th){const fi=flota.get(k);res.push({pat:k,days:d,last,suc:getSucursal(last.Destino),fi});}}
    return res.sort((a,b)=>b.days-a.days);
  },[tractoIdx,ramplaIdx,flota,today,th,tipo]);

  const bySuc=useMemo(()=>{const m={};inactive.forEach(r=>{m[r.suc]=(m[r.suc]||0)+1;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[inactive]);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>⚠️ Equipos Inactivos</h2>
      <div style={{display:"flex",gap:"8px"}}>
        <select value={tipo} onChange={e=>setTipo(e.target.value)} style={sel}><option value="rampla">Ramplas/Equipos</option><option value="tracto">Tractos</option></select>
        <select value={th} onChange={e=>setTh(+e.target.value)} style={sel}><option value={7}>+7d</option><option value={15}>+15d</option><option value={30}>+30d</option><option value={60}>+60d</option><option value={90}>+90d</option><option value={180}>+180d</option><option value={365}>+1 año</option></select>
      </div>
    </div>
    <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginBottom:"16px"}}>
      <StatCard T={T} icon="🔴" value={inactive.length} label={"Inactivos +"+th+"d"} color={T.red}/>
      {bySuc.slice(0,3).map(([sc,c])=>(<StatCard key={sc} T={T} icon={<SucBadge s={sc} T={T}/>} value={c} label={"En "+sc} color={T.sucColors[sc]?.accent||"#666"}/>))}
    </div>
    <div style={card}>
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <th style={tth}>Patente</th><th style={tth}>Días</th><th style={tth}>Último Mov.</th>
            <th style={tth}>Último Destino</th><th style={tth}>Sucursal</th>
            <th style={tth}>Pareado</th><th style={tth}>Cliente</th><th style={tth}>Tipo Equipo</th>
          </tr></thead>
          <tbody>{inactive.slice(0,100).map((r,i)=>(
            <tr key={r.pat} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={{...td,fontWeight:700}}>{r.pat}</td>
              <td style={{...td,color:r.days>90?T.red:T.ac,fontWeight:600}}>{r.days}d</td>
              <td style={td}>{r.last.Fecha}</td><td style={td}>{r.last.Destino}</td>
              <td style={td}><SucBadge s={r.suc} T={T}/></td>
              <td style={td}>{tipo==="tracto"?r.last.Rampla:r.last.Tracto}</td>
              <td style={td}>{r.last.Cliente}</td>
              <td style={td}>{r.fi?.tipoequipo||"-"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {inactive.length>100&&<div style={{textAlign:"center",padding:"8px",color:T.txM,fontSize:"11px"}}>Mostrando 100 de {inactive.length}</div>}
    </div>
  </div>);
}

// ═══ VIEW 4: POR CLIENTE ═══
function StatsCliente({data,today,T}){
  const[months,setMonths]=useState(1);const[sortBy,setSortBy]=useState("km");
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};

  const stats=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);
    const filtered=months===99?data:data.filter(d=>d._date>=cutoff);const byC={};
    filtered.forEach(d=>{const c=d.Cliente;if(!byC[c])byC[c]={cliente:c,km:0,tramos:0,sols:new Set(),cargas:{}};byC[c].km+=Number(d.Kilometro)||0;byC[c].tramos++;if(d.Solicitud)byC[c].sols.add(d.Solicitud);const cg=d.Carga?.trim();if(cg&&!/^\d+$/.test(cg))byC[c].cargas[cg]=(byC[c].cargas[cg]||0)+1;});
    let res=Object.values(byC).map(c=>({...c,sols:c.sols.size,topCargas:Object.entries(c.cargas).sort((a,b)=>b[1]-a[1]).slice(0,3)}));
    if(sortBy==="km")res.sort((a,b)=>b.km-a.km);else if(sortBy==="tramos")res.sort((a,b)=>b.tramos-a.tramos);else if(sortBy==="sols")res.sort((a,b)=>b.sols-a.sols);else res.sort((a,b)=>a.cliente.localeCompare(b.cliente));
    return res;
  },[data,today,months,sortBy]);
  const totalKm=stats.reduce((s,c)=>s+c.km,0);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>🏢 Estadísticas por Cliente</h2>
      <div style={{display:"flex",gap:"8px"}}>
        <select value={months} onChange={e=>setMonths(+e.target.value)} style={sel}><option value={1}>1 mes</option><option value={2}>2 meses</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>1 año</option><option value={99}>Todo</option></select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={sel}><option value="km">Por KM</option><option value="tramos">Por Tramos</option><option value="sols">Por Solicitudes</option><option value="nombre">A-Z</option></select>
      </div>
    </div>
    <div style={card}>
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr><th style={th}>#</th><th style={th}>Cliente</th><th style={th}>KM Total</th><th style={th}>%</th><th style={th}>Tramos</th><th style={th}>Solicitudes</th><th style={th}>Cargas Ppales.</th></tr></thead>
          <tbody>{stats.map((c,i)=>(
            <tr key={c.cliente} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={td}>{i+1}</td>
              <td style={{...td,fontWeight:600,maxWidth:"250px",overflow:"hidden",textOverflow:"ellipsis"}}>{c.cliente}</td>
              <td style={{...td,fontWeight:600}}>{c.km.toLocaleString("es-CL")}</td>
              <td style={td}>
                <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                  <div style={{width:"60px",height:"5px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`}}>
                    <div style={{height:"100%",width:(totalKm?(c.km/totalKm*100):0)+"%",background:T.ac,borderRadius:"3px"}}/>
                  </div>
                  <span style={{color:T.txM}}>{totalKm?(c.km/totalKm*100).toFixed(1):0}%</span>
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
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};

  const stats=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);
    const filtered=months===99?data:data.filter(d=>d._date>=cutoff);const byR={};
    filtered.forEach(d=>{const k=d.Origen+" → "+d.Destino;if(!byR[k])byR[k]={ruta:k,o:d.Origen,d:d.Destino,km:0,count:0,cls:new Set(),cargas:{}};byR[k].km+=Number(d.Kilometro)||0;byR[k].count++;byR[k].cls.add(d.Cliente);const cg=d.Carga?.trim();if(cg&&!/^\d+$/.test(cg))byR[k].cargas[cg]=(byR[k].cargas[cg]||0)+1;});
    return Object.values(byR).filter(r=>r.count>=minTrips).map(r=>({...r,avg:Math.round(r.km/r.count),cls:r.cls.size,topCarga:Object.entries(r.cargas).sort((a,b)=>b[1]-a[1])[0]?.[0]||"-"})).sort((a,b)=>b.count-a.count);
  },[data,today,months,minTrips]);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>🛤️ Estadísticas por Ruta</h2>
      <div style={{display:"flex",gap:"8px"}}>
        <select value={months} onChange={e=>setMonths(+e.target.value)} style={sel}><option value={1}>1 mes</option><option value={2}>2 meses</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={99}>Todo</option></select>
        <select value={minTrips} onChange={e=>setMinTrips(+e.target.value)} style={sel}><option value={1}>Min.1</option><option value={5}>Min.5</option><option value={10}>Min.10</option><option value={20}>Min.20</option><option value={50}>Min.50</option></select>
      </div>
    </div>
    <div style={card}>
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr><th style={th}>#</th><th style={th}>Ruta</th><th style={th}>Sucursal O-D</th><th style={th}>Viajes</th><th style={th}>KM Total</th><th style={th}>KM Prom.</th><th style={th}>Clientes</th><th style={th}>Carga Ppal.</th></tr></thead>
          <tbody>{stats.slice(0,80).map((r,i)=>(
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
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};

  const cls=useMemo(()=>[...new Set(data.map(d=>d.Cliente))].sort(),[data]);
  const cgs=useMemo(()=>[...new Set(data.map(d=>d.Carga?.trim()).filter(c=>c&&!/^\d+$/.test(c)))].sort(),[data]);
  const filtered=useMemo(()=>{let f=data;if(fd){const d=new Date(fd);f=f.filter(r=>r._date>=d);}if(fh){const d=new Date(fh);d.setDate(d.getDate()+1);f=f.filter(r=>r._date<d);}
    if(cl)f=f.filter(r=>r.Cliente===cl);if(tr)f=f.filter(r=>r.Tracto?.toUpperCase().includes(tr.toUpperCase()));if(ra)f=f.filter(r=>r.Rampla?.toUpperCase().includes(ra.toUpperCase()));
    if(or)f=f.filter(r=>r.Origen?.toUpperCase().includes(or.toUpperCase()));if(de)f=f.filter(r=>r.Destino?.toUpperCase().includes(de.toUpperCase()));if(cg)f=f.filter(r=>r.Carga===cg);return f;
  },[data,fd,fh,cl,tr,ra,or,de,cg]);
  const totalP=Math.ceil(filtered.length/pp);const pd=filtered.slice((pg-1)*pp,pg*pp);
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
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr><th style={th}>Fecha</th><th style={th}>Solicitud</th><th style={th}>Cliente</th><th style={th}>Tracto</th><th style={th}>Rampla</th><th style={th}>Origen</th><th style={th}>Destino</th><th style={th}>KM</th><th style={th}>Carga</th></tr></thead>
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
function Inventario({flota,tractoIdx,ramplaIdx,today,T}){
  const[filtTipo,setFiltTipo]=useState("");const[filtYear,setFiltYear]=useState("");const[filtMarca,setFiltMarca]=useState("");const[filtCat,setFiltCat]=useState("");const[filtEstado,setFiltEstado]=useState("");const[pg,setPg]=useState(1);const pp=50;
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const input={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"9px 12px",color:T.tx,fontSize:"13px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const badge=(c)=>({display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,background:`${c}22`,color:c,border:`1px solid ${c}44`});

  const flotaArr=useMemo(()=>{const arr=[];for(const[pat,v]of flota.entries()){const cat=getCategoria(v.tipoequipo);const tramos=tractoIdx.get(pat)||ramplaIdx.get(pat);const lastTrip=tramos?tramos[0]:null;
    const daysI=lastTrip?daysBetween(lastTrip._date,today):9999;const age=v.fecha?(today.getFullYear()-parseInt(v.fecha)):null;
    arr.push({pat,...v,cat,lastTrip,daysI,age,estado:daysI<=30?"ACTIVO":daysI<=90?"INACTIVO":daysI===9999?"SIN VIAJES":"PARADO"});}return arr;
  },[flota,tractoIdx,ramplaIdx,today]);
  const tipos=useMemo(()=>[...new Set(flotaArr.map(f=>f.tipoequipo))].sort(),[flotaArr]);
  const years=useMemo(()=>[...new Set(flotaArr.map(f=>f.fecha).filter(Boolean))].sort(),[flotaArr]);
  const marcas=useMemo(()=>[...new Set(flotaArr.map(f=>f.marca).filter(Boolean))].sort(),[flotaArr]);
  const filtered=useMemo(()=>{let f=flotaArr;if(filtTipo)f=f.filter(r=>r.tipoequipo===filtTipo);if(filtYear)f=f.filter(r=>r.fecha===filtYear);if(filtMarca)f=f.filter(r=>r.marca===filtMarca);if(filtCat)f=f.filter(r=>r.cat===filtCat);if(filtEstado)f=f.filter(r=>r.estado===filtEstado);return f;},[flotaArr,filtTipo,filtYear,filtMarca,filtCat,filtEstado]);
  useEffect(()=>setPg(1),[filtTipo,filtYear,filtMarca,filtCat,filtEstado]);
  const totalP=Math.ceil(filtered.length/pp);const pd=filtered.slice((pg-1)*pp,pg*pp);
  const summary=useMemo(()=>{const byYear={};const byEstado={};let totalAge=0,ageCount=0;
    filtered.forEach(f=>{if(f.fecha)byYear[f.fecha]=(byYear[f.fecha]||0)+1;byEstado[f.estado]=(byEstado[f.estado]||0)+1;if(f.age!==null){totalAge+=f.age;ageCount++;}});
    return{byYear:Object.entries(byYear).sort((a,b)=>a[0].localeCompare(b[0])),byEstado,avgAge:ageCount?(totalAge/ageCount).toFixed(1):"-"};},[filtered]);

  return(<div>
    <h2 style={{margin:"0 0 16px",fontSize:"16px",color:T.tx}}>🏗️ Inventario de Flota</h2>
    <div style={card}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"8px"}}>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>CATEGORÍA</label><select value={filtCat} onChange={e=>setFiltCat(e.target.value)} style={input}><option value="">Todas</option><option value="TRACTOCAMION">Tractocamiones</option><option value="EQUIPO">Equipos</option><option value="OTRO">Otros</option></select></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>TIPO EQUIPO</label><select value={filtTipo} onChange={e=>setFiltTipo(e.target.value)} style={input}><option value="">Todos</option>{tipos.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>AÑO</label><select value={filtYear} onChange={e=>setFiltYear(e.target.value)} style={input}><option value="">Todos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>MARCA</label><select value={filtMarca} onChange={e=>setFiltMarca(e.target.value)} style={input}><option value="">Todas</option>{marcas.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
        <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>ESTADO</label><select value={filtEstado} onChange={e=>setFiltEstado(e.target.value)} style={input}><option value="">Todos</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo (31-90d)</option><option value="PARADO">Parado (+90d)</option><option value="SIN VIAJES">Sin viajes</option></select></div>
      </div>
    </div>
    <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginBottom:"16px"}}>
      <StatCard T={T} icon="📦" value={filtered.length} label="Equipos" color={T.ac}/>
      <StatCard T={T} icon="📅" value={summary.avgAge+" años"} label="Antigüedad Promedio" color={T.blu}/>
      <StatCard T={T} icon="✅" value={summary.byEstado["ACTIVO"]||0} label="Activos" color={T.grn}/>
      <StatCard T={T} icon="⏸️" value={(summary.byEstado["INACTIVO"]||0)+(summary.byEstado["PARADO"]||0)} label="Inactivos/Parados" color={T.red}/>
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
          {(()=>{const byT={};filtered.forEach(f=>{byT[f.tipoequipo]=(byT[f.tipoequipo]||0)+1;});return Object.entries(byT).sort((a,b)=>b[1]-a[1]).map(([t,c])=>{const pct=(c/filtered.length*100);return(<div key={t} style={{marginBottom:"6px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px",fontSize:"12px"}}>
              <span style={{color:T.tx}}>{t}</span><span style={{fontWeight:600,color:T.tx}}>{c}</span>
            </div>
            <div style={{height:"6px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`}}>
              <div style={{height:"100%",width:pct+"%",background:T.ac,borderRadius:"3px"}}/>
            </div>
          </div>);});})()}
        </div>
      </div>
    </div>
    <div style={card}>
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr><th style={th}>Patente</th><th style={th}>Categoría</th><th style={th}>Tipo</th><th style={th}>Marca</th><th style={th}>Modelo</th><th style={th}>Año</th><th style={th}>Antigüedad</th><th style={th}>Estado</th><th style={th}>Último Destino</th><th style={th}>Última Fecha</th></tr></thead>
          <tbody>{pd.map((f,i)=>{const ec=f.estado==="ACTIVO"?T.grn:f.estado==="INACTIVO"?T.ac:f.estado==="PARADO"?T.red:T.txM;return(
            <tr key={f.pat} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={{...td,fontWeight:700}}>{f.pat}</td>
              <td style={td}><span style={badge(f.cat==="TRACTOCAMION"?T.blu:f.cat==="EQUIPO"?T.ac:T.txM)}>{f.cat}</span></td>
              <td style={td}>{f.tipoequipo}</td><td style={td}>{f.marca}</td><td style={td}>{f.modelo}</td><td style={td}>{f.fecha}</td>
              <td style={{...td,color:f.age>10?T.red:f.age>6?T.ac:T.grn,fontWeight:600}}>{f.age!==null?f.age+" años":"-"}</td>
              <td style={td}><span style={badge(ec)}>{f.estado}</span></td>
              <td style={td}>{f.lastTrip?.Destino||"-"}</td><td style={td}>{f.lastTrip?.Fecha||"-"}</td>
            </tr>
          );})}
          </tbody>
        </table>
      </div>
      <Pager T={T} page={pg} total={totalP} set={setPg}/>
    </div>
  </div>);
}

// ═══ MAIN APP ═══
const VIEWS=[
  {id:"buscar",label:"Buscador",icon:"🔍"},
  {id:"flota",label:"Estado Flota",icon:"📊"},
  {id:"inactivos",label:"Inactivos",icon:"⚠️"},
  {id:"clientes",label:"Por Cliente",icon:"🏢"},
  {id:"rutas",label:"Por Ruta",icon:"🛤️"},
  {id:"detalle",label:"Detalle",icon:"📋"},
  {id:"inventario",label:"Inventario",icon:"🏗️"}
];

export default function App(){
  const[data,setData]=useState([]);const[flota,setFlota]=useState(new Map());const[loading,setLoading]=useState(true);const[loadMsg,setLoadMsg]=useState("Conectando...");const[error,setError]=useState(null);const[view,setView]=useState("buscar");const[info,setInfo]=useState({});
  const[darkMode,setDarkMode]=useState(()=>{
    try{const s=localStorage.getItem("tb_dark");return s===null?true:s==="true";}catch{return true;}
  });
  const T=useMemo(()=>makeTheme(darkMode),[darkMode]);
  const today=useMemo(()=>new Date(),[]);

  const toggleTheme=()=>{
    setDarkMode(d=>{
      const next=!d;
      try{localStorage.setItem("tb_dark",String(next));}catch{}
      return next;
    });
  };

  const{tractoIdx,ramplaIdx}=useMemo(()=>{
    const ti=new Map(),ri=new Map();
    for(const row of data){
      if(row.Tracto){if(!ti.has(row.Tracto))ti.set(row.Tracto,[]);ti.get(row.Tracto).push(row);}
      if(row.Rampla){if(!ri.has(row.Rampla))ri.set(row.Rampla,[]);ri.get(row.Rampla).push(row);}
    }
    return{tractoIdx:ti,ramplaIdx:ri};
  },[data]);

  useEffect(()=>{let vd=null,fd=null;
    const done=()=>{if(!vd||!fd)return;setLoadMsg("Indexando...");setTimeout(()=>{try{
      let rows=vd.filter(r=>r.Cliente!=="-Viaje sin solicitud -");
      rows=rows.map(r=>({...r,_date:parseDate(r.Fecha)})).filter(r=>r._date);
      rows.sort((a,b)=>b._date-a._date||(b.Expedicion||"").localeCompare(a.Expedicion||""));
      const maxD=rows.length?rows[0]._date:null;const minD=rows.length?rows[rows.length-1]._date:null;
      const fm=new Map();fd.forEach(r=>{const pat=cleanPatente(r.patente);if(pat&&pat!=="AA1111"&&pat!=="AAA111")fm.set(pat,{marca:r.marca?.trim()||"",modelo:r.modelo?.trim()||"",fecha:r.fecha?.trim()||"",tipoequipo:r.tipoequipo?.trim()||""});});
      setInfo({total:rows.length,minDate:minD?formatDate(minD):"-",maxDate:maxD?formatDate(maxD):"-",tractos:new Set(rows.map(r=>r.Tracto).filter(Boolean)).size,ramplas:new Set(rows.map(r=>r.Rampla).filter(Boolean)).size,clientes:new Set(rows.map(r=>r.Cliente).filter(Boolean)).size,flotaTotal:fm.size});
      setData(rows);setFlota(fm);setLoading(false);
    }catch(e){setError("Error: "+e.message);setLoading(false);}},100);};
    setLoadMsg("Descargando viajes...");
    Papa.parse(CSV_VIAJES,{download:true,header:true,skipEmptyLines:true,complete:(r)=>{vd=r.data;setLoadMsg("Descargando flota...");done();},error:(e)=>{setError("Error viajes: "+e.message);setLoading(false);}});
    Papa.parse(CSV_FLOTA,{download:true,header:true,skipEmptyLines:true,complete:(r)=>{fd=r.data;done();},error:(e)=>{setError("Error flota: "+e.message);setLoading(false);}});
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
    {/* HEADER */}
    <header style={{background:T.sf,borderBottom:`1px solid ${T.bd}`,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,boxShadow:T.headerShadow,gap:"12px",flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{width:"36px",height:"36px",background:"linear-gradient(135deg,#f59e0b,#f97316)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"16px",color:"#000",flexShrink:0}}>TB</div>
        <div>
          <div style={{fontSize:"17px",fontWeight:700,letterSpacing:"-0.5px",color:T.tx}}>Dashboard Operaciones</div>
          <div style={{fontSize:"10px",color:T.txM,letterSpacing:"2px",textTransform:"uppercase"}}>Transportes Bello</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
        <div style={{textAlign:"right",fontSize:"10px",color:T.txM,lineHeight:"1.7",display:"none"}}>
          <div>{info.total?.toLocaleString("es-CL")} tramos | {info.tractos} tractos | {info.ramplas} ramplas</div>
          <div>{info.minDate} al {info.maxDate} | {info.clientes} clientes | Flota: {info.flotaTotal} equipos</div>
        </div>
        <ThemeToggle dark={darkMode} onToggle={toggleTheme}/>
      </div>
    </header>
    {/* INFO BAR */}
    <div style={{background:T.isDark?"#0d1017":T.sf2,borderBottom:`1px solid ${T.bd}`,padding:"6px 24px",fontSize:"10px",color:T.txM,display:"flex",gap:"16px",flexWrap:"wrap",justifyContent:"space-between"}}>
      <span>{info.total?.toLocaleString("es-CL")} tramos · {info.tractos} tractos · {info.ramplas} ramplas · {info.clientes} clientes · Flota: {info.flotaTotal} equipos</span>
      <span>{info.minDate} → {info.maxDate}</span>
    </div>
    {/* NAV */}
    <div style={{background:T.sf,borderBottom:`1px solid ${T.bd}`,padding:"8px 24px",overflowX:"auto"}}>
      <nav style={{display:"flex",gap:"2px",background:T.navBg,borderRadius:"10px",padding:"3px",width:"fit-content"}}>
        {VIEWS.map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)} style={{
            padding:"9px 15px",borderRadius:"8px",border:"none",cursor:"pointer",
            fontSize:"12px",fontWeight:view===v.id?700:500,fontFamily:"inherit",
            background:view===v.id?T.navActiveBg:"transparent",
            color:view===v.id?T.navActiveText:T.txM,
            transition:"all 0.15s",whiteSpace:"nowrap",
            boxShadow:view===v.id?(T.isDark?"0 1px 3px rgba(0,0,0,0.3)":"0 1px 3px rgba(0,0,0,0.12)"):"none",
          }}>
            {v.icon} {v.label}
          </button>
        ))}
      </nav>
    </div>
    {/* MAIN */}
    <main style={{maxWidth:"1400px",margin:"0 auto",padding:"24px"}}>
      {view==="buscar"&&<Buscador tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today} T={T}/>}
      {view==="flota"&&<EstadoFlota data={data} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today} T={T}/>}
      {view==="inactivos"&&<Inactivos tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today} T={T}/>}
      {view==="clientes"&&<StatsCliente data={data} today={today} T={T}/>}
      {view==="rutas"&&<StatsRuta data={data} today={today} T={T}/>}
      {view==="detalle"&&<Detalle data={data} T={T}/>}
      {view==="inventario"&&<Inventario flota={flota} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} today={today} T={T}/>}
    </main>
  </div>);
}
