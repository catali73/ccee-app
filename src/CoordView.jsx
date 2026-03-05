import { useState, useCallback, useEffect } from "react";
import {
  apiFetch, Input, Select, Textarea, Label, Card, SecTitle, BtnP, BtnO, Badge,
  Field, Sep, Steps, StatusToggle, CameraToggle, CameraSection, initItems, STATUS,
  CAMERA_CATALOG, OPERATOR_GROUPS, PERSONAL, TIPOS_SERVICIO, LIGA_PARTIDOS, LOGISTICA_ITEMS
} from "./App.jsx";

/* ── helpers ── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—';
const initOperators = () => {
  const o = {};
  OPERATOR_GROUPS.forEach(g => g.roles.forEach(r => { o[r.key] = ""; }));
  return o;
};

/* ── HEADER ────────────────────────────────────────────────── */
function Header({ user, onLogout, view, setView }) {
  const tabs = [
    { id:'dashboard', label:'Dashboard' },
    { id:'new-servicio', label:'+ Nuevo servicio' },
    { id:'users', label:'Usuarios' },
  ];
  return (
    <header style={{background:'#fff',borderBottom:'1px solid #e4e4e7',position:'sticky',top:0,zIndex:100}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 20px',height:56,display:'flex',alignItems:'center',gap:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:6,background:'#18181b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>📷</div>
          <div>
            <div style={{fontSize:13,fontWeight:600,lineHeight:1.2}}>MEDIAPRO · CCEE</div>
            <div style={{fontSize:10,color:'#71717a',lineHeight:1.2}}>Cámaras Especiales</div>
          </div>
        </div>
        <div style={{flex:1}} />
        <nav style={{display:'flex',gap:2}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setView(t.id)}
              style={{padding:'0 12px',height:32,borderRadius:8,fontSize:12,fontWeight:500,cursor:'pointer',border:'none',background:view===t.id?'#f4f4f5':'transparent',color:view===t.id?'#09090b':'#71717a',transition:'all 0.12s'}}>
              {t.label}
            </button>
          ))}
        </nav>
        <div style={{width:1,height:20,background:'#e4e4e7'}} />
        <Badge>{user.name}</Badge>
        <BtnO onClick={onLogout} style={{height:28,fontSize:12,padding:'0 10px'}}>Salir</BtnO>
      </div>
    </header>
  );
}

