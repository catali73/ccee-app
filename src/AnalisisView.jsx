import { useState, useEffect, useMemo } from "react";
import { apiFetch, Card, BtnP, BtnO, Badge, SecTitle, CAMERA_CATALOG, TIPOS_SERVICIO } from "./App.jsx";

/* ── helpers ── */
const fmt = d => d ? new Date(d).toLocaleDateString('es-ES') : '—';

// Orden de cámaras (mismo que CAMERA_CATALOG)
const CAMERA_ORDER = Object.keys(CAMERA_CATALOG);

/* ── Camera blocks: agrupación de posiciones L/R en bloques ── */
const CAM_BLOCKS = [
  { id: 'steady',   label: 'Steadycam', icon: '🎬', cams: ['STEADY_L','STEADY_R','STEADY_PERSO'] },
  { id: 'rf',       label: 'RF',        icon: '📡', cams: ['RF_L','RF_R','RF_PERSO'] },
  { id: 'cinema',   label: 'Cinema',    icon: '🎞', cams: ['KIT_CINEMA_L','KIT_CINEMA_R'] },
  { id: 'polecam',  label: 'Polecam',   icon: '🎯', cams: ['POLECAM_L','POLECAM_R'] },
  { id: 'minicam',  label: 'Minicám.',  icon: '🔭', cams: ['MINICAM_L','MINICAM_R'] },
  { id: 'ptz',      label: 'PTZ',       icon: '📹', cams: ['PTZ_1','PTZ_2'] },
  { id: 'OBVAN_CCEE',  label: 'OBVAN CCEE',  icon: '🚐', cams: ['OBVAN_CCEE'] },
  { id: 'CAMARA_UHS',  label: 'Cámara UHS',  icon: '📷', cams: ['CAMARA_UHS'] },
  { id: 'SKYCAM_4',    label: '4SkyCam',     icon: '🚁', cams: ['SKYCAM_4'] },
  { id: 'AR_SKYCAM',   label: 'AR Skycam',   icon: '🔮', cams: ['AR_SKYCAM'] },
  { id: 'DRONE',       label: 'Drone',       icon: '🛸', cams: ['DRONE'] },
  { id: 'BODYCAM',     label: 'Bodycam',     icon: '👕', cams: ['BODYCAM'] },
  { id: 'OTROS',       label: 'Otros',       icon: '🔧', cams: ['OTROS'] },
];
const CAM_TO_BLOCK = {};
CAM_BLOCKS.forEach(b => b.cams.forEach(c => { CAM_TO_BLOCK[c] = b; }));

/* ── Stacked bar chart: partidos clasificados por tipo de incidencia ── */
function PartidosChart({ data }) {
  if (!data.length) return null;
  const W = 560, H = 180, PAD = { t: 16, r: 16, b: 36, l: 36 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const barW = Math.min(36, (chartW / data.length) - 6);
  const gap = chartW / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD.t + chartH - t * chartH;
        return <g key={t}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e4e4e7" strokeWidth={1} />
          <text x={PAD.l - 4} y={y + 4} fontSize={9} fill="#999" textAnchor="end">{Math.round(t * maxVal)}</text>
        </g>;
      })}
      {data.map((d, i) => {
        const x = PAD.l + i * gap + (gap - barW) / 2;
        const gH = chartH * d.conGraves / maxVal;
        const lH = chartH * d.soloLeves / maxVal;
        const sH = chartH * d.sinInc / maxVal;
        return (
          <g key={d.jornada}>
            <rect x={x} y={PAD.t + chartH - gH - lH - sH} width={barW} height={sH} fill="#16a34a" rx={2} />
            <rect x={x} y={PAD.t + chartH - gH - lH} width={barW} height={lH} fill="#f59e0b" rx={2} />
            <rect x={x} y={PAD.t + chartH - gH} width={barW} height={gH} fill="#dc2626" rx={2} />
            <text x={x + barW / 2} y={H - 6} fontSize={9} fill="#555" textAnchor="middle">J{d.jornada}</text>
          </g>
        );
      })}
      <rect x={PAD.l} y={H - 34} width={10} height={8} fill="#dc2626" rx={2} />
      <text x={PAD.l + 13} y={H - 27} fontSize={9} fill="#555">Graves</text>
      <rect x={PAD.l + 55} y={H - 34} width={10} height={8} fill="#f59e0b" rx={2} />
      <text x={PAD.l + 68} y={H - 27} fontSize={9} fill="#555">Solo leves</text>
      <rect x={PAD.l + 118} y={H - 34} width={10} height={8} fill="#16a34a" rx={2} />
      <text x={PAD.l + 131} y={H - 27} fontSize={9} fill="#555">Sin inc.</text>
    </svg>
  );
}

