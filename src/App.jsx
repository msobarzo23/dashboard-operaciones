import { useState, useEffect, useMemo, useCallback } from "react";
import Papa from "papaparse";
import { CSV_VIAJES, CSV_FLOTA, CSV_ULTIMOS, makeTheme, cleanPatente, parseDate, dedupeFisico } from "./utils.js";
import { ThemeToggle, RefreshButton } from "./components/ui.jsx";
import Buscador from "./views/Buscador.jsx";
import EstadoFlota from "./views/EstadoFlota.jsx";
import Inactivos from "./views/Inactivos.jsx";
import EficienciaTracto from "./views/EficienciaTracto.jsx";
import StatsCliente from "./views/StatsCliente.jsx";
import StatsRuta from "./views/StatsRuta.jsx";
import ComparacionMes from "./views/ComparacionMes.jsx";
import PulsoMensual from "./views/PulsoMensual.jsx";
import Combustible from "./views/Combustible.jsx";
import Detalle from "./views/Detalle.jsx";
import Inventario from "./views/Inventario.jsx";

const VIEWS = [
  {id:"buscar",label:"Buscador",icon:"🔍"},
  {id:"flota",label:"Estado Flota",icon:"📊"},
  {id:"inactivos",label:"Equipos",icon:"⚠️"},
  {id:"eficiencia",label:"Eficiencia",icon:"⚖️"},
  {id:"clientes",label:"Por Cliente",icon:"🏢"},
  {id:"rutas",label:"Por Ruta",icon:"🛤️"},
  {id:"pulso",label:"Pulso Mes",icon:"📈"},
  {id:"comparacion",label:"Comp. Mes",icon:"📅"},
  {id:"combustible",label:"Combustible",icon:"⛽"},
  {id:"detalle",label:"Detalle",icon:"📋"},
  {id:"inventario",label:"Inventario",icon:"🏗️"},
];

