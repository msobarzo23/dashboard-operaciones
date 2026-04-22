// ── Constantes CSV ──
export const CSV_VIAJES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=0&single=true&output=csv";
export const CSV_FLOTA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=923646374&single=true&output=csv";
export const CSV_ULTIMOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQoXDMe1856GFyKLBBXGcgeUnkqttWGvFXbbeKDwGWoNDuBd0Tn9VJLDfRSezlD8zHi8Q_E6RlciYlT/pub?gid=1827964132&single=true&output=csv";

export const SIN_SOLICITUD = "-Viaje sin solicitud -";

// ── Detección de viajes vacíos/remonta/retorno ──
export function isVacioTrip(row) {
  if (!row) return false;
  if (row.Cliente === SIN_SOLICITUD) return true;
  if (!row.Cliente || row.Cliente.trim() === "") return true;
  const carga = (row.Carga || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (carga === "VACIO" || carga.startsWith("VACIO ") || carga.startsWith("VACIO(")) return true;
  return false;
}

// ── Sucursales ──
export const SUCURSAL_MAP = {
  "POZO ALMONTE": ["POZO ALMONTE","IQUIQUE","ALTO HOSPICIO","COLLAHUASI","QUEBRADA BLANCA","PICA","ARICA","PUERTO PATACHE","PUERTO IQUIQUE","NUDO URIBE","TALABRE"],
  "MEJILLONES": ["MEJILLONES"],
  "ANTOFAGASTA": ["LA NEGRA","ANTOFAGASTA","CALAMA","MINERA ESCONDIDA","MINERA ESCONDIDA LAGUNA SECA","MINERA ESCONDIDA LOS COLORADOS","MINERA ESCONDIDA OGP1","MINERA ESCONDIDA PUERTO COLOSO","SPENCE","EL ABRA","CENTINELA","SIERRA GORDA","LOMAS BAYAS","MANTOS BLANCOS","MANTOS DE LA LUNA","RADOMIRO TOMIC","MINISTRO HALES","EL TESORO","MINERA ESPERANZA","MINERA ENCUENTRO","MINERA FRANKE","MINERA MICHILLA","MINA GABY","ANTUCOYA","MINERA ANTUCOYA","CERRO DOMINADOR","PUERTO ANGAMOS","AGUA DE MAR","LA PORTADA","MARIA ELENA","PEDRO DE VALDIVIA","EL TOCO","RIO LOA","TOCOPILLA","PAMPA BLANCA","SALAR DE ATACAMA","SALAR DEL CARMEN","ELENITA","NUEVA VICTORIA","AGUAS VERDES","DOMEYKO","EL PEÑON","ZALDIVAR","MINA OESTE","BARRIAL SECO","CERRO NEGRO","COYASUR","EL SALVADOR","EHM"],
  "COPIAPO": ["COPIAPO","PAIPOTE","VALLENAR","CANDELARIA","MINA LA COIPA","MANTOS VERDES","MINERA ARQUEROS","OJOS DEL SALADO","PUNTA DE COBRE","PUCOBRE","FENIX GOLD","SALARES NORTE","MINERA GUANACO","GARITA CARRIZALILLO","PORTEZUELO","MINA TERRAEX PAIPOTE","MINERA PLEITO","ATACAMA KOZAN","MANTOVERDE","MAITENCILLO","MINERA EL CRISTO","LAS BARRANCAS","CASERONES"],
  "COQUIMBO": ["COQUIMBO","PUNTA TEATINOS","SALADILLO","LOS COLORADOS","LA SERENA","OVALLE","ANDACOLLO","ROMERAL","MINERA LOS PELAMBRES","SALAMANCA"],
  "SANTIAGO": ["SANTIAGO","QUILICURA","LAMPA","BUIN","RANCAGUA","SAN ANTONIO","SAN BERNARDO","PEÑAFLOR","PADRE HURTADO","PELDEHUE","ESTACION CENTRAL","AEROPUERTO SANTIAGO","AEROPUERTO ANTOFAGASTA","LOS ANDES","SAN FELIPE","VIÑA DEL MAR","VALPARAISO","CASABLANCA","LIMACHE","RENGO","REQUINOA","TALAGANTE","COLINA","PROVIDENCIA","FLORIDA","NOGALES","QUILLOTA","LOS BRONCES","ANDINA","EL TENIENTE","EL TENIENTE (RAJO SUR)","EL SOLDADO","MINERA VALLE CENTRAL","ALHUE","MINA EL ESPINO","SAN JAVIER","SANTA FE"]
};

export const SUCURSAL_COLORS_DARK = {
  "POZO ALMONTE":{bg:"#1a2744",text:"#5b9cf5",accent:"#3b7de0"},
  "MEJILLONES":{bg:"#1a2a3a",text:"#4ecdc4",accent:"#36a89e"},
  "ANTOFAGASTA":{bg:"#2a1f0e",text:"#f5a623",accent:"#d4891a"},
  "COPIAPO":{bg:"#1a2a1a",text:"#6fcf6f",accent:"#4a9f4a"},
  "COQUIMBO":{bg:"#2a1a2a",text:"#cf6fcf",accent:"#9f4a9f"},
  "SANTIAGO":{bg:"#1f1a2a",text:"#8b9cf5",accent:"#6b7ce0"},
  "OTROS":{bg:"#1a1a1a",text:"#999",accent:"#666"}
};
export const SUCURSAL_COLORS_LIGHT = {
  "POZO ALMONTE":{bg:"#dbeafe",text:"#1d4ed8",accent:"#3b82f6"},
  "MEJILLONES":{bg:"#ccfbf1",text:"#0f766e",accent:"#14b8a6"},
  "ANTOFAGASTA":{bg:"#fef3c7",text:"#b45309",accent:"#f59e0b"},
  "COPIAPO":{bg:"#dcfce7",text:"#15803d",accent:"#22c55e"},
  "COQUIMBO":{bg:"#fae8ff",text:"#7e22ce",accent:"#a855f7"},
  "SANTIAGO":{bg:"#ede9fe",text:"#5b21b6",accent:"#8b5cf6"},
  "OTROS":{bg:"#f1f5f9",text:"#64748b",accent:"#94a3b8"}
};

const _sucCache = new Map();
export function getSucursal(loc) {
  if (!loc) return "OTROS";
  const l = loc.toUpperCase().trim();
  const hit = _sucCache.get(l);
  if (hit !== undefined) return hit;
  for (const [s, ls] of Object.entries(SUCURSAL_MAP)) {
    if (ls.includes(l)) { _sucCache.set(l, s); return s; }
  }
  _sucCache.set(l, "OTROS");
  return "OTROS";
}

export const EQUIPO_KEYWORDS = ["RAMPLA","ESTANQUE","FURGON","EXTENSIBLE","CAMA BAJA","MODULAR","MEGALIFT","DOLLY","EQUIPOS ESPECIALES"];
export function getCategoria(tipo) {
  if (!tipo) return "OTRO";
  const t = tipo.toUpperCase().trim();
  if (t.includes("TRACTOCAMION")) return "TRACTOCAMION";
  if (EQUIPO_KEYWORDS.some(k => t.includes(k))) return "EQUIPO";
  return "OTRO";
}

export function cleanPatente(p) { if (!p) return ""; const s = String(p).trim().toUpperCase(); const i = s.lastIndexOf("-"); return i > 0 ? s.substring(0, i) : s; }
export function parseDate(str) { if (!str) return null; if (str instanceof Date) return str; const [d, m, y] = String(str).split("/"); if (!d || !m || !y) return null; return new Date(+y, +m - 1, +d); }
export function formatDate(d) { if (!d) return "-"; return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
export function formatDateTime(d) { if (!d) return "-"; return formatDate(d) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0"); }
export function daysBetween(d1, d2) { return Math.floor((d2 - d1) / 86400000); }
export function dayKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
export function getMonthKey(d) { if (!d) return null; return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
export function monthKeyToLabel(mk) {
  if (!mk) return "";
  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const [y, m] = mk.split("-");
  return MESES[parseInt(m) - 1] + " " + y;
}

export function dedupeFisico(rows) {
  const seen = new Map();
  for (const r of rows) {
    const key = [r.Expedicion || "", r.Fecha || "", r.Tracto || "", r.Rampla || "", r.Origen || "", r.Destino || "", r.Kilometro || ""].join("|");
    if (!seen.has(key)) {
      seen.set(key, { ...r, _multiCliente: false, _clientesAdicionales: [] });
    } else {
      const existing = seen.get(key);
      existing._multiCliente = true;
      existing._clientesAdicionales.push({ Cliente: r.Cliente, Solicitud: r.Solicitud, Carga: r.Carga, Guia: r.Guia });
    }
  }
  return [...seen.values()];
}

export function getEstadoEquipo(daysInactive) {
  if (daysInactive === null || daysInactive === undefined) return "SIN VIAJES";
  if (daysInactive <= 30) return "ACTIVO";
  if (daysInactive <= 90) return "INACTIVO";
  return "PARADO";
}

export const ESTADO_COLOR = (estado, T) => ({
  "ACTIVO": T.grn, "INACTIVO": T.ac, "PARADO": T.red, "SIN VIAJES": T.txM,
}[estado] || T.txM);

export function makeTheme(dark) {
  if (dark) return {
    bg:"#0a0c10", sf:"#12151c", sf2:"#1a1e28", bd:"#252a36",
    tx:"#e0e4ec", txM:"#6b7280", txS:"#9ca3af",
    ac:"#f59e0b", acD:"rgba(245,158,11,0.12)",
    red:"#ef4444", grn:"#22c55e", blu:"#3b82f6",
    cardShadow:"0 1px 3px rgba(0,0,0,0.4)",
    headerShadow:"0 1px 0 #252a36",
    inputBg:"#1a1e28", inputBd:"#252a36",
    navBg:"#1a1e28", navActiveBg:"#f59e0b", navActiveText:"#000",
    sucColors: SUCURSAL_COLORS_DARK,
    isDark: true,
  };
  return {
    bg:"#f0f4f8", sf:"#ffffff", sf2:"#f8fafc", bd:"#e2e8f0",
    tx:"#0f172a", txM:"#64748b", txS:"#94a3b8",
    ac:"#d97706", acD:"rgba(217,119,6,0.10)",
    red:"#dc2626", grn:"#16a34a", blu:"#2563eb",
    cardShadow:"0 1px 4px rgba(0,0,0,0.08)",
    headerShadow:"0 1px 0 #e2e8f0",
    inputBg:"#f8fafc", inputBd:"#cbd5e1",
    navBg:"#f1f5f9", navActiveBg:"#d97706", navActiveText:"#ffffff",
    sucColors: SUCURSAL_COLORS_LIGHT,
    isDark: false,
  };
}
