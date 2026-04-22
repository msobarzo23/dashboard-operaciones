import { useState, useMemo, useCallback } from "react";
import { SIN_SOLICITUD, getSucursal, getMonthKey, monthKeyToLabel } from "../utils.js";
import { SucBadge } from "../components/ui.jsx";

export default function ComparacionMes({data, today, T}) {
  const card = {background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel = {background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const thStyle = {textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td = {padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};

  const availableMonths = useMemo(() => {
    const set = new Set();
    for (const r of data) {
      const mk = getMonthKey(r._date);
      if (mk) set.add(mk);
    }
    return [...set].sort().reverse();
  }, [data]);

  const [mesA, setMesA] = useState(() => availableMonths[1] || "");
  const [mesB, setMesB] = useState(() => availableMonths[0] || "");
  const [vistaDetalle, setVistaDetalle] = useState("clientes");

  const calcStats = useCallback((rows) => {
    const real = rows.filter(r => r.Cliente !== SIN_SOLICITUD);
    const km = real.reduce((s, r) => s + (Number(r.Kilometro) || 0), 0);
    const tramos = real.length;
    const solicitudes = new Set(real.map(r => r.Solicitud).filter(Boolean)).size;
    const tractos = new Set(real.map(r => r.Tracto).filter(Boolean)).size;
    const ramplas = new Set(real.map(r => r.Rampla).filter(Boolean)).size;
    const clientes = new Set(real.map(r => r.Cliente).filter(Boolean)).size;
    const byCliente = {};
    real.forEach(r => {
      const c = r.Cliente;
      if (!byCliente[c]) byCliente[c] = {km: 0, tramos: 0};
      byCliente[c].km += Number(r.Kilometro) || 0;
      byCliente[c].tramos++;
    });
    const bySuc = {};
    real.forEach(r => {
      const s = getSucursal(r.Destino);
      if (!bySuc[s]) bySuc[s] = {km: 0, tramos: 0};
      bySuc[s].km += Number(r.Kilometro) || 0;
      bySuc[s].tramos++;
    });
    const byRuta = {};
    real.forEach(r => {
      const k = r.Origen + " → " + r.Destino;
      if (!byRuta[k]) byRuta[k] = {km: 0, tramos: 0};
      byRuta[k].km += Number(r.Kilometro) || 0;
      byRuta[k].tramos++;
    });
    const kmPromedio = tramos > 0 ? Math.round(km / tramos) : 0;
    return {km, tramos, solicitudes, tractos, ramplas, clientes, kmPromedio, byCliente, bySuc, byRuta, totalRows: rows.length};
  }, []);

  const statsA = useMemo(() => {
    if (!mesA) return null;
    return calcStats(data.filter(r => getMonthKey(r._date) === mesA));
  }, [data, mesA, calcStats]);

  const statsB = useMemo(() => {
    if (!mesB) return null;
    return calcStats(data.filter(r => getMonthKey(r._date) === mesB));
  }, [data, mesB, calcStats]);

  const delta = (a, b) => {
    if (!a || !b || b === 0) return null;
    return ((a - b) / Math.abs(b) * 100);
  };

  const DeltaBadge = ({val}) => {
    if (val === null || val === undefined || !isFinite(val)) return <span style={{color:T.txM,fontSize:"11px"}}>—</span>;
    const pos = val >= 0;
    const color = pos ? T.grn : T.red;
    return (
      <span style={{display:"inline-flex",alignItems:"center",gap:"2px",padding:"2px 8px",borderRadius:"20px",fontSize:"11px",fontWeight:700,background:`${color}18`,color,border:`1px solid ${color}44`}}>
        {pos ? "▲" : "▼"} {Math.abs(val).toFixed(1)}%
      </span>
    );
  };

  const CompBar = ({valA, valB, maxVal, colorA, colorB}) => {
    const pA = maxVal > 0 ? (valA / maxVal * 100) : 0;
    const pB = maxVal > 0 ? (valB / maxVal * 100) : 0;
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"3px",width:"100%",minWidth:"80px"}}>
        <div style={{height:"6px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`,overflow:"hidden"}}>
          <div style={{height:"100%",width:pA+"%",background:colorA,borderRadius:"3px",transition:"width 0.3s"}}/>
        </div>
        <div style={{height:"6px",background:T.sf2,borderRadius:"3px",border:`1px solid ${T.bd}`,overflow:"hidden"}}>
          <div style={{height:"100%",width:pB+"%",background:colorB,borderRadius:"3px",transition:"width 0.3s"}}/>
        </div>
      </div>
    );
  };

  const detalleData = useMemo(() => {
    if (!statsA || !statsB) return [];
    let mapA, mapB;
    if (vistaDetalle === "clientes") { mapA = statsA.byCliente; mapB = statsB.byCliente; }
    else if (vistaDetalle === "sucursales") { mapA = statsA.bySuc; mapB = statsB.bySuc; }
    else { mapA = statsA.byRuta; mapB = statsB.byRuta; }
    const keys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    const arr = [];
    for (const k of keys) {
      const a = mapA[k] || {km: 0, tramos: 0};
      const b = mapB[k] || {km: 0, tramos: 0};
      arr.push({
        nombre: k,
        kmA: a.km, kmB: b.km,
        tramosA: a.tramos, tramosB: b.tramos,
        deltaKm: delta(b.km, a.km),
        deltaTramos: delta(b.tramos, a.tramos),
      });
    }
    arr.sort((a, b) => (b.kmB + b.kmA) - (a.kmB + a.kmA));
    return arr.slice(0, 40);
  }, [statsA, statsB, vistaDetalle]);

  const metrics = statsA && statsB ? [
    {label:"KM Totales",icon:"🛣️",vA:statsA.km,vB:statsB.km,fmt:v=>v.toLocaleString("es-CL")},
    {label:"Tramos",icon:"📋",vA:statsA.tramos,vB:statsB.tramos,fmt:v=>v.toLocaleString("es-CL")},
    {label:"Solicitudes",icon:"📝",vA:statsA.solicitudes,vB:statsB.solicitudes,fmt:v=>v.toLocaleString("es-CL")},
    {label:"Tractos Activos",icon:"🚛",vA:statsA.tractos,vB:statsB.tractos,fmt:v=>v.toLocaleString("es-CL")},
    {label:"Equipos Activos",icon:"🚃",vA:statsA.ramplas,vB:statsB.ramplas,fmt:v=>v.toLocaleString("es-CL")},
    {label:"Clientes",icon:"🏢",vA:statsA.clientes,vB:statsB.clientes,fmt:v=>v.toLocaleString("es-CL")},
    {label:"KM Promedio/Tramo",icon:"📐",vA:statsA.kmPromedio,vB:statsB.kmPromedio,fmt:v=>v.toLocaleString("es-CL")},
  ] : [];

  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>📅 Comparación por Mes</h2>
      <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          <span style={{fontSize:"11px",color:T.txM,fontWeight:600}}>MES A</span>
          <select value={mesA} onChange={e => setMesA(e.target.value)} style={{...sel,borderColor:T.blu,color:T.blu}}>
            {availableMonths.map(m => <option key={m} value={m}>{monthKeyToLabel(m)}</option>)}
          </select>
        </div>
        <span style={{color:T.txM,fontWeight:700}}>vs</span>
        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          <span style={{fontSize:"11px",color:T.txM,fontWeight:600}}>MES B</span>
          <select value={mesB} onChange={e => setMesB(e.target.value)} style={{...sel,borderColor:T.ac,color:T.ac}}>
            {availableMonths.map(m => <option key={m} value={m}>{monthKeyToLabel(m)}</option>)}
          </select>
        </div>
      </div>
    </div>

    <div style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"10px",padding:"8px 16px",marginBottom:"14px",fontSize:"11px",color:T.txM,display:"flex",alignItems:"center",gap:"8px"}}>
      <span style={{fontSize:"14px"}}>💡</span>
      <span>
        <span style={{display:"inline-block",width:"10px",height:"10px",borderRadius:"2px",background:T.blu,marginRight:"4px",verticalAlign:"middle"}}/>
        <strong style={{color:T.blu}}>Mes A</strong> ({monthKeyToLabel(mesA)})
        {" vs "}
        <span style={{display:"inline-block",width:"10px",height:"10px",borderRadius:"2px",background:T.ac,marginRight:"4px",verticalAlign:"middle"}}/>
        <strong style={{color:T.ac}}>Mes B</strong> ({monthKeyToLabel(mesB)})
        {" · Δ% = variación de A → B · Excluye viajes de remonta/vacío"}
      </span>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px",marginBottom:"16px"}}>
      {metrics.map(m => {
        const d = delta(m.vB, m.vA);
        return (
          <div key={m.label} style={{...card,marginBottom:0,padding:"16px"}}>
            <div style={{fontSize:"11px",color:T.txM,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.8px"}}>{m.icon} {m.label}</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"6px"}}>
              <div>
                <div style={{fontSize:"11px",color:T.blu,fontWeight:600}}>{m.fmt(m.vA)}</div>
                <div style={{fontSize:"11px",color:T.ac,fontWeight:600}}>{m.fmt(m.vB)}</div>
              </div>
              <DeltaBadge val={d}/>
            </div>
            <CompBar valA={m.vA} valB={m.vB} maxVal={Math.max(m.vA, m.vB)} colorA={T.blu} colorB={T.ac}/>
          </div>
        );
      })}
    </div>

    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"8px"}}>
        <div style={{fontSize:"14px",fontWeight:600,color:T.tx}}>📊 Detalle Comparativo</div>
        <div style={{display:"flex",gap:"4px"}}>
          {[{k:"clientes",l:"Clientes",ic:"🏢"},{k:"sucursales",l:"Sucursales",ic:"🗺️"},{k:"rutas",l:"Rutas",ic:"🛤️"}].map(o => (
            <button key={o.k} onClick={() => setVistaDetalle(o.k)} style={{
              padding:"7px 14px",borderRadius:"8px",border:`1px solid ${vistaDetalle===o.k?T.ac:T.bd}`,
              background:vistaDetalle===o.k?T.acD:T.sf2,color:vistaDetalle===o.k?T.ac:T.txM,
              cursor:"pointer",fontSize:"11px",fontWeight:vistaDetalle===o.k?700:400,fontFamily:"inherit",
            }}>{o.ic} {o.l}</button>
          ))}
        </div>
      </div>
      <div style={{maxHeight:"500px",overflowY:"auto",overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <th style={thStyle}>{vistaDetalle==="clientes"?"Cliente":vistaDetalle==="sucursales"?"Sucursal":"Ruta"}</th>
            <th style={{...thStyle,color:T.blu}}>KM (A)</th>
            <th style={{...thStyle,color:T.ac}}>KM (B)</th>
            <th style={thStyle}>Δ KM</th>
            <th style={{...thStyle,color:T.blu}}>Tramos (A)</th>
            <th style={{...thStyle,color:T.ac}}>Tramos (B)</th>
            <th style={thStyle}>Δ Tramos</th>
          </tr></thead>
          <tbody>{detalleData.map((r,i) => (
            <tr key={r.nombre} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
              <td style={{...td,fontWeight:600,maxWidth:"250px",overflow:"hidden",textOverflow:"ellipsis"}}>
                {vistaDetalle==="sucursales" ? <SucBadge s={r.nombre} T={T}/> : r.nombre}
              </td>
              <td style={{...td,color:T.blu}}>{r.kmA.toLocaleString("es-CL")}</td>
              <td style={{...td,color:T.ac}}>{r.kmB.toLocaleString("es-CL")}</td>
              <td style={td}><DeltaBadge val={r.deltaKm}/></td>
              <td style={{...td,color:T.blu}}>{r.tramosA.toLocaleString("es-CL")}</td>
              <td style={{...td,color:T.ac}}>{r.tramosB.toLocaleString("es-CL")}</td>
              <td style={td}><DeltaBadge val={r.deltaTramos}/></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  </div>);
}
