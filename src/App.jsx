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
const SUCURSAL_COLORS = {
  "POZO ALMONTE":{bg:"#1a2744",text:"#5b9cf5",accent:"#3b7de0"},
  "MEJILLONES":{bg:"#1a2a3a",text:"#4ecdc4",accent:"#36a89e"},
  "ANTOFAGASTA":{bg:"#2a1f0e",text:"#f5a623",accent:"#d4891a"},
  "COPIAPO":{bg:"#1a2a1a",text:"#6fcf6f",accent:"#4a9f4a"},
  "COQUIMBO":{bg:"#2a1a2a",text:"#cf6fcf",accent:"#9f4a9f"},
  "SANTIAGO":{bg:"#1f1a2a",text:"#8b9cf5",accent:"#6b7ce0"},
  "OTROS":{bg:"#1a1a1a",text:"#999",accent:"#666"}
};
function getSucursal(loc){if(!loc)return "OTROS";const l=loc.toUpperCase().trim();for(const[s,ls]of Object.entries(SUCURSAL_MAP)){if(ls.includes(l))return s;}return "OTROS";}

// ─── Equipment categories ───
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

// ─── Theme & Styles ───
const T={bg:"#0a0c10",sf:"#12151c",sf2:"#1a1e28",bd:"#252a36",tx:"#e0e4ec",txM:"#6b7280",ac:"#f59e0b",acD:"rgba(245,158,11,0.1)",red:"#ef4444",grn:"#22c55e",blu:"#3b82f6"};
const S={
  app:{minHeight:"100vh",background:T.bg,color:T.tx,fontFamily:"'JetBrains Mono','Fira Code',monospace",fontSize:"13px"},
  header:{background:T.sf,borderBottom:`1px solid ${T.bd}`,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100},
  nav:{display:"flex",gap:"2px",background:T.sf2,borderRadius:"8px",padding:"3px"},
  navBtn:(a)=>({padding:"8px 14px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:a?600:400,fontFamily:"inherit",background:a?T.ac:"transparent",color:a?"#000":T.txM,transition:"all 0.2s",whiteSpace:"nowrap"}),
  card:{background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px"},
  input:{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"8px",padding:"10px 14px",color:T.tx,fontSize:"14px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"},
  sel:{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"},
  badge:(c)=>({display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"11px",fontWeight:600,background:`${c}22`,color:c,border:`1px solid ${c}44`}),
  tbl:{width:"100%",borderCollapse:"collapse",fontSize:"12px"},
  th:{textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf,whiteSpace:"nowrap"},
  td:{padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap"},
  pill:{display:"inline-flex",alignItems:"center",gap:"4px",padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:500},
  scroll:{maxHeight:"500px",overflowY:"auto",overflowX:"auto"},
  row:{display:"flex",gap:"16px",flexWrap:"wrap"},
};

function StatCard({value,label,icon,color}){
  return(<div style={{...S.card,textAlign:"center",flex:"1",minWidth:"150px"}}>
    <div style={{fontSize:"12px",marginBottom:"6px"}}>{icon}</div>
    <div style={{fontSize:"28px",fontWeight:700,color:color||T.ac,lineHeight:1.2}}>{value}</div>
    <div style={{fontSize:"10px",color:T.txM,marginTop:"4px",textTransform:"uppercase",letterSpacing:"1px"}}>{label}</div>
  </div>);
}
function SucBadge({s}){const c=SUCURSAL_COLORS[s]||SUCURSAL_COLORS["OTROS"];return <span style={{...S.pill,background:c.bg,color:c.text,border:`1px solid ${c.accent}44`}}>{s}</span>;}
function Pager({page,total,set}){if(total<=1)return null;return(<div style={{display:"flex",gap:"6px",alignItems:"center",justifyContent:"center",marginTop:"12px"}}><button onClick={()=>set(Math.max(1,page-1))} disabled={page===1} style={{...S.sel,opacity:page===1?.3:1}}>Ant</button><span style={{fontSize:"12px",color:T.txM}}>{page}/{total}</span><button onClick={()=>set(Math.min(total,page+1))} disabled={page===total} style={{...S.sel,opacity:page===total?.3:1}}>Sig</button></div>);}

// ═══ VIEW 1: BUSCADOR ═══
function Buscador({tractoIdx,ramplaIdx,flota,today}){
  const[q,setQ]=useState("");const[tipo,setTipo]=useState("all");
  const results=useMemo(()=>{const s=q.toUpperCase().trim();if(!s||s.length<3)return null;const out=[];
    if(tipo==="all"||tipo==="tracto")for(const[k,v]of tractoIdx.entries()){if(k.includes(s))out.push({t:"TRACTO",pat:k,tramos:v});}
    if(tipo==="all"||tipo==="rampla")for(const[k,v]of ramplaIdx.entries()){if(k.includes(s))out.push({t:"RAMPLA",pat:k,tramos:v});}
    return out.slice(0,20);},[q,tipo,tractoIdx,ramplaIdx]);
  return(<div>
    <div style={S.card}><div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px"}}>{"🔍 Buscador de Equipos"}</div>
      <div style={{display:"flex",gap:"8px"}}>
        <select value={tipo} onChange={e=>setTipo(e.target.value)} style={S.sel}><option value="all">Todo</option><option value="tracto">Tractos</option><option value="rampla">Ramplas</option></select>
        <input style={S.input} placeholder="Buscar patente (min. 3 caracteres)..." value={q} onChange={e=>setQ(e.target.value)}/>
      </div></div>
    {results&&results.length===0&&<div style={{...S.card,textAlign:"center",color:T.txM}}>Sin resultados</div>}
    {results&&results.map((r,i)=>{const last=r.tramos[0];const d=daysBetween(last._date,today);const suc=getSucursal(last.Destino);const fi=flota.get(r.pat);
      return(<div key={i} style={{...S.card,borderLeft:`3px solid ${r.t==="TRACTO"?T.blu:T.ac}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
          <div><span style={S.badge(r.t==="TRACTO"?T.blu:T.ac)}>{r.t}</span><span style={{fontSize:"20px",fontWeight:700,marginLeft:"10px"}}>{r.pat}</span>
            {fi&&<span style={{fontSize:"11px",color:T.txM,marginLeft:"8px"}}>{fi.marca} {fi.modelo} ({fi.fecha})</span>}</div>
          <div style={{textAlign:"right"}}><div style={{fontSize:"10px",color:T.txM}}>ULTIMO MOVIMIENTO</div>
            <div style={{fontWeight:600,color:d>30?T.red:d>15?T.ac:T.grn}}>{last.Fecha} ({d===0?"hoy":`hace ${d}d`})</div></div>
        </div>
        <div style={{background:T.sf2,borderRadius:"8px",padding:"12px",marginBottom:"12px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"8px"}}>
          <div><span style={{color:T.txM,fontSize:"10px"}}>ULTIMO VIAJE</span><br/><strong>{last.Origen} {"→"} {last.Destino}</strong></div>
          <div><span style={{color:T.txM,fontSize:"10px"}}>SUCURSAL</span><br/><SucBadge s={suc}/></div>
          <div><span style={{color:T.txM,fontSize:"10px"}}>{r.t==="TRACTO"?"RAMPLA":"TRACTO"}</span><br/><strong>{r.t==="TRACTO"?last.Rampla:last.Tracto}</strong></div>
          <div><span style={{color:T.txM,fontSize:"10px"}}>CLIENTE</span><br/>{last.Cliente}</div>
          <div><span style={{color:T.txM,fontSize:"10px"}}>CARGA</span><br/>{last.Carga}</div>
          <div><span style={{color:T.txM,fontSize:"10px"}}>KM</span><br/>{Number(last.Kilometro||0).toLocaleString("es-CL")}</div>
          {fi&&<div><span style={{color:T.txM,fontSize:"10px"}}>TIPO EQUIPO</span><br/>{fi.tipoequipo}</div>}
        </div>
        <details><summary style={{cursor:"pointer",fontSize:"12px",color:T.ac,marginBottom:"8px"}}>{"Ultimos "+Math.min(r.tramos.length,15)+" movimientos (de "+r.tramos.length+" totales)"}</summary>
          <div style={S.scroll}><table style={S.tbl}><thead><tr><th style={S.th}>Fecha</th><th style={S.th}>Origen</th><th style={S.th}>Destino</th><th style={S.th}>{r.t==="TRACTO"?"Rampla":"Tracto"}</th><th style={S.th}>Cliente</th><th style={S.th}>Carga</th><th style={S.th}>KM</th></tr></thead>
          <tbody>{r.tramos.slice(0,15).map((t,j)=>(<tr key={j} style={{background:j%2?T.sf2:"transparent"}}><td style={S.td}>{t.Fecha}</td><td style={S.td}>{t.Origen}</td><td style={S.td}>{t.Destino}</td><td style={S.td}>{r.t==="TRACTO"?t.Rampla:t.Tracto}</td><td style={S.td}>{t.Cliente}</td><td style={S.td}>{t.Carga}</td><td style={S.td}>{Number(t.Kilometro||0).toLocaleString("es-CL")}</td></tr>))}</tbody></table></div>
        </details>
      </div>);})}
    {!results&&<div style={{...S.card,textAlign:"center",color:T.txM,padding:"48px"}}><div style={{fontSize:"40px",marginBottom:"12px"}}>{"🔍"}</div>Ingresa al menos 3 caracteres de la patente</div>}
  </div>);
}

// ═══ VIEW 2: ESTADO DE FLOTA ═══
function EstadoFlota({data,tractoIdx,ramplaIdx,flota,today}){
  const[days,setDays]=useState(30);
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
      <h2 style={{margin:0,fontSize:"16px"}}>{"📊 Estado de Flota"}</h2>
      <select value={days} onChange={e=>setDays(+e.target.value)} style={S.sel}><option value={1}>{"Ultimo dia"}</option><option value={7}>{"7 dias"}</option><option value={15}>{"15 dias"}</option><option value={30}>{"30 dias"}</option><option value={60}>{"60 dias"}</option><option value={90}>{"90 dias"}</option></select>
    </div>
    <div style={S.card}><div style={{fontSize:"14px",fontWeight:600,marginBottom:"16px"}}>{"📈 Utilizacion de Flota (ultimos "+days+" dias)"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px"}}>
        <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}><span>{"🚛 Tractocamiones"}</span><span style={{fontWeight:700,color:T.ac}}>{stats.aT+" / "+stats.fT+" ("+stats.uT+"%)"}</span></div>
          <div style={{height:"12px",background:T.sf2,borderRadius:"6px",overflow:"hidden"}}><div style={{height:"100%",width:stats.uT+"%",background:`linear-gradient(90deg,${T.grn},${T.ac})`,borderRadius:"6px",transition:"width 0.5s"}}/></div></div>
        <div><div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}><span>{"🚃 Equipos"}</span><span style={{fontWeight:700,color:T.ac}}>{stats.aE+" / "+stats.fE+" ("+stats.uE+"%)"}</span></div>
          <div style={{height:"12px",background:T.sf2,borderRadius:"6px",overflow:"hidden"}}><div style={{height:"100%",width:stats.uE+"%",background:`linear-gradient(90deg,${T.blu},${T.ac})`,borderRadius:"6px",transition:"width 0.5s"}}/></div></div>
      </div></div>
    <div style={S.row}><StatCard icon="🛣️" value={Math.round(stats.totalKm/1000).toLocaleString("es-CL")+"K"} label="KM Totales" color={T.grn}/><StatCard icon="📋" value={stats.totalTrips.toLocaleString("es-CL")} label="Tramos"/><StatCard icon="🏢" value={stats.fT+stats.fE+stats.fO} label="Flota Total"/><StatCard icon="🔧" value={stats.fO} label="Otros (camiones, gruas)"/></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginTop:"16px"}}>
      <div style={S.card}><div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px"}}>{"🗺️ Equipos por Sucursal (ultima ubicacion)"}</div>
        {Object.entries(stats.sucCount).sort((a,b)=>b[1]-a[1]).map(([sc,c])=>{const pct=(c/stats.totalR*100).toFixed(1);return(<div key={sc} style={{marginBottom:"8px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}><SucBadge s={sc}/><span style={{fontSize:"12px",color:T.txM}}>{c+" ("+pct+"%)"}</span></div><div style={{height:"6px",background:T.sf2,borderRadius:"3px"}}><div style={{height:"100%",width:pct+"%",background:SUCURSAL_COLORS[sc]?.accent||"#666",borderRadius:"3px"}}/></div></div>);})}</div>
      <div style={S.card}><div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px"}}>{"🏆 Top 10 Tractos por KM"}</div>
        <table style={S.tbl}><thead><tr><th style={S.th}>#</th><th style={S.th}>Tracto</th><th style={S.th}>KM</th></tr></thead>
        <tbody>{stats.topT.map(([t,km],i)=>(<tr key={t} style={{background:i%2?T.sf2:"transparent"}}><td style={S.td}>{i+1}</td><td style={{...S.td,fontWeight:600}}>{t}</td><td style={S.td}>{km.toLocaleString("es-CL")}</td></tr>))}</tbody></table></div>
    </div>
  </div>);
}

// ═══ VIEW 3: INACTIVOS ═══
function Inactivos({tractoIdx,ramplaIdx,flota,today}){
  const[th,setTh]=useState(30);const[tipo,setTipo]=useState("rampla");
  const inactive=useMemo(()=>{const idx=tipo==="tracto"?tractoIdx:ramplaIdx;const res=[];
    for(const[k,tr]of idx.entries()){const last=tr[0];const d=daysBetween(last._date,today);if(d>=th){const fi=flota.get(k);res.push({pat:k,days:d,last,suc:getSucursal(last.Destino),fi});}}
    return res.sort((a,b)=>b.days-a.days);},[tractoIdx,ramplaIdx,flota,today,th,tipo]);
  const bySuc=useMemo(()=>{const m={};inactive.forEach(r=>{m[r.suc]=(m[r.suc]||0)+1;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[inactive]);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px"}}>{"⚠️ Equipos Inactivos"}</h2>
      <div style={{display:"flex",gap:"8px"}}><select value={tipo} onChange={e=>setTipo(e.target.value)} style={S.sel}><option value="rampla">Ramplas/Equipos</option><option value="tracto">Tractos</option></select>
        <select value={th} onChange={e=>setTh(+e.target.value)} style={S.sel}><option value={7}>+7d</option><option value={15}>+15d</option><option value={30}>+30d</option><option value={60}>+60d</option><option value={90}>+90d</option><option value={180}>+180d</option><option value={365}>+1 ano</option></select></div>
    </div>
    <div style={S.row}><StatCard icon="🔴" value={inactive.length} label={"Inactivos +"+th+"d"} color={T.red}/>{bySuc.slice(0,3).map(([sc,c])=>(<StatCard key={sc} icon={<SucBadge s={sc}/>} value={c} label={"En "+sc} color={SUCURSAL_COLORS[sc]?.accent||"#666"}/>))}</div>
    <div style={S.card}><div style={S.scroll}><table style={S.tbl}><thead><tr><th style={S.th}>Patente</th><th style={S.th}>Dias</th><th style={S.th}>Ultimo Mov.</th><th style={S.th}>Ultimo Destino</th><th style={S.th}>Sucursal</th><th style={S.th}>Pareado</th><th style={S.th}>Cliente</th><th style={S.th}>Tipo Equipo</th></tr></thead>
      <tbody>{inactive.slice(0,100).map((r,i)=>(<tr key={r.pat} style={{background:i%2?T.sf2:"transparent"}}><td style={{...S.td,fontWeight:700}}>{r.pat}</td><td style={{...S.td,color:r.days>90?T.red:T.ac,fontWeight:600}}>{r.days+"d"}</td><td style={S.td}>{r.last.Fecha}</td><td style={S.td}>{r.last.Destino}</td><td style={S.td}><SucBadge s={r.suc}/></td><td style={S.td}>{tipo==="tracto"?r.last.Rampla:r.last.Tracto}</td><td style={S.td}>{r.last.Cliente}</td><td style={S.td}>{r.fi?.tipoequipo||"-"}</td></tr>))}</tbody></table></div>
    {inactive.length>100&&<div style={{textAlign:"center",padding:"8px",color:T.txM,fontSize:"11px"}}>{"Mostrando 100 de "+inactive.length}</div>}</div>
  </div>);
}

// ═══ VIEW 4: POR CLIENTE ═══
function StatsCliente({data,today}){
  const[months,setMonths]=useState(1);const[sortBy,setSortBy]=useState("km");
  const stats=useMemo(()=>{const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);const filtered=months===99?data:data.filter(d=>d._date>=cutoff);const byC={};
    filtered.forEach(d=>{const c=d.Cliente;if(!byC[c])byC[c]={cliente:c,km:0,tramos:0,sols:new Set(),cargas:{}};byC[c].km+=Number(d.Kilometro)||0;byC[c].tramos++;if(d.Solicitud)byC[c].sols.add(d.Solicitud);const cg=d.Carga?.trim();if(cg&&!/^\d+$/.test(cg))byC[c].cargas[cg]=(byC[c].cargas[cg]||0)+1;});
    let res=Object.values(byC).map(c=>({...c,sols:c.sols.size,topCargas:Object.entries(c.cargas).sort((a,b)=>b[1]-a[1]).slice(0,3)}));
    if(sortBy==="km")res.sort((a,b)=>b.km-a.km);else if(sortBy==="tramos")res.sort((a,b)=>b.tramos-a.tramos);else if(sortBy==="sols")res.sort((a,b)=>b.sols-a.sols);else res.sort((a,b)=>a.cliente.localeCompare(b.cliente));return res;},[data,today,months,sortBy]);
  const totalKm=stats.reduce((s,c)=>s+c.km,0);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px"}}>{"🏢 Estadisticas por Cliente"}</h2>
      <div style={{display:"flex",gap:"8px"}}><select value={months} onChange={e=>setMonths(+e.target.value)} style={S.sel}><option value={1}>1 mes</option><option value={2}>2 meses</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>1 ano</option><option value={99}>Todo</option></select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={S.sel}><option value="km">Por KM</option><option value="tramos">Por Tramos</option><option value="sols">Por Solicitudes</option><option value="nombre">A-Z</option></select></div>
    </div>
    <div style={S.card}><div style={S.scroll}><table style={S.tbl}><thead><tr><th style={S.th}>#</th><th style={S.th}>Cliente</th><th style={S.th}>KM Total</th><th style={S.th}>%</th><th style={S.th}>Tramos</th><th style={S.th}>Solicitudes</th><th style={S.th}>Cargas Ppales.</th></tr></thead>
      <tbody>{stats.map((c,i)=>(<tr key={c.cliente} style={{background:i%2?T.sf2:"transparent"}}><td style={S.td}>{i+1}</td><td style={{...S.td,fontWeight:600,maxWidth:"250px",overflow:"hidden",textOverflow:"ellipsis"}}>{c.cliente}</td><td style={{...S.td,fontWeight:600}}>{c.km.toLocaleString("es-CL")}</td>
        <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:"60px",height:"5px",background:T.sf2,borderRadius:"3px"}}><div style={{height:"100%",width:(totalKm?(c.km/totalKm*100):0)+"%",background:T.ac,borderRadius:"3px"}}/></div><span>{totalKm?(c.km/totalKm*100).toFixed(1):0}%</span></div></td>
        <td style={S.td}>{c.tramos.toLocaleString("es-CL")}</td><td style={S.td}>{c.sols.toLocaleString("es-CL")}</td>
        <td style={S.td}>{c.topCargas.map(([cg,n])=>(<span key={cg} style={{...S.pill,background:T.acD,color:T.ac,marginRight:"4px"}}>{cg+" ("+n+")"}</span>))}</td></tr>))}</tbody></table></div></div>
  </div>);
}

// ═══ VIEW 5: POR RUTA ═══
function StatsRuta({data,today}){
  const[months,setMonths]=useState(1);const[minTrips,setMinTrips]=useState(5);
  const stats=useMemo(()=>{const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);const filtered=months===99?data:data.filter(d=>d._date>=cutoff);const byR={};
    filtered.forEach(d=>{const k=d.Origen+" → "+d.Destino;if(!byR[k])byR[k]={ruta:k,o:d.Origen,d:d.Destino,km:0,count:0,cls:new Set(),cargas:{}};byR[k].km+=Number(d.Kilometro)||0;byR[k].count++;byR[k].cls.add(d.Cliente);const cg=d.Carga?.trim();if(cg&&!/^\d+$/.test(cg))byR[k].cargas[cg]=(byR[k].cargas[cg]||0)+1;});
    return Object.values(byR).filter(r=>r.count>=minTrips).map(r=>({...r,avg:Math.round(r.km/r.count),cls:r.cls.size,topCarga:Object.entries(r.cargas).sort((a,b)=>b[1]-a[1])[0]?.[0]||"-"})).sort((a,b)=>b.count-a.count);},[data,today,months,minTrips]);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px"}}>{"🛤️ Estadisticas por Ruta"}</h2>
      <div style={{display:"flex",gap:"8px"}}><select value={months} onChange={e=>setMonths(+e.target.value)} style={S.sel}><option value={1}>1 mes</option><option value={2}>2 meses</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={99}>Todo</option></select>
        <select value={minTrips} onChange={e=>setMinTrips(+e.target.value)} style={S.sel}><option value={1}>Min.1</option><option value={5}>Min.5</option><option value={10}>Min.10</option><option value={20}>Min.20</option><option value={50}>Min.50</option></select></div>
    </div>
    <div style={S.card}><div style={S.scroll}><table style={S.tbl}><thead><tr><th style={S.th}>#</th><th style={S.th}>Ruta</th><th style={S.th}>Sucursal O-D</th><th style={S.th}>Viajes</th><th style={S.th}>KM Total</th><th style={S.th}>KM Prom.</th><th style={S.th}>Clientes</th><th style={S.th}>Carga Ppal.</th></tr></thead>
      <tbody>{stats.slice(0,80).map((r,i)=>(<tr key={r.ruta} style={{background:i%2?T.sf2:"transparent"}}><td style={S.td}>{i+1}</td><td style={{...S.td,fontWeight:600}}>{r.ruta}</td><td style={S.td}><SucBadge s={getSucursal(r.o)}/>{" → "}<SucBadge s={getSucursal(r.d)}/></td><td style={{...S.td,fontWeight:600,color:T.ac}}>{r.count}</td><td style={S.td}>{r.km.toLocaleString("es-CL")}</td><td style={S.td}>{r.avg.toLocaleString("es-CL")}</td><td style={S.td}>{r.cls}</td><td style={S.td}>{r.topCarga}</td></tr>))}</tbody></table></div></div>
  </div>);
}

// ═══ VIEW 6: DETALLE TRAMOS ═══
function Detalle({data}){
  const[fd,setFd]=useState("");const[fh,setFh]=useState("");const[cl,setCl]=useState("");const[tr,setTr]=useState("");const[ra,setRa]=useState("");const[or,setOr]=useState("");const[de,setDe]=useState("");const[cg,setCg]=useState("");const[pg,setPg]=useState(1);const pp=50;
  const cls=useMemo(()=>[...new Set(data.map(d=>d.Cliente))].sort(),[data]);
  const cgs=useMemo(()=>[...new Set(data.map(d=>d.Carga?.trim()).filter(c=>c&&!/^\d+$/.test(c)))].sort(),[data]);
  const filtered=useMemo(()=>{let f=data;if(fd){const d=new Date(fd);f=f.filter(r=>r._date>=d);}if(fh){const d=new Date(fh);d.setDate(d.getDate()+1);f=f.filter(r=>r._date<d);}
    if(cl)f=f.filter(r=>r.Cliente===cl);if(tr)f=f.filter(r=>r.Tracto?.toUpperCase().includes(tr.toUpperCase()));if(ra)f=f.filter(r=>r.Rampla?.toUpperCase().includes(ra.toUpperCase()));
    if(or)f=f.filter(r=>r.Origen?.toUpperCase().includes(or.toUpperCase()));if(de)f=f.filter(r=>r.Destino?.toUpperCase().includes(de.toUpperCase()));if(cg)f=f.filter(r=>r.Carga===cg);return f;},[data,fd,fh,cl,tr,ra,or,de,cg]);
  const totalP=Math.ceil(filtered.length/pp);const pd=filtered.slice((pg-1)*pp,pg*pp);
  const totalKm=useMemo(()=>filtered.reduce((s,d)=>s+(Number(d.Kilometro)||0),0),[filtered]);
  useEffect(()=>setPg(1),[fd,fh,cl,tr,ra,or,de,cg]);
  return(<div>
    <h2 style={{margin:"0 0 16px",fontSize:"16px"}}>{"📋 Detalle de Tramos"}</h2>
    <div style={S.card}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:"8px"}}>
      <div><label style={{fontSize:"10px",color:T.txM}}>DESDE</label><input type="date" value={fd} onChange={e=>setFd(e.target.value)} style={S.input}/></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>HASTA</label><input type="date" value={fh} onChange={e=>setFh(e.target.value)} style={S.input}/></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>CLIENTE</label><select value={cl} onChange={e=>setCl(e.target.value)} style={{...S.input,padding:"9px 12px"}}><option value="">Todos</option>{cls.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>TRACTO</label><input value={tr} onChange={e=>setTr(e.target.value)} placeholder="Filtrar..." style={S.input}/></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>RAMPLA</label><input value={ra} onChange={e=>setRa(e.target.value)} placeholder="Filtrar..." style={S.input}/></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>ORIGEN</label><input value={or} onChange={e=>setOr(e.target.value)} placeholder="Filtrar..." style={S.input}/></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>DESTINO</label><input value={de} onChange={e=>setDe(e.target.value)} placeholder="Filtrar..." style={S.input}/></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>CARGA</label><select value={cg} onChange={e=>setCg(e.target.value)} style={{...S.input,padding:"9px 12px"}}><option value="">Todas</option>{cgs.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
    </div></div>
    <div style={{display:"flex",gap:"16px",marginBottom:"16px"}}><div style={{...S.pill,background:T.acD,color:T.ac}}>{filtered.length.toLocaleString("es-CL")+" tramos"}</div><div style={{...S.pill,background:"rgba(34,197,94,0.1)",color:T.grn}}>{totalKm.toLocaleString("es-CL")+" km"}</div><div style={{...S.pill,background:"rgba(59,130,246,0.1)",color:T.blu}}>{new Set(filtered.map(d=>d.Solicitud)).size.toLocaleString("es-CL")+" solicitudes"}</div></div>
    <div style={S.card}><div style={S.scroll}><table style={S.tbl}><thead><tr><th style={S.th}>Fecha</th><th style={S.th}>Solicitud</th><th style={S.th}>Cliente</th><th style={S.th}>Tracto</th><th style={S.th}>Rampla</th><th style={S.th}>Origen</th><th style={S.th}>Destino</th><th style={S.th}>KM</th><th style={S.th}>Carga</th></tr></thead>
      <tbody>{pd.map((d,i)=>(<tr key={d.Expedicion+"-"+i} style={{background:i%2?T.sf2:"transparent"}}><td style={S.td}>{d.Fecha}</td><td style={S.td}>{d.Solicitud}</td><td style={{...S.td,maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis"}}>{d.Cliente}</td><td style={{...S.td,fontWeight:600}}>{d.Tracto}</td><td style={{...S.td,fontWeight:600}}>{d.Rampla}</td><td style={S.td}>{d.Origen}</td><td style={S.td}>{d.Destino}</td><td style={S.td}>{Number(d.Kilometro||0).toLocaleString("es-CL")}</td><td style={S.td}>{d.Carga}</td></tr>))}</tbody></table></div>
    <Pager page={pg} total={totalP} set={setPg}/></div>
  </div>);
}

// ═══ VIEW 7: INVENTARIO DE FLOTA ═══
function Inventario({flota,tractoIdx,ramplaIdx,today}){
  const[filtTipo,setFiltTipo]=useState("");const[filtYear,setFiltYear]=useState("");const[filtMarca,setFiltMarca]=useState("");const[filtCat,setFiltCat]=useState("");const[filtEstado,setFiltEstado]=useState("");const[pg,setPg]=useState(1);const pp=50;
  const flotaArr=useMemo(()=>{const arr=[];for(const[pat,v]of flota.entries()){const cat=getCategoria(v.tipoequipo);const tramos=tractoIdx.get(pat)||ramplaIdx.get(pat);const lastTrip=tramos?tramos[0]:null;
    const daysI=lastTrip?daysBetween(lastTrip._date,today):9999;const age=v.fecha?(today.getFullYear()-parseInt(v.fecha)):null;
    arr.push({pat,...v,cat,lastTrip,daysI,age,estado:daysI<=30?"ACTIVO":daysI<=90?"INACTIVO":daysI===9999?"SIN VIAJES":"PARADO"});}return arr;},[flota,tractoIdx,ramplaIdx,today]);
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
    <h2 style={{margin:"0 0 16px",fontSize:"16px"}}>{"🏗️ Inventario de Flota"}</h2>
    <div style={S.card}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:"8px"}}>
      <div><label style={{fontSize:"10px",color:T.txM}}>CATEGORIA</label><select value={filtCat} onChange={e=>setFiltCat(e.target.value)} style={{...S.input,padding:"9px 12px"}}><option value="">Todas</option><option value="TRACTOCAMION">Tractocamiones</option><option value="EQUIPO">Equipos</option><option value="OTRO">Otros</option></select></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>TIPO EQUIPO</label><select value={filtTipo} onChange={e=>setFiltTipo(e.target.value)} style={{...S.input,padding:"9px 12px"}}><option value="">Todos</option>{tipos.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>AÑO</label><select value={filtYear} onChange={e=>setFiltYear(e.target.value)} style={{...S.input,padding:"9px 12px"}}><option value="">Todos</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>MARCA</label><select value={filtMarca} onChange={e=>setFiltMarca(e.target.value)} style={{...S.input,padding:"9px 12px"}}><option value="">Todas</option>{marcas.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
      <div><label style={{fontSize:"10px",color:T.txM}}>ESTADO</label><select value={filtEstado} onChange={e=>setFiltEstado(e.target.value)} style={{...S.input,padding:"9px 12px"}}><option value="">Todos</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo (31-90d)</option><option value="PARADO">Parado (+90d)</option><option value="SIN VIAJES">Sin viajes</option></select></div>
    </div></div>
    <div style={S.row}><StatCard icon="📦" value={filtered.length} label="Equipos" color={T.ac}/><StatCard icon="📅" value={summary.avgAge+" anos"} label="Antiguedad Promedio" color={T.blu}/><StatCard icon="✅" value={summary.byEstado["ACTIVO"]||0} label="Activos" color={T.grn}/><StatCard icon="⏸️" value={(summary.byEstado["INACTIVO"]||0)+(summary.byEstado["PARADO"]||0)} label="Inactivos/Parados" color={T.red}/></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
      <div style={S.card}><div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px"}}>{"📅 Distribucion por Ano"}</div><div style={{maxHeight:"300px",overflowY:"auto"}}>
        {summary.byYear.map(([y,c])=>{const pct=(c/filtered.length*100);const age=today.getFullYear()-parseInt(y);return(<div key={y} style={{marginBottom:"6px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px",fontSize:"12px"}}><span><strong>{y}</strong> <span style={{color:T.txM}}>{"("+age+" anos)"}</span></span><span>{c+" equipos"}</span></div><div style={{height:"6px",background:T.sf2,borderRadius:"3px"}}><div style={{height:"100%",width:pct+"%",background:age>10?T.red:age>6?T.ac:T.grn,borderRadius:"3px"}}/></div></div>);})}</div></div>
      <div style={S.card}><div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px"}}>{"🏷️ Por Tipo de Equipo"}</div><div style={{maxHeight:"300px",overflowY:"auto"}}>
        {(()=>{const byT={};filtered.forEach(f=>{byT[f.tipoequipo]=(byT[f.tipoequipo]||0)+1;});return Object.entries(byT).sort((a,b)=>b[1]-a[1]).map(([t,c])=>{const pct=(c/filtered.length*100);return(<div key={t} style={{marginBottom:"6px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px",fontSize:"12px"}}><span>{t}</span><span style={{fontWeight:600}}>{c}</span></div><div style={{height:"6px",background:T.sf2,borderRadius:"3px"}}><div style={{height:"100%",width:pct+"%",background:T.ac,borderRadius:"3px"}}/></div></div>);});})()}</div></div>
    </div>
    <div style={S.card}><div style={S.scroll}><table style={S.tbl}><thead><tr><th style={S.th}>Patente</th><th style={S.th}>Categoria</th><th style={S.th}>Tipo</th><th style={S.th}>Marca</th><th style={S.th}>Modelo</th><th style={S.th}>Ano</th><th style={S.th}>Antiguedad</th><th style={S.th}>Estado</th><th style={S.th}>Ultimo Destino</th><th style={S.th}>Ultima Fecha</th></tr></thead>
      <tbody>{pd.map((f,i)=>{const ec=f.estado==="ACTIVO"?T.grn:f.estado==="INACTIVO"?T.ac:f.estado==="PARADO"?T.red:T.txM;return(<tr key={f.pat} style={{background:i%2?T.sf2:"transparent"}}><td style={{...S.td,fontWeight:700}}>{f.pat}</td><td style={S.td}><span style={S.badge(f.cat==="TRACTOCAMION"?T.blu:f.cat==="EQUIPO"?T.ac:T.txM)}>{f.cat}</span></td><td style={S.td}>{f.tipoequipo}</td><td style={S.td}>{f.marca}</td><td style={S.td}>{f.modelo}</td><td style={S.td}>{f.fecha}</td><td style={{...S.td,color:f.age>10?T.red:f.age>6?T.ac:T.grn,fontWeight:600}}>{f.age!==null?f.age+" anos":"-"}</td><td style={S.td}><span style={S.badge(ec)}>{f.estado}</span></td><td style={S.td}>{f.lastTrip?.Destino||"-"}</td><td style={S.td}>{f.lastTrip?.Fecha||"-"}</td></tr>);})}</tbody></table></div>
    <Pager page={pg} total={totalP} set={setPg}/></div>
  </div>);
}

// ═══ MAIN APP ═══
const VIEWS=[{id:"buscar",label:"Buscador",icon:"🔍"},{id:"flota",label:"Estado Flota",icon:"📊"},{id:"inactivos",label:"Inactivos",icon:"⚠️"},{id:"clientes",label:"Por Cliente",icon:"🏢"},{id:"rutas",label:"Por Ruta",icon:"🛤️"},{id:"detalle",label:"Detalle",icon:"📋"},{id:"inventario",label:"Inventario",icon:"🏗️"}];

export default function App(){
  const[data,setData]=useState([]);const[flota,setFlota]=useState(new Map());const[loading,setLoading]=useState(true);const[loadMsg,setLoadMsg]=useState("Conectando...");const[error,setError]=useState(null);const[view,setView]=useState("buscar");const[info,setInfo]=useState({});
  const today=useMemo(()=>new Date(),[]);
  const{tractoIdx,ramplaIdx}=useMemo(()=>{const ti=new Map(),ri=new Map();for(const row of data){if(row.Tracto){if(!ti.has(row.Tracto))ti.set(row.Tracto,[]);ti.get(row.Tracto).push(row);}if(row.Rampla){if(!ri.has(row.Rampla))ri.set(row.Rampla,[]);ri.get(row.Rampla).push(row);}}return{tractoIdx:ti,ramplaIdx:ri};},[data]);

  useEffect(()=>{let vd=null,fd=null;
    const done=()=>{if(!vd||!fd)return;setLoadMsg("Indexando...");setTimeout(()=>{try{
      let rows=vd.filter(r=>r.Cliente!=="-Viaje sin solicitud -");rows=rows.map(r=>({...r,_date:parseDate(r.Fecha)})).filter(r=>r._date);rows.sort((a,b)=>b._date-a._date||(b.Expedicion||"").localeCompare(a.Expedicion||""));
      const maxD=rows.length?rows[0]._date:null;const minD=rows.length?rows[rows.length-1]._date:null;
      const fm=new Map();fd.forEach(r=>{const pat=cleanPatente(r.patente);if(pat&&pat!=="AA1111"&&pat!=="AAA111")fm.set(pat,{marca:r.marca?.trim()||"",modelo:r.modelo?.trim()||"",fecha:r.fecha?.trim()||"",tipoequipo:r.tipoequipo?.trim()||""});});
      setInfo({total:rows.length,minDate:minD?formatDate(minD):"-",maxDate:maxD?formatDate(maxD):"-",tractos:new Set(rows.map(r=>r.Tracto).filter(Boolean)).size,ramplas:new Set(rows.map(r=>r.Rampla).filter(Boolean)).size,clientes:new Set(rows.map(r=>r.Cliente).filter(Boolean)).size,flotaTotal:fm.size});
      setData(rows);setFlota(fm);setLoading(false);}catch(e){setError("Error: "+e.message);setLoading(false);}},100);};
    setLoadMsg("Descargando viajes...");
    Papa.parse(CSV_VIAJES,{download:true,header:true,skipEmptyLines:true,complete:(r)=>{vd=r.data;setLoadMsg("Descargando flota...");done();},error:(e)=>{setError("Error viajes: "+e.message);setLoading(false);}});
    Papa.parse(CSV_FLOTA,{download:true,header:true,skipEmptyLines:true,complete:(r)=>{fd=r.data;done();},error:(e)=>{setError("Error flota: "+e.message);setLoading(false);}});
  },[]);

  if(loading)return(<div style={{...S.app,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{width:"48px",height:"48px",border:`3px solid ${T.bd}`,borderTopColor:T.ac,borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 16px"}}/><div style={{fontSize:"16px",fontWeight:600,marginBottom:"8px"}}>Cargando Dashboard Operaciones</div><div style={{fontSize:"12px",color:T.txM}}>{loadMsg}</div><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style></div></div>);
  if(error)return(<div style={{...S.app,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{...S.card,maxWidth:"500px",textAlign:"center",borderColor:T.red}}><div style={{fontSize:"32px",marginBottom:"12px"}}>{"❌"}</div><div style={{fontSize:"14px",fontWeight:600,marginBottom:"8px"}}>Error de Carga</div><div style={{fontSize:"12px",color:T.txM}}>{error}</div></div></div>);

  return(<div style={S.app}>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <header style={S.header}>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{width:"36px",height:"36px",background:`linear-gradient(135deg,${T.ac},#f97316)`,borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"16px",color:"#000"}}>TB</div>
        <div><div style={{fontSize:"18px",fontWeight:700,letterSpacing:"-0.5px"}}>Dashboard Operaciones</div><div style={{fontSize:"10px",color:T.txM,letterSpacing:"2px",textTransform:"uppercase"}}>Transportes Bello</div></div>
      </div>
      <div style={{textAlign:"right",fontSize:"10px",color:T.txM,lineHeight:"1.6"}}><div>{info.total?.toLocaleString("es-CL")+" tramos | "+info.tractos+" tractos | "+info.ramplas+" ramplas"}</div><div>{info.minDate+" al "+info.maxDate+" | "+info.clientes+" clientes | Flota: "+info.flotaTotal+" equipos"}</div></div>
    </header>
    <div style={{background:T.sf,borderBottom:`1px solid ${T.bd}`,padding:"8px 24px",overflowX:"auto"}}><nav style={S.nav}>{VIEWS.map(v=>(<button key={v.id} onClick={()=>setView(v.id)} style={S.navBtn(view===v.id)}>{v.icon+" "+v.label}</button>))}</nav></div>
    <main style={{maxWidth:"1400px",margin:"0 auto",padding:"24px"}}>
      {view==="buscar"&&<Buscador tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today}/>}
      {view==="flota"&&<EstadoFlota data={data} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today}/>}
      {view==="inactivos"&&<Inactivos tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today}/>}
      {view==="clientes"&&<StatsCliente data={data} today={today}/>}
      {view==="rutas"&&<StatsRuta data={data} today={today}/>}
      {view==="detalle"&&<Detalle data={data}/>}
      {view==="inventario"&&<Inventario flota={flota} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} today={today}/>}
    </main>
  </div>);
}
