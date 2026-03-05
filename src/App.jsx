import { useState, useCallback, useEffect, lazy, Suspense } from "react";
const CoordView = lazy(() => import('./CoordView.jsx'));
const UsuarioView = lazy(() => import('./UsuarioView.jsx'));

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap";
document.head.appendChild(fontLink);

/* ─── LIGA DATA ───────────────────────────────────────────── */
const LIGA_PARTIDOS = {
  "J1":["Alavés vs Levante","Athletic Bilbao vs Sevilla","Celta de Vigo vs Getafe","Girona vs Rayo Vallecano","Espanyol vs Atlético de Madrid","Mallorca vs Barcelona","Elche vs Betis","Real Madrid vs Osasuna","Valencia vs Real Sociedad","Villarreal vs Oviedo"],
  "J2":["Athletic Bilbao vs Rayo Vallecano","Atlético de Madrid vs Elche","Osasuna vs Valencia","Oviedo vs Real Madrid","Betis vs Alavés","Levante vs Barcelona","Mallorca vs Celta de Vigo","Real Sociedad vs Espanyol","Sevilla vs Getafe","Villarreal vs Girona"],
  "J3":["Alavés vs Atlético de Madrid","Celta de Vigo vs Villarreal","Elche vs Levante","Espanyol vs Osasuna","Girona vs Sevilla","Oviedo vs Real Sociedad","Betis vs Athletic Bilbao","Rayo Vallecano vs Barcelona","Valencia vs Getafe","Real Madrid vs Mallorca"],
  "J4":["Atlético de Madrid vs Villarreal","Barcelona vs Valencia","Celta de Vigo vs Girona","Espanyol vs Mallorca","Getafe vs Oviedo","Osasuna vs Rayo Vallecano","Athletic Bilbao vs Alavés","Levante vs Betis","Sevilla vs Elche","Real Sociedad vs Real Madrid"],
  "J5":["Alavés vs Sevilla","Barcelona vs Getafe","Betis vs Real Sociedad","Elche vs Oviedo","Girona vs Levante","Valencia vs Athletic Bilbao","Mallorca vs Atlético de Madrid","Rayo Vallecano vs Celta de Vigo","Real Madrid vs Espanyol","Villarreal vs Osasuna"],
  "J6":["Athletic Bilbao vs Girona","Atlético de Madrid vs Rayo Vallecano","Espanyol vs Valencia","Levante vs Real Madrid","Sevilla vs Villarreal","Getafe vs Alavés","Oviedo vs Barcelona","Celta de Vigo vs Betis","Osasuna vs Elche","Real Sociedad vs Mallorca"],
  "J7":["Atlético de Madrid vs Real Madrid","Barcelona vs Real Sociedad","Betis vs Osasuna","Getafe vs Levante","Rayo Vallecano vs Sevilla","Mallorca vs Alavés","Villarreal vs Athletic Bilbao","Elche vs Celta de Vigo","Girona vs Espanyol","Valencia vs Oviedo"],
  "J8":["Alavés vs Elche","Athletic Bilbao vs Mallorca","Girona vs Valencia","Real Madrid vs Villarreal","Celta de Vigo vs Atlético de Madrid","Sevilla vs Barcelona","Espanyol vs Betis","Osasuna vs Getafe","Oviedo vs Levante","Real Sociedad vs Rayo Vallecano"],
  "J9":["Alavés vs Valencia","Atlético de Madrid vs Osasuna","Barcelona vs Girona","Celta de Vigo vs Real Sociedad","Getafe vs Real Madrid","Levante vs Rayo Vallecano","Elche vs Athletic Bilbao","Villarreal vs Betis","Oviedo vs Espanyol","Sevilla vs Mallorca"],
  "J10":["Athletic Bilbao vs Getafe","Girona vs Oviedo","Real Sociedad vs Sevilla","Valencia vs Villarreal","Rayo Vallecano vs Alavés","Betis vs Atlético de Madrid","Real Madrid vs Barcelona","Osasuna vs Celta de Vigo","Espanyol vs Elche","Mallorca vs Levante"],
  "J11":["Alavés vs Espanyol","Atlético de Madrid vs Sevilla","Barcelona vs Elche","Betis vs Mallorca","Getafe vs Girona","Real Madrid vs Valencia","Real Sociedad vs Athletic Bilbao","Levante vs Celta de Vigo","Oviedo vs Osasuna","Villarreal vs Rayo Vallecano"],
  "J12":["Athletic Bilbao vs Oviedo","Atlético de Madrid vs Levante","Elche vs Real Sociedad","Espanyol vs Villarreal","Rayo Vallecano vs Real Madrid","Girona vs Alavés","Celta de Vigo vs Barcelona","Valencia vs Betis","Mallorca vs Getafe","Sevilla vs Osasuna"],
  "J13":["Alavés vs Celta de Vigo","Betis vs Girona","Elche vs Real Madrid","Espanyol vs Sevilla","Osasuna vs Real Sociedad","Oviedo vs Rayo Vallecano","Barcelona vs Athletic Bilbao","Getafe vs Atlético de Madrid","Valencia vs Levante","Villarreal vs Mallorca"],
  "J14":["Atlético de Madrid vs Oviedo","Celta de Vigo vs Espanyol","Girona vs Real Madrid","Mallorca vs Osasuna","Rayo Vallecano vs Valencia","Real Sociedad vs Villarreal","Barcelona vs Alavés","Levante vs Athletic Bilbao","Sevilla vs Betis","Getafe vs Elche"],
  "J15":["Alavés vs Real Sociedad","Athletic Bilbao vs Atlético de Madrid","Elche vs Girona","Espanyol vs Rayo Vallecano","Betis vs Barcelona","Real Madrid vs Celta de Vigo","Villarreal vs Getafe","Osasuna vs Levante","Oviedo vs Mallorca","Valencia vs Sevilla"],
  "J16":["Alavés vs Real Madrid","Atlético de Madrid vs Valencia","Barcelona vs Osasuna","Levante vs Villarreal","Celta de Vigo vs Athletic Bilbao","Rayo Vallecano vs Betis","Mallorca vs Elche","Getafe vs Espanyol","Real Sociedad vs Girona","Sevilla vs Oviedo"],
  "J17":["Athletic Bilbao vs Espanyol","Betis vs Getafe","Elche vs Rayo Vallecano","Levante vs Real Sociedad","Real Madrid vs Sevilla","Osasuna vs Alavés","Girona vs Atlético de Madrid","Villarreal vs Barcelona","Oviedo vs Celta de Vigo","Valencia vs Mallorca"],
  "J18":["Alavés vs Oviedo","Celta de Vigo vs Valencia","Elche vs Villarreal","Osasuna vs Athletic Bilbao","Real Sociedad vs Atlético de Madrid","Espanyol vs Barcelona","Real Madrid vs Betis","Rayo Vallecano vs Getafe","Mallorca vs Girona","Sevilla vs Levante"],
  "J19":["Athletic Bilbao vs Real Madrid","Getafe vs Real Sociedad","Girona vs Osasuna","Villarreal vs Alavés","Barcelona vs Atlético de Madrid","Oviedo vs Betis","Sevilla vs Celta de Vigo","Valencia vs Elche","Levante vs Espanyol","Rayo Vallecano vs Mallorca"],
  "J20":["Betis vs Villarreal","Celta de Vigo vs Rayo Vallecano","Elche vs Sevilla","Espanyol vs Girona","Getafe vs Valencia","Osasuna vs Oviedo","Atlético de Madrid vs Alavés","Mallorca vs Athletic Bilbao","Real Sociedad vs Barcelona","Real Madrid vs Levante"],
  "J21":["Alavés vs Betis","Atlético de Madrid vs Mallorca","Barcelona vs Oviedo","Sevilla vs Athletic Bilbao","Real Sociedad vs Celta de Vigo","Levante vs Elche","Valencia vs Espanyol","Girona vs Getafe","Rayo Vallecano vs Osasuna","Villarreal vs Real Madrid"],
  "J22":["Athletic Bilbao vs Real Sociedad","Betis vs Valencia","Mallorca vs Sevilla","Osasuna vs Villarreal","Espanyol vs Alavés","Levante vs Atlético de Madrid","Elche vs Barcelona","Getafe vs Celta de Vigo","Oviedo vs Girona","Real Madrid vs Rayo Vallecano"],
  "J23":["Alavés vs Getafe","Athletic Bilbao vs Levante","Atlético de Madrid vs Betis","Barcelona vs Mallorca","Celta de Vigo vs Osasuna","Real Sociedad vs Elche","Villarreal vs Espanyol","Sevilla vs Girona","Valencia vs Real Madrid","Rayo Vallecano vs Oviedo"],
  "J24":["Elche vs Osasuna","Getafe vs Villarreal","Levante vs Valencia","Real Madrid vs Real Sociedad","Sevilla vs Alavés","Oviedo vs Athletic Bilbao","Rayo Vallecano vs Atlético de Madrid","Girona vs Barcelona","Mallorca vs Betis","Espanyol vs Celta de Vigo"],
  "J25":["Alavés vs Girona","Athletic Bilbao vs Elche","Atlético de Madrid vs Espanyol","Barcelona vs Levante","Betis vs Rayo Vallecano","Celta de Vigo vs Mallorca","Getafe vs Sevilla","Osasuna vs Real Madrid","Villarreal vs Valencia","Real Sociedad vs Oviedo"],
  "J26":["Barcelona vs Villarreal","Betis vs Sevilla","Elche vs Espanyol","Mallorca vs Real Sociedad","Levante vs Alavés","Rayo Vallecano vs Athletic Bilbao","Oviedo vs Atlético de Madrid","Girona vs Celta de Vigo","Real Madrid vs Getafe","Valencia vs Osasuna"],
  "J27":["Athletic Bilbao vs Barcelona","Atlético de Madrid vs Real Sociedad","Celta de Vigo vs Real Madrid","Espanyol vs Oviedo","Valencia vs Alavés","Getafe vs Betis","Villarreal vs Elche","Levante vs Girona","Osasuna vs Mallorca","Sevilla vs Rayo Vallecano"],
  "J28":["Alavés vs Villarreal","Atlético de Madrid vs Getafe","Barcelona vs Sevilla","Betis vs Celta de Vigo","Oviedo vs Valencia","Girona vs Athletic Bilbao","Real Madrid vs Elche","Mallorca vs Espanyol","Rayo Vallecano vs Levante","Real Sociedad vs Osasuna"],
  "J29":["Athletic Bilbao vs Betis","Barcelona vs Rayo Vallecano","Elche vs Mallorca","Espanyol vs Getafe","Levante vs Oviedo","Sevilla vs Valencia","Celta de Vigo vs Alavés","Real Madrid vs Atlético de Madrid","Osasuna vs Girona","Villarreal vs Real Sociedad"],
  "J30":["Alavés vs Osasuna","Atlético de Madrid vs Barcelona","Betis vs Espanyol","Girona vs Villarreal","Mallorca vs Real Madrid","Oviedo vs Sevilla","Getafe vs Athletic Bilbao","Valencia vs Celta de Vigo","Rayo Vallecano vs Elche","Real Sociedad vs Levante"],
  "J31":["Athletic Bilbao vs Villarreal","Barcelona vs Espanyol","Celta de Vigo vs Oviedo","Elche vs Valencia","Mallorca vs Rayo Vallecano","Real Sociedad vs Alavés","Sevilla vs Atlético de Madrid","Osasuna vs Betis","Levante vs Getafe","Real Madrid vs Girona"],
  "J32":["Alavés vs Mallorca","Betis vs Real Madrid","Espanyol vs Levante","Osasuna vs Sevilla","Rayo Vallecano vs Real Sociedad","Atlético de Madrid vs Athletic Bilbao","Getafe vs Barcelona","Villarreal vs Celta de Vigo","Oviedo vs Elche","Valencia vs Girona"],
  "J33":["Athletic Bilbao vs Osasuna","Barcelona vs Celta de Vigo","Levante vs Sevilla","Mallorca vs Valencia","Oviedo vs Villarreal","Real Madrid vs Alavés","Elche vs Atlético de Madrid","Girona vs Betis","Rayo Vallecano vs Espanyol","Real Sociedad vs Getafe"],
  "J34":["Alavés vs Athletic Bilbao","Betis vs Oviedo","Celta de Vigo vs Elche","Espanyol vs Real Madrid","Getafe vs Rayo Vallecano","Girona vs Mallorca","Valencia vs Atlético de Madrid","Osasuna vs Barcelona","Villarreal vs Levante","Sevilla vs Real Sociedad"],
  "J35":["Athletic Bilbao vs Valencia","Atlético de Madrid vs Celta de Vigo","Barcelona vs Real Madrid","Levante vs Osasuna","Mallorca vs Villarreal","Elche vs Alavés","Real Sociedad vs Betis","Sevilla vs Espanyol","Oviedo vs Getafe","Rayo Vallecano vs Girona"],
  "J36":["Alavés vs Barcelona","Betis vs Elche","Celta de Vigo vs Levante","Getafe vs Mallorca","Girona vs Real Sociedad","Espanyol vs Athletic Bilbao","Osasuna vs Atlético de Madrid","Valencia vs Rayo Vallecano","Villarreal vs Sevilla","Real Madrid vs Oviedo"],
  "J37":["Athletic Bilbao vs Celta de Vigo","Atlético de Madrid vs Girona","Barcelona vs Betis","Elche vs Getafe","Levante vs Mallorca","Rayo Vallecano vs Villarreal","Real Sociedad vs Valencia","Oviedo vs Alavés","Osasuna vs Espanyol","Sevilla vs Real Madrid"],
  "J38":["Alavés vs Rayo Vallecano","Betis vs Levante","Celta de Vigo vs Sevilla","Espanyol vs Real Sociedad","Getafe vs Osasuna","Mallorca vs Oviedo","Real Madrid vs Athletic Bilbao","Villarreal vs Atlético de Madrid","Valencia vs Barcelona","Girona vs Elche"],
};

