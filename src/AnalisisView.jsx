import { useState, useEffect, useMemo } from "react";
import { apiFetch, Card, BtnP, BtnO, Badge, SecTitle, Select, Input, Field } from "./App.jsx";

/* ── helpers ── */
const fmt = d => d ? new Date(d).toLocaleDateString('es-ES') : '—';

/* ── BarChart: incidencias por jornada (SVG) ── */
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
      {/* Y grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD.t + chartH - t * chartH;
        return <g key={t}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e4e4e7" strokeWidth={1} />
          <text x={PAD.l - 4} y={y + 4} fontSize={9} fill="#999" textAnchor="end">{Math.round(t * maxVal)}</text>
        </g>;
      })}
      {data.map((d, i) => {
        const x = PAD.l + i * gap + (gap - barW) / 2;
        const gH = chartH * (d.graves || 0) / maxVal;
        const lH = chartH * (d.leves || 0) / maxVal;
        return (
          <g key={d.jornada}>
            {/* Graves (red, top) */}
            <rect x={x} y={PAD.t + chartH - gH - lH} width={barW} height={gH} fill="#dc2626" rx={2} />
            {/* Leves (amber, bottom) */}
            <rect x={x} y={PAD.t + chartH - lH} width={barW} height={lH} fill="#f59e0b" rx={2} />
            <text x={x + barW / 2} y={H - 6} fontSize={9} fill="#555" textAnchor="middle">J{d.jornada}</text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={PAD.l} y={H - 34} width={10} height={8} fill="#dc2626" rx={2} />
      <text x={PAD.l + 13} y={H - 27} fontSize={9} fill="#555">Graves</text>
      <rect x={PAD.l + 52} y={H - 34} width={10} height={8} fill="#f59e0b" rx={2} />
      <text x={PAD.l + 65} y={H - 27} fontSize={9} fill="#555">Leves</text>
    </svg>
  );
}

