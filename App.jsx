import { useState, useCallback, useEffect } from "react";

/* ─── Google Font ─────────────────────────────────────────── */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";
document.head.appendChild(fontLink);

/* ─── DATA ────────────────────────────────────────────────── */
const CAMERA_CATALOG = {
  CAMARA_HS:    { label:"Cámara HS",    icon:"📷", color:"#f59e0b", items:["CAMARA","REMOTOS ZOOM/FOCO","REMOTO REPLAY","REMOTO CCU","TRIPODE / CABEZA","VIEWFINDER","INTERCOM","CABLEADO / PATCH"] },
  SKYCAM_4:     { label:"4SkyCam",      icon:"🚁", color:"#3b82f6", items:["CAMARA","GIMBAL","AR UNITY","TAMBORES","FIBRAS","CONVERSORES","INTERCOM","MONITORES","BATERIAS / CARGADORES","RCP","WALKIES"] },
  STEADY_L:     { label:"Steady L",     icon:"🎬", color:"#10b981", items:["MONITOR","SLEED","CABLES","CONTROL ZOOM","BATERIAS","ALIMENTACIÓN","DOCKING BRACKET"] },
  STEADY_R:     { label:"Steady R",     icon:"🎬", color:"#10b981", items:["MONITOR","SLEED","CABLES","CONTROL ZOOM","BATERIAS","ALIMENTACIÓN","DOCKING BRACKET"] },
  STEADY_PERSO: { label:"Steady Perso", icon:"🎬", color:"#10b981", items:["MONITOR","SLEED","CABLES","CONTROL ZOOM","BATERIAS","ALIMENTACIÓN","DOCKING BRACKET"] },
  RF_L:         { label:"RF L",         icon:"📡", color:"#8b5cf6", items:["TX/RX RF","CONTROL DE DATOS","CABLEADO","BATERIAS","CAMARA","WALKIES","DATOS TRANSMISION"] },
  RF_R:         { label:"RF R",         icon:"📡", color:"#8b5cf6", items:["TX/RX RF","CONTROL DE DATOS","CABLEADO","BATERIAS","CAMARA","WALKIES","DATOS TRANSMISION"] },
  RF_PERSO:     { label:"RF Perso",     icon:"📡", color:"#8b5cf6", items:["TX/RX RF","CONTROL DE DATOS","CABLEADO","BATERIAS","CAMARA","WALKIES","DATOS TRANSMISION"] },
  POLECAM_L:    { label:"Polecam L",    icon:"🎯", color:"#ef4444", items:["CAMARA","GIMBAL","MONITORES","ESTRUCTURA","TRIPODE","REMOTOS","ELECTRONICAS"] },
  POLECAM_R:    { label:"Polecam R",    icon:"🎯", color:"#ef4444", items:["CAMARA","GIMBAL","MONITORES","ESTRUCTURA","TRIPODE","REMOTOS","ELECTRONICAS"] },
  MINICAM_L:    { label:"Minicám. L",   icon:"🔭", color:"#f97316", items:["MINICAMARA","ELECTRONICAS","SOPORTES","FUNDAS"] },
  MINICAM_R:    { label:"Minicám. R",   icon:"🔭", color:"#f97316", items:["MINICAMARA","ELECTRONICAS","SOPORTES","FUNDAS"] },
  KIT_CINEMA_L: { label:"Cinema L",     icon:"🎞", color:"#ec4899", items:["CAMARA","VAXIS","CINEFADE","MICROFONO","MOTORES","MANDO FOCO/IRIS/FILTRO","REMOTO OCP"] },
  KIT_CINEMA_R: { label:"Cinema R",     icon:"🎞", color:"#ec4899", items:["CAMARA","VAXIS","CINEFADE","MICROFONO","MOTORES","MANDO FOCO/IRIS/FILTRO","REMOTO OCP"] },
  BODYCAM:      { label:"Bodycam",      icon:"👕", color:"#14b8a6", items:["MINICAMARA","ELECTRONICAS","SOPORTES","BATERIA","CHALECO","OCP"] },
};
const LOGISTICA_ITEMS = ["VEHICULOS","HORA DE LLEGADA","HOTEL","CABLEADO UM","MATERIAL EXTERNO"];
const STATUS = { OK:"OK", G:"G", L:"L" };
const initItems = (items) => Object.fromEntries(items.map(i => [i, STATUS.OK]));