/* ─── PERSONAL ────────────────────────────────────────────── */
const PERSONAL = {
  RESP_CCEE:    ["CELEDONIO GARCIA RAUSELL","DANIEL MURILLO PERALES","ISMAEL BARROSO FERNÁNDEZ","JOAQUIN QUINTO ANTON","JUAN MARÍN GÓMEZ","PASCUAL LOPEZ MONTOYA"],
  OP_SKYCAM:    ["ADRIÁN ZAPAIA FERNÁNDEZ","AFONSO GAMBOA DE COAMPOS","AURELIO ROMERO MARTINEZ","CESAR PASTOR PEREZ","CESAR SALA PONT","CLAUDIO GONZALEZ CASTELAO","DANIEL MUÑOZ TOMAS","DAVID DIAZ MARTINEZ","DOMINGO BELLIDO VERDOY","FRANCISCO RODRIGUEZ-TRELLES","HUMBERTO TORREALBA ORTEGANO","JOSE FERRER BARGUES","LUIS PASCUAL MENDOZA","NICOLAS FORES OZEKI","RUBEN MONTEIRO ORTET","SERGIO CABEDO MOLTO","VICTOR FERRANDIZ MANGLANO"],
  TEC_SKYCAM:   ["ALEJANDRO LLORENS SANZ","DAVID VAZQUEZ TORNERO","JORGE PASCUAL RIVEIRA","JUAN CARLOS VAZQUEZ TORNERO","LAURA MUÑOZ CUEVAS","MANEL MAZCUÑAN TARREGA","MARCOS SANCHEZ MARTI","SERGIO TORRES SANTIAGO","VICENTE GOMEZ AGUT"],
  TEC_AR:       ["CLARA BRONSTEN","DANIEL LOZANO ROSALES","DAVID ARRIBAS","DIDAC GARCÍA PÉREZ","EDUARD GISPERT","ENRIC LÓPEZ MATAS","JOAN ROCA FONT","JOAO MARTINS BASTOS","MIGUEL GALINDO","MIGUEL GÓMEZ","PEDRO GARCÍA SÁNCHEZ","ROGER FOLCH ALCARAZ"],
  STEADYCAM:    ["ALBANO SÁNCHEZ GRACIA","ANGEL NAVARRO LATORRE","BORJA SANCHEZ JORGE","CURT OSWALD SCHALER","EDUARDO MATO MATA","FERNANDO RODRIGO CANO","JAVIER ALFONSO BARTOLOZZI","JAVIER NAVALON APARICIO","MANUEL RODRÍGUEZ GIRONA","MANUEL TOMAS GARCIA","ÁNGEL GODAY RODRÍGUEZ"],
  TEC_RF:       ["ALBERTO MOLINA HIDALGO","CARLOS CALVO GUTES","DAMIAN VAZQUEZ PARRILLA","DAVID SOLIS RICA","ERNESTO PRIMO BOSCH","HECTOR RODRIGUEZ ESPAÑA","JAVIER RICO GUERRERO","JONATAN GONZÁLEZ RODRÍGUEZ","JOSÉ CARLOS CRUZ GIGANTE","JUAN MIGUEL MARTÍN-CAMACHO SÁNCHEZ","JULIA DOMENECH BONET","MANUEL CRESPO LOPEZ","MARCOS ANDRÉ TEIXEIRA LANDEIROTO","MARTÍ LAGO CASARES","PABLO ANDRÉS COCCIOLO","RAFAEL GALVAÑ GINER","RAÚL MORGADO PULIDO","SANTIAGO LABOREL PICOS","SERGIO NAVARRO CERVANTES","SERVANDO AGUILAR BERMÚDEZ","XAVIER SEGURA RODRÍGUEZ"],
  POLECAM:      ["ADRIÁN ZAPAIA FERNÁNDEZ","ANGEL MOLINA FERRER","ATILANO CANO OLIVER","FRANCISCO TORREBEJANO VALDERAS","IZARNE VILLAVERDE ARRANZ","JAVIER ARANDA GARCÍA"],
  FOQUISTA:     ["ADRIAN SEGUI SEGUI","FEDERICO TAUS QUINTANA","HÉCTOR ACEITUNO COBREROS","IZARNE VILLAVERDE ARRANZ","JAUME VERDÚ FRANCÉS","JESÚS RONQUILLO VIEDMA","LUCIA GONZALEZ MORENO","MAX PONCE PONS","SAMUEL ROBLES ARIZA","SANTIAGO CAPILLA CUENCA","VÍCTOR RODRÍGUEZ SÁNCHEZ"],
  DRONE_PILOTO: ["ANTONIO HARDCASTLE BONED","GONZALO RUIZ GARCÍA","HUGO KUKLA NUÑEZ","IVÁN FUENTES DEL AMO","JAVIER ANTELO SEOANE","JORGE CAPOTILLO CUADRADO","JOSÉ CLEMENTE LÁZARO ALEGRE","JOSÉ REULA SABORIT","JUAN CARLOS LEÓN GARCÍA","JULIO DANIEL BUENO GÓMEZ","MANUEL CAPDEQUI GARCíA","ORIOL TUBAU LOPEZ","RUBEN MARTÍN SANCHEZ"],
  DRONE_TEC:    ["ADRIÁN GALLEGO JIMÉNEZ","AINHOA ARENAS ÁLVAREZ","ALBERTO DÍAZ FRANCO","ALEIX CONDE TOMÁS","ALEJANDRA NOGUEIRA REGÜELA","ALEJANDRO ARJONA RAMIREZ","ALEJANDRO LEÓN SERRANO","ANGEL LÓPEZ PAZOS","ARNALDO SÁEZ PIÑERA","CARLOS ALBERTO MEDORI BRISSIO","DANIEL MÍNGUEZ PERNAS","DAVID ALBERT MUÑIZ","DAVID MARTÍN TOUSET","EDISON JAVIER ESPINOZA ALBÁN","ELENA GÓMEZ DORADO","ESTEBAN TABAR GOMARRA","HÉCTOR SERNA MENA","JESÚS GONZÁLEZ SARRIÁ","JOSE DAVID GAMALLO MOUTEIRA","JOSE LUIS VALERO ALCALÁ","JUAN ANTONIO VIDAL MACLAUCHLAN","JULIA DOMÉNECH BONET","LUCAS FERNÁNDEZ CANOSA","MANUEL IGLESIAS MOSCONI","MARTÍ MORUNO HERNÁNDEZ","MIGUEL DÍAZ ÁLVAREZ","MIGUEL RODELLAR AGUILAR","NOELIA OSORIO FERNÁNDEZ","PIETRO CONTE","RAQUEL PÉREZ HIDALGO","RAÚL GALINDO MARTÍN","RICARDO RAMOS TORTAJADA","SANAA EL JAOUHARY EL KHALLAY","VÍCTOR POLO ANTÓN","ÓSCAR IGLESIAS GARAZO"],
  BODYCAM:      ["DAVID VAZQUEZ LUNA","HECTOR RODRIGUEZ ESPAÑA"],
  MINICAMS:     ["GORKA DAPIA FERNÁNDEZ","MARCOS SANCHEZ MARTI","MOHAMED TAJ BELHORMA"],
};

