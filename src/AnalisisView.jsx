import { useState, useEffect, useMemo } from "react";
import { apiFetch, Card, BtnP, Badge, SecTitle } from "./App.jsx";

/* ── helpers ── */
const fmt = d => d ? new Date(d).toLocaleDateString('es-ES') : '—';

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
  { id: 'OTROS',       label: 'Otros',       icon: '📷', cams: ['OTROS'] },
];
// camId → block
const CAM_TO_BLOCK = {};
CAM_BLOCKS.forEach(b => b.cams.forEach(c => { CAM_TO_BLOCK[c] = b; }));

/* ── BarChart SVG: incidencias por jornada (apilado G+L) ── */
function BarChart({ data }) {
  if (!data.length) return null;
  const W = 560, H = 180, PAD = { t: 16, r: 16, b: 36, l: 36 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const maxVal = Math.max(...data.map(d => (d.graves || 0) + (d.leves || 0)), 1);
  const barW = Math.min(36, (chartW / data.length) - 6);
  const gap = chartW / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD.t + chartH - t * chartH;
        return <g key={t}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#DDD5CE" strokeWidth={1} />
          <text x={PAD.l - 4} y={y + 4} fontSize={9} fill="#999" textAnchor="end">{Math.round(t * maxVal)}</text>
        </g>;
      })}
      {data.map((d, i) => {
        const x = PAD.l + i * gap + (gap - barW) / 2;
        const gH = chartH * (d.graves || 0) / maxVal;
        const lH = chartH * (d.leves || 0) / maxVal;
        return (
          <g key={d.jornada}>
            <rect x={x} y={PAD.t + chartH - gH - lH} width={barW} height={gH} fill="#dc2626" rx={2} />
            <rect x={x} y={PAD.t + chartH - lH} width={barW} height={lH} fill="#f59e0b" rx={2} />
            <text x={x + barW / 2} y={H - 6} fontSize={9} fill="#555" textAnchor="middle">J{d.jornada}</text>
          </g>
        );
      })}
      <rect x={PAD.l} y={H - 34} width={10} height={8} fill="#dc2626" rx={2} />
      <text x={PAD.l + 13} y={H - 27} fontSize={9} fill="#555">Graves</text>
      <rect x={PAD.l + 52} y={H - 34} width={10} height={8} fill="#f59e0b" rx={2} />
      <text x={PAD.l + 65} y={H - 27} fontSize={9} fill="#555">Leves</text>
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
      <div style={{ fontSize: 11, fontWeight: 600, color: '#7A7168', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
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
const SEL = { width: '100%', height: 32, borderRadius: 6, border: '1px solid #DDD5CE', fontSize: 12, paddingLeft: 8, background: '#fff', color: '#1A1A1A' };
const LBL = { fontSize: 10, fontWeight: 600, color: '#7A7168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };

/* ── Main AnalisisView ── */
export default function AnalisisView() {
  const [informes, setInformes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [fJornada, setFJornada] = useState('');
  const [fUM, setFUM] = useState('');
  const [fBloque, setFBloque] = useState('');   // block id
  const [fUsuario, setFUsuario] = useState('');
  const [fOperador, setFOperador] = useState('');
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
  const usuarios = useMemo(() => [...new Set(informes.map(i => i.submitted_by_name).filter(Boolean))].sort(), [informes]);

  // Bloques activos (que aparecen en algún informe)
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
      if (fJornada && String(inf.jornada) !== fJornada) return false;
      if (fUM && inf.um !== fUM) return false;
      if (fBloque) {
        const block = CAM_BLOCKS.find(b => b.id === fBloque);
        if (!block) return false;
        const activas = inf.camaras_activas || {};
        if (!block.cams.some(c => activas[c])) return false;
      }
      if (fUsuario && inf.submitted_by_name !== fUsuario) return false;
      if (fOperador) {
        const ops = Object.values(inf.operadores || {}).join(' ').toLowerCase();
        if (!ops.includes(fOperador.toLowerCase())) return false;
      }
      if (fTipoInc === 'G' && !(inf.incidencias_graves > 0)) return false;
      if (fTipoInc === 'L' && !(inf.incidencias_leves > 0)) return false;
      if (fTipoInc === 'sin' && (inf.incidencias_graves > 0 || inf.incidencias_leves > 0)) return false;
      return true;
    });
  }, [informes, fJornada, fUM, fBloque, fUsuario, fOperador, fTipoInc]);

  // Stats totales
  const totalG = filtered.reduce((s, i) => s + (i.incidencias_graves || 0), 0);
  const totalL = filtered.reduce((s, i) => s + (i.incidencias_leves || 0), 0);
  const conInc = filtered.filter(i => i.incidencias_graves > 0 || i.incidencias_leves > 0).length;

  // Gráfica global: incidencias por jornada
  const chartJornada = useMemo(() => {
    const map = {};
    informes.forEach(inf => {
      const j = inf.jornada; if (!j) return;
      if (!map[j]) map[j] = { jornada: j, graves: 0, leves: 0 };
      map[j].graves += inf.incidencias_graves || 0;
      map[j].leves  += inf.incidencias_leves  || 0;
    });
    return Object.values(map).sort((a, b) => a.jornada - b.jornada);
  }, [informes]);

  // Gráfica: incidencias por BLOQUE de cámara (items G+L dentro de cam_data)
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

  // Gráfica: técnicos con más incidencias
  const chartTecnicos = useMemo(() => {
    const map = {};
    filtered.forEach(inf => {
      const k = inf.submitted_by_name || 'Desconocido';
      if (!map[k]) map[k] = { label: k, val: 0 };
      map[k].val += (inf.incidencias_graves || 0) + (inf.incidencias_leves || 0);
    });
    return Object.values(map).filter(d => d.val > 0).sort((a, b) => b.val - a.val).slice(0, 8);
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
        // Si hay filtro de bloque, ceñirse solo a ese bloque
        if (fBloque && block.id !== fBloque) return;
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
  }, [filtered, fBloque]);

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

  const clearFilters = () => { setFJornada(''); setFUM(''); setFBloque(''); setFUsuario(''); setFOperador(''); setFTipoInc(''); };
  const hasFilters = fJornada || fUM || fBloque || fUsuario || fOperador || fTipoInc;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#7A7168', fontSize: 13 }}>Cargando análisis...</div>;

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Informes', val: filtered.length, color: '#3b82f6' },
          { label: 'Incidencias Graves', val: totalG, color: '#dc2626' },
          { label: 'Incidencias Leves', val: totalL, color: '#f59e0b' },
          { label: 'Con incidencias', val: conInc, color: '#8b5cf6' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '14px 18px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: '#7A7168', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</div>
          </Card>
        ))}
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, marginBottom: 20, alignItems: 'start' }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7A7168', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Incidencias por jornada (global)</div>
          <BarChart data={chartJornada} />
        </Card>
        {chartBloques.length > 0 && (
          <Card style={{ padding: 16 }}>
            <HBarChart title="Inc. por bloque de cámara" data={chartBloques} colorKey="#3b82f6" />
          </Card>
        )}
        {chartTecnicos.length > 0 && (
          <Card style={{ padding: 16 }}>
            <HBarChart title="Incidencias por técnico" data={chartTecnicos} colorKey="#8b5cf6" />
          </Card>
        )}
      </div>

      {/* Filtros */}
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#7A7168' }}>Filtros</span>
          {hasFilters && (
            <button onClick={clearFilters} style={{ fontSize: 11, color: '#7A7168', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              Limpiar
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
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
            <div style={LBL}>Técnico</div>
            <select value={fUsuario} onChange={e => setFUsuario(e.target.value)} style={SEL}>
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <div style={LBL}>Operador</div>
            <input value={fOperador} onChange={e => setFOperador(e.target.value)} placeholder="Buscar nombre..." style={SEL} />
          </div>
          <div>
            <div style={LBL}>Incidencias</div>
            <select value={fTipoInc} onChange={e => setFTipoInc(e.target.value)} style={SEL}>
              <option value="">Todas</option>
              <option value="G">Con Graves</option>
              <option value="L">Con Leves</option>
              <option value="sin">Sin incidencias</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tabla de informes */}
      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #DDD5CE', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Informes</span>
          <Badge>{filtered.length}</Badge>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#7A7168' }}>No hay informes que coincidan con los filtros.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F5F0EC' }}>
                  {['Jornada', 'Encuentro', 'Fecha', 'UM', 'Técnico', 'J. Técnico', 'Graves', 'Leves'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#7A7168', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #DDD5CE', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inf, i) => (
                  <tr key={inf.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #EDE8E4' : 'none', background: i % 2 === 0 ? '#fff' : '#F5F0EC' }}>
                    <td style={{ padding: '8px 12px', color: '#7A7168' }}>J{inf.jornada || '—'}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{inf.encuentro || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#7A7168', whiteSpace: 'nowrap' }}>{fmt(inf.fecha)}</td>
                    <td style={{ padding: '8px 12px' }}>{inf.um || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{inf.submitted_by_name || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#7A7168' }}>{inf.jefe_tecnico || '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {inf.incidencias_graves > 0
                        ? <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠ {inf.incidencias_graves}</span>
                        : <span style={{ color: '#d1d5db' }}>0</span>}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      {inf.incidencias_leves > 0
                        ? <span style={{ color: '#f59e0b', fontWeight: 700 }}>↓ {inf.incidencias_leves}</span>
                        : <span style={{ color: '#d1d5db' }}>0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Estadísticas por modelo */}
      {modelStats.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #DDD5CE' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Estadísticas por modelo de equipo</span>
            {fBloque && (() => { const b = CAM_BLOCKS.find(x => x.id === fBloque); return b ? <span style={{ marginLeft: 8, fontSize: 11, color: '#7A7168' }}>· {b.icon} {b.label}</span> : null; })()}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F5F0EC' }}>
                  {['Bloque', 'Modelo', 'Usos', 'Items G', 'Items L'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Usos' || h === 'Items G' || h === 'Items L' ? 'center' : 'left', fontSize: 10, fontWeight: 700, color: '#7A7168', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #DDD5CE', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modelStats.map((m, i) => (
                  <tr key={i} style={{ borderBottom: i < modelStats.length - 1 ? '1px solid #EDE8E4' : 'none', background: i % 2 === 0 ? '#fff' : '#F5F0EC' }}>
                    <td style={{ padding: '7px 12px', fontWeight: 500 }}>{m.icon} {m.bloque}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11 }}>{m.modelo}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'center', color: '#7A7168' }}>{m.usos}</td>
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
    </div>
  );
}
