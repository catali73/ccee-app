import { useState, useCallback } from "react";

const CAMERA_CATALOG = {
  CAMARA_HS: { label: "Cámara HS", icon: "🎥", color: "#F59E0B", items: ["CAMARA","REMOTOS ZOOM/FOCO","REMOTO REPLAY","REMOTO CCU","TRIPODE / CABEZA","VIEWFINDER","INTERCOM","CABLEADO / PATCH"] },
  SKYCAM_4: { label: "4SkyCam", icon: "🚁", color: "#3B82F6", items: ["CAMARA","GIMBAL","AR UNITY","TAMBORES","FIBRAS","CONVERSORES","INTERCOM","MONITORES","BATERIAS / CARGADORES","RCP","WALKIES"] },
  STEADY_L: { label: "Steady L", icon: "🎬", color: "#10B981", items: ["MONITOR","SLEED","CABLES","CONTROL ZOOM","BATERIAS","ALIMENTACIÓN","DOCKING BRACKET"] },
  STEADY_R: { label: "Steady R", icon: "🎬", color: "#10B981", items: ["MONITOR","SLEED","CABLES","CONTROL ZOOM","BATERIAS","ALIMENTACIÓN","DOCKING BRACKET"] },
  STEADY_PERSO: { label: "Steady Perso", icon: "🎬", color: "#10B981", items: ["MONITOR","SLEED","CABLES","CONTROL ZOOM","BATERIAS","ALIMENTACIÓN","DOCKING BRACKET"] },
  RF_L: { label: "RF L", icon: "📡", color: "#8B5CF6", items: ["TX/RX RF","CONTROL DE DATOS","CABLEADO","BATERIAS","CAMARA","WALKIES","DATOS TRANSMISION"] },
  RF_R: { label: "RF R", icon: "📡", color: "#8B5CF6", items: ["TX/RX RF","CONTROL DE DATOS","CABLEADO","BATERIAS","CAMARA","WALKIES","DATOS TRANSMISION"] },
  RF_PERSO: { label: "RF Perso", icon: "📡", color: "#8B5CF6", items: ["TX/RX RF","CONTROL DE DATOS","CABLEADO","BATERIAS","CAMARA","WALKIES","DATOS TRANSMISION"] },
  POLECAM_L: { label: "Polecam L", icon: "🎯", color: "#EF4444", items: ["CAMARA","GIMBAL","MONITORES","ESTRUCTURA","TRIPODE","REMOTOS","ELECTRONICAS"] },
  POLECAM_R: { label: "Polecam R", icon: "🎯", color: "#EF4444", items: ["CAMARA","GIMBAL","MONITORES","ESTRUCTURA","TRIPODE","REMOTOS","ELECTRONICAS"] },
  MINICAM_L: { label: "Minicámara L", icon: "🔭", color: "#F97316", items: ["MINICAMARA","ELECTRONICAS","SOPORTES","FUNDAS"] },
  MINICAM_R: { label: "Minicámara R", icon: "🔭", color: "#F97316", items: ["MINICAMARA","ELECTRONICAS","SOPORTES","FUNDAS"] },
  KIT_CINEMA_L: { label: "Kit Cinema L", icon: "🎞", color: "#EC4899", items: ["CAMARA","VAXIS","CINEFADE","MICROFONO","MOTORES","MANDO FOCO/IRIS/FILTRO","REMOTO OCP"] },
  KIT_CINEMA_R: { label: "Kit Cinema R", icon: "🎞", color: "#EC4899", items: ["CAMARA","VAXIS","CINEFADE","MICROFONO","MOTORES","MANDO FOCO/IRIS/FILTRO","REMOTO OCP"] },
  BODYCAM: { label: "Bodycam", icon: "👕", color: "#14B8A6", items: ["MINICAMARA","ELECTRONICAS","SOPORTES","BATERIA","CHALECO","OCP"] },
};

const LOGISTICA_ITEMS = ["VEHICULOS","HORA DE LLEGADA","HOTEL","CABLEADO UM","MATERIAL EXTERNO"];
const STATUS = { OK: "OK", G: "G", L: "L" };
const initItems = (items) => Object.fromEntries(items.map((i) => [i, STATUS.OK]));

