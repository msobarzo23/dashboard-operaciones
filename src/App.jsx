import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Papa from "papaparse";
import _ from "lodash";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv";

// ─── Clasificación por Sucursal ───
const SUCURSAL_MAP = {
  "POZO ALMONTE": ["POZO ALMONTE","IQUIQUE","ALTO HOSPICIO","COLLAHUASI","QUEBRADA BLANCA","PICA","ARICA","PUERTO PATACHE","PUERTO IQUIQUE","NUDO URIBE","TALABRE"],
  "MEJILLONES": ["MEJILLONES"],
  "ANTOFAGASTA": ["LA NEGRA","ANTOFAGASTA","CALAMA","MINERA ESCONDIDA","MINERA ESCONDIDA LAGUNA SECA","MINERA ESCONDIDA LOS COLORADOS","MINERA ESCONDIDA OGP1","MINERA ESCONDIDA PUERTO COLOSO","SPENCE","EL ABRA","CENTINELA","SIERRA GORDA","LOMAS BAYAS","MANTOS BLANCOS","MANTOS DE LA LUNA","RADOMIRO TOMIC","MINISTRO HALES","EL TESORO","MINERA ESPERANZA","MINERA ENCUENTRO","MINERA FRANKE","MINERA MICHILLA","MINA GABY","ANTUCOYA","MINERA ANTUCOYA","CERRO DOMINADOR","PUERTO ANGAMOS","AGUA DE MAR","LA PORTADA","MARIA ELENA","PEDRO DE VALDIVIA","EL TOCO","RIO LOA","TOCOPILLA","PAMPA BLANCA","SALAR DE ATACAMA","SALAR DEL CARMEN","ELENITA","NUEVA VICTORIA","AGUAS VERDES","DOMEYKO","EL PEÑON","ZALDIVAR","MINA OESTE","BARRIAL SECO","CERRO NEGRO","COYASUR","EL SALVADOR","EHM"],
  "COPIAPO": ["COPIAPO","PAIPOTE","VALLENAR","CANDELARIA","MINA LA COIPA","MANTOS VERDES","MINERA ARQUEROS","OJOS DEL SALADO","PUNTA DE COBRE","PUCOBRE","FENIX GOLD","SALARES NORTE","MINERA GUANACO","GARITA CARRIZALILLO","PORTEZUELO","MINA TERRAEX PAIPOTE","MINERA PLEITO","ATACAMA KOZAN","MANTOVERDE","MAITENCILLO","MINERA EL CRISTO","LAS BARRANCAS","CASERONES"],
  "COQUIMBO": ["COQUIMBO","PUNTA TEATINOS","SALADILLO","LOS COLORADOS","LA SERENA","OVALLE","ANDACOLLO","ROMERAL","MINERA LOS PELAMBRES","SALAMANCA"],
  "SANTIAGO": ["SANTIAGO","QUILICURA","LAMPA","BUIN","RANCAGUA","SAN ANTONIO","SAN BERNARDO","PEÑAFLOR","PADRE HURTADO","PELDEHUE","ESTACION CENTRAL","AEROPUERTO SANTIAGO","AEROPUERTO ANTOFAGASTA","LOS ANDES","SAN FELIPE","VIÑA DEL MAR","VALPARAISO","CASABLANCA","LIMACHE","RENGO","REQUINOA","TALAGANTE","COLINA","PROVIDENCIA","FLORIDA","NOGALES","QUILLOTA","LOS BRONCES","ANDINA","EL TENIENTE","EL TENIENTE (RAJO SUR)","EL SOLDADO","MINERA VALLE CENTRAL","ALHUE","MINA EL ESPINO","SAN JAVIER","SANTA FE"]
};

const SUCURSAL_COLORS = {
  "POZO ALMONTE": { bg: "#1a2744", text: "#5b9cf5", accent: "#3b7de0" },
  "MEJILLONES": { bg: "#1a2a3a", text: "#4ecdc4", accent: "#36a89e" },
  "ANTOFAGASTA": { bg: "#2a1f0e", text: "#f5a623", accent: "#d4891a" },
  "COPIAPO": { bg: "#1a2a1a", text: "#6fcf6f", accent: "#4a9f4a" },
  "COQUIMBO": { bg: "#2a1a2a", text: "#cf6fcf", accent: "#9f4a9f" },
  "SANTIAGO": { bg: "#1f1a2a", text: "#8b9cf5", accent: "#6b7ce0" },
  "OTROS": { bg: "#1a1a1a", text: "#999", accent: "#666" }
};

function getSucursal(location) {
  if (!location) return "OTROS";
  const loc = location.toUpperCase().trim();
  for (const [suc, locs] of Object.entries(SUCURSAL_MAP)) {
    if (locs.includes(loc)) return suc;
  }
  return "OTROS";
}

function parseDate(str) {
  if (!str) return null;
  const [d, m, y] = str.split("/");
  return new Date(+y, +m - 1, +d);
}