/* ── HBarChart SVG: barras horizontales ── */
function HBarChart({ title, data, colorKey = '#3b82f6' }) {
  if (!data.length) return null;
  const W = 280, barH = 16, gap = 6, PAD = { r: 56, l: 100 };
  const maxVal = Math.max(...data.map(d => d.val), 1);
  const chartW = W - PAD.l - PAD.r;
  const H = data.length * (barH + gap);
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#71717a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
        {data.map((d, i) => {
          const y = i * (barH + gap);
          const bW = Math.max(2, chartW * d.val / maxVal);
          const short = d.label.length > 13 ? d.label.slice(0, 12) + '…' : d.label;
          return (
            <g key={d.label}>
              <text x={PAD.l - 4} y={y + barH - 4} fontSize={9} fill="#555" textAnchor="end">{short}</text>
              <rect x={PAD.l} y={y} width={bW} height={barH} fill={colorKey} rx={2} opacity={0.85} />
              <text x={PAD.l + bW + 4} y={y + barH - 4} fontSize={9} fill="#555">{d.val}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Estilos de selects reutilizables ── */
const SEL = { width: '100%', height: 32, borderRadius: 6, border: '1px solid #d4d4d8', fontSize: 12, paddingLeft: 8, background: '#fff', color: '#18181b' };
const LBL = { fontSize: 10, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };

const TIPO_LABELS = {};
TIPOS_SERVICIO.forEach(t => { TIPO_LABELS[t.id] = `${t.icon} ${t.label}`; });

/* ── Main AnalisisView ── */
export default function AnalisisView() {
  const [informes, setInformes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [fTipo, setFTipo] = useState('');
  const [fJornada, setFJornada] = useState('');
  const [fUM, setFUM] = useState('');
  const [fBloque, setFBloque] = useState('');
  const [fModelo, setFModelo] = useState('');
  const [fTipoInc, setFTipoInc] = useState('');

  useEffect(() => {
    apiFetch('/api/analisis')
      .then(r => r.json())
      .then(d => { setInformes(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Opciones únicas de filtros
  const jornadas = useMemo(() => [...new Set(informes.map(i => i.jornada).filter(Boolean))].sort((a, b) => a - b), [informes]);
  const ums = useMemo(() => [...new Set(informes.map(i => i.um).filter(Boolean))].sort(), [informes]);
  const tiposActivos = useMemo(() => [...new Set(informes.map(i => i.tipo_servicio).filter(Boolean))].sort(), [informes]);

  // Bloques activos
  const bloquesActivos = useMemo(() => {
    const activeSet = new Set();
    informes.forEach(inf => {
      Object.entries(inf.camaras_activas || {}).forEach(([k, v]) => {
        if (v) { const b = CAM_TO_BLOCK[k]; if (b) activeSet.add(b.id); }
      });
    });
    return CAM_BLOCKS.filter(b => activeSet.has(b.id));
  }, [informes]);

  // Informes filtrados
  const filtered = useMemo(() => {
    return informes.filter(inf => {
      if (fTipo && inf.tipo_servicio !== fTipo) return false;
      if (fJornada && String(inf.jornada) !== fJornada) return false;
      if (fUM && inf.um !== fUM) return false;
      if (fBloque) {
        const block = CAM_BLOCKS.find(b => b.id === fBloque);
        if (!block) return false;
        const activas = inf.camaras_activas || {};
        if (!block.cams.some(c => activas[c])) return false;
      }
      if (fModelo) {
        const camModels = inf.cam_models || {};
        const hasModel = Object.values(camModels).some(m => Object.values(m).includes(fModelo));
        if (!hasModel) return false;
      }
      if (fTipoInc === 'G' && !(inf.incidencias_graves > 0)) return false;
      if (fTipoInc === 'L' && !(inf.incidencias_leves > 0 && inf.incidencias_graves === 0)) return false;
      if (fTipoInc === 'sin' && (inf.incidencias_graves > 0 || inf.incidencias_leves > 0)) return false;
      return true;
    });
  }, [informes, fTipo, fJornada, fUM, fBloque, fModelo, fTipoInc]);

  // Modelos disponibles (calculados sobre informes filtrados por todo salvo fModelo)
  const modelosDisponibles = useMemo(() => {
    const base = informes.filter(inf => {
      if (fTipo && inf.tipo_servicio !== fTipo) return false;
      if (fJornada && String(inf.jornada) !== fJornada) return false;
      if (fUM && inf.um !== fUM) return false;
      if (fBloque) {
        const block = CAM_BLOCKS.find(b => b.id === fBloque);
        if (!block) return false;
        const activas = inf.camaras_activas || {};
        if (!block.cams.some(c => activas[c])) return false;
      }
      return true;
    });
    const set = new Set();
    base.forEach(inf => {
      Object.values(inf.cam_models || {}).forEach(m => Object.values(m).filter(Boolean).forEach(v => set.add(v)));
    });
    return [...set].sort();
  }, [informes, fTipo, fJornada, fUM, fBloque]);

  // Stats totales
  const totalG = filtered.reduce((s, i) => s + (i.incidencias_graves || 0), 0);
  const totalL = filtered.reduce((s, i) => s + (i.incidencias_leves || 0), 0);
  const conGraves = filtered.filter(i => i.incidencias_graves > 0).length;
  const soloLeves = filtered.filter(i => i.incidencias_graves === 0 && i.incidencias_leves > 0).length;
  const sinInc    = filtered.filter(i => i.incidencias_graves === 0 && i.incidencias_leves === 0).length;

  // Gráfica de partidos: clasificados por tipo de incidencia por jornada
  const chartPartidos = useMemo(() => {
    const map = {};
    filtered.forEach(inf => {
      const j = inf.jornada; if (!j) return;
      if (!map[j]) map[j] = { jornada: j, sinInc: 0, soloLeves: 0, conGraves: 0, total: 0 };
      map[j].total++;
      if (inf.incidencias_graves > 0) map[j].conGraves++;
      else if (inf.incidencias_leves > 0) map[j].soloLeves++;
      else map[j].sinInc++;
    });
    return Object.values(map).sort((a, b) => a.jornada - b.jornada);
  }, [filtered]);

  // Gráfica: incidencias por BLOQUE de cámara
  const chartBloques = useMemo(() => {
    const map = {};
    filtered.forEach(inf => {
      const camData = inf.cam_data || {};
      Object.entries(camData).forEach(([camId, cam]) => {
        const block = CAM_TO_BLOCK[camId];
        if (!block) return;
        const items = cam.items || {};
        const inc = Object.values(items).filter(v => v === 'G' || v === 'L').length;
        if (!inc) return;
        if (!map[block.id]) map[block.id] = { label: `${block.icon} ${block.label}`, val: 0 };
        map[block.id].val += inc;
      });
    });
    return Object.values(map).sort((a, b) => b.val - a.val).slice(0, 10);
  }, [filtered]);

  // Estadísticas por modelo de equipo
  const modelStats = useMemo(() => {
    const map = {};
    filtered.forEach(inf => {
      const camData = inf.cam_data || {};
      const camModels = inf.cam_models || {};
      const activas = inf.camaras_activas || {};
      Object.entries(activas).forEach(([camId, active]) => {
        if (!active) return;
        const block = CAM_TO_BLOCK[camId];
        if (!block) return;
        const modelRaw = camModels[camId] || {};
        const modelo = Object.values(modelRaw).filter(Boolean).join(' / ') || '—';
        const key = `${block.id}||${modelo}`;
        const items = (camData[camId] || {}).items || {};
        const incG = Object.values(items).filter(v => v === 'G').length;
        const incL = Object.values(items).filter(v => v === 'L').length;
        if (!map[key]) map[key] = { bloque: block.label, icon: block.icon, modelo, usos: 0, incG: 0, incL: 0 };
        map[key].usos++;
        map[key].incG += incG;
        map[key].incL += incL;
      });
    });
    return Object.values(map)
      .filter(d => d.modelo !== '—' || d.incG + d.incL > 0)
      .sort((a, b) => a.bloque.localeCompare(b.bloque) || b.usos - a.usos);
  }, [filtered]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const ids = filtered.map(i => i.id);
      const res = await apiFetch('/api/analisis/export', { method: 'POST', body: JSON.stringify({ ids }) });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'analisis-ccee.xlsx';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch { alert('Error exportando Excel'); }
    setExporting(false);
  };

  const clearFilters = () => { setFTipo(''); setFJornada(''); setFUM(''); setFBloque(''); setFModelo(''); setFTipoInc(''); };
  const hasFilters = fTipo || fJornada || fUM || fBloque || fModelo || fTipoInc;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#71717a', fontSize: 13 }}>Cargando análisis...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <SecTitle style={{ margin: 0 }}>Análisis de informes</SecTitle>
        <BtnP onClick={handleExport} disabled={exporting || filtered.length === 0} style={{ height: 34, fontSize: 12, padding: '0 14px' }}>
          {exporting ? 'Exportando...' : '⬇ Exportar Excel'}
        </BtnP>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Partidos', val: filtered.length, color: '#3b82f6' },
          { label: 'Con graves', val: conGraves, color: '#dc2626' },
          { label: 'Solo leves', val: soloLeves, color: '#f59e0b' },
          { label: 'Sin incidencias', val: sinInc, color: '#16a34a' },
          { label: 'Items G acum.', val: totalG, color: '#7c3aed' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '14px 18px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</div>
          </Card>
        ))}
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 20, alignItems: 'start' }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Partidos por jornada · clasificados por incidencia</div>
          <PartidosChart data={chartPartidos} />
        </Card>
        {chartBloques.length > 0 && (
          <Card style={{ padding: 16 }}>
            <HBarChart title="Inc. por bloque de cámara" data={chartBloques} colorKey="#3b82f6" />
          </Card>
        )}
      </div>

      {/* Filtros */}
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#71717a' }}>Filtros</span>
          {hasFilters && (
            <button onClick={clearFilters} style={{ fontSize: 11, color: '#71717a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              Limpiar
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
          <div>
            <div style={LBL}>Tipo de servicio</div>
            <select value={fTipo} onChange={e => setFTipo(e.target.value)} style={SEL}>
              <option value="">Todos</option>
              {tiposActivos.map(t => <option key={t} value={t}>{TIPO_LABELS[t]||t}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>Jornada</div>
            <select value={fJornada} onChange={e => setFJornada(e.target.value)} style={SEL}>
              <option value="">Todas</option>
              {jornadas.map(j => <option key={j} value={j}>Jornada {j}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>Equipo (UM)</div>
            <select value={fUM} onChange={e => setFUM(e.target.value)} style={SEL}>
              <option value="">Todos</option>
              {ums.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>Bloque cámara</div>
            <select value={fBloque} onChange={e => setFBloque(e.target.value)} style={SEL}>
              <option value="">Todos</option>
              {bloquesActivos.map(b => <option key={b.id} value={b.id}>{b.icon} {b.label}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>Modelo equipo</div>
            <select value={fModelo} onChange={e => setFModelo(e.target.value)} style={SEL}>
              <option value="">Todos</option>
              {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>Incidencias</div>
            <select value={fTipoInc} onChange={e => setFTipoInc(e.target.value)} style={SEL}>
              <option value="">Todas</option>
              <option value="G">Con Graves</option>
              <option value="L">Solo Leves</option>
              <option value="sin">Sin incidencias</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Estadísticas por modelo */}
      {modelStats.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e4e4e7' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Estadísticas por modelo de equipo</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Bloque', 'Modelo', 'Usos', 'Items G', 'Items L'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Usos' || h === 'Items G' || h === 'Items L' ? 'center' : 'left', fontSize: 10, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e4e4e7', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelStats.map((m, i) => (
                  <tr key={i} style={{ borderBottom: i < modelStats.length - 1 ? '1px solid #f4f4f5' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '7px 12px', fontWeight: 500 }}>{m.icon} {m.bloque}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11 }}>{m.modelo}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'center', color: '#71717a' }}>{m.usos}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                      {m.incG > 0 ? <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ {m.incG}</span> : <span style={{ color: '#d1d5db' }}>0</span>}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                      {m.incL > 0 ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>↓ {m.incL}</span> : <span style={{ color: '#d1d5db' }}>0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tabla de informes */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Partidos</span>
          <Badge>{filtered.length}</Badge>
          <span style={{ fontSize: 11, color: '#71717a' }}>Haz clic en un partido para ver el detalle de incidencias</span>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#71717a' }}>No hay informes que coincidan con los filtros.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Jornada', 'Encuentro', 'Fecha', 'UM', 'J. Técnico', 'Estado'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e4e4e7', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inf, i) => {
                  const isExpanded = expandedId === inf.id;
                  // Cámaras en orden correcto con incidencias
                  const activeCamsOrdered = CAMERA_ORDER
                    .filter(id => (inf.camaras_activas || {})[id])
                    .map(id => ({ id, cam: CAMERA_CATALOG[id], d: (inf.cam_data || {})[id] || {} }));
                  const camsWithIssues = activeCamsOrdered.filter(({ d }) => {
                    const items = d.items || {};
                    return Object.values(items).some(v => v === 'G' || v === 'L') || d.incidencias;
                  });
                  return (
                    <>
                      <tr key={inf.id}
                        onClick={() => setExpandedId(isExpanded ? null : inf.id)}
                        style={{ borderBottom: '1px solid #f4f4f5', background: isExpanded ? '#f0f9ff' : i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'; }}>
                        <td style={{ padding: '8px 12px', color: '#71717a' }}>J{inf.jornada || '—'}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 500 }}>{inf.encuentro || '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#71717a', whiteSpace: 'nowrap' }}>{fmt(inf.fecha)}</td>
                        <td style={{ padding: '8px 12px' }}>{inf.um || '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#71717a' }}>{inf.jefe_tecnico || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {inf.incidencias_graves > 0
                            ? <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ {inf.incidencias_graves}G {inf.incidencias_leves > 0 ? `+ ${inf.incidencias_leves}L` : ''}</span>
                            : inf.incidencias_leves > 0
                              ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>↓ {inf.incidencias_leves}L</span>
                              : <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Sin incidencias</span>}
                          <span style={{ marginLeft: 6, color: '#a1a1aa', fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${inf.id}-detail`}>
                          <td colSpan={6} style={{ padding: '0 12px 12px', background: '#f0f9ff', borderBottom: '2px solid #bfdbfe' }}>
                            {camsWithIssues.length === 0 ? (
                              <div style={{ padding: '10px 0', fontSize: 12, color: '#16a34a' }}>✓ Sin incidencias en ningún equipo.</div>
                            ) : (
                              <div style={{ paddingTop: 10 }}>
                                {camsWithIssues.map(({ id, cam, d }) => {
                                  if (!cam) return null;
                                  const items = d.items || {};
                                  const koItems = Object.entries(items).filter(([, v]) => v === 'G' || v === 'L');
                                  return (
                                    <div key={id} style={{ marginBottom: 8, background: '#fff', borderRadius: 6, border: '1px solid #e4e4e7', overflow: 'hidden' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                                        <span style={{ fontSize: 13 }}>{cam.icon}</span>
                                        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{cam.label}</span>
                                        {/* Modelo asignado */}
                                        {(() => {
                                          const m = inf.cam_models?.[id];
                                          const ms = m ? Object.values(m).filter(Boolean).join(' · ') : '';
                                          return ms ? <span style={{ fontSize: 10, color: '#71717a', fontFamily: 'monospace' }}>{ms}</span> : null;
                                        })()}
                                        {koItems.filter(([,v])=>v==='G').length>0 && <Badge variant="grave">⚠{koItems.filter(([,v])=>v==='G').length}G</Badge>}
                                        {koItems.filter(([,v])=>v==='L').length>0 && <Badge variant="leve">↓{koItems.filter(([,v])=>v==='L').length}L</Badge>}
                                      </div>
                                      {koItems.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px 10px' }}>
                                          {koItems.map(([item, v]) => (
                                            <span key={item} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: v === 'G' ? '#fef2f2' : '#fffbeb', color: v === 'G' ? '#dc2626' : '#d97706', border: `1px solid ${v === 'G' ? '#fecaca' : '#fde68a'}`, fontWeight: 600 }}>
                                              {item}: {v}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {d.incidencias && (
                                        <div style={{ padding: '5px 10px 8px', fontSize: 11, color: '#52525b', borderTop: koItems.length > 0 ? '1px solid #f0f0f0' : 'none' }}>
                                          {d.incidencias}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {/* Incidencias de logística */}
                                {inf.logistica?.incidencias && (
                                  <div style={{ marginTop: 4, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#92400e' }}>
                                    <strong>Logística:</strong> {inf.logistica.incidencias}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
