import { useState, useMemo, useEffect } from "react";
import { getCategoria, getEstadoEquipo, ESTADO_COLOR, SIN_SOLICITUD, daysBetween, formatDate } from "../utils.js";
import { useSortable, SortTh, StatCard, Pager } from "../components/ui.jsx";

export default function Inventario({flota,tractoIdx,ramplaIdx,ultimosMap,today,T}){
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