/* ─── OPERATOR GROUPS — cada grupo sabe a qué cámaras pertenece ── */
const OPERATOR_GROUPS = [
  { id:"skycam",  label:"4SkyCam",         icon:"🚁", cams:["SKYCAM_4"],
    roles:[{key:"skycam_piloto",label:"Piloto",pool:"OP_SKYCAM"},{key:"skycam_operador",label:"Operador",pool:"OP_SKYCAM"},{key:"skycam_auxiliar",label:"Auxiliar",pool:"TEC_SKYCAM"}] },
  { id:"ar",      label:"AR Skycam",        icon:"🔮", cams:["AR_SKYCAM"],
    roles:[{key:"ar_tec1",label:"Técnico AR 1",pool:"TEC_AR"},{key:"ar_tec2",label:"Técnico AR 2",pool:"TEC_AR"}] },
  { id:"steady",  label:"Steadycam",        icon:"🎬", cams:["STEADY_L","STEADY_R","STEADY_PERSO"],
    roles:[{key:"steady_l",label:"Steady L",pool:"STEADYCAM"},{key:"steady_r",label:"Steady R",pool:"STEADYCAM"},{key:"steady_perso",label:"Steady Perso",pool:"STEADYCAM"}] },
  { id:"rf",      label:"RF",               icon:"📡", cams:["RF_L","RF_R","RF_PERSO"],
    roles:[{key:"rf_l",label:"RF L",pool:"TEC_RF"},{key:"rf_r",label:"RF R",pool:"TEC_RF"},{key:"rf_perso",label:"RF Perso",pool:"TEC_RF"}] },
  { id:"polecam", label:"Polecam",          icon:"🎯", cams:["POLECAM_L","POLECAM_R"],
    roles:[{key:"polecam_l",label:"Polecam L",pool:"POLECAM"},{key:"polecam_r",label:"Polecam R",pool:"POLECAM"}] },
  { id:"cinema",  label:"Cine / Foquista",  icon:"🎞", cams:["KIT_CINEMA_L","KIT_CINEMA_R"],
    roles:[{key:"foquista_l",label:"Foquista L",pool:"FOQUISTA"},{key:"foquista_r",label:"Foquista R",pool:"FOQUISTA"}] },
  { id:"drone",   label:"Drone",            icon:"🛸", cams:["DRONE_L","DRONE_R"],
    roles:[{key:"drone_piloto",label:"Piloto",pool:"DRONE_PILOTO"},{key:"drone_tec",label:"Técnico",pool:"DRONE_TEC"}] },
  { id:"bodycam", label:"Bodycam",          icon:"👕", cams:["BODYCAM"],
    roles:[{key:"bodycam",label:"Operador",pool:"BODYCAM"}] },
  { id:"minicams",label:"Minicams",         icon:"🔭", cams:["MINICAM_L","MINICAM_R"],
    roles:[{key:"minicams",label:"Operador",pool:"MINICAMS"}] },
];