/* ─── DESIGN TOKENS ───────────────────────────────────────── */
const t = {
  font: "'Geist', 'Geist Fallback', -apple-system, sans-serif",
  mono: "'Geist Mono', 'Fira Code', monospace",
  bg:       "#ffffff",
  bgMuted:  "#fafafa",
  bgHover:  "#f4f4f5",
  border:   "#e4e4e7",
  borderFocus: "#a1a1aa",
  text:     "#09090b",
  textMuted:"#71717a",
  textXs:   "#a1a1aa",
  accent:   "#18181b",
  accentFg: "#fafafa",
  ring:     "0 0 0 2px #e4e4e7",
  shadow:   "0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
  radius:   "8px",
  radiusLg: "12px",
};

/* ─── BASE COMPONENTS ─────────────────────────────────────── */
const Input = ({ style, ...props }) => (
  <input {...props} style={{
    width:"100%", boxSizing:"border-box",
    height:36, padding:"0 12px",
    background:t.bg, border:`1px solid ${t.border}`,
    borderRadius:t.radius, fontSize:14,
    fontFamily:t.font, color:t.text, outline:"none",
    transition:"border-color 0.15s",
    ...style
  }}
  onFocus={e=>e.target.style.borderColor=t.borderFocus}
  onBlur={e=>e.target.style.borderColor=t.border}
  />
);

const Textarea = ({ style, ...props }) => (
  <textarea {...props} style={{
    width:"100%", boxSizing:"border-box",
    padding:"8px 12px", minHeight:72,
    background:t.bg, border:`1px solid ${t.border}`,
    borderRadius:t.radius, fontSize:13,
    fontFamily:t.font, color:t.text, outline:"none",
    resize:"vertical", lineHeight:1.5,
    transition:"border-color 0.15s", ...style
  }}
  onFocus={e=>e.target.style.borderColor=t.borderFocus}
  onBlur={e=>e.target.style.borderColor=t.border}
  />
);

const Label = ({ children, style }) => (
  <div style={{ fontSize:12, fontWeight:500, color:t.text, marginBottom:6, fontFamily:t.font, ...style }}>{children}</div>
);

const Card = ({ children, style }) => (
  <div style={{ background:t.bg, border:`1px solid ${t.border}`, borderRadius:t.radiusLg, padding:20, marginBottom:12, boxShadow:t.shadow, ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", color:t.textMuted, textTransform:"uppercase", marginBottom:16, fontFamily:t.font }}>
    {children}
  </div>
);

const BtnPrimary = ({ children, style, ...props }) => (
  <button {...props} style={{
    background:t.accent, color:t.accentFg,
    border:"none", borderRadius:t.radius,
    padding:"0 16px", height:36,
    fontSize:13, fontWeight:500, fontFamily:t.font,
    cursor:"pointer", display:"inline-flex",
    alignItems:"center", gap:6,
    transition:"opacity 0.15s",
    ...style
  }}
  onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
  onMouseLeave={e=>e.currentTarget.style.opacity="1"}
  >{children}</button>
);

const BtnOutline = ({ children, style, ...props }) => (
  <button {...props} style={{
    background:t.bg, color:t.text,
    border:`1px solid ${t.border}`, borderRadius:t.radius,
    padding:"0 16px", height:36,
    fontSize:13, fontWeight:500, fontFamily:t.font,
    cursor:"pointer", display:"inline-flex",
    alignItems:"center", gap:6,
    transition:"background 0.15s",
    ...style
  }}
  onMouseEnter={e=>e.currentTarget.style.background=t.bgHover}
  onMouseLeave={e=>e.currentTarget.style.background=t.bg}
  >{children}</button>
);

const Badge = ({ children, variant="default", style }) => {
  const variants = {
    default: { bg:"#f4f4f5", color:"#52525b", border:"#e4e4e7" },
    grave:   { bg:"#fef2f2", color:"#dc2626", border:"#fecaca" },
    leve:    { bg:"#fffbeb", color:"#d97706", border:"#fde68a" },
    ok:      { bg:"#f0fdf4", color:"#16a34a", border:"#bbf7d0" },
  };
  const v = variants[variant] || variants.default;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:9999, fontSize:11, fontWeight:500, fontFamily:t.font, background:v.bg, color:v.color, border:`1px solid ${v.border}`, ...style }}>
      {children}
    </span>
  );
};

const Field = ({ label, children }) => (
  <div><Label>{label}</Label>{children}</div>
);

const Separator = () => <div style={{ height:1, background:t.border, margin:"16px 0" }} />;

