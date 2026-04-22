import { useState, useMemo, useEffect, useCallback } from "react";
import { isVacioTrip, getSucursal, dayKey, getMonthKey, monthKeyToLabel } from "../utils.js";
import { useSortable, SortTh, StatCard, SucBadge } from "../components/ui.jsx";

function TendenciaSemanalChart({weeks, T, fmtCLP}) {
  if (!weeks || weeks.length === 0) return null;
  const maxKm = Math.max(1, ...weeks.map(w => w.kmTotal));
  const maxPct = Math.max(30, ...weeks.map(w => w.pctVacio));
  const H = 160;
  const barW = 48;
  const gap = 8;
  const totalW = weeks.length * (barW + gap);

  const points = weeks.map((w, i) => {
    const x = i * (barW + gap) + barW / 2;
    const y = H - (w.pctVacio / maxPct) * H;
    return {x, y, pct: w.pctVacio};
  });
  const pathD = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");

  return (
    <div style={{overflowX:"auto",paddingBottom:"8px"}}>
      <div style={{position:"relative",minWidth:totalW+"px",height:(H+60)+"px"}}>
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <div key={p} style={{position:"absolute",left:0,right:0,top:(H*(1-p))+"px",height:"1px",background:T.bd,opacity:0.4}}/>
        ))}
        <div style={{display:"flex",alignItems:"flex-end",height:H+"px",gap:gap+"px",position:"relative",zIndex:1}}>
          {weeks.map(w => {
            const hCom = (w.kmCom / maxKm) * H;
            const hVac = (w.kmVac / maxKm) * H;
            const fechaIni = String(w.weekStart.getDate()).padStart(2,"0")+"/"+String(w.weekStart.getMonth()+1).padStart(2,"0");
            const fechaFin = String(w.weekEnd.getDate()).padStart(2,"0")+"/"+String(w.weekEnd.getMonth()+1).padStart(2,"0");
            return (
              <div key={w.weekStart.getTime()} style={{width:barW+"px",display:"flex",flexDirection:"column",justifyContent:"flex-end",position:"relative"}}
                title={`${fechaIni}—${fechaFin}\nKM: ${Math.round(w.kmTotal).toLocaleString("es-CL")}\n% Vacío: ${w.pctVacio.toFixed(1)}%\nCosto: ${fmtCLP(w.costo)}\nTramos: ${w.tramos}`}>
                {hVac > 0 && <div style={{height:hVac+"px",background:T.ac,opacity:0.85,borderRadius:"2px 2px 0 0"}}/>}
                <div style={{height:hCom+"px",background:T.grn,borderRadius:hVac>0?"0":"2px 2px 0 0"}}/>
              </div>
            );
          })}
        </div>
        <svg style={{position:"absolute",top:0,left:0,width:totalW+"px",height:H+"px",pointerEvents:"none",zIndex:2}}>
          <path d={pathD} fill="none" stroke={T.red} strokeWidth="2" strokeDasharray="4 3" opacity="0.8"/>
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3" fill={T.red} stroke={T.sf} strokeWidth="1.5"/>
            </g>
          ))}
        </svg>
        <div style={{display:"flex",gap:gap+"px",marginTop:"8px",fontSize:"10px",color:T.txM}}>
          {weeks.map(w => {
            const fecha = String(w.weekStart.getDate()).padStart(2,"0")+"/"+String(w.weekStart.getMonth()+1).padStart(2,"0");
            return (
              <div key={w.weekStart.getTime()} style={{width:barW+"px",textAlign:"center",whiteSpace:"nowrap"}}>
                <div>{fecha}</div>
                <div style={{color:T.red,fontWeight:600,marginTop:"2px"}}>{w.pctVacio.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
        <div style={{position:"absolute",top:"-4px",right:"0",display:"flex",gap:"10px",fontSize:"10px",color:T.txM,background:T.sf,padding:"3px 8px",borderRadius:"6px",border:`1px solid ${T.bd}`}}>
          <span><span style={{display:"inline-block",width:"8px",height:"8px",borderRadius:"2px",background:T.grn,marginRight:"4px",verticalAlign:"middle"}}/>KM Com.</span>
          <span><span style={{display:"inline-block",width:"8px",height:"8px",borderRadius:"2px",background:T.ac,marginRight:"4px",verticalAlign:"middle"}}/>KM Vacío</span>
          <span><span style={{display:"inline-block",width:"12px",height:"2px",background:T.red,marginRight:"4px",verticalAlign:"middle"}}/>% Vacío</span>
        </div>
      </div>
    </div>
  );
}

export default function Combustible({data, flota, today, T}) {
  const [modoTemporal, setModoTemporal] = useState(() => {
    try { return localStorage.getItem("dashops_fuel_mode") || "rolling"; } catch(e) { return "rolling"; }
  });
  const [rollingDays, setRollingDays] = useState(() => {
    try { return parseInt(localStorage.getItem("dashops_fuel_days")) || 30; } catch(e) { return 30; }
  });

  const availableMonths = useMemo(() => {
    const set = new Set();
    for (const r of data) {
      const mk = getMonthKey(r._date);
      if (mk) set.add(mk);
    }
    return [...set].sort().reverse();
  }, [data]);

  const [mesCalendar, setMesCalendar] = useState(() => {
    try { return localStorage.getItem("dashops_fuel_month") || ""; } catch(e) { return ""; }
  });

  useEffect(() => {
    if (availableMonths.length === 0) return;
    if (!mesCalendar || !availableMonths.includes(mesCalendar)) {
      setMesCalendar(availableMonths[0]);
    }
  }, [availableMonths, mesCalendar]);

  const [rendScania, setRendScania] = useState(() => {
    try { const v = parseFloat(localStorage.getItem("dashops_fuel_rendScania")); return isFinite(v) && v > 0 ? v : 3.3; } catch(e) { return 3.3; }
  });
  const [rendVolvo, setRendVolvo] = useState(() => {
    try { const v = parseFloat(localStorage.getItem("dashops_fuel_rendVolvo")); return isFinite(v) && v > 0 ? v : 2.8; } catch(e) { return 2.8; }
  });
  const [precioLitro, setPrecioLitro] = useState(() => {
    try { const v = parseFloat(localStorage.getItem("dashops_fuel_precio")); return isFinite(v) && v > 0 ? v : 1244; } catch(e) { return 1244; }
  });

  useEffect(() => { try { localStorage.setItem("dashops_fuel_mode", modoTemporal); } catch(e) {} }, [modoTemporal]);
  useEffect(() => { try { localStorage.setItem("dashops_fuel_days", String(rollingDays)); } catch(e) {} }, [rollingDays]);
  useEffect(() => { try { localStorage.setItem("dashops_fuel_month", mesCalendar); } catch(e) {} }, [mesCalendar]);
  useEffect(() => { try { localStorage.setItem("dashops_fuel_rendScania", String(rendScania)); } catch(e) {} }, [rendScania]);
  useEffect(() => { try { localStorage.setItem("dashops_fuel_rendVolvo", String(rendVolvo)); } catch(e) {} }, [rendVolvo]);
  useEffect(() => { try { localStorage.setItem("dashops_fuel_precio", String(precioLitro)); } catch(e) {} }, [precioLitro]);

  const [paramsAbiertos, setParamsAbiertos] = useState(false);
  const [rankingAbierto, setRankingAbierto] = useState(false);

  const card = {background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const sel = {background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"12px",fontFamily:"inherit",outline:"none",cursor:"pointer"};
  const input = {background:T.inputBg,border:`1px solid ${T.inputBd}`,borderRadius:"8px",padding:"8px 12px",color:T.tx,fontSize:"13px",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"};
  const thStyle = {textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td = {padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};

  const periodos = useMemo(() => {
    if (modoTemporal === "rolling") {
      const actualEnd = new Date(today);
      actualEnd.setHours(23, 59, 59, 999);
      const actualStart = new Date(today);
      actualStart.setDate(actualStart.getDate() - rollingDays + 1);
      actualStart.setHours(0, 0, 0, 0);
      const prevEnd = new Date(actualStart);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - rollingDays + 1);
      prevStart.setHours(0, 0, 0, 0);
      return {
        actualStart, actualEnd, prevStart, prevEnd,
        labelActual: `Últimos ${rollingDays} días`,
        labelPrev: `${rollingDays} días previos`,
        diasActual: rollingDays,
        diasPrev: rollingDays,
      };
    } else {
      if (!mesCalendar) return null;
      const [y, m] = mesCalendar.split("-").map(Number);
      const actualStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
      let actualEnd = new Date(y, m, 0, 23, 59, 59, 999);
      let diasActual = new Date(y, m, 0).getDate();
      const esEsteMes = today.getFullYear() === y && today.getMonth() === m - 1;
      if (esEsteMes) {
        actualEnd = new Date(today);
        actualEnd.setHours(23, 59, 59, 999);
        diasActual = today.getDate();
        const prevStart = new Date(y, m - 2, 1, 0, 0, 0, 0);
        const prevEnd = new Date(y, m - 2, diasActual, 23, 59, 59, 999);
        return {
          actualStart, actualEnd, prevStart, prevEnd,
          labelActual: `${monthKeyToLabel(mesCalendar)} (1-${diasActual})`,
          labelPrev: `${monthKeyToLabel(getMonthKey(prevStart))} (1-${diasActual})`,
          diasActual, diasPrev: diasActual,
        };
      }
      const prevStart = new Date(y, m - 2, 1, 0, 0, 0, 0);
      const prevEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);
      const diasPrev = new Date(y, m - 1, 0).getDate();
      return {
        actualStart, actualEnd, prevStart, prevEnd,
        labelActual: monthKeyToLabel(mesCalendar),
        labelPrev: monthKeyToLabel(getMonthKey(prevStart)),
        diasActual, diasPrev,
      };
    }
  }, [modoTemporal, rollingDays, mesCalendar, today]);

  const calcStatsRango = useCallback((start, end, diasReales) => {
    if (!start || !end || !diasReales) return null;
    const kmPorTracto = new Map();
    let kmScaniaCom = 0, kmVolvoCom = 0, kmScaniaVac = 0, kmVolvoVac = 0;
    let tramosCom = 0, tramosVac = 0;
    const diasTrabajadosPorTracto = new Map();
    const porSucursal = new Map();

    for (const row of data) {
      if (!row._date) continue;
      if (row._date < start || row._date > end) continue;
      const pat = row.Tracto;
      if (!pat) continue;
      const km = Number(row.Kilometro) || 0;
      const fi = flota.get(pat);
      const m = (fi?.marca || "").toUpperCase().trim();
      const marca = m.includes("SCANIA") ? "SCANIA" : "VOLVO";
      const esVacio = isVacioTrip(row);
      const suc = getSucursal(row.Destino);

      if (!kmPorTracto.has(pat)) {
        kmPorTracto.set(pat, {pat, marca, kmCom: 0, kmVac: 0, tramosCom: 0, tramosVac: 0});
      }
      const t = kmPorTracto.get(pat);

      if (esVacio) {
        t.kmVac += km; t.tramosVac++; tramosVac++;
        if (marca === "SCANIA") kmScaniaVac += km; else kmVolvoVac += km;
      } else {
        t.kmCom += km; t.tramosCom++; tramosCom++;
        if (marca === "SCANIA") kmScaniaCom += km; else kmVolvoCom += km;
      }

      if (!diasTrabajadosPorTracto.has(pat)) diasTrabajadosPorTracto.set(pat, new Set());
      diasTrabajadosPorTracto.get(pat).add(dayKey(row._date));

      if (!porSucursal.has(suc)) {
        porSucursal.set(suc, {suc,kmScaniaCom:0,kmScaniaVac:0,kmVolvoCom:0,kmVolvoVac:0,tramosCom:0,tramosVac:0,tractos:new Set()});
      }
      const s = porSucursal.get(suc);
      if (esVacio) {
        s.tramosVac++;
        if (marca === "SCANIA") s.kmScaniaVac += km; else s.kmVolvoVac += km;
      } else {
        s.tramosCom++;
        if (marca === "SCANIA") s.kmScaniaCom += km; else s.kmVolvoCom += km;
      }
      s.tractos.add(pat);
    }

    const kmTotalCom = kmScaniaCom + kmVolvoCom;
    const kmTotalVac = kmScaniaVac + kmVolvoVac;
    const kmTotal = kmTotalCom + kmTotalVac;
    const litrosScania = (kmScaniaCom + kmScaniaVac) / rendScania;
    const litrosVolvo = (kmVolvoCom + kmVolvoVac) / rendVolvo;
    const litrosTotal = litrosScania + litrosVolvo;
    const costoScania = litrosScania * precioLitro;
    const costoVolvo = litrosVolvo * precioLitro;
    const costoTotal = litrosTotal * precioLitro;
    const rendPromedio = litrosTotal > 0 ? (kmTotal / litrosTotal) : ((rendScania + rendVolvo) / 2);
    const pctVacio = kmTotal > 0 ? (kmTotalVac / kmTotal * 100) : 0;
    const costoPorKm = kmTotal > 0 ? (costoTotal / kmTotal) : 0;
    const costoPorKmComercial = kmTotalCom > 0 ? (costoTotal / kmTotalCom) : 0;
    const tractosActivos = kmPorTracto.size;
    const kmPorTractoDia = (tractosActivos > 0 && diasReales > 0) ? (kmTotal / tractosActivos / diasReales) : 0;
    const kmComPorTractoDia = (tractosActivos > 0 && diasReales > 0) ? (kmTotalCom / tractosActivos / diasReales) : 0;

    const utilizacionPorTracto = [];
    for (const [pat, dias] of diasTrabajadosPorTracto.entries()) {
      utilizacionPorTracto.push({pat, diasTrabajados: dias.size, pctUso: (dias.size / diasReales * 100)});
    }
    const tractosAltaUtil = utilizacionPorTracto.filter(t => t.pctUso >= 80).length;
    const tractosMediaUtil = utilizacionPorTracto.filter(t => t.pctUso >= 30 && t.pctUso < 80).length;
    const tractosBajaUtil = utilizacionPorTracto.filter(t => t.pctUso < 30).length;
    const promDiasTrabajados = utilizacionPorTracto.length > 0
      ? utilizacionPorTracto.reduce((s, t) => s + t.diasTrabajados, 0) / utilizacionPorTracto.length : 0;

    const ranking = [];
    for (const t of kmPorTracto.values()) {
      const kmT = t.kmCom + t.kmVac;
      if (kmT === 0) continue;
      const rend = t.marca === "SCANIA" ? rendScania : rendVolvo;
      const litros = kmT / rend;
      const costo = litros * precioLitro;
      const pctVac = (t.kmVac / kmT * 100);
      ranking.push({...t, kmTotal: kmT, litros, costo, costoVacio: (t.kmVac / rend) * precioLitro, pctVacio: pctVac});
    }
    ranking.sort((a, b) => b.costo - a.costo);

    const sucursalArr = [];
    for (const s of porSucursal.values()) {
      const kmComS = s.kmScaniaCom + s.kmVolvoCom;
      const kmVacS = s.kmScaniaVac + s.kmVolvoVac;
      const kmTotalS = kmComS + kmVacS;
      const litrosS = (s.kmScaniaCom + s.kmScaniaVac) / rendScania + (s.kmVolvoCom + s.kmVolvoVac) / rendVolvo;
      const costoS = litrosS * precioLitro;
      sucursalArr.push({
        suc: s.suc, tractos: s.tractos.size,
        kmCom: kmComS, kmVac: kmVacS, kmTotal: kmTotalS,
        pctVacio: kmTotalS > 0 ? (kmVacS / kmTotalS * 100) : 0,
        litros: litrosS, costo: costoS,
        costoPorKm: kmTotalS > 0 ? (costoS / kmTotalS) : 0,
        tramos: s.tramosCom + s.tramosVac,
      });
    }
    sucursalArr.sort((a, b) => b.costo - a.costo);

    return {
      kmScaniaCom, kmVolvoCom, kmScaniaVac, kmVolvoVac,
      kmTotalCom, kmTotalVac, kmTotal,
      litrosScania, litrosVolvo, litrosTotal,
      costoScania, costoVolvo, costoTotal,
      costoPorKm, costoPorKmComercial,
      rendPromedio, pctVacio,
      tramosCom, tramosVac,
      tractosActivos,
      kmPorTractoDia, kmComPorTractoDia,
      tractosAltaUtil, tractosMediaUtil, tractosBajaUtil,
      promDiasTrabajados,
      utilizacionPorTracto,
      ranking,
      sucursalArr,
    };
  }, [data, flota, rendScania, rendVolvo, precioLitro]);

  const statsActual = useMemo(() => {
    if (!periodos) return null;
    return calcStatsRango(periodos.actualStart, periodos.actualEnd, periodos.diasActual);
  }, [periodos, calcStatsRango]);

  const statsPrev = useMemo(() => {
    if (!periodos) return null;
    return calcStatsRango(periodos.prevStart, periodos.prevEnd, periodos.diasPrev);
  }, [periodos, calcStatsRango]);

  const tendenciaSemanal = useMemo(() => {
    const weeks = [];
    const endBase = new Date(today);
    endBase.setHours(23, 59, 59, 999);
    const rendPonderado = statsActual && statsActual.rendPromedio > 0 ? statsActual.rendPromedio : ((rendScania + rendVolvo) / 2);
    for (let i = 9; i >= 0; i--) {
      const weekEnd = new Date(endBase);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      let kmCom = 0, kmVac = 0, tramos = 0;
      for (const row of data) {
        if (!row._date) continue;
        if (row._date < weekStart || row._date > weekEnd) continue;
        const km = Number(row.Kilometro) || 0;
        if (isVacioTrip(row)) kmVac += km; else kmCom += km;
        tramos++;
      }
      const kmTotalW = kmCom + kmVac;
      const pctVac = kmTotalW > 0 ? (kmVac / kmTotalW * 100) : 0;
      const litrosW = rendPonderado > 0 ? (kmTotalW / rendPonderado) : 0;
      const costoW = litrosW * precioLitro;
      weeks.push({weekStart, weekEnd, kmCom, kmVac, kmTotal: kmTotalW, pctVacio: pctVac, costo: costoW, litros: litrosW, tramos});
    }
    return weeks;
  }, [data, today, rendScania, rendVolvo, precioLitro, statsActual]);

  const insightCapacidad = useMemo(() => {
    if (!statsActual || !statsPrev) return null;
    const deltaKmDia = statsPrev.kmPorTractoDia > 0
      ? ((statsActual.kmPorTractoDia - statsPrev.kmPorTractoDia) / statsPrev.kmPorTractoDia * 100) : 0;
    const pctAlta = statsActual.tractosActivos > 0 ? (statsActual.tractosAltaUtil / statsActual.tractosActivos * 100) : 0;
    const pctBaja = statsActual.tractosActivos > 0 ? (statsActual.tractosBajaUtil / statsActual.tractosActivos * 100) : 0;
    let tipo = "equilibrio", mensaje = "";
    if (deltaKmDia > 5 && pctAlta >= 50) {
      tipo = "presion";
      mensaje = `KM/tracto/día subió ${deltaKmDia.toFixed(1)}% vs período anterior y ${statsActual.tractosAltaUtil} tractos (${pctAlta.toFixed(0)}%) superaron 80% de utilización. Flota tensionada — evaluar sumar conductores/capacidad.`;
    } else if (deltaKmDia < -5 && pctBaja >= 30) {
      tipo = "holgura";
      mensaje = `KM/tracto/día cayó ${Math.abs(deltaKmDia).toFixed(1)}% vs período anterior y ${statsActual.tractosBajaUtil} tractos (${pctBaja.toFixed(0)}%) trabajaron menos del 30% de los días. Señal de baja de demanda.`;
    } else if (pctAlta >= 70) {
      tipo = "presion";
      mensaje = `${statsActual.tractosAltaUtil} tractos (${pctAlta.toFixed(0)}%) operaron sobre 80% de los días. Utilización muy alta — poca holgura para imprevistos.`;
    } else if (pctBaja >= 50) {
      tipo = "holgura";
      mensaje = `${statsActual.tractosBajaUtil} tractos (${pctBaja.toFixed(0)}%) trabajaron menos del 30% de los días. Subutilización relevante — revisar asignaciones o demanda.`;
    } else {
      mensaje = `${statsActual.tractosAltaUtil} en alta utilización, ${statsActual.tractosBajaUtil} subutilizados. Situación operacional equilibrada.`;
    }
    return {tipo, mensaje, deltaKmDia, pctAlta, pctBaja};
  }, [statsActual, statsPrev]);

  const {sorted: rankingSorted, sortKey: rkSortKey, sortDir: rkSortDir, toggle: rkToggle}
    = useSortable(statsActual?.ranking || [], "costo", "desc");
  const {sorted: sucSorted, sortKey: sucSortKey, sortDir: sucSortDir, toggle: sucToggle}
    = useSortable(statsActual?.sucursalArr || [], "costo", "desc");

  const fmtCLP = (v) => "$" + Math.round(v).toLocaleString("es-CL");
  const fmtKm = (v) => Math.round(v).toLocaleString("es-CL");
  const fmtKmK = (v) => Math.round(v / 1000).toLocaleString("es-CL") + "K";
  const getDelta = (a, b) => {
    if (b === 0 || b === undefined || b === null || a === undefined || a === null) return null;
    return ((a - b) / Math.abs(b) * 100);
  };

  const DeltaBadge = ({val, pp = false, inverso = false, size = "sm"}) => {
    if (val === null || !isFinite(val)) return <span style={{color:T.txM,fontSize:size==="lg"?"12px":"10px"}}>—</span>;
    const pos = val >= 0;
    const buenaNoticia = inverso ? !pos : pos;
    const color = buenaNoticia ? T.grn : T.red;
    return (
      <span style={{display:"inline-flex",alignItems:"center",gap:"2px",padding:size==="lg"?"3px 9px":"2px 7px",borderRadius:"20px",fontSize:size==="lg"?"11px":"10px",fontWeight:700,background:`${color}18`,color,border:`1px solid ${color}44`}}>
        {pos?"▲":"▼"} {Math.abs(val).toFixed(1)}{pp?"pp":"%"}
      </span>
    );
  };

  if (!statsActual) {
    return (
      <div style={{padding:"40px",textAlign:"center",color:T.txM,fontSize:"13px"}}>
        Sin datos suficientes en el período seleccionado.
      </div>
    );
  }

  const kpis = [
    {label:"KM/tracto/día",icon:"🎯",valorActual:statsActual.kmPorTractoDia.toFixed(0),unidad:"km",deltaVal:getDelta(statsActual.kmPorTractoDia,statsPrev?.kmPorTractoDia),color:T.blu,destacado:true,tooltip:"Indicador clave de capacidad: Σ km ÷ (tractos activos × días)"},
    {label:"KM Totales",icon:"🛣️",valorActual:fmtKmK(statsActual.kmTotal),deltaVal:getDelta(statsActual.kmTotal,statsPrev?.kmTotal),color:T.tx},
    {label:"Costo Total",icon:"💰",valorActual:fmtCLP(statsActual.costoTotal),deltaVal:getDelta(statsActual.costoTotal,statsPrev?.costoTotal),color:T.red,inverso:true},
    {label:"Litros Totales",icon:"⛽",valorActual:Math.round(statsActual.litrosTotal).toLocaleString("es-CL")+" L",deltaVal:getDelta(statsActual.litrosTotal,statsPrev?.litrosTotal),color:T.ac,inverso:true},
    {label:"% Vacío",icon:"🔄",valorActual:statsActual.pctVacio.toFixed(1)+"%",deltaVal:statsPrev?(statsActual.pctVacio-statsPrev.pctVacio):null,deltaPP:true,color:statsActual.pctVacio>25?T.red:statsActual.pctVacio>15?T.ac:T.grn,inverso:true},
    {label:"Costo/KM com.",icon:"💵",valorActual:fmtCLP(statsActual.costoPorKmComercial),deltaVal:getDelta(statsActual.costoPorKmComercial,statsPrev?.costoPorKmComercial),color:T.tx,inverso:true},
    {label:"Rend. Prom.",icon:"📊",valorActual:statsActual.rendPromedio.toFixed(2)+" km/L",deltaVal:getDelta(statsActual.rendPromedio,statsPrev?.rendPromedio),color:T.blu},
  ];

  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
      <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>⛽ Combustible & Capacidad</h2>
    </div>

    <div style={{...card,padding:"14px 16px",marginBottom:"12px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",flexWrap:"wrap"}}>
        <div style={{display:"flex",background:T.sf2,borderRadius:"8px",padding:"3px",border:`1px solid ${T.bd}`}}>
          {[{k:"rolling",l:"Ventana móvil",ic:"🔄"},{k:"calendar",l:"Mes calendario",ic:"📅"}].map(o => (
            <button key={o.k} onClick={() => setModoTemporal(o.k)} style={{padding:"6px 14px",borderRadius:"6px",border:"none",cursor:"pointer",fontSize:"11px",fontWeight:600,fontFamily:"inherit",background:modoTemporal===o.k?T.ac:"transparent",color:modoTemporal===o.k?"#000":T.txM,transition:"all 0.15s"}}>{o.ic} {o.l}</button>
          ))}
        </div>
        {modoTemporal === "rolling" ? (
          <select value={rollingDays} onChange={e => setRollingDays(+e.target.value)} style={sel}>
            <option value={7}>Últimos 7 días</option><option value={14}>Últimos 14 días</option><option value={30}>Últimos 30 días</option><option value={60}>Últimos 60 días</option><option value={90}>Últimos 90 días</option>
          </select>
        ) : (
          <select value={mesCalendar} onChange={e => setMesCalendar(e.target.value)} style={sel}>
            {availableMonths.map(m => <option key={m} value={m}>{monthKeyToLabel(m)}</option>)}
          </select>
        )}
        <div style={{marginLeft:"auto",fontSize:"11px",color:T.txM,display:"flex",gap:"12px",flexWrap:"wrap"}}>
          <span><span style={{display:"inline-block",width:"8px",height:"8px",borderRadius:"2px",background:T.blu,marginRight:"4px"}}/><strong style={{color:T.blu}}>Actual:</strong> {periodos?.labelActual}</span>
          <span><span style={{display:"inline-block",width:"8px",height:"8px",borderRadius:"2px",background:T.txM,marginRight:"4px"}}/><strong style={{color:T.txM}}>Previo:</strong> {periodos?.labelPrev}</span>
        </div>
      </div>
    </div>

    <div style={{...card,padding:"0",marginBottom:"12px",overflow:"hidden"}}>
      <button onClick={() => setParamsAbiertos(p => !p)} style={{width:"100%",padding:"10px 16px",background:"transparent",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
        <span style={{fontSize:"12px",fontWeight:600,color:T.tx,display:"flex",alignItems:"center",gap:"8px"}}>
          <span>⚙️ Parámetros</span>
          <span style={{fontSize:"11px",color:T.txM,fontWeight:400}}>Scania {rendScania} · Volvo {rendVolvo} · ${precioLitro.toLocaleString("es-CL")}/L</span>
        </span>
        <span style={{color:T.txM,fontSize:"14px",transform:paramsAbiertos?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
      </button>
      {paramsAbiertos && (
        <div style={{padding:"0 16px 16px",borderTop:`1px solid ${T.bd}`,marginTop:"4px",paddingTop:"14px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px"}}>
            <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>REND. SCANIA (km/L)</label><input type="number" step="0.1" min="0" value={rendScania} onChange={e => setRendScania(+e.target.value || 0)} style={input}/></div>
            <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>REND. VOLVO (km/L)</label><input type="number" step="0.1" min="0" value={rendVolvo} onChange={e => setRendVolvo(+e.target.value || 0)} style={input}/></div>
            <div><label style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.5px"}}>PRECIO DIESEL ($/L)</label><input type="number" step="1" min="0" value={precioLitro} onChange={e => setPrecioLitro(+e.target.value || 0)} style={input}/></div>
          </div>
          <div style={{fontSize:"10px",color:T.txM,marginTop:"8px"}}>Los parámetros se guardan localmente en el navegador. Se recuerdan entre sesiones.</div>
        </div>
      )}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px",marginBottom:"16px"}}>
      {kpis.map(k => (
        <div key={k.label} style={{...card,marginBottom:0,padding:"16px",borderLeft:k.destacado?`4px solid ${k.color}`:`1px solid ${T.bd}`}} title={k.tooltip||""}>
          <div style={{fontSize:"10px",color:T.txM,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.8px"}}>{k.icon} {k.label}</div>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:"6px"}}>
            <div style={{fontSize:k.destacado?"22px":"18px",fontWeight:700,color:k.color,lineHeight:1.1}}>
              {k.valorActual}{k.unidad&&<span style={{fontSize:"11px",color:T.txM,marginLeft:"4px"}}>{k.unidad}</span>}
            </div>
            <DeltaBadge val={k.deltaVal} pp={k.deltaPP} inverso={k.inverso} size={k.destacado?"lg":"sm"}/>
          </div>
        </div>
      ))}
    </div>

    {insightCapacidad && (
      <div style={{...card,borderLeft:`4px solid ${insightCapacidad.tipo==="presion"?T.red:insightCapacidad.tipo==="holgura"?T.ac:T.grn}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"16px"}}>
          <div style={{flex:"1",minWidth:"300px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px"}}>
              <span style={{fontSize:"18px"}}>{insightCapacidad.tipo==="presion"?"🔴":insightCapacidad.tipo==="holgura"?"🟡":"🟢"}</span>
              <span style={{fontSize:"14px",fontWeight:700,color:T.tx}}>Lectura de capacidad</span>
              <span style={{padding:"2px 10px",borderRadius:"20px",fontSize:"10px",fontWeight:700,background:insightCapacidad.tipo==="presion"?`${T.red}22`:insightCapacidad.tipo==="holgura"?`${T.ac}22`:`${T.grn}22`,color:insightCapacidad.tipo==="presion"?T.red:insightCapacidad.tipo==="holgura"?T.ac:T.grn,border:`1px solid ${insightCapacidad.tipo==="presion"?T.red:insightCapacidad.tipo==="holgura"?T.ac:T.grn}44`}}>
                {insightCapacidad.tipo==="presion"?"PRESIÓN":insightCapacidad.tipo==="holgura"?"HOLGURA":"EQUILIBRIO"}
              </span>
            </div>
            <div style={{fontSize:"12px",color:T.tx,lineHeight:1.6}}>{insightCapacidad.mensaje}</div>
          </div>
          <div style={{minWidth:"260px",flex:"0 0 auto"}}>
            <div style={{fontSize:"10px",color:T.txM,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.5px"}}>DISTRIBUCIÓN UTILIZACIÓN</div>
            {[
              {k:"alta",l:"Alta (≥80% días)",n:statsActual.tractosAltaUtil,c:T.red},
              {k:"media",l:"Media (30-80%)",n:statsActual.tractosMediaUtil,c:T.ac},
              {k:"baja",l:"Baja (<30%)",n:statsActual.tractosBajaUtil,c:T.grn},
            ].map(r => {
              const pct = statsActual.tractosActivos > 0 ? (r.n / statsActual.tractosActivos * 100) : 0;
              return (
                <div key={r.k} style={{marginBottom:"6px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:"2px"}}>
                    <span style={{color:T.tx}}>{r.l}</span>
                    <span style={{color:r.c,fontWeight:700}}>{r.n} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{height:"5px",background:T.sf2,borderRadius:"3px",overflow:"hidden",border:`1px solid ${T.bd}`}}>
                    <div style={{height:"100%",width:pct+"%",background:r.c,borderRadius:"3px"}}/>
                  </div>
                </div>
              );
            })}
            <div style={{fontSize:"10px",color:T.txM,marginTop:"6px",textAlign:"right"}}>
              Prom. <strong style={{color:T.tx}}>{statsActual.promDiasTrabajados.toFixed(1)} días</strong> trabajados/tracto · {statsActual.tractosActivos} tractos con viajes
            </div>
          </div>
        </div>
      </div>
    )}

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px",marginBottom:"16px"}}>
      <div style={{...card,borderLeft:`4px solid ${T.blu}`}}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.blu}}>🔵 SCANIA</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",fontSize:"12px"}}>
          <div><div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>KM COMERCIAL</div><div style={{fontWeight:700,color:T.grn,fontSize:"15px"}}>{fmtKm(statsActual.kmScaniaCom)}</div></div>
          <div><div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>KM VACÍO</div><div style={{fontWeight:700,color:T.ac,fontSize:"15px"}}>{fmtKm(statsActual.kmScaniaVac)}</div></div>
          <div><div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>LITROS</div><div style={{fontWeight:700,color:T.tx,fontSize:"15px"}}>{Math.round(statsActual.litrosScania).toLocaleString("es-CL")} L</div></div>
          <div><div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>COSTO</div><div style={{fontWeight:700,color:T.red,fontSize:"15px"}}>{fmtCLP(statsActual.costoScania)}</div></div>
        </div>
        <div style={{marginTop:"10px",paddingTop:"10px",borderTop:`1px solid ${T.bd}`,fontSize:"11px",color:T.txM}}>
          Rend: <strong style={{color:T.blu}}>{rendScania} km/L</strong> · Costo/km: <strong style={{color:T.red}}>{fmtCLP(precioLitro/rendScania)}</strong>
        </div>
      </div>
      <div style={{...card,borderLeft:`4px solid ${T.ac}`}}>
        <div style={{fontSize:"14px",fontWeight:600,marginBottom:"12px",color:T.ac}}>🟠 VOLVO</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",fontSize:"12px"}}>
          <div><div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>KM COMERCIAL</div><div style={{fontWeight:700,color:T.grn,fontSize:"15px"}}>{fmtKm(statsActual.kmVolvoCom)}</div></div>
          <div><div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>KM VACÍO</div><div style={{fontWeight:700,color:T.ac,fontSize:"15px"}}>{fmtKm(statsActual.kmVolvoVac)}</div></div>
          <div><div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>LITROS</div><div style={{fontWeight:700,color:T.tx,fontSize:"15px"}}>{Math.round(statsActual.litrosVolvo).toLocaleString("es-CL")} L</div></div>
          <div><div style={{color:T.txM,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.5px"}}>COSTO</div><div style={{fontWeight:700,color:T.red,fontSize:"15px"}}>{fmtCLP(statsActual.costoVolvo)}</div></div>
        </div>
        <div style={{marginTop:"10px",paddingTop:"10px",borderTop:`1px solid ${T.bd}`,fontSize:"11px",color:T.txM}}>
          Rend: <strong style={{color:T.ac}}>{rendVolvo} km/L</strong> · Costo/km: <strong style={{color:T.red}}>{fmtCLP(precioLitro/rendVolvo)}</strong>
        </div>
      </div>
    </div>

    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>📉 Tendencia — Últimas 10 semanas</div>
      <div style={{fontSize:"11px",color:T.txM,marginBottom:"14px"}}>Barras apiladas = km comercial (verde) + km vacío (naranja) · Línea punteada = % vacío semanal</div>
      <TendenciaSemanalChart weeks={tendenciaSemanal} T={T} fmtCLP={fmtCLP}/>
    </div>

    <div style={card}>
      <div style={{fontSize:"14px",fontWeight:600,marginBottom:"4px",color:T.tx}}>🗺️ Consumo por Sucursal (destino)</div>
      <div style={{fontSize:"11px",color:T.txM,marginBottom:"12px"}}>Agrupado por sucursal de destino del viaje · Click columna para ordenar</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
          <thead><tr>
            <SortTh label="Sucursal" col="suc" sortKey={sucSortKey} sortDir={sucSortDir} toggle={sucToggle} style={thStyle}/>
            <SortTh label="Tractos" col="tractos" sortKey={sucSortKey} sortDir={sucSortDir} toggle={sucToggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="KM Com." col="kmCom" sortKey={sucSortKey} sortDir={sucSortDir} toggle={sucToggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="KM Vacío" col="kmVac" sortKey={sucSortKey} sortDir={sucSortDir} toggle={sucToggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="% Vacío" col="pctVacio" sortKey={sucSortKey} sortDir={sucSortDir} toggle={sucToggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="Litros" col="litros" sortKey={sucSortKey} sortDir={sucSortDir} toggle={sucToggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="Costo" col="costo" sortKey={sucSortKey} sortDir={sucSortDir} toggle={sucToggle} style={{...thStyle,textAlign:"right"}}/>
            <SortTh label="Costo/km" col="costoPorKm" sortKey={sucSortKey} sortDir={sucSortDir} toggle={sucToggle} style={{...thStyle,textAlign:"right"}}/>
          </tr></thead>
          <tbody>{sucSorted.map((r, i) => {
            const cVac = r.pctVacio > 30 ? T.red : r.pctVacio > 15 ? T.ac : T.grn;
            return (
              <tr key={r.suc} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
                <td style={td}><SucBadge s={r.suc} T={T}/></td>
                <td style={{...td,textAlign:"right",fontWeight:600}}>{r.tractos}</td>
                <td style={{...td,textAlign:"right",color:T.grn}}>{fmtKm(r.kmCom)}</td>
                <td style={{...td,textAlign:"right",color:T.ac}}>{fmtKm(r.kmVac)}</td>
                <td style={{...td,textAlign:"right",color:cVac,fontWeight:700}}>{r.pctVacio.toFixed(1)}%</td>
                <td style={{...td,textAlign:"right"}}>{Math.round(r.litros).toLocaleString("es-CL")} L</td>
                <td style={{...td,textAlign:"right",color:T.red,fontWeight:700}}>{fmtCLP(r.costo)}</td>
                <td style={{...td,textAlign:"right"}}>{fmtCLP(r.costoPorKm)}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>

    <div style={{...card,padding:"0",overflow:"hidden"}}>
      <button onClick={() => setRankingAbierto(a => !a)} style={{width:"100%",padding:"14px 16px",background:"transparent",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
        <span style={{fontSize:"14px",fontWeight:600,color:T.tx,display:"flex",alignItems:"center",gap:"8px"}}>
          🏆 Ranking de tractos por costo
          <span style={{fontSize:"11px",color:T.txM,fontWeight:400}}>({statsActual.ranking.length} tractos con viajes)</span>
        </span>
        <span style={{color:T.txM,fontSize:"14px",transform:rankingAbierto?"rotate(180deg)":"none",transition:"transform 0.2s"}}>▾</span>
      </button>
      {rankingAbierto && (
        <div style={{padding:"0 16px 16px",borderTop:`1px solid ${T.bd}`}}>
          <div style={{fontSize:"11px",color:T.txM,marginTop:"8px",marginBottom:"8px"}}>Top 20 · Click columna para ordenar</div>
          <div style={{overflowX:"auto",maxHeight:"450px",overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
              <thead><tr>
                <th style={thStyle}>#</th>
                <SortTh label="Tracto" col="pat" sortKey={rkSortKey} sortDir={rkSortDir} toggle={rkToggle} style={thStyle}/>
                <SortTh label="Marca" col="marca" sortKey={rkSortKey} sortDir={rkSortDir} toggle={rkToggle} style={thStyle}/>
                <SortTh label="KM Com." col="kmCom" sortKey={rkSortKey} sortDir={rkSortDir} toggle={rkToggle} style={{...thStyle,textAlign:"right"}}/>
                <SortTh label="KM Vac." col="kmVac" sortKey={rkSortKey} sortDir={rkSortDir} toggle={rkToggle} style={{...thStyle,textAlign:"right"}}/>
                <SortTh label="KM Total" col="kmTotal" sortKey={rkSortKey} sortDir={rkSortDir} toggle={rkToggle} style={{...thStyle,textAlign:"right"}}/>
                <SortTh label="% Vacío" col="pctVacio" sortKey={rkSortKey} sortDir={rkSortDir} toggle={rkToggle} style={{...thStyle,textAlign:"right"}}/>
                <SortTh label="Litros" col="litros" sortKey={rkSortKey} sortDir={rkSortDir} toggle={rkToggle} style={{...thStyle,textAlign:"right"}}/>
                <SortTh label="Costo" col="costo" sortKey={rkSortKey} sortDir={rkSortDir} toggle={rkToggle} style={{...thStyle,textAlign:"right"}}/>
              </tr></thead>
              <tbody>{rankingSorted.slice(0, 20).map((r, i) => (
                <tr key={r.pat} style={{background:i%2?(T.isDark?"#1a1e28":"#f8fafc"):"transparent"}}>
                  <td style={td}>{i+1}</td>
                  <td style={{...td,fontWeight:700}}>{r.pat}</td>
                  <td style={td}><span style={{display:"inline-block",padding:"2px 8px",borderRadius:"4px",fontSize:"10px",fontWeight:600,background:r.marca==="SCANIA"?`${T.blu}22`:`${T.ac}22`,color:r.marca==="SCANIA"?T.blu:T.ac,border:`1px solid ${r.marca==="SCANIA"?T.blu:T.ac}44`}}>{r.marca}</span></td>
                  <td style={{...td,textAlign:"right",color:T.grn}}>{fmtKm(r.kmCom)}</td>
                  <td style={{...td,textAlign:"right",color:T.ac}}>{fmtKm(r.kmVac)}</td>
                  <td style={{...td,textAlign:"right",fontWeight:700}}>{fmtKm(r.kmTotal)}</td>
                  <td style={{...td,textAlign:"right",color:r.pctVacio>30?T.red:r.pctVacio>15?T.ac:T.grn,fontWeight:600}}>{r.pctVacio.toFixed(1)}%</td>
                  <td style={{...td,textAlign:"right"}}>{Math.round(r.litros).toLocaleString("es-CL")} L</td>
                  <td style={{...td,textAlign:"right",color:T.red,fontWeight:700}}>{fmtCLP(r.costo)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  </div>);
}
