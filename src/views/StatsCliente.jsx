import { useState, useMemo } from "react";
import { isVacioTrip, SIN_SOLICITUD } from "../utils.js";
import { useSortable, SortTh, usePeriodo, PeriodoSelector } from "../components/ui.jsx";

export default function StatsCliente({data,today,T}){
  const periodo = usePeriodo(data, "dashops_cliente");
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};
  const thStyle={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};

  const {rawStats, vacioStats, totalKmConVacios} = useMemo(()=>{
    const allFiltered = data.filter(d => periodo.filterRow(d, today));
    const vacios = allFiltered.filter(d => isVacioTrip(d));
    const vacioKm = vacios.reduce((s, d) => s + (Number(d.Kilometro) || 0), 0);
    const vacioTramos = vacios.length;
    const rutasVacias = {};
    vacios.forEach(d => {const k = d.Origen + " → " + d.Destino;if (!rutasVacias[k]) rutasVacias[k] = {ruta: k, km: 0, count: 0};rutasVacias[k].km += Number(d.Kilometro) || 0;rutasVacias[k].count++;});
    const topRutasVacias = Object.values(rutasVacias).sort((a, b) => b.km - a.km).slice(0, 5);
    const filtered = allFiltered.filter(d => !isVacioTrip(d));
    const byC={};
    filtered.forEach(d=>{const c=d.Cliente;if(!byC[c])byC[c]={cliente:c,km:0,tramos:0,sols:new Set(),cargas:{}};byC[c].km+=Number(d.Kilometro)||0;byC[c].tramos++;if(d.Solicitud)byC[c].sols.add(d.Solicitud);const cg=d.Carga?.trim();if(cg&&!/^\d+$/.test(cg))byC[c].cargas[cg]=(byC[c].cargas[cg]||0)+1;});
    const clienteStats = Object.values(byC).map(c=>({...c,sols:c.sols.size,topCargas:Object.entries(c.cargas).sort((a,b)=>b[1]-a[1]).slice(0,3)}));
    const totalConVacios = clienteStats.reduce((s, c) => s + c.km, 0) + vacioKm;
    return {rawStats: clienteStats, vacioStats: {km: vacioKm, tramos: vacioTramos, topRutas: topRutasVacias}, totalKmConVacios: totalConVacios};
  },[data,today,periodo.filterRow]);

  const{sorted,sortKey,sortDir,toggle}=useSortable(rawStats,"km","desc");
  const totalKmClientes=rawStats.reduce((s,c)=>s+c.km,0);
  const pctVacio = totalKmConVacios > 0 ? (vacioStats.km / totalKmConVacios * 100) : 0;

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <div style={{display:"flex",alignItems:"baseline",gap:"10px",flexWrap:"wrap"}}>
        <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>🏢 Estadísticas por Cliente</h2>
        <span style={{fontSize:"11px",color:T.txM}}>Período: <strong style={{color:T.ac}}>{periodo.labelActual}</strong></span>
      </div>
      <PeriodoSelector periodo={periodo} T={T}/>
    </div>
    {vacioStats.tramos > 0 && (
      <div style={{background:T.isDark?"#1a1820":"#fefce8",border:`1px solid ${T.isDark?"#3d3520":"#fde68a"}`,borderLeft:`4px solid ${T.ac}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"16px"}}>
          <div style={{flex:"1",minWidth:"280px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
              <span style={{fontSize:"18px"}}>🔄</span>
              <span style={{fontSize:"15px",fontWeight:700,color:T.tx}}>KM Vacíos / Retorno</span>
              <span style={{padding:"3px 10px",borderRadius:"20px",fontSize:"10px",fontWeight:700,background:`${T.ac}22`,color:T.ac,border:`1px solid ${T.ac}44`}}>No incluidos en el ranking</span>
            </div>
            <div style={{fontSize:"11px",color:T.txM,marginBottom:"14px",lineHeight:1.6}}>Viajes de remonta y retorno vacío (sin cliente asignado). Estos kilómetros representan el costo operacional de reposicionamiento de equipos y no se contabilizan en el ranking de clientes.</div>
            <div style={{display:"flex",gap:"20px",flexWrap:"wrap"}}>
              <div><div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>KM VACÍOS</div><div style={{fontSize:"24px",fontWeight:700,color:T.ac}}>{vacioStats.km.toLocaleString("es-CL")}</div></div>
              <div><div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>TRAMOS</div><div style={{fontSize:"24px",fontWeight:700,color:T.tx}}>{vacioStats.tramos.toLocaleString("es-CL")}</div></div>
              <div><div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>% DEL KM TOTAL</div><div style={{fontSize:"24px",fontWeight:700,color:pctVacio > 30 ? T.red : T.ac}}>{pctVacio.toFixed(1)}%</div></div>
              <div><div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>KM PROM./TRAMO</div><div style={{fontSize:"24px",fontWeight:700,color:T.txS}}>{vacioStats.tramos > 0 ? Math.round(vacioStats.km / vacioStats.tramos).toLocaleString("es-CL") : "—"}</div></div>
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
              <td style={td}><div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:"60px",height:"5px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`}}><div style={{height:"100%",width:(totalKmClientes?(c.km/totalKmClientes*100):0)+"%",background:T.ac,borderRadius:"3px"}}/></div><span style={{color:T.txM}}>{totalKmClientes?(c.km/totalKmClientes*100).toFixed(1):0}%</span></div></td>
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
