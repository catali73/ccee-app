import { useState, useEffect, useCallback } from 'react';
import { apiFetch, OPERATOR_GROUPS } from './App.jsx';

const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-ES', { weekday:'short', day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtHora  = (h) => h || '—';

// Encontrar el rol de un operador en un servicio
function getRol(operadores, nombreOperador) {
  if (!operadores) return null;
  for (const grupo of OPERATOR_GROUPS) {
    for (const rol of grupo.roles) {
      if (operadores[rol.key] === nombreOperador) return { grupo: grupo.label, rol: rol.label };
    }
  }
  return null;
}

// ── HEADER ───────────────────────────────────────────────────
function Header({ user, onLogout, onCuenta }) {
  return (
    <header style={{background:'#1A1A1A',borderBottom:'3px solid #E8392C',position:'sticky',top:0,zIndex:100}}>
      <div style={{maxWidth:600,margin:'0 auto',padding:'0 16px',height:54,display:'flex',alignItems:'center',gap:12}}>
        <img src="/logo.png" alt="CCEE" style={{height:36,width:36,objectFit:'contain'}} />
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:'#fff',letterSpacing:'0.05em'}}>MIS PARTIDOS</div>
          <div style={{fontSize:10,color:'#C2B9AD'}}>{user.name}</div>
        </div>
        <button onClick={onCuenta}
          style={{height:28,fontSize:11,padding:'0 10px',borderRadius:6,border:'1px solid #555',
            background:'transparent',color:'#C2B9AD',cursor:'pointer'}}>
          🔑
        </button>
        <button onClick={onLogout}
          style={{height:28,fontSize:11,padding:'0 12px',borderRadius:6,border:'1px solid #555',
            background:'transparent',color:'#C2B9AD',cursor:'pointer'}}>
          Salir
        </button>
      </div>
    </header>
  );
}

