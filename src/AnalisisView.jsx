import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch, Card, BtnP, Badge, SecTitle, TIPOS_SERVICIO } from "./App.jsx";

/* ── helpers ── */
const fmt = d => d ? new Date(d).toLocaleDateString('es-ES') : '—';

/* ── Camera order (canonical order from CAMERA_CATALOG) ── */
const CAM_ORDER = [
  'OBVAN_CCEE','CAMARA_UHS','SKYCAM_4','AR_SKYCAM',
  'STEADY_L','STEADY_R','STEADY_PERSO',
  'RF_L','RF_R','RF_PERSO',
  'POLECAM_L','POLECAM_R',
  'MINICAM_L','MINICAM_R',
  'KIT_CINEMA_L','KIT_CINEMA_R',
  'DRONE','BODYCAM','PTZ_1','PTZ_2','OTROS',
];
const CAM_IDX = Object.fromEntries(CAM_ORDER.map((id, i) => [id, i]));

/* ── Camera blocks ── */
const CAM_BLOCKS = [
  { id: 'steady',      label: 'Steadycam', icon: '🎬', cams: ['STEADY_L','STEADY_R','STEADY_PERSO'] },
  { id: 'rf',          label: 'RF',        icon: '📡', cams: ['RF_L','RF_R','RF_PERSO'] },
  { id: 'cinema',      label: 'Cinema',    icon: '🎞', cams: ['KIT_CINEMA_L','KIT_CINEMA_R'] },
  { id: 'polecam',     label: 'Polecam',   icon: '🎯', cams: ['POLECAM_L','POLECAM_R'] },
  { id: 'minicam',     label: 'Minicám.',  icon: '🔭', cams: ['MINICAM_L','MINICAM_R'] },
  { id: 'ptz',         label: 'PTZ',       icon: '📹', cams: ['PTZ_1','PTZ_2'] },
  { id: 'OBVAN_CCEE',  label: 'OBVAN CCEE',icon: '🚐', cams: ['OBVAN_CCEE'] },
  { id: 'CAMARA_UHS',  label: 'Cámara UHS',icon: '📷', cams: ['CAMARA_UHS'] },
  { id: 'SKYCAM_4',    label: '4SkyCam',   icon: '🚁', cams: ['SKYCAM_4'] },
  { id: 'AR_SKYCAM',   label: 'AR Skycam', icon: '🔮', cams: ['AR_SKYCAM'] },
  { id: 'DRONE',       label: 'Drone',     icon: '🛸', cams: ['DRONE'] },
  { id: 'BODYCAM',     label: 'Bodycam',   icon: '👕', cams: ['BODYCAM'] },
  { id: 'OTROS',       label: 'Otros',     icon: '🔧', cams: ['OTROS'] },
];
const CAM_TO_BLOCK = {};
CAM_BLOCKS.forEach(b => b.cams.forEach(c => { CAM_TO_BLOCK[c] = b; }));

