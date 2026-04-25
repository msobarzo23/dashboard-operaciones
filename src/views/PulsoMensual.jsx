import { useMemo } from "react";
import { SIN_SOLICITUD, getSucursal, getMonthKey, monthKeyToLabel } from "../utils.js";
import { SucBadge } from "../components/ui.jsx";

export default function PulsoMensual({ data, today, T }) {
  const card = {background:T.sf,border:`1px solid ${T.bd}`,borderRadius:"12px",padding:"20px",marginBottom:"16px",boxShadow:T.cardShadow};
  const thStyle = {textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${T.bd}`,color:T.txM,fontWeight:600,textTransform:"uppercase",fontSize:"10px",letterSpacing:"1px",position:"sticky",top:0,background:T.sf};
  const td = {padding:"8px 12px",borderBottom:`1px solid ${T.bd}`,whiteSpace:"nowrap",color:T.tx,fontSize:"12px"};

  const anchors = useMemo(() => {
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    const cur = new Date(y, m, 1);
    const prev = new Date(y, m - 1, 1);
    const yoy = new Date(y - 1, m, 1);
    return {
      curMK: getMonthKey(cur),
      prevMK: getMonthKey(prev),
      yoyMK: getMonthKey(yoy),
      day: d,
      daysInMonth: new Date(y, m + 1, 0).getDate(),
    };
  }, [today]);

  const real = useMemo(() => data.filter(r => r.Cliente !== SIN_SOLICITUD && r._date), [data]);

  const buckets = useMemo(() => {
    const slice = (mk, dayCap) => real.filter(r => {
      if (getMonthKey(r._date) !== mk) return false;
      if (dayCap != null && r._date.getDate() > dayCap) return false;
      return true;
    });
    const d = anchors.day;
    return {
      curMTD: slice(anchors.curMK, d),
      prevMTD: slice(anchors.prevMK, d),
      prevFull: slice(anchors.prevMK),
      yoyMTD: slice(anchors.yoyMK, d),
      yoyFull: slice(anchors.yoyMK),
    };
  }, [real, anchors]);

  const calcStats = (rows) => {
    const km = rows.reduce((s, r) => s + (Number(r.Kilometro) || 0), 0);
    const tramos = rows.length;
    const solicitudes = new Set(rows.map(r => r.Solicitud).filter(Boolean)).size;
    const tractos = new Set(rows.map(r => r.Tracto).filter(Boolean)).size;
    const ramplas = new Set(rows.map(r => r.Rampla).filter(Boolean)).size;
    const clientes = new Set(rows.map(r => r.Cliente).filter(Boolean)).size;
    return { km, tramos, solicitudes, tractos, ramplas, clientes };
  };

  const stats = useMemo(() => ({
    curMTD: calcStats(buckets.curMTD),
    prevMTD: calcStats(buckets.prevMTD),
    prevFull: calcStats(buckets.prevFull),
    yoyMTD: calcStats(buckets.yoyMTD),
    yoyFull: calcStats(buckets.yoyFull),
  }), [buckets]);

  const delta = (a, b) => (b > 0 ? ((a - b) / b * 100) : null);

  const projection = useMemo(() => {
    const actualKM = stats.curMTD.km;
    const linearKM = anchors.day > 0 ? Math.round(actualKM * anchors.daysInMonth / anchors.day) : actualKM;
    let seasonalKM = null;
    if (stats.yoyMTD.km > 0 && stats.yoyFull.km > 0) {
      seasonalKM = Math.round(actualKM * (stats.yoyFull.km / stats.yoyMTD.km));
    }
    let sem = "🟡";
    const refPrev = stats.prevFull.km;
    const refYoy = stats.yoyFull.km;
    const baseline = refYoy > 0 ? Math.max(refPrev, refYoy) : refPrev;
    if (baseline > 0) {
      if (linearKM > baseline * 1.05) sem = "🟢";
      else if (linearKM < baseline * 0.95) sem = "🔴";
    }
    return { linearKM, seasonalKM, sem };
  }, [stats, anchors]);

  const series = useMemo(() => {
    const kmByMk = new Map();
    const hasMk = new Set();
    for (const r of real) {
      const mk = getMonthKey(r._date);
      if (!mk) continue;
      hasMk.add(mk);
      kmByMk.set(mk, (kmByMk.get(mk) || 0) + (Number(r.Kilometro) || 0));
    }
    const arr = [];
    for (let i = 12; i >= 0; i--) {
      const dt = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yoyDt = new Date(today.getFullYear() - 1, today.getMonth() - i, 1);
      const mk = getMonthKey(dt);
      const yoyMk = getMonthKey(yoyDt);
      arr.push({
        mk,
        label: monthKeyToLabel(mk),
        km: kmByMk.get(mk) || 0,
        kmYoy: hasMk.has(yoyMk) ? (kmByMk.get(yoyMk) || 0) : null,
      });
    }
    return arr;
  }, [real, today]);

  const movers = useMemo(() => {
    const groupBy = (rows, keyFn) => {
      const m = {};
      rows.forEach(r => {
        const k = keyFn(r);
        if (!k) return;
        if (!m[k]) m[k] = { km: 0, tramos: 0 };
        m[k].km += Number(r.Kilometro) || 0;
        m[k].tramos++;
      });
      return m;
    };
    const compute = (curMap, prevMap, yoyMap) => {
      const keys = new Set([...Object.keys(curMap), ...Object.keys(prevMap), ...Object.keys(yoyMap)]);
      const arr = [];
      for (const k of keys) {
        const c = curMap[k] || { km: 0, tramos: 0 };
        const p = prevMap[k] || { km: 0, tramos: 0 };
        const y = yoyMap[k] || { km: 0, tramos: 0 };
        arr.push({
          nombre: k,
          curKM: c.km, prevKM: p.km, yoyKM: y.km,
          curTramos: c.tramos, prevTramos: p.tramos, yoyTramos: y.tramos,
          dMoM: delta(c.km, p.km),
          dYoY: delta(c.km, y.km),
        });
      }
      return arr;
    };
    return {
      clientes: compute(
        groupBy(buckets.curMTD, r => r.Cliente),
        groupBy(buckets.prevMTD, r => r.Cliente),
        groupBy(buckets.yoyMTD, r => r.Cliente)
      ),
      sucursales: compute(
        groupBy(buckets.curMTD, r => getSucursal(r.Destino)),
        groupBy(buckets.prevMTD, r => getSucursal(r.Destino)),
        groupBy(buckets.yoyMTD, r => getSucursal(r.Destino))
      ),
    };
  }, [buckets]);

  const topMovers = useMemo(() => {
    const winners = movers.clientes
      .filter(m => m.dMoM != null && m.dMoM > 0 && m.curKM > 1000)
      .sort((a, b) => b.dMoM - a.dMoM).slice(0, 10);
    const losers = movers.clientes
      .filter(m => m.dMoM != null && m.dMoM < 0 && m.prevKM > 1000)
      .sort((a, b) => a.dMoM - b.dMoM).slice(0, 10);
    return { winners, losers };
  }, [movers]);

  const alerts = useMemo(() => {
    const out = [];
    movers.clientes.forEach(m => {
      if (m.prevKM > 2000 && m.dMoM != null && m.dMoM < -50 && m.dYoY != null && m.dYoY < -30) {
        out.push({ tipo: "riesgo", icon: "⚠️", text: `Cliente ${m.nombre}: ${m.dMoM.toFixed(0)}% MoM, ${m.dYoY.toFixed(0)}% YoY — posible riesgo de churn` });
      }
    });
    movers.sucursales.forEach(m => {
      if (m.prevKM > 2000 && m.dMoM != null && m.dMoM > 30) {
        out.push({ tipo: "alza", icon: "📈", text: `Sucursal ${m.nombre}: +${m.dMoM.toFixed(0)}% MoM — preparar capacidad de flota` });
      }
      if (m.prevKM > 2000 && m.dMoM != null && m.dMoM < -25 && m.dYoY != null && m.dYoY < -15) {
        out.push({ tipo: "riesgo", icon: "📉", text: `Sucursal ${m.nombre}: ${m.dMoM.toFixed(0)}% MoM, ${m.dYoY.toFixed(0)}% YoY — caída sostenida` });
      }
    });
    if (stats.prevMTD.tractos > 0) {
      const dT = delta(stats.curMTD.tractos, stats.prevMTD.tractos);
      if (dT != null && dT < -15) {
        out.push({ tipo: "riesgo", icon: "🚛", text: `Tractos activos: ${dT.toFixed(0)}% MoM (${stats.curMTD.tractos} vs ${stats.prevMTD.tractos}) — revisar disponibilidad` });
      }
    }
    const nuevos = movers.clientes.filter(m => m.prevKM === 0 && m.yoyKM === 0 && m.curKM > 1000);
    if (nuevos.length > 0) {
      const totalKm = nuevos.reduce((s, m) => s + m.curKM, 0);
      const muestra = nuevos.slice(0, 3).map(n => n.nombre).join(", ");
      out.push({ tipo: "alza", icon: "✨", text: `${nuevos.length} cliente(s) nuevo(s) este mes (${totalKm.toLocaleString("es-CL")} km): ${muestra}${nuevos.length > 3 ? "…" : ""}` });
    }
    return out;
  }, [movers, stats]);

  const kpis = [
    { key: "km", label: "KM Recorridos", icon: "🛣️" },
    { key: "tramos", label: "Tramos", icon: "📋" },
    { key: "solicitudes", label: "Solicitudes", icon: "📝" },
    { key: "tractos", label: "Tractos Activos", icon: "🚛" },
    { key: "ramplas", label: "Equipos Activos", icon: "🚃" },
    { key: "clientes", label: "Clientes Únicos", icon: "🏢" },
  ];
  const fmt = (v) => v.toLocaleString("es-CL");

  const DeltaBadge = ({ val }) => {
    if (val === null || val === undefined || !isFinite(val)) return <span style={{color:T.txM,fontSize:"11px"}}>—</span>;
    const pos = val >= 0;
    const color = pos ? T.grn : T.red;
    return (
      <span style={{display:"inline-flex",alignItems:"center",gap:"2px",padding:"2px 8px",borderRadius:"20px",fontSize:"11px",fontWeight:700,background:`${color}18`,color,border:`1px solid ${color}44`}}>
        {pos ? "▲" : "▼"} {Math.abs(val).toFixed(1)}%
      </span>
    );
  };

  const seriesMaxKM = Math.max(...series.map(s => Math.max(s.km, s.kmYoy || 0)), 1);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"8px"}}>
        <h2 style={{margin:0,fontSize:"16px",color:T.tx}}>📈 Pulso Mensual</h2>
        <div style={{fontSize:"11px",color:T.txM}}>
          <strong style={{color:T.ac}}>{monthKeyToLabel(anchors.curMK)}</strong> · día {anchors.day}/{anchors.daysInMonth} · vs <strong>{monthKeyToLabel(anchors.prevMK)}</strong> · vs <strong>{monthKeyToLabel(anchors.yoyMK)}</strong>
        </div>
      </div>

      <div style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:"10px",padding:"8px 16px",marginBottom:"14px",fontSize:"11px",color:T.txM,display:"flex",alignItems:"center",gap:"8px"}}>
        <span style={{fontSize:"14px"}}>💡</span>
        <span>Comparaciones <strong>a misma fecha del mes</strong> (día {anchors.day}). Excluye viajes sin solicitud.</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"12px",marginBottom:"16px"}}>
        {kpis.map(k => {
          const cur = stats.curMTD[k.key];
          const prev = stats.prevMTD[k.key];
          const yoy = stats.yoyMTD[k.key];
          return (
            <div key={k.key} style={{...card, marginBottom:0, padding:"16px"}}>
              <div style={{fontSize:"10px",color:T.txM,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.8px"}}>{k.icon} {k.label}</div>
              <div style={{fontSize:"22px",fontWeight:700,color:T.tx,lineHeight:1.2,marginBottom:"10px"}}>{fmt(cur)}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"10px",color:T.txM,marginBottom:"2px"}}>
                <span>vs mes anterior</span>
                <DeltaBadge val={delta(cur, prev)}/>
              </div>
              <div style={{fontSize:"10px",color:T.txS,marginBottom:"6px"}}>{fmt(prev)} → {fmt(cur)}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"10px",color:T.txM,marginBottom:"2px"}}>
                <span>vs año pasado</span>
                <DeltaBadge val={delta(cur, yoy)}/>
              </div>
              <div style={{fontSize:"10px",color:T.txS}}>{yoy > 0 ? fmt(yoy) : "—"} → {fmt(cur)}</div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
          <div style={{fontSize:"14px",fontWeight:600,color:T.tx}}>🎯 Proyección de cierre — {monthKeyToLabel(anchors.curMK)}</div>
          <div style={{fontSize:"24px"}} title="🟢 sobre demanda · 🟡 plano · 🔴 baja">{projection.sem}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"16px"}}>
          <div>
            <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:"4px"}}>KM A LA FECHA</div>
            <div style={{fontSize:"20px",fontWeight:700,color:T.tx}}>{fmt(stats.curMTD.km)}</div>
            <div style={{fontSize:"10px",color:T.txS}}>día {anchors.day} de {anchors.daysInMonth}</div>
          </div>
          <div>
            <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:"4px"}}>PROYECCIÓN LINEAL</div>
            <div style={{fontSize:"20px",fontWeight:700,color:T.blu}}>{fmt(projection.linearKM)}</div>
            <div style={{fontSize:"10px",color:T.txS}}>extrapola ritmo actual</div>
          </div>
          <div>
            <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:"4px"}}>PROYECCIÓN ESTACIONAL</div>
            <div style={{fontSize:"20px",fontWeight:700,color:T.ac}}>{projection.seasonalKM != null ? fmt(projection.seasonalKM) : "—"}</div>
            <div style={{fontSize:"10px",color:T.txS}}>ajustada al patrón YoY</div>
          </div>
          <div>
            <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:"4px"}}>MES ANTERIOR</div>
            <div style={{fontSize:"20px",fontWeight:700,color:T.txM}}>{fmt(stats.prevFull.km)}</div>
            <div style={{fontSize:"10px",color:T.txS}}>{monthKeyToLabel(anchors.prevMK)}</div>
          </div>
          <div>
            <div style={{fontSize:"10px",color:T.txM,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:"4px"}}>YoY (AÑO PASADO)</div>
            <div style={{fontSize:"20px",fontWeight:700,color:T.txM}}>{stats.yoyFull.km > 0 ? fmt(stats.yoyFull.km) : "—"}</div>
            <div style={{fontSize:"10px",color:T.txS}}>{monthKeyToLabel(anchors.yoyMK)}</div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div style={card}>
          <div style={{fontSize:"14px",fontWeight:600,color:T.tx,marginBottom:"12px"}}>🚨 Alertas accionables ({alerts.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {alerts.map((a, i) => {
              const color = a.tipo === "riesgo" ? T.red : T.grn;
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",background:`${color}12`,border:`1px solid ${color}44`,borderRadius:"8px",fontSize:"12px",color:T.tx}}>
                  <span style={{fontSize:"16px"}}>{a.icon}</span>
                  <span>{a.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={card}>
        <div style={{fontSize:"14px",fontWeight:600,color:T.tx,marginBottom:"12px"}}>📊 Tendencia · últimos 13 meses (KM)</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:"6px",height:"150px",overflowX:"auto",paddingBottom:"4px"}}>
          {series.map(s => {
            const pH = (s.km / seriesMaxKM) * 100;
            const yH = s.kmYoy != null ? (s.kmYoy / seriesMaxKM) * 100 : 0;
            const isCur = s.mk === anchors.curMK;
            return (
              <div key={s.mk} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:"50px",flex:1}}>
                <div style={{position:"relative",height:"120px",width:"100%",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
                  <div title={`${s.label}: ${fmt(s.km)} km${s.kmYoy != null ? ` · año pasado: ${fmt(s.kmYoy)} km` : ""}`} style={{position:"absolute",bottom:0,left:"15%",right:"15%",height:pH+"%",background:isCur?T.ac:T.blu,borderRadius:"3px 3px 0 0",opacity:isCur?1:0.85,transition:"height 0.3s"}}/>
                  {s.kmYoy != null && s.kmYoy > 0 && (
                    <div title={`Año pasado: ${fmt(s.kmYoy)} km`} style={{position:"absolute",bottom:`calc(${yH}% - 1px)`,left:0,right:0,borderTop:`2px dashed ${T.txM}`,opacity:0.7}}/>
                  )}
                </div>
                <div style={{fontSize:"9px",color:isCur?T.ac:T.txM,marginTop:"4px",fontWeight:isCur?700:400,whiteSpace:"nowrap"}}>{s.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:"16px",marginTop:"10px",fontSize:"10px",color:T.txM,justifyContent:"center",flexWrap:"wrap"}}>
          <span><span style={{display:"inline-block",width:"10px",height:"10px",background:T.blu,borderRadius:"2px",marginRight:"4px",verticalAlign:"middle"}}/>KM por mes</span>
          <span><span style={{display:"inline-block",width:"10px",height:"10px",background:T.ac,borderRadius:"2px",marginRight:"4px",verticalAlign:"middle"}}/>Mes en curso</span>
          <span><span style={{display:"inline-block",width:"14px",height:"0",borderTop:`2px dashed ${T.txM}`,marginRight:"4px",verticalAlign:"middle"}}/>Mismo mes año anterior</span>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:"12px"}}>
        <div style={card}>
          <div style={{fontSize:"14px",fontWeight:600,color:T.grn,marginBottom:"12px"}}>📈 Top clientes en alza (MoM)</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
            <thead><tr>
              <th style={thStyle}>Cliente</th>
              <th style={{...thStyle,textAlign:"right"}}>KM mes</th>
              <th style={{...thStyle,textAlign:"right"}}>Δ MoM</th>
              <th style={{...thStyle,textAlign:"right"}}>Δ YoY</th>
            </tr></thead>
            <tbody>
              {topMovers.winners.length === 0 ? (
                <tr><td colSpan={4} style={{...td,color:T.txM,textAlign:"center",fontStyle:"italic"}}>Sin datos suficientes</td></tr>
              ) : topMovers.winners.map(m => (
                <tr key={m.nombre}>
                  <td style={{...td,maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis"}}>{m.nombre}</td>
                  <td style={{...td,textAlign:"right"}}>{fmt(m.curKM)}</td>
                  <td style={{...td,textAlign:"right"}}><DeltaBadge val={m.dMoM}/></td>
                  <td style={{...td,textAlign:"right"}}><DeltaBadge val={m.dYoY}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={card}>
          <div style={{fontSize:"14px",fontWeight:600,color:T.red,marginBottom:"12px"}}>📉 Top clientes en baja (MoM)</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
            <thead><tr>
              <th style={thStyle}>Cliente</th>
              <th style={{...thStyle,textAlign:"right"}}>KM mes</th>
              <th style={{...thStyle,textAlign:"right"}}>Δ MoM</th>
              <th style={{...thStyle,textAlign:"right"}}>Δ YoY</th>
            </tr></thead>
            <tbody>
              {topMovers.losers.length === 0 ? (
                <tr><td colSpan={4} style={{...td,color:T.txM,textAlign:"center",fontStyle:"italic"}}>Sin datos suficientes</td></tr>
              ) : topMovers.losers.map(m => (
                <tr key={m.nombre}>
                  <td style={{...td,maxWidth:"180px",overflow:"hidden",textOverflow:"ellipsis"}}>{m.nombre}</td>
                  <td style={{...td,textAlign:"right"}}>{fmt(m.curKM)}</td>
                  <td style={{...td,textAlign:"right"}}><DeltaBadge val={m.dMoM}/></td>
                  <td style={{...td,textAlign:"right"}}><DeltaBadge val={m.dYoY}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{...card, marginTop:"12px"}}>
        <div style={{fontSize:"14px",fontWeight:600,color:T.tx,marginBottom:"12px"}}>🗺️ Sucursales · variación a misma fecha</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
            <thead><tr>
              <th style={thStyle}>Sucursal</th>
              <th style={{...thStyle,textAlign:"right"}}>KM (mes)</th>
              <th style={{...thStyle,textAlign:"right"}}>KM (mes ant.)</th>
              <th style={{...thStyle,textAlign:"right"}}>Δ MoM</th>
              <th style={{...thStyle,textAlign:"right"}}>KM (año pas.)</th>
              <th style={{...thStyle,textAlign:"right"}}>Δ YoY</th>
            </tr></thead>
            <tbody>
              {[...movers.sucursales].sort((a, b) => b.curKM - a.curKM).map(m => (
                <tr key={m.nombre}>
                  <td style={td}><SucBadge s={m.nombre} T={T}/></td>
                  <td style={{...td,textAlign:"right"}}>{fmt(m.curKM)}</td>
                  <td style={{...td,textAlign:"right",color:T.txM}}>{fmt(m.prevKM)}</td>
                  <td style={{...td,textAlign:"right"}}><DeltaBadge val={m.dMoM}/></td>
                  <td style={{...td,textAlign:"right",color:T.txM}}>{fmt(m.yoyKM)}</td>
                  <td style={{...td,textAlign:"right"}}><DeltaBadge val={m.dYoY}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