const initOperators = () => {
  const o = {};
  OPERATOR_GROUPS.forEach(g=>g.roles.forEach(r=>{o[r.key]="";}));
  return o;
};

/* ─── CAMERA CATALOG ──────────────────────────────────────── */
const CAMERA_CATALOG = {
  CAMARA_HS:    { label:"Cámara HS",    icon:"📷", color:"#f59e0b", items:["CAMARA","REMOTOS ZOOM/FOCO","REMOTO REPLAY","REMOTO CCU","TRIPODE / CABEZA","VIEWFINDER","INTERCOM","CABLEADO / PATCH"] },
  SKYCAM_4:     { label:"4SkyCam",      icon:"🚁", color:"#3b82f6", items:["CAMARA","GIMBAL","TAMBORES","FIBRAS","CONVERSORES","INTERCOM","MONITORES","BATERIAS / CARGADORES","RCP","WALKIES"] },
  AR_SKYCAM:    { label:"AR Skycam",    icon:"🔮", color:"#6366f1", items:["SERVIDOR AR","SISTEMA TRACKING","CALIBRACIÓN","SOFTWARE","MONITORES AR","CABLEADO DATOS","TABLET/CONTROL"] },
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
  DRONE_L:      { label:"Drone L",      icon:"🛸", color:"#64748b", items:["DRONE","BATERIAS","CONTROLADOR","MONITOR FPV","FILTROS","ACCESORIOS","WALKIES","DOCUMENTACIÓN"] },
  DRONE_R:      { label:"Drone R",      icon:"🛸", color:"#64748b", items:["DRONE","BATERIAS","CONTROLADOR","MONITOR FPV","FILTROS","ACCESORIOS","WALKIES","DOCUMENTACIÓN"] },
  BODYCAM:      { label:"Bodycam",      icon:"👕", color:"#14b8a6", items:["MINICAMARA","ELECTRONICAS","SOPORTES","BATERIA","CHALECO","OCP"] },
};