/* ── Styles ── */
const SEL = { width: '100%', height: 32, borderRadius: 6, border: '1px solid #DDD5CE', fontSize: 12, paddingLeft: 8, background: '#fff', color: '#1A1A1A' };
const LBL = { fontSize: 10, fontWeight: 700, color: '#7A7168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };
const TH  = { padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#7A7168', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #DDD5CE', whiteSpace: 'nowrap', background: '#F5F0EC' };
const TD  = { padding: '8px 12px', fontSize: 12 };

/* ── Classify a single informe (globally or for specific camIds) ── */
const classify = inf => {
  if (inf.incidencias_graves > 0) return 'graves';
  if (inf.incidencias_leves  > 0) return 'leves';
  return 'sinInc';
};

/* When a camera filter is active, classify ONLY by incidents from those cameras */
const classifyFor = (inf, camIds) => {
  if (!camIds || camIds.length === 0) return classify(inf);
  const camData = inf.cam_data || {};
  let graves = 0, leves = 0;
  camIds.forEach(camId => {
    Object.values((camData[camId] || {}).items || {}).forEach(v => {
      if (v === 'G') graves++; else if (v === 'L') leves++;
    });
  });
  if (graves > 0) return 'graves';
  if (leves > 0) return 'leves';
  return 'sinInc';
};

/* ── Donut chart (Partidos: sin inc / solo leves / con graves) ── */
function DonutChart({ sinInc, soloLeves, conGraves }) {
  const total = sinInc + soloLeves + conGraves;
  if (total === 0) return <div style={{ fontSize: 12, color: '#7A7168' }}>Sin datos</div>;
  const R = 54, r = 32, cx = 70, cy = 70;
  const toRad = deg => (deg - 90) * Math.PI / 180;
  const arc = (start, end, fill) => {
    if (end - start >= 360) end = 359.999;
    const [s, e] = [toRad(start), toRad(end)];
    const laf = end - start > 180 ? 1 : 0;
    return `M ${cx + R * Math.cos(s)} ${cy + R * Math.sin(s)} A ${R} ${R} 0 ${laf} 1 ${cx + R * Math.cos(e)} ${cy + R * Math.sin(e)} L ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)} A ${r} ${r} 0 ${laf} 0 ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} Z`;
  };
  const pS = sinInc / total * 360, pL = soloLeves / total * 360, pG = conGraves / total * 360;
  const oL = pS, oG = oL + pL;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        {pS > 0 && <path d={arc(0,    pS)}    fill="#10b981" />}
        {pL > 0 && <path d={arc(oL,  oL+pL)} fill="#f59e0b" />}
        {pG > 0 && <path d={arc(oG,  oG+pG)} fill="#dc2626" />}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={700} fill="#1A1A1A">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="#7A7168">PARTIDOS</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[['Sin incidencia', sinInc,    '#10b981'],
          ['Solo leves',     soloLeves, '#f59e0b'],
          ['Con graves',     conGraves, '#dc2626']].map(([l, v, c]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#7A7168' }}>{l}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: c, marginLeft: 4 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Stacked bar chart (3 categories per jornada) ── */
function BarChart({ data }) {
  if (!data.length) return null;
  const W = 500, H = 160, PAD = { t: 12, r: 12, b: 32, l: 28 };
  const chartW = W - PAD.l - PAD.r, chartH = H - PAD.t - PAD.b;
  const maxVal = Math.max(...data.map(d => d.sinInc + d.soloLeves + d.conGraves), 1);
  const barW = Math.min(32, (chartW / data.length) - 4);
  const gap  = chartW / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      {[0, 0.5, 1].map(t => {
        const y = PAD.t + chartH - t * chartH;
        return <g key={t}><line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y} stroke="#DDD5CE" strokeWidth={1}/><text x={PAD.l-3} y={y+4} fontSize={8} fill="#999" textAnchor="end">{Math.round(t*maxVal)}</text></g>;
      })}
      {data.map((d, i) => {
        const x  = PAD.l + i * gap + (gap - barW) / 2;
        const hS = chartH * d.sinInc    / maxVal;
        const hL = chartH * d.soloLeves / maxVal;
        const hG = chartH * d.conGraves / maxVal;
        const base = PAD.t + chartH;
        return (
          <g key={d.jornada}>
            {hS > 0 && <rect x={x} y={base - hS - hL - hG} width={barW} height={hS} fill="#10b981" rx={2}/>}
            {hL > 0 && <rect x={x} y={base - hL - hG}      width={barW} height={hL} fill="#f59e0b" rx={2}/>}
            {hG > 0 && <rect x={x} y={base - hG}           width={barW} height={hG} fill="#dc2626" rx={2}/>}
            <text x={x + barW/2} y={H-4} fontSize={8} fill="#555" textAnchor="middle">J{d.jornada}</text>
          </g>
        );
      })}
      {/* Legend */}
      {[['Sin inc.',  '#10b981', 0], ['Solo leves','#f59e0b', 60], ['Con graves','#dc2626', 130]].map(([l,c,ox]) => (
        <g key={l} transform={`translate(${PAD.l + ox},${H - 16})`}>
          <rect width={8} height={8} fill={c} rx={2}/>
          <text x={11} y={8} fontSize={8} fill="#555">{l}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Horizontal bar ── */
function HBar({ label, val, max, color }) {
  const pct = max > 0 ? val / max : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ minWidth: 110, fontSize: 11, color: '#1A1A1A', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ flex: 1, background: '#EDE8E4', borderRadius: 4, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <div style={{ minWidth: 24, fontSize: 11, fontWeight: 700, color, textAlign: 'right' }}>{val}</div>
    </div>
  );
}

/* ── Heatmap ── */
function Heatmap({ data, jornadas }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.flatMap(r => jornadas.map(j => r.jornadas[j] || 0)), 1);
  const cellColor = v => { if (!v) return '#F5F0EC'; const t = v/maxVal; return t < 0.33 ? '#fef9c3' : t < 0.66 ? '#fdba74' : '#ef4444'; };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...TH, background: 'transparent', padding: '6px 10px' }}>Cámara</th>
            {jornadas.map(j => <th key={j} style={{ ...TH, background: 'transparent', padding: '6px 8px', textAlign: 'center' }}>J{j}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id}>
              <td style={{ padding: '5px 10px', fontSize: 11, whiteSpace: 'nowrap', borderBottom: '1px solid #EDE8E4' }}>{row.icon} {row.label}</td>
              {jornadas.map(j => { const v = row.jornadas[j] || 0; return (
                <td key={j} style={{ padding: '5px 8px', textAlign: 'center', background: cellColor(v), borderBottom: '1px solid #EDE8E4', fontSize: 11, fontWeight: v ? 600 : 400, color: v ? '#1A1A1A' : '#C2B9AD' }}>{v || '—'}</td>
              ); })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Small badges ── */
function TipoBadge({ tipo }) {
  return tipo === 'G'
    ? <span style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fca5a5', borderRadius:4, padding:'2px 7px', fontSize:10, fontWeight:700 }}>GRAVE</span>
    : <span style={{ background:'#fffbeb', color:'#d97706', border:'1px solid #fcd34d', borderRadius:4, padding:'2px 7px', fontSize:10, fontWeight:700 }}>LEVE</span>;
}
const CAM_COLORS = { OBVAN_CCEE:'#374151',CAMARA_UHS:'#f59e0b',SKYCAM_4:'#3b82f6',AR_SKYCAM:'#6366f1',STEADY_L:'#10b981',STEADY_R:'#10b981',STEADY_PERSO:'#10b981',RF_L:'#8b5cf6',RF_R:'#8b5cf6',RF_PERSO:'#8b5cf6',POLECAM_L:'#ef4444',POLECAM_R:'#ef4444',MINICAM_L:'#f97316',MINICAM_R:'#f97316',KIT_CINEMA_L:'#ec4899',KIT_CINEMA_R:'#ec4899',DRONE:'#64748b',BODYCAM:'#14b8a6',PTZ_1:'#06b6d4',PTZ_2:'#0891b2',OTROS:'#C2B9AD' };
function CamBadge({ camId }) {
  const b = CAM_TO_BLOCK[camId]; const c = CAM_COLORS[camId] || '#7A7168';
  return <span style={{ background:`${c}15`, color:c, border:`1px solid ${c}40`, borderRadius:4, padding:'2px 7px', fontSize:10, fontWeight:600, whiteSpace:'nowrap' }}>{b?.icon} {b?.label || camId}</span>;
}
function EstadoBadge({ graves, leves }) {
  if (graves > 0) return <span style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fca5a5', borderRadius:4, padding:'2px 8px', fontSize:10, fontWeight:700 }}>CON GRAVES</span>;
  if (leves  > 0) return <span style={{ background:'#fffbeb', color:'#d97706', border:'1px solid #fcd34d', borderRadius:4, padding:'2px 8px', fontSize:10, fontWeight:700 }}>CON LEVES</span>;
  return <span style={{ background:'#f0fdf4', color:'#16a34a', border:'1px solid #86efac', borderRadius:4, padding:'2px 8px', fontSize:10, fontWeight:700 }}>SIN INC.</span>;
}
function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding:'8px 16px', fontSize:12, fontWeight:active?700:500, color:active?'#E8392C':'#7A7168', background:'none', border:'none', borderBottom:active?'2px solid #E8392C':'2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>
      {label}
    </button>
  );
}

/* ── CSV helpers ── */
function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(esc).join(','), ...rows.map(r => headers.map(k => esc(r[k])).join(','))].join('\n');
}
function downloadCSV(filename, content) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/* ════════════════════════════════════════════════════════════
   MAIN
   ════════════════════════════════════════════════════════════ */
export default function AnalisisView() {
  const [informes,   setInformes]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);
  const [exportingInc, setExportingInc] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [activeTab,  setActiveTab]  = useState('resumen');
  const [expandedId, setExpandedId] = useState(null);

  /* ── Pending filters ── */
  const [pServicio,  setPServicio]  = useState('');
  const [pJornada,   setPJornada]   = useState('');
  const [pEncuentro, setPEncuentro] = useState('');
  const [pBloques,   setPBloques]   = useState([]);
  const [pModelo,    setPModelo]    = useState('');
  const [pTipoInc,   setPTipoInc]   = useState('');
  const [pUM,        setPUM]        = useState('');

  /* ── Applied filters ── */
  const [applied, setApplied] = useState({ servicio:'', jornada:'', encuentro:'', bloques:[], modelo:'', tipoInc:'', um:'' });

  useEffect(() => {
    apiFetch('/api/analisis').then(r => r.json())
      .then(d => { setInformes(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  /* ── Filter option lists ── */
  const jornadas   = useMemo(() => [...new Set(informes.map(i => i.jornada).filter(Boolean))].sort((a,b)=>a-b), [informes]);
  const encuentros = useMemo(() => [...new Set(informes.map(i => i.encuentro).filter(Boolean))].sort(), [informes]);
  const ums        = useMemo(() => [...new Set(informes.map(i => i.um).filter(Boolean))].sort(), [informes]);
  const bloquesActivos = useMemo(() => {
    const s = new Set();
    informes.forEach(inf => Object.entries(inf.camaras_activas||{}).forEach(([k,v]) => { if (v) { const b = CAM_TO_BLOCK[k]; if (b) s.add(b.id); } }));
    return CAM_BLOCKS.filter(b => s.has(b.id));
  }, [informes]);

  /* ── Available models for selected single block ── */
  const modelosDisponibles = useMemo(() => {
    if (pBloques.length !== 1) return [];
    const block = CAM_BLOCKS.find(b => b.id === pBloques[0]);
    if (!block) return [];
    const models = new Set();
    informes.forEach(inf => {
      block.cams.forEach(camId => {
        const modelRaw = (inf.cam_models||{})[camId] || {};
        const modelStr = Object.values(modelRaw).filter(Boolean).join(' / ');
        if (modelStr) models.add(modelStr);
      });
    });
    return [...models].sort();
  }, [informes, pBloques]);

  /* ── Apply / Reset ── */
  const applyFilters = useCallback(() => {
    setApplied({ servicio:pServicio, jornada:pJornada, encuentro:pEncuentro, bloques:pBloques, modelo:pModelo, tipoInc:pTipoInc, um:pUM });
  }, [pServicio, pJornada, pEncuentro, pBloques, pModelo, pTipoInc, pUM]);

  const resetFilters = useCallback(() => {
    setPServicio(''); setPJornada(''); setPEncuentro(''); setPBloques([]); setPModelo(''); setPTipoInc(''); setPUM('');
    setApplied({ servicio:'', jornada:'', encuentro:'', bloques:[], modelo:'', tipoInc:'', um:'' });
  }, []);

  const toggleBloque = id => {
    setPBloques(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setPModelo(''); // reset model when block changes
  };

  /* ── Filtered data ── */
  const filtered = useMemo(() => {
    return informes.filter(inf => {
      if (applied.servicio && (inf.tipo_servicio || '') !== applied.servicio) return false;
      if (applied.jornada  && String(inf.jornada) !== applied.jornada)        return false;
      if (applied.um       && inf.um !== applied.um)                           return false;
      if (applied.encuentro && inf.encuentro !== applied.encuentro)            return false;
      if (applied.bloques.length > 0) {
        const activas = inf.camaras_activas || {};
        const ok = applied.bloques.some(bId => { const b = CAM_BLOCKS.find(x => x.id === bId); return b && b.cams.some(c => activas[c]); });
        if (!ok) return false;
      }
      if (applied.modelo && applied.bloques.length === 1) {
        const block = CAM_BLOCKS.find(b => b.id === applied.bloques[0]);
        if (block) {
          const hasModel = block.cams.some(camId => {
            const modelRaw = (inf.cam_models||{})[camId] || {};
            return Object.values(modelRaw).filter(Boolean).join(' / ') === applied.modelo;
          });
          if (!hasModel) return false;
        }
      }
      // tipoInc filter: use per-camera data when a camera block is selected
      if (applied.tipoInc) {
        const camIds = applied.bloques.length > 0
          ? applied.bloques.flatMap(bId => { const b = CAM_BLOCKS.find(x => x.id === bId); return b ? b.cams : []; })
          : null;
        const cat = classifyFor(inf, camIds);
        if (applied.tipoInc === 'G'   && cat !== 'graves')  return false;
        if (applied.tipoInc === 'L'   && cat !== 'leves')   return false;
        if (applied.tipoInc === 'sin' && cat !== 'sinInc')  return false;
      }
      return true;
    });
  }, [informes, applied]);

  /* ── Camera IDs for current block filter (null = no filter = use global counts) ── */
  const filteredCamIds = useMemo(() =>
    applied.bloques.length === 0 ? null
      : applied.bloques.flatMap(bId => { const b = CAM_BLOCKS.find(x => x.id === bId); return b ? b.cams : []; })
  , [applied.bloques]);

  /* ── Classify filtered (camera-aware) ── */
  const sinInc    = useMemo(() => filtered.filter(i => classifyFor(i, filteredCamIds) === 'sinInc').length, [filtered, filteredCamIds]);
  const soloLeves = useMemo(() => filtered.filter(i => classifyFor(i, filteredCamIds) === 'leves').length,  [filtered, filteredCamIds]);
  const conGraves = useMemo(() => filtered.filter(i => classifyFor(i, filteredCamIds) === 'graves').length, [filtered, filteredCamIds]);
  const partidos  = useMemo(() => new Set(filtered.map(i => i.encuentro).filter(Boolean)).size, [filtered]);

  /* ── Active chips ── */
  const chips = useMemo(() => {
    const c = [];
    if (applied.servicio)  { const ts = TIPOS_SERVICIO.find(t => t.id === applied.servicio); c.push({ key:'srv', label: ts ? `${ts.icon} ${ts.label}` : applied.servicio, clear: () => setApplied(p=>({...p,servicio:''})) }); }
    if (applied.jornada)   c.push({ key:'jornada',   label: `J${applied.jornada}`,  clear: () => setApplied(p=>({...p,jornada:''})) });
    if (applied.encuentro) c.push({ key:'encuentro', label: applied.encuentro,      clear: () => setApplied(p=>({...p,encuentro:''})) });
    applied.bloques.forEach(bId => { const b = CAM_BLOCKS.find(x => x.id === bId); if (b) c.push({ key:`b_${bId}`, label:`${b.icon} ${b.label}`, clear:()=>setApplied(p=>({...p,bloques:p.bloques.filter(x=>x!==bId),modelo:''})) }); });
    if (applied.modelo)    c.push({ key:'modelo',    label: applied.modelo,         clear: () => setApplied(p=>({...p,modelo:''})) });
    if (applied.tipoInc)   c.push({ key:'tipo',      label: applied.tipoInc==='G'?'Graves':applied.tipoInc==='L'?'Leves':'Sin inc.', clear:()=>setApplied(p=>({...p,tipoInc:''})) });
    if (applied.um)        c.push({ key:'um',        label: applied.um,             clear: () => setApplied(p=>({...p,um:''})) });
    return c;
  }, [applied]);

  /* ── Per-jornada stats (3 categories) ── */
  const porJornada = useMemo(() => {
    const map = {};
    filtered.forEach(inf => {
      const j = inf.jornada; if (!j) return;
      if (!map[j]) map[j] = { jornada:j, sinInc:0, soloLeves:0, conGraves:0, items:[] };
      const cat = classifyFor(inf, filteredCamIds);
      if (cat === 'sinInc') map[j].sinInc++;
      else if (cat === 'leves') map[j].soloLeves++;
      else map[j].conGraves++;
      // items for timeline
      const camData = inf.cam_data || {};
      CAM_ORDER.forEach(camId => {
        if (!(inf.camaras_activas||{})[camId]) return;
        const b = CAM_TO_BLOCK[camId]; if (!b) return;
        const items = (camData[camId]||{}).items || {};
        Object.entries(items).forEach(([item, status]) => {
          if (status === 'G' || status === 'L') map[j].items.push({ cam: b.label, item, status });
        });
      });
    });
    return Object.values(map).sort((a,b) => a.jornada - b.jornada);
  }, [filtered, filteredCamIds]);

  /* ── Stats por bloque (respecting camera order) ── */
  const statsByCamera = useMemo(() => {
    const map = {};
    filtered.forEach(inf => {
      const camData = inf.cam_data || {};
      CAM_ORDER.forEach(camId => {
        if (!(inf.camaras_activas||{})[camId]) return;
        const b = CAM_TO_BLOCK[camId]; if (!b) return;
        const items = (camData[camId]||{}).items || {};
        const g = Object.values(items).filter(v=>v==='G').length;
        const l = Object.values(items).filter(v=>v==='L').length;
        if (!map[b.id]) map[b.id] = { id:b.id, label:b.label, icon:b.icon, idx:CAM_IDX[b.cams[0]]??99, graves:0, leves:0 };
        map[b.id].graves += g; map[b.id].leves += l;
      });
    });
    return Object.values(map).sort((a,b) => a.idx - b.idx);
  }, [filtered]);

  /* ── Flat incidents (canonical camera order, with description) ── */
  const incidenciasFlat = useMemo(() => {
    const rows = [];
    filtered.forEach(inf => {
      const camData  = inf.cam_data  || {};
      const activas  = inf.camaras_activas || {};
      CAM_ORDER.forEach(camId => {
        if (!activas[camId]) return;
        const cam   = camData[camId] || {};
        const items = cam.items || {};
        Object.entries(items).forEach(([item, status]) => {
          if (status !== 'G' && status !== 'L') return;
          rows.push({ jornada:inf.jornada, partido:inf.encuentro, fecha:inf.fecha, camId, elemento:item, tipo:status, um:inf.um||'—', descripcion:cam.incidencias||'—' });
        });
      });
    });
    return rows;
  }, [filtered]);

  /* ── Elementos más problemáticos ── */
  const elementosProblematicos = useMemo(() => {
    const map = {};
    filtered.forEach(inf => {
      const camData = inf.cam_data || {};
      CAM_ORDER.forEach(camId => {
        if (!(inf.camaras_activas||{})[camId]) return;
        const b = CAM_TO_BLOCK[camId]; if (!b) return;
        const items = (camData[camId]||{}).items || {};
        Object.entries(items).forEach(([item, status]) => {
          if (status !== 'G' && status !== 'L') return;
          const k = `${b.id}||${item}`;
          if (!map[k]) map[k] = { camId:b.id, cam:`${b.icon} ${b.label}`, elemento:item, leves:0, graves:0 };
          if (status==='G') map[k].graves++; else map[k].leves++;
        });
      });
    });
    return Object.values(map).map(d=>({...d, total:d.graves+d.leves, riesgo:d.graves*2+d.leves})).sort((a,b)=>b.riesgo-a.riesgo);
  }, [filtered]);

  /* ── Heatmap ── */
  const heatmapData = useMemo(() => {
    const map = {};
    filtered.forEach(inf => {
      const j = inf.jornada; if (!j) return;
      const camData = inf.cam_data || {};
      CAM_ORDER.forEach(camId => {
        if (!(inf.camaras_activas||{})[camId]) return;
        const b = CAM_TO_BLOCK[camId]; if (!b) return;
        const inc = Object.values((camData[camId]||{}).items||{}).filter(v=>v==='G'||v==='L').length;
        if (!map[b.id]) map[b.id] = { id:b.id, label:b.label, icon:b.icon, idx:CAM_IDX[b.cams[0]]??99, jornadas:{} };
        map[b.id].jornadas[j] = (map[b.id].jornadas[j]||0) + inc;
      });
    });
    return Object.values(map).sort((a,b)=>a.idx-b.idx);
  }, [filtered]);

  /* ── Exports ── */
  const exportXLS = async () => {
    setExporting(true);
    try {
      const ids = filtered.map(i => i.id);
      const res = await apiFetch('/api/analisis/export', { method:'POST', body:JSON.stringify({ids}) });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='analisis-ccee.xlsx';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch { alert('Error exportando Excel'); }
    setExporting(false);
  };

  const exportIncidencias = async () => {
    setExportingInc(true);
    try {
      const ids = filtered.map(i => i.id);
      const res = await apiFetch('/api/export/incidencias', { method:'POST', body:JSON.stringify({ids}) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || res.statusText); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='incidencias-ccee.xlsx';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch(e) { alert('Error exportando incidencias: ' + e.message); }
    setExportingInc(false);
  };

  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      const ids = filtered.map(i => i.id);
      const titulo = applied.jornada ? `Jornada ${applied.jornada}` : applied.servicio ? applied.servicio : '';
      const res = await apiFetch('/api/export/incidencias-pdf', { method:'POST', body:JSON.stringify({ids, titulo}) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || res.statusText); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='informe-incidencias.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch(e) { alert('Error generando PDF: ' + e.message); }
    setExportingPdf(false);
  };

  const exportCSV = () => {
    const tab = activeTab;
    if (tab === 'incidencias') {
      downloadCSV('incidencias.csv', toCSV(incidenciasFlat.map(r => ({
        Jornada:`J${r.jornada||'—'}`, Partido:r.partido||'—', Cámara:r.camId,
        Elemento:r.elemento, Tipo:r.tipo==='G'?'GRAVE':'LEVE', Equipo:r.um, Descripción:r.descripcion,
      }))));
    } else if (tab === 'por_camara') {
      downloadCSV('por-camara.csv', toCSV(elementosProblematicos.map(d => ({ Cámara:d.cam, Elemento:d.elemento, Leves:d.leves, Graves:d.graves, Total:d.total, Riesgo:d.riesgo }))));
    } else if (tab === 'detalle') {
      downloadCSV('detalle.csv', toCSV(filtered.map(inf => ({
        Jornada:`J${inf.jornada}`, Partido:inf.encuentro||'—', Fecha:fmt(inf.fecha),
        Equipo:inf.um||'—', TipoServicio:inf.tipo_servicio||'—', Leves:inf.incidencias_leves||0, Graves:inf.incidencias_graves||0,
      }))));
    } else {
      downloadCSV('resumen.csv', toCSV(filtered.map(inf => ({
        Jornada:`J${inf.jornada}`, Partido:inf.encuentro||'—', Fecha:fmt(inf.fecha), Equipo:inf.um||'—',
        TipoServicio:inf.tipo_servicio||'—', Graves:inf.incidencias_graves||0, Leves:inf.incidencias_leves||0,
        Estado:classifyFor(inf,filteredCamIds)==='sinInc'?'Sin inc':classifyFor(inf,filteredCamIds)==='leves'?'Solo leves':'Con graves',
      }))));
    }
  };

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#7A7168', fontSize:13 }}>Cargando análisis...</div>;

  const jornadasFiltered = [...new Set(filtered.map(i=>i.jornada).filter(Boolean))].sort((a,b)=>a-b);

  /* ════════════════ RENDER ════════════════ */
  return (
    <div style={{ display:'flex', gap:0, minHeight:'100vh', background:'#F5F0EC' }}>

      {/* ─── SIDEBAR FILTROS ─── */}
      <div style={{ width:220, flexShrink:0, background:'#fff', borderRight:'1px solid #DDD5CE', padding:'16px 12px', position:'sticky', top:0, height:'100vh', overflowY:'auto' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#E8392C', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Filtros</div>

        {/* Tipo de servicio */}
        <div style={{ marginBottom:12 }}>
          <div style={LBL}>Tipo de servicio</div>
          <select value={pServicio} onChange={e=>setPServicio(e.target.value)} style={SEL}>
            <option value="">Todos</option>
            {TIPOS_SERVICIO.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </select>
        </div>

        {/* Jornada */}
        <div style={{ marginBottom:12 }}>
          <div style={LBL}>Jornada</div>
          <select value={pJornada} onChange={e=>setPJornada(e.target.value)} style={SEL}>
            <option value="">Todo</option>
            {jornadas.map(j => <option key={j} value={j}>Jornada {j}</option>)}
          </select>
        </div>

        {/* Encuentro */}
        <div style={{ marginBottom:12 }}>
          <div style={LBL}>Encuentro</div>
          <select value={pEncuentro} onChange={e=>setPEncuentro(e.target.value)} style={SEL}>
            <option value="">Todos</option>
            {encuentros.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Equipo (UM) */}
        <div style={{ marginBottom:12 }}>
          <div style={LBL}>Equipo (UM)</div>
          <select value={pUM} onChange={e=>setPUM(e.target.value)} style={SEL}>
            <option value="">Todos</option>
            {ums.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Tipo de cámara */}
        <div style={{ marginBottom:12 }}>
          <div style={LBL}>Tipo de cámara</div>
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:200, overflowY:'auto' }}>
            {bloquesActivos.map(b => (
              <label key={b.id} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, padding:'3px 4px', borderRadius:4, background:pBloques.includes(b.id)?'#FEF0EE':'transparent' }}>
                <input type="checkbox" checked={pBloques.includes(b.id)} onChange={()=>toggleBloque(b.id)} style={{ accentColor:'#E8392C', cursor:'pointer' }}/>
                {b.icon} {b.label}
              </label>
            ))}
          </div>
        </div>

        {/* Modelo (solo si hay 1 bloque seleccionado y tiene modelos) */}
        {modelosDisponibles.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={LBL}>Modelo de cámara</div>
            <select value={pModelo} onChange={e=>setPModelo(e.target.value)} style={SEL}>
              <option value="">Todos los modelos</option>
              {modelosDisponibles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {/* Tipo de incidencia */}
        <div style={{ marginBottom:16 }}>
          <div style={LBL}>Tipo de incidencia</div>
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {[['','Todas'],['sin','Sin incidencia'],['L','Solo leves'],['G','Con graves']].map(([val,lbl]) => (
              <label key={val} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:12, padding:'3px 4px', borderRadius:4, background:pTipoInc===val?'#FEF0EE':'transparent' }}>
                <input type="radio" name="tipoInc" value={val} checked={pTipoInc===val} onChange={()=>setPTipoInc(val)} style={{ accentColor:'#E8392C' }}/>
                {lbl}
              </label>
            ))}
          </div>
        </div>

        <BtnP onClick={applyFilters} style={{ width:'100%', height:34, fontSize:12, marginBottom:6 }}>Aplicar filtros</BtnP>
        <button onClick={resetFilters} style={{ width:'100%', height:30, fontSize:11, color:'#7A7168', background:'none', border:'1px solid #DDD5CE', borderRadius:6, cursor:'pointer' }}>Reset</button>
      </div>

      {/* ─── ÁREA PRINCIPAL ─── */}
      <div style={{ flex:1, minWidth:0, padding:'20px 24px' }}>

        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:'#1A1A1A', marginBottom:4 }}>Informes y Análisis</div>
            <div style={{ fontSize:11, color:'#7A7168' }}>
              <strong>{filtered.length}</strong> informes · <strong>{partidos}</strong> partidos únicos
              &nbsp;·&nbsp;Actualizado {new Date().toLocaleDateString('es-ES')}
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={exportCSV} style={{ height:32, padding:'0 12px', fontSize:11, borderRadius:6, border:'1px solid #DDD5CE', background:'#fff', color:'#7A7168', cursor:'pointer', fontWeight:600 }}>↓ CSV</button>
            <BtnP onClick={exportXLS} disabled={exporting||filtered.length===0} style={{ height:32, fontSize:11, padding:'0 12px' }}>{exporting?'…':'↓ XLS'}</BtnP>
            <button onClick={exportIncidencias} disabled={exportingInc||filtered.length===0} style={{ height:32, padding:'0 12px', fontSize:11, borderRadius:6, border:'1px solid #2B75B4', background:'#EBF4FC', color:'#2B75B4', cursor:'pointer', fontWeight:600, opacity: exportingInc||filtered.length===0 ? 0.5 : 1 }}>{exportingInc?'…':'↓ XLS Inc.'}</button>
            <button onClick={exportPdf} disabled={exportingPdf||filtered.length===0} style={{ height:32, padding:'0 12px', fontSize:11, borderRadius:6, border:'1px solid #dc2626', background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontWeight:600, opacity: exportingPdf||filtered.length===0 ? 0.5 : 1 }}>{exportingPdf?'…':'↓ PDF Inc.'}</button>
          </div>
        </div>

        {/* Active chips */}
        {chips.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 }}>
            {chips.map(chip => (
              <span key={chip.key} style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#FEF0EE', border:'1px solid #E8392C40', borderRadius:12, padding:'3px 10px', fontSize:11, color:'#E8392C', fontWeight:600 }}>
                {chip.label}
                <button onClick={chip.clear} style={{ background:'none', border:'none', cursor:'pointer', color:'#E8392C', padding:0, fontSize:13, fontWeight:700 }}>×</button>
              </span>
            ))}
            <button onClick={resetFilters} style={{ fontSize:11, color:'#7A7168', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', padding:'3px 0' }}>Limpiar todo</button>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #DDD5CE', marginBottom:20, overflowX:'auto' }}>
          {[['resumen','Resumen'],['incidencias','Incidencias'],['por_camara','Por Cámara'],['por_jornada','Por Jornada'],['detalle','Detalle']].map(([id,lbl]) => (
            <Tab key={id} label={lbl} active={activeTab===id} onClick={()=>setActiveTab(id)}/>
          ))}
        </div>

        {/* ════ TAB: RESUMEN ════ */}
        {activeTab === 'resumen' && (
          <div>
            {/* KPIs — partidos clasificados */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
              {[
                { label:'Total partidos', val:filtered.length,         color:'#E8392C' },
                { label:'Sin incidencia', val:sinInc,                  color:'#10b981' },
                { label:'Solo leves',     val:soloLeves,               color:'#f59e0b' },
                { label:'Con graves',     val:conGraves,               color:'#dc2626' },
                { label:'Partidos únicos',val:partidos,                color:'#3b82f6' },
              ].map(s => (
                <Card key={s.label} style={{ padding:'12px 14px', borderTop:`3px solid ${s.color}`, marginBottom:0 }}>
                  <div style={{ fontSize:24, fontWeight:700, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:10, color:'#7A7168', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:4 }}>{s.label}</div>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <Card style={{ padding:16 }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Incidencias por bloque de cámara</div>
                {statsByCamera.filter(c=>c.graves+c.leves>0).length === 0
                  ? <div style={{ fontSize:12, color:'#7A7168' }}>Sin incidencias</div>
                  : statsByCamera.filter(c=>c.graves+c.leves>0).map(c => {
                      const max = Math.max(...statsByCamera.map(x=>x.graves+x.leves),1);
                      return <HBar key={c.id} label={`${c.icon} ${c.label}`} val={c.graves+c.leves} max={max} color="#E8392C"/>;
                    })}
              </Card>
              <Card style={{ padding:16 }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Distribución por partido</div>
                <DonutChart sinInc={sinInc} soloLeves={soloLeves} conGraves={conGraves}/>
              </Card>
            </div>

            {/* Heatmap */}
            {heatmapData.length > 0 && jornadasFiltered.length > 0 && (
              <Card style={{ padding:16 }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Mapa de calor — Incidencias por cámara y jornada</div>
                <Heatmap data={heatmapData} jornadas={jornadasFiltered}/>
              </Card>
            )}
          </div>
        )}

        {/* ════ TAB: INCIDENCIAS ════ */}
        {activeTab === 'incidencias' && (
          <Card style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #DDD5CE', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:600 }}>Listado de incidencias</span>
              <Badge>{incidenciasFlat.length}</Badge>
            </div>
            {incidenciasFlat.length === 0
              ? <div style={{ padding:32, textAlign:'center', fontSize:13, color:'#7A7168' }}>No hay incidencias con los filtros aplicados.</div>
              : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr>{['Jornada','Partido','Cámara','Elemento','Tipo','Equipo','Descripción'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {incidenciasFlat.map((r,i) => (
                        <tr key={i} style={{ background:i%2===0?'#fff':'#F5F0EC', borderBottom:'1px solid #EDE8E4' }}>
                          <td style={{ ...TD, color:'#7A7168', fontFamily:'monospace' }}>J{r.jornada}</td>
                          <td style={{ ...TD, fontWeight:500, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.partido}</td>
                          <td style={TD}><CamBadge camId={r.camId}/></td>
                          <td style={{ ...TD, fontWeight:500 }}>{r.elemento}</td>
                          <td style={TD}><TipoBadge tipo={r.tipo}/></td>
                          <td style={{ ...TD, color:'#7A7168' }}>{r.um}</td>
                          <td style={{ ...TD, color:'#7A7168', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.descripcion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Card>
        )}

        {/* ════ TAB: POR CÁMARA ════ */}
        {activeTab === 'por_camara' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              <Card style={{ padding:16 }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Graves por cámara</div>
                {statsByCamera.filter(c=>c.graves>0).length===0
                  ? <div style={{ fontSize:12, color:'#7A7168' }}>Sin graves</div>
                  : statsByCamera.filter(c=>c.graves>0).map(c=><HBar key={c.id} label={`${c.icon} ${c.label}`} val={c.graves} max={Math.max(...statsByCamera.map(x=>x.graves),1)} color="#dc2626"/>)}
              </Card>
              <Card style={{ padding:16 }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Leves por cámara</div>
                {statsByCamera.filter(c=>c.leves>0).length===0
                  ? <div style={{ fontSize:12, color:'#7A7168' }}>Sin leves</div>
                  : statsByCamera.filter(c=>c.leves>0).map(c=><HBar key={c.id} label={`${c.icon} ${c.label}`} val={c.leves} max={Math.max(...statsByCamera.map(x=>x.leves),1)} color="#f59e0b"/>)}
              </Card>
            </div>

            <Card style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #DDD5CE' }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Elementos más problemáticos</span>
              </div>
              {elementosProblematicos.length===0
                ? <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#7A7168' }}>Sin datos</div>
                : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead><tr>{['Cámara','Elemento','Leves','Graves','Total','Índice de riesgo'].map(h=><th key={h} style={{ ...TH, textAlign:['Leves','Graves','Total'].includes(h)?'center':'left' }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {elementosProblematicos.map((d,i) => {
                          const maxR = elementosProblematicos[0]?.riesgo||1;
                          return (
                            <tr key={i} style={{ background:i%2===0?'#fff':'#F5F0EC', borderBottom:'1px solid #EDE8E4' }}>
                              <td style={TD}><CamBadge camId={d.camId}/></td>
                              <td style={{ ...TD, fontWeight:500 }}>{d.elemento}</td>
                              <td style={{ ...TD, textAlign:'center' }}>{d.leves>0?<span style={{ color:'#d97706',fontWeight:700 }}>↓ {d.leves}</span>:<span style={{ color:'#C2B9AD' }}>0</span>}</td>
                              <td style={{ ...TD, textAlign:'center' }}>{d.graves>0?<span style={{ color:'#dc2626',fontWeight:700 }}>⚠ {d.graves}</span>:<span style={{ color:'#C2B9AD' }}>0</span>}</td>
                              <td style={{ ...TD, textAlign:'center', fontWeight:600 }}>{d.total}</td>
                              <td style={TD}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  <div style={{ flex:1, background:'#EDE8E4', borderRadius:3, height:8, overflow:'hidden' }}>
                                    <div style={{ width:`${d.riesgo/maxR*100}%`, height:'100%', background:d.graves>0?'#dc2626':'#f59e0b', borderRadius:3 }}/>
                                  </div>
                                  <span style={{ fontSize:11, color:'#7A7168', minWidth:16 }}>{d.riesgo}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </Card>
          </div>
        )}

        {/* ════ TAB: POR JORNADA ════ */}
        {activeTab === 'por_jornada' && (
          <div>
            <Card style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Evolución por jornada (partidos clasificados)</div>
              {porJornada.length===0
                ? <div style={{ fontSize:12, color:'#7A7168' }}>Sin datos</div>
                : <BarChart data={porJornada}/>}
            </Card>
            <Card style={{ padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Timeline de incidencias</div>
              {porJornada.length===0
                ? <div style={{ fontSize:12, color:'#7A7168' }}>Sin datos</div>
                : porJornada.map(j => (
                  <div key={j.jornada} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }}>
                    <div style={{ minWidth:36, height:36, background:j.conGraves>0?'#fef2f2':j.soloLeves>0?'#fffbeb':'#f0fdf4', border:`1px solid ${j.conGraves>0?'#fca5a5':j.soloLeves>0?'#fcd34d':'#86efac'}`, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:j.conGraves>0?'#dc2626':j.soloLeves>0?'#d97706':'#16a34a', flexShrink:0 }}>J{j.jornada}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:'#7A7168', marginBottom:4 }}>
                        {j.conGraves>0&&<span style={{ marginRight:8, color:'#dc2626', fontWeight:700 }}>⚠ {j.conGraves} con graves</span>}
                        {j.soloLeves>0&&<span style={{ marginRight:8, color:'#d97706', fontWeight:700 }}>↓ {j.soloLeves} solo leves</span>}
                        {j.sinInc>0&&<span style={{ color:'#16a34a', fontWeight:700 }}>✓ {j.sinInc} sin inc.</span>}
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                        {j.items.slice(0,12).map((it,idx) => (
                          <span key={idx} style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:it.status==='G'?'#fef2f2':'#fffbeb', color:it.status==='G'?'#dc2626':'#d97706', border:`1px solid ${it.status==='G'?'#fca5a5':'#fcd34d'}`, fontWeight:600 }}>
                            {it.cam} · {it.item}
                          </span>
                        ))}
                        {j.items.length>12&&<span style={{ fontSize:10, color:'#7A7168', padding:'2px 6px' }}>+{j.items.length-12} más</span>}
                      </div>
                    </div>
                  </div>
                ))}
            </Card>
          </div>
        )}

        {/* ════ TAB: DETALLE ════ */}
        {activeTab === 'detalle' && (
          <Card style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #DDD5CE' }}>
              <span style={{ fontSize:13, fontWeight:600 }}>Informe detallado por partido</span>
              <span style={{ fontSize:11, color:'#7A7168', marginLeft:8 }}>Haz clic en una fila para ver el detalle de cámaras</span>
            </div>
            {filtered.length===0
              ? <div style={{ padding:32, textAlign:'center', fontSize:13, color:'#7A7168' }}>Sin datos.</div>
              : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr>{['','Jornada','Partido','Fecha','Equipo','Tipo servicio','Cámaras','Leves','Graves','Estado'].map(h=><th key={h} style={{ ...TH, textAlign:['Cámaras','Leves','Graves'].includes(h)?'center':'left', width:h===''?28:undefined }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filtered.map((inf,i) => {
                        const camData  = inf.cam_data||{};
                        const numCams  = Object.entries(inf.camaras_activas||{}).filter(([,v])=>v).length;
                        const ts       = TIPOS_SERVICIO.find(t=>t.id===inf.tipo_servicio);
                        const isOpen   = expandedId === inf.id;
                        const rowBg    = i%2===0?'#fff':'#F5F0EC';

                        /* cameras with G/L items OR incident text, in canonical order */
                        const activeCamsDetail = CAM_ORDER
                          .filter(camId => (inf.camaras_activas||{})[camId])
                          .map(camId => {
                            const d = camData[camId]||{};
                            const koItems = Object.entries(d.items||{}).filter(([,v])=>v==='G'||v==='L');
                            return { camId, d, koItems };
                          })
                          .filter(({ koItems, d }) => koItems.length > 0 || d.incidencias);

                        return [
                          <tr key={inf.id}
                            onClick={()=>setExpandedId(isOpen?null:inf.id)}
                            style={{ background:rowBg, borderBottom:isOpen?'none':'1px solid #EDE8E4', cursor:'pointer' }}
                          >
                            <td style={{ ...TD, textAlign:'center', color:'#7A7168', fontSize:10, padding:'8px 4px' }}>{isOpen?'▼':'▶'}</td>
                            <td style={{ ...TD, color:'#7A7168', fontFamily:'monospace' }}>J{inf.jornada}</td>
                            <td style={{ ...TD, fontWeight:500 }}>{inf.encuentro||'—'}</td>
                            <td style={{ ...TD, color:'#7A7168', whiteSpace:'nowrap' }}>{fmt(inf.fecha)}</td>
                            <td style={TD}>{inf.um||'—'}</td>
                            <td style={{ ...TD, color:'#7A7168' }}>{ts?`${ts.icon} ${ts.label}`:'—'}</td>
                            <td style={{ ...TD, textAlign:'center' }}>{numCams}</td>
                            <td style={{ ...TD, textAlign:'center' }}>{(()=>{
                              const camData = inf.cam_data||{}; const ids = filteredCamIds;
                              const l = ids ? ids.reduce((s,c)=>s+Object.values((camData[c]||{}).items||{}).filter(v=>v==='L').length,0) : inf.incidencias_leves||0;
                              return l>0?<span style={{ color:'#d97706',fontWeight:700 }}>↓ {l}</span>:<span style={{ color:'#C2B9AD' }}>0</span>;
                            })()}</td>
                            <td style={{ ...TD, textAlign:'center' }}>{(()=>{
                              const camData = inf.cam_data||{}; const ids = filteredCamIds;
                              const g = ids ? ids.reduce((s,c)=>s+Object.values((camData[c]||{}).items||{}).filter(v=>v==='G').length,0) : inf.incidencias_graves||0;
                              return g>0?<span style={{ color:'#dc2626',fontWeight:700 }}>⚠ {g}</span>:<span style={{ color:'#C2B9AD' }}>0</span>;
                            })()}</td>
                            <td style={TD}>{(()=>{ const cat=classifyFor(inf,filteredCamIds); return <EstadoBadge graves={cat==='graves'?1:0} leves={cat==='leves'?1:0}/>; })()}</td>
                          </tr>,
                          isOpen && (
                            <tr key={`${inf.id}_detail`}>
                              <td colSpan={10} style={{ background:'#fafaf8', borderBottom:'2px solid #DDD5CE', padding:'12px 16px 16px 28px' }}>
                                {activeCamsDetail.length === 0
                                  ? <div style={{ fontSize:12, color:'#10b981', fontWeight:600 }}>✓ Sin incidencias en ninguna cámara</div>
                                  : (
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                                      {activeCamsDetail.map(({ camId, d, koItems }) => {
                                        const block  = CAM_TO_BLOCK[camId];
                                        const color  = CAM_COLORS[camId] || '#7A7168';
                                        const model  = d.equipos ? Object.values(d.equipos).filter(Boolean).join(' · ') : (d.equipo||'');
                                        return (
                                          <div key={camId} style={{ background:'#fff', border:`1px solid ${color}30`, borderLeft:`3px solid ${color}`, borderRadius:6, padding:'8px 12px', minWidth:200, maxWidth:280 }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                                              <span style={{ fontSize:11, fontWeight:700, color }}>{block?.icon} {block?.label||camId}</span>
                                              {model && <span style={{ fontSize:10, color:'#7A7168', fontFamily:'monospace' }}>{model}</span>}
                                            </div>
                                            {koItems.length > 0 && (
                                              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom: d.incidencias ? 6 : 0 }}>
                                                {koItems.map(([item,v])=>(
                                                  <span key={item} style={{ fontSize:10, padding:'2px 6px', borderRadius:3, background:v==='G'?'#fef2f2':'#fffbeb', color:v==='G'?'#dc2626':'#d97706', border:`1px solid ${v==='G'?'#fca5a5':'#fcd34d'}`, fontWeight:700 }}>
                                                    {item}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                            {d.incidencias && (
                                              <div style={{ fontSize:11, color:'#92400e', background:'#fffbeb', borderRadius:4, padding:'4px 6px', marginTop:2 }}>{d.incidencias}</div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                {/* Logística incidents */}
                                {(inf.logistica||{}).incidencias && (
                                  <div style={{ marginTop:10, fontSize:11, color:'#7A7168' }}>
                                    <span style={{ fontWeight:600 }}>Logística: </span>{inf.logistica.incidencias}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ),
                        ];
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </Card>
        )}
      </div>
    </div>
  );
}