// ── CAMBIAR CONTRASEÑA ────────────────────────────────────────
function CambiarPassword({ onBack }) {
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' });
  const [msg,  setMsg]  = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.nueva !== form.confirmar) { setMsg({ ok: false, text: 'Las contraseñas nuevas no coinciden' }); return; }
    if (form.nueva.length < 6) { setMsg({ ok: false, text: 'Mínimo 6 caracteres' }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: form.actual, new_password: form.nueva }),
      });
      const d = await r.json();
      if (d.ok) { setMsg({ ok: true, text: 'Contraseña actualizada correctamente' }); setForm({ actual: '', nueva: '', confirmar: '' }); }
      else setMsg({ ok: false, text: d.error || 'Error al cambiar contraseña' });
    } catch { setMsg({ ok: false, text: 'Error de conexión' }); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 16px 60px' }}>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, padding:'14px 0',
        background:'transparent', border:'none', cursor:'pointer', color:'#E8392C', fontSize:13, fontWeight:600 }}>
        ← Volver
      </button>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Mi cuenta</h2>
      <p style={{ fontSize: 13, color: '#7A7168', marginBottom: 20 }}>Cambia tu contraseña de acceso</p>
      <form onSubmit={submit} style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:'20px', display:'flex', flexDirection:'column', gap:14 }}>
        {[['actual','Contraseña actual','current-password'],['nueva','Nueva contraseña','new-password'],['confirmar','Confirmar nueva contraseña','new-password']].map(([k,label,ac])=>(
          <div key={k}>
            <div style={{fontSize:11,fontWeight:600,color:'#374151',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</div>
            <input type="password" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
              required autoComplete={ac} placeholder={k==='nueva'?'Mínimo 6 caracteres':''}
              style={{width:'100%',padding:'8px 10px',borderRadius:6,border:'1px solid #d1d5db',fontSize:13,boxSizing:'border-box'}} />
          </div>
        ))}
        {msg && (
          <div style={{ fontSize:13, padding:'8px 12px', borderRadius:6, border:`1px solid ${msg.ok?'#bbf7d0':'#fecaca'}`, background:msg.ok?'#f0fdf4':'#fef2f2', color:msg.ok?'#16a34a':'#dc2626' }}>
            {msg.text}
          </div>
        )}
        <button type="submit" disabled={saving} style={{ padding:'10px', borderRadius:8, border:'none', background:'#E8392C', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:saving?0.6:1 }}>
          {saving ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  );
}

// ── TARJETA DE SERVICIO EN LISTA ─────────────────────────────
function ServicioCard({ servicio, nombreOperador, onClick }) {
  const hoy    = new Date(); hoy.setHours(0,0,0,0);
  const fecha  = servicio.fecha ? new Date(servicio.fecha) : null;
  const pasado = fecha && fecha < hoy;
  const rolInfo = getRol(servicio.operadores, nombreOperador);

  return (
    <button onClick={onClick} style={{
      width:'100%', textAlign:'left', background: pasado ? '#fafafa' : '#fff',
      border:'1px solid #e5e7eb', borderLeft:`4px solid ${pasado ? '#d1d5db' : '#E8392C'}`,
      borderRadius:8, padding:'14px 16px', cursor:'pointer',
      opacity: pasado ? 0.7 : 1, marginBottom:10,
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
        <div style={{fontSize:12,fontWeight:600,color: pasado?'#9ca3af':'#E8392C',letterSpacing:'0.04em'}}>
          {servicio.jornada || 'Sin jornada'}
        </div>
        <div style={{fontSize:12,color:'#6b7280'}}>{fmtFecha(servicio.fecha)}</div>
      </div>
      <div style={{fontSize:15,fontWeight:700,color:'#111827',marginBottom:4,lineHeight:1.3}}>
        {servicio.encuentro || '—'}
      </div>
      <div style={{display:'flex',gap:12,alignItems:'center',fontSize:12,color:'#6b7280'}}>
        <span>⏰ KO {fmtHora(servicio.hora_partido)}</span>
        {servicio.hora_citacion && <span>· Cit. {servicio.hora_citacion}</span>}
      </div>
      {rolInfo && (
        <div style={{marginTop:6,display:'inline-flex',alignItems:'center',gap:4,
          padding:'2px 8px',borderRadius:10,background:'#eff6ff',border:'1px solid #bfdbfe',fontSize:11,color:'#1d4ed8',fontWeight:600}}>
          {rolInfo.grupo} · {rolInfo.rol}
        </div>
      )}
    </button>
  );
}

// ── HELPERS DOCUMENTOS ───────────────────────────────────────
async function abrirDocumento(docId) {
  try {
    const r = await apiFetch(`/api/documentos/${docId}`);
    const data = await r.json();
    if (!data.datos) return;
    const idx = data.datos.indexOf(',');
    const mime = idx > 0 ? data.datos.slice(5, data.datos.indexOf(';')) : 'application/octet-stream';
    const b64  = idx > 0 ? data.datos.slice(idx + 1) : data.datos;
    const arr  = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const url  = URL.createObjectURL(new Blob([arr], { type: mime }));
    window.open(url, '_blank');
  } catch(e) { alert('Error al abrir el documento'); }
}

async function descargarHoja(servicioId) {
  try {
    const r = await apiFetch(`/api/servicios/${servicioId}/hoja-pdf`);
    if (!r.ok) { alert('Sin acceso a la hoja de servicio'); return; }
    const url = URL.createObjectURL(await r.blob());
    window.open(url, '_blank');
  } catch(e) { alert('Error al generar la hoja: ' + e.message); }
}

// ── DETALLE DE SERVICIO ──────────────────────────────────────
function ServicioDetalle({ servicioId, nombreOperador, onBack }) {
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/mis-servicios/${servicioId}`)
      .then(r => r.json())
      .then(d => { setS(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [servicioId]);

  if (loading) return <div style={{padding:32,textAlign:'center',color:'#6b7280'}}>Cargando...</div>;
  if (!s) return <div style={{padding:32,textAlign:'center',color:'#dc2626'}}>No disponible</div>;

  const rolInfo   = getRol(s.operadores, nombreOperador);
  const docs      = s.documentos || [];
  const allOps    = OPERATOR_GROUPS.flatMap(g => g.roles.filter(r => s.operadores?.[r.key]).map(r => ({
    grupo: g.label, rol: r.label, nombre: s.operadores[r.key], esYo: s.operadores[r.key] === nombreOperador,
  })));

  const row = (label, val) => val ? (
    <div style={{display:'flex',gap:12,padding:'7px 0',borderBottom:'1px solid #f3f4f6',fontSize:13}}>
      <span style={{color:'#6b7280',minWidth:130,flexShrink:0}}>{label}</span>
      <span style={{fontWeight:500,color:'#111827'}}>{val}</span>
    </div>
  ) : null;

  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'0 0 40px'}}>
      {/* Back */}
      <button onClick={onBack} style={{
        display:'flex',alignItems:'center',gap:6,padding:'12px 16px',
        background:'transparent',border:'none',cursor:'pointer',color:'#E8392C',fontSize:13,fontWeight:600,
      }}>← Volver</button>

      {/* Cabecera */}
      <div style={{padding:'16px',background:'#1A1A1A',color:'#fff',marginBottom:16}}>
        {s.jornada&&<div style={{fontSize:11,color:'#E8392C',fontWeight:700,letterSpacing:'0.08em',marginBottom:4}}>{s.jornada}</div>}
        <div style={{fontSize:18,fontWeight:800,lineHeight:1.3,marginBottom:8}}>{s.encuentro || '—'}</div>
        <div style={{display:'flex',gap:16,fontSize:12,color:'#C2B9AD',flexWrap:'wrap'}}>
          <span>📅 {fmtFecha(s.fecha)}</span>
          <span>⏰ KO {fmtHora(s.hora_partido)}</span>
          {s.hora_citacion && <span>🔔 Cit. {s.hora_citacion}</span>}
        </div>
        {rolInfo && (
          <div style={{marginTop:10,display:'inline-flex',padding:'3px 10px',borderRadius:10,
            background:'#E8392C',fontSize:12,fontWeight:700,color:'#fff'}}>
            Tu rol: {rolInfo.grupo} · {rolInfo.rol}
          </div>
        )}
      </div>

      <div style={{padding:'0 16px',display:'flex',flexDirection:'column',gap:16}}>
        {/* Datos del partido */}
        <div style={{background:'#fff',borderRadius:8,border:'1px solid #e5e7eb',padding:'14px 16px'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Datos del partido</div>
          {row('Responsable', s.responsable)}
          {row('Unidad Móvil', s.um)}
          {row('Hora citación', s.hora_citacion)}
          {row('Jefe Técnico', s.jefe_tecnico)}
          {row('Realizador', s.realizador)}
          {row('Productor', s.productor)}
        </div>

        {/* Equipo */}
        {allOps.length > 0 && (
          <div style={{background:'#fff',borderRadius:8,border:'1px solid #e5e7eb',padding:'14px 16px'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Equipo asignado</div>
            {allOps.map((op, i) => (
              <div key={i} style={{display:'flex',gap:8,padding:'6px 0',borderBottom:'1px solid #f3f4f6',
                fontSize:13, background: op.esYo ? '#eff6ff' : 'transparent', margin:'0 -4px', padding:'6px 4px', borderRadius: op.esYo?4:0}}>
                <span style={{color:'#6b7280',minWidth:130,flexShrink:0,fontSize:12}}>{op.rol}</span>
                <span style={{fontWeight: op.esYo ? 700 : 500, color: op.esYo ? '#1d4ed8' : '#111827'}}>
                  {op.nombre}{op.esYo ? ' ← tú' : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Hoja de servicio */}
        <button onClick={() => descargarHoja(s.id)} style={{
          width:'100%',padding:'12px',borderRadius:8,border:'2px solid #E8392C',
          background:'#fff',color:'#E8392C',fontSize:13,fontWeight:700,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',gap:8,
        }}>
          📋 Ver hoja de servicio
        </button>

        {/* Documentos */}
        <div style={{background:'#fff',borderRadius:8,border:'1px solid #e5e7eb',padding:'14px 16px'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Documentos adjuntos</div>
          {docs.length === 0
            ? <div style={{fontSize:13,color:'#9ca3af'}}>Sin documentos adjuntos</div>
            : docs.map(doc => (
              <button key={doc.id} onClick={() => abrirDocumento(doc.id)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #f3f4f6',
                  width:'100%',textAlign:'left',background:'none',border:'none',cursor:'pointer',color:'#1d4ed8'}}>
                <span style={{fontSize:18}}>
                  {doc.tipo?.includes('pdf')?'📄':doc.tipo?.includes('image')?'🖼️':'📎'}
                </span>
                <span style={{fontSize:13,fontWeight:500}}>{doc.nombre}</span>
              </button>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── VISTA PRINCIPAL ──────────────────────────────────────────
export default function OperadorView({ user, onLogout }) {
  const [servicios, setServicios]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [detalle, setDetalle]       = useState(null);
  const [nombreOp, setNombreOp]     = useState('');
  const [filtro, setFiltro]         = useState('proximos');
  const [verCuenta, setVerCuenta]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/api/mis-servicios')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setServicios(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    apiFetch('/api/auth/me').then(r=>r.json()).then(u=>{ if(u.operador_nombre) setNombreOp(u.operador_nombre); });
  }, [load]);

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const proximos = servicios.filter(s => !s.fecha || new Date(s.fecha) >= hoy);
  const lista    = filtro === 'proximos' ? proximos : servicios;

  if (detalle) return (
    <>
      <Header user={user} onLogout={onLogout} onCuenta={() => { setDetalle(null); setVerCuenta(true); }} />
      <ServicioDetalle servicioId={detalle} nombreOperador={nombreOp} onBack={() => setDetalle(null)} />
    </>
  );

  if (verCuenta) return (
    <>
      <Header user={user} onLogout={onLogout} onCuenta={() => setVerCuenta(false)} />
      <CambiarPassword onBack={() => setVerCuenta(false)} />
    </>
  );

  return (
    <>
      <Header user={user} onLogout={onLogout} onCuenta={() => setVerCuenta(true)} />
      <div style={{maxWidth:600,margin:'0 auto',padding:'16px 16px 40px'}}>

        {/* Tabs próximos/todos */}
        <div style={{display:'flex',gap:4,marginBottom:16,background:'#f3f4f6',borderRadius:8,padding:4}}>
          {[{k:'proximos',l:`Próximos (${proximos.length})`},{k:'todos',l:`Todos (${servicios.length})`}].map(t=>(
            <button key={t.k} onClick={()=>setFiltro(t.k)} style={{
              flex:1,padding:'7px 0',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
              background: filtro===t.k ? '#fff' : 'transparent',
              color: filtro===t.k ? '#E8392C' : '#6b7280',
              boxShadow: filtro===t.k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>{t.l}</button>
          ))}
        </div>

        {loading && <div style={{textAlign:'center',color:'#6b7280',padding:32}}>Cargando...</div>}

        {!loading && lista.length === 0 && (
          <div style={{textAlign:'center',color:'#9ca3af',padding:40,fontSize:14}}>
            {filtro==='proximos' ? 'No tienes partidos próximos asignados.' : 'No tienes partidos asignados.'}
          </div>
        )}

        {!loading && lista.map(s => (
          <ServicioCard key={s.id} servicio={s} nombreOperador={nombreOp} onClick={() => setDetalle(s.id)} />
        ))}
      </div>
    </>
  );
}
