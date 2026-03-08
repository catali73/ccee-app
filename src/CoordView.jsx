import { useState, useCallback, useEffect, useRef } from "react";
import AnalisisView from "./AnalisisView.jsx";
import {
  apiFetch, Input, Select, Textarea, Label, Card, SecTitle, BtnP, BtnO, Badge,
  Field, Sep, Steps, StatusToggle, CameraToggle, CameraSection, initItems, STATUS,
  CAMERA_CATALOG, OPERATOR_GROUPS, PERSONAL, TIPOS_SERVICIO, LIGA_PARTIDOS, LOGISTICA_ITEMS
} from "./App.jsx";

/* ── helpers ── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—';

/* ── HOJA DE SERVICIO PDF (descarga directa, igual que usuario) ── */
async function downloadHojaPDF(servicioId, encuentro) {
  try {
    const res = await apiFetch(`/api/servicios/${servicioId}/hoja-pdf`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hoja-servicio-${(encuentro||'servicio').replace(/[^\w]/g,'-')}.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } catch { alert('Error generando PDF'); }
}

/* ── PDF GENERATOR ─────────────────────────────────────────── */
function generatePDF(informe) {
  const fmtD = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—';
  const SC = { OK:'#16a34a', G:'#dc2626', L:'#d97706', '—':'#999' };
  const ops = informe.operadores || {};
  const log = informe.logistica || {};
  const logItems = log.items || {};
  const camData = informe.cam_data || {};
  const activeCams = Object.entries(CAMERA_CATALOG).filter(([id]) => camData[id]);

  const cell = (label,val) => `<div class="cell"><div class="cl">${label}</div><div class="cv">${val||'—'}</div></div>`;

  const opRows = OPERATOR_GROUPS.flatMap(g => g.roles.filter(r=>ops[r.key]).map(r=>
    `<tr><td>${r.label}</td><td><strong>${ops[r.key]}</strong></td></tr>`
  )).join('');

  const logRows = LOGISTICA_ITEMS.map(item => {
    const v = logItems[item]||'—';
    return `<tr><td>${item}</td><td style="color:${SC[v]||'#999'};font-weight:700;text-align:center">${v}</td></tr>`;
  }).join('');

  const camSections = activeCams.map(([id,cam]) => {
    const d = camData[id]||{}; const items = d.items||{};
    const gv=Object.values(items).filter(v=>v==='G').length;
    const lv=Object.values(items).filter(v=>v==='L').length;
    const itemCells = Object.entries(items).map(([k,v])=>
      `<div class="ic"><span>${k}</span><span style="color:${SC[v]||'#999'};font-weight:700">${v||'—'}</span></div>`
    ).join('');
    return `<div class="cam-block">
      <div class="cam-head">
        <span>${cam.icon} ${cam.label}${(()=>{const eq=d.equipos?Object.values(d.equipos).filter(Boolean).join(' · '):(d.equipo||'');return eq?` · <span style="font-family:monospace;font-weight:400">${eq}</span>`:''})()}</span>
        <span style="font-size:11px">${gv>0?`⚠ ${gv}G  `:''}${lv>0?`↓ ${lv}L`:''} ${gv===0&&lv===0?'✓ OK':''}</span>
      </div>
      ${itemCells?`<div class="ic-grid">${itemCells}</div>`:''}
      ${d.incidencias?`<div class="obs">${d.incidencias}</div>`:''}
    </div>`;
  }).join('');

  const inc = informe.incidencias_graves>0||informe.incidencias_leves>0
    ? `${informe.incidencias_graves>0?`<span style="color:#dc2626;font-weight:700">⚠ ${informe.incidencias_graves} Graves</span>  `:''}${informe.incidencias_leves>0?`<span style="color:#d97706;font-weight:700">↓ ${informe.incidencias_leves} Leves</span>`:''}`
    : `<span style="color:#16a34a;font-weight:700">✓ Sin incidencias</span>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Informe CCEE · ${informe.encuentro||''}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1a1a1a;padding:28px 32px}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #111}
.title{font-size:20px;font-weight:700;margin-bottom:3px}
.sub{font-size:12px;color:#555}
.brand{font-size:11px;font-weight:700;text-align:right;color:#555}
h2{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin:16px 0 8px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.cell{background:#f7f7f7;border:1px solid #e5e5e5;border-radius:4px;padding:6px 9px}
.cl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#999;margin-bottom:2px}
.cv{font-size:11px;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px}
td{border:1px solid #e5e5e5;padding:5px 9px}
tr:nth-child(even) td{background:#fafafa}
.cam-block{border:1px solid #ddd;border-radius:6px;overflow:hidden;margin-bottom:10px;page-break-inside:avoid}
.cam-head{background:#f0f0f0;padding:7px 11px;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:12px}
.ic-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));border-top:1px solid #e5e5e5}
.ic{display:flex;justify-content:space-between;align-items:center;padding:4px 10px;border-right:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;font-size:11px}
.obs{padding:5px 11px;border-top:1px solid #eee;font-size:11px;color:#666;background:#fffbeb}
.ftr{margin-top:24px;padding-top:10px;border-top:1px solid #e0e0e0;font-size:10px;color:#aaa;display:flex;justify-content:space-between}
@media print{body{padding:16px 20px}}
</style></head><body>
<div class="hdr">
  <div>
    <div class="title">${informe.encuentro||'—'}</div>
    <div class="sub">${informe.jornada||''} · ${fmtD(informe.fecha)}</div>
    <div style="margin-top:10px">${inc}</div>
  </div>
  <div class="brand">MEDIAPRO · CCEE<br><span style="font-weight:400">Cámaras Especiales · Temporada 25/26</span></div>
</div>
<h2>Datos del partido</h2>
<div class="grid">
  ${[['Jornada',informe.jornada],['Encuentro',informe.encuentro],['Fecha',fmtD(informe.fecha)],['Hora partido',informe.hora_partido],['Hora citación',informe.hora_citacion],['Horario citación MD-1',informe.horario_md1]].map(([k,v])=>cell(k,v)).join('')}
</div>
<h2>Equipo técnico</h2>
<div class="grid">
  ${[['Responsable CCEE',informe.responsable],['Unidad Móvil',informe.um],['J. Técnico UM',informe.jefe_tecnico],['Realizador',informe.realizador],['Productor',informe.productor]].map(([k,v])=>cell(k,v)).join('')}
</div>
${opRows?`<h2>Operadores</h2><table><tbody>${opRows}</tbody></table>`:''}
${Object.keys(logItems).length>0?`<h2>Logística</h2><table><tbody>${logRows}</tbody></table>${log.incidencias?`<div class="obs" style="margin-bottom:10px">${log.incidencias}</div>`:''}`:''}
${activeCams.length>0?`<h2>Cámaras · ${activeCams.length} activas</h2>${camSections}`:''}
<div class="ftr">
  <span>MEDIAPRO · Cámaras Especiales</span>
  <span>Generado: ${new Date().toLocaleString('es-ES')}</span>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

  const win = window.open('','_blank','width=900,height=750');
  if (win) { win.document.write(html); win.document.close(); }
}

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
    { id:'analisis', label:'Análisis' },
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

/* ── INFORME MODAL ─────────────────────────────────────────── */
const STATUS_COLOR = { OK:'#16a34a', G:'#dc2626', L:'#d97706', '—':'#71717a' };
const STATUS_BG    = { OK:'#f0fdf4', G:'#fef2f2', L:'#fffbeb', '—':'#f4f4f5' };

function InformeModal({ informe, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar el informe de "${informe.encuentro}"? El servicio volverá a estado pendiente.`)) return;
    setDeleting(true);
    await apiFetch(`/api/informes/${informe.id}`, { method:'DELETE' });
    setDeleting(false);
    onDeleted();
  };

  const ops = informe.operadores || {};
  const log = informe.logistica || {};
  const logItems = log.items || {};
  const camData  = informe.cam_data || {};
  const activeCams = Object.entries(CAMERA_CATALOG).filter(([id]) => camData[id]);

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'center',overflowY:'auto',padding:'40px 20px'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:12,width:'100%',maxWidth:760,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',marginBottom:40}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'18px 20px',borderBottom:'1px solid #e4e4e7',position:'sticky',top:0,background:'#fff',borderRadius:'12px 12px 0 0',zIndex:1}}>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:600}}>{informe.encuentro||'Informe'}</div>
            <div style={{fontSize:11,color:'#71717a',marginTop:2,fontFamily:"'Geist Mono',monospace"}}>{informe.jornada} · {fmt(informe.fecha)}</div>
          </div>
          <div style={{display:'flex',gap:4}}>
            {informe.incidencias_graves>0&&<Badge variant="grave">⚠ {informe.incidencias_graves}G</Badge>}
            {informe.incidencias_leves>0&&<Badge variant="leve">↓ {informe.incidencias_leves}L</Badge>}
            {!informe.incidencias_graves&&!informe.incidencias_leves&&<Badge variant="ok">✓ Sin incidencias</Badge>}
          </div>
          <button onClick={()=>generatePDF(informe)}
            style={{padding:'0 12px',height:30,borderRadius:6,border:'1px solid #e4e4e7',background:'#fff',color:'#18181b',fontSize:12,cursor:'pointer',fontWeight:500}}>
            📄 PDF
          </button>
          <button onClick={handleDelete} disabled={deleting}
            style={{padding:'0 12px',height:30,borderRadius:6,border:'1px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontSize:12,cursor:'pointer',fontWeight:500,opacity:deleting?0.6:1}}>
            {deleting?'Eliminando…':'🗑 Eliminar'}
          </button>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'#71717a',fontSize:20,lineHeight:1,padding:'0 4px'}}>✕</button>
        </div>

        <div style={{padding:'20px'}}>

          {/* Datos del partido */}
          <div style={{marginBottom:6,fontSize:10,fontWeight:600,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.08em'}}>Partido</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
            {[['Jornada',informe.jornada],['Encuentro',informe.encuentro],['Fecha',fmt(informe.fecha)],
              ['Hora partido',informe.hora_partido],['Hora citación',informe.hora_citacion],['Horario citación MD-1',informe.horario_md1]
            ].map(([k,v])=>(
              <div key={k} style={{padding:'8px 10px',background:'#fafafa',borderRadius:8,border:'1px solid #e4e4e7'}}>
                <div style={{fontSize:9,fontWeight:600,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:2}}>{k}</div>
                <div style={{fontSize:12,fontWeight:500}}>{v||'—'}</div>
              </div>
            ))}
          </div>

          {/* Equipo técnico */}
          <div style={{marginBottom:6,fontSize:10,fontWeight:600,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.08em'}}>Equipo técnico</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
            {[['Responsable CCEE',informe.responsable],['Unidad Móvil',informe.um],['J. Técnico UM',informe.jefe_tecnico],
              ['Realizador',informe.realizador],['Productor',informe.productor]
            ].map(([k,v])=>(
              <div key={k} style={{padding:'8px 10px',background:'#fafafa',borderRadius:8,border:'1px solid #e4e4e7'}}>
                <div style={{fontSize:9,fontWeight:600,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:2}}>{k}</div>
                <div style={{fontSize:12,fontWeight:500}}>{v||'—'}</div>
              </div>
            ))}
          </div>

          {/* Operadores */}
          {Object.values(ops).some(v=>v)&&(
            <>
              <div style={{marginBottom:6,fontSize:10,fontWeight:600,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.08em'}}>Operadores</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:16}}>
                {OPERATOR_GROUPS.map(g=>g.roles.map(r=>{ const v=ops[r.key]; if(!v) return null; return (
                  <div key={r.key} style={{display:'flex',gap:8,padding:'6px 10px',background:'#fafafa',borderRadius:8,border:'1px solid #e4e4e7',fontSize:12}}>
                    <span style={{color:'#71717a',minWidth:100,flexShrink:0}}>{r.label}</span>
                    <span style={{fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</span>
                  </div>
                );}))}
              </div>
            </>
          )}

          {/* Logística */}
          {Object.keys(logItems).length>0&&(
            <>
              <div style={{marginBottom:6,fontSize:10,fontWeight:600,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.08em'}}>Logística</div>
              <div style={{border:'1px solid #e4e4e7',borderRadius:8,overflow:'hidden',marginBottom:16}}>
                {LOGISTICA_ITEMS.map((item,i)=>{
                  const v = logItems[item]||'—';
                  return (
                    <div key={item} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',background:i%2===0?'#fff':'#fafafa',borderBottom:i<LOGISTICA_ITEMS.length-1?'1px solid #e4e4e7':'none'}}>
                      <div style={{flex:1,fontSize:12}}>{item}</div>
                      <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4,background:STATUS_BG[v]||'#f4f4f5',color:STATUS_COLOR[v]||'#71717a'}}>{v}</span>
                    </div>
                  );
                })}
                {log.incidencias&&<div style={{padding:'8px 12px',borderTop:'1px solid #e4e4e7',fontSize:12,color:'#71717a'}}>{log.incidencias}</div>}
              </div>
            </>
          )}

          {/* Cámaras */}
          {activeCams.length>0&&(
            <>
              <div style={{marginBottom:6,fontSize:10,fontWeight:600,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.08em'}}>Cámaras · {activeCams.length} activas</div>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:4}}>
                {activeCams.map(([id,cam])=>{
                  const d = camData[id]||{}; const items = d.items||{};
                  const gv=Object.values(items).filter(v=>v==='G').length;
                  const lv=Object.values(items).filter(v=>v==='L').length;
                  return (
                    <div key={id} style={{border:'1px solid #e4e4e7',borderRadius:8,overflow:'hidden'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'#fafafa',borderBottom:Object.keys(items).length>0?'1px solid #e4e4e7':'none'}}>
                        <span style={{fontSize:14}}>{cam.icon}</span>
                        <span style={{fontSize:12,fontWeight:600,flex:1}}>{cam.label}</span>
                        {(()=>{const eq=d.equipos?Object.values(d.equipos).filter(Boolean).join(' · '):(d.equipo||'');return eq?<span style={{fontSize:11,color:'#71717a',fontFamily:"'Geist Mono',monospace"}}>{eq}</span>:null;})()}
                        <div style={{display:'flex',gap:3}}>
                          {gv>0&&<Badge variant="grave">⚠{gv}</Badge>}
                          {lv>0&&<Badge variant="leve">↓{lv}</Badge>}
                          {gv===0&&lv===0&&<Badge variant="ok">✓</Badge>}
                        </div>
                      </div>
                      {Object.keys(items).length>0&&(
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))'}}>
                          {Object.entries(items).map(([key,v],i)=>(
                            <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 10px',borderRight:i%2===0?'1px solid #e4e4e7':'none',borderBottom:'1px solid #e4e4e7'}}>
                              <span style={{fontSize:11,color:'#52525b'}}>{key}</span>
                              <span style={{fontSize:10,fontWeight:600,padding:'1px 6px',borderRadius:3,background:STATUS_BG[v]||'#f4f4f5',color:STATUS_COLOR[v]||'#71717a'}}>{v||'—'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {d.incidencias&&<div style={{padding:'6px 12px',borderTop:'1px solid #e4e4e7',fontSize:11,color:'#71717a'}}>{d.incidencias}</div>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── DOCUMENTOS SECTION (solo coordinador, solo en edición) ── */
function DocumentosSection({ servicioId }) {
  const [docs,setDocs] = useState([]);
  const [loading,setLoading] = useState(true);
  const [desc,setDesc] = useState('');
  const [file,setFile] = useState(null);
  const [uploading,setUploading] = useState(false);
  const [error,setError] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    const r = await apiFetch(`/api/servicios/${servicioId}/documentos`);
    const data = await r.json();
    setDocs(Array.isArray(data)?data:[]); setLoading(false);
  };
  useEffect(()=>{ load(); },[servicioId]);

  const fileIcon = (tipo) => tipo?.startsWith('image/')?'🖼️':tipo==='application/pdf'?'📄':'📎';

  const handleUpload = async () => {
    if (!file||!desc.trim()){setError('Añade descripción y selecciona archivo');return;}
    if (file.size > 8*1024*1024){setError('El archivo no puede superar 8 MB');return;}
    setUploading(true); setError(null);
    try {
      const base64 = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(file); });
      const resp = await apiFetch(`/api/servicios/${servicioId}/documentos`,{
        method:'POST',
        body:JSON.stringify({descripcion:desc.trim(),nombre:file.name,tipo:file.type,datos:base64,tamano:file.size})
      });
      const data = await resp.json();
      if (data.ok){ setDesc(''); setFile(null); if(fileRef.current)fileRef.current.value=''; load(); }
      else setError(data.error||'Error al subir');
    } catch { setError('Error de conexión'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await apiFetch(`/api/documentos/${id}`,{method:'DELETE'}); load();
  };

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

  return (
    <Card style={{marginBottom:20}}>
      <SecTitle>Documentos del servicio</SecTitle>
      <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'flex-end',flexWrap:'wrap'}}>
        <Field label="Descripción" style={{flex:1,minWidth:180,marginBottom:0}}>
          <Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ej: Plano de cámaras, Mapa de conexiones…" />
        </Field>
        <div>
          <Label>Archivo (PDF / JPG / PNG)</Label>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
            onChange={e=>setFile(e.target.files[0]||null)}
            style={{display:'block',fontSize:12,marginTop:5,padding:'2px 0'}} />
        </div>
        <BtnP onClick={handleUpload} disabled={uploading||!file||!desc.trim()}
          style={{opacity:(uploading||!file||!desc.trim())?0.5:1,height:36,whiteSpace:'nowrap'}}>
          {uploading?'Subiendo…':'↑ Subir'}
        </BtnP>
      </div>
      {error&&<div style={{fontSize:12,color:'#dc2626',background:'#fef2f2',padding:'6px 10px',borderRadius:6,border:'1px solid #fecaca',marginBottom:10}}>{error}</div>}
      {loading?(
        <div style={{fontSize:12,color:'#71717a',padding:'8px 0'}}>Cargando…</div>
      ):docs.length===0?(
        <div style={{fontSize:12,color:'#71717a',textAlign:'center',padding:'12px 0'}}>Sin documentos adjuntos.</div>
      ):(
        <div style={{border:'1px solid #e4e4e7',borderRadius:8,overflow:'hidden'}}>
          {docs.map((doc,i)=>(
            <div key={doc.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:i%2===0?'#fff':'#fafafa',borderBottom:i<docs.length-1?'1px solid #e4e4e7':'none'}}>
              <span style={{fontSize:18}}>{fileIcon(doc.tipo)}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500}}>{doc.descripcion}</div>
                <div style={{fontSize:11,color:'#71717a',marginTop:1}}>{doc.nombre} · {(doc.tamano/1024).toFixed(0)} KB</div>
              </div>
              <BtnO onClick={()=>handleOpen(doc)} style={{height:28,fontSize:11,padding:'0 10px'}}>Abrir</BtnO>
              <BtnO onClick={()=>handleDelete(doc.id)} style={{height:28,fontSize:11,padding:'0 10px',color:'#dc2626',borderColor:'#fecaca'}}>✕</BtnO>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── DASHBOARD ─────────────────────────────────────────────── */
function CoordDashboard({ onNewServicio, onManageUsers, onEditServicio }) {
  const [stats,setStats] = useState(null);
  const [servicios,setServicios] = useState([]);
  const [informes,setInformes] = useState([]);
  const [loading,setLoading] = useState(true);
  const [modalInforme,setModalInforme] = useState(null);

  const load = () => {
    Promise.all([
      apiFetch('/api/stats').then(r=>r.json()).catch(()=>null),
      apiFetch('/api/servicios').then(r=>r.json()).catch(()=>[]),
      apiFetch('/api/informes').then(r=>r.json()).catch(()=>[]),
    ]).then(([st,sv,inf])=>{
      setStats(st); setServicios(Array.isArray(sv)?sv:[]); setInformes(Array.isArray(inf)?inf:[]);
      setLoading(false);
    });
  };

  useEffect(()=>{ load(); },[]);

  const openInforme = async (id) => {
    const r = await apiFetch(`/api/informes/${id}`);
    setModalInforme(await r.json());
  };

  const handleDeleteServicio = async (id) => {
    if (!confirm('¿Eliminar este servicio? Esta acción no se puede deshacer.')) return;
    try {
      await apiFetch(`/api/servicios/${id}`, { method: 'DELETE' });
      load();
    } catch { alert('Error al eliminar el servicio.'); }
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',fontSize:13,color:'#71717a'}}>Cargando...</div>;

  const pendientes = servicios.filter(s=>s.status==='pendiente');

  return (
    <div style={{maxWidth:1000,margin:'0 auto',padding:'24px 20px 80px'}}>
      {modalInforme&&(
        <InformeModal informe={modalInforme} onClose={()=>setModalInforme(null)} onDeleted={()=>{ setModalInforme(null); load(); }} />
      )}

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
            <div key={s.id}
              style={{padding:'12px 16px',borderBottom:i<pendientes.length-1?'1px solid #e4e4e7':'none',background:'#fff',transition:'background 0.1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
              onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1,cursor:'pointer'}} onClick={()=>onEditServicio(s.id)}>
                  <div style={{fontSize:13,fontWeight:500}}>{s.encuentro||'—'}</div>
                  <div style={{fontSize:11,color:'#71717a',marginTop:2}}>
                    <span style={{fontFamily:"'Geist Mono',monospace"}}>{s.jornada}</span>
                    {' · '}{fmt(s.fecha)}
                    {' · '}<span style={{fontWeight:500}}>{s.assigned_to_name||'Sin asignar'}</span>
                  </div>
                </div>
                <Badge style={{background:'#fffbeb',color:'#d97706',borderColor:'#fde68a'}}>⏳ Pendiente</Badge>
                <button onClick={e=>{e.stopPropagation();downloadHojaPDF(s.id,s.encuentro);}}
                  title="Descargar hoja de servicio"
                  style={{border:'1px solid #e4e4e7',borderRadius:6,background:'#fafafa',padding:'3px 8px',fontSize:11,cursor:'pointer',color:'#52525b',lineHeight:1.4,flexShrink:0}}>📄</button>
                <span onClick={()=>onEditServicio(s.id)} style={{color:'#71717a',fontSize:16,cursor:'pointer'}}>✏</span>
                <button onClick={e=>{e.stopPropagation();handleDeleteServicio(s.id);}}
                  style={{border:'1px solid #fecaca',borderRadius:6,background:'#fff5f5',padding:'3px 8px',fontSize:11,cursor:'pointer',color:'#dc2626',lineHeight:1.4,flexShrink:0}}>✕</button>
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
          <Card style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:'1px solid #e4e4e7'}}>
              <SecTitle style={{margin:0}}>Informes completados · {informes.length}</SecTitle>
            </div>
            {informes.map((inf,i)=>(
              <div key={inf.id} onClick={()=>openInforme(inf.id)}
                style={{padding:'12px 16px',cursor:'pointer',background:'#fff',borderBottom:i<informes.length-1?'1px solid #e4e4e7':'none',transition:'background 0.1s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500}}>{inf.encuentro||'—'}</div>
                    <div style={{fontSize:11,color:'#71717a',marginTop:2}}>
                      <span style={{fontFamily:"'Geist Mono',monospace"}}>{inf.jornada}</span>
                      {' · '}{fmt(inf.fecha)}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    {inf.incidencias_graves>0&&<Badge variant="grave">⚠ {inf.incidencias_graves}G</Badge>}
                    {inf.incidencias_leves>0&&<Badge variant="leve">↓ {inf.incidencias_leves}L</Badge>}
                    {inf.incidencias_graves===0&&inf.incidencias_leves===0&&<Badge variant="ok">✓ OK</Badge>}
                    <span style={{color:'#71717a',fontSize:16}}>›</span>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )
      )}
    </div>
  );
}

/* ── NEW / EDIT SERVICIO FORM (Steps 1-3 + Asignar) ────────── */
function NewServicioForm({ onCancel, onSaved, servicioId, initialData }) {
  const isEdit = !!servicioId;
  const [step,setStep] = useState(1);
  const STEPS = ["Servicio","Cámaras","Operadores","Asignar"];

  const [tipoServicio,setTipoServicio] = useState(initialData?.tipo_servicio||'liga');
  const [match,setMatch] = useState(initialData ? {
    jornada:initialData.jornada||'', encuentro:initialData.encuentro||'',
    fecha:initialData.fecha?initialData.fecha.slice(0,10):'',
    hora_partido:initialData.hora_partido||'', hora_citacion:initialData.hora_citacion||'',
    responsable:initialData.responsable||'', um:initialData.um||'',
    jefe_tecnico:initialData.jefe_tecnico||'', tel_jefe_tecnico:initialData.tel_jefe_tecnico||'',
    realizador:initialData.realizador||'', tel_realizador:initialData.tel_realizador||'',
    productor:initialData.productor||'', tel_productor:initialData.tel_productor||'',
    horario_md1:initialData.horario_md1||'',
  } : {jornada:"",encuentro:"",fecha:"",hora_partido:"",hora_citacion:"",responsable:"",um:"",jefe_tecnico:"",tel_jefe_tecnico:"",realizador:"",tel_realizador:"",productor:"",tel_productor:"",horario_md1:""});
  const [ligaJornada,setLigaJornada] = useState(initialData?.tipo_servicio==='liga'?initialData.jornada||'':"");
  const [ligaPartido,setLigaPartido] = useState(initialData?.tipo_servicio==='liga'?initialData.encuentro||'':"");
  const [selectedCams,setSelectedCams] = useState(initialData?.camaras_activas||{});
  const [camModels,setCamModels] = useState(initialData?.cam_models||{});
  const [operators,setOperators] = useState({...initOperators(),...(initialData?.operadores||{})});
  // Operadores en modo "nuevo" (entrada libre): rkey→boolean
  const [customOps,setCustomOps] = useState(()=>{
    const m={};
    if(initialData?.operadores){
      OPERATOR_GROUPS.forEach(g=>g.roles.forEach(r=>{
        const v=initialData.operadores[r.key];
        if(v&&!(PERSONAL[r.pool]||[]).includes(v)) m[r.key]=true;
      }));
    }
    return m;
  });
  const [assignedTo,setAssignedTo] = useState(initialData?.assigned_to?String(initialData.assigned_to):'');
  const [usuarios,setUsuarios] = useState([]);
  const [saving,setSaving] = useState(false);
  const [saveError,setSaveError] = useState(null);
  const [sent,setSent] = useState(false);

  // Documentos pendientes — sólo en creación, se suben al guardar
  const [pendingDocs,setPendingDocs] = useState([]);
  const [pendingDesc,setPendingDesc] = useState('');
  const [pendingFile,setPendingFile] = useState(null);
  const [pendingErr,setPendingErr] = useState(null);
  const pendingFileRef = useRef(null);

  // Prevent reactive effects from firing on first render (needed for edit mode pre-fill)
  const firstRender = useRef(true);

  const [todosUsuarios,setTodosUsuarios] = useState([]);
  const [personalTecnico,setPersonalTecnico] = useState([]);
  useEffect(()=>{
    apiFetch('/api/users').then(r=>r.json()).then(data=>{
      const activos = Array.isArray(data)?data.filter(u=>u.active):[];
      setTodosUsuarios(activos);
      setUsuarios(activos.filter(u=>u.role==='usuario'));
    }).catch(()=>{});
    apiFetch('/api/personal-tecnico').then(r=>r.json()).then(data=>{
      setPersonalTecnico(Array.isArray(data)?data:[]);
    }).catch(()=>{});
  },[]);

  // Auto-rellena el teléfono cuando se selecciona un nombre conocido
  const handlePersonalNombre = (campo, telCampo, valor) => {
    setMatch(m=>({...m,[campo]:valor}));
    const found = personalTecnico.find(p=>p.rol===campo&&p.nombre.toLowerCase()===valor.toLowerCase());
    if (found?.telefono) setMatch(m=>({...m,[telCampo]:found.telefono}));
  };

  useEffect(()=>{ if(tipoServicio==='liga'&&ligaJornada&&ligaPartido) setMatch(p=>({...p,jornada:ligaJornada,encuentro:ligaPartido})); },[ligaJornada,ligaPartido,tipoServicio]);
  useEffect(()=>{
    if(firstRender.current){firstRender.current=false;return;}
    if(tipoServicio!=='liga'){ setLigaJornada(""); setLigaPartido(""); setMatch(p=>({...p,jornada:"",encuentro:""})); }
  },[tipoServicio]);

  const toggleCam = useCallback((id)=>setSelectedCams(p=>({...p,[id]:!p[id]})),[]);
  const updateOp = useCallback((key,val)=>setOperators(p=>({...p,[key]:val})),[]);

  const fileIcon = (tipo) => tipo?.startsWith('image/')?'🖼️':tipo==='application/pdf'?'📄':'📎';

  const handleAddPendingDoc = async () => {
    if (!pendingFile||!pendingDesc.trim()){setPendingErr('Añade descripción y selecciona archivo');return;}
    if (pendingFile.size>8*1024*1024){setPendingErr('El archivo no puede superar 8 MB');return;}
    setPendingErr(null);
    const datos = await new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(pendingFile);});
    setPendingDocs(p=>[...p,{descripcion:pendingDesc.trim(),nombre:pendingFile.name,tipo:pendingFile.type,datos,tamano:pendingFile.size}]);
    setPendingDesc(''); setPendingFile(null);
    if(pendingFileRef.current) pendingFileRef.current.value='';
  };
  const removePendingDoc = (idx) => setPendingDocs(p=>p.filter((_,i)=>i!==idx));

  const activeCams = Object.entries(CAMERA_CATALOG).filter(([id])=>selectedCams[id]);
  const activeOpGroups = OPERATOR_GROUPS.filter(g=>g.cams.some(c=>selectedCams[c]));
  const tipoActual = TIPOS_SERVICIO.find(tp=>tp.id===tipoServicio);

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      const url = isEdit ? `/api/servicios/${servicioId}` : '/api/servicios';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ match, selectedCams, cam_models: camModels, operators, assigned_to: parseInt(assignedTo), tipo_servicio: tipoServicio })
      });
      const data = await res.json();
      if (data.ok) {
        // Subir documentos pendientes al servicio recién creado
        if (!isEdit && data.id && pendingDocs.length>0) {
          for (const doc of pendingDocs) {
            await apiFetch(`/api/servicios/${data.id}/documentos`,{method:'POST',body:JSON.stringify(doc)});
          }
        }
        setSent(true);
      } else setSaveError(data.error||'Error al guardar');
    } catch { setSaveError('Error de conexión'); }
    finally { setSaving(false); }
  };

  if (sent) return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'80px 20px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{width:48,height:48,borderRadius:'50%',background:'#f0fdf4',border:'1px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>✓</div>
      <div style={{fontSize:18,fontWeight:600}}>{isEdit?'Servicio actualizado':'Servicio creado y asignado'}</div>
      <div style={{fontSize:13,color:'#71717a'}}>{match.encuentro} · {match.jornada}</div>
      <div style={{display:'flex',gap:8,marginTop:12}}>
        <BtnO onClick={onCancel}>Ver dashboard</BtnO>
        {!isEdit&&<BtnP onClick={()=>{ setStep(1); setTipoServicio('liga'); setLigaJornada(''); setLigaPartido(''); setMatch({jornada:'',encuentro:'',fecha:'',hora_partido:'',hora_citacion:'',responsable:'',um:'',jefe_tecnico:'',tel_jefe_tecnico:'',realizador:'',tel_realizador:'',productor:'',tel_productor:'',horario_md1:''}); setSelectedCams({}); setOperators(initOperators()); setCustomOps({}); setAssignedTo(''); setSaveError(null); setSent(false); setPendingDocs([]); }}>+ Otro servicio</BtnP>}
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
              <Field label="Horario citación MD-1"><Input placeholder="10:00 a 22:00" value={match.horario_md1} onChange={e=>setMatch({...match,horario_md1:e.target.value})} /></Field>
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
              <Field label="J. Técnico UM">
                <Input list="dt-jefe_tecnico" value={match.jefe_tecnico}
                  onChange={e=>handlePersonalNombre('jefe_tecnico','tel_jefe_tecnico',e.target.value)} />
                <datalist id="dt-jefe_tecnico">
                  {personalTecnico.filter(p=>p.rol==='jefe_tecnico').map(p=><option key={p.id} value={p.nombre}/>)}
                </datalist>
              </Field>
              <Field label="Teléfono J. Técnico UM"><Input type="tel" placeholder="Ej: 612 345 678" value={match.tel_jefe_tecnico} onChange={e=>setMatch({...match,tel_jefe_tecnico:e.target.value})} /></Field>
              <Field label="Realizador">
                <Input list="dt-realizador" value={match.realizador}
                  onChange={e=>handlePersonalNombre('realizador','tel_realizador',e.target.value)} />
                <datalist id="dt-realizador">
                  {personalTecnico.filter(p=>p.rol==='realizador').map(p=><option key={p.id} value={p.nombre}/>)}
                </datalist>
              </Field>
              <Field label="Teléfono Realizador"><Input type="tel" placeholder="Ej: 612 345 678" value={match.tel_realizador} onChange={e=>setMatch({...match,tel_realizador:e.target.value})} /></Field>
              <Field label="Productor">
                <Input list="dt-productor" value={match.productor}
                  onChange={e=>handlePersonalNombre('productor','tel_productor',e.target.value)} />
                <datalist id="dt-productor">
                  {personalTecnico.filter(p=>p.rol==='productor').map(p=><option key={p.id} value={p.nombre}/>)}
                </datalist>
              </Field>
              <Field label="Teléfono Productor"><Input type="tel" placeholder="Ej: 612 345 678" value={match.tel_productor} onChange={e=>setMatch({...match,tel_productor:e.target.value})} /></Field>
            </div>
          </Card>
          {isEdit&&<DocumentosSection servicioId={servicioId} />}
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
          {/* Modelos de equipo: selección por el coordinador */}
          {activeCams.some(([,cam])=>cam.equipos?.length>0)&&(
            <Card>
              <SecTitle>Modelos de equipo asignados</SecTitle>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {activeCams.filter(([,cam])=>cam.equipos?.length>0).map(([id,cam])=>{
                  // usedModels: modelos ya elegidos en OTRAS cámaras
                  const used=new Set();
                  activeCams.forEach(([oid])=>{if(oid===id)return;const m=camModels[oid];if(!m)return;Object.values(m).forEach(v=>{if(v)used.add(v);});});
                  return (
                    <div key={id} style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'8px 0',borderBottom:'1px solid #f0f0f0'}}>
                      <span style={{fontSize:13,minWidth:28}}>{cam.icon}</span>
                      <span style={{fontSize:13,fontWeight:500,minWidth:90}}>{cam.label}</span>
                      {cam.equipos.map(slot=>{
                        const selVal=camModels[id]?.[slot.key]||'';
                        const opts=slot.models.filter(m=>m===selVal||!used.has(m));
                        return (
                          <div key={slot.key} style={{display:'flex',alignItems:'center',gap:5,flex:'1 1 160px'}}>
                            <Label style={{marginBottom:0,whiteSpace:'nowrap',minWidth:40,fontSize:11,color:'#71717a'}}>{slot.label}</Label>
                            <Select style={{height:30,fontSize:12}} value={selVal}
                              onChange={e=>setCamModels(p=>({...p,[id]:{...(p[id]||{}),[slot.key]:e.target.value}}))}>
                              <option value="">— Sin asignar —</option>
                              {opts.map(m=><option key={m} value={m}>{m}</option>)}
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
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
                {activeOpGroups.map(group=>{
                  // Filtrar roles por cámara activa (si el rol tiene campo cam)
                  const visibleRoles=group.roles.filter(r=>!r.cam||selectedCams[r.cam]);
                  if(visibleRoles.length===0) return null;
                  return (
                    <div key={group.id}>
                      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10,paddingBottom:6,borderBottom:'1px solid #e4e4e7'}}>
                        <span style={{fontSize:13}}>{group.icon}</span>
                        <span style={{fontSize:11,fontWeight:600,color:'#71717a',textTransform:'uppercase',letterSpacing:'0.06em'}}>{group.label}</span>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:12}}>
                        {visibleRoles.map(role=>{
                          const isCustom=!!customOps[role.key];
                          return (
                          <Field key={role.key} label={role.label}>
                            {isCustom?(
                              <div style={{display:'flex',gap:4}}>
                                <Input value={operators[role.key]||''} onChange={e=>updateOp(role.key,e.target.value)} placeholder="Nombre del operador" style={{flex:1}} />
                                <button onClick={()=>{setCustomOps(p=>({...p,[role.key]:false}));updateOp(role.key,'');}} style={{padding:'0 8px',border:'1px solid #e4e4e7',borderRadius:6,cursor:'pointer',background:'#fff',fontSize:12,color:'#71717a'}}>✕</button>
                              </div>
                            ):(
                              <Select value={operators[role.key]||''} onChange={e=>{
                                if(e.target.value==='__nuevo__'){setCustomOps(p=>({...p,[role.key]:true}));updateOp(role.key,'');}
                                else updateOp(role.key,e.target.value);
                              }}>
                                <option value="">— Sin asignar —</option>
                                <option value="__nuevo__">✨ Nuevo operador...</option>
                                {(PERSONAL[role.pool]||[]).map(p=><option key={p} value={p}>{p}</option>)}
                              </Select>
                            )}
                          </Field>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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

          {/* Documentos opcionales — solo en creación */}
          {!isEdit&&(
            <Card>
              <SecTitle>Documentos adjuntos <span style={{fontWeight:400,color:'#71717a'}}>(opcional)</span></SecTitle>
              <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'flex-end',flexWrap:'wrap'}}>
                <Field label="Descripción" style={{flex:1,minWidth:180,marginBottom:0}}>
                  <Input value={pendingDesc} onChange={e=>setPendingDesc(e.target.value)} placeholder="Ej: Plano de cámaras, Mapa de conexiones…" />
                </Field>
                <div>
                  <Label>Archivo (PDF / JPG / PNG)</Label>
                  <input ref={pendingFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={e=>setPendingFile(e.target.files[0]||null)}
                    style={{display:'block',fontSize:12,marginTop:5,padding:'2px 0'}} />
                </div>
                <BtnO onClick={handleAddPendingDoc} disabled={!pendingFile||!pendingDesc.trim()}
                  style={{height:36,whiteSpace:'nowrap',opacity:(!pendingFile||!pendingDesc.trim())?0.5:1}}>
                  + Añadir
                </BtnO>
              </div>
              {pendingErr&&<div style={{fontSize:12,color:'#dc2626',background:'#fef2f2',padding:'6px 10px',borderRadius:6,border:'1px solid #fecaca',marginBottom:10}}>{pendingErr}</div>}
              {pendingDocs.length===0?(
                <div style={{fontSize:12,color:'#71717a',textAlign:'center',padding:'8px 0'}}>Sin documentos adjuntos todavía.</div>
              ):(
                <div style={{border:'1px solid #e4e4e7',borderRadius:8,overflow:'hidden'}}>
                  {pendingDocs.map((doc,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:i%2===0?'#fff':'#fafafa',borderBottom:i<pendingDocs.length-1?'1px solid #e4e4e7':'none'}}>
                      <span style={{fontSize:18}}>{fileIcon(doc.tipo)}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:500}}>{doc.descripcion}</div>
                        <div style={{fontSize:11,color:'#71717a',marginTop:1}}>{doc.nombre} · {(doc.tamano/1024).toFixed(0)} KB</div>
                      </div>
                      <BtnO onClick={()=>removePendingDoc(i)} style={{height:28,fontSize:11,padding:'0 10px',color:'#dc2626',borderColor:'#fecaca'}}>✕</BtnO>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {saveError&&<div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#dc2626'}}>{saveError}</div>}
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <BtnO onClick={()=>setStep(3)}>← Atrás</BtnO>
            <BtnP onClick={handleSave} disabled={!assignedTo||saving} style={{opacity:(!assignedTo||saving)?0.5:1}}>
              {saving?(pendingDocs.length>0?'Guardando y subiendo…':'Guardando...'):isEdit?'Guardar cambios →':'Crear servicio →'}
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
  const [editServicioId,setEditServicioId] = useState(null);
  const [editServicioData,setEditServicioData] = useState(null);
  const [loadingEdit,setLoadingEdit] = useState(false);

  const handleEditServicio = async (id) => {
    setLoadingEdit(true);
    setView('edit-servicio');
    const r = await apiFetch(`/api/servicios/${id}`);
    const data = await r.json();
    setEditServicioId(id);
    setEditServicioData(data);
    setLoadingEdit(false);
  };

  const goToDashboard = () => {
    setView('dashboard');
    setEditServicioId(null);
    setEditServicioData(null);
  };

  return (
    <div style={{minHeight:'100vh',background:'#fafafa'}}>
      <Header user={user} onLogout={onLogout} view={view} setView={(v)=>{ setView(v); if(v!=='edit-servicio'){setEditServicioId(null);setEditServicioData(null);} }} />
      {view==='dashboard'&&(
        <CoordDashboard
          onNewServicio={()=>setView('new-servicio')}
          onManageUsers={()=>setView('users')}
          onEditServicio={handleEditServicio}
        />
      )}
      {view==='new-servicio'&&(
        <NewServicioForm onCancel={goToDashboard} onSaved={goToDashboard} />
      )}
      {view==='edit-servicio'&&(
        loadingEdit
          ? <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',fontSize:13,color:'#71717a'}}>Cargando servicio...</div>
          : editServicioData && <NewServicioForm servicioId={editServicioId} initialData={editServicioData} onCancel={goToDashboard} onSaved={goToDashboard} />
      )}
      {view==='users'&&(
        <UserManagement currentUser={user} />
      )}
      {view==='analisis'&&(
        <AnalisisView />
      )}
    </div>
  );
}