/* ── DASHBOARD ─────────────────────────────────────────────── */
function CoordDashboard({ onNewServicio, onManageUsers }) {
  const [stats,setStats] = useState(null);
  const [servicios,setServicios] = useState([]);
  const [informes,setInformes] = useState([]);
  const [loading,setLoading] = useState(true);
  const [selInforme,setSelInforme] = useState(null);
  const [detailInforme,setDetailInforme] = useState(null);

  useEffect(()=>{
    Promise.all([
      apiFetch('/api/stats').then(r=>r.json()).catch(()=>null),
      apiFetch('/api/servicios').then(r=>r.json()).catch(()=>[]),
      apiFetch('/api/informes').then(r=>r.json()).catch(()=>[]),
    ]).then(([st,sv,inf])=>{
      setStats(st); setServicios(Array.isArray(sv)?sv:[]); setInformes(Array.isArray(inf)?inf:[]);
      setLoading(false);
    });
  },[]);

  const loadDetailInforme = async (id) => {
    const r = await apiFetch(`/api/informes/${id}`);
    setDetailInforme(await r.json()); setSelInforme(id);
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',fontSize:13,color:'#71717a'}}>Cargando...</div>;

  const pendientes = servicios.filter(s=>s.status==='pendiente');
  const completados = servicios.filter(s=>s.status==='completado');

  return (
    <div style={{maxWidth:1000,margin:'0 auto',padding:'24px 20px 80px'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:600,margin:0,marginBottom:4}}>Dashboard</h1>
          <p style={{fontSize:13,color:'#71717a',margin:0}}>Coordinación · Temporada 25/26</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <BtnO onClick={onManageUsers}>Gestionar usuarios</BtnO>
          <BtnP onClick={onNewServicio}>+ Nuevo servicio</BtnP>
        </div>
      </div>

      {/* Stats */}
      {stats&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
          {[
            {l:'Informes',v:stats.total,s:'completados'},
            {l:'Servicios pendientes',v:stats.pendientes||pendientes.length,s:'sin informe'},
            {l:'Graves',v:stats.porJornada?.reduce((a,j)=>a+parseInt(j.graves||0),0)||0,s:'acumuladas',red:true},
            {l:'Leves',v:stats.porJornada?.reduce((a,j)=>a+parseInt(j.leves||0),0)||0,s:'acumuladas',yel:true},
          ].map(s=>(
            <Card key={s.l} style={{padding:'16px 18px',marginBottom:0}}>
              <div style={{fontSize:24,fontWeight:600,fontFamily:"'Geist Mono',monospace",color:s.red?'#dc2626':s.yel?'#d97706':'#09090b',marginBottom:2}}>{s.v}</div>
              <div style={{fontSize:12,fontWeight:500}}>{s.l}</div>
              <div style={{fontSize:11,color:'#71717a',marginTop:1}}>{s.s}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Servicios pendientes */}
      {pendientes.length>0&&(
        <Card style={{padding:0,overflow:'hidden',marginBottom:16}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid #e4e4e7',display:'flex',alignItems:'center',gap:8}}>
            <SecTitle style={{margin:0}}>Servicios pendientes · {pendientes.length}</SecTitle>
          </div>
          {pendientes.map((s,i)=>(
            <div key={s.id} style={{padding:'12px 16px',borderBottom:i<pendientes.length-1?'1px solid #e4e4e7':'none',background:'#fff'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{s.encuentro||'—'}</div>
                  <div style={{fontSize:11,color:'#71717a',marginTop:2}}>
                    <span style={{fontFamily:"'Geist Mono',monospace"}}>{s.jornada}</span>
                    {' · '}{fmt(s.fecha)}
                    {' · '}<span style={{fontWeight:500}}>{s.assigned_to_name||'Sin asignar'}</span>
                  </div>
                </div>
                <Badge variant="default">⏳ Pendiente</Badge>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Informes completados */}
      {informes.length===0&&pendientes.length===0?(
        <Card style={{textAlign:'center',padding:'48px 20px'}}>
          <div style={{fontSize:13,color:'#71717a',marginBottom:16}}>No hay servicios todavía.</div>
          <BtnP onClick={onNewServicio}>Crear primer servicio</BtnP>
        </Card>
      ):(
        informes.length>0&&(
          <div style={{display:'grid',gridTemplateColumns:selInforme?'1fr 1fr':'1fr',gap:16,alignItems:'start'}}>
            <Card style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'14px 16px',borderBottom:'1px solid #e4e4e7'}}>
                <SecTitle style={{margin:0}}>Informes completados · {informes.length}</SecTitle>
              </div>
              {informes.map((inf,i)=>(
                <div key={inf.id} onClick={()=>loadDetailInforme(inf.id)}
                  style={{padding:'12px 16px',cursor:'pointer',background:selInforme===inf.id?'#f4f4f5':'#fff',borderBottom:i<informes.length-1?'1px solid #e4e4e7':'none',transition:'background 0.1s'}}
                  onMouseEnter={e=>{if(selInforme!==inf.id)e.currentTarget.style.background='#fafafa';}}
                  onMouseLeave={e=>{if(selInforme!==inf.id)e.currentTarget.style.background='#fff';}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:500}}>{inf.encuentro||'—'}</div>
                      <div style={{fontSize:11,color:'#71717a',marginTop:2}}>
                        <span style={{fontFamily:"'Geist Mono',monospace"}}>{inf.jornada}</span>
                        {' · '}{fmt(inf.fecha)}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:4}}>
                      {inf.incidencias_graves>0&&<Badge variant="grave">⚠ {inf.incidencias_graves}G</Badge>}
                      {inf.incidencias_leves>0&&<Badge variant="leve">↓ {inf.incidencias_leves}L</Badge>}
                      {inf.incidencias_graves===0&&inf.incidencias_leves===0&&<Badge variant="ok">✓ OK</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </Card>

            {selInforme&&detailInforme&&(
              <Card style={{position:'sticky',top:80}}>
                <div style={{display:'flex',alignItems:'center',marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:600,flex:1}}>{detailInforme.encuentro}</div>
                  <button onClick={()=>{setSelInforme(null);setDetailInforme(null);}} style={{background:'none',border:'none',cursor:'pointer',color:'#71717a',fontSize:16,padding:4}}>✕</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                  {[['Jornada',detailInforme.jornada],['Fecha',fmt(detailInforme.fecha)],['Hora',detailInforme.hora_partido||'—'],['Responsable',detailInforme.responsable]].map(([k,v])=>(
                    <div key={k} style={{padding:'8px 10px',background:'#fafafa',borderRadius:8,border:'1px solid #e4e4e7'}}>
                      <div style={{fontSize:10,fontWeight:500,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:2}}>{k}</div>
                      <div style={{fontSize:12,fontWeight:500}}>{v||'—'}</div>
                    </div>
                  ))}
                </div>
                {detailInforme.cam_data&&(
                  <div style={{border:'1px solid #e4e4e7',borderRadius:8,overflow:'hidden'}}>
                    {Object.entries(detailInforme.cam_data).map(([id,d],i,arr)=>{
                      const cam=CAMERA_CATALOG[id]; if(!cam||!d) return null;
                      const items=d.items||{};
                      const gv=Object.values(items).filter(v=>v==='G').length;
                      const lv=Object.values(items).filter(v=>v==='L').length;
                      return (
                        <div key={id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderBottom:i<arr.length-1?'1px solid #e4e4e7':'none',background:i%2===0?'#fff':'#fafafa'}}>
                          <span style={{fontSize:13}}>{cam.icon}</span>
                          <div style={{flex:1,fontSize:12}}>{cam.label}</div>
                          {d.equipo&&<span style={{fontSize:11,color:'#71717a',fontFamily:"'Geist Mono',monospace"}}>{d.equipo}</span>}
                          <div style={{display:'flex',gap:3}}>
                            {gv>0&&<Badge variant="grave">⚠{gv}</Badge>}
                            {lv>0&&<Badge variant="leve">↓{lv}</Badge>}
                            {gv===0&&lv===0&&<Badge variant="ok">✓</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        )
      )}
    </div>
  );
}

/* ── NEW SERVICIO FORM (Steps 1-3 + Asignar) ──────────────── */
function NewServicioForm({ onCancel, onSaved }) {
  const [step,setStep] = useState(1);
  const STEPS = ["Servicio","Cámaras","Operadores","Asignar"];

  const [tipoServicio,setTipoServicio] = useState('liga');
  const [match,setMatch] = useState({jornada:"",encuentro:"",fecha:"",hora_partido:"",hora_citacion:"",responsable:"",um:"",jefe_tecnico:"",realizador:"",productor:"",horario_md1:""});
  const [ligaJornada,setLigaJornada] = useState("");
  const [ligaPartido,setLigaPartido] = useState("");
  const [selectedCams,setSelectedCams] = useState({});
  const [operators,setOperators] = useState(initOperators());
  const [assignedTo,setAssignedTo] = useState('');
  const [usuarios,setUsuarios] = useState([]);
  const [saving,setSaving] = useState(false);
  const [saveError,setSaveError] = useState(null);
  const [sent,setSent] = useState(false);

  const [todosUsuarios,setTodosUsuarios] = useState([]);
  useEffect(()=>{
    apiFetch('/api/users').then(r=>r.json()).then(data=>{
      const activos = Array.isArray(data)?data.filter(u=>u.active):[];
      setTodosUsuarios(activos);
      setUsuarios(activos.filter(u=>u.role==='usuario'));
    }).catch(()=>{});
  },[]);

  useEffect(()=>{ if(tipoServicio==='liga'&&ligaJornada&&ligaPartido) setMatch(p=>({...p,jornada:ligaJornada,encuentro:ligaPartido})); },[ligaJornada,ligaPartido,tipoServicio]);
  useEffect(()=>{ if(tipoServicio!=='liga'){ setLigaJornada(""); setLigaPartido(""); setMatch(p=>({...p,jornada:"",encuentro:""})); } },[tipoServicio]);

  const toggleCam = useCallback((id)=>setSelectedCams(p=>({...p,[id]:!p[id]})),[]);
  const updateOp = useCallback((key,val)=>setOperators(p=>({...p,[key]:val})),[]);

  const activeCams = Object.entries(CAMERA_CATALOG).filter(([id])=>selectedCams[id]);
  const activeOpGroups = OPERATOR_GROUPS.filter(g=>g.cams.some(c=>selectedCams[c]));
  const tipoActual = TIPOS_SERVICIO.find(tp=>tp.id===tipoServicio);

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      const res = await apiFetch('/api/servicios', {
        method:'POST',
        body: JSON.stringify({ match, selectedCams, operators, assigned_to: parseInt(assignedTo), tipo_servicio: tipoServicio })
      });
      const data = await res.json();
      if (data.ok) setSent(true);
      else setSaveError(data.error||'Error al guardar');
    } catch { setSaveError('Error de conexión'); }
    finally { setSaving(false); }
  };

  if (sent) return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'80px 20px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{width:48,height:48,borderRadius:'50%',background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>✓</div>
      <div style={{fontSize:18,fontWeight:600}}>Servicio creado y asignado</div>
      <div style={{fontSize:13,color:'#71717a'}}>{match.encuentro} · {match.jornada}</div>
      <div style={{display:'flex',gap:8,marginTop:12}}>
        <BtnO onClick={onCancel}>Ver dashboard</BtnO>
        <BtnP onClick={()=>{ setStep(1); setTipoServicio('liga'); setLigaJornada(''); setLigaPartido(''); setMatch({jornada:'',encuentro:'',fecha:'',hora_partido:'',hora_citacion:'',responsable:'',um:'',jefe_tecnico:'',realizador:'',productor:'',horario_md1:''}); setSelectedCams({}); setOperators(initOperators()); setAssignedTo(''); setSaveError(null); setSent(false); }}>+ Otro servicio</BtnP>
      </div>
    </div>
  );

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'28px 20px 80px'}}>

      {/* ── STEP 1 ── */}
      {step===1&&(
        <>
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:18,fontWeight:600,margin:0,marginBottom:4}}>Datos del servicio</h2>
            <p style={{fontSize:13,color:'#71717a',margin:0}}>Tipo, partido y equipo técnico</p>
          </div>
          <Card>
            <SecTitle>Tipo de servicio</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
              {TIPOS_SERVICIO.map(tp=>(
                <button key={tp.id} onClick={()=>setTipoServicio(tp.id)} style={{padding:'12px 8px',borderRadius:8,border:`1px solid ${tipoServicio===tp.id?'#18181b':'#e4e4e7'}`,background:tipoServicio===tp.id?'#18181b':'#fff',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6,transition:'all 0.15s'}}>
                  <span style={{fontSize:20}}>{tp.icon}</span>
                  <span style={{fontSize:10,fontWeight:500,color:tipoServicio===tp.id?'#fafafa':'#71717a',lineHeight:1.3,textAlign:'center'}}>{tp.label}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <SecTitle>Identificación · {tipoActual?.icon} {tipoActual?.label}</SecTitle>
            {tipoServicio==='liga'?(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                <Field label="Jornada">
                  <Select value={ligaJornada} onChange={e=>{setLigaJornada(e.target.value);setLigaPartido('');}}>
                    <option value="">— Selecciona jornada —</option>
                    {Object.keys(LIGA_PARTIDOS).map(j=><option key={j} value={j}>{j}</option>)}
                  </Select>
                </Field>
                <Field label="Partido">
                  <Select value={ligaPartido} onChange={e=>setLigaPartido(e.target.value)} disabled={!ligaJornada}>
                    <option value="">— Selecciona partido —</option>
                    {ligaJornada&&LIGA_PARTIDOS[ligaJornada]?.map(p=><option key={p} value={p}>{p}</option>)}
                  </Select>
                </Field>
              </div>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                <Field label={tipoServicio==='programa'?'Nombre del programa':'Competición / Evento'}>
                  <Input placeholder="Descripción del evento" value={match.encuentro} onChange={e=>setMatch({...match,encuentro:e.target.value})} />
                </Field>
                <Field label="Referencia / Código">
                  <Input placeholder="Ej: UCL-J6, COPA-SF..." value={match.jornada} onChange={e=>setMatch({...match,jornada:e.target.value})} />
                </Field>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <Field label="Fecha"><Input type="date" value={match.fecha} onChange={e=>setMatch({...match,fecha:e.target.value})} /></Field>
              <Field label="Hora partido"><Input type="time" value={match.hora_partido} onChange={e=>setMatch({...match,hora_partido:e.target.value})} /></Field>
              <Field label="Hora citación"><Input placeholder="12:00 HLE" value={match.hora_citacion} onChange={e=>setMatch({...match,hora_citacion:e.target.value})} /></Field>
              <Field label="Horario MD-1"><Input placeholder="10:00 a 22:00" value={match.horario_md1} onChange={e=>setMatch({...match,horario_md1:e.target.value})} /></Field>
            </div>
          </Card>
          <Card>
            <SecTitle>Equipo técnico</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              <Field label="Responsable CCEE">
                <Select value={match.responsable} onChange={e=>setMatch({...match,responsable:e.target.value})}>
                  <option value="">— Seleccionar —</option>
                  {todosUsuarios.map(u=><option key={u.id} value={u.name}>{u.name}</option>)}
                </Select>
              </Field>
              <Field label="Unidad Móvil"><Input value={match.um} onChange={e=>setMatch({...match,um:e.target.value})} /></Field>
              <Field label="J. Técnico UM"><Input value={match.jefe_tecnico} onChange={e=>setMatch({...match,jefe_tecnico:e.target.value})} /></Field>
              <Field label="Realizador"><Input value={match.realizador} onChange={e=>setMatch({...match,realizador:e.target.value})} /></Field>
              <Field label="Productor"><Input value={match.productor} onChange={e=>setMatch({...match,productor:e.target.value})} /></Field>
            </div>
          </Card>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <BtnO onClick={onCancel}>← Cancelar</BtnO>
            <BtnP onClick={()=>setStep(2)}>Seleccionar cámaras →</BtnP>
          </div>
        </>
      )}

      {/* ── STEP 2 ── */}
      {step===2&&(
        <>
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:18,fontWeight:600,margin:0,marginBottom:4}}>Cámaras desplegadas</h2>
            <p style={{fontSize:13,color:'#71717a',margin:0}}>Activas en <strong>{match.encuentro||'este servicio'}</strong></p>
          </div>
          <Card>
            <SecTitle>Activa / desactiva cada equipo</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:8}}>
              {Object.entries(CAMERA_CATALOG).map(([id,cam])=><CameraToggle key={id} id={id} cam={cam} selected={!!selectedCams[id]} onToggle={toggleCam} />)}
            </div>
            {activeCams.length>0&&<><Sep /><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{activeCams.map(([id,cam])=><Badge key={id} style={{borderColor:`${cam.color}44`,color:cam.color,background:`${cam.color}0d`}}>{cam.icon} {cam.label}</Badge>)}</div></>}
          </Card>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <BtnO onClick={()=>setStep(1)}>← Atrás</BtnO>
            <BtnP style={{opacity:activeCams.length===0?0.45:1}} onClick={()=>activeCams.length>0&&setStep(3)}>Asignar operadores →</BtnP>
          </div>
        </>
      )}

      {/* ── STEP 3 ── */}
      {step===3&&(
        <>
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:18,fontWeight:600,margin:0,marginBottom:4}}>Operadores asignados</h2>
            <p style={{fontSize:13,color:'#71717a',margin:0}}>Solo para los equipos seleccionados · {activeCams.length} cámaras activas</p>
          </div>
          {activeOpGroups.length===0?(
            <Card style={{textAlign:'center',padding:32,color:'#71717a',fontSize:13}}>No hay grupos de operadores para las cámaras seleccionadas.</Card>
          ):(
            <Card>
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                {activeOpGroups.map(group=>(
                  <div key={group.id}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,paddingBottom:6,borderBottom:'1px solid #e4e4e7'}}>
                      <span style={{fontSize:13}}>{group.icon}</span>
                      <span style={{fontSize:11,fontWeight:600,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.06em'}}>{group.label}</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:12}}>
                      {group.roles.map(role=>(
                        <Field key={role.key} label={role.label}>
                          <Select value={operators[role.key]||''} onChange={e=>updateOp(role.key,e.target.value)}>
                            <option value="">— Sin asignar —</option>
                            {(PERSONAL[role.pool]||[]).map(p=><option key={p} value={p}>{p}</option>)}
                          </Select>
                        </Field>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <BtnO onClick={()=>setStep(2)}>← Atrás</BtnO>
            <BtnP onClick={()=>setStep(4)}>Asignar a técnico →</BtnP>
          </div>
        </>
      )}

      {/* ── STEP 4: ASIGNAR ── */}
      {step===4&&(
        <>
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:18,fontWeight:600,margin:0,marginBottom:4}}>Asignar servicio</h2>
            <p style={{fontSize:13,color:'#71717a',margin:0}}>Selecciona el técnico que realizará el informe</p>
          </div>
          <Card>
            <SecTitle>Técnico asignado</SecTitle>
            <Field label="Asignar a">
              {usuarios.length===0?(
                <div style={{fontSize:13,color:'#71717a',padding:'8px 0'}}>No hay técnicos disponibles. <a href="#" onClick={e=>{e.preventDefault();onCancel();}} style={{color:'#18181b'}}>Crea uno primero.</a></div>
              ):(
                <Select value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}>
                  <option value="">— Seleccionar técnico —</option>
                  {usuarios.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </Select>
              )}
            </Field>
          </Card>

          <Card>
            <SecTitle>Resumen del servicio</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
              {[['Encuentro',match.encuentro],['Jornada',match.jornada],['Fecha',match.fecha],['Hora',match.hora_partido],['Responsable',match.responsable],['Cámaras',`${activeCams.length} activas`]].map(([k,v])=>(
                <div key={k} style={{padding:'10px 12px',background:'#fafafa',borderRadius:8,border:'1px solid #e4e4e7'}}>
                  <div style={{fontSize:10,fontWeight:500,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:500,fontFamily:"'Geist Mono',monospace"}}>{v||'—'}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {activeCams.map(([id,cam])=><Badge key={id} style={{borderColor:`${cam.color}44`,color:cam.color,background:`${cam.color}0d`}}>{cam.icon} {cam.label}</Badge>)}
            </div>
          </Card>

          {saveError&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#dc2626'}}>{saveError}</div>}
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <BtnO onClick={()=>setStep(3)}>← Atrás</BtnO>
            <BtnP onClick={handleSave} disabled={!assignedTo||saving} style={{opacity:(!assignedTo||saving)?0.5:1}}>
              {saving?'Guardando...':'Crear servicio →'}
            </BtnP>
          </div>
        </>
      )}
    </div>
  );
}

/* ── USER MANAGEMENT ───────────────────────────────────────── */
function UserManagement({ currentUser }) {
  const [users,setUsers] = useState([]);
  const [loading,setLoading] = useState(true);
  const [form,setForm] = useState({ email:'', password:'', name:'', role:'usuario' });
  const [error,setError] = useState(null);
  const [success,setSuccess] = useState(null);
  const [creating,setCreating] = useState(false);

  const loadUsers = async () => {
    const r = await apiFetch('/api/users');
    const data = await r.json();
    setUsers(Array.isArray(data)?data:[]);
    setLoading(false);
  };

  useEffect(()=>{ loadUsers(); },[]);

  const createUser = async (e) => {
    e.preventDefault();
    setCreating(true); setError(null); setSuccess(null);
    const res = await apiFetch('/api/users',{ method:'POST', body:JSON.stringify(form) });
    const data = await res.json();
    if (data.ok) {
      setForm({ email:'', password:'', name:'', role:'usuario' });
      setSuccess(`Usuario ${form.name} creado correctamente.`);
      loadUsers();
    } else {
      setError(data.error||'Error al crear usuario');
    }
    setCreating(false);
  };

  const deactivate = async (id) => {
    if (!confirm('¿Desactivar este usuario?')) return;
    await apiFetch(`/api/users/${id}`,{ method:'DELETE' });
    loadUsers();
  };

  const activate = async (id) => {
    await apiFetch(`/api/users/${id}/activate`,{ method:'PATCH' });
    loadUsers();
  };

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'24px 20px 80px'}}>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:18,fontWeight:600,margin:0,marginBottom:4}}>Gestión de usuarios</h2>
        <p style={{fontSize:13,color:'#71717a',margin:0}}>Crea y administra las cuentas del equipo</p>
      </div>

      <Card>
        <SecTitle>Crear nuevo usuario</SecTitle>
        <form onSubmit={createUser}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
            <Field label="Nombre completo">
              <Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nombre Apellido" required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="correo@email.com" required />
            </Field>
            <Field label="Contraseña inicial">
              <Input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </Field>
            <Field label="Rol">
              <Select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                <option value="usuario">Usuario (técnico)</option>
                <option value="coordinador">Coordinador</option>
              </Select>
            </Field>
          </div>
          {error&&<div style={{fontSize:12,color:'#dc2626',background:'#fef2f2',padding:'8px 12px',borderRadius:6,border:'1px solid #fecaca',marginBottom:10}}>{error}</div>}
          {success&&<div style={{fontSize:12,color:'#16a34a',background:'#f0fdf4',padding:'8px 12px',borderRadius:6,border:'1px solid #bbf7d0',marginBottom:10}}>{success}</div>}
          <BtnP type="submit" disabled={creating}>{creating?'Creando...':'Crear usuario'}</BtnP>
        </form>
      </Card>

      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid #e4e4e7'}}>
          <SecTitle style={{margin:0}}>Usuarios · {users.length} total</SecTitle>
        </div>
        {loading?(
          <div style={{padding:24,textAlign:'center',fontSize:13,color:'#71717a'}}>Cargando...</div>
        ):users.length===0?(
          <div style={{padding:24,textAlign:'center',fontSize:13,color:'#71717a'}}>No hay usuarios todavía.</div>
        ):users.map((u,i)=>(
          <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderBottom:i<users.length-1?'1px solid #e4e4e7':'none',background:u.active?'#fff':'#fafafa',opacity:u.active?1:0.6}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500}}>{u.name}</div>
              <div style={{fontSize:11,color:'#71717a',marginTop:2}}>{u.email}</div>
            </div>
            <Badge variant={u.role==='coordinador'?'default':'ok'}>{u.role==='coordinador'?'Coordinador':'Técnico'}</Badge>
            {!u.active&&<Badge>Inactivo</Badge>}
            {u.id!==currentUser.id&&(
              u.active
                ? <BtnO onClick={()=>deactivate(u.id)} style={{height:28,fontSize:11,padding:'0 10px',color:'#dc2626',borderColor:'#fecaca'}}>Desactivar</BtnO>
                : <BtnO onClick={()=>activate(u.id)} style={{height:28,fontSize:11,padding:'0 10px'}}>Reactivar</BtnO>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ── COORD VIEW ROOT ───────────────────────────────────────── */
export default function CoordView({ user, onLogout }) {
  const [view,setView] = useState('dashboard');

  return (
    <div style={{minHeight:'100vh',background:'#fafafa'}}>
      <Header user={user} onLogout={onLogout} view={view} setView={setView} />
      {view==='dashboard'&&(
        <CoordDashboard
          onNewServicio={()=>setView('new-servicio')}
          onManageUsers={()=>setView('users')}
        />
      )}
      {view==='new-servicio'&&(
        <NewServicioForm onCancel={()=>setView('dashboard')} onSaved={()=>setView('dashboard')} />
      )}
      {view==='users'&&(
        <UserManagement currentUser={user} />
      )}
    </div>
  );
}