const LOGISTICA_ITEMS = ["VEHICULOS","HORA DE LLEGADA","HOTEL","CABLEADO UM","MATERIAL EXTERNO"];
const TIPOS_SERVICIO = [
  { id:"liga",label:"LaLiga",icon:"⚽" },
  { id:"champions",label:"Champions",icon:"🏆" },
  { id:"copa",label:"Copa del Rey",icon:"🥇" },
  { id:"deportivo",label:"Retransmisión deportiva",icon:"🎽" },
  { id:"programa",label:"Programa / Evento",icon:"🎥" },
];
const STATUS = { OK:"OK", G:"G", L:"L" };
const initItems = (items) => Object.fromEntries(items.map(i=>[i,STATUS.OK]));

/* ─── DESIGN TOKENS ───────────────────────────────────────── */
const t = {
  font:"'Geist',-apple-system,sans-serif", mono:"'Geist Mono','Fira Code',monospace",
  bg:"#ffffff", bgMuted:"#fafafa", bgHover:"#f4f4f5",
  border:"#e4e4e7", borderFocus:"#a1a1aa",
  text:"#09090b", textMuted:"#71717a",
  accent:"#18181b", accentFg:"#fafafa",
  shadow:"0 1px 3px 0 rgba(0,0,0,0.07),0 1px 2px -1px rgba(0,0,0,0.06)",
  radius:"8px", radiusLg:"12px",
};