const css = {
  app: { minHeight: "100vh", background: "#0A0A0F", color: "#E8E8F0", fontFamily: "'Segoe UI', system-ui, sans-serif" },
  header: { background: "linear-gradient(135deg,#0F0F1A,#1A1A2E)", borderBottom: "1px solid #2A2A3E", padding: "14px 20px", display: "flex", alignItems: "center", gap: "16px", position: "sticky", top: 0, zIndex: 100 },
  logo: { fontSize: "11px", fontWeight: 800, letterSpacing: "3px", color: "#F59E0B", textTransform: "uppercase" },
  body: { maxWidth: 860, margin: "0 auto", padding: "20px 14px 80px" },
  card: { background: "linear-gradient(135deg,#111118,#16161F)", border: "1px solid #222230", borderRadius: 14, padding: 20, marginBottom: 14 },
  secTitle: { fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: "#F59E0B", textTransform: "uppercase", marginBottom: 14 },
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  g3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  label: { fontSize: 10, fontWeight: 600, letterSpacing: "1px", color: "#888899", textTransform: "uppercase", marginBottom: 5 },
  input: { width: "100%", background: "#0C0C14", border: "1px solid #2A2A3E", borderRadius: 10, padding: "10px 13px", color: "#E8E8F0", fontSize: 14, outline: "none", boxSizing: "border-box" },
  textarea: { width: "100%", background: "#0C0C14", border: "1px solid #2A2A3E", borderRadius: 10, padding: "10px 13px", color: "#E8E8F0", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 68, fontFamily: "inherit" },
  btnPrimary: { background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#0A0A0F", border: "none", borderRadius: 11, padding: "13px 26px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  btnSecondary: { background: "transparent", color: "#888899", border: "1px solid #2A2A3E", borderRadius: 11, padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};

function StepDot({ n, active, done }) {
  return (
    <div style={{ width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:done?"#F59E0B":active?"rgba(245,158,11,0.2)":"#1A1A2E",color:done?"#0A0A0F":active?"#F59E0B":"#444460",border:active?"2px solid #F59E0B":"2px solid transparent",transition:"all 0.3s" }}>
      {done ? "✓" : n}
    </div>
  );
}

function Field({ label, children }) {
  return <div><div style={css.label}>{label}</div>{children}</div>;
}

function StatusToggle({ value, onChange }) {
  const opts = [
    { key:"OK", label:"OK", bg:"#064E3B", color:"#34D399", border:"#065F46" },
    { key:"G", label:"⚠ GRAVE", bg:"#7F1D1D", color:"#FCA5A5", border:"#991B1B" },
    { key:"L", label:"↓ LEVE", bg:"#78350F", color:"#FCD34D", border:"#92400E" },
  ];
  return (
    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
      {opts.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)} style={{ padding:"5px 10px",borderRadius:7,fontSize:10,fontWeight:700,cursor:"pointer",background:value===o.key?o.bg:"transparent",color:value===o.key?o.color:"#444460",border:`1px solid ${value===o.key?o.border:"#222230"}`,transition:"all 0.15s" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CameraToggle({ id, cam, selected, onToggle }) {
  return (
    <button onClick={() => onToggle(id)} style={{ background:selected?`linear-gradient(135deg,${cam.color}22,${cam.color}11)`:"#0C0C14",border:`2px solid ${selected?cam.color:"#222230"}`,borderRadius:12,padding:"12px 8px",cursor:"pointer",textAlign:"center",transition:"all 0.2s",display:"flex",flexDirection:"column",alignItems:"center",gap:5 }}>
      <div style={{ fontSize:22 }}>{cam.icon}</div>
      <div style={{ fontSize:10,fontWeight:700,color:selected?cam.color:"#555570",letterSpacing:"0.3px" }}>{cam.label}</div>
      {selected && <div style={{ width:5,height:5,borderRadius:"50%",background:cam.color }} />}
    </button>
  );
}

function CameraSection({ camId, cam, data, onChange }) {
  return (
    <div style={{ ...css.card, borderLeft:`4px solid ${cam.color}`, marginBottom:10 }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
        <span style={{ fontSize:18 }}>{cam.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14,fontWeight:700,color:"#E8E8F0" }}>{cam.label}</div>
          <div style={{ fontSize:10,color:"#555570" }}>Equipo utilizado:</div>
        </div>
        <input style={{ ...css.input, width:180,fontSize:12 }} placeholder="Modelo/equipo..." value={data.equipo||""} onChange={(e)=>onChange(camId,"equipo",e.target.value)} />
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
        {cam.items.map((item) => (
          <div key={item} style={{ display:"flex",alignItems:"center",background:"#0C0C14",borderRadius:9,padding:"9px 13px",gap:12 }}>
            <div style={{ flex:1,fontSize:11,fontWeight:600,color:"#AAAACC",letterSpacing:"0.3px" }}>{item}</div>
            <StatusToggle value={data.items?.[item]||STATUS.OK} onChange={(v)=>onChange(camId,"item",item,v)} />
          </div>
        ))}
      </div>
      <div>
        <div style={css.label}>Descripción de incidencias</div>
        <textarea style={css.textarea} placeholder="Sin incidencias..." value={data.incidencias||""} onChange={(e)=>onChange(camId,"incidencias",e.target.value)} />
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [match, setMatch] = useState({ jornada:"",encuentro:"",fecha:"",hora_partido:"",hora_citacion:"",responsable:"",um:"",jefe_tecnico:"",realizador:"",productor:"",horario_md1:"" });
  const [operators, setOperators] = useState({ ULTRA:"","4SKY":"",POLE:"",STEADY:"",FOQUISTA:"",RF:"",BODYCAM:"",MINICAMS:"" });
  const [selectedCams, setSelectedCams] = useState({});
  const [logistica, setLogistica] = useState({ items: initItems(LOGISTICA_ITEMS), incidencias:"" });
  const [camData, setCamData] = useState({});
  const [sent, setSent] = useState(false);

  const toggleCam = useCallback((id) => setSelectedCams((p) => ({ ...p, [id]: !p[id] })), []);

  const updateCamData = useCallback((camId, field, sub, val) => {
    setCamData((prev) => {
      const cam = prev[camId] || { equipo:"", items: initItems(CAMERA_CATALOG[camId].items), incidencias:"" };
      if (field==="equipo") return { ...prev, [camId]: { ...cam, equipo:sub } };
      if (field==="item") return { ...prev, [camId]: { ...cam, items:{ ...cam.items, [sub]:val } } };
      if (field==="incidencias") return { ...prev, [camId]: { ...cam, incidencias:sub } };
      return prev;
    });
  }, []);

  const activeCams = Object.entries(CAMERA_CATALOG).filter(([id]) => selectedCams[id]);

  const countInc = () => {
    let g=0, l=0;
    Object.values(logistica.items).forEach((v) => { if(v==="G") g++; if(v==="L") l++; });
    activeCams.forEach(([id]) => { const d=camData[id]; if(!d?.items) return; Object.values(d.items).forEach((v)=>{ if(v==="G") g++; if(v==="L") l++; }); });
    return { g, l };
  };
  const { g, l } = countInc();

  const STEPS = ["Partido","Cámaras","Informe","Resumen"];

  if (sent) {
    return (
      <div style={{ ...css.app, display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",gap:20 }}>
        <div style={{ fontSize:64 }}>✅</div>
        <div style={{ fontSize:22,fontWeight:800,color:"#34D399" }}>¡Informe enviado!</div>
        <div style={{ fontSize:14,color:"#555570" }}>{match.encuentro} · {match.jornada}</div>
        <div style={{ display:"flex",gap:8,marginTop:8 }}>
          {g>0&&<span style={{ padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:"#7F1D1D",color:"#FCA5A5" }}>⚠ {g} GRAVE{g>1?"S":""}</span>}
          {l>0&&<span style={{ padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:"#78350F",color:"#FCD34D" }}>↓ {l} LEVE{l>1?"S":""}</span>}
          {g===0&&l===0&&<span style={{ padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:"#064E3B",color:"#34D399" }}>✓ Sin incidencias</span>}
        </div>
        <button style={{ ...css.btnPrimary,marginTop:16 }} onClick={()=>{ setStep(1); setMatch({jornada:"",encuentro:"",fecha:"",hora_partido:"",hora_citacion:"",responsable:"",um:"",jefe_tecnico:"",realizador:"",productor:"",horario_md1:""}); setOperators({ULTRA:"","4SKY":"",POLE:"",STEADY:"",FOQUISTA:"",RF:"",BODYCAM:"",MINICAMS:""}); setSelectedCams({}); setLogistica({items:initItems(LOGISTICA_ITEMS),incidencias:""}); setCamData({}); setSent(false); }}>
          + Nuevo informe
        </button>
      </div>
    );
  }

  return (
    <div style={css.app}>
      {/* HEADER */}
      <div style={css.header}>
        <div>
          <div style={css.logo}>MEDIAPRO · CCEE</div>
          <div style={{ fontSize:9,color:"#444460",letterSpacing:"1px",textTransform:"uppercase" }}>Cámaras Especiales — La Liga</div>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:"flex",gap:4,alignItems:"center" }}>
          {STEPS.map((lbl,i) => (
            <div key={i} style={{ display:"flex",alignItems:"center",gap:5 }}>
              <StepDot n={i+1} active={step===i+1} done={step>i+1} />
              <span style={{ fontSize:9,color:step===i+1?"#F59E0B":"#333350",fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase" }}>{lbl}</span>
              {i<3&&<div style={{ width:12,height:1,background:"#222230" }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={css.body}>

        {/* STEP 1 */}
        {step===1 && (
          <>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:20,fontWeight:800,marginBottom:3 }}>Datos del partido</div>
              <div style={{ fontSize:12,color:"#555570" }}>Cabecera del informe</div>
            </div>
            <div style={css.card}>
              <div style={css.secTitle}>📋 Identificación</div>
              <div style={css.g2}>
                {[["Jornada","jornada","J26"],["Encuentro","encuentro","Sevilla VS Betis"],["Fecha partido","fecha",""],["Hora partido","hora_partido",""],["Hora citación","hora_citacion","12:00 HLE"],["Horario MD-1","horario_md1","10:00 a 22:00"]].map(([lbl,key,ph])=>(
                  <Field key={key} label={lbl}>
                    <input style={css.input} type={key.includes("fecha")?"date":key.includes("hora_partido")?"time":"text"} placeholder={ph} value={match[key]} onChange={(e)=>setMatch({...match,[key]:e.target.value})} />
                  </Field>
                ))}
              </div>
            </div>
            <div style={css.card}>
              <div style={css.secTitle}>👥 Equipo técnico</div>
              <div style={css.g2}>
                {[["Responsable CCEE","responsable"],["Unidad Móvil","um"],["J. Técnico UM","jefe_tecnico"],["Realizador","realizador"],["Productor","productor"]].map(([lbl,key])=>(
                  <Field key={key} label={lbl}>
                    <input style={css.input} value={match[key]} onChange={(e)=>setMatch({...match,[key]:e.target.value})} />
                  </Field>
                ))}
              </div>
            </div>
            <div style={css.card}>
              <div style={css.secTitle}>🎬 Operadores asignados</div>
              <div style={css.g3}>
                {Object.keys(operators).map((op)=>(
                  <Field key={op} label={op}>
                    <input style={css.input} placeholder="Nombre..." value={operators[op]} onChange={(e)=>setOperators({...operators,[op]:e.target.value})} />
                  </Field>
                ))}
              </div>
            </div>
            <div style={{ display:"flex",justifyContent:"flex-end" }}>
              <button style={css.btnPrimary} onClick={()=>setStep(2)}>Siguiente: Configurar cámaras →</button>
            </div>
          </>
        )}

        {/* STEP 2 */}
        {step===2 && (
          <>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:20,fontWeight:800,marginBottom:3 }}>Cámaras desplegadas</div>
              <div style={{ fontSize:12,color:"#555570" }}>Selecciona los equipos activos para <strong style={{ color:"#F59E0B" }}>{match.encuentro||"este partido"}</strong></div>
            </div>
            <div style={css.card}>
              <div style={css.secTitle}>Toca para activar / desactivar</div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8 }}>
                {Object.entries(CAMERA_CATALOG).map(([id,cam])=>(
                  <CameraToggle key={id} id={id} cam={cam} selected={!!selectedCams[id]} onToggle={toggleCam} />
                ))}
              </div>
            </div>
            {activeCams.length>0 && (
              <div style={{ ...css.card,borderLeft:"4px solid #F59E0B",padding:"14px 20px" }}>
                <div style={{ fontSize:11,color:"#888899",marginBottom:8 }}>CÁMARAS ACTIVAS ({activeCams.length})</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                  {activeCams.map(([id,cam])=>(
                    <span key={id} style={{ padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:`${cam.color}22`,color:cam.color,border:`1px solid ${cam.color}44` }}>{cam.icon} {cam.label}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display:"flex",justifyContent:"space-between" }}>
              <button style={css.btnSecondary} onClick={()=>setStep(1)}>← Atrás</button>
              <button style={{ ...css.btnPrimary,opacity:activeCams.length===0?0.4:1 }} onClick={()=>activeCams.length>0&&setStep(3)}>Siguiente: Informe ({activeCams.length} cámaras) →</button>
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step===3 && (
          <>
            <div style={{ marginBottom:16,display:"flex",alignItems:"center",gap:12 }}>
              <div>
                <div style={{ fontSize:20,fontWeight:800 }}>Informe técnico</div>
                <div style={{ fontSize:12,color:"#555570" }}>{match.encuentro} · {match.jornada}</div>
              </div>
              <div style={{ marginLeft:"auto",display:"flex",gap:6 }}>
                {g>0&&<span style={{ padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"#7F1D1D",color:"#FCA5A5" }}>⚠ {g}G</span>}
                {l>0&&<span style={{ padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"#78350F",color:"#FCD34D" }}>↓ {l}L</span>}
                {g===0&&l===0&&<span style={{ padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"#064E3B",color:"#34D399" }}>✓ OK</span>}
              </div>
            </div>
            {/* Logística */}
            <div style={{ ...css.card,borderLeft:"4px solid #F59E0B",marginBottom:10 }}>
              <div style={css.secTitle}>🚛 Logística</div>
              <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
                {LOGISTICA_ITEMS.map((item)=>(
                  <div key={item} style={{ display:"flex",alignItems:"center",background:"#0C0C14",borderRadius:9,padding:"9px 13px",gap:12 }}>
                    <div style={{ flex:1,fontSize:11,fontWeight:600,color:"#AAAACC" }}>{item}</div>
                    <StatusToggle value={logistica.items[item]} onChange={(v)=>setLogistica({...logistica,items:{...logistica.items,[item]:v}})} />
                  </div>
                ))}
              </div>
              <div style={css.label}>Descripción de incidencias</div>
              <textarea style={css.textarea} placeholder="Sin incidencias..." value={logistica.incidencias} onChange={(e)=>setLogistica({...logistica,incidencias:e.target.value})} />
            </div>
            {activeCams.map(([id,cam])=>(
              <CameraSection key={id} camId={id} cam={cam} data={camData[id]||{equipo:"",items:initItems(cam.items),incidencias:""}} onChange={updateCamData} />
            ))}
            <div style={{ display:"flex",justifyContent:"space-between" }}>
              <button style={css.btnSecondary} onClick={()=>setStep(2)}>← Atrás</button>
              <button style={css.btnPrimary} onClick={()=>setStep(4)}>Ver resumen y enviar →</button>
            </div>
          </>
        )}

        {/* STEP 4 */}
        {step===4 && (
          <>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:20,fontWeight:800,marginBottom:3 }}>Resumen del informe</div>
              <div style={{ fontSize:12,color:"#555570" }}>Revisa antes de guardar en la base de datos</div>
            </div>
            <div style={css.card}>
              <div style={css.secTitle}>📋 Datos del partido</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14 }}>
                {[["Jornada",match.jornada||"—"],["Encuentro",match.encuentro||"—"],["Fecha",match.fecha||"—"],["Hora partido",match.hora_partido||"—"],["Responsable CCEE",match.responsable||"—"],["Unidad Móvil",match.um||"—"]].map(([k,v])=>(
                  <div key={k}>
                    <div style={{ fontSize:9,color:"#555570",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:2 }}>{k}</div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#E8E8F0" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={css.card}>
              <div style={css.secTitle}>📊 Estado general</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10 }}>
                <div style={{ background:"#064E3B",borderRadius:12,padding:16,textAlign:"center" }}>
                  <div style={{ fontSize:26,fontWeight:800,color:"#34D399" }}>{activeCams.length+1}</div>
                  <div style={{ fontSize:9,color:"#34D399",letterSpacing:"1px" }}>SECCIONES</div>
                </div>
                <div style={{ background:g>0?"#7F1D1D":"#0C0C14",borderRadius:12,padding:16,textAlign:"center",border:"1px solid #222230" }}>
                  <div style={{ fontSize:26,fontWeight:800,color:g>0?"#FCA5A5":"#333350" }}>{g}</div>
                  <div style={{ fontSize:9,color:g>0?"#FCA5A5":"#333350",letterSpacing:"1px" }}>GRAVES</div>
                </div>
                <div style={{ background:l>0?"#78350F":"#0C0C14",borderRadius:12,padding:16,textAlign:"center",border:"1px solid #222230" }}>
                  <div style={{ fontSize:26,fontWeight:800,color:l>0?"#FCD34D":"#333350" }}>{l}</div>
                  <div style={{ fontSize:9,color:l>0?"#FCD34D":"#333350",letterSpacing:"1px" }}>LEVES</div>
                </div>
              </div>
            </div>
            <div style={css.card}>
              <div style={css.secTitle}>🎥 Estado por cámara</div>
              <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                {activeCams.map(([id,cam])=>{
                  const d=camData[id];
                  const items=d?.items||{};
                  const gv=Object.values(items).filter(v=>v==="G").length;
                  const lv=Object.values(items).filter(v=>v==="L").length;
                  return (
                    <div key={id} style={{ display:"flex",alignItems:"center",gap:10,background:"#0C0C14",borderRadius:9,padding:"10px 14px" }}>
                      <span style={{ fontSize:16 }}>{cam.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12,fontWeight:700,color:"#E8E8F0" }}>{cam.label}</div>
                        {d?.equipo&&<div style={{ fontSize:10,color:"#555570" }}>{d.equipo}</div>}
                      </div>
                      <div style={{ display:"flex",gap:5 }}>
                        {gv>0&&<span style={{ fontSize:10,fontWeight:700,color:"#FCA5A5",background:"#7F1D1D",padding:"2px 8px",borderRadius:20 }}>⚠ {gv}G</span>}
                        {lv>0&&<span style={{ fontSize:10,fontWeight:700,color:"#FCD34D",background:"#78350F",padding:"2px 8px",borderRadius:20 }}>↓ {lv}L</span>}
                        {gv===0&&lv===0&&<span style={{ fontSize:10,fontWeight:700,color:"#34D399",background:"#064E3B",padding:"2px 8px",borderRadius:20 }}>✓ OK</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={css.card}>
              <div style={css.secTitle}>📤 Acciones</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
                {[{icon:"📄",label:"Generar PDF",sub:"Informe del partido",color:"#F59E0B"},{icon:"📧",label:"Enviar por email",sub:"Al equipo de producción",color:"#10B981"},{icon:"📊",label:"Dashboard jornada",sub:"Ver estadísticas",color:"#8B5CF6"},{icon:"🗄️",label:"API REST",sub:"→ Servidor MEDIAPRO",color:"#3B82F6"}].map((btn)=>(
                  <button key={btn.label} style={{ background:"#0C0C14",border:`1px solid ${btn.color}44`,borderRadius:11,padding:14,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ fontSize:22 }}>{btn.icon}</span>
                    <div>
                      <div style={{ fontSize:12,fontWeight:700,color:btn.color }}>{btn.label}</div>
                      <div style={{ fontSize:10,color:"#555570" }}>{btn.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <button style={css.btnSecondary} onClick={()=>setStep(3)}>← Revisar informe</button>
                <button style={{ ...css.btnPrimary,padding:"14px 32px",fontSize:14 }} onClick={()=>setSent(true)}>
                  ✓ CONFIRMAR Y GUARDAR
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
