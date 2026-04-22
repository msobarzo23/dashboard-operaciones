import { useState, useMemo, useCallback } from "react";
import { formatDateTime } from "../utils.js";

export function useSortable(data, defaultKey, defaultDir = "asc") {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);
  const toggle = useCallback((key) => {
    setSortKey(prev => {
      setSortDir(d => prev === key ? (d === "asc" ? "desc" : "asc") : "asc");
      return key;
    });
  }, []);
  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (av == null) av = sortDir === "asc" ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === "asc" ? Infinity : -Infinity;
      if (typeof av === "string" && typeof bv === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, sortKey, sortDir]);
  return { sorted, sortKey, sortDir, toggle };
}

export function SortTh({ label, col, sortKey, sortDir, toggle, style }) {
  const active = sortKey === col;
  return (
    <th onClick={() => toggle(col)} style={{ ...style, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {label}
      <span style={{ marginLeft: 4, opacity: active ? 1 : 0.3, fontSize: "10px" }}>
        {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </th>
  );
}

export function StatCard({ value, label, icon, color, T }) {
  return (
    <div style={{ background: T.sf, border: `1px solid ${T.bd}`, borderRadius: "12px", padding: "20px", textAlign: "center", flex: "1", minWidth: "150px", boxShadow: T.cardShadow }}>
      <div style={{ fontSize: "12px", marginBottom: "6px" }}>{icon}</div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: color || T.ac, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: "10px", color: T.txM, marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
    </div>
  );
}

export function SucBadge({ s, T }) {
  const c = T.sucColors[s] || T.sucColors["OTROS"];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.accent}44` }}>{s}</span>;
}

export function Pager({ page, total, set, T }) {
  if (total <= 1) return null;
  const sel = { background: T.sf2, border: `1px solid ${T.bd}`, borderRadius: "8px", padding: "8px 12px", color: T.tx, fontSize: "12px", fontFamily: "inherit", outline: "none", cursor: "pointer" };
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center", marginTop: "12px" }}>
      <button onClick={() => set(Math.max(1, page - 1))} disabled={page === 1} style={{ ...sel, opacity: page === 1 ? .3 : 1 }}>Ant</button>
      <span style={{ fontSize: "12px", color: T.txM }}>{page}/{total}</span>
      <button onClick={() => set(Math.min(total, page + 1))} disabled={page === total} style={{ ...sel, opacity: page === total ? .3 : 1 }}>Sig</button>
    </div>
  );
}

export function ThemeToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle} title={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 13px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, background: dark ? "#252a36" : "#e2e8f0", color: dark ? "#e0e4ec" : "#475569", transition: "all 0.2s", whiteSpace: "nowrap", boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.08)" }}>
      <span style={{ fontSize: "15px" }}>{dark ? "☀️" : "🌙"}</span>
    </button>
  );
}

export function RefreshButton({ onRefresh, loading, lastLoad, T }) {
  const segundos = lastLoad ? Math.floor((Date.now() - lastLoad) / 1000) : 0;
  const minutos = Math.floor(segundos / 60);
  const ago = segundos < 60 ? "hace " + segundos + "s" : minutos < 60 ? "hace " + minutos + "m" : "hace " + Math.floor(minutos / 60) + "h " + (minutos % 60) + "m";
  const isOld = minutos >= 5;
  return (
    <button onClick={onRefresh} disabled={loading} title={lastLoad ? "Última carga: " + formatDateTime(new Date(lastLoad)) : "Recargar datos"} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 13px", borderRadius: "20px", border: `1px solid ${isOld ? T.ac + "88" : T.bd}`, cursor: loading ? "wait" : "pointer", fontSize: "11px", fontWeight: 600, background: isOld ? T.acD : (T.isDark ? "#1a1e28" : "#f8fafc"), color: isOld ? T.ac : T.tx, fontFamily: "inherit", transition: "all 0.2s", whiteSpace: "nowrap", opacity: loading ? .5 : 1 }}>
      <span style={{ fontSize: "13px", animation: loading ? "spin 1s linear infinite" : "none", display: "inline-block" }}>🔄</span>
      <span>{lastLoad ? ago : "Cargar"}</span>
    </button>
  );
}
