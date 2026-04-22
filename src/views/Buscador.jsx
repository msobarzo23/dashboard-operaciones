import { useState, useMemo } from "react";
import { SIN_SOLICITUD, daysBetween, getSucursal, getEstadoEquipo, ESTADO_COLOR } from "../utils.js";
import { SucBadge } from "../components/ui.jsx";

export default function Buscador({tractoIdx,ramplaIdx,flota,today,T}){
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
