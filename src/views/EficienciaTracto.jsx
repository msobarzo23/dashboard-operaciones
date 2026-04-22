import { useState, useMemo, useEffect } from "react";
import { isVacioTrip, getSucursal } from "../utils.js";
import { useSortable, SortTh, StatCard, SucBadge, Pager } from "../components/ui.jsx";

export default function EficienciaTracto({data,flota,today,T}){
  const[months,setMonths]=useState(1);
  const[filtroMarca,setFiltroMarca]=useState("todas");
  const[filtroSuc,setFiltroSuc]=useState("todas");
  const[minKm,setMinKm]=useState(500);
  const[pg,setPg]=useState(1);
  const PP=50;

  const card={background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel={background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const th={textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td={padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};

  const stats=useMemo(()=>{
    const cutoff=new Date(today);cutoff.setMonth(cutoff.getMonth()-months);
    const porTracto=new Map();
    for(const row of data){
      if(!row._date||row._date<cutoff)continue;
      const pat=row.Tracto;
      if(!pat)continue;
      const km=Number(row.Kilometro)||0;
      const esVacio=isVacioTrip(row);
      if(!porTracto.has(pat)){
        const fi=flota.get(pat);
        const marca=(fi?.marca||"").toUpperCase().trim();
        porTracto.set(pat,{
          pat,kmCom:0,kmVac:0,tramosCom:0,tramosVac:0,
          ultimaSuc:getSucursal(row.Destino),
          ultimaFecha:row._date,
          marca:marca.includes("SCANIA")?"SCANIA":marca.includes("VOLVO")?"VOLVO":marca||"—",
          modelo:fi?.modelo||"—",
          anio:fi?.fecha||"—",
          enCatalogo:!!fi,
        });
      }
      const t=porTracto.get(pat);
      if(row._date>t.ultimaFecha){
        t.ultimaFecha=row._date;
        t.ultimaSuc=getSucursal(row.Destino);
      }
      if(esVacio){t.kmVac+=km;t.tramosVac++;}
      else{t.kmCom+=km;t.tramosCom++;}
    }
    const arr=[];
    for(const t of porTracto.values()){
      const kmTotal=t.kmCom+t.kmVac;
      if(kmTotal<minKm)continue;
      const pctVacio=kmTotal>0?(t.kmVac/kmTotal*100):0;
      arr.push({...t,kmTotal,pctVacio,tramosTotal:t.tramosCom+t.tramosVac});
    }
    return arr;
  },[data,flota,today,months,minKm]);

  const sucursales=useMemo(()=>[...new Set(stats.map(r=>r.ultimaSuc))].sort(),[stats]);
  const marcas=useMemo(()=>[...new Set(stats.map(r=>r.marca))].sort(),[stats]);

  const filtered=useMemo(()=>{
    let f=stats;
    if(filtroMarca!=="todas") f=f.filter(r=>r.marca===filtroMarca);
    if(filtroSuc!=="todas") f=f.filter(r=>r.ultimaSuc===filtroSuc);
    return f;
  },[stats,filtroMarca,filtroSuc]);

  const {sorted,sortKey,sortDir,toggle}=useSortable(filtered,"pctVacio","desc");
  const totalP=Math.ceil(sorted.length/PP);
  const pd=sorted.slice((pg-1)*PP,pg*PP);
  useEffect(()=>setPg(1),[filtroMarca,filtroSuc,months,minKm]);

  const resumen=useMemo(()=>{
    const kmCom=filtered.reduce((s,r)=>s+r.kmCom,0);
    const kmVac=filtered.reduce((s,r)=>s+r.kmVac,0);
    const pctVacio=(kmCom+kmVac)>0?(kmVac/(kmCom+kmVac)*100):0;
    const buckets={excelente:0,bueno:0,regular:0,critico:0};
    filtered.forEach(r=>{
      if(r.pctVacio<=10)buckets.excelente++;
      else if(r.pctVacio<=20)buckets.bueno++;
      else if(r.pctVacio<=35)buckets.regular++;
      else buckets.critico++;
    });
    return{kmCom,kmVac,pctVacio,buckets,total:filtered.length};
  },[filtered]);

  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>⚖️ Eficiencia por Tracto</h2>
      <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
        <select value={months} onChange={e=>setMonths(+e.target.value)} style={sel}>
          <option value={1}>1 mes</option><option value={2}>2 meses</option><option value={3}>3 meses</option><option value={6}>6 meses</option>
        </select>
        <select value={filtroMarca} onChange={e=>setFiltroMarca(e.target.value)} style={sel}>
          <option value="todas">Todas marcas</option>
          {marcas.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroSuc} onChange={e=>setFiltroSuc(e.target.value)} style={sel}>
          <option value="todas">Todas sucursales</option>
          {sucursales.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={minKm} onChange={e=>setMinKm(+e.target.value)} style={sel}>
          <option value={0}>Todos</option>
          <option value={500}>Min. 500km</option>
          <option value={2000}>Min. 2.000km</option>
          <option value={5000}>Min. 5.000km</option>
        </select>
      </div>
    </div>

    <div style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"10px",padding:"10px 16px",marginBottom:"14px",fontSize:"11px",color:T.txM}}>
      <strong style={{color:T.tx}}>Criterio:</strong>
      {" "}<span style={{color:T.grn}}>● ≤10% excelente</span>
      {" · "}<span style={{color:T.blu}}>● 11-20% bueno</span>
      {" · "}<span style={{color:T.ac}}>● 21-35% regular</span>
      {" · "}<span style={{color:T.red}}>● {">"}35% crítico</span>
      {" · % Vacío = km de remonta / km totales del tracto"}
    </div>

    <div style={{display:"flex",gap:"16px",flexWrap:"wrap",marginBottom:"16px"}}>
      <StatCard T={T} icon="🚛" value={resumen.total} label="Tractos analizados"/>
      <StatCard T={T} icon="🛣️" value={Math.round(resumen.kmCom/1000).toLocaleString("es-CL")+"K"} label="KM Comercial" color={T.grn}/>
      <StatCard T={T} icon="🔄" value={Math.round(resumen.kmVac/1000).toLocaleString("es-CL")+"K"} label="KM Vacío" color={T.ac}/>
      <StatCard T={T} icon="📊" value={resumen.pctVacio.toFixed(1)+"%"} label="% Vacío Global" color={resumen.pctVacio>25?T.red:resumen.pctVacio>15?T.ac:T.grn}/>
    </div>

    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.tx}}>📊 Distribución de Eficiencia</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px"}}>
        {[
          {k:"excelente",label:"Excelente (≤10%)",color:T.grn},
          {k:"bueno",label:"Bueno (11-20%)",color:T.blu},
          {k:"regular",label:"Regular (21-35%)",color:T.ac},
          {k:"critico",label:"Crítico (>35%)",color:T.red},
        ].map(b=>{
          const n=resumen.buckets[b.k];
          const pct=resumen.total>0?(n/resumen.total*100):0;
          return(
            <div key={b.k} style={{background:T.sf2,borderRadius:"8px",padding:"14px",border:`1px solid ${b.color}33`,borderLeft:`4px solid ${b.color}`}}>
              <div style={{fontSize:"24px",fontWeight:700,color:b.color}}>{n}</div>
              <div style={{fontSize:"11px",color:T.txM,marginTop:"2px"}}>{b.label}</div>
              <div style={{fontSize:"11px",color:T.tx,marginTop:"4px",fontWeight:600}}>{pct.toFixed(1)}% de flota</div>
            </div>
          );
        })}
      </div>
    </div>

    <div style={card}>
      <div style={{marginBottom:"8px",fontSize:"11px",color:T.txM}}>
        <strong style={{color:T.tx}}>{sorted.length}</strong> tractos · Click columna para ordenar · Ordenado por mayor % vacío (los más ineficientes arriba)
      </div>
      <div style={{overflowX:"auto",maxHeight:"600px",overflowY:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <SortTh label="Tracto" col="pat" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="Marca" col="marca" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="Sucursal" col="ultimaSuc" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={th}/>
            <SortTh label="KM Com." col="kmCom" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="KM Vacío" col="kmVac" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="KM Total" col="kmTotal" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <SortTh label="% Vacío" col="pctVacio" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
            <th style={{...th,textAlign:"center"}}>Distribución</th>
            <SortTh label="Tramos" col="tramosTotal" sortKey={sortKey} sortDir={sortDir} toggle={toggle} style={{...th,textAlign:"right"}}/>
          </tr></thead>
          <tbody>{pd.map((r,i)=>{
            const c=r.pctVacio<=10?T.grn:r.pctVacio<=20?T.blu:r.pctVacio<=35?T.ac:T.red;
            const pctCom=100-r.pctVacio;
            return(
              <tr key={r.pat} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
                <td style={{...td,fontWeight:700}}>{r.pat}</td>
                <td style={td}>{r.marca}</td>
                <td style={td}><SucBadge s={r.ultimaSuc} T={T}/></td>
                <td style={{...td,textAlign:"right",color:T.grn,fontWeight:600}}>{r.kmCom.toLocaleString("es-CL")}</td>
                <td style={{...td,textAlign:"right",color:T.ac,fontWeight:600}}>{r.kmVac.toLocaleString("es-CL")}</td>
                <td style={{...td,textAlign:"right",fontWeight:700}}>{r.kmTotal.toLocaleString("es-CL")}</td>
                <td style={{...td,textAlign:"right",color:c,fontWeight:700}}>{r.pctVacio.toFixed(1)}%</td>
                <td style={{...td,textAlign:"center"}}>
                  <div style={{display:"inline-flex",height:"8px",width:"100px",borderRadius:"4px",overflow:"hidden",border:`1px solid ${T.bd}`,background:T.sf2}}>
                    <div style={{width:pctCom+"%",background:T.grn}} title={"Comercial: "+pctCom.toFixed(1)+"%"}/>
                    <div style={{width:r.pctVacio+"%",background:c}} title={"Vacío: "+r.pctVacio.toFixed(1)+"%"}/>
                  </div>
                </td>
                <td style={{...td,textAlign:"right"}}>{r.tramosTotal}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <Pager T={T} page={pg} total={totalP} set={setPg}/>
    </div>
  </div>);
}