/* ─── STATUS TOGGLE ───────────────────────────────────────── */
function StatusToggle({ value, onChange }) {
  const opts = [
    { key:"OK", label:"OK",      active:{ bg:"#f0fdf4", color:"#16a34a", border:"#86efac" } },
    { key:"G",  label:"Grave",   active:{ bg:"#fef2f2", color:"#dc2626", border:"#fca5a5" } },
    { key:"L",  label:"Leve",    active:{ bg:"#fffbeb", color:"#d97706", border:"#fde68a" } },
  ];
  return (
    <div style={{ display:"flex", gap:4 }}>
      {opts.map(o=>{
        const isActive = value===o.key;
        return (
          <button key={o.key} onClick={()=>onChange(o.key)} style={{
            padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:500,
            cursor:"pointer", fontFamily:t.font,
            background: isActive ? o.active.bg : t.bgMuted,
            color: isActive ? o.active.color : t.textMuted,
            border: `1px solid ${isActive ? o.active.border : t.border}`,
            transition:"all 0.12s",
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

/* ─── STEP INDICATOR ──────────────────────────────────────── */
function Steps({ current, steps }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0 }}>
      {steps.map((s,i)=>{
        const done = current > i+1;
        const active = current === i+1;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{
                width:22, height:22, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:600, fontFamily:t.mono,
                background: done ? t.accent : active ? t.accent : t.bgHover,
                color: done || active ? t.accentFg : t.textMuted,
                border: `1px solid ${done || active ? t.accent : t.border}`,
                transition:"all 0.2s",
              }}>{done ? "✓" : i+1}</div>
              <span style={{ fontSize:12, fontWeight: active ? 500 : 400, color: active ? t.text : t.textMuted, fontFamily:t.font }}>{s}</span>
            </div>
            {i < steps.length-1 && <div style={{ width:24, height:1, background:t.border, margin:"0 8px" }} />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── CAMERA TOGGLE CARD ──────────────────────────────────── */
function CameraToggle({ id, cam, selected, onToggle }) {
  return (
    <button onClick={()=>onToggle(id)} style={{
      background: selected ? `${cam.color}08` : t.bg,
      border: `1px solid ${selected ? cam.color : t.border}`,
      borderRadius:t.radius, padding:"12px 8px",
      cursor:"pointer", textAlign:"center",
      display:"flex", flexDirection:"column", alignItems:"center", gap:6,
      transition:"all 0.15s", boxShadow: selected ? `0 0 0 1px ${cam.color}` : "none",
    }}>
      <div style={{ fontSize:20 }}>{cam.icon}</div>
      <div style={{ fontSize:10, fontWeight:500, color: selected ? cam.color : t.textMuted, fontFamily:t.font, lineHeight:1.3 }}>{cam.label}</div>
      {selected && <div style={{ width:4, height:4, borderRadius:"50%", background:cam.color }} />}
    </button>
  );
}

/* ─── CAMERA SECTION ──────────────────────────────────────── */
function CameraSection({ camId, cam, data, onChange }) {
  return (
    <Card style={{ borderLeft:`3px solid ${cam.color}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <span style={{ fontSize:16 }}>{cam.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:600, color:t.text, fontFamily:t.font }}>{cam.label}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Label style={{ marginBottom:0, whiteSpace:"nowrap" }}>Equipo</Label>
          <Input style={{ width:160, height:32 }} placeholder="Modelo..." value={data.equipo||""} onChange={e=>onChange(camId,"equipo",e.target.value)} />
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:1, marginBottom:14, border:`1px solid ${t.border}`, borderRadius:t.radius, overflow:"hidden" }}>
        {cam.items.map((item, idx)=>(
          <div key={item} style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"9px 12px",
            background: idx%2===0 ? t.bg : t.bgMuted,
            borderBottom: idx < cam.items.length-1 ? `1px solid ${t.border}` : "none",
          }}>
            <div style={{ flex:1, fontSize:12, fontWeight:400, color:t.text, fontFamily:t.font }}>{item}</div>
            <StatusToggle value={data.items?.[item]||STATUS.OK} onChange={v=>onChange(camId,"item",item,v)} />
          </div>
        ))}
      </div>

      <div>
        <Label>Incidencias</Label>
        <Textarea placeholder="Sin incidencias..." value={data.incidencias||""} onChange={e=>onChange(camId,"incidencias",e.target.value)} style={{ minHeight:52 }} />
      </div>
    </Card>
  );
}

/* ─── DASHBOARD ───────────────────────────────────────────── */
function Dashboard({ onNewReport }) {
  const [informes, setInformes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(()=>{
    Promise.all([
      fetch('/api/informes').then(r=>r.json()).catch(()=>[]),
      fetch('/api/stats').then(r=>r.json()).catch(()=>null)
    ]).then(([inf,st])=>{ setInformes(Array.isArray(inf)?inf:[]); setStats(st); setLoading(false); });
  },[]);

  const loadDetail = async (id) => {
    const r = await fetch(`/api/informes/${id}`);
    setDetail(await r.json()); setSelected(id);
  };
  const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—';

  if(loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:8 }}>
      <div style={{ fontSize:13,color:t.textMuted,fontFamily:t.font }}>Cargando informes...</div>
    </div>
  );

  return (
    <div style={{ maxWidth:1000, margin:"0 auto", padding:"24px 20px 80px" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:600, color:t.text, fontFamily:t.font, margin:0, marginBottom:4 }}>Dashboard</h1>
          <p style={{ fontSize:13, color:t.textMuted, fontFamily:t.font, margin:0 }}>Informes de cámaras especiales — Temporada 25/26</p>
        </div>
        <BtnPrimary onClick={onNewReport}>+ Nuevo informe</BtnPrimary>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
          {[
            { label:"Informes totales", value:stats.total, sub:"esta temporada" },
            { label:"Jornadas cubiertas", value:stats.porJornada?.length||0, sub:"registradas" },
            { label:"Incid. graves", value:stats.porJornada?.reduce((a,j)=>a+parseInt(j.graves||0),0)||0, sub:"acumuladas", red:true },
            { label:"Incid. leves", value:stats.porJornada?.reduce((a,j)=>a+parseInt(j.leves||0),0)||0, sub:"acumuladas", yellow:true },
          ].map(s=>(
            <Card key={s.label} style={{ padding:"16px 18px", marginBottom:0 }}>
              <div style={{ fontSize:24, fontWeight:600, fontFamily:t.mono, color: s.red?"#dc2626" : s.yellow?"#d97706" : t.text, marginBottom:2 }}>{s.value}</div>
              <div style={{ fontSize:12, fontWeight:500, color:t.text, fontFamily:t.font }}>{s.label}</div>
              <div style={{ fontSize:11, color:t.textMuted, fontFamily:t.font, marginTop:1 }}>{s.sub}</div>
            </Card>
          ))}
        </div>
      )}

      {informes.length===0 ? (
        <Card style={{ textAlign:"center", padding:"48px 20px" }}>
          <div style={{ fontSize:13, color:t.textMuted, fontFamily:t.font, marginBottom:16 }}>No hay informes todavía.<br/>Los informes aparecerán aquí cuando los operarios los envíen.</div>
          <BtnPrimary onClick={onNewReport}>Crear primer informe</BtnPrimary>
        </Card>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:selected?"1fr 1fr":"1fr", gap:16, alignItems:"start" }}>
          {/* Lista */}
          <Card style={{ padding:0, overflow:"hidden" }}>
            <div style={{ padding:"14px 16px", borderBottom:`1px solid ${t.border}` }}>
              <SectionTitle>Informes · {informes.length} resultados</SectionTitle>
            </div>
            {informes.map((inf,i)=>(
              <div key={inf.id} onClick={()=>loadDetail(inf.id)} style={{
                padding:"12px 16px", cursor:"pointer",
                background: selected===inf.id ? t.bgHover : t.bg,
                borderBottom: i<informes.length-1 ? `1px solid ${t.border}` : "none",
                transition:"background 0.1s",
              }}
              onMouseEnter={e=>{ if(selected!==inf.id) e.currentTarget.style.background=t.bgMuted; }}
              onMouseLeave={e=>{ if(selected!==inf.id) e.currentTarget.style.background=t.bg; }}
              >
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:t.text, fontFamily:t.font }}>{inf.encuentro||"—"}</div>
                    <div style={{ fontSize:11, color:t.textMuted, fontFamily:t.font, marginTop:2 }}>
                      <span style={{ fontFamily:t.mono }}>{inf.jornada}</span> · {fmt(inf.fecha)} · {inf.responsable||"—"}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    {inf.incidencias_graves>0 && <Badge variant="grave">⚠ {inf.incidencias_graves}G</Badge>}
                    {inf.incidencias_leves>0 && <Badge variant="leve">↓ {inf.incidencias_leves}L</Badge>}
                    {inf.incidencias_graves===0&&inf.incidencias_leves===0 && <Badge variant="ok">✓ OK</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </Card>

          {/* Detalle */}
          {selected&&detail&&(
            <Card style={{ position:"sticky", top:80 }}>
              <div style={{ display:"flex", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:600, color:t.text, fontFamily:t.font, flex:1 }}>{detail.encuentro}</div>
                <button onClick={()=>{setSelected(null);setDetail(null)}} style={{ background:"none",border:"none",cursor:"pointer",color:t.textMuted,fontSize:16,padding:4 }}>✕</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {[["Jornada",detail.jornada],["Fecha",fmt(detail.fecha)],["Hora",detail.hora_partido||"—"],["Responsable",detail.responsable],["UM",detail.um],["J. Técnico",detail.jefe_tecnico]].map(([k,v])=>(
                  <div key={k} style={{ padding:"8px 10px", background:t.bgMuted, borderRadius:t.radius, border:`1px solid ${t.border}` }}>
                    <div style={{ fontSize:10, fontWeight:500, color:t.textMuted, fontFamily:t.font, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>{k}</div>
                    <div style={{ fontSize:12, fontWeight:500, color:t.text, fontFamily:t.font }}>{v||"—"}</div>
                  </div>
                ))}
              </div>
              {detail.camaras_activas&&(
                <div style={{ marginBottom:12 }}>
                  <Label>Cámaras desplegadas</Label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {Object.entries(detail.camaras_activas).filter(([,v])=>v).map(([id])=>{
                      const cam=CAMERA_CATALOG[id]; if(!cam) return null;
                      return <Badge key={id} style={{ borderColor:`${cam.color}55`, color:cam.color, background:`${cam.color}0d` }}>{cam.icon} {cam.label}</Badge>;
                    })}
                  </div>
                </div>
              )}
              {detail.cam_data&&(
                <div style={{ border:`1px solid ${t.border}`, borderRadius:t.radius, overflow:"hidden" }}>
                  {Object.entries(detail.cam_data).map(([id,d],i,arr)=>{
                    const cam=CAMERA_CATALOG[id]; if(!cam||!d) return null;
                    const items=d.items||{};
                    const gv=Object.values(items).filter(v=>v==="G").length;
                    const lv=Object.values(items).filter(v=>v==="L").length;
                    return (
                      <div key={id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:i<arr.length-1?`1px solid ${t.border}`:"none",background:i%2===0?t.bg:t.bgMuted }}>
                        <span style={{ fontSize:13 }}>{cam.icon}</span>
                        <div style={{ flex:1,fontSize:12,fontWeight:400,color:t.text,fontFamily:t.font }}>{cam.label}</div>
                        {d.equipo&&<span style={{ fontSize:11,color:t.textMuted,fontFamily:t.mono }}>{d.equipo}</span>}
                        <div style={{ display:"flex",gap:3 }}>
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
      )}
    </div>
  );
}

/* ─── MAIN APP ────────────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState('form');
  const [step, setStep] = useState(1);
  const [match, setMatch] = useState({ jornada:"",encuentro:"",fecha:"",hora_partido:"",hora_citacion:"",responsable:"",um:"",jefe_tecnico:"",realizador:"",productor:"",horario_md1:"" });
  const [operators, setOperators] = useState({ ULTRA:"","4SKY":"",POLE:"",STEADY:"",FOQUISTA:"",RF:"",BODYCAM:"",MINICAMS:"" });
  const [selectedCams, setSelectedCams] = useState({});
  const [logistica, setLogistica] = useState({ items:initItems(LOGISTICA_ITEMS), incidencias:"" });
  const [camData, setCamData] = useState({});
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const toggleCam = useCallback((id)=>setSelectedCams(p=>({...p,[id]:!p[id]})),[]);
  const updateCamData = useCallback((camId,field,sub,val)=>{
    setCamData(prev=>{
      const cam=prev[camId]||{equipo:"",items:initItems(CAMERA_CATALOG[camId].items),incidencias:""};
      if(field==="equipo") return {...prev,[camId]:{...cam,equipo:sub}};
      if(field==="item")   return {...prev,[camId]:{...cam,items:{...cam.items,[sub]:val}}};
      if(field==="incidencias") return {...prev,[camId]:{...cam,incidencias:sub}};
      return prev;
    });
  },[]);

  const activeCams = Object.entries(CAMERA_CATALOG).filter(([id])=>selectedCams[id]);
  const countInc = () => {
    let g=0,l=0;
    Object.values(logistica.items).forEach(v=>{if(v==="G")g++;if(v==="L")l++;});
    activeCams.forEach(([id])=>{ const d=camData[id]; if(!d?.items)return; Object.values(d.items).forEach(v=>{if(v==="G")g++;if(v==="L")l++;}); });
    return {g,l};
  };
  const {g,l} = countInc();

  const resetForm = () => {
    setStep(1);
    setMatch({jornada:"",encuentro:"",fecha:"",hora_partido:"",hora_citacion:"",responsable:"",um:"",jefe_tecnico:"",realizador:"",productor:"",horario_md1:""});
    setOperators({ULTRA:"","4SKY":"",POLE:"",STEADY:"",FOQUISTA:"",RF:"",BODYCAM:"",MINICAMS:""});
    setSelectedCams({}); setLogistica({items:initItems(LOGISTICA_ITEMS),incidencias:""});
    setCamData({}); setSent(false); setSaveError(null);
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch('/api/informes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({match,operators,selectedCams,logistica,camData,incidenciasGraves:g,incidenciasLeves:l})});
      const data = await res.json();
      if(data.ok) setSent(true); else setSaveError(data.error||'Error al guardar');
    } catch { setSaveError('Error de conexión'); }
    finally { setSaving(false); }
  };

  const STEPS = ["Partido","Cámaras","Informe","Resumen"];

  /* Sent screen */
  if(sent) return (
    <div style={{ minHeight:"100vh", background:t.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, fontFamily:t.font }}>
      <div style={{ width:48,height:48,borderRadius:"50%",background:"#f0fdf4",border:"1px solid #bbf7d0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>✓</div>
      <div style={{ fontSize:18, fontWeight:600, color:t.text }}>Informe guardado</div>
      <div style={{ fontSize:13, color:t.textMuted }}>{match.encuentro} · {match.jornada}</div>
      <div style={{ display:"flex", gap:6, marginTop:4 }}>
        {g>0&&<Badge variant="grave">⚠ {g} graves</Badge>}
        {l>0&&<Badge variant="leve">↓ {l} leves</Badge>}
        {g===0&&l===0&&<Badge variant="ok">Sin incidencias</Badge>}
      </div>
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <BtnOutline onClick={()=>{resetForm();setView('dashboard');}}>Ver dashboard</BtnOutline>
        <BtnPrimary onClick={resetForm}>+ Nuevo informe</BtnPrimary>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:t.bgMuted, fontFamily:t.font }}>

      {/* HEADER */}
      <header style={{ background:t.bg, borderBottom:`1px solid ${t.border}`, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ maxWidth:1000, margin:"0 auto", padding:"0 20px", height:56, display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28,height:28,borderRadius:6,background:t.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>📷</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:t.text, lineHeight:1.2 }}>MEDIAPRO · CCEE</div>
              <div style={{ fontSize:10, color:t.textMuted, lineHeight:1.2 }}>Cámaras Especiales</div>
            </div>
          </div>

          <div style={{ flex:1 }} />

          {/* Nav */}
          <nav style={{ display:"flex", gap:2 }}>
            {[{id:'form',label:'Nuevo informe'},{id:'dashboard',label:'Dashboard'}].map(n=>(
              <button key={n.id} onClick={()=>setView(n.id)} style={{
                padding:"0 12px", height:32, borderRadius:t.radius,
                fontSize:12, fontWeight:500, fontFamily:t.font,
                cursor:"pointer", border:"none",
                background: view===n.id ? t.bgHover : "transparent",
                color: view===n.id ? t.text : t.textMuted,
                transition:"all 0.12s",
              }}>{n.label}</button>
            ))}
          </nav>

          {/* Steps — only in form */}
          {view==='form' && (
            <>
              <div style={{ width:1, height:20, background:t.border }} />
              <Steps current={step} steps={STEPS} />
            </>
          )}
        </div>
      </header>

      {/* DASHBOARD */}
      {view==='dashboard' && <Dashboard onNewReport={()=>{resetForm();setView('form');}} />}

      {/* FORM */}
      {view==='form' && (
        <div style={{ maxWidth:720, margin:"0 auto", padding:"28px 20px 80px" }}>

          {/* STEP 1 */}
          {step===1&&(
            <>
              <div style={{ marginBottom:20 }}>
                <h2 style={{ fontSize:18,fontWeight:600,color:t.text,margin:0,marginBottom:4 }}>Datos del partido</h2>
                <p style={{ fontSize:13,color:t.textMuted,margin:0 }}>Cabecera del informe técnico</p>
              </div>

              <Card>
                <SectionTitle>Identificación</SectionTitle>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                  {[["Jornada","jornada","J26"],["Encuentro","encuentro","Sevilla VS Betis"],["Fecha partido","fecha",""],["Hora partido","hora_partido",""],["Hora citación","hora_citacion","12:00 HLE"],["Horario MD-1","horario_md1","10:00 a 22:00"]].map(([lbl,key,ph])=>(
                    <Field key={key} label={lbl}>
                      <Input type={key.includes("fecha")?"date":key.includes("hora_partido")?"time":"text"} placeholder={ph} value={match[key]} onChange={e=>setMatch({...match,[key]:e.target.value})} />
                    </Field>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionTitle>Equipo técnico</SectionTitle>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                  {[["Responsable CCEE","responsable"],["Unidad Móvil","um"],["J. Técnico UM","jefe_tecnico"],["Realizador","realizador"],["Productor","productor"]].map(([lbl,key])=>(
                    <Field key={key} label={lbl}><Input value={match[key]} onChange={e=>setMatch({...match,[key]:e.target.value})} /></Field>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionTitle>Operadores asignados</SectionTitle>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
                  {Object.keys(operators).map(op=>(
                    <Field key={op} label={op}><Input placeholder="Nombre..." value={operators[op]} onChange={e=>setOperators({...operators,[op]:e.target.value})} /></Field>
                  ))}
                </div>
              </Card>

              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <BtnPrimary onClick={()=>setStep(2)}>Configurar cámaras →</BtnPrimary>
              </div>
            </>
          )}

          {/* STEP 2 */}
          {step===2&&(
            <>
              <div style={{ marginBottom:20 }}>
                <h2 style={{ fontSize:18,fontWeight:600,color:t.text,margin:0,marginBottom:4 }}>Cámaras desplegadas</h2>
                <p style={{ fontSize:13,color:t.textMuted,margin:0 }}>Selecciona las activas en <strong>{match.encuentro||"este partido"}</strong></p>
              </div>

              <Card>
                <SectionTitle>Activa / desactiva cada equipo</SectionTitle>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:8 }}>
                  {Object.entries(CAMERA_CATALOG).map(([id,cam])=><CameraToggle key={id} id={id} cam={cam} selected={!!selectedCams[id]} onToggle={toggleCam} />)}
                </div>

                {activeCams.length>0&&(
                  <>
                    <Separator />
                    <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                      {activeCams.map(([id,cam])=>(
                        <Badge key={id} style={{ borderColor:`${cam.color}44`, color:cam.color, background:`${cam.color}0d` }}>{cam.icon} {cam.label}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </Card>

              <div style={{ display:"flex",justifyContent:"space-between" }}>
                <BtnOutline onClick={()=>setStep(1)}>← Atrás</BtnOutline>
                <BtnPrimary style={{ opacity:activeCams.length===0?0.45:1 }} onClick={()=>activeCams.length>0&&setStep(3)}>
                  Informe · {activeCams.length} cámaras →
                </BtnPrimary>
              </div>
            </>
          )}

          {/* STEP 3 */}
          {step===3&&(
            <>
              <div style={{ marginBottom:20,display:"flex",alignItems:"center",gap:12 }}>
                <div>
                  <h2 style={{ fontSize:18,fontWeight:600,color:t.text,margin:0,marginBottom:4 }}>Informe técnico</h2>
                  <p style={{ fontSize:13,color:t.textMuted,margin:0 }}>{match.encuentro} · {match.jornada}</p>
                </div>
                <div style={{ marginLeft:"auto",display:"flex",gap:4 }}>
                  {g>0&&<Badge variant="grave">⚠ {g}G</Badge>}
                  {l>0&&<Badge variant="leve">↓ {l}L</Badge>}
                  {g===0&&l===0&&<Badge variant="ok">Sin incidencias</Badge>}
                </div>
              </div>

              {/* Logística */}
              <Card style={{ borderLeft:"3px solid #f59e0b" }}>
                <SectionTitle>Logística</SectionTitle>
                <div style={{ border:`1px solid ${t.border}`,borderRadius:t.radius,overflow:"hidden",marginBottom:12 }}>
                  {LOGISTICA_ITEMS.map((item,i)=>(
                    <div key={item} style={{ display:"flex",alignItems:"center",gap:12,padding:"9px 12px",background:i%2===0?t.bg:t.bgMuted,borderBottom:i<LOGISTICA_ITEMS.length-1?`1px solid ${t.border}`:"none" }}>
                      <div style={{ flex:1,fontSize:12,color:t.text,fontFamily:t.font }}>{item}</div>
                      <StatusToggle value={logistica.items[item]} onChange={v=>setLogistica({...logistica,items:{...logistica.items,[item]:v}})} />
                    </div>
                  ))}
                </div>
                <Label>Descripción de incidencias</Label>
                <Textarea placeholder="Sin incidencias..." value={logistica.incidencias} onChange={e=>setLogistica({...logistica,incidencias:e.target.value})} />
              </Card>

              {activeCams.map(([id,cam])=>(
                <CameraSection key={id} camId={id} cam={cam} data={camData[id]||{equipo:"",items:initItems(cam.items),incidencias:""}} onChange={updateCamData} />
              ))}

              <div style={{ display:"flex",justifyContent:"space-between" }}>
                <BtnOutline onClick={()=>setStep(2)}>← Atrás</BtnOutline>
                <BtnPrimary onClick={()=>setStep(4)}>Ver resumen →</BtnPrimary>
              </div>
            </>
          )}

          {/* STEP 4 */}
          {step===4&&(
            <>
              <div style={{ marginBottom:20 }}>
                <h2 style={{ fontSize:18,fontWeight:600,color:t.text,margin:0,marginBottom:4 }}>Resumen del informe</h2>
                <p style={{ fontSize:13,color:t.textMuted,margin:0 }}>Revisa antes de guardar en la base de datos</p>
              </div>

              <Card>
                <SectionTitle>Datos del partido</SectionTitle>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
                  {[["Jornada",match.jornada],["Encuentro",match.encuentro],["Fecha",match.fecha],["Hora partido",match.hora_partido],["Responsable",match.responsable],["UM",match.um]].map(([k,v])=>(
                    <div key={k} style={{ padding:"10px 12px",background:t.bgMuted,borderRadius:t.radius,border:`1px solid ${t.border}` }}>
                      <div style={{ fontSize:10,fontWeight:500,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3 }}>{k}</div>
                      <div style={{ fontSize:13,fontWeight:500,color:t.text,fontFamily:t.mono }}>{v||"—"}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionTitle>Estado general</SectionTitle>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16 }}>
                  <div style={{ padding:"14px 16px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:t.radius,textAlign:"center" }}>
                    <div style={{ fontSize:22,fontWeight:600,color:"#16a34a",fontFamily:t.mono }}>{activeCams.length+1}</div>
                    <div style={{ fontSize:11,color:"#16a34a",marginTop:2 }}>Secciones</div>
                  </div>
                  <div style={{ padding:"14px 16px",background:g>0?"#fef2f2":t.bgMuted,border:`1px solid ${g>0?"#fecaca":t.border}`,borderRadius:t.radius,textAlign:"center" }}>
                    <div style={{ fontSize:22,fontWeight:600,color:g>0?"#dc2626":t.textMuted,fontFamily:t.mono }}>{g}</div>
                    <div style={{ fontSize:11,color:g>0?"#dc2626":t.textMuted,marginTop:2 }}>Graves</div>
                  </div>
                  <div style={{ padding:"14px 16px",background:l>0?"#fffbeb":t.bgMuted,border:`1px solid ${l>0?"#fde68a":t.border}`,borderRadius:t.radius,textAlign:"center" }}>
                    <div style={{ fontSize:22,fontWeight:600,color:l>0?"#d97706":t.textMuted,fontFamily:t.mono }}>{l}</div>
                    <div style={{ fontSize:11,color:l>0?"#d97706":t.textMuted,marginTop:2 }}>Leves</div>
                  </div>
                </div>

                <div style={{ border:`1px solid ${t.border}`,borderRadius:t.radius,overflow:"hidden" }}>
                  {activeCams.map(([id,cam],i)=>{
                    const d=camData[id]; const items=d?.items||{};
                    const gv=Object.values(items).filter(v=>v==="G").length;
                    const lv=Object.values(items).filter(v=>v==="L").length;
                    return (
                      <div key={id} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:i%2===0?t.bg:t.bgMuted,borderBottom:i<activeCams.length-1?`1px solid ${t.border}`:"none" }}>
                        <span style={{ fontSize:14 }}>{cam.icon}</span>
                        <div style={{ flex:1,fontSize:12,fontWeight:500,color:t.text,fontFamily:t.font }}>{cam.label}</div>
                        {d?.equipo&&<span style={{ fontSize:11,color:t.textMuted,fontFamily:t.mono }}>{d.equipo}</span>}
                        <div style={{ display:"flex",gap:4 }}>
                          {gv>0&&<Badge variant="grave">⚠{gv}G</Badge>}
                          {lv>0&&<Badge variant="leve">↓{lv}L</Badge>}
                          {gv===0&&lv===0&&<Badge variant="ok">✓ OK</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {saveError&&(
                <div style={{ background:"#fef2f2",border:"1px solid #fecaca",borderRadius:t.radius,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#dc2626",fontFamily:t.font }}>
                  {saveError}
                </div>
              )}

              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <BtnOutline onClick={()=>setStep(3)}>← Revisar</BtnOutline>
                <BtnPrimary onClick={handleSave} style={{ opacity:saving?0.6:1 }} disabled={saving}>
                  {saving?"Guardando...":"Guardar informe"}
                </BtnPrimary>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
