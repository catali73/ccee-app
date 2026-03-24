import { useState, useEffect, useCallback } from 'react';
import { apiFetch, OPERATOR_GROUPS } from './App.jsx';

const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES', {
  weekday:'short', day:'2-digit', month:'short', year:'numeric'
}) : '—';

function getRol(operadores, nombreOperador) {
  if (!operadores || !nombreOperador) return null;
  for (const g of OPERATOR_GROUPS) {
    for (const r of g.roles) {
      if ((operadores[r.key] || '').toLowerCase() === nombreOperador.toLowerCase())
        return `${g.label} · ${r.label}`;
    }
  }
  return null;
}

/* ── Detalle de un evento ────────────────────────────────── */
function EventoDetalle({ servicioId, nombreOperador, onBack }) {
  const [s, setS]         = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/mis-servicios/${servicioId}`)
      .then(r => r.json()).then(d => { setS(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [servicioId]);

  if (loading) return <div style={{padding:32,textAlign:'center',color:'#7A7168'}}>Cargando...</div>;
  if (!s)      return <div style={{padding:32,textAlign:'center',color:'#dc2626'}}>No disponible</div>;

  const rolInfo = getRol(s.operadores, nombreOperador);
  const docs    = s.documentos || [];
  const allOps  = OPERATOR_GROUPS.flatMap(g => g.roles
    .filter(r => s.operadores?.[r.key])
    .map(r => ({
      label: `${g.label} · ${r.label}`,
      nombre: s.operadores[r.key],
      esYo: (s.operadores[r.key]||'').toLowerCase() === (nombreOperador||'').toLowerCase(),
    }))
  );

  const row = (label, val) => val ? (
    <div style={{display:'flex',gap:12,padding:'7px 0',borderBottom:'1px solid #f3f4f6',fontSize:13}}>
      <span style={{color:'#7A7168',minWidth:130,flexShrink:0}}>{label}</span>
      <span style={{fontWeight:500}}>{val}</span>
    </div>
  ) : null;

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'0 20px 60px'}}>
      <button onClick={onBack} style={{
        display:'flex',alignItems:'center',gap:6,padding:'14px 0',
        background:'transparent',border:'none',cursor:'pointer',color:'#E8392C',fontSize:13,fontWeight:600,
      }}>← Volver a mis eventos</button>

      {/* Cabecera */}
      <div style={{background:'#1A1A1A',borderRadius:10,padding:'16px 20px',marginBottom:16,color:'#fff'}}>
        {s.jornada && <div style={{fontSize:11,color:'#E8392C',fontWeight:700,letterSpacing:'0.08em',marginBottom:4}}>{s.jornada}</div>}
        <div style={{fontSize:18,fontWeight:800,lineHeight:1.3,marginBottom:8}}>{s.encuentro || '—'}</div>
        <div style={{display:'flex',gap:16,fontSize:12,color:'#C2B9AD',flexWrap:'wrap'}}>
          <span>📅 {fmt(s.fecha)}</span>
          <span>⏰ KO {s.hora_partido || '—'}</span>
          {s.hora_citacion && <span>🔔 Cit. {s.hora_citacion}</span>}
        </div>
        {rolInfo && (
          <div style={{marginTop:10,display:'inline-flex',padding:'3px 12px',borderRadius:10,
            background:'#E8392C',fontSize:12,fontWeight:700}}>
            {rolInfo}
          </div>
        )}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {/* Datos */}
        <div style={{background:'#fff',borderRadius:8,border:'1px solid #DDD5CE',padding:'14px 16px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#7A7168',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Datos del evento</div>
          {row('Responsable', s.responsable)}
          {row('Unidad Móvil', s.um)}
          {row('Hora citación', s.hora_citacion)}
          {row('Jefe Técnico', s.jefe_tecnico)}
          {row('Realizador', s.realizador)}
          {row('Productor', s.productor)}
        </div>

        {/* Equipo */}
        {allOps.length > 0 && (
          <div style={{background:'#fff',borderRadius:8,border:'1px solid #DDD5CE',padding:'14px 16px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#7A7168',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Equipo asignado</div>
            {allOps.map((op, i) => (
              <div key={i} style={{
                display:'flex',gap:8,padding:'6px 6px',borderBottom:'1px solid #f3f4f6',fontSize:13,
                background:op.esYo?'#eff6ff':'transparent',borderRadius:op.esYo?4:0,
              }}>
                <span style={{color:'#7A7168',minWidth:150,flexShrink:0,fontSize:12}}>{op.label}</span>
                <span style={{fontWeight:op.esYo?700:500,color:op.esYo?'#1d4ed8':'#1a2a3a'}}>
                  {op.nombre}{op.esYo?' ← tú':''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Documentos */}
        <div style={{background:'#fff',borderRadius:8,border:'1px solid #DDD5CE',padding:'14px 16px'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#7A7168',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Documentos</div>
          {docs.length === 0
            ? <div style={{fontSize:13,color:'#9ca3af'}}>Sin documentos adjuntos</div>
            : docs.map(doc => (
              <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',
                  borderBottom:'1px solid #f3f4f6',textDecoration:'none',color:'#1d4ed8'}}>
                <span style={{fontSize:16}}>{doc.tipo==='pdf'?'📄':doc.tipo==='imagen'?'🖼️':'📎'}</span>
                <span style={{fontSize:13,fontWeight:500}}>{doc.nombre}</span>
              </a>
            ))
          }
        </div>
      </div>
    </div>
  );
}

/* ── Lista principal ─────────────────────────────────────── */
export default function MisEventosTab({ user }) {
  const [eventos, setEventos]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [nombreOp, setNombreOp] = useState('');
  const [filtro, setFiltro]     = useState('proximos');
  const [detalle, setDetalle]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/api/mis-servicios')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setEventos(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    apiFetch('/api/auth/me').then(r => r.json())
      .then(u => { if (u.operador_nombre) setNombreOp(u.operador_nombre); });
  }, [load]);

  if (detalle) return (
    <EventoDetalle servicioId={detalle} nombreOperador={nombreOp} onBack={() => setDetalle(null)} />
  );

  const hoy      = new Date(); hoy.setHours(0,0,0,0);
  const proximos = eventos.filter(e => !e.fecha || new Date(e.fecha) >= hoy);
  const lista    = filtro === 'proximos' ? proximos : eventos;

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'24px 20px 80px'}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:600,margin:0,marginBottom:4}}>Mis eventos como operador</h1>
        <p style={{fontSize:13,color:'#7A7168',margin:0}}>
          Eventos donde apareces asignado · Temporada 25/26
        </p>
      </div>

      {/* Tabs próximos/todos */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:'#e5e7eb',borderRadius:8,padding:4}}>
        {[{k:'proximos',l:`Próximos (${proximos.length})`},{k:'todos',l:`Todos (${eventos.length})`}].map(t=>(
          <button key={t.k} onClick={()=>setFiltro(t.k)} style={{
            flex:1,padding:'7px 0',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
            background:filtro===t.k?'#fff':'transparent',
            color:filtro===t.k?'#E8392C':'#6b7280',
            boxShadow:filtro===t.k?'0 1px 3px rgba(0,0,0,0.1)':'none',
          }}>{t.l}</button>
        ))}
      </div>

      {loading && <div style={{textAlign:'center',color:'#7A7168',padding:40}}>Cargando...</div>}

      {!loading && lista.length === 0 && (
        <div style={{textAlign:'center',color:'#9ca3af',padding:'48px 0',fontSize:14}}>
          {filtro==='proximos'
            ? 'No tienes eventos próximos como operador.'
            : 'No tienes eventos asignados como operador.'}
          {!nombreOp && <div style={{marginTop:8,fontSize:12,color:'#d97706'}}>
            ⚠️ Tu cuenta no está vinculada al pool de operadores. Contacta con el coordinador.
          </div>}
        </div>
      )}

      {!loading && lista.map(e => {
        const hoy2  = new Date(); hoy2.setHours(0,0,0,0);
        const fecha = e.fecha ? new Date(e.fecha) : null;
        const pasado = fecha && fecha < hoy2;
        const rol   = getRol(e.operadores, nombreOp);
        // Intentar también en campos de personal si no hay rol en operadores
        const rolPersonal = !rol && nombreOp && [
          e.responsable && (e.responsable.toLowerCase() === nombreOp.toLowerCase()) && 'Responsable CCEE',
          e.jefe_tecnico && (e.jefe_tecnico.toLowerCase() === nombreOp.toLowerCase()) && 'Jefe Técnico',
          e.realizador   && (e.realizador.toLowerCase()   === nombreOp.toLowerCase()) && 'Realizador',
          e.productor    && (e.productor.toLowerCase()    === nombreOp.toLowerCase()) && 'Productor',
        ].find(Boolean);
        const rolMostrado = rol || rolPersonal;

        return (
          <div key={e.id} onClick={() => setDetalle(e.id)} style={{
            background:pasado?'#fafafa':'#fff',
            border:'1px solid #DDD5CE',
            borderLeft:`4px solid ${pasado?'#d1d5db':'#E8392C'}`,
            borderRadius:8,padding:'14px 16px',cursor:'pointer',
            opacity:pasado?0.7:1,marginBottom:10,
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
              <div style={{fontSize:12,fontWeight:600,color:pasado?'#9ca3af':'#E8392C'}}>
                {e.jornada || 'Sin jornada'}
              </div>
              <div style={{fontSize:12,color:'#7A7168'}}>{fmt(e.fecha)}</div>
            </div>
            <div style={{fontSize:15,fontWeight:700,color:'#1a2a3a',marginBottom:5,lineHeight:1.3}}>
              {e.encuentro || '—'}
            </div>
            <div style={{fontSize:12,color:'#7A7168',marginBottom:rolMostrado?6:0}}>
              ⏰ KO {e.hora_partido||'—'}
              {e.hora_citacion && ` · Cit. ${e.hora_citacion}`}
            </div>
            {rolMostrado && (
              <span style={{
                display:'inline-flex',fontSize:11,padding:'2px 8px',borderRadius:10,
                background:'#eff6ff',border:'1px solid #bfdbfe',color:'#1d4ed8',fontWeight:600,
              }}>{rolMostrado}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