/* ── HBarChart: incidencias por cámara o por usuario ── */
function HBarChart({ title, data, colorKey = '#3b82f6' }) {
  if (!data.length) return null;
  const W = 280, barH = 16, gap = 6, PAD = { t: 0, r: 60, b: 0, l: 100 };
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
          return (
            <g key={d.label}>
              <text x={PAD.l - 4} y={y + barH - 4} fontSize={9} fill="#555" textAnchor="end"
                style={{ fontFamily: 'sans-serif' }}>
                {d.label.length > 13 ? d.label.slice(0, 12) + '…' : d.label}
              </text>
              <rect x={PAD.l} y={y} width={bW} height={barH} fill={colorKey} rx={2} opacity={0.85} />
              <text x={PAD.l + bW + 4} y={y + barH - 4} fontSize={9} fill="#555">{d.val}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Main AnalisisView ── */
export default function AnalisisView() {
  const [informes, setInformes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [fJornada, setFJornada] = useState('');
  const [fUM, setFUM] = useState('');
  const [fCamara, setFCamara] = useState('');
  const [fUsuario, setFUsuario] = useState('');
  const [fOperador, setFOperador] = useState('');
  const [fTipoInc, setFTipoInc] = useState(''); // '' | 'G' | 'L' | 'sin'

  useEffect(() => {
    apiFetch('/api/analisis')
      .then(r => r.json())
      .then(d => { setInformes(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Unique filter options
  const jornadas = useMemo(() => [...new Set(informes.map(i => i.jornada).filter(Boolean))].sort((a, b) => a - b), [informes]);
  const ums = useMemo(() => [...new Set(informes.map(i => i.um).filter(Boolean))].sort(), [informes]);
  const usuarios = useMemo(() => [...new Set(informes.map(i => i.submitted_by_name).filter(Boolean))].sort(), [informes]);
  const camaras = useMemo(() => {
    const set = new Set();
    informes.forEach(inf => Object.entries(inf.camaras_activas || {}).forEach(([k, v]) => { if (v) set.add(k); }));
    return [...set].sort();
  }, [informes]);

  // Filtered informes
  const filtered = useMemo(() => {
    return informes.filter(inf => {
      if (fJornada && String(inf.jornada) !== fJornada) return false;
      if (fUM && inf.um !== fUM) return false;
      if (fCamara && !(inf.camaras_activas || {})[fCamara]) return false;
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
  }, [informes, fJornada, fUM, fCamara, fUsuario, fOperador, fTipoInc]);

  // Stats
  const totalG = filtered.reduce((s, i) => s + (i.incidencias_graves || 0), 0);
  const totalL = filtered.reduce((s, i) => s + (i.incidencias_leves || 0), 0);
  const conInc = filtered.filter(i => i.incidencias_graves > 0 || i.incidencias_leves > 0).length;

  // Chart: incidencias por jornada (using ALL informes for global chart, filtered for detail)
  const chartDataGlobal = useMemo(() => {
    const map = {};
    informes.forEach(inf => {
      const j = inf.jornada;
      if (!j) return;
      if (!map[j]) map[j] = { jornada: j, graves: 0, leves: 0 };
      map[j].graves += inf.incidencias_graves || 0;
      map[j].leves += inf.incidencias_leves || 0;
    });
    return Object.values(map).sort((a, b) => a.jornada - b.jornada);
  }, [informes]);

  // Chart: top cámaras con incidencias (filtered)
  const chartCamaras = useMemo(() => {
    const map = {};
    filtered.forEach(inf => {
      const camData = inf.cam_data || {};
      Object.entries(camData).forEach(([camId, cam]) => {
        const items = cam.items || {};
        const g = Object.values(items).filter(v => v === 'G').length;
        const l = Object.values(items).filter(v => v === 'L').length;
        if (g + l === 0) return;
        if (!map[camId]) map[camId] = { label: camId, val: 0 };
        map[camId].val += g + l;
      });
    });
    return Object.values(map).sort((a, b) => b.val - a.val).slice(0, 8);
  }, [filtered]);

  // Chart: técnicos con más incidencias (filtered)
  const chartTecnicos = useMemo(() => {
    const map = {};
    filtered.forEach(inf => {
      const k = inf.submitted_by_name || 'Desconocido';
      if (!map[k]) map[k] = { label: k, val: 0 };
      map[k].val += (inf.incidencias_graves || 0) + (inf.incidencias_leves || 0);
    });
    return Object.values(map).filter(d => d.val > 0).sort((a, b) => b.val - a.val).slice(0, 8);
  }, [filtered]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const ids = filtered.map(i => i.id);
      const res = await apiFetch('/api/analisis/export', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analisis-ccee.xlsx';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch { alert('Error exportando Excel'); }
    setExporting(false);
  };

  const clearFilters = () => {
    setFJornada(''); setFUM(''); setFCamara('');
    setFUsuario(''); setFOperador(''); setFTipoInc('');
  };

  const hasFilters = fJornada || fUM || fCamara || fUsuario || fOperador || fTipoInc;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#71717a', fontSize: 13 }}>Cargando análisis...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
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
            <div style={{ fontSize: 11, color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.val}</div>
          </Card>
        ))}
      </div>

      {/* Global chart + Camera & User charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, marginBottom: 20, alignItems: 'start' }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Incidencias por jornada (global)</div>
          <BarChart data={chartDataGlobal} />
        </Card>
        {chartCamaras.length > 0 && (
          <Card style={{ padding: 16 }}>
            <HBarChart title="Incidencias por cámara" data={chartCamaras} colorKey="#3b82f6" />
          </Card>
        )}
        {chartTecnicos.length > 0 && (
          <Card style={{ padding: 16 }}>
            <HBarChart title="Incidencias por técnico" data={chartTecnicos} colorKey="#8b5cf6" />
          </Card>
        )}
      </div>

      {/* Filters */}
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
            <div style={{ fontSize: 10, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Jornada</div>
            <select value={fJornada} onChange={e => setFJornada(e.target.value)}
              style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid #d4d4d8', fontSize: 12, paddingLeft: 8, background: '#fff', color: '#18181b' }}>
              <option value="">Todas</option>
              {jornadas.map(j => <option key={j} value={j}>Jornada {j}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Equipo (UM)</div>
            <select value={fUM} onChange={e => setFUM(e.target.value)}
              style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid #d4d4d8', fontSize: 12, paddingLeft: 8, background: '#fff', color: '#18181b' }}>
              <option value="">Todos</option>
              {ums.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Cámara</div>
            <select value={fCamara} onChange={e => setFCamara(e.target.value)}
              style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid #d4d4d8', fontSize: 12, paddingLeft: 8, background: '#fff', color: '#18181b' }}>
              <option value="">Todas</option>
              {camaras.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Técnico</div>
            <select value={fUsuario} onChange={e => setFUsuario(e.target.value)}
              style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid #d4d4d8', fontSize: 12, paddingLeft: 8, background: '#fff', color: '#18181b' }}>
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Operador</div>
            <input value={fOperador} onChange={e => setFOperador(e.target.value)} placeholder="Buscar nombre..."
              style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid #d4d4d8', fontSize: 12, paddingLeft: 8, background: '#fff', color: '#18181b' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Incidencias</div>
            <select value={fTipoInc} onChange={e => setFTipoInc(e.target.value)}
              style={{ width: '100%', height: 32, borderRadius: 6, border: '1px solid #d4d4d8', fontSize: 12, paddingLeft: 8, background: '#fff', color: '#18181b' }}>
              <option value="">Todas</option>
              <option value="G">Con Graves</option>
              <option value="L">Con Leves</option>
              <option value="sin">Sin incidencias</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Results table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Informes</span>
          <Badge>{filtered.length}</Badge>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#71717a' }}>No hay informes que coincidan con los filtros.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Jornada', 'Encuentro', 'Fecha', 'UM', 'Técnico', 'J. Técnico', 'Graves', 'Leves'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e4e4e7', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inf, i) => (
                  <tr key={inf.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f4f4f5' : 'none', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '8px 12px', color: '#71717a' }}>J{inf.jornada || '—'}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{inf.encuentro || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#71717a', whiteSpace: 'nowrap' }}>{fmt(inf.fecha)}</td>
                    <td style={{ padding: '8px 12px' }}>{inf.um || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{inf.submitted_by_name || '—'}</td>
                    <td style={{ padding: '8px 12px', color: '#71717a' }}>{inf.jefe_tecnico || '—'}</td>
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
    </div>
  );
}
