import { useState, useMemo } from "react";
import { isVacioTrip, getSucursal, getCategoria, dayKey, daysBetween, formatDate, SIN_SOLICITUD } from "../utils.js";
import { StatCard, SucBadge } from "../components/ui.jsx";

function TendenciaDiaria({serie,flotaTotal,T}){
  const maxVal=Math.max(flotaTotal,...serie.map(d=>d.total),1);
  const H=140;
  const barW=Math.max(6,Math.min(24,Math.floor(700/serie.length)-2));
  const gap=2;
  const totalW=serie.length*(barW+gap);
  return(
    <div style={{overflowX:"auto",paddingBottom:"8px"}}>
      <div style={{position:"relative",minWidth:totalW+"px",height:(H+40)+"px"}}>
        <div style={{position:"absolute",left:0,right:0,top:(H-(flotaTotal/maxVal)*H)+"px",height:"1px",background:T.txM,borderTop:`1px dashed ${T.txM}`}}/>
        <div style={{position:"absolute",top:(H-(flotaTotal/maxVal)*H-14)+"px",right:"4px",fontSize:"9px",color:T.txM,background:T.sf,padding:"1px 5px",borderRadius:"3px"}}>flota: {flotaTotal}</div>
        <div style={{display:"flex",alignItems:"flex-end",height:H+"px",gap:gap+"px"}}>
          {serie.map((d)=>{
            const hComercial=(d.comercial/maxVal)*H;
            const hRemonta=((d.total-d.comercial)/maxVal)*H;
            const fecha=d.day.slice(8,10)+"/"+d.day.slice(5,7);
            return(
              <div key={d.day} style={{width:barW+"px",display:"flex",flexDirection:"column",justifyContent:"flex-end",position:"relative"}} title={`${fecha}: ${d.comercial} comerciales, ${d.total} total`}>
                {hRemonta>0&&<div style={{height:hRemonta+"px",background:T.blu,opacity:0.5,borderRadius:"2px 2px 0 0"}}/>}
                <div style={{height:hComercial+"px",background:T.grn,borderRadius:hRemonta>0?"0":"2px 2px 0 0"}}/>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:gap+"px",marginTop:"6px",fontSize:"9px",color:T.txM}}>
          {serie.map((d,i)=>{
            const step=serie.length>30?7:serie.length>14?3:1;
            if(i%step!==0&&i!==serie.length-1)return <div key={d.day} style={{width:barW+"px"}}/>;
            const fecha=d.day.slice(8,10)+"/"+d.day.slice(5,7);
            return <div key={d.day} style={{width:barW+"px",textAlign:"center",whiteSpace:"nowrap"}}>{fecha}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

export function printReporte(rows, tipo, filtroEstado, filtroSuc, today) {
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

export default function EstadoFlota({data,tractoIdx,ramplaIdx,flota,ultimosMap,today,T}){
  const[days,setDays]=useState(30);
  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const tbl={width:"100%",borderCollapse:"collapse",fontSize:"12px"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx};

  const stats=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-days+1);
    cutoff.setHours(0,0,0,0);
    const flotaTractos=new Set();const flotaEquipos=new Set();let fT=0,fE=0,fO=0;
    for(const[pat,v]of flota.entries()){const c=getCategoria(v.tipoequipo);if(c==="TRACTOCAMION"){fT++;flotaTractos.add(pat);}else if(c==="EQUIPO"){fE++;flotaEquipos.add(pat);}else fO++;}
    const dayKeys=[];
    for(let i=0;i<days;i++){const d=new Date(cutoff);d.setDate(d.getDate()+i);dayKeys.push(dayKey(d));}
    const tractosComercialPorDia=new Map();const tractosTotalPorDia=new Map();const equiposComercialPorDia=new Map();const equiposTotalPorDia=new Map();
    dayKeys.forEach(k=>{tractosComercialPorDia.set(k,new Set());tractosTotalPorDia.set(k,new Set());equiposComercialPorDia.set(k,new Set());equiposTotalPorDia.set(k,new Set());});
    let totalKm=0,totalTrips=0;
    const viajesPorTractoPorDia=new Map();const tractoKmComercial=new Map();const tractoKmVacio=new Map();
    for(const row of data){
      if(!row._date||row._date<cutoff)continue;
      const dk=dayKey(row._date);const esVacio=isVacioTrip(row);const pat=row.Tracto;const ramp=row.Rampla;const km=Number(row.Kilometro)||0;
      if(!esVacio){totalKm+=km;totalTrips++;}
      if(pat&&flotaTractos.has(pat)){tractosTotalPorDia.get(dk)?.add(pat);if(!esVacio){tractosComercialPorDia.get(dk)?.add(pat);if(!viajesPorTractoPorDia.has(pat))viajesPorTractoPorDia.set(pat,new Map());const m=viajesPorTractoPorDia.get(pat);m.set(dk,(m.get(dk)||0)+1);}}
      if(ramp&&flotaEquipos.has(ramp)){equiposTotalPorDia.get(dk)?.add(ramp);if(!esVacio)equiposComercialPorDia.get(dk)?.add(ramp);}
      if(pat){if(esVacio){tractoKmVacio.set(pat,(tractoKmVacio.get(pat)||0)+km);}else{tractoKmComercial.set(pat,(tractoKmComercial.get(pat)||0)+km);}}
    }
    let sumCompTractos=0,sumTotalTractos=0,sumCompEquipos=0,sumTotalEquipos=0;const serieTractos=[];
    for(const dk of dayKeys){const ct=tractosComercialPorDia.get(dk).size;const tt=tractosTotalPorDia.get(dk).size;const ce=equiposComercialPorDia.get(dk).size;const te=equiposTotalPorDia.get(dk).size;sumCompTractos+=ct;sumTotalTractos+=tt;sumCompEquipos+=ce;sumTotalEquipos+=te;serieTractos.push({day:dk,comercial:ct,total:tt});}
    const utilCompTractos=fT?(sumCompTractos/(days*fT)*100):0;const utilTotalTractos=fT?(sumTotalTractos/(days*fT)*100):0;const utilCompEquipos=fE?(sumCompEquipos/(days*fE)*100):0;const utilTotalEquipos=fE?(sumTotalEquipos/(days*fE)*100):0;
    const promTractosActivosComercial=sumCompTractos/days;const promTractosActivosTotal=sumTotalTractos/days;const promEquiposActivosComercial=sumCompEquipos/days;
    const distribucion={"0":0,"1":0,"2":0,"3+":0};
    for(const pat of flotaTractos){const mDias=viajesPorTractoPorDia.get(pat);for(const dk of dayKeys){const v=mDias?.get(dk)||0;if(v===0)distribucion["0"]++;else if(v===1)distribucion["1"]++;else if(v===2)distribucion["2"]++;else distribucion["3+"]++;}}
    const diasOciososTracto=[];
    for(const pat of flotaTractos){const mDias=viajesPorTractoPorDia.get(pat);let trabajados=0;if(mDias){for(const dk of dayKeys){if((mDias.get(dk)||0)>0)trabajados++;}}const ociosos=days-trabajados;const pctUso=(trabajados/days)*100;const fi=flota.get(pat);const kmCom=tractoKmComercial.get(pat)||0;const kmVac=tractoKmVacio.get(pat)||0;const kmTot=kmCom+kmVac;const pctVacio=kmTot>0?(kmVac/kmTot*100):null;diasOciososTracto.push({pat,ociosos,trabajados,pctUso,marca:fi?.marca||"-",modelo:fi?.modelo||"-",tipo:fi?.tipoequipo||"-",kmCom,kmVac,kmTot,pctVacio});}
    diasOciososTracto.sort((a,b)=>b.ociosos-a.ociosos);
    const sucCount={};
    for(const pat of flotaEquipos){const tr=ramplaIdx.get(pat);let loc=null;if(tr?.length>0)loc=tr[0].Destino;else{const u=ultimosMap.get(pat);if(u)loc=u.Destino;}const sc=loc?getSucursal(loc):"OTROS";sucCount[sc]=(sucCount[sc]||0)+1;}
    const topT=[...tractoKmComercial.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    let kmTotalCom=0,kmTotalVac=0;for(const v of tractoKmComercial.values())kmTotalCom+=v;for(const v of tractoKmVacio.values())kmTotalVac+=v;
    const ratioGlobalVacio=(kmTotalCom+kmTotalVac)>0?(kmTotalVac/(kmTotalCom+kmTotalVac)*100):0;
    return{fT,fE,fO,utilCompTractos,utilTotalTractos,utilCompEquipos,utilTotalEquipos,promTractosActivosComercial,promTractosActivosTotal,promEquiposActivosComercial,totalKm,totalTrips,sucCount,topT,serieTractos,distribucion,diasOciososTracto,totalR:flotaEquipos.size,dayKeys,ratioGlobalVacio,kmTotalCom,kmTotalVac};
  },[data,tractoIdx,ramplaIdx,flota,ultimosMap,today,days]);

  const barColor=(pct)=>pct>=70?T.grn:pct>=40?T.ac:T.red;

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>📊 Estado de Flota</h2>
      <select value={days} onChange={e=>setDays(+e.target.value)} style={sel}>
        <option value={1}>Último día</option><option value={7}>7 días</option><option value={15}>15 días</option>
        <option value={30}>30 días</option><option value={60}>60 días</option><option value={90}>90 días</option>
      </select>
    </div>
    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>📈 Utilización Diaria Promedio — últimos {days} día{days>1?"s":""}</div>
      <div style={{fontSize:"11px",color:T.txM,marginBottom:"16px",lineHeight:1.5}}>
        Fórmula: <strong style={{color:T.tx}}>Σ(equipos activos por día) / ({days} días × flota total)</strong> · Cada día cuenta por separado (L-D) ·
        {" "}<span style={{color:T.grn}}>Comercial</span> = con tramo facturable · {" "}<span style={{color:T.blu}}>Total</span> = incluye remonta/vacío
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px"}}>
        <div>
          <div style={{fontSize:"13px",fontWeight:700,color:T.tx,marginBottom:"10px"}}>🚛 Tractocamiones <span style={{color:T.txM,fontWeight:400,fontSize:"11px"}}>({stats.fT} en flota)</span></div>
          <div style={{marginBottom:"10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",alignItems:"baseline"}}>
              <span style={{fontSize:"11px",color:T.grn,fontWeight:600}}>COMERCIAL</span>
              <span style={{fontWeight:700,color:barColor(stats.utilCompTractos),fontSize:"14px"}}>{stats.utilCompTractos.toFixed(1)}%<span style={{color:T.txM,fontWeight:400,fontSize:"11px",marginLeft:"6px"}}>~{stats.promTractosActivosComercial.toFixed(1)} activos/día</span></span>
            </div>
            <div style={{height:"14px",background:T.sf2,borderRadius:"7px",overflow:"hidden",border:`1px solid ${T.bd}`}}><div style={{height:"100%",width:Math.min(100,stats.utilCompTractos)+"%",background:`linear-gradient(90deg,${T.grn},${barColor(stats.utilCompTractos)})`,borderRadius:"7px",transition:"width 0.4s"}}/></div>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",alignItems:"baseline"}}>
              <span style={{fontSize:"11px",color:T.blu,fontWeight:600}}>TOTAL (c/ remonta)</span>
              <span style={{fontWeight:700,color:barColor(stats.utilTotalTractos),fontSize:"14px"}}>{stats.utilTotalTractos.toFixed(1)}%<span style={{color:T.txM,fontWeight:400,fontSize:"11px",marginLeft:"6px"}}>~{stats.promTractosActivosTotal.toFixed(1)} activos/día</span></span>
            </div>
            <div style={{height:"10px",background:T.sf2,borderRadius:"5px",overflow:"hidden",border:`1px solid ${T.bd}`}}><div style={{height:"100%",width:Math.min(100,stats.utilTotalTractos)+"%",background:`linear-gradient(90deg,${T.blu},${T.ac})`,borderRadius:"5px",transition:"width 0.4s"}}/></div>
          </div>
          {stats.utilTotalTractos>stats.utilCompTractos&&(<div style={{marginTop:"8px",fontSize:"10px",color:T.txM,padding:"6px 10px",background:T.sf2,borderRadius:"6px",borderLeft:`3px solid ${T.ac}`}}>⚠ Brecha remonta: <strong style={{color:T.ac}}>{(stats.utilTotalTractos-stats.utilCompTractos).toFixed(1)}pp</strong> de capacidad en reposicionamiento</div>)}
        </div>
        <div>
          <div style={{fontSize:"13px",fontWeight:700,color:T.tx,marginBottom:"10px"}}>🚃 Ramplas / Equipos <span style={{color:T.txM,fontWeight:400,fontSize:"11px"}}>({stats.fE} en flota)</span></div>
          <div style={{marginBottom:"10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",alignItems:"baseline"}}>
              <span style={{fontSize:"11px",color:T.grn,fontWeight:600}}>COMERCIAL</span>
              <span style={{fontWeight:700,color:barColor(stats.utilCompEquipos),fontSize:"14px"}}>{stats.utilCompEquipos.toFixed(1)}%<span style={{color:T.txM,fontWeight:400,fontSize:"11px",marginLeft:"6px"}}>~{stats.promEquiposActivosComercial.toFixed(1)} activos/día</span></span>
            </div>
            <div style={{height:"14px",background:T.sf2,borderRadius:"7px",overflow:"hidden",border:`1px solid ${T.bd}`}}><div style={{height:"100%",width:Math.min(100,stats.utilCompEquipos)+"%",background:`linear-gradient(90deg,${T.grn},${barColor(stats.utilCompEquipos)})`,borderRadius:"7px",transition:"width 0.4s"}}/></div>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",alignItems:"baseline"}}>
              <span style={{fontSize:"11px",color:T.blu,fontWeight:600}}>TOTAL (c/ remonta)</span>
              <span style={{fontWeight:700,color:barColor(stats.utilTotalEquipos),fontSize:"14px"}}>{stats.utilTotalEquipos.toFixed(1)}%</span>
            </div>
            <div style={{height:"10px",background:T.sf2,borderRadius:"5px",overflow:"hidden",border:`1px solid ${T.bd}`}}><div style={{height:"100%",width:Math.min(100,stats.utilTotalEquipos)+"%",background:`linear-gradient(90deg,${T.blu},${T.ac})`,borderRadius:"5px",transition:"width 0.4s"}}/></div>
          </div>
        </div>
      </div>
    </div>
    <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginBottom:"16px"}}>
      <StatCard T={T} icon="🛣️" value={Math.round(stats.totalKm/1000).toLocaleString("es-CL")+"K"} label="KM Comerciales" color={T.grn}/>
      <StatCard T={T} icon="📋" value={stats.totalTrips.toLocaleString("es-CL")} label="Tramos Comerciales"/>
      <StatCard T={T} icon="🔄" value={stats.ratioGlobalVacio.toFixed(1)+"%"} label="KM Vacío / Total" color={stats.ratioGlobalVacio>25?T.red:stats.ratioGlobalVacio>15?T.ac:T.grn}/>
      <StatCard T={T} icon="🏢" value={stats.fT+stats.fE+stats.fO} label="Flota Total"/>
      <StatCard T={T} icon="🔧" value={stats.fO} label="Otros (camiones, grúas)"/>
    </div>
    {days>1&&(<div style={card}><div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>📉 Tendencia Diaria — Tractocamiones Activos</div><div style={{fontSize:"11px",color:T.txM,marginBottom:"14px"}}>Cada barra es un día · Verde = comerciales · Azul = remonta · Línea punteada = flota total ({stats.fT})</div><TendenciaDiaria serie={stats.serieTractos} flotaTotal={stats.fT} T={T}/></div>)}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>📊 Distribución de Carga por Tracto/Día</div>
        <div style={{fontSize:"11px",color:T.txM,marginBottom:"14px"}}>De los {(stats.fT*days).toLocaleString("es-CL")} casos (tracto × día), cuántos viajes comerciales se hicieron</div>
        {Object.entries(stats.distribucion).map(([k,v])=>{const total=stats.fT*days;const pct=total?(v/total*100):0;const color=k==="0"?T.red:k==="1"?T.ac:k==="2"?T.blu:T.grn;const etiqueta=k==="0"?"Ociosos (0 viajes)":k==="1"?"1 viaje":k==="2"?"2 viajes":"3 o más viajes";return(<div key={k} style={{marginBottom:"8px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px",fontSize:"12px"}}><span style={{color:T.tx,fontWeight:600}}>{etiqueta}</span><span style={{color:T.txM}}><strong style={{color}}>{v.toLocaleString("es-CL")}</strong> ({pct.toFixed(1)}%)</span></div><div style={{height:"10px",background:T.sf2,borderRadius:"5px",overflow:"hidden",border:`1px solid ${T.bd}`}}><div style={{height:"100%",width:pct+"%",background:color,borderRadius:"5px",transition:"width 0.3s"}}/></div></div>);})}
      </div>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>🗺️ Equipos por Sucursal (última ubicación)</div>
        {Object.entries(stats.sucCount).sort((a,b)=>b[1]-a[1]).map(([sc,c])=>{const pct=stats.totalR?(c/stats.totalR*100).toFixed(1):0;return(<div key={sc} style={{marginBottom:"8px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}><SucBadge s={sc} T={T}/><span style={{fontSize:"12px",color:T.txM}}>{c+" ("+pct+"%)"}</span></div><div style={{height:"6px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`}}><div style={{height:"100%",width:pct+"%",background:T.sucColors[sc]?.accent||"#666",borderRadius:"3px"}}/></div></div>);})}
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:"16px",marginTop:"16px"}}>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>😴 Top 15 Tractos Más Ociosos</div>
        <div style={{fontSize:"11px",color:T.txM,marginBottom:"12px"}}>Días sin viaje comercial · % uso y % KM vacío en últimos {days} días</div>
        <div style={{maxHeight:"480px",overflowY:"auto"}}>
          <table style={tbl}><thead><tr><th style={th}>Tracto</th><th style={{...th,textAlign:"right"}}>Ocios.</th><th style={{...th,textAlign:"right"}}>% Uso</th><th style={{...th,textAlign:"right"}}>% Vacío</th><th style={th}>Marca</th></tr></thead>
            <tbody>{stats.diasOciososTracto.slice(0,15).map((r,i)=>{const cUso=r.pctUso<20?T.red:r.pctUso<50?T.ac:T.grn;const cVac=r.pctVacio===null?T.txM:r.pctVacio>30?T.red:r.pctVacio>15?T.ac:T.grn;return(<tr key={r.pat} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}><td style={{...td,fontWeight:700}}>{r.pat}</td><td style={{...td,textAlign:"right",color:cUso,fontWeight:700}}>{r.ociosos}/{days}</td><td style={{...td,textAlign:"right",color:cUso,fontWeight:600}}>{r.pctUso.toFixed(0)}%</td><td style={{...td,textAlign:"right",color:cVac,fontWeight:600}}>{r.pctVacio!==null?r.pctVacio.toFixed(0)+"%":"—"}</td><td style={{...td,fontSize:"11px",color:T.txM}}>{r.marca}</td></tr>);})}</tbody>
          </table>
        </div>
      </div>
      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>🏆 Top 10 Tractos por KM</div>
        <div style={{fontSize:"11px",color:T.txM,marginBottom:"12px"}}>KM comerciales en los últimos {days} días</div>
        <table style={tbl}><thead><tr><th style={th}>#</th><th style={th}>Tracto</th><th style={{...th,textAlign:"right"}}>KM</th></tr></thead>
          <tbody>{stats.topT.map(([t,km],i)=>(<tr key={t} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}><td style={td}>{i+1}</td><td style={{...td,fontWeight:700}}>{t}</td><td style={{...td,textAlign:"right",fontWeight:600}}>{km.toLocaleString("es-CL")}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  </div>);
}
