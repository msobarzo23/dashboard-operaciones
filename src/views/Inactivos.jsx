import { useState, useMemo, useEffect } from "react";
import { getSucursal, getCategoria, getEstadoEquipo, ESTADO_COLOR, SIN_SOLICITUD, daysBetween, formatDate } from "../utils.js";
import { useSortable, SortTh, SucBadge } from "../components/ui.jsx";
import { printReporte } from "./EstadoFlota.jsx";

export default function Inactivos({tractoIdx,ramplaIdx,flota,ultimosMap,today,T}){
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
      enCatalogoArr.push({pat,days,lastRecord,suc:lastRecord?getSucursal(lastRecord.Destino):"OTROS",fi,estado,enCatalogo:true,"lastRecord.Fecha":lastRecord?._date||null,"fi.tipoequipo":fi.tipoequipo||"",esSinSol});
    }
    for(const[pat,tr] of idx.entries()){
      if(flota.has(pat)) continue;
      const lastDate=tr[0]._date;
      const days=daysBetween(lastDate,today);
      const last=tr[0];
      const estado=getEstadoEquipo(days);
      const esSinSol = last.Cliente === SIN_SOLICITUD;
      fueraCatalogoArr.push({pat,days,lastRecord:last,suc:getSucursal(last.Destino),fi:null,estado,enCatalogo:false,"lastRecord.Fecha":last._date||null,"fi.tipoequipo":"",esSinSol});
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
