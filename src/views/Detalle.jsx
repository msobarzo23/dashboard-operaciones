import { useState, useMemo, useEffect } from "react";
import { SIN_SOLICITUD } from "../utils.js";
import { useSortable, SortTh, Pager } from "../components/ui.jsx";

export default function Detalle({data,T}){
  const[fd,setFd]=useState("");const[fh,setFh]=useState("");const[cl,setCl]=useState("");const[tr,setTr]=useState("");const[ra,setRa]=useState("");const[or,setOr]=useState("");const[de,setDe]=useState("");const[cg,setCg]=useState("");const[pg,setPg]=useState(1);const pp=50;
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const input={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"10px 14px",color:T.tx,fontSize:"14px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const thStyle={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};

  const dataFiltrada = useMemo(()=>data.filter(d=>d.Cliente!==SIN_SOLICITUD),[data]);

  const cls=useMemo(()=>[...new Set(dataFiltrada.map(d=>d.Cliente))].sort(),[dataFiltrada]);
  const cgs=useMemo(()=>[...new Set(dataFiltrada.map(d=>d.Carga?.trim()).filter(c=>c&&!/^\d+$/.test(c)))].sort(),[dataFiltrada]);

  const filtered=useMemo(()=>{
    const dateFrom = fd ? new Date(fd + "T00:00:00") : null;
    let dateTo = null;
    if (fh) { dateTo = new Date(fh + "T00:00:00"); dateTo.setDate(dateTo.getDate() + 1); }
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
              <td style={{...td,maxWidth:"220px"}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block",maxWidth:d._multiCliente?"160px":"100%",verticalAlign:"middle"}}>{d.Cliente}</span>
                {d._multiCliente && (
                  <span title={["+ clientes adicionales:", ...d._clientesAdicionales.map(c=>c.Cliente)].join("\n")} style={{marginLeft:"5px",display:"inline-block",verticalAlign:"middle",padding:"1px 5px",borderRadius:"4px",fontSize:"10px",fontWeight:700,background:"rgba(59,130,246,0.15)",color:"#3b82f6",border:"1px solid rgba(59,130,246,0.3)",cursor:"help",whiteSpace:"nowrap"}}>+{d._clientesAdicionales.length}</span>
                )}
              </td>
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