function formatDate(d) {
  if (!d) return "-";
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

function daysBetween(d1, d2) {
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

// ─── Styles ───
const theme = {
  bg: "#0a0c10",
  surface: "#12151c",
  surface2: "#1a1e28",
  border: "#252a36",
  text: "#e0e4ec",
  textMuted: "#6b7280",
  accent: "#f59e0b",
  accentHover: "#d97706",
  accentDim: "rgba(245,158,11,0.1)",
  danger: "#ef4444",
  success: "#22c55e",
  info: "#3b82f6",
};

const baseStyles = {
  app: { minHeight:"100vh", background:theme.bg, color:theme.text, fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:"13px" },
  header: { background:theme.surface, borderBottom:`1px solid ${theme.border}`, padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 },
  logo: { display:"flex", alignItems:"center", gap:"12px" },
  logoIcon: { width:"36px", height:"36px", background:`linear-gradient(135deg, ${theme.accent}, #f97316)`, borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:"16px", color:"#000" },
  title: { fontSize:"18px", fontWeight:700, letterSpacing:"-0.5px", color:theme.text },
  subtitle: { fontSize:"11px", color:theme.textMuted, letterSpacing:"2px", textTransform:"uppercase" },
  nav: { display:"flex", gap:"2px", background:theme.surface2, borderRadius:"8px", padding:"3px" },
  navBtn: (active) => ({ padding:"8px 16px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"12px", fontWeight:active?600:400, fontFamily:"inherit", background:active?theme.accent:"transparent", color:active?"#000":theme.textMuted, transition:"all 0.2s", whiteSpace:"nowrap" }),
  container: { maxWidth:"1400px", margin:"0 auto", padding:"24px" },
  card: { background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:"12px", padding:"20px", marginBottom:"16px" },
  cardTitle: { fontSize:"14px", fontWeight:600, color:theme.text, marginBottom:"12px", display:"flex", alignItems:"center", gap:"8px" },
  input: { background:theme.surface2, border:`1px solid ${theme.border}`, borderRadius:"8px", padding:"10px 14px", color:theme.text, fontSize:"14px", fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" },
  select: { background:theme.surface2, border:`1px solid ${theme.border}`, borderRadius:"8px", padding:"8px 12px", color:theme.text, fontSize:"12px", fontFamily:"inherit", outline:"none", cursor:"pointer" },
  badge: (color) => ({ display:"inline-block", padding:"2px 8px", borderRadius:"4px", fontSize:"11px", fontWeight:600, background:`${color}22`, color, border:`1px solid ${color}44` }),
  table: { width:"100%", borderCollapse:"collapse", fontSize:"12px" },
  th: { textAlign:"left", padding:"10px 12px", borderBottom:`2px solid ${theme.border}`, color:theme.textMuted, fontWeight:600, textTransform:"uppercase", fontSize:"10px", letterSpacing:"1px", position:"sticky", top:0, background:theme.surface, whiteSpace:"nowrap" },
  td: { padding:"8px 12px", borderBottom:`1px solid ${theme.border}`, whiteSpace:"nowrap" },
  stat: { textAlign:"center", padding:"12px" },
  statValue: { fontSize:"28px", fontWeight:700, color:theme.accent, lineHeight:1.2 },
  statLabel: { fontSize:"11px", color:theme.textMuted, marginTop:"4px", textTransform:"uppercase", letterSpacing:"1px" },
  pill: { display:"inline-flex", alignItems:"center", gap:"4px", padding:"3px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:500 },
  row: { display:"flex", gap:"16px", flexWrap:"wrap" },
  grid4: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"16px" },
  scrollTable: { maxHeight:"500px", overflowY:"auto", overflowX:"auto" },
};

// ─── Components ───
function StatCard({ value, label, icon, color }) {
  return (
    <div style={{ ...baseStyles.card, textAlign:"center", flex:"1", minWidth:"160px" }}>
      <div style={{ fontSize:"12px", marginBottom:"8px" }}>{icon}</div>
      <div style={{ ...baseStyles.statValue, color: color || theme.accent }}>{value}</div>
      <div style={baseStyles.statLabel}>{label}</div>
    </div>
  );
}

function SucursalBadge({ sucursal }) {
  const z = SUCURSAL_COLORS[sucursal] || SUCURSAL_COLORS["OTROS"];
  return <span style={{ ...baseStyles.pill, background: z.bg, color: z.text, border:`1px solid ${z.accent}44` }}>{sucursal}</span>;
}

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display:"flex", gap:"6px", alignItems:"center", justifyContent:"center", marginTop:"12px" }}>
      <button onClick={() => onPageChange(Math.max(1,page-1))} disabled={page===1} style={{ ...baseStyles.select, opacity:page===1?0.3:1, cursor:page===1?"default":"pointer" }}>← Ant</button>
      <span style={{ fontSize:"12px", color:theme.textMuted }}>{page} / {totalPages}</span>
      <button onClick={() => onPageChange(Math.min(totalPages,page+1))} disabled={page===totalPages} style={{ ...baseStyles.select, opacity:page===totalPages?0.3:1, cursor:page===totalPages?"default":"pointer" }}>Sig →</button>
    </div>
  );
}

// ─── VIEW 1: Buscador de Equipos ───
function BuscadorEquipos({ data, tractoIndex, ramplaIndex, today }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  const results = useMemo(() => {
    const q = search.toUpperCase().trim();
    if (!q || q.length < 3) return null;
    const out = [];
    if (type === "all" || type === "tracto") {
      for (const [key, tramos] of tractoIndex.entries()) {
        if (key.includes(q)) out.push({ type:"TRACTO", patente:key, tramos });
      }
    }
    if (type === "all" || type === "rampla") {
      for (const [key, tramos] of ramplaIndex.entries()) {
        if (key.includes(q)) out.push({ type:"RAMPLA", patente:key, tramos });
      }
    }
    return out.slice(0, 20);
  }, [search, type, tractoIndex, ramplaIndex]);

  return (
    <div>
      <div style={baseStyles.card}>
        <div style={baseStyles.cardTitle}>🔍 Buscador de Equipos</div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <select value={type} onChange={e=>setType(e.target.value)} style={baseStyles.select}>
            <option value="all">Todo</option>
            <option value="tracto">Solo Tractos</option>
            <option value="rampla">Solo Ramplas</option>
          </select>
          <input style={baseStyles.input} placeholder="Buscar patente (mín. 3 caracteres)..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
      </div>
      {results && results.length === 0 && <div style={{ ...baseStyles.card, textAlign:"center", color:theme.textMuted }}>Sin resultados para "{search}"</div>}
      {results && results.map((r, i) => {
        const last = r.tramos[0];
        const inactive = daysBetween(last._date, today);
        const sucursal = getSucursal(last.Destino);
        return (
          <div key={i} style={{ ...baseStyles.card, borderLeft:`3px solid ${r.type==="TRACTO"?theme.info:theme.accent}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px", flexWrap:"wrap", gap:"8px" }}>
              <div>
                <span style={baseStyles.badge(r.type==="TRACTO"?theme.info:theme.accent)}>{r.type}</span>
                <span style={{ fontSize:"20px", fontWeight:700, marginLeft:"10px" }}>{r.patente}</span>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"11px", color:theme.textMuted }}>Último movimiento</div>
                <div style={{ fontWeight:600, color: inactive>30?theme.danger:inactive>15?theme.accent:theme.success }}>
                  {last.Fecha} ({inactive === 0 ? "hoy" : `hace ${inactive} días`})
                </div>
              </div>
            </div>
            <div style={{ background:theme.surface2, borderRadius:"8px", padding:"12px", marginBottom:"12px", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"8px" }}>
              <div><span style={{ color:theme.textMuted, fontSize:"10px" }}>ÚLTIMO VIAJE</span><br/><strong>{last.Origen} → {last.Destino}</strong></div>
              <div><span style={{ color:theme.textMuted, fontSize:"10px" }}>SUCURSAL DESTINO</span><br/><SucursalBadge sucursal={sucursal}/></div>
              <div><span style={{ color:theme.textMuted, fontSize:"10px" }}>{r.type==="TRACTO"?"RAMPLA":"TRACTO"}</span><br/><strong>{r.type==="TRACTO"?last.Rampla:last.Tracto}</strong></div>
              <div><span style={{ color:theme.textMuted, fontSize:"10px" }}>CLIENTE</span><br/>{last.Cliente}</div>
              <div><span style={{ color:theme.textMuted, fontSize:"10px" }}>CARGA</span><br/>{last.Carga}</div>
              <div><span style={{ color:theme.textMuted, fontSize:"10px" }}>KM</span><br/>{Number(last.Kilometro||0).toLocaleString("es-CL")}</div>
            </div>
            <details>
              <summary style={{ cursor:"pointer", fontSize:"12px", color:theme.accent, marginBottom:"8px" }}>Últimos {Math.min(r.tramos.length,15)} movimientos (de {r.tramos.length} totales)</summary>
              <div style={baseStyles.scrollTable}>
                <table style={baseStyles.table}>
                  <thead><tr>
                    <th style={baseStyles.th}>Fecha</th><th style={baseStyles.th}>Origen</th><th style={baseStyles.th}>Destino</th>
                    <th style={baseStyles.th}>{r.type==="TRACTO"?"Rampla":"Tracto"}</th><th style={baseStyles.th}>Cliente</th><th style={baseStyles.th}>Carga</th><th style={baseStyles.th}>KM</th>
                  </tr></thead>
                  <tbody>{r.tramos.slice(0,15).map((t,j) => (
                    <tr key={j} style={{ background:j%2===0?"transparent":theme.surface2 }}>
                      <td style={baseStyles.td}>{t.Fecha}</td><td style={baseStyles.td}>{t.Origen}</td><td style={baseStyles.td}>{t.Destino}</td>
                      <td style={baseStyles.td}>{r.type==="TRACTO"?t.Rampla:t.Tracto}</td><td style={baseStyles.td}>{t.Cliente}</td><td style={baseStyles.td}>{t.Carga}</td>
                      <td style={baseStyles.td}>{Number(t.Kilometro||0).toLocaleString("es-CL")}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
          </div>
        );
      })}
      {!results && <div style={{ ...baseStyles.card, textAlign:"center", color:theme.textMuted, padding:"48px" }}>
        <div style={{ fontSize:"40px", marginBottom:"12px" }}>🔍</div>
        Ingresa al menos 3 caracteres de la patente para buscar
      </div>}
    </div>
  );
}

// ─── VIEW 2: Estado de Flota ───
function EstadoFlota({ data, tractoIndex, ramplaIndex, today }) {
  const [days, setDays] = useState(30);

  const stats = useMemo(() => {
    const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - days);
    let activeTractos = 0, activeRamplas = 0, totalKm = 0, totalTrips = 0;
    const sucursalCount = {};
    const tractoKm = {};

    for (const [key, tramos] of tractoIndex.entries()) {
      const recent = tramos.filter(t => t._date >= cutoff);
      if (recent.length > 0) {
        activeTractos++;
        const km = recent.reduce((s,t) => s + (Number(t.Kilometro)||0), 0);
        tractoKm[key] = km;
        totalKm += km;
        totalTrips += recent.length;
      }
    }
    for (const [key, tramos] of ramplaIndex.entries()) {
      if (tramos.some(t => t._date >= cutoff)) activeRamplas++;
      const last = tramos[0];
      const z = getSucursal(last.Destino);
      sucursalCount[z] = (sucursalCount[z]||0) + 1;
    }

    const topTractos = Object.entries(tractoKm).sort((a,b) => b[1]-a[1]).slice(0,10);
    const topRamplas = [];
    for (const [key, tramos] of ramplaIndex.entries()) {
      const recent = tramos.filter(t => t._date >= cutoff);
      const km = recent.reduce((s,t) => s + (Number(t.Kilometro)||0), 0);
      if (km > 0) topRamplas.push([key, km, recent.length]);
    }
    topRamplas.sort((a,b) => b[1]-a[1]);

    return { activeTractos, activeRamplas, totalKm, totalTrips, sucursalCount, topTractos, topRamplas: topRamplas.slice(0,10), totalTractos: tractoIndex.size, totalRamplas: ramplaIndex.size };
  }, [data, tractoIndex, ramplaIndex, today, days]);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
        <h2 style={{ margin:0, fontSize:"16px" }}>📊 Estado de Flota</h2>
        <select value={days} onChange={e=>setDays(+e.target.value)} style={baseStyles.select}>
          <option value={7}>Últimos 7 días</option><option value={15}>Últimos 15 días</option>
          <option value={30}>Últimos 30 días</option><option value={60}>Últimos 60 días</option>
          <option value={90}>Últimos 90 días</option>
        </select>
      </div>
      <div style={baseStyles.row}>
        <StatCard icon="🚛" value={stats.activeTractos} label={`Tractos activos / ${stats.totalTractos}`} color={theme.info}/>
        <StatCard icon="🚃" value={stats.activeRamplas} label={`Ramplas activas / ${stats.totalRamplas}`} color={theme.accent}/>
        <StatCard icon="🛣️" value={Math.round(stats.totalKm/1000).toLocaleString("es-CL")+"K"} label="KM Totales" color={theme.success}/>
        <StatCard icon="📋" value={stats.totalTrips.toLocaleString("es-CL")} label="Tramos" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginTop:"16px" }}>
        <div style={baseStyles.card}>
          <div style={baseStyles.cardTitle}>🗺️ Distribución de Ramplas por Sucursal (última ubicación)</div>
          {Object.entries(stats.sucursalCount).sort((a,b)=>b[1]-a[1]).map(([z,c]) => {
            const pct = (c / stats.totalRamplas * 100).toFixed(1);
            const zc = SUCURSAL_COLORS[z] || SUCURSAL_COLORS["OTROS"];
            return (
              <div key={z} style={{ marginBottom:"8px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                  <SucursalBadge sucursal={z}/><span style={{ fontSize:"12px", color:theme.textMuted }}>{c} equipos ({pct}%)</span>
                </div>
                <div style={{ height:"6px", background:theme.surface2, borderRadius:"3px", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:zc.accent, borderRadius:"3px", transition:"width 0.5s" }}/>
                </div>
              </div>
            );
          })}
        </div>
        <div style={baseStyles.card}>
          <div style={baseStyles.cardTitle}>🏆 Top 10 Tractos por KM</div>
          <table style={baseStyles.table}>
            <thead><tr><th style={baseStyles.th}>#</th><th style={baseStyles.th}>Tracto</th><th style={baseStyles.th}>KM</th></tr></thead>
            <tbody>{stats.topTractos.map(([t,km],i) => (
              <tr key={t} style={{ background:i%2===0?"transparent":theme.surface2 }}>
                <td style={baseStyles.td}>{i+1}</td><td style={{ ...baseStyles.td, fontWeight:600 }}>{t}</td>
                <td style={baseStyles.td}>{km.toLocaleString("es-CL")}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div style={baseStyles.card}>
        <div style={baseStyles.cardTitle}>🏆 Top 10 Ramplas por KM</div>
        <table style={baseStyles.table}>
          <thead><tr><th style={baseStyles.th}>#</th><th style={baseStyles.th}>Rampla</th><th style={baseStyles.th}>KM</th><th style={baseStyles.th}>Tramos</th><th style={baseStyles.th}>KM/Tramo</th></tr></thead>
          <tbody>{stats.topRamplas.map(([r,km,tr],i) => (
            <tr key={r} style={{ background:i%2===0?"transparent":theme.surface2 }}>
              <td style={baseStyles.td}>{i+1}</td><td style={{ ...baseStyles.td, fontWeight:600 }}>{r}</td>
              <td style={baseStyles.td}>{km.toLocaleString("es-CL")}</td><td style={baseStyles.td}>{tr}</td>
              <td style={baseStyles.td}>{Math.round(km/tr).toLocaleString("es-CL")}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── VIEW 3: Equipos Inactivos ───
function EquiposInactivos({ tractoIndex, ramplaIndex, today }) {
  const [threshold, setThreshold] = useState(30);
  const [type, setType] = useState("rampla");

  const inactive = useMemo(() => {
    const index = type === "tracto" ? tractoIndex : ramplaIndex;
    const results = [];
    for (const [key, tramos] of index.entries()) {
      const last = tramos[0];
      const d = daysBetween(last._date, today);
      if (d >= threshold) {
        results.push({ patente:key, days:d, lastDate:last.Fecha, lastOrigen:last.Origen, lastDestino:last.Destino, lastCliente:last.Cliente, lastCarga:last.Carga, sucursal:getSucursal(last.Destino), pareado:type==="tracto"?last.Rampla:last.Tracto });
      }
    }
    results.sort((a,b) => b.days - a.days);
    return results;
  }, [tractoIndex, ramplaIndex, today, threshold, type]);

  const bySucursal = useMemo(() => {
    const m = {};
    inactive.forEach(r => { m[r.sucursal] = (m[r.sucursal]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [inactive]);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"8px" }}>
        <h2 style={{ margin:0, fontSize:"16px" }}>⚠️ Equipos Inactivos</h2>
        <div style={{ display:"flex", gap:"8px" }}>
          <select value={type} onChange={e=>setType(e.target.value)} style={baseStyles.select}>
            <option value="rampla">Ramplas</option><option value="tracto">Tractos</option>
          </select>
          <select value={threshold} onChange={e=>setThreshold(+e.target.value)} style={baseStyles.select}>
            <option value={7}>+7 días</option><option value={15}>+15 días</option><option value={30}>+30 días</option>
            <option value={60}>+60 días</option><option value={90}>+90 días</option><option value={180}>+180 días</option>
            <option value={365}>+1 año</option>
          </select>
        </div>
      </div>

      <div style={baseStyles.row}>
        <StatCard icon="🔴" value={inactive.length} label={`${type==="tracto"?"Tractos":"Ramplas"} inactivos +${threshold}d`} color={theme.danger}/>
        {bySucursal.slice(0,3).map(([z,c]) => (
          <StatCard key={z} icon={<SucursalBadge sucursal={z}/>} value={c} label={`En ${z}`} color={SUCURSAL_COLORS[z]?.accent||"#666"}/>
        ))}
      </div>

      <div style={baseStyles.card}>
        <div style={baseStyles.scrollTable}>
          <table style={baseStyles.table}>
            <thead><tr>
              <th style={baseStyles.th}>Patente</th><th style={baseStyles.th}>Días Inactivo</th><th style={baseStyles.th}>Último Mov.</th>
              <th style={baseStyles.th}>Último Destino</th><th style={baseStyles.th}>Sucursal</th><th style={baseStyles.th}>Pareado</th>
              <th style={baseStyles.th}>Cliente</th><th style={baseStyles.th}>Carga</th>
            </tr></thead>
            <tbody>{inactive.slice(0,100).map((r,i) => (
              <tr key={r.patente} style={{ background:i%2===0?"transparent":theme.surface2 }}>
                <td style={{ ...baseStyles.td, fontWeight:700 }}>{r.patente}</td>
                <td style={{ ...baseStyles.td, color: r.days>90?theme.danger:r.days>30?theme.accent:theme.text, fontWeight:600 }}>{r.days}d</td>
                <td style={baseStyles.td}>{r.lastDate}</td>
                <td style={baseStyles.td}>{r.lastDestino}</td>
                <td style={baseStyles.td}><SucursalBadge sucursal={r.sucursal}/></td>
                <td style={baseStyles.td}>{r.pareado}</td>
                <td style={baseStyles.td}>{r.lastCliente}</td>
                <td style={baseStyles.td}>{r.lastCarga}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {inactive.length > 100 && <div style={{ textAlign:"center", padding:"8px", color:theme.textMuted, fontSize:"11px" }}>Mostrando 100 de {inactive.length}</div>}
      </div>
    </div>
  );
}

// ─── VIEW 4: Estadísticas por Cliente ───
function StatsCliente({ data, today }) {
  const [months, setMonths] = useState(1);
  const [sortBy, setSortBy] = useState("km");

  const stats = useMemo(() => {
    const cutoff = new Date(today); cutoff.setMonth(cutoff.getMonth() - months);
    const filtered = data.filter(d => d._date >= cutoff && d.Cliente !== "-Viaje sin solicitud -");
    const byClient = {};
    filtered.forEach(d => {
      const c = d.Cliente;
      if (!byClient[c]) byClient[c] = { cliente: c, km: 0, tramos: 0, solicitudes: new Set(), cargas: {}, origenes: new Set(), destinos: new Set() };
      byClient[c].km += Number(d.Kilometro) || 0;
      byClient[c].tramos++;
      if (d.Solicitud) byClient[c].solicitudes.add(d.Solicitud);
      const carga = d.Carga?.trim();
      if (carga && !/^\d+$/.test(carga)) byClient[c].cargas[carga] = (byClient[c].cargas[carga]||0) + 1;
      byClient[c].origenes.add(d.Origen);
      byClient[c].destinos.add(d.Destino);
    });

    let result = Object.values(byClient).map(c => ({
      ...c, solicitudes: c.solicitudes.size,
      topCargas: Object.entries(c.cargas).sort((a,b)=>b[1]-a[1]).slice(0,3),
      rutas: c.origenes.size + c.destinos.size
    }));

    if (sortBy === "km") result.sort((a,b) => b.km - a.km);
    else if (sortBy === "tramos") result.sort((a,b) => b.tramos - a.tramos);
    else if (sortBy === "solicitudes") result.sort((a,b) => b.solicitudes - a.solicitudes);
    else result.sort((a,b) => a.cliente.localeCompare(b.cliente));

    return result;
  }, [data, today, months, sortBy]);

  const totalKm = stats.reduce((s,c) => s + c.km, 0);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"8px" }}>
        <h2 style={{ margin:0, fontSize:"16px" }}>🏢 Estadísticas por Cliente</h2>
        <div style={{ display:"flex", gap:"8px" }}>
          <select value={months} onChange={e=>setMonths(+e.target.value)} style={baseStyles.select}>
            <option value={1}>Último mes</option><option value={2}>Últimos 2 meses</option><option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option><option value={12}>Último año</option><option value={99}>Todo</option>
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={baseStyles.select}>
            <option value="km">Ordenar por KM</option><option value="tramos">Ordenar por Tramos</option>
            <option value="solicitudes">Ordenar por Solicitudes</option><option value="nombre">Ordenar A-Z</option>
          </select>
        </div>
      </div>

      <div style={baseStyles.card}>
        <div style={baseStyles.scrollTable}>
          <table style={baseStyles.table}>
            <thead><tr>
              <th style={baseStyles.th}>#</th><th style={baseStyles.th}>Cliente</th><th style={baseStyles.th}>KM Total</th>
              <th style={baseStyles.th}>% KM</th><th style={baseStyles.th}>Tramos</th><th style={baseStyles.th}>Solicitudes</th>
              <th style={baseStyles.th}>Principales Cargas</th>
            </tr></thead>
            <tbody>{stats.map((c,i) => (
              <tr key={c.cliente} style={{ background:i%2===0?"transparent":theme.surface2 }}>
                <td style={baseStyles.td}>{i+1}</td>
                <td style={{ ...baseStyles.td, fontWeight:600, maxWidth:"250px", overflow:"hidden", textOverflow:"ellipsis" }}>{c.cliente}</td>
                <td style={{ ...baseStyles.td, fontWeight:600 }}>{c.km.toLocaleString("es-CL")}</td>
                <td style={baseStyles.td}>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                    <div style={{ width:"60px", height:"5px", background:theme.surface2, borderRadius:"3px", overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${(c.km/totalKm*100)}%`, background:theme.accent, borderRadius:"3px" }}/>
                    </div>
                    <span>{(c.km/totalKm*100).toFixed(1)}%</span>
                  </div>
                </td>
                <td style={baseStyles.td}>{c.tramos.toLocaleString("es-CL")}</td>
                <td style={baseStyles.td}>{c.solicitudes.toLocaleString("es-CL")}</td>
                <td style={baseStyles.td}>{c.topCargas.map(([cg,n]) => <span key={cg} style={{ ...baseStyles.pill, background:theme.accentDim, color:theme.accent, marginRight:"4px", marginBottom:"2px" }}>{cg} ({n})</span>)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── VIEW 5: Estadísticas por Ruta ───
function StatsRuta({ data, today }) {
  const [months, setMonths] = useState(1);
  const [minTrips, setMinTrips] = useState(5);

  const stats = useMemo(() => {
    const cutoff = new Date(today); cutoff.setMonth(cutoff.getMonth() - months);
    const filtered = data.filter(d => d._date >= cutoff);
    const byRoute = {};
    filtered.forEach(d => {
      const key = `${d.Origen} → ${d.Destino}`;
      if (!byRoute[key]) byRoute[key] = { ruta:key, origen:d.Origen, destino:d.Destino, km:0, count:0, clientes:new Set(), cargas:{} };
      byRoute[key].km += Number(d.Kilometro)||0;
      byRoute[key].count++;
      byRoute[key].clientes.add(d.Cliente);
      const carga = d.Carga?.trim();
      if (carga && !/^\d+$/.test(carga)) byRoute[key].cargas[carga] = (byRoute[key].cargas[carga]||0)+1;
    });
    return Object.values(byRoute)
      .filter(r => r.count >= minTrips)
      .map(r => ({ ...r, avgKm: Math.round(r.km/r.count), clientes:r.clientes.size, topCarga: Object.entries(r.cargas).sort((a,b)=>b[1]-a[1])[0]?.[0]||"-", sucOrigen:getSucursal(r.origen), sucDestino:getSucursal(r.destino) }))
      .sort((a,b) => b.count - a.count);
  }, [data, today, months, minTrips]);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"8px" }}>
        <h2 style={{ margin:0, fontSize:"16px" }}>🛤️ Estadísticas por Ruta</h2>
        <div style={{ display:"flex", gap:"8px" }}>
          <select value={months} onChange={e=>setMonths(+e.target.value)} style={baseStyles.select}>
            <option value={1}>Último mes</option><option value={2}>Últimos 2 meses</option><option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option><option value={99}>Todo</option>
          </select>
          <select value={minTrips} onChange={e=>setMinTrips(+e.target.value)} style={baseStyles.select}>
            <option value={1}>Min. 1 viaje</option><option value={5}>Min. 5 viajes</option><option value={10}>Min. 10 viajes</option>
            <option value={20}>Min. 20 viajes</option><option value={50}>Min. 50 viajes</option>
          </select>
        </div>
      </div>
      <div style={baseStyles.card}>
        <div style={baseStyles.scrollTable}>
          <table style={baseStyles.table}>
            <thead><tr>
              <th style={baseStyles.th}>#</th><th style={baseStyles.th}>Ruta</th><th style={baseStyles.th}>Sucursal O→D</th>
              <th style={baseStyles.th}>Viajes</th><th style={baseStyles.th}>KM Total</th><th style={baseStyles.th}>KM Prom.</th>
              <th style={baseStyles.th}>Clientes</th><th style={baseStyles.th}>Carga Ppal.</th>
            </tr></thead>
            <tbody>{stats.slice(0,80).map((r,i) => (
              <tr key={r.ruta} style={{ background:i%2===0?"transparent":theme.surface2 }}>
                <td style={baseStyles.td}>{i+1}</td>
                <td style={{ ...baseStyles.td, fontWeight:600 }}>{r.ruta}</td>
                <td style={baseStyles.td}><SucursalBadge sucursal={r.sucOrigen}/> → <SucursalBadge sucursal={r.sucDestino}/></td>
                <td style={{ ...baseStyles.td, fontWeight:600, color:theme.accent }}>{r.count}</td>
                <td style={baseStyles.td}>{r.km.toLocaleString("es-CL")}</td>
                <td style={baseStyles.td}>{r.avgKm.toLocaleString("es-CL")}</td>
                <td style={baseStyles.td}>{r.clientes}</td>
                <td style={baseStyles.td}>{r.topCarga}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── VIEW 6: Detalle de Tramos ───
function DetalleTramos({ data, today }) {
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [cliente, setCliente] = useState("");
  const [tracto, setTracto] = useState("");
  const [rampla, setRampla] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [carga, setCarga] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 50;

  const clientes = useMemo(() => [...new Set(data.map(d=>d.Cliente))].sort(), [data]);
  const cargas = useMemo(() => [...new Set(data.map(d=>d.Carga?.trim()).filter(c=>c&&!/^\d+$/.test(c)))].sort(), [data]);

  const filtered = useMemo(() => {
    let f = data;
    if (fechaDesde) { const d = new Date(fechaDesde); f = f.filter(r => r._date >= d); }
    if (fechaHasta) { const d = new Date(fechaHasta); d.setDate(d.getDate()+1); f = f.filter(r => r._date < d); }
    if (cliente) f = f.filter(r => r.Cliente === cliente);
    if (tracto) f = f.filter(r => r.Tracto?.toUpperCase().includes(tracto.toUpperCase()));
    if (rampla) f = f.filter(r => r.Rampla?.toUpperCase().includes(rampla.toUpperCase()));
    if (origen) f = f.filter(r => r.Origen?.toUpperCase().includes(origen.toUpperCase()));
    if (destino) f = f.filter(r => r.Destino?.toUpperCase().includes(destino.toUpperCase()));
    if (carga) f = f.filter(r => r.Carga === carga);
    return f;
  }, [data, fechaDesde, fechaHasta, cliente, tracto, rampla, origen, destino, carga]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice((page-1)*perPage, page*perPage);
  const totalKm = useMemo(() => filtered.reduce((s,d) => s + (Number(d.Kilometro)||0), 0), [filtered]);

  useEffect(() => setPage(1), [fechaDesde, fechaHasta, cliente, tracto, rampla, origen, destino, carga]);

  return (
    <div>
      <h2 style={{ margin:"0 0 16px", fontSize:"16px" }}>📋 Detalle de Tramos</h2>
      <div style={{ ...baseStyles.card }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"8px" }}>
          <div><label style={{ fontSize:"10px", color:theme.textMuted }}>DESDE</label><input type="date" value={fechaDesde} onChange={e=>setFechaDesde(e.target.value)} style={baseStyles.input}/></div>
          <div><label style={{ fontSize:"10px", color:theme.textMuted }}>HASTA</label><input type="date" value={fechaHasta} onChange={e=>setFechaHasta(e.target.value)} style={baseStyles.input}/></div>
          <div><label style={{ fontSize:"10px", color:theme.textMuted }}>CLIENTE</label>
            <select value={cliente} onChange={e=>setCliente(e.target.value)} style={{ ...baseStyles.input, padding:"9px 12px" }}>
              <option value="">Todos</option>{clientes.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:"10px", color:theme.textMuted }}>TRACTO</label><input value={tracto} onChange={e=>setTracto(e.target.value)} placeholder="Filtrar..." style={baseStyles.input}/></div>
          <div><label style={{ fontSize:"10px", color:theme.textMuted }}>RAMPLA</label><input value={rampla} onChange={e=>setRampla(e.target.value)} placeholder="Filtrar..." style={baseStyles.input}/></div>
          <div><label style={{ fontSize:"10px", color:theme.textMuted }}>ORIGEN</label><input value={origen} onChange={e=>setOrigen(e.target.value)} placeholder="Filtrar..." style={baseStyles.input}/></div>
          <div><label style={{ fontSize:"10px", color:theme.textMuted }}>DESTINO</label><input value={destino} onChange={e=>setDestino(e.target.value)} placeholder="Filtrar..." style={baseStyles.input}/></div>
          <div><label style={{ fontSize:"10px", color:theme.textMuted }}>CARGA</label>
            <select value={carga} onChange={e=>setCarga(e.target.value)} style={{ ...baseStyles.input, padding:"9px 12px" }}>
              <option value="">Todas</option>{cargas.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:"16px", marginBottom:"16px" }}>
        <div style={{ ...baseStyles.pill, background:theme.accentDim, color:theme.accent }}>{filtered.length.toLocaleString("es-CL")} tramos</div>
        <div style={{ ...baseStyles.pill, background:"rgba(34,197,94,0.1)", color:theme.success }}>{totalKm.toLocaleString("es-CL")} km</div>
        <div style={{ ...baseStyles.pill, background:"rgba(59,130,246,0.1)", color:theme.info }}>{new Set(filtered.map(d=>d.Solicitud)).size.toLocaleString("es-CL")} solicitudes</div>
      </div>

      <div style={baseStyles.card}>
        <div style={baseStyles.scrollTable}>
          <table style={baseStyles.table}>
            <thead><tr>
              <th style={baseStyles.th}>Fecha</th><th style={baseStyles.th}>Solicitud</th><th style={baseStyles.th}>Cliente</th>
              <th style={baseStyles.th}>Tracto</th><th style={baseStyles.th}>Rampla</th><th style={baseStyles.th}>Origen</th>
              <th style={baseStyles.th}>Destino</th><th style={baseStyles.th}>KM</th><th style={baseStyles.th}>Carga</th>
            </tr></thead>
            <tbody>{pageData.map((d,i) => (
              <tr key={`${d.Expedicion}-${i}`} style={{ background:i%2===0?"transparent":theme.surface2 }}>
                <td style={baseStyles.td}>{d.Fecha}</td><td style={baseStyles.td}>{d.Solicitud}</td>
                <td style={{ ...baseStyles.td, maxWidth:"200px", overflow:"hidden", textOverflow:"ellipsis" }}>{d.Cliente}</td>
                <td style={{ ...baseStyles.td, fontWeight:600 }}>{d.Tracto}</td>
                <td style={{ ...baseStyles.td, fontWeight:600 }}>{d.Rampla}</td>
                <td style={baseStyles.td}>{d.Origen}</td><td style={baseStyles.td}>{d.Destino}</td>
                <td style={baseStyles.td}>{Number(d.Kilometro||0).toLocaleString("es-CL")}</td>
                <td style={baseStyles.td}>{d.Carga}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage}/>
      </div>
    </div>
  );
}

// ─── MAIN APP ───
const VIEWS = [
  { id:"buscar", label:"Buscador", icon:"🔍" },
  { id:"flota", label:"Estado Flota", icon:"📊" },
  { id:"inactivos", label:"Inactivos", icon:"⚠️" },
  { id:"clientes", label:"Por Cliente", icon:"🏢" },
  { id:"rutas", label:"Por Ruta", icon:"🛤️" },
  { id:"detalle", label:"Detalle", icon:"📋" },
];

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Conectando...");
  const [error, setError] = useState(null);
  const [view, setView] = useState("buscar");
  const [dataInfo, setDataInfo] = useState({});

  const today = useMemo(() => new Date(), []);

  // Build indexes
  const { tractoIndex, ramplaIndex } = useMemo(() => {
    const ti = new Map(), ri = new Map();
    for (const row of data) {
      if (row.Tracto) {
        if (!ti.has(row.Tracto)) ti.set(row.Tracto, []);
        ti.get(row.Tracto).push(row);
      }
      if (row.Rampla) {
        if (!ri.has(row.Rampla)) ri.set(row.Rampla, []);
        ri.get(row.Rampla).push(row);
      }
    }
    return { tractoIndex: ti, ramplaIndex: ri };
  }, [data]);

  // Load CSV
  useEffect(() => {
    setLoadingMsg("Descargando datos del servidor...");
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setLoadingMsg("Procesando e indexando...");
        setTimeout(() => {
          try {
            let rows = results.data;
            // Filter out "Viaje sin solicitud"
            rows = rows.filter(r => r.Cliente !== "-Viaje sin solicitud -");
            // Parse dates and sort descending
            rows = rows.map(r => ({ ...r, _date: parseDate(r.Fecha) })).filter(r => r._date);
            rows.sort((a, b) => b._date - a._date || (b.Expedicion||"").localeCompare(a.Expedicion||""));

            const fechas = rows.map(r => r._date).filter(Boolean);
            const minDate = fechas.length ? new Date(Math.min(...fechas)) : null;
            const maxDate = fechas.length ? new Date(Math.max(...fechas)) : null;

            setDataInfo({
              total: rows.length,
              minDate: minDate ? formatDate(minDate) : "-",
              maxDate: maxDate ? formatDate(maxDate) : "-",
              tractos: new Set(rows.map(r=>r.Tracto).filter(Boolean)).size,
              ramplas: new Set(rows.map(r=>r.Rampla).filter(Boolean)).size,
              clientes: new Set(rows.map(r=>r.Cliente).filter(Boolean)).size,
            });
            setData(rows);
            setLoading(false);
          } catch (e) {
            setError("Error procesando datos: " + e.message);
            setLoading(false);
          }
        }, 100);
      },
      error: (err) => {
        setError("Error descargando CSV: " + err.message);
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div style={{ ...baseStyles.app, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:"48px", height:"48px", border:`3px solid ${theme.border}`, borderTopColor:theme.accent, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }}/>
          <div style={{ fontSize:"16px", fontWeight:600, marginBottom:"8px" }}>Cargando Dashboard Operaciones</div>
          <div style={{ fontSize:"12px", color:theme.textMuted }}>{loadingMsg}</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...baseStyles.app, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
        <div style={{ ...baseStyles.card, maxWidth:"500px", textAlign:"center", borderColor:theme.danger }}>
          <div style={{ fontSize:"32px", marginBottom:"12px" }}>❌</div>
          <div style={{ fontSize:"14px", fontWeight:600, marginBottom:"8px" }}>Error de Carga</div>
          <div style={{ fontSize:"12px", color:theme.textMuted }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={baseStyles.app}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <header style={baseStyles.header}>
        <div style={baseStyles.logo}>
          <div style={baseStyles.logoIcon}>TB</div>
          <div>
            <div style={baseStyles.title}>Dashboard Operaciones</div>
            <div style={baseStyles.subtitle}>Transportes Bello</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
          <div style={{ textAlign:"right", fontSize:"11px", color:theme.textMuted, lineHeight:"1.5" }}>
            <div>{dataInfo.total?.toLocaleString("es-CL")} tramos • {dataInfo.tractos} tractos • {dataInfo.ramplas} ramplas</div>
            <div>{dataInfo.minDate} al {dataInfo.maxDate} • {dataInfo.clientes} clientes</div>
          </div>
        </div>
      </header>

      <div style={{ background:theme.surface, borderBottom:`1px solid ${theme.border}`, padding:"8px 24px", overflowX:"auto" }}>
        <nav style={baseStyles.nav}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={()=>setView(v.id)} style={baseStyles.navBtn(view===v.id)}>
              {v.icon} {v.label}
            </button>
          ))}
        </nav>
      </div>

      <main style={baseStyles.container}>
        {view === "buscar" && <BuscadorEquipos data={data} tractoIndex={tractoIndex} ramplaIndex={ramplaIndex} today={today}/>}
        {view === "flota" && <EstadoFlota data={data} tractoIndex={tractoIndex} ramplaIndex={ramplaIndex} today={today}/>}
        {view === "inactivos" && <EquiposInactivos tractoIndex={tractoIndex} ramplaIndex={ramplaIndex} today={today}/>}
        {view === "clientes" && <StatsCliente data={data} today={today}/>}
        {view === "rutas" && <StatsRuta data={data} today={today}/>}
        {view === "detalle" && <DetalleTramos data={data} today={today}/>}
      </main>
    </div>
  );
}
