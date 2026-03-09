import { useState, useCallback, useEffect } from "react";
import {
  apiFetch, Input, Select, Textarea, Label, Card, SecTitle, BtnP, BtnO, Badge,
  Field, Sep, StatusToggle, CameraSection, initItems, STATUS,
  CAMERA_CATALOG, OPERATOR_GROUPS, LOGISTICA_ITEMS
} from "./App.jsx";

/* ── helpers ── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—';

/* ── PDF HOJA DE SERVICIO (descarga directa desde servidor) ─── */
async function generateServicioPDF(servicio) {
  try {
    const res = await apiFetch(`/api/servicios/${servicio.id}/hoja-pdf`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoja-servicio-${(servicio.encuentro||'servicio').replace(/[^\w]/g,'-')}.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } catch(e) { alert('Error generando PDF'); }
}

/* ── (eliminado: generador jsPDF inline) ──────────────────── */
function _obsolete(servicio) {
  const ops = servicio.operadores || {};
  const activeCams = servicio.camaras_activas
    ? Object.entries(CAMERA_CATALOG).filter(([id]) => servicio.camaras_activas[id])
    : [];
  const camModels = servicio.cam_models || {};

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, M = 18, CW = PW - 2 * M;
  let y = 18;

  // ── header ──
  doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.setTextColor(15);
  doc.text(servicio.encuentro||'—', M, y);
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(80);
  doc.text(`${servicio.jornada||''} · ${fmtD(servicio.fecha)}`, M, y+7);
  doc.setFontSize(9); doc.setTextColor(100);
  doc.text('MEDIAPRO · CCEE', PW-M, y, {align:'right'});
  doc.text('Hoja de servicio · Temporada 25/26', PW-M, y+5, {align:'right'});
  doc.setTextColor(0);
  y += 14;
  doc.setDrawColor(180); doc.line(M, y, PW-M, y); y += 6;

  // ── section title ──
  const sec = (title) => {
    doc.setFontSize(7.5); doc.setFont('helvetica','bold'); doc.setTextColor(130);
    doc.text(title.toUpperCase(), M, y);
    doc.setTextColor(0); doc.setDrawColor(210); doc.line(M, y+1.5, PW-M, y+1.5); y += 7;
  };

  // ── 3-column grid of cells ──
  const grid = (items) => {
    const CW3 = (CW-6)/3, RH = 14;
    items.forEach(([label,val],i) => {
      const col=i%3, row=Math.floor(i/3);
      const cx=M+col*(CW3+3), cy=y+row*RH;
      doc.setFillColor(247,247,247); doc.setDrawColor(225,225,225);
      doc.rect(cx,cy,CW3,RH-2,'FD');
      doc.setFontSize(6.5); doc.setFont('helvetica','bold'); doc.setTextColor(140);
      doc.text((label||'').toUpperCase(), cx+3, cy+4);
      doc.setFontSize(8.5); doc.setFont('helvetica','bold'); doc.setTextColor(20);
      const valStr = String(val||'—');
      doc.text(valStr.length>28?valStr.slice(0,27)+'…':valStr, cx+3, cy+10);
    });
    y += Math.ceil(items.length/3)*RH + 3;
    doc.setTextColor(0);
  };

  // ── Datos del servicio ──
  sec('Datos del servicio');
  grid([
    ['Jornada',servicio.jornada],['Encuentro',servicio.encuentro],['Fecha',fmtD(servicio.fecha)],
    ['Hora partido',servicio.hora_partido],['Hora citación',servicio.hora_citacion],
    ['Horario citación MD-1',servicio.horario_md1],
  ]);

  // ── Equipo técnico ──
  sec('Equipo técnico');
  grid([
    ['Responsable CCEE',servicio.responsable],['Unidad Móvil',servicio.um],['',''],
    ['J. Técnico UM',servicio.jefe_tecnico],['Teléfono',servicio.tel_jefe_tecnico||'—'],['',''],
    ['Realizador',servicio.realizador],['Teléfono',servicio.tel_realizador||'—'],['',''],
    ['Productor',servicio.productor],['Teléfono',servicio.tel_productor||'—'],['',''],
  ]);

  // ── Cámaras y modelos ──
  if (activeCams.length > 0) {
    sec(`Cámaras activas · ${activeCams.length}`);
    activeCams.forEach(([id,cam]) => {
      const models = camModels[id];
      const modelStr = models ? Object.values(models).filter(Boolean).join(' · ') : '';
      doc.setFillColor(242,242,242); doc.setDrawColor(220,220,220);
      doc.rect(M, y, CW, 9, 'FD');
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(20);
      doc.text(cam.label, M+3, y+6);
      if (modelStr) {
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(80);
        doc.text(modelStr, PW-M-3, y+6, {align:'right'});
      }
      doc.setTextColor(0); y += 10;
    });
    y += 3;
  }

  // ── Operadores ──
  const opList = OPERATOR_GROUPS.flatMap(g => g.roles.filter(r=>ops[r.key]).map(r=>[r.label,ops[r.key]]));
  if (opList.length > 0) {
    sec('Operadores asignados');
    opList.forEach(([label,name],i) => {
      const bg = i%2===0;
      if (bg) { doc.setFillColor(248,248,248); doc.rect(M,y,CW,8,'F'); }
      doc.setFontSize(8.5); doc.setFont('helvetica','normal'); doc.setTextColor(90);
      doc.text(label, M+3, y+5.5);
      doc.setFont('helvetica','bold'); doc.setTextColor(20);
      doc.text(name, M+70, y+5.5);
      doc.setDrawColor(230); doc.line(M, y+8, PW-M, y+8);
      y += 8;
    });
    y += 3;
  }

  // ── footer ──
  doc.setFontSize(7.5); doc.setFont('helvetica','normal'); doc.setTextColor(170);
  doc.text('MEDIAPRO · Cámaras Especiales · Hoja de servicio', M, PH-10);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, PW-M, PH-10, {align:'right'});

  const filename = `hoja-servicio-${(servicio.encuentro||'servicio').replace(/[^\w]/g,'-')}.pdf`;
  // _obsolete — no longer used
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
          <div key={doc.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#F5F0EC',borderRadius:8,border:'1px solid #DDD5CE'}}>
            <span style={{fontSize:20}}>{fileIcon(doc.tipo)}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500}}>{doc.descripcion}</div>
              <div style={{fontSize:11,color:'#7A7168',marginTop:1}}>{doc.nombre}</div>
            </div>
            <BtnO onClick={()=>handleOpen(doc)} style={{height:30,fontSize:12,padding:'0 12px'}}>Abrir</BtnO>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── HEADER ────────────────────────────────────────────────── */
