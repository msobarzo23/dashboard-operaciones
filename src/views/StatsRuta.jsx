import { useState, useMemo } from "react";
import { SIN_SOLICITUD, getSucursal } from "../utils.js";
import { useSortable, SortTh, SucBadge } from "../components/ui.jsx";

export default function StatsRuta({data,today,T}){
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