/* ─── BASE COMPONENTS ─────────────────────────────────────── */
const IB = { width:"100%",boxSizing:"border-box",height:36,padding:"0 12px",background:"#fff",border:"1px solid #e4e4e7",borderRadius:"8px",fontSize:14,fontFamily:"'Geist',-apple-system,sans-serif",color:"#09090b",outline:"none",transition:"border-color 0.15s" };
const Input = ({ style,...p }) => <input {...p} style={{...IB,...style}} onFocus={e=>e.target.style.borderColor="#a1a1aa"} onBlur={e=>e.target.style.borderColor="#e4e4e7"} />;
const Select = ({ style,children,...p }) => <select {...p} style={{...IB,cursor:"pointer",...style}} onFocus={e=>e.target.style.borderColor="#a1a1aa"} onBlur={e=>e.target.style.borderColor="#e4e4e7"}>{children}</select>;
const Textarea = ({ style,...p }) => <textarea {...p} style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",minHeight:72,background:"#fff",border:"1px solid #e4e4e7",borderRadius:"8px",fontSize:13,fontFamily:"'Geist',-apple-system,sans-serif",color:"#09090b",outline:"none",resize:"vertical",lineHeight:1.5,transition:"border-color 0.15s",...style}} onFocus={e=>e.target.style.borderColor="#a1a1aa"} onBlur={e=>e.target.style.borderColor="#e4e4e7"} />;
const Label = ({ children,style }) => <div style={{fontSize:12,fontWeight:500,color:"#09090b",marginBottom:6,fontFamily:"'Geist',-apple-system,sans-serif",...style}}>{children}</div>;
const Card = ({ children,style }) => <div style={{background:"#fff",border:"1px solid #e4e4e7",borderRadius:"12px",padding:20,marginBottom:12,boxShadow:"0 1px 3px 0 rgba(0,0,0,0.07)",...style}}>{children}</div>;
const SecTitle = ({ children }) => <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",color:"#71717a",textTransform:"uppercase",marginBottom:16,fontFamily:"'Geist',-apple-system,sans-serif"}}>{children}</div>;
const BtnP = ({ children,style,...p }) => <button {...p} style={{background:"#18181b",color:"#fafafa",border:"none",borderRadius:"8px",padding:"0 16px",height:36,fontSize:13,fontWeight:500,fontFamily:"'Geist',-apple-system,sans-serif",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,transition:"opacity 0.15s",...style}} onMouseEnter={e=>e.currentTarget.style.opacity="0.85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>;
const BtnO = ({ children,style,...p }) => <button {...p} style={{background:"#fff",color:"#09090b",border:"1px solid #e4e4e7",borderRadius:"8px",padding:"0 16px",height:36,fontSize:13,fontWeight:500,fontFamily:"'Geist',-apple-system,sans-serif",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,...style}} onMouseEnter={e=>e.currentTarget.style.background="#f4f4f5"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>{children}</button>;
const Badge = ({ children,variant="default",style }) => {
  const v={default:{bg:"#f4f4f5",color:"#52525b",border:"#e4e4e7"},grave:{bg:"#fef2f2",color:"#dc2626",border:"#fecaca"},leve:{bg:"#fffbeb",color:"#d97706",border:"#fde68a"},ok:{bg:"#f0fdf4",color:"#16a34a",border:"#bbf7d0"}}[variant]||{bg:"#f4f4f5",color:"#52525b",border:"#e4e4e7"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:9999,fontSize:11,fontWeight:500,fontFamily:"'Geist',-apple-system,sans-serif",background:v.bg,color:v.color,border:`1px solid ${v.border}`,...style}}>{children}</span>;
};
const Field = ({ label,children }) => <div><Label>{label}</Label>{children}</div>;
const Sep = () => <div style={{height:1,background:"#e4e4e7",margin:"16px 0"}} />;

/* ─── STATUS TOGGLE ───────────────────────────────────────── */
function StatusToggle({ value,onChange }) {
  return (
    <div style={{display:"flex",gap:4}}>
      {[{k:"OK",l:"OK",bg:"#f0fdf4",c:"#16a34a",b:"#86efac"},{k:"G",l:"Grave",bg:"#fef2f2",c:"#dc2626",b:"#fca5a5"},{k:"L",l:"Leve",bg:"#fffbeb",c:"#d97706",b:"#fde68a"}].map(o=>(
        <button key={o.k} onClick={()=>onChange(o.k)} style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:500,cursor:"pointer",fontFamily:"'Geist',-apple-system,sans-serif",background:value===o.k?o.bg:"#fafafa",color:value===o.k?o.c:"#71717a",border:`1px solid ${value===o.k?o.b:"#e4e4e7"}`,transition:"all 0.12s"}}>{o.l}</button>
      ))}
    </div>
  );
}