function Header({ user, onLogout, onHome }) {
  return (
    <header style={{background:'#1A1A1A',borderBottom:'3px solid #E8392C',position:'sticky',top:0,zIndex:100}}>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'0 20px',height:58,display:'flex',alignItems:'center',gap:16}}>
        {/* Logo MEDIAPRO */}
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:6,background:'#E8392C',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>📷</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,lineHeight:1.2,color:'#fff',letterSpacing:'0.05em',fontFamily:"'Montserrat',-apple-system,sans-serif"}}>MEDIAPRO</div>
            <div style={{fontSize:9,color:'#C2B9AD',lineHeight:1.2,letterSpacing:'0.14em',textTransform:'uppercase',fontFamily:"'Montserrat',-apple-system,sans-serif"}}>Cámaras Especiales</div>
          </div>
        </div>
        <div style={{flex:1}} />
        {onHome&&(
          <button onClick={onHome} style={{height:28,fontSize:11,padding:'0 12px',borderRadius:6,border:'1px solid #555',background:'transparent',color:'#C2B9AD',cursor:'pointer',fontFamily:"'Montserrat',-apple-system,sans-serif",fontWeight:500}}>
            🏠 Mis servicios
          </button>
        )}
        <div style={{width:1,height:20,background:'#444'}} />
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
          <span style={{fontSize:12,color:'#fff',fontFamily:"'Montserrat',-apple-system,sans-serif",fontWeight:600}}>{user.name}</span>
          <span style={{fontSize:9,color:'#C2B9AD',letterSpacing:'0.1em',textTransform:'uppercase',fontFamily:"'Montserrat',-apple-system,sans-serif"}}>Técnico</span>
        </div>
        <button onClick={onLogout} style={{height:28,fontSize:11,padding:'0 12px',borderRadius:6,border:'1px solid #555',background:'transparent',color:'#C2B9AD',cursor:'pointer',fontFamily:"'Montserrat',-apple-system,sans-serif",fontWeight:500}}>Salir</button>
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

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',fontSize:13,color:'#7A7168'}}>Cargando...</div>;

  const sinIniciar = servicios.filter(s=>s.status==='pendiente'&&!informeMap[s.id]);
  const enCurso   = servicios.filter(s=>s.status==='pendiente'&&informeMap[s.id]?.status==='borrador');
  const enviados  = servicios.filter(s=>s.status==='completado');
  const total = servicios.length;

  const ServiceRow = ({ s, onClick, badge, canClick=true, dim=false }) => {
    const [docsOpen,setDocsOpen] = useState(false);
    return (
      <div>
        <div onClick={canClick?onClick:undefined}
          style={{padding:'14px 16px',cursor:canClick?'pointer':'default',background:'#fff',transition:'background 0.1s'}}
          onMouseEnter={e=>{if(canClick)e.currentTarget.style.background='#F5F0EC';}}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <div style={{display:'flex',alignItems:'center',gap:12,opacity:dim?0.7:1}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:500}}>{s.encuentro||'—'}</div>
              <div style={{fontSize:11,color:'#7A7168',marginTop:3}}>
                <span style={{fontFamily:"'Courier New',monospace"}}>{s.jornada}</span>
                {' · '}{fmt(s.fecha)}
                {s.hora_partido&&<>{' · '}{s.hora_partido}</>}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {badge}
              <button onClick={e=>{e.stopPropagation();setDocsOpen(o=>!o);}}
                style={{border:'1px solid #DDD5CE',borderRadius:6,background:'#F5F0EC',padding:'3px 8px',fontSize:11,cursor:'pointer',color:'#7A7168',lineHeight:1.4}}>
                📎
              </button>
              {canClick&&<span style={{color:'#7A7168',fontSize:18}}>›</span>}
            </div>
          </div>
        </div>
        {docsOpen&&(
          <div style={{padding:'0 16px 12px',borderTop:'1px solid #DDD5CE',background:'#F5F0EC'}}>
            <DocumentosUsuario servicioId={s.id} />
          </div>
        )}
      </div>
    );
  };

  const SectionHeader = ({label,count}) => (
    <div style={{fontSize:11,fontWeight:600,color:'#7A7168',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>{label} · {count}</div>
  );

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'24px 20px 80px'}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:600,margin:0,marginBottom:4}}>Mis servicios</h1>
        <p style={{fontSize:13,color:'#7A7168',margin:0}}>Servicios asignados · Temporada 25/26</p>
      </div>

      {total===0&&(
        <Card style={{textAlign:'center',padding:'48px 20px'}}>
          <div style={{fontSize:13,color:'#7A7168'}}>No tienes servicios asignados todavía.</div>
        </Card>
      )}

      {sinIniciar.length>0&&(
        <div style={{marginBottom:24}}>
          <SectionHeader label="Pendientes de informe" count={sinIniciar.length} />
          <Card style={{padding:0,overflow:'hidden'}}>
            {sinIniciar.map((s,i)=>(
              <div key={s.id} style={{borderBottom:i<sinIniciar.length-1?'1px solid #DDD5CE':'none'}}>
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
              <div key={s.id} style={{borderBottom:i<enCurso.length-1?'1px solid #DDD5CE':'none'}}>
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
              <div key={s.id} style={{borderBottom:i<enviados.length-1?'1px solid #DDD5CE':'none'}}>
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

  if (loading||!servicio) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',fontSize:13,color:'#7A7168'}}>Cargando servicio...</div>;

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
      <div style={{fontSize:13,color:'#7A7168'}}>{servicio.encuentro} · {servicio.jornada}</div>
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
            <p style={{fontSize:13,color:'#7A7168',margin:0}}>Datos del servicio asignado</p>
          </div>

          <Card>
            <SecTitle>Datos del servicio</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
              {[
                ['Jornada',servicio.jornada],['Encuentro',servicio.encuentro],
                ['Fecha',fmt(servicio.fecha)],['Hora partido',servicio.hora_partido||'—'],
                ['Hora citación',servicio.hora_citacion||'—'],['Horario citación MD-1',servicio.horario_md1||'—'],
                ['Responsable CCEE',servicio.responsable||'—'],['Unidad Móvil',servicio.um||'—'],
                ['J. Técnico UM',servicio.jefe_tecnico||'—'],
                ...(servicio.tel_jefe_tecnico?[['Tel. J. Técnico',servicio.tel_jefe_tecnico]]:[]),
                ['Realizador',servicio.realizador||'—'],
                ...(servicio.tel_realizador?[['Tel. Realizador',servicio.tel_realizador]]:[]),
                ['Productor',servicio.productor||'—'],
                ...(servicio.tel_productor?[['Tel. Productor',servicio.tel_productor]]:[]),
              ].map(([k,v])=>(
                <div key={k} style={{padding:'10px 12px',background:'#F5F0EC',borderRadius:8,border:'1px solid #DDD5CE'}}>
                  <div style={{fontSize:10,fontWeight:500,color:'#7A7168',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:12,fontWeight:500,fontFamily:"'Courier New',monospace"}}>{v||'—'}</div>
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
                    <div key={r.key} style={{display:'flex',gap:8,padding:'6px 10px',background:'#F5F0EC',borderRadius:8,fontSize:12}}>
                      <span style={{color:'#7A7168',minWidth:90}}>{r.label}</span>
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
              <p style={{fontSize:13,color:'#7A7168',margin:0}}>{servicio.encuentro} · {servicio.jornada}</p>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:4}}>
              {g>0&&<Badge variant="grave">⚠ {g}G</Badge>}
              {l>0&&<Badge variant="leve">↓ {l}L</Badge>}
              {g===0&&l===0&&<Badge variant="ok">Sin incidencias</Badge>}
            </div>
          </div>

          <Card style={{borderLeft:'3px solid #8b5cf6'}}>
            <SecTitle>Horarios de jornada</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="Inicio MD-1"><Input type="time" value={logistica.inicio_md1||''} onChange={e=>setLogistica(l=>({...l,inicio_md1:e.target.value}))} /></Field>
              <Field label="Fin MD-1"><Input type="time" value={logistica.fin_md1||''} onChange={e=>setLogistica(l=>({...l,fin_md1:e.target.value}))} /></Field>
              <Field label="Inicio MD"><Input type="time" value={logistica.inicio_md||''} onChange={e=>setLogistica(l=>({...l,inicio_md:e.target.value}))} /></Field>
              <Field label="Fin MD"><Input type="time" value={logistica.fin_md||''} onChange={e=>setLogistica(l=>({...l,fin_md:e.target.value}))} /></Field>
            </div>
          </Card>

          <Card style={{borderLeft:'3px solid #f59e0b'}}>
            <SecTitle>Logística</SecTitle>
            <div style={{border:'1px solid #DDD5CE',borderRadius:8,overflow:'hidden',marginBottom:12}}>
              {LOGISTICA_ITEMS.map((item,i)=>(
                <div key={item} style={{display:'flex',alignItems:'center',gap:12,padding:'9px 12px',background:i%2===0?'#fff':'#F5F0EC',borderBottom:i<LOGISTICA_ITEMS.length-1?'1px solid #DDD5CE':'none'}}>
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
            <p style={{fontSize:13,color:'#7A7168',margin:0}}>Revisa antes de guardar</p>
          </div>

          <Card>
            <SecTitle>Datos del servicio</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
              {[
                ['Jornada',servicio.jornada],['Encuentro',servicio.encuentro],['Fecha',fmt(servicio.fecha)],
                ['Hora',servicio.hora_partido||'—'],['Responsable',servicio.responsable||'—'],['Cámaras',`${activeCams.length} activas`],
                ...(logistica.inicio_md1||logistica.fin_md1?[['Inicio MD-1',logistica.inicio_md1||'—'],['Fin MD-1',logistica.fin_md1||'—'],['','']]:[] ),
                ...(logistica.inicio_md||logistica.fin_md?[['Inicio MD',logistica.inicio_md||'—'],['Fin MD',logistica.fin_md||'—'],['','']]:[] ),
              ].map(([k,v])=>k?(
                <div key={k} style={{padding:'10px 12px',background:'#F5F0EC',borderRadius:8,border:'1px solid #DDD5CE'}}>
                  <div style={{fontSize:10,fontWeight:500,color:'#7A7168',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:500,fontFamily:"'Courier New',monospace"}}>{v||'—'}</div>
                </div>
              ):<div key={Math.random()} />)}
            </div>
          </Card>

          <Card>
            <SecTitle>Estado general</SecTitle>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
              <div style={{padding:14,background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:600,color:'#16a34a',fontFamily:"'Courier New',monospace"}}>{activeCams.length+1}</div>
                <div style={{fontSize:11,color:'#16a34a',marginTop:2}}>Secciones</div>
              </div>
              <div style={{padding:14,background:g>0?'#fef2f2':'#F5F0EC',border:`1px solid ${g>0?'#fecaca':'#DDD5CE'}`,borderRadius:8,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:600,color:g>0?'#dc2626':'#C2B9AD',fontFamily:"'Courier New',monospace"}}>{g}</div>
                <div style={{fontSize:11,color:g>0?'#dc2626':'#C2B9AD',marginTop:2}}>Graves</div>
              </div>
              <div style={{padding:14,background:l>0?'#fffbeb':'#F5F0EC',border:`1px solid ${l>0?'#fde68a':'#DDD5CE'}`,borderRadius:8,textAlign:'center'}}>
                <div style={{fontSize:22,fontWeight:600,color:l>0?'#d97706':'#C2B9AD',fontFamily:"'Courier New',monospace"}}>{l}</div>
                <div style={{fontSize:11,color:l>0?'#d97706':'#C2B9AD',marginTop:2}}>Leves</div>
              </div>
            </div>
            <div style={{border:'1px solid #DDD5CE',borderRadius:8,overflow:'hidden'}}>
              {activeCams.map(([id,cam],i)=>{
                const d=camData[id]; const items=d?.items||{};
                const gv=Object.values(items).filter(v=>v==='G').length;
                const lv=Object.values(items).filter(v=>v==='L').length;
                return (
                  <div key={id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:i%2===0?'#fff':'#F5F0EC',borderBottom:i<activeCams.length-1?'1px solid #DDD5CE':'none'}}>
                    <span style={{fontSize:14}}>{cam.icon}</span>
                    <div style={{flex:1,fontSize:12,fontWeight:500}}>{cam.label}</div>
                    {(()=>{const eq=d?.equipos?Object.values(d.equipos).filter(Boolean).join(' · '):(d?.equipo||''); return eq?<span style={{fontSize:11,color:'#7A7168',fontFamily:"'Courier New',monospace"}}>{eq}</span>:null;})()}
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

  if (loading||!informe) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',fontSize:13,color:'#7A7168'}}>Cargando...</div>;

  const camData = informe.cam_data||{};
  const activeCams = Object.entries(CAMERA_CATALOG).filter(([id])=>camData[id]);
  const log = informe.logistica||{};

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'28px 20px 80px'}}>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:18,fontWeight:600,margin:0,marginBottom:4}}>{informe.encuentro||'Informe'}</h2>
        <p style={{fontSize:13,color:'#7A7168',margin:0}}>{informe.jornada} · {fmt(informe.fecha)} · <Badge variant="ok">✓ Enviado</Badge></p>
      </div>

      {/* Horarios de jornada */}
      {(log.inicio_md1||log.fin_md1||log.inicio_md||log.fin_md)&&(
        <Card style={{marginBottom:12}}>
          <SecTitle>Horarios de jornada</SecTitle>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {[['Inicio MD-1',log.inicio_md1],['Fin MD-1',log.fin_md1],['Inicio MD',log.inicio_md],['Fin MD',log.fin_md]].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{padding:'8px 10px',background:'#f5f3ff',borderRadius:8,border:'1px solid #ddd6fe'}}>
                <div style={{fontSize:9,fontWeight:600,color:'#7c3aed',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:2}}>{k}</div>
                <div style={{fontSize:14,fontWeight:600,fontFamily:"'Courier New',monospace"}}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Resumen incidencias */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'Secciones',v:(activeCams.length+1)},
          {label:'Graves',v:informe.incidencias_graves||0,red:true},
          {label:'Leves',v:informe.incidencias_leves||0,yel:true},
        ].map(s=>(
          <Card key={s.label} style={{padding:'14px 16px',marginBottom:0,textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:700,fontFamily:"'Courier New',monospace",color:s.red?'#dc2626':s.yel?'#d97706':'#1A1A1A'}}>{s.v}</div>
            <div style={{fontSize:11,color:'#7A7168',marginTop:2}}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Logística */}
      {log.items&&Object.keys(log.items).length>0&&(
        <Card style={{marginBottom:12}}>
          <SecTitle>Logística</SecTitle>
          <div style={{border:'1px solid #DDD5CE',borderRadius:8,overflow:'hidden'}}>
            {Object.entries(log.items).map(([item,val],i,arr)=>(
              <div key={item} style={{display:'flex',alignItems:'center',padding:'8px 12px',background:i%2===0?'#fff':'#F5F0EC',borderBottom:i<arr.length-1?'1px solid #DDD5CE':'none'}}>
                <span style={{flex:1,fontSize:12}}>{item}</span>
                <Badge variant={val==='G'?'grave':val==='L'?'leve':'ok'}>{val||'OK'}</Badge>
              </div>
            ))}
          </div>
          {log.incidencias&&<div style={{marginTop:8,fontSize:12,color:'#5C534D',padding:'8px 12px',background:'#F5F0EC',borderRadius:6,border:'1px solid #DDD5CE'}}>{log.incidencias}</div>}
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
              {eq&&<span style={{fontSize:11,color:'#7A7168',fontFamily:"'Courier New',monospace"}}>{eq}</span>}
              {gv>0&&<Badge variant="grave">⚠{gv}G</Badge>}
              {lv>0&&<Badge variant="leve">↓{lv}L</Badge>}
              {gv===0&&lv===0&&<Badge variant="ok">✓</Badge>}
            </div>
            {Object.keys(items).length>0&&(
              <div style={{border:'1px solid #DDD5CE',borderRadius:6,overflow:'hidden',marginBottom:d?.incidencias?8:0}}>
                {Object.entries(items).map(([item,val],i,arr)=>(
                  <div key={item} style={{display:'flex',alignItems:'center',padding:'6px 10px',background:i%2===0?'#fff':'#F5F0EC',borderBottom:i<arr.length-1?'1px solid #DDD5CE':'none'}}>
                    <span style={{flex:1,fontSize:11}}>{item}</span>
                    <Badge variant={val==='G'?'grave':val==='L'?'leve':'ok'} style={{fontSize:10}}>{val||'OK'}</Badge>
                  </div>
                ))}
              </div>
            )}
            {d?.incidencias&&<div style={{fontSize:12,color:'#5C534D',padding:'6px 10px',background:'#F5F0EC',borderRadius:5,border:'1px solid #DDD5CE'}}>{d.incidencias}</div>}
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
    <div style={{minHeight:'100vh',background:'#F5F0EC'}}>
      <Header user={user} onLogout={onLogout} onHome={view!=='list'?handleBack:null} />
      {view==='list'&&<ServiciosList onSelect={handleSelect} onViewInforme={handleViewInforme} />}
      {view==='filling'&&selectedServicioId&&<FillReport servicioId={selectedServicioId} draftInformeId={draftInformeId} onBack={handleBack} />}
      {view==='view_informe'&&viewInformeId&&<InformeUsuarioView informeId={viewInformeId} onBack={handleBack} />}
    </div>
  );
}
