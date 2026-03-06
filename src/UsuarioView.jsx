import { useState, useCallback, useEffect } from "react";
import {
  apiFetch, Input, Select, Textarea, Label, Card, SecTitle, BtnP, BtnO, Badge,
  Field, Sep, StatusToggle, CameraSection, initItems, STATUS,
  CAMERA_CATALOG, OPERATOR_GROUPS, LOGISTICA_ITEMS
} from "./App.jsx";

/* ── helpers ── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—';

/* ── PDF HOJA DE SERVICIO (para técnicos) ──────────────────── */
function generateServicioPDF(servicio) {
  const fmtD = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—';
  const ops = servicio.operadores || {};
  const activeCams = servicio.camaras_activas
    ? Object.entries(CAMERA_CATALOG).filter(([id]) => servicio.camaras_activas[id])
    : [];
  const cell = (label,val) => `<div class="cell"><div class="cl">${label}</div><div class="cv">${val||'—'}</div></div>`;
  const opRows = OPERATOR_GROUPS.flatMap(g => g.roles.filter(r=>ops[r.key]).map(r=>
    `<tr><td>${r.label}</td><td><strong>${ops[r.key]}</strong></td></tr>`
  )).join('');
  const camList = activeCams.map(([id,cam])=>
    `<div class="cam-item">${cam.icon} <strong>${cam.label}</strong></div>`
  ).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Hoja de servicio · ${servicio.encuentro||''}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1a1a1a;padding:28px 32px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #111}
.title{font-size:20px;font-weight:700;margin-bottom:3px}.sub{font-size:12px;color:#555}
.brand{font-size:11px;font-weight:700;text-align:right;color:#555}
h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin:16px 0 8px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.cell{background:#f7f7f7;border:1px solid #e5e5e5;border-radius:4px;padding:6px 9px}
.cl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#999;margin-bottom:2px}
.cv{font-size:11px;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}
td{border:1px solid #e5e5e5;padding:5px 9px}tr:nth-child(even) td{background:#fafafa}
.cam-grid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.cam-item{background:#f0f0f0;border:1px solid #ddd;border-radius:4px;padding:5px 10px;font-size:12px}
.ftr{margin-top:24px;padding-top:10px;border-top:1px solid #e0e0e0;font-size:10px;color:#aaa;display:flex;justify-content:space-between}
@media print{body{padding:16px 20px}}
</style></head><body>
<div class="hdr">
  <div>
    <div class="title">${servicio.encuentro||'—'}</div>
    <div class="sub">${servicio.jornada||''} · ${fmtD(servicio.fecha)}</div>
  </div>
  <div class="brand">MEDIAPRO · CCEE<br><span style="font-weight:400">Hoja de servicio · Temporada 25/26</span></div>
</div>
<h2>Datos del servicio</h2>
<div class="grid">
  ${[['Jornada',servicio.jornada],['Encuentro',servicio.encuentro],['Fecha',fmtD(servicio.fecha)],
    ['Hora partido',servicio.hora_partido],['Hora citación',servicio.hora_citacion],['Horario MD-1',servicio.horario_md1]
  ].map(([k,v])=>cell(k,v)).join('')}
</div>
<h2>Equipo técnico</h2>
<div class="grid">
  ${[['Responsable CCEE',servicio.responsable],['Unidad Móvil',servicio.um],['J. Técnico UM',servicio.jefe_tecnico],
    ['Realizador',servicio.realizador],['Productor',servicio.productor]
  ].map(([k,v])=>cell(k,v)).join('')}
</div>
${activeCams.length>0?`<h2>Cámaras activas · ${activeCams.length}</h2><div class="cam-grid">${camList}</div>`:''}
${opRows?`<h2>Operadores asignados</h2><table><tbody>${opRows}</tbody></table>`:''}
<div class="ftr">
  <span>MEDIAPRO · Cámaras Especiales · Hoja de servicio</span>
  <span>Generado: ${new Date().toLocaleString('es-ES')}</span>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const win = window.open('','_blank','width=900,height=750');
  if (win) { win.document.write(html); win.document.close(); }
}

/* ── DOCUMENTOS USUARIO (solo lectura) ─────────────────────── */
function DocumentosUsuario({ servicioId }) {
  const [docs,setDocs] = useState([]);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    apiFetch(`/api/servicios/${servicioId}/documentos`).then(r=>r.json()).then(data=>{
      setDocs(Array.isArray(data)?data:[]); setLoading(false);
    }).catch(()=>setLoading(false));
  },[servicioId]);

  const fileIcon = (tipo) => tipo?.startsWith('image/')?'🖼️':tipo==='application/pdf'?'📄':'📎';

  const handleOpen = async (doc) => {
    const win = window.open('about:blank', '_blank');
    try {
      const r = await apiFetch(`/api/documentos/${doc.id}`);
      const data = await r.json();
      if (!data.datos || !win) { if (win) win.close(); return; }
      // Convertir base64 → Blob → URL de objeto (navegadores bloquean data: URLs)
      const [header, b64] = data.datos.split(',');
      const mime = header.match(/:(.*?);/)[1];
      const bytes = atob(b64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      win.location.href = URL.createObjectURL(blob);
    } catch { if (win) win.close(); }
  };

  if (loading||docs.length===0) return null;

  return (
    <Card>
      <SecTitle>Documentos del servicio · {docs.length}</SecTitle>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {docs.map(doc=>(
          <div key={doc.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#fafafa',borderRadius:8,border:'1px solid #e4e4e7'}}>
            <span style={{fontSize:20}}>{fileIcon(doc.tipo)}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500}}>{doc.descripcion}</div>
              <div style={{fontSize:11,color:'#71717a',marginTop:1}}>{doc.nombre}</div>
            </div>
            <BtnO onClick={()=>handleOpen(doc)} style={{height:30,fontSize:12,padding:'0 12px'}}>Abrir</BtnO>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── HEADER ────────────────────────────────────────────────── */
function Header({ user, onLogout }) {
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
        <Badge>{user.name}</Badge>
        <span style={{fontSize:11,color:'#71717a'}}>Técnico</span>
        <BtnO onClick={onLogout} style={{height:28,fontSize:12,padding:'0 10px'}}>Salir</BtnO>
      </div>
    </header>
  );
}

/* ── SERVICIOS LIST ────────────────────────────────────────── */
function ServiciosList({ onSelect, onViewInforme }) {
  const [servicios,setServicios] = useState([]);
  const [informeMap,setInformeMap] = useState({}); // servicioId → informe (más reciente)
  const [loading,setLoading] = useState(true);

  const load = () => {
    Promise.all([
      apiFetch('/api/servicios').then(r=>r.json()).catch(()=>[]),
      apiFetch('/api/informes').then(r=>r.json()).catch(()=>[]),
    ]).then(([svs,infs])=>{
      setServicios(Array.isArray(svs)?svs:[]);
      // Construir mapa servicioId→informe (prioridad: enviado > borrador)
      const map={};
      if(Array.isArray(infs)) infs.forEach(inf=>{
        if(!map[inf.servicio_id]||inf.status==='enviado') map[inf.servicio_id]=inf;
      });
      setInformeMap(map);
      setLoading(false);
    });
  };

  useEffect(()=>{ load(); },[]);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',fontSize:13,color:'#71717a'}}>Cargando...</div>;

  const sinIniciar = servicios.filter(s=>s.status==='pendiente'&&!informeMap[s.id]);
  const enCurso   = servicios.filter(s=>s.status==='pendiente'&&informeMap[s.id]?.status==='borrador');
  const enviados  = servicios.filter(s=>s.status==='completado');
  const total = servicios.length;

  const ServiceRow = ({ s, onClick, badge, canClick=true, dim=false }) => (
    <div onClick={canClick?onClick:undefined}
      style={{padding:'14px 16px',cursor:canClick?'pointer':'default',background:'#fff',transition:'background 0.1s'}}
      onMouseEnter={e=>{if(canClick)e.currentTarget.style.background='#fafafa';}}
      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
      <div style={{display:'flex',alignItems:'center',gap:12,opacity:dim?0.7:1}}>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:500}}>{s.encuentro||'—'}</div>
          <div style={{fontSize:11,color:'#71717a',marginTop:3}}>
            <span style={{fontFamily:"'Geist Mono',monospace"}}>{s.jornada}</span>
            {' · '}{fmt(s.fecha)}
            {s.hora_partido&&<>{' · '}{s.hora_partido}</>}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {badge}
          {canClick&&<span style={{color:'#71717a',fontSize:18}}>›</span>}
        </div>
      </div>
    </div>
  );

  const SectionHeader = ({label,count}) => (
    <div style={{fontSize:11,fontWeight:600,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>{label} · {count}</div>
  );

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'24px 20px 80px'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:600,margin:0,marginBottom:4}}>Mis servicios</h1>
        <p style={{fontSize:13,color:'#71717a',margin:0}}>Servicios asignados · Temporada 25/26</p>
      </div>

      {total===0&&(
        <Card style={{textAlign:'center',padding:'48px 20px'}}>
          <div style={{fontSize:13,color:'#71717a'}}>No tienes servicios asignados todavía.</div>
        </Card>
      )}

      {sinIniciar.length>0&&(
        <div style={{marginBottom:24}}>
          <SectionHeader label="Pendientes de informe" count={sinIniciar.length} />
          <Card style={{padding:0,overflow:'hidden'}}>
            {sinIniciar.map((s,i)=>(
              <div key={s.id} style={{borderBottom:i<sinIniciar.length-1?'1px solid #e4e4e7':'none'}}>
                <ServiceRow s={s} onClick={()=>onSelect(s.id,null)}
                  badge={<Badge style={{background:'#fffbeb',color:'#d97706',borderColor:'#fde68a'}}>⏳ Pendiente</Badge>} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {enCurso.length>0&&(
        <div style={{marginBottom:24}}>
          <SectionHeader label="En curso" count={enCurso.length} />
          <Card style={{padding:0,overflow:'hidden'}}>
            {enCurso.map((s,i)=>(
              <div key={s.id} style={{borderBottom:i<enCurso.length-1?'1px solid #e4e4e7':'none'}}>
                <ServiceRow s={s} onClick={()=>onSelect(s.id,informeMap[s.id].id)}
                  badge={<Badge style={{background:'#eff6ff',color:'#2563eb',borderColor:'#bfdbfe'}}>✏️ En curso</Badge>} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {enviados.length>0&&(
        <div style={{marginBottom:24}}>
          <SectionHeader label="Enviados" count={enviados.length} />
          <Card style={{padding:0,overflow:'hidden'}}>
            {enviados.map((s,i)=>(
              <div key={s.id} style={{borderBottom:i<enviados.length-1?'1px solid #e4e4e7':'none'}}>
                <ServiceRow s={s}
                  onClick={informeMap[s.id]?()=>onViewInforme(informeMap[s.id].id):undefined}
                  canClick={!!informeMap[s.id]} dim
                  badge={<Badge variant="ok">✓ Enviado</Badge>} />
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ── FILL REPORT ───────────────────────────────────────────── */
function FillReport({ servicioId, draftInformeId, onBack }) {
  const [servicio,setServicio] = useState(null);
  const [loading,setLoading] = useState(true);
  const [step,setStep] = useState(1); // 1=info read-only, 2=informe, 3=resumen

  const [logistica,setLogistica] = useState({items:{},incidencias:""});
  const [camData,setCamData] = useState({});
  const [saving,setSaving] = useState(false);
  const [saveError,setSaveError] = useState(null);
  const [sent,setSent] = useState(false);      // informe enviado definitivamente
  const [savedDraft,setSavedDraft] = useState(false); // borrador guardado

  useEffect(()=>{
    Promise.all([
      apiFetch(`/api/servicios/${servicioId}`).then(r=>r.json()),
      draftInformeId ? apiFetch(`/api/informes/${draftInformeId}`).then(r=>r.json()) : Promise.resolve(null),
    ]).then(([data, draft])=>{
      setServicio(data);
      // Inicializar camData pre-rellenando equipos desde cam_models del coordinador
      if (data.camaras_activas) {
        const initial = {};
        Object.entries(data.camaras_activas).forEach(([id,active])=>{
          if (active && CAMERA_CATALOG[id]) {
            const cam = CAMERA_CATALOG[id];
            // Equipos pre-asignados por el coordinador (read-only para el técnico)
            const equipos = data.cam_models?.[id] || {};
            if(cam.equipos) cam.equipos.forEach(s=>{ if(!equipos[s.key]) equipos[s.key]=""; });
            const items = draft?.cam_data?.[id]?.items || initItems(cam.items);
            const incidencias = draft?.cam_data?.[id]?.incidencias || "";
            initial[id] = { equipos, items, incidencias };
          }
        });
        setCamData(initial);
      }
      // Restaurar logística del borrador si existe
      if (draft?.logistica) {
        setLogistica(draft.logistica);
      } else {
        const logItems = {};
        LOGISTICA_ITEMS.forEach(item => { logItems[item] = STATUS.OK; });
        setLogistica({items:logItems, incidencias:""});
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[servicioId,draftInformeId]);

  const updateCamData = useCallback((camId,field,sub,val)=>{
    setCamData(prev=>{
      const cam = CAMERA_CATALOG[camId];
      const eqInit = {}; (cam?.equipos||[]).forEach(s=>{eqInit[s.key]="";});
      const c = prev[camId]||{equipos:eqInit,items:initItems(cam?.items||[]),incidencias:""};
      if (field==="equipos") return {...prev,[camId]:{...c,equipos:{...c.equipos,[sub]:val}}};
      if (field==="item") return {...prev,[camId]:{...c,items:{...c.items,[sub]:val}}};
      if (field==="incidencias") return {...prev,[camId]:{...c,incidencias:sub}};
      return prev;
    });
  },[]);

  if (loading||!servicio) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',fontSize:13,color:'#71717a'}}>Cargando servicio...</div>;

  const activeCams = servicio.camaras_activas
    ? Object.entries(CAMERA_CATALOG).filter(([id])=>servicio.camaras_activas[id])
    : [];

  const countInc = () => {
    let g=0,l=0;
    Object.values(logistica.items).forEach(v=>{if(v==="G")g++;if(v==="L")l++;});
    activeCams.forEach(([id])=>{ const d=camData[id]; if(!d?.items)return; Object.values(d.items).forEach(v=>{if(v==="G")g++;if(v==="L")l++;}); });
    return {g,l};
  };
  const {g,l} = countInc();

  const handleSave = async (draft=false) => {
    setSaving(true); setSaveError(null);
    try {
      const res = await apiFetch('/api/informes',{
        method:'POST',
        body: JSON.stringify({ servicio_id:servicioId, logistica, camData, incidenciasGraves:g, incidenciasLeves:l, draft })
      });
      const data = await res.json();
      if (data.ok) { if(draft) setSavedDraft(true); else setSent(true); }
      else setSaveError(data.error||'Error al guardar');
    } catch { setSaveError('Error de conexión'); }
    finally { setSaving(false); }
  };

  if (sent) return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'80px 20px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{width:48,height:48,borderRadius:'50%',background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>✓</div>
      <div style={{fontSize:18,fontWeight:600}}>Informe enviado</div>
      <div style={{fontSize:13,color:'#71717a'}}>{servicio.encuentro} · {servicio.jornada}</div>
      <div style={{display:'flex',gap:6,marginTop:4}}>
        {g>0&&<Badge variant="grave">⚠ {g} graves</Badge>}
        {l>0&&<Badge variant="leve">↓ {l} leves</Badge>}
        {g===0&&l===0&&<Badge variant="ok">Sin incidencias</Badge>}
      </div>
      <BtnP onClick={onBack} style={{marginTop:12}}>← Volver a mis servicios</BtnP>
    </div>
  );

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'28px 20px 80px'}}>

      {/* ── STEP 1: INFO READ-ONLY ── */}
      {step===1&&(
        <>
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:18,fontWeight:600,margin:0,marginBottom:4}}>{servicio.encuentro||'Servicio'}</h2>
            <p style={{fontSize:13,color:'#71717a',margin:0}}>Datos del servicio asignado</p>
          </div>

          <Card>
            <SecTitle>Datos del servicio</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
              {[
                ['Jornada',servicio.jornada],['Encuentro',servicio.encuentro],
                ['Fecha',fmt(servicio.fecha)],['Hora partido',servicio.hora_partido||'—'],
                ['Hora citación',servicio.hora_citacion||'—'],['Horario MD-1',servicio.horario_md1||'—'],
                ['Responsable CCEE',servicio.responsable||'—'],['Unidad Móvil',servicio.um||'—'],
                ['J. Técnico UM',servicio.jefe_tecnico||'—'],
              ].map(([k,v])=>(
                <div key={k} style={{padding:'10px 12px',background:'#fafafa',borderRadius:8,border:'1px solid #e4e4e7'}}>
                  <div style={{fontSize:10,fontWeight:500,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:12,fontWeight:500,fontFamily:"'Geist Mono',monospace"}}>{v||'—'}</div>
                </div>
              ))}
            </div>
          </Card>

          {activeCams.length>0&&(
            <Card>
              <SecTitle>Cámaras activas · {activeCams.length}</SecTitle>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {activeCams.map(([id,cam])=><Badge key={id} style={{borderColor:`${cam.color}44`,color:cam.color,background:`${cam.color}0d`}}>{cam.icon} {cam.label}</Badge>)}
              </div>
            </Card>
          )}

          {servicio.operadores&&Object.values(servicio.operadores).some(v=>v)&&(
            <Card>
              <SecTitle>Operadores asignados</SecTitle>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {OPERATOR_GROUPS.map(g=>g.roles.map(r=>{
                  // Filtrar por cámara activa si el rol tiene cam
                  if(r.cam&&!servicio.camaras_activas?.[r.cam]) return null;
                  const v=servicio.operadores[r.key]; if(!v) return null;
                  return (
                    <div key={r.key} style={{display:'flex',gap:8,padding:'6px 10px',background:'#fafafa',borderRadius:8,fontSize:12}}>
                      <span style={{color:'#71717a',minWidth:90}}>{r.label}</span>
                      <span style={{fontWeight:500}}>{v}</span>
                    </div>
                  );
                }))}
              </div>
            </Card>
          )}

          <DocumentosUsuario servicioId={servicioId} />

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <BtnO onClick={onBack}>← Mis servicios</BtnO>
            <div style={{display:'flex',gap:8}}>
              <BtnO onClick={()=>generateServicioPDF(servicio)}>📄 Hoja de servicio</BtnO>
              <BtnP onClick={()=>setStep(2)}>Iniciar informe técnico →</BtnP>
            </div>
          </div>
        </>
      )}

      {/* ── STEP 2: INFORME ── */}
      {step===2&&(
        <>
          <div style={{marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
            <div>
              <h2 style={{fontSize:18,fontWeight:600,margin:0,marginBottom:4}}>Informe técnico</h2>
              <p style={{fontSize:13,color:'#71717a',margin:0}}>{servicio.encuentro} · {servicio.jornada}</p>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:4}}>
              {g>0&&<Badge variant="grave">⚠ {g}G</Badge>}
              {l>0&&<Badge variant="leve">↓ {l}L</Badge>}
              {g===0&&l===0&&<Badge variant="ok">Sin incidencias</Badge>}
            </div>
          </div>

          <Card style={{borderLeft:'3px solid #f59e0b'}}>
            <SecTitle>Logística</SecTitle>
            <div style={{border:'1px solid #e4e4e7',borderRadius:8,overflow:'hidden',marginBottom:12}}>
              {LOGISTICA_ITEMS.map((item,i)=>(
                <div key={item} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 12px',background:i%2===0?'#fff':'#fafafa',borderBottom:i<LOGISTICA_ITEMS.length-1?'1px solid #e4e4e7':'none'}}>
                  <div style={{flex:1,fontSize:12}}>{item}</div>
                  <StatusToggle value={logistica.items[item]||STATUS.OK} onChange={v=>setLogistica({...logistica,items:{...logistica.items,[item]:v}})} />
                </div>
              ))}
            </div>
            <Label>Descripción de incidencias</Label>
            <Textarea placeholder="Sin incidencias..." value={logistica.incidencias} onChange={e=>setLogistica({...logistica,incidencias:e.target.value})} />
          </Card>

          {activeCams.map(([id,cam])=>{
            const eqInit={}; (cam.equipos||[]).forEach(s=>{eqInit[s.key]="";});
            return (
              <CameraSection key={id} camId={id} cam={cam}
                data={camData[id]||{equipos:eqInit,items:initItems(cam.items),incidencias:""}}
                onChange={updateCamData} readOnly={true} />
            );
          })}

          <div style={{display:'flex',justifyContent:'space-between'}}>
            <BtnO onClick={()=>setStep(1)}>← Atrás</BtnO>
            <BtnP onClick={()=>setStep(3)}>Ver resumen →</BtnP>
          </div>
        </>
      )}

      {/* ── STEP 3: RESUMEN ── */}
      {step===3&&(
        <>
          <div style={{marginBottom:20}}>
            <h2 style={{fontSize:18,fontWeight:600,margin:0,marginBottom:4}}>Resumen del informe</h2>
            <p style={{fontSize:13,color:'#71717a',margin:0}}>Revisa antes de guardar</p>
          </div>

          <Card>
            <SecTitle>Datos del servicio</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {[['Jornada',servicio.jornada],['Encuentro',servicio.encuentro],['Fecha',fmt(servicio.fecha)],['Hora',servicio.hora_partido||'—'],['Responsable',servicio.responsable||'—'],['Cámaras',`${activeCams.length} activas`]].map(([k,v])=>(
                <div key={k} style={{padding:'10px 12px',background:'#fafafa',borderRadius:8,border:'1px solid #e4e4e7'}}>
                  <div style={{fontSize:10,fontWeight:500,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:500,fontFamily:"'Geist Mono',monospace"}}>{v||'—'}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SecTitle>Estado general</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
              <div style={{padding:14,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:600,color:'#16a34a',fontFamily:"'Geist Mono',monospace"}}>{activeCams.length+1}</div>
                <div style={{fontSize:11,color:'#16a34a',marginTop:2}}>Secciones</div>
              </div>
              <div style={{padding:14,background:g>0?'#fef2f2':'#fafafa',border:`1px solid ${g>0?'#fecaca':'#e4e4e7'}`,borderRadius:8,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:600,color:g>0?'#dc2626':'#a1a1aa',fontFamily:"'Geist Mono',monospace"}}>{g}</div>
                <div style={{fontSize:11,color:g>0?'#dc2626':'#a1a1aa',marginTop:2}}>Graves</div>
              </div>
              <div style={{padding:14,background:l>0?'#fffbeb':'#fafafa',border:`1px solid ${l>0?'#fde68a':'#e4e4e7'}`,borderRadius:8,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:600,color:l>0?'#d97706':'#a1a1aa',fontFamily:"'Geist Mono',monospace"}}>{l}</div>
                <div style={{fontSize:11,color:l>0?'#d97706':'#a1a1aa',marginTop:2}}>Leves</div>
              </div>
            </div>
            <div style={{border:'1px solid #e4e4e7',borderRadius:8,overflow:'hidden'}}>
              {activeCams.map(([id,cam],i)=>{
                const d=camData[id]; const items=d?.items||{};
                const gv=Object.values(items).filter(v=>v==='G').length;
                const lv=Object.values(items).filter(v=>v==='L').length;
                return (
                  <div key={id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:i%2===0?'#fff':'#fafafa',borderBottom:i<activeCams.length-1?'1px solid #e4e4e7':'none'}}>
                    <span style={{fontSize:14}}>{cam.icon}</span>
                    <div style={{flex:1,fontSize:12,fontWeight:500}}>{cam.label}</div>
                    {(()=>{const eq=d?.equipos?Object.values(d.equipos).filter(Boolean).join(' · '):(d?.equipo||''); return eq?<span style={{fontSize:11,color:'#71717a',fontFamily:"'Geist Mono',monospace"}}>{eq}</span>:null;})()}
                    <div style={{display:'flex',gap:4}}>
                      {gv>0&&<Badge variant="grave">⚠{gv}G</Badge>}
                      {lv>0&&<Badge variant="leve">↓{lv}L</Badge>}
                      {gv===0&&lv===0&&<Badge variant="ok">✓ OK</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {saveError&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#dc2626'}}>{saveError}</div>}
          {savedDraft&&<div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#2563eb'}}>✓ Borrador guardado. Puedes cerrar y continuar más tarde.</div>}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <BtnO onClick={()=>setStep(2)}>← Revisar</BtnO>
            <div style={{display:'flex',gap:8}}>
              <BtnO onClick={()=>handleSave(true)} style={{opacity:saving?0.6:1}} disabled={saving}>
                {saving?'Guardando...':'💾 Guardar borrador'}
              </BtnO>
              <BtnP onClick={()=>handleSave(false)} style={{opacity:saving?0.6:1}} disabled={saving}>
                {saving?'Enviando...':'Enviar informe →'}
              </BtnP>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── INFORME USUARIO VIEW (read-only) ──────────────────────── */
function InformeUsuarioView({ informeId, onBack }) {
  const [informe,setInforme] = useState(null);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    apiFetch(`/api/informes/${informeId}`).then(r=>r.json()).then(data=>{
      setInforme(data); setLoading(false);
    }).catch(()=>setLoading(false));
  },[informeId]);

  if (loading||!informe) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',fontSize:13,color:'#71717a'}}>Cargando...</div>;

  const camData = informe.cam_data||{};
  const activeCams = Object.entries(CAMERA_CATALOG).filter(([id])=>camData[id]);
  const log = informe.logistica||{};

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'28px 20px 80px'}}>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:18,fontWeight:600,margin:0,marginBottom:4}}>{informe.encuentro||'Informe'}</h2>
        <p style={{fontSize:13,color:'#71717a',margin:0}}>{informe.jornada} · {fmt(informe.fecha)} · <Badge variant="ok">✓ Enviado</Badge></p>
      </div>

      {/* Resumen incidencias */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'Secciones',v:(activeCams.length+1)},
          {label:'Graves',v:informe.incidencias_graves||0,red:true},
          {label:'Leves',v:informe.incidencias_leves||0,yel:true},
        ].map(s=>(
          <Card key={s.label} style={{padding:'14px 16px',marginBottom:0,textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:s.red?'#dc2626':s.yel?'#d97706':'#09090b'}}>{s.v}</div>
            <div style={{fontSize:11,color:'#71717a',marginTop:2}}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Logística */}
      {log.items&&Object.keys(log.items).length>0&&(
        <Card style={{marginBottom:12}}>
          <SecTitle>Logística</SecTitle>
          <div style={{border:'1px solid #e4e4e7',borderRadius:8,overflow:'hidden'}}>
            {Object.entries(log.items).map(([item,val],i,arr)=>(
              <div key={item} style={{display:'flex',alignItems:'center',padding:'8px 12px',background:i%2===0?'#fff':'#fafafa',borderBottom:i<arr.length-1?'1px solid #e4e4e7':'none'}}>
                <span style={{flex:1,fontSize:12}}>{item}</span>
                <Badge variant={val==='G'?'grave':val==='L'?'leve':'ok'}>{val||'OK'}</Badge>
              </div>
            ))}
          </div>
          {log.incidencias&&<div style={{marginTop:8,fontSize:12,color:'#52525b',padding:'8px 12px',background:'#fafafa',borderRadius:6,border:'1px solid #e4e4e7'}}>{log.incidencias}</div>}
        </Card>
      )}

      {/* Por cámara */}
      {activeCams.map(([id,cam])=>{
        const d=camData[id]; const items=d?.items||{};
        const gv=Object.values(items).filter(v=>v==='G').length;
        const lv=Object.values(items).filter(v=>v==='L').length;
        // Modelos (equipos)
        const eq=d?.equipos?Object.values(d.equipos).filter(Boolean).join(' · '):(d?.equipo||'');
        return (
          <Card key={id} style={{borderLeft:`3px solid ${cam.color}`,marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
              <span style={{fontSize:15}}>{cam.icon}</span>
              <span style={{fontWeight:600,fontSize:13,flex:1}}>{cam.label}</span>
              {eq&&<span style={{fontSize:11,color:'#71717a',fontFamily:"'Geist Mono',monospace"}}>{eq}</span>}
              {gv>0&&<Badge variant="grave">⚠{gv}G</Badge>}
              {lv>0&&<Badge variant="leve">↓{lv}L</Badge>}
              {gv===0&&lv===0&&<Badge variant="ok">✓</Badge>}
            </div>
            {Object.keys(items).length>0&&(
              <div style={{border:'1px solid #e4e4e7',borderRadius:6,overflow:'hidden',marginBottom:d?.incidencias?8:0}}>
                {Object.entries(items).map(([item,val],i,arr)=>(
                  <div key={item} style={{display:'flex',alignItems:'center',padding:'6px 10px',background:i%2===0?'#fff':'#fafafa',borderBottom:i<arr.length-1?'1px solid #e4e4e7':'none'}}>
                    <span style={{flex:1,fontSize:11}}>{item}</span>
                    <Badge variant={val==='G'?'grave':val==='L'?'leve':'ok'} style={{fontSize:10}}>{val||'OK'}</Badge>
                  </div>
                ))}
              </div>
            )}
            {d?.incidencias&&<div style={{fontSize:12,color:'#52525b',padding:'6px 10px',background:'#fafafa',borderRadius:5,border:'1px solid #e4e4e7'}}>{d.incidencias}</div>}
          </Card>
        );
      })}

      <div style={{marginTop:20}}>
        <BtnO onClick={onBack}>← Volver a mis servicios</BtnO>
      </div>
    </div>
  );
}

/* ── USUARIO VIEW ROOT ─────────────────────────────────────── */
export default function UsuarioView({ user, onLogout }) {
  const [view,setView] = useState('list'); // 'list' | 'filling' | 'view_informe'
  const [selectedServicioId,setSelectedServicioId] = useState(null);
  const [draftInformeId,setDraftInformeId] = useState(null);
  const [viewInformeId,setViewInformeId] = useState(null);

  const handleSelect = (servicioId, draftId) => {
    setSelectedServicioId(servicioId);
    setDraftInformeId(draftId||null);
    setView('filling');
  };
  const handleViewInforme = (informeId) => { setViewInformeId(informeId); setView('view_informe'); };
  const handleBack = () => { setSelectedServicioId(null); setDraftInformeId(null); setViewInformeId(null); setView('list'); };

  return (
    <div style={{minHeight:'100vh',background:'#fafafa'}}>
      <Header user={user} onLogout={onLogout} />
      {view==='list'&&<ServiciosList onSelect={handleSelect} onViewInforme={handleViewInforme} />}
      {view==='filling'&&selectedServicioId&&<FillReport servicioId={selectedServicioId} draftInformeId={draftInformeId} onBack={handleBack} />}
      {view==='view_informe'&&viewInformeId&&<InformeUsuarioView informeId={viewInformeId} onBack={handleBack} />}
    </div>
  );
}