export default function App() {
  const [view, setView] = useState("buscar");
  const [data, setData] = useState([]);
  const [flota, setFlota] = useState(new Map());
  const [ultimosMap, setUltimosMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastLoad, setLastLoad] = useState(null);
  const [parseWarnings, setParseWarnings] = useState([]);

  const [dark, setDark] = useState(() => {
    try {
      const v = localStorage.getItem("dashops_dark");
      if (v === "0") return false;
      if (v === "1") return true;
    } catch(e) {}
    return true;
  });
  useEffect(() => {
    try { localStorage.setItem("dashops_dark", dark ? "1" : "0"); } catch(e) {}
  }, [dark]);

  const T = useMemo(() => makeTheme(dark), [dark]);
  const today = useMemo(() => new Date(), []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setParseWarnings([]);
    try {
      const bust = "&_=" + Date.now();
      const [rV, rF, rU] = await Promise.all([
        fetch(CSV_VIAJES + bust).then(r => r.text()),
        fetch(CSV_FLOTA + bust).then(r => r.text()),
        fetch(CSV_ULTIMOS + bust).then(r => r.text()),
      ]);

      const warnings = [];

      const pV = Papa.parse(rV, {header: true, skipEmptyLines: true});
      if (pV.errors.length > 0) {
        warnings.push(`CSV Viajes: ${pV.errors.length} error(es) de formato detectado(s). Primero: "${pV.errors[0].message}" (fila ${pV.errors[0].row}).`);
      }
      const totalViajes = pV.data.length;
      const rowsV = pV.data.map(r => ({
        ...r,
        Tracto: cleanPatente(r.Tracto),
        Rampla: cleanPatente(r.Rampla),
        _date: parseDate(r.Fecha),
      })).filter(r => r._date);
      const saltadosViajes = totalViajes - rowsV.length;
      if (saltadosViajes > 0) {
        warnings.push(`Se ignoraron ${saltadosViajes} fila(s) de viajes por tener fecha inválida o vacía.`);
      }
      const sinTracto = rowsV.filter(r => !r.Tracto).length;
      if (sinTracto > 0) {
        warnings.push(`${sinTracto} viaje(s) sin patente de tracto.`);
      }

      const pF = Papa.parse(rF, {header: true, skipEmptyLines: true});
      if (pF.errors.length > 0) {
        warnings.push(`CSV Flota: ${pF.errors.length} error(es) de formato detectado(s).`);
      }
      const flotaMap = new Map();
      let sinPatenteFlota = 0;
      pF.data.forEach(r => {
        const pat = cleanPatente(r.Patente || r.patente);
        if (!pat) { sinPatenteFlota++; return; }
        flotaMap.set(pat, {
          marca: (r.Marca || r.marca || "").trim(),
          modelo: (r.Modelo || r.modelo || "").trim(),
          fecha: (r.Fecha || r.fecha || r.Año || r["Año"] || "").trim(),
          tipoequipo: (r.TipoEquipo || r.Tipo || r.tipoequipo || r.tipo || "").trim(),
        });
      });
      if (sinPatenteFlota > 0) {
        warnings.push(`${sinPatenteFlota} equipo(s) en flota ignorado(s) por no tener patente.`);
      }

      const pU = Papa.parse(rU, {header: true, skipEmptyLines: true});
      if (pU.errors.length > 0) {
        warnings.push(`CSV Últimos despachos: ${pU.errors.length} error(es) de formato detectado(s).`);
      }
      const ultMap = new Map();
      pU.data.forEach(r => {
        const pat = cleanPatente(r.Patente || r.patente || r.Tracto || r.Rampla);
        const d = parseDate(r.Fecha || r.FechaMovimiento);
        if (!pat || !d) return;
        ultMap.set(pat, {
          _date: d,
          Origen: r.Origen || "",
          Destino: r.Destino || "",
          Cliente: r.Cliente || "",
          tipoequipo: r.TipoEquipo || r.Tipo || "",
        });
      });

      setData(rowsV);
      setFlota(flotaMap);
      setUltimosMap(ultMap);
      setLastLoad(Date.now());
      if (warnings.length > 0) setParseWarnings(warnings);
    } catch(e) {
      console.error(e);
      setError("Error cargando datos: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const dataFisica = useMemo(() => dedupeFisico(data), [data]);

  const {tractoIdx, ramplaIdx} = useMemo(() => {
    const tIdx = new Map();
    const rIdx = new Map();
    for (const row of dataFisica) {
      if (row.Tracto) {
        if (!tIdx.has(row.Tracto)) tIdx.set(row.Tracto, []);
        tIdx.get(row.Tracto).push(row);
      }
      if (row.Rampla) {
        if (!rIdx.has(row.Rampla)) rIdx.set(row.Rampla, []);
        rIdx.get(row.Rampla).push(row);
      }
    }
    for (const arr of tIdx.values()) arr.sort((a, b) => b._date - a._date);
    for (const arr of rIdx.values()) arr.sort((a, b) => b._date - a._date);
    return {tractoIdx: tIdx, ramplaIdx: rIdx};
  }, [dataFisica]);

  const wrap = {maxWidth:"1400px",margin:"0 auto",padding:"16px"};
  const navBtn = (v) => ({
    display:"flex",alignItems:"center",gap:"6px",padding:"8px 14px",
    borderRadius:"10px",border:"none",cursor:"pointer",
    fontSize:"12px",fontWeight:600,fontFamily:"inherit",
    background: view === v.id ? T.navActiveBg : T.navBg,
    color: view === v.id ? T.navActiveText : T.tx,
    transition:"all 0.15s",whiteSpace:"nowrap",
    boxShadow: view === v.id ? `0 2px 6px ${T.ac}44` : "none",
  });

  if (loading && data.length === 0) {
    return (
      <div style={{minHeight:"100vh",background:T.bg,color:T.tx,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:"40px",marginBottom:"14px",animation:"spin 1.5s linear infinite",display:"inline-block"}}>🔄</div>
          <div style={{fontSize:"16px",fontWeight:600}}>Cargando datos...</div>
          <div style={{fontSize:"12px",color:T.txM,marginTop:"6px"}}>Viajes, flota y últimos despachos</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{minHeight:"100vh",background:T.bg,color:T.tx,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
        <div style={{textAlign:"center",background:T.sf,border:`1px solid ${T.red}44`,borderRadius:"12px",padding:"24px",maxWidth:"480px"}}>
          <div style={{fontSize:"36px",marginBottom:"10px"}}>⚠️</div>
          <div style={{fontSize:"16px",fontWeight:600,color:T.red,marginBottom:"8px"}}>Error cargando datos</div>
          <div style={{fontSize:"13px",color:T.txM,marginBottom:"16px"}}>{error}</div>
          <button onClick={loadData} style={{padding:"10px 20px",borderRadius:"8px",border:"none",background:T.ac,color:"#000",fontWeight:700,cursor:"pointer",fontSize:"13px"}}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.tx,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"}}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
      `}</style>

      <div style={{background:T.sf,borderBottom:`1px solid ${T.bd}`,boxShadow:T.headerShadow,position:"sticky",top:0,zIndex:10}}>
        <div style={{...wrap,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",flexWrap:"wrap",gap:"8px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"32px",height:"32px",background:`linear-gradient(135deg,${T.ac},#f97316)`,borderRadius:"7px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:"14px",color:"#000"}}>TB</div>
            <div>
              <div style={{fontSize:"14px",fontWeight:700,color:T.tx}}>Dashboard Operaciones</div>
              <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"1px"}}>Transportes Bello e Hijos Ltda.</div>
            </div>
          </div>
          <div style={{display:"flex",gap:"6px",alignItems:"center",flexWrap:"wrap"}}>
            <RefreshButton onRefresh={loadData} loading={loading} lastLoad={lastLoad} T={T}/>
            <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)}/>
          </div>
        </div>

        <div style={{...wrap,padding:"0 16px 12px",display:"flex",gap:"4px",overflowX:"auto",flexWrap:"wrap"}}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={navBtn(v)}>
              <span style={{fontSize:"13px"}}>{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {parseWarnings.length > 0 && (
        <div style={{...wrap, paddingTop:"12px", paddingBottom:"0"}}>
          <div style={{background: T.isDark ? "#2a1f0e" : "#fef3c7", border:`1px solid ${T.ac}66`, borderRadius:"10px", padding:"12px 16px"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"8px"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:"12px", fontWeight:700, color:T.ac, marginBottom:"6px"}}>⚠️ Advertencias al cargar datos ({parseWarnings.length})</div>
                <ul style={{margin:0, paddingLeft:"16px", listStyle:"disc"}}>
                  {parseWarnings.map((w, i) => (
                    <li key={i} style={{fontSize:"11px", color:T.isDark?"#d97706":"#92400e", marginBottom:"2px"}}>{w}</li>
                  ))}
                </ul>
              </div>
              <button onClick={() => setParseWarnings([])} style={{background:"none", border:"none", cursor:"pointer", color:T.ac, fontSize:"16px", lineHeight:1, padding:"0 4px", flexShrink:0}} title="Cerrar">×</button>
            </div>
          </div>
        </div>
      )}

      <div style={wrap}>
        {view === "buscar" && <Buscador tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} today={today} T={T}/>}
        {view === "flota" && <EstadoFlota data={dataFisica} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} ultimosMap={ultimosMap} today={today} T={T}/>}
        {view === "inactivos" && <Inactivos tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} flota={flota} ultimosMap={ultimosMap} today={today} T={T}/>}
        {view === "eficiencia" && <EficienciaTracto data={dataFisica} flota={flota} today={today} T={T}/>}
        {view === "clientes" && <StatsCliente data={data} today={today} T={T}/>}
        {view === "rutas" && <StatsRuta data={data} today={today} T={T}/>}
        {view === "pulso" && <PulsoMensual data={dataFisica} today={today} T={T}/>}
        {view === "comparacion" && <ComparacionMes data={dataFisica} today={today} T={T}/>}
        {view === "combustible" && <Combustible data={dataFisica} flota={flota} today={today} T={T}/>}
        {view === "detalle" && <Detalle data={dataFisica} T={T}/>}
        {view === "inventario" && <Inventario flota={flota} tractoIdx={tractoIdx} ramplaIdx={ramplaIdx} ultimosMap={ultimosMap} today={today} T={T}/>}
      </div>

      <div style={{...wrap,padding:"24px 16px 12px",textAlign:"center",fontSize:"10px",color:T.txM,borderTop:`1px solid ${T.bd}`,marginTop:"24px"}}>
        Transportes Bello e Hijos Ltda. · Dashboard Operaciones · {data.length.toLocaleString("es-CL")} tramos · {flota.size} equipos en catálogo
      </div>
    </div>
  );
}