/* ─── STEPS ───────────────────────────────────────────────── */
function Steps({ current,steps }) {
  return (
    <div style={{display:"flex",alignItems:"center"}}>
      {steps.map((s,i)=>{
        const done=current>i+1,active=current===i+1;
        return (
          <div key={i} style={{display:"flex",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,background:done||active?"#18181b":"#f4f4f5",color:done||active?"#fafafa":"#71717a",border:`1px solid ${done||active?"#18181b":"#e4e4e7"}`,transition:"all 0.2s"}}>{done?"✓":i+1}</div>
              <span style={{fontSize:12,fontWeight:active?500:400,color:active?"#09090b":"#71717a"}}>{s}</span>
            </div>
            {i<steps.length-1&&<div style={{width:20,height:1,background:"#e4e4e7",margin:"0 8px"}} />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── CAMERA TOGGLE ───────────────────────────────────────── */
function CameraToggle({ id,cam,selected,onToggle }) {
  return (
    <button onClick={()=>onToggle(id)} style={{background:selected?`${cam.color}08`:"#fff",border:`1px solid ${selected?cam.color:"#e4e4e7"}`,borderRadius:"8px",padding:"12px 8px",cursor:"pointer",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all 0.15s",boxShadow:selected?`0 0 0 1px ${cam.color}`:"none"}}>
      <div style={{fontSize:20}}>{cam.icon}</div>
      <div style={{fontSize:10,fontWeight:500,color:selected?cam.color:"#71717a",lineHeight:1.3}}>{cam.label}</div>
      {selected&&<div style={{width:4,height:4,borderRadius:"50%",background:cam.color}} />}
    </button>
  );
}

/* ─── CAMERA SECTION ──────────────────────────────────────── */
function CameraSection({ camId,cam,data,onChange }) {
  return (
    <Card style={{borderLeft:`3px solid ${cam.color}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:16}}>{cam.icon}</span>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{cam.label}</div></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Label style={{marginBottom:0,whiteSpace:"nowrap"}}>Equipo</Label>
          <Input style={{width:160,height:32}} placeholder="Modelo..." value={data.equipo||""} onChange={e=>onChange(camId,"equipo",e.target.value)} />
        </div>
      </div>
      <div style={{border:"1px solid #e4e4e7",borderRadius:"8px",overflow:"hidden",marginBottom:12}}>
        {cam.items.map((item,idx)=>(
          <div key={item} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 12px",background:idx%2===0?"#fff":"#fafafa",borderBottom:idx<cam.items.length-1?"1px solid #e4e4e7":"none"}}>
            <div style={{flex:1,fontSize:12}}>{item}</div>
            <StatusToggle value={data.items?.[item]||STATUS.OK} onChange={v=>onChange(camId,"item",item,v)} />
          </div>
        ))}
      </div>
      <Label>Incidencias</Label>
      <Textarea placeholder="Sin incidencias..." value={data.incidencias||""} onChange={e=>onChange(camId,"incidencias",e.target.value)} style={{minHeight:52}} />
    </Card>
  );
}

/* ─── DASHBOARD ───────────────────────────────────────────── */
function Dashboard({ onNewReport }) {
  const [informes,setInformes] = useState([]);
  const [stats,setStats] = useState(null);
  const [loading,setLoading] = useState(true);
  const [selected,setSelected] = useState(null);
  const [detail,setDetail] = useState(null);

  useEffect(()=>{
    Promise.all([
      fetch('/api/informes').then(r=>r.json()).catch(()=>[]),
      fetch('/api/stats').then(r=>r.json()).catch(()=>null)
    ]).then(([inf,st])=>{ setInformes(Array.isArray(inf)?inf:[]); setStats(st); setLoading(false); });
  },[]);

  const loadDetail = async (id) => { const r=await fetch(`/api/informes/${id}`); setDetail(await r.json()); setSelected(id); };
  const fmt = (d) => d?new Date(d).toLocaleDateString('es-ES'):'—';

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh"}}><span style={{fontSize:13,color:"#71717a"}}>Cargando...</span></div>;

  return (
    <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 20px 80px"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:600,margin:0,marginBottom:4}}>Dashboard</h1>
          <p style={{fontSize:13,color:"#71717a",margin:0}}>Informes de cámaras especiales · Temporada 25/26</p>
        </div>
        <BtnP onClick={onNewReport}>+ Nuevo informe</BtnP>
      </div>
      {stats&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[{l:"Informes",v:stats.total,s:"esta temporada"},{l:"Jornadas",v:stats.porJornada?.length||0,s:"registradas"},{l:"Graves",v:stats.porJornada?.reduce((a,j)=>a+parseInt(j.graves||0),0)||0,s:"acumuladas",red:true},{l:"Leves",v:stats.porJornada?.reduce((a,j)=>a+parseInt(j.leves||0),0)||0,s:"acumuladas",yel:true}].map(s=>(
            <Card key={s.l} style={{padding:"16px 18px",marginBottom:0}}>
              <div style={{fontSize:24,fontWeight:600,fontFamily:"'Geist Mono',monospace",color:s.red?"#dc2626":s.yel?"#d97706":"#09090b",marginBottom:2}}>{s.v}</div>
              <div style={{fontSize:12,fontWeight:500}}>{s.l}</div>
              <div style={{fontSize:11,color:"#71717a",marginTop:1}}>{s.s}</div>
            </Card>
          ))}
        </div>
      )}
      {informes.length===0?(
        <Card style={{textAlign:"center",padding:"48px 20px"}}>
          <div style={{fontSize:13,color:"#71717a",marginBottom:16}}>No hay informes todavía.</div>
          <BtnP onClick={onNewReport}>Crear primer informe</BtnP>
        </Card>
      ):(
        <div style={{display:"grid",gridTemplateColumns:selected?"1fr 1fr":"1fr",gap:16,alignItems:"start"}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"14px 16px",borderBottom:"1px solid #e4e4e7"}}><SecTitle>Informes · {informes.length} resultados</SecTitle></div>
            {informes.map((inf,i)=>(
              <div key={inf.id} onClick={()=>loadDetail(inf.id)}
                style={{padding:"12px 16px",cursor:"pointer",background:selected===inf.id?"#f4f4f5":"#fff",borderBottom:i<informes.length-1?"1px solid #e4e4e7":"none",transition:"background 0.1s"}}
                onMouseEnter={e=>{if(selected!==inf.id)e.currentTarget.style.background="#fafafa";}}
                onMouseLeave={e=>{if(selected!==inf.id)e.currentTarget.style.background="#fff";}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500}}>{inf.encuentro||"—"}</div>
                    <div style={{fontSize:11,color:"#71717a",marginTop:2}}><span style={{fontFamily:"'Geist Mono',monospace"}}>{inf.jornada}</span> · {fmt(inf.fecha)} · {inf.responsable||"—"}</div>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    {inf.incidencias_graves>0&&<Badge variant="grave">⚠ {inf.incidencias_graves}G</Badge>}
                    {inf.incidencias_leves>0&&<Badge variant="leve">↓ {inf.incidencias_leves}L</Badge>}
                    {inf.incidencias_graves===0&&inf.incidencias_leves===0&&<Badge variant="ok">✓ OK</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </Card>
          {selected&&detail&&(
            <Card style={{position:"sticky",top:80}}>
              <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:600,flex:1}}>{detail.encuentro}</div>
                <button onClick={()=>{setSelected(null);setDetail(null)}} style={{background:"none",border:"none",cursor:"pointer",color:"#71717a",fontSize:16,padding:4}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[["Jornada",detail.jornada],["Fecha",fmt(detail.fecha)],["Hora",detail.hora_partido||"—"],["Responsable",detail.responsable],["UM",detail.um],["J. Técnico",detail.jefe_tecnico]].map(([k,v])=>(
                  <div key={k} style={{padding:"8px 10px",background:"#fafafa",borderRadius:"8px",border:"1px solid #e4e4e7"}}>
                    <div style={{fontSize:10,fontWeight:500,color:"#71717a",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>{k}</div>
                    <div style={{fontSize:12,fontWeight:500}}>{v||"—"}</div>
                  </div>
                ))}
              </div>
              {detail.camaras_activas&&(
                <div style={{marginBottom:10}}>
                  <Label>Cámaras</Label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {Object.entries(detail.camaras_activas).filter(([,v])=>v).map(([id])=>{ const cam=CAMERA_CATALOG[id]; if(!cam) return null; return <Badge key={id} style={{borderColor:`${cam.color}55`,color:cam.color,background:`${cam.color}0d`}}>{cam.icon} {cam.label}</Badge>; })}
                  </div>
                </div>
              )}
              {detail.operators&&Object.values(detail.operators).some(v=>v)&&(
                <div style={{marginBottom:10}}>
                  <Label>Operadores</Label>
                  {OPERATOR_GROUPS.map(g=>g.roles.map(r=>{ const v=detail.operators[r.key]; if(!v) return null; return <div key={r.key} style={{display:"flex",gap:8,fontSize:12,marginBottom:3}}><span style={{color:"#71717a",minWidth:90}}>{r.label}</span><span style={{fontWeight:500}}>{v}</span></div>; }))}
                </div>
              )}
              {detail.cam_data&&(
                <div style={{border:"1px solid #e4e4e7",borderRadius:"8px",overflow:"hidden"}}>
                  {Object.entries(detail.cam_data).map(([id,d],i,arr)=>{ const cam=CAMERA_CATALOG[id]; if(!cam||!d) return null; const items=d.items||{}; const gv=Object.values(items).filter(v=>v==="G").length; const lv=Object.values(items).filter(v=>v==="L").length; return (
                    <div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:i<arr.length-1?"1px solid #e4e4e7":"none",background:i%2===0?"#fff":"#fafafa"}}>
                      <span style={{fontSize:13}}>{cam.icon}</span>
                      <div style={{flex:1,fontSize:12}}>{cam.label}</div>
                      {d.equipo&&<span style={{fontSize:11,color:"#71717a",fontFamily:"'Geist Mono',monospace"}}>{d.equipo}</span>}
                      <div style={{display:"flex",gap:3}}>{gv>0&&<Badge variant="grave">⚠{gv}</Badge>}{lv>0&&<Badge variant="leve">↓{lv}</Badge>}{gv===0&&lv===0&&<Badge variant="ok">✓</Badge>}</div>
                    </div>
                  ); })}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── AUTH HELPERS ────────────────────────────────────────── */
const TOKEN_KEY = 'ccee_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) { clearToken(); window.location.reload(); }
  return res;
}

/* ─── NAMED EXPORTS (shared components / data) ────────────── */
export { Input, Select, Textarea, Label, Card, SecTitle, BtnP, BtnO, Badge, Field, Sep, Steps, StatusToggle, CameraToggle, CameraSection, initItems, STATUS, CAMERA_CATALOG, OPERATOR_GROUPS, PERSONAL, TIPOS_SERVICIO, LIGA_PARTIDOS, LOGISTICA_ITEMS };

/* ─── LOGIN PAGE ──────────────────────────────────────────── */
function LoginPage({ onLogin }) {
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [error,setError] = useState(null);
  const [loading,setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); return; }
      setToken(data.token);
      onLogin(data.user);
    } catch { setError('Error de conexión'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:'#fafafa',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:360,background:'#fff',border:'1px solid #e4e4e7',borderRadius:12,padding:32,boxShadow:'0 1px 3px 0 rgba(0,0,0,0.07)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:44,height:44,borderRadius:10,background:'#18181b',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:12}}>📷</div>
          <div style={{fontSize:16,fontWeight:600}}>MEDIAPRO · CCEE</div>
          <div style={{fontSize:12,color:'#71717a',marginTop:3}}>Cámaras Especiales</div>
        </div>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
          <Field label="Email">
            <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" required autoFocus />
          </Field>
          <Field label="Contraseña">
            <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </Field>
          {error&&<div style={{fontSize:12,color:'#dc2626',background:'#fef2f2',padding:'8px 12px',borderRadius:6,border:'1px solid #fecaca'}}>{error}</div>}
          <BtnP type="submit" style={{width:'100%',justifyContent:'center',marginTop:4}} disabled={loading}>
            {loading?'Iniciando sesión...':'Iniciar sesión'}
          </BtnP>
        </form>
      </div>
    </div>
  );
}

/* ─── ROOT APP ────────────────────────────────────────────── */
export default function App() {
  const [user,setUser] = useState(null);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    const token = getToken();
    if (!token) { setLoading(false); return; }
    apiFetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u) setUser(u); })
      .finally(() => setLoading(false));
  },[]);

  const handleLogout = () => { clearToken(); setUser(null); };

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#71717a'}}>
      Cargando...
    </div>
  );

  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#71717a'}}>Cargando...</div>}>
      {user.role === 'coordinador'
        ? <CoordView user={user} onLogout={handleLogout} />
        : <UsuarioView user={user} onLogout={handleLogout} />
      }
    </Suspense>
  );
}
