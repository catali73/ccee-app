import { useState, useCallback, useEffect, lazy, Suspense } from "react";
const CoordView    = lazy(() => import('./CoordView.jsx'));
const UsuarioView  = lazy(() => import('./UsuarioView.jsx'));
const OperadorView = lazy(() => import('./OperadorView.jsx'));

// Fuente Montserrat — equivalente web de Gotham (libro de estilo GRUP MEDIAPRO)
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap";
document.head.appendChild(fontLink);
// Aplicar fuente y background global
const bodyStyle = document.createElement("style");
bodyStyle.textContent = "body{font-family:'Montserrat',-apple-system,sans-serif;background:#F5F0EC;margin:0}";
document.head.appendChild(bodyStyle);

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
  TEC_PTZ:      [], // Añadir operadores PTZ
  OP_UHS:       [], // Añadir operadores Cámara UHS
  PERSONAL_OBVAN_JEFE: [
    "CELEDONIO GARCIA RAUSELL","DANIEL MURILLO PERALES","DAVID SÁNCHEZ JARQUE",
    "ISMAEL BARROSO FERNÁNDEZ","JOAQUIN QUINTO ANTON","JUAN MARÍN GÓMEZ","PASCUAL LOPEZ MONTOYA",
  ],
  PERSONAL_OBVAN_RESP: [
    "GORKA DAPIA FERNÁNDEZ","MOHAMED TAJ BELHORMA",
  ],
  PERSONAL_OBVAN_AUX: [
    "AARON PORCAR OLMO","AROA FERRER MARÍN","CARLOS NUÑEZ DIAZ","CRESEN ANGULO LÓPEZ",
    "DANIEL GONZALEZ DORADO","DANIEL PABLOS DURBAY","DANIELE ADDEI","DAVID JIMÉNEZ SÁNCHEZ",
    "ELIA MURILLO VAÑÓ","FABRIZIO OLSO GONZALEZ","GERARD CASALS PÉREZ","HÉCTOR BELLES BELTRÁN",
    "ISMAEL SANTAMARIA FERNANDEZ","JAIME MARTINEZ ATIENZA","JOHN NTUI MARTIN",
    "JOSÉ CARLOS PÉREZ GAGO","JOSÉ CARLOS PÉREZ PÉREZ","JOSÉ SANTIAGO GONZÁLEZ MARTÍNEZ",
    "JUAN JOSÉ RODRÍGUEZ PALOMEQUE","KESTON JASON PHILLIPS MENEZO","LUIS RAMÓN FERREIRO VARELA",
    "MARIO DEL REINO MUÑOZ","MIRANDA MARTÍNEZ FRANCOS","NAROA SEVILLANO SÁEZ",
    "NIL FUENTES MERIN","NOE NOUH BERBEL EL FELK","ROBERTO ARANDA GARCÍA",
    "SANTIAGO GARCÍA CUTILLAS","SANTIAGO MAYOL RUIZ","SERGIO ORTOLA GONZÁLEZ","SERGIO TORRES SANTIAGO",
  ],
};

/* ─── OPERATOR GROUPS — cada grupo sabe a qué cámaras pertenece ── */
// cam: cámara específica del rol → el rol solo aparece si esa cámara está activa
// Sin cam: rol aparece si cualquier cámara del grupo está activa
const OPERATOR_GROUPS = [
  { id:"obvan",   label:"OBVAN CCEE",       icon:"🚐", cams:["OBVAN_CCEE"],
    roles:[
      {key:"obvan_jefe_tec",      label:"Jefe Técnico OBVAN",  pool:"PERSONAL_OBVAN_JEFE"},
      {key:"obvan_resp_montaje",  label:"Responsable Montaje", pool:"PERSONAL_OBVAN_RESP"},
      {key:"obvan_aux1",          label:"Auxiliar 1",          pool:"PERSONAL_OBVAN_AUX"},
      {key:"obvan_aux2",          label:"Auxiliar 2",          pool:"PERSONAL_OBVAN_AUX"},
    ]},
  { id:"skycam",  label:"4SkyCam",         icon:"🚁", cams:["SKYCAM_4"],
    roles:[{key:"skycam_piloto",label:"Piloto",pool:"OP_SKYCAM"},{key:"skycam_operador",label:"Operador",pool:"OP_SKYCAM"},{key:"skycam_auxiliar",label:"Auxiliar",pool:"TEC_SKYCAM"}] },
  { id:"ar",      label:"AR Skycam",        icon:"🔮", cams:["AR_SKYCAM"],
    roles:[{key:"ar_tec1",label:"Técnico AR 1",pool:"TEC_AR"},{key:"ar_tec2",label:"Técnico AR 2",pool:"TEC_AR"}] },
  { id:"steady",  label:"Steadycam",        icon:"🎬", cams:["STEADY_L","STEADY_R","STEADY_PERSO"],
    roles:[
      {key:"steady_l",    label:"Steady L",     pool:"STEADYCAM", cam:"STEADY_L"},
      {key:"steady_r",    label:"Steady R",     pool:"STEADYCAM", cam:"STEADY_R"},
      {key:"steady_perso",label:"Steady Perso", pool:"STEADYCAM", cam:"STEADY_PERSO"},
    ]},
  { id:"rf",      label:"RF",               icon:"📡", cams:["RF_L","RF_R","RF_PERSO"],
    roles:[
      {key:"rf_l",    label:"RF L",     pool:"TEC_RF", cam:"RF_L"},
      {key:"rf_r",    label:"RF R",     pool:"TEC_RF", cam:"RF_R"},
      {key:"rf_perso",label:"RF Perso", pool:"TEC_RF", cam:"RF_PERSO"},
    ]},
  { id:"polecam", label:"Polecam",          icon:"🎯", cams:["POLECAM_L","POLECAM_R"],
    roles:[
      {key:"polecam_l",label:"Polecam L",pool:"POLECAM", cam:"POLECAM_L"},
      {key:"polecam_r",label:"Polecam R",pool:"POLECAM", cam:"POLECAM_R"},
    ]},
  { id:"cinema",  label:"Cine / Foquista",  icon:"🎞", cams:["KIT_CINEMA_L","KIT_CINEMA_R"],
    roles:[
      {key:"foquista_l",label:"Foquista L",pool:"FOQUISTA", cam:"KIT_CINEMA_L"},
      {key:"foquista_r",label:"Foquista R",pool:"FOQUISTA", cam:"KIT_CINEMA_R"},
    ]},
  { id:"drone",   label:"Drone",            icon:"🛸", cams:["DRONE"],
    roles:[{key:"drone_piloto",label:"Piloto",pool:"DRONE_PILOTO"},{key:"drone_tec",label:"Técnico",pool:"DRONE_TEC"}] },
  { id:"bodycam", label:"Bodycam",          icon:"👕", cams:["BODYCAM"],
    roles:[{key:"bodycam",label:"Operador",pool:"BODYCAM"}] },
  { id:"minicams",label:"Minicams",         icon:"🔭", cams:["MINICAM_L","MINICAM_R"],
    roles:[{key:"minicams",label:"Operador",pool:"MINICAMS"}] },
  { id:"ptz",     label:"PTZ",              icon:"📹", cams:["PTZ_1","PTZ_2"],
    roles:[
      {key:"ptz1_op",label:"PTZ 1 Operador",pool:"TEC_PTZ", cam:"PTZ_1"},
      {key:"ptz2_op",label:"PTZ 2 Operador",pool:"TEC_PTZ", cam:"PTZ_2"},
    ]},
  { id:"uhs",     label:"Cámara UHS",       icon:"📷", cams:["CAMARA_UHS"],
    roles:[{key:"uhs_op",label:"Operador",pool:"OP_UHS"}] },
];

const initOperators = () => {
  const o = {};
  OPERATOR_GROUPS.forEach(g=>g.roles.forEach(r=>{o[r.key]="";}));
  return o;
};

/* ─── EQUIPMENT MODEL LISTS (desde listado oficial) ───────── */
const M = {
  OBVAN:      ["CE10","CE11","70","RACK A","RACK B"],
  SKYCAM:     ["A 4K AR","B 1080P","C 1080P","D 1080P","E 1080P","F 4K AR","G 4K AR","H 4K AR"],
  UHS_CAM:    ["No3 FOR-A HS","No4 FOR-A HS","No5 FOR-A HS","No6 FOR-A HS","No7 FOR-A HS"],
  UHS_OPT:    ["No3 FUJI 107x","No4 FUJI 107x","No5 FUJI 107x","No6 FUJI 107x","No7 FUJI 107x"],
  STEADY:     ["ARRI","SHADOW","ULTRA","SSM1","SSM2","SSM3","PRO","M1","MASTER"],
  RF:         ["RF2 3GHZ 12G - 4K DIV.8","RF3 3GHZ 12G - 4K DIV.8","RF4 3GHZ 12G DIV.8","RF5 7GHZ 12G DIV.8","RF6 7GHZ 12G DIV.8","RF8","RF9","RF10","RF11","RF12","RF7-RF13","RF14","RF15 2GHZ","RF16","RF17 SVP","RF18 SVP","RF 19","RF 20 3GHZ/7GHZ 12G","RF 21 3GHZ/7GHZ 12G","RF 22 3GHZ/7GHZ - 12G 4K","RF 23","RF 24","RF 25 1GHZ/7GHZ - 12G 4K","RF 26 OVERON 1G DRON DIV.2","RF 27 OVERON RX4 1G DIV.2","RF 28 OVERON RX8 1G DIV.2","RF1 OVERON","RF2 OVERON","RF3 OVERON"],
  CINEMA:     ["A KIT FOCO + RED","B KIT FOCO + RED","C KIT FOCO + RED","D KIT FOCO + RED","E KIT FOCO","F KIT FOCO"],
  POLECAM:    ["No1","No2 MADRID","No3 BARCELONA","No4","No5","No6 CE 10","No7","No8 CE 11","No15"],
  POL_GIM:    ["No1","No2","No3","No4","No5","No6","No7 MAD","No8 CE 11","No9 CE 10","No10 BAR","No11"],
  POL_MINI:   ["No1 ANTELOPE","No2 ANTELOPE","No3 ANTELOPE","No4 ANTELOPE","No5 ANTELOPE","No6 ANTELOPE","No7 ANTELOPE","No8 ANTELOPE"],
  MINICAM:    ["SIN CAM MINI 1,5G ROJA","12 NVP MINI 3G VERDE","13 NVP MINI 3G VERDE","14 NVP MINI 3G VERDE","No46 NVP MINI 3G GRIS","No47 NVP MINI 3G GRIS","No3 23.1 MINI 3G AZUL","No4 23.2 MINI 3G AZUL","No5 33.11 BAR MINI 3G GRIS","No6 33.12 MINI 3G GRIS","No7 33.46 MINI 3G GRIS","No8 33.48 MINI 3G GRIS","No44 44.44 MINI 3G GRIS","No45 44.45 MINI 3G GRIS","MINI 3G CE 10 33.3","MINI 3G CE 10 33.4","MINI 3G CE 10 33.5","MINI 3G CE 11 33.2","MINI 3G CE 11 33.6","MINI 3G CE 11 33.8","No 46.36 VX5 MINI 3G VERDE","No 46.38 VX5 MINI 3G VERDE","No 45.5 MINI 3G GRIS","No 45.7 MINI 3G GRIS","48.23 MINI 12G NEGRO","48.27 MINI 12G NEGRO","48.28 MINI 12G NEGRO","48.29 MINI 12G NEGRO","48.30 MINI 12G NEGRO","48.31 MINI 12G NEGRO","48.32 MINI 12G NEGRO"],
  MINI_RCP:   ["No 1 RCP MINI 002 7085","No 2 RCP MINI 002 7010","No 3 BAR RCP MINI 002","No 4 RCP MINI 002","No 5 RCP MINI 002 7022","No 6 RCP MINI 002 7073","CE 10 RCP MINI 002","CE 11 RCP MINI 002","No 7 RCP MINI 003 7130","No 8 RCP MINI 003 7154i","No 9 RCP MINI 003 7165i","No10 RCP MINI 003 7167i","RCP MINI"],
  BODYCAM:    ["BODYCAM N1","BODYCAM N2"],
  PTZ:        ["N1 PTZ AW 150+CONTROL","N2 PTZ AW 150+CONTROL","N3 PTZ AW 150","N4 PTZ AW 150","N5 PTZ AW 150","No1 QBALL","No2 QBALL"],
  PTZ_CTL:    ["N3 CONTROL PTZ","N4 CONTROL PTZ","QBALL CONTROL"],
};

/* ─── CAMERA CATALOG ──────────────────────────────────────── */
// equipos: slots de equipo con desplegable de modelo (unicidad enforced en UI)
// noPersonal: true → vehículo/sistema sin operador asignado
const CAMERA_CATALOG = {
  OBVAN_CCEE:   { label:"OBVAN CCEE",   icon:"🚐", color:"#374151", noPersonal:true,
                  equipos:[{key:"obvan",label:"OBVAN",models:M.OBVAN,modelsKey:"OBVAN"}],
                  items:["GENERADOR/ALIMENTACIÓN","INTERCOM","MONITORES","GRABACIÓN","CONECTIVIDAD","CABLEADO","OCP","PATCH","TVC"] },
  CAMARA_UHS:   { label:"Cámara UHS",   icon:"📷", color:"#f59e0b",
                  equipos:[{key:"uhs_cam",label:"Cámara",models:M.UHS_CAM,modelsKey:"UHS_CAM"},{key:"uhs_optica",label:"Óptica",models:M.UHS_OPT,modelsKey:"UHS_OPT"}],
                  items:["CAMARA","REMOTOS ZOOM/FOCO","REMOTO REPLAY","REMOTO CCU","TRIPODE / CABEZA","VIEWFINDER","INTERCOM","CABLEADO / PATCH"] },
  SKYCAM_4:     { label:"4SkyCam",      icon:"🚁", color:"#3b82f6",
                  equipos:[{key:"skycam",label:"4SkyCam",models:M.SKYCAM,modelsKey:"SKYCAM"}],
                  items:["CAMARA","GIMBAL","TAMBORES","FIBRAS","CONVERSORES","INTERCOM","MONITORES","BATERIAS / CARGADORES","RCP","WALKIES","OCP"] },
  AR_SKYCAM:    { label:"AR Skycam",    icon:"🔮", color:"#6366f1",
                  equipos:[],
                  items:["CALIBRACIÓN","MONITORES AR","CABLEADO DATOS","AR UNITY","LINK BOX","GENLOCK"] },
  STEADY_L:     { label:"Steady L",     icon:"🎬", color:"#10b981",
                  equipos:[{key:"steady",label:"Steady",models:M.STEADY,modelsKey:"STEADY"}],
                  items:["MONITOR","SLEED","CABLES","CONTROL ZOOM","BATERIAS","ALIMENTACIÓN","DOCKING BRACKET"] },
  STEADY_R:     { label:"Steady R",     icon:"🎬", color:"#10b981",
                  equipos:[{key:"steady",label:"Steady",models:M.STEADY,modelsKey:"STEADY"}],
                  items:["MONITOR","SLEED","CABLES","CONTROL ZOOM","BATERIAS","ALIMENTACIÓN","DOCKING BRACKET"] },
  STEADY_PERSO: { label:"Steady Perso", icon:"🎬", color:"#10b981",
                  equipos:[{key:"steady",label:"Steady",models:M.STEADY,modelsKey:"STEADY"}],
                  items:["MONITOR","SLEED","CABLES","CONTROL ZOOM","BATERIAS","ALIMENTACIÓN","DOCKING BRACKET"] },
  RF_L:         { label:"RF L",         icon:"📡", color:"#8b5cf6",
                  equipos:[{key:"rf",label:"RF",models:M.RF,modelsKey:"RF"}],
                  items:["TX/RX RF","CONTROL DE DATOS","CABLEADO","BATERIAS","CAMARA","WALKIES","LINK BOX"],
                  campos:["FRECUENCIA","DIVERSIDAD","MODULACION","POTENCIA","FRECUENCIA DATOS"] },
  RF_R:         { label:"RF R",         icon:"📡", color:"#8b5cf6",
                  equipos:[{key:"rf",label:"RF",models:M.RF,modelsKey:"RF"}],
                  items:["TX/RX RF","CONTROL DE DATOS","CABLEADO","BATERIAS","CAMARA","WALKIES","LINK BOX"],
                  campos:["FRECUENCIA","DIVERSIDAD","MODULACION","POTENCIA","FRECUENCIA DATOS"] },
  RF_PERSO:     { label:"RF Perso",     icon:"📡", color:"#8b5cf6",
                  equipos:[{key:"rf",label:"RF",models:M.RF,modelsKey:"RF"}],
                  items:["TX/RX RF","CONTROL DE DATOS","CABLEADO","BATERIAS","CAMARA","WALKIES","LINK BOX"],
                  campos:["FRECUENCIA","DIVERSIDAD","MODULACION","POTENCIA","FRECUENCIA DATOS"] },
  POLECAM_L:    { label:"Polecam L",    icon:"🎯", color:"#ef4444",
                  equipos:[{key:"polecam",label:"Polecam",models:M.POLECAM,modelsKey:"POLECAM"},{key:"gimbal",label:"Gimbal",models:M.POL_GIM,modelsKey:"POL_GIM"},{key:"minigimbal",label:"Mini Gimbal",models:M.POL_MINI,modelsKey:"POL_MINI"}],
                  items:["CAMARA","GIMBAL","MONITORES","ESTRUCTURA","TRIPODE","REMOTOS","ELECTRONICAS"] },
  POLECAM_R:    { label:"Polecam R",    icon:"🎯", color:"#ef4444",
                  equipos:[{key:"polecam",label:"Polecam",models:M.POLECAM,modelsKey:"POLECAM"},{key:"gimbal",label:"Gimbal",models:M.POL_GIM,modelsKey:"POL_GIM"},{key:"minigimbal",label:"Mini Gimbal",models:M.POL_MINI,modelsKey:"POL_MINI"}],
                  items:["CAMARA","GIMBAL","MONITORES","ESTRUCTURA","TRIPODE","REMOTOS","ELECTRONICAS"] },
  MINICAM_L:    { label:"Minicám. L",   icon:"🔭", color:"#f97316",
                  equipos:[{key:"mini",label:"Mini",models:M.MINICAM,modelsKey:"MINICAM"},{key:"rcp",label:"RCP",models:M.MINI_RCP,modelsKey:"MINI_RCP"}],
                  items:["MINICAMARA","ELECTRONICAS","SOPORTES","FUNDAS","OCP"] },
  MINICAM_R:    { label:"Minicám. R",   icon:"🔭", color:"#f97316",
                  equipos:[{key:"mini",label:"Mini",models:M.MINICAM,modelsKey:"MINICAM"},{key:"rcp",label:"RCP",models:M.MINI_RCP,modelsKey:"MINI_RCP"}],
                  items:["MINICAMARA","ELECTRONICAS","SOPORTES","FUNDAS","OCP"] },
  KIT_CINEMA_L: { label:"Cinema L",     icon:"🎞", color:"#ec4899",
                  equipos:[{key:"cinema",label:"Cinema",models:M.CINEMA,modelsKey:"CINEMA"}],
                  items:["CAMARA","VAXIS","CINEFADE","MICROFONO","MOTORES","MANDO FOCO/IRIS/FILTRO","REMOTO OCP"] },
  KIT_CINEMA_R: { label:"Cinema R",     icon:"🎞", color:"#ec4899",
                  equipos:[{key:"cinema",label:"Cinema",models:M.CINEMA,modelsKey:"CINEMA"}],
                  items:["CAMARA","VAXIS","CINEFADE","MICROFONO","MOTORES","MANDO FOCO/IRIS/FILTRO","REMOTO OCP"] },
  DRONE:        { label:"Drone",        icon:"🛸", color:"#64748b",
                  equipos:[{key:"drone",label:"Drone",models:[]}],
                  items:["COMUNICACIÓN","VIDEO","CORRECCION COLOR"] },
  BODYCAM:      { label:"Bodycam",      icon:"👕", color:"#14b8a6",
                  equipos:[{key:"bodycam",label:"Bodycam",models:M.BODYCAM,modelsKey:"BODYCAM"}],
                  items:["MINICAMARA","ELECTRONICAS","SOPORTES","BATERIA","CHALECO","OCP"] },
  PTZ_1:        { label:"PTZ 1",        icon:"📹", color:"#06b6d4",
                  equipos:[{key:"ptz",label:"PTZ",models:M.PTZ,modelsKey:"PTZ"},{key:"control",label:"Control",models:M.PTZ_CTL,modelsKey:"PTZ_CTL"}],
                  items:["PTZ","CONTROL","CABLEADO","ALIMENTACIÓN","SOPORTE","OCP"] },
  PTZ_2:        { label:"PTZ 2",        icon:"📹", color:"#0891b2",
                  equipos:[{key:"ptz",label:"PTZ",models:M.PTZ,modelsKey:"PTZ"},{key:"control",label:"Control",models:M.PTZ_CTL,modelsKey:"PTZ_CTL"}],
                  items:["PTZ","CONTROL","CABLEADO","ALIMENTACIÓN","SOPORTE","OCP"] },
  OTROS:        { label:"Otros equipos",icon:"🔧", color:"#C2B9AD",
                  equipos:[],
                  items:["EQUIPO","CABLEADO","ALIMENTACIÓN","INTERCOM"] },
};

const LOGISTICA_ITEMS = ["VEHICULOS","HORA DE LLEGADA","HOTEL","CABLEADO UM","MATERIAL EXTERNO","ACCESOS"];
const TIPOS_SERVICIO = [
  { id:"liga",label:"LaLiga",icon:"⚽" },
  { id:"champions",label:"Champions",icon:"🏆" },
  { id:"copa",label:"Copa del Rey",icon:"🥇" },
  { id:"deportivo",label:"Retransmisión deportiva",icon:"🎽" },
  { id:"programa",label:"Programa / Evento",icon:"🎥" },
];
const STATUS = { OK:"OK", G:"G", L:"L" };
const initItems = (items) => Object.fromEntries(items.map(i=>[i,STATUS.OK]));

/* ─── DESIGN TOKENS — GRUP MEDIAPRO ───────────────────────── */
// Paleta: Naranja Pantone 179 C · Negro Process Black · Gris Warm Gray 3 C
const t = {
  font:"'Montserrat',-apple-system,sans-serif", mono:"'Courier New',monospace",
  bg:"#ffffff", bgMuted:"#F5F0EC", bgHover:"#EDE8E4",
  border:"#DDD5CE", borderFocus:"#E8392C",
  text:"#1A1A1A", textMuted:"#7A7168",
  accent:"#E8392C", accentFg:"#ffffff",    // naranja Pantone 179 C
  black:"#1A1A1A",                          // negro Process Black
  gray3:"#C2B9AD",                          // gris Warm Gray 3 C
  shadow:"0 1px 3px 0 rgba(0,0,0,0.08),0 1px 2px -1px rgba(0,0,0,0.05)",
  radius:"8px", radiusLg:"12px",
};

/* ─── BASE COMPONENTS — estilo GRUP MEDIAPRO ──────────────── */
const IB = { width:"100%",boxSizing:"border-box",height:36,padding:"0 12px",background:"#fff",border:"1px solid #DDD5CE",borderRadius:"8px",fontSize:14,fontFamily:"'Montserrat',-apple-system,sans-serif",color:"#1A1A1A",outline:"none",transition:"border-color 0.15s" };
const Input = ({ style,...p }) => <input {...p} style={{...IB,...style}} onFocus={e=>e.target.style.borderColor="#E8392C"} onBlur={e=>e.target.style.borderColor="#DDD5CE"} />;
const Select = ({ style,children,...p }) => <select {...p} style={{...IB,cursor:"pointer",...style}} onFocus={e=>e.target.style.borderColor="#E8392C"} onBlur={e=>e.target.style.borderColor="#DDD5CE"}>{children}</select>;
const Textarea = ({ style,...p }) => <textarea {...p} style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",minHeight:72,background:"#fff",border:"1px solid #DDD5CE",borderRadius:"8px",fontSize:13,fontFamily:"'Montserrat',-apple-system,sans-serif",color:"#1A1A1A",outline:"none",resize:"vertical",lineHeight:1.5,transition:"border-color 0.15s",...style}} onFocus={e=>e.target.style.borderColor="#E8392C"} onBlur={e=>e.target.style.borderColor="#DDD5CE"} />;
const Label = ({ children,style }) => <div style={{fontSize:12,fontWeight:600,color:"#1A1A1A",marginBottom:6,fontFamily:"'Montserrat',-apple-system,sans-serif",...style}}>{children}</div>;
const Card = ({ children,style }) => <div style={{background:"#fff",border:"1px solid #DDD5CE",borderRadius:"12px",padding:20,marginBottom:12,boxShadow:"0 1px 3px 0 rgba(0,0,0,0.07)",...style}}>{children}</div>;
const SecTitle = ({ children,style }) => <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:"#7A7168",textTransform:"uppercase",marginBottom:16,fontFamily:"'Montserrat',-apple-system,sans-serif",...style}}>{children}</div>;
const BtnP = ({ children,style,...p }) => <button {...p} style={{background:"#E8392C",color:"#fff",border:"none",borderRadius:"8px",padding:"0 16px",height:36,fontSize:13,fontWeight:600,fontFamily:"'Montserrat',-apple-system,sans-serif",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,transition:"opacity 0.15s",...style}} onMouseEnter={e=>e.currentTarget.style.opacity="0.88"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>;
const BtnO = ({ children,style,...p }) => <button {...p} style={{background:"#fff",color:"#1A1A1A",border:"1px solid #DDD5CE",borderRadius:"8px",padding:"0 16px",height:36,fontSize:13,fontWeight:500,fontFamily:"'Montserrat',-apple-system,sans-serif",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,...style}} onMouseEnter={e=>e.currentTarget.style.background="#F5F0EC"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>{children}</button>;
const Badge = ({ children,variant="default",style }) => {
  const v={default:{bg:"#F0EBE7",color:"#5C534D",border:"#DDD5CE"},grave:{bg:"#fef2f2",color:"#dc2626",border:"#fecaca"},leve:{bg:"#fff7ed",color:"#c2590a",border:"#fed7aa"},ok:{bg:"#f0fdf4",color:"#16a34a",border:"#bbf7d0"}}[variant]||{bg:"#F0EBE7",color:"#5C534D",border:"#DDD5CE"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:9999,fontSize:11,fontWeight:600,fontFamily:"'Montserrat',-apple-system,sans-serif",background:v.bg,color:v.color,border:`1px solid ${v.border}`,...style}}>{children}</span>;
};
const Field = ({ label,children }) => <div><Label>{label}</Label>{children}</div>;
const Sep = () => <div style={{height:1,background:"#DDD5CE",margin:"16px 0"}} />;

/* ─── LOGO MEDIAPRO — tres pastillas rotadas ~-32° ──────────── */
// Medidas calibradas sobre el PNG oficial 01_GRUP MEDIAPRO.png (1060×1060):
// · Tres stadium shapes (rect rx=pH/2) rotadas ≈ -32° alrededor de su centro
// · Intersecciones TRANSPARENTES (el fondo se ve a través) → funciona sobre
//   cualquier color de fondo (header oscuro o blanco)
// · Técnica: SVG mask que "perfora" las zonas de solapamiento
export function MediaproLogo({ height = 32 }) {
  // Dimensiones del canvas normalizado a partir del PNG oficial
  const W = 220, H = 100;
  const pW = 85, pH = 54, rx = 27;   // pastilla: ancho, alto, radio bordes
  const rot = -32;                     // grados de inclinación
  const cy = 50;                       // centro vertical compartido
  const cx = [52, 110, 168];           // centros X de cada pastilla (espaciado 58px)

  // Genera las props de cada <rect> (centrado + girado alrededor de su centro)
  const rp = (i) => ({
    x: cx[i] - pW / 2,
    y: cy - pH / 2,
    width: pW,
    height: pH,
    rx,
    transform: `rotate(${rot} ${cx[i]} ${cy})`,
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} height={height} width={Math.round(W * height / H)}
      style={{ display: 'block', flexShrink: 0 }} aria-label="Mediapro">
      <defs>
        {/* clipPaths = forma de cada pastilla (usados dentro del mask) */}
        <clipPath id="mp-cp1"><rect {...rp(0)} /></clipPath>
        <clipPath id="mp-cp2"><rect {...rp(1)} /></clipPath>
        {/* Mask: blanco = mostrar, negro = ocultar (→ transparente) */}
        <mask id="mp-mask">
          <rect width={W} height={H} fill="white" />
          {/* Perforar la intersección pastilla-1 ∩ pastilla-2 */}
          <rect {...rp(1)} fill="black" clipPath="url(#mp-cp1)" />
          {/* Perforar la intersección pastilla-2 ∩ pastilla-3 */}
          <rect {...rp(2)} fill="black" clipPath="url(#mp-cp2)" />
        </mask>
      </defs>
      {/* Tres pastillas rojas con intersecciones transparentes */}
      <g mask="url(#mp-mask)">
        <rect {...rp(0)} fill="#E8392C" />
        <rect {...rp(1)} fill="#E8392C" />
        <rect {...rp(2)} fill="#E8392C" />
      </g>
    </svg>
  );
}

/* ─── STATUS TOGGLE ───────────────────────────────────────── */
function StatusToggle({ value,onChange }) {
  return (
    <div style={{display:"flex",gap:4}}>
      {[{k:"OK",l:"OK",bg:"#f0fdf4",c:"#16a34a",b:"#86efac"},{k:"G",l:"Grave",bg:"#fef2f2",c:"#dc2626",b:"#fca5a5"},{k:"L",l:"Leve",bg:"#fffbeb",c:"#d97706",b:"#fde68a"}].map(o=>(
        <button key={o.k} onClick={()=>onChange(o.k)} style={{padding:"3px 10px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Montserrat',-apple-system,sans-serif",background:value===o.k?o.bg:"#F5F0EC",color:value===o.k?o.c:"#7A7168",border:`1px solid ${value===o.k?o.b:"#DDD5CE"}`,transition:"all 0.12s"}}>{o.l}</button>
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
              <div style={{width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,background:done||active?"#E8392C":"#F5F0EC",color:done||active?"#fff":"#7A7168",border:`1px solid ${done||active?"#E8392C":"#DDD5CE"}`,transition:"all 0.2s"}}>{done?"✓":i+1}</div>
              <span style={{fontSize:12,fontWeight:active?600:400,color:active?"#1A1A1A":"#7A7168",fontFamily:"'Montserrat',-apple-system,sans-serif"}}>{s}</span>
            </div>
            {i<steps.length-1&&<div style={{width:20,height:1,background:"#DDD5CE",margin:"0 8px"}} />}
          </div>
        );
      })}
    </div>
  );
}

/* ─── CAMERA TOGGLE ───────────────────────────────────────── */
function CameraToggle({ id,cam,selected,onToggle }) {
  return (
    <button onClick={()=>onToggle(id)} style={{background:selected?`${cam.color}08`:"#fff",border:`1px solid ${selected?cam.color:"#DDD5CE"}`,borderRadius:"8px",padding:"12px 8px",cursor:"pointer",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all 0.15s",boxShadow:selected?`0 0 0 1px ${cam.color}`:"none"}}>
      <div style={{fontSize:20}}>{cam.icon}</div>
      <div style={{fontSize:10,fontWeight:500,color:selected?cam.color:"#7A7168",lineHeight:1.3}}>{cam.label}</div>
      {selected&&<div style={{width:4,height:4,borderRadius:"50%",background:cam.color}} />}
    </button>
  );
}

/* ─── CAMERA SECTION ──────────────────────────────────────── */
function CameraSection({ camId,cam,data,onChange,usedModels,readOnly }) {
  const equipos = cam.equipos||[];
  const hasEquipos = equipos.length>0;
  return (
    <Card style={{borderLeft:`3px solid ${cam.color}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:hasEquipos?8:14,flexWrap:"wrap"}}>
        <span style={{fontSize:16}}>{cam.icon}</span>
        <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{cam.label}</div></div>
        {/* Modo read-only: mostrar modelos como badges en el header */}
        {readOnly&&hasEquipos&&equipos.map(slot=>{
          const val=data.equipos?.[slot.key];
          return val?<Badge key={slot.key} style={{fontSize:10,fontFamily:"'Courier New',monospace"}}>{slot.label}: {val}</Badge>:null;
        })}
      </div>
      {/* Selects de modelo SOLO en modo edición (coordinador) */}
      {!readOnly&&hasEquipos&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
          {equipos.map(slot=>{
            const selVal = data.equipos?.[slot.key]||"";
            const opts = slot.models.filter(m=>m===selVal||!usedModels?.has(m));
            return (
              <div key={slot.key} style={{display:"flex",alignItems:"center",gap:6,flex:"1 1 180px"}}>
                <Label style={{marginBottom:0,whiteSpace:"nowrap",minWidth:50,fontSize:11}}>{slot.label}</Label>
                <Select style={{height:32,fontSize:12}} value={selVal} onChange={e=>onChange(camId,"equipos",slot.key,e.target.value)}>
                  <option value="">— Sin asignar —</option>
                  {opts.map(m=><option key={m} value={m}>{m}</option>)}
                </Select>
              </div>
            );
          })}
        </div>
      )}
      <div style={{border:"1px solid #DDD5CE",borderRadius:"8px",overflow:"hidden",marginBottom:12}}>
        {cam.items.map((item,idx)=>(
          <div key={item} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 12px",background:idx%2===0?"#fff":"#F5F0EC",borderBottom:idx<cam.items.length-1?"1px solid #DDD5CE":"none"}}>
            <div style={{flex:1,fontSize:12}}>{item}</div>
            <StatusToggle value={data.items?.[item]||STATUS.OK} onChange={v=>onChange(camId,"item",item,v)} />
          </div>
        ))}
      </div>
      {cam.campos&&cam.campos.length>0&&(
        <div style={{marginBottom:12}}>
          <Label style={{marginBottom:6}}>Parámetros técnicos</Label>
          <div style={{border:"1px solid #DDD5CE",borderRadius:"8px",overflow:"hidden"}}>
            {cam.campos.map((campo,idx)=>(
              <div key={campo} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:idx%2===0?"#fff":"#F5F0EC",borderBottom:idx<cam.campos.length-1?"1px solid #DDD5CE":"none"}}>
                <div style={{flex:1,fontSize:12,color:"#7A7168"}}>{campo}</div>
                <input type="text" value={data.campos?.[campo]||''} onChange={e=>onChange(camId,"campo",campo,e.target.value)}
                  style={{height:28,borderRadius:6,border:"1px solid #DDD5CE",fontSize:12,paddingLeft:8,width:160,outline:"none"}} placeholder="—" />
              </div>
            ))}
          </div>
        </div>
      )}
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

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh"}}><span style={{fontSize:13,color:"#7A7168"}}>Cargando...</span></div>;

  return (
    <div style={{maxWidth:1000,margin:"0 auto",padding:"24px 20px 80px"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:600,margin:0,marginBottom:4}}>Dashboard</h1>
          <p style={{fontSize:13,color:"#7A7168",margin:0}}>Informes de cámaras especiales · Temporada 25/26</p>
        </div>
        <BtnP onClick={onNewReport}>+ Nuevo informe</BtnP>
      </div>
      {stats&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[{l:"Informes",v:stats.total,s:"esta temporada"},{l:"Jornadas",v:stats.porJornada?.length||0,s:"registradas"},{l:"Graves",v:stats.porJornada?.reduce((a,j)=>a+parseInt(j.graves||0),0)||0,s:"acumuladas",red:true},{l:"Leves",v:stats.porJornada?.reduce((a,j)=>a+parseInt(j.leves||0),0)||0,s:"acumuladas",yel:true}].map(s=>(
            <Card key={s.l} style={{padding:"16px 18px",marginBottom:0}}>
              <div style={{fontSize:24,fontWeight:600,color:s.red?"#dc2626":s.yel?"#c2590a":"#1A1A1A",marginBottom:2}}>{s.v}</div>
              <div style={{fontSize:12,fontWeight:500}}>{s.l}</div>
              <div style={{fontSize:11,color:"#7A7168",marginTop:1}}>{s.s}</div>
            </Card>
          ))}
        </div>
      )}
      {informes.length===0?(
        <Card style={{textAlign:"center",padding:"48px 20px"}}>
          <div style={{fontSize:13,color:"#7A7168",marginBottom:16}}>No hay informes todavía.</div>
          <BtnP onClick={onNewReport}>Crear primer informe</BtnP>
        </Card>
      ):(
        <div style={{display:"grid",gridTemplateColumns:selected?"1fr 1fr":"1fr",gap:16,alignItems:"start"}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"14px 16px",borderBottom:"1px solid #DDD5CE"}}><SecTitle>Informes · {informes.length} resultados</SecTitle></div>
            {informes.map((inf,i)=>(
              <div key={inf.id} onClick={()=>loadDetail(inf.id)}
                style={{padding:"12px 16px",cursor:"pointer",background:selected===inf.id?"#EDE8E4":"#fff",borderBottom:i<informes.length-1?"1px solid #DDD5CE":"none",transition:"background 0.1s"}}
                onMouseEnter={e=>{if(selected!==inf.id)e.currentTarget.style.background="#F5F0EC";}}
                onMouseLeave={e=>{if(selected!==inf.id)e.currentTarget.style.background="#fff";}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500}}>{inf.encuentro||"—"}</div>
                    <div style={{fontSize:11,color:"#7A7168",marginTop:2}}><span style={{fontFamily:"'Courier New',monospace"}}>{inf.jornada}</span> · {fmt(inf.fecha)} · {inf.responsable||"—"}</div>
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
                <button onClick={()=>{setSelected(null);setDetail(null)}} style={{background:"none",border:"none",cursor:"pointer",color:"#7A7168",fontSize:16,padding:4}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                {[["Jornada",detail.jornada],["Fecha",fmt(detail.fecha)],["Hora",detail.hora_partido||"—"],["Responsable",detail.responsable],["UM",detail.um],["J. Técnico",detail.jefe_tecnico]].map(([k,v])=>(
                  <div key={k} style={{padding:"8px 10px",background:"#F5F0EC",borderRadius:"8px",border:"1px solid #DDD5CE"}}>
                    <div style={{fontSize:10,fontWeight:500,color:"#7A7168",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>{k}</div>
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
                  {OPERATOR_GROUPS.map(g=>g.roles.map(r=>{ const v=detail.operators[r.key]; if(!v) return null; return <div key={r.key} style={{display:"flex",gap:8,fontSize:12,marginBottom:3}}><span style={{color:"#7A7168",minWidth:90}}>{r.label}</span><span style={{fontWeight:500}}>{v}</span></div>; }))}
                </div>
              )}
              {detail.cam_data&&(
                <div style={{border:"1px solid #DDD5CE",borderRadius:"8px",overflow:"hidden"}}>
                  {Object.entries(detail.cam_data).map(([id,d],i,arr)=>{ const cam=CAMERA_CATALOG[id]; if(!cam||!d) return null; const items=d.items||{}; const gv=Object.values(items).filter(v=>v==="G").length; const lv=Object.values(items).filter(v=>v==="L").length; return (
                    <div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:i<arr.length-1?"1px solid #DDD5CE":"none",background:i%2===0?"#fff":"#F5F0EC"}}>
                      <span style={{fontSize:13}}>{cam.icon}</span>
                      <div style={{flex:1,fontSize:12}}>{cam.label}</div>
                      {d.equipo&&<span style={{fontSize:11,color:"#7A7168",fontFamily:"'Courier New',monospace"}}>{d.equipo}</span>}
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

/* ─── SHARED PDF GENERATOR ────────────────────────────────── */
export function generateInformePDF(informe) {
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
      `<div class="ic${v==='G'?' ic-g':v==='L'?' ic-l':''}"><span>${k}</span><span style="color:${SC[v]||'#999'};font-weight:700">${v||'—'}</span></div>`
    ).join('');
    const camposDef = cam.campos||[];
    const camposHtml = camposDef.length>0
      ? `<div class="campos-section">
          <div class="campos-hdr">Parámetros técnicos</div>
          <div class="campos-grid">${camposDef.map(k=>{
            const v=(d.campos||{})[k]||'';
            return `<div class="campo-row"><span class="campo-k">${k}</span><span class="campo-v">${v||'&nbsp;'}</span></div>`;
          }).join('')}</div>
        </div>`
      : '';
    const eq = d.equipos?Object.values(d.equipos).filter(Boolean).join(' · '):(d.equipo||'');
    const statusDot = gv>0?`<span class="dot dot-g">G${gv}</span>`:lv>0?`<span class="dot dot-l">L${lv}</span>`:`<span class="dot dot-ok">OK</span>`;
    return `<div class="cam-block" style="border-left:3px solid ${cam.color||'#94a3b8'}">
      <div class="cam-head" style="background:${cam.color||'#94a3b8'}18">
        <span style="color:${cam.color||'#374151'}">${cam.icon} ${cam.label}${eq?`<span style="font-family:monospace;font-weight:400;color:#555;margin-left:8px">${eq}</span>`:''}</span>
        ${statusDot}
      </div>
      ${itemCells?`<div class="ic-grid">${itemCells}</div>`:''}
      ${camposHtml}
      ${d.incidencias?`<div class="obs">${d.incidencias}</div>`:''}
    </div>`;
  }).join('');

  const g = informe.incidencias_graves||0, l = informe.incidencias_leves||0;
  const incBadges = g>0||l>0
    ? `${g>0?`<span class="badge badge-g">⚠ ${g} Graves</span>  `:''}${l>0?`<span class="badge badge-l">↓ ${l} Leves</span>`:''}`
    : `<span class="badge badge-ok">✓ Sin incidencias</span>`;

  const schedRows = [['Inicio MD-1',log.inicio_md1],['Fin MD-1',log.fin_md1],['Inicio MD',log.inicio_md],['Fin MD',log.fin_md]].filter(([,v])=>v);
  const schedHtml = schedRows.length>0
    ? `<h2>Horarios de jornada</h2><div class="grid">${schedRows.map(([k,v])=>cell(k,v)).join('')}</div>`
    : '';

  const vehiculosArr = Array.isArray(informe.vehiculos) && informe.vehiculos.length > 0
    ? informe.vehiculos
    : informe.vehiculo_referencia ? [{referencia:informe.vehiculo_referencia,matricula:informe.vehiculo_matricula,modelo:informe.vehiculo_modelo}] : [];
  const vehiculoHtml = vehiculosArr.length > 0
    ? `<h2>Vehículos asignados (${vehiculosArr.length})</h2>
       <table><thead><tr><th>Referencia</th><th>Matrícula</th><th>Modelo</th></tr></thead>
       <tbody>${vehiculosArr.map(v=>`<tr><td>${v.referencia||'—'}</td><td>${v.matricula||'—'}</td><td>${v.modelo||'—'}</td></tr>`).join('')}</tbody>
       </table>`
    : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Informe CCEE · ${informe.encuentro||''}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1a1a1a;padding:0}
.hdr-bar{background:#0f2044;color:#fff;padding:14px 32px;display:flex;justify-content:space-between;align-items:center}
.hdr-brand{font-size:13px;font-weight:700;letter-spacing:.04em;color:#7dd3fc}
.hdr-sub{font-size:10px;color:#94a3b8;margin-top:2px}
.hdr-body{padding:18px 32px 12px;border-bottom:2px solid #0f2044;margin-bottom:16px}
.title{font-size:18px;font-weight:700;margin-bottom:4px}
.sub{font-size:12px;color:#52525b;margin-bottom:10px}
.badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;margin-right:6px}
.badge-g{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.badge-l{background:#fffbeb;color:#d97706;border:1px solid #fde68a}
.badge-ok{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
.content{padding:0 32px 32px}
h2{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#0f2044;border-bottom:2px solid #0f2044;padding-bottom:3px;margin:18px 0 9px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.cell{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:7px 10px}
.cl{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:2px}
.cv{font-size:11px;font-weight:600;color:#0f172a}
table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px}
th{background:#0f2044;color:#fff;padding:5px 9px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;text-align:left}
td{border:1px solid #e2e8f0;padding:5px 9px}
tr:nth-child(even) td{background:#f8fafc}
.cam-block{border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:10px;page-break-inside:avoid}
.cam-head{padding:7px 12px;display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:12px}
.dot{padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700}
.dot-g{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.dot-l{background:#fffbeb;color:#d97706;border:1px solid #fde68a}
.dot-ok{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
.ic-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));border-top:1px solid #e2e8f0}
.ic{display:flex;justify-content:space-between;align-items:center;padding:4px 10px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:11px}
.ic-g{background:#fff5f5}
.ic-l{background:#fffdf0}
.obs{padding:6px 12px;border-top:1px solid #fde68a;font-size:11px;color:#92400e;background:#fffbeb}
.campos-section{border-top:1px solid #e2e8f0;padding:7px 12px 8px;background:#faf7ff}
.campos-hdr{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#7c3aed;margin-bottom:5px}
.campos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:5px 20px}
.campo-row{display:flex;align-items:baseline;gap:6px;font-size:11px;min-width:0}
.campo-k{color:#6b21a8;font-weight:600;white-space:nowrap;flex-shrink:0;font-size:10px;min-width:100px}
.campo-v{font-family:'Courier New',monospace;color:#1e293b;border-bottom:1.5px dashed #a78bfa;flex:1;min-width:80px;padding-bottom:1px}
.ftr{margin-top:24px;padding:10px 32px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;display:flex;justify-content:space-between;background:#f8fafc}
@media print{body{padding:0}.hdr-body{padding:12px 24px 10px}.content{padding:0 24px 24px}.hdr-bar{padding:10px 24px}.ftr{padding:8px 24px}}
</style></head><body>
<div class="hdr-bar">
  <div>
    <div class="hdr-brand">MEDIAPRO · CÁMARAS ESPECIALES</div>
    <div class="hdr-sub">Informe de servicio · Temporada 25/26</div>
  </div>
  <div style="font-size:11px;color:#94a3b8">${informe.um||''}</div>
</div>
<div class="hdr-body">
  <div class="title">${informe.encuentro||'—'}</div>
  <div class="sub">${informe.jornada||''} · ${fmtD(informe.fecha)}${informe.hora_partido?` · ${informe.hora_partido}`:''}</div>
  <div>${incBadges}</div>
</div>
<div class="content">
<h2>Datos del partido</h2>
<div class="grid">
  ${[['Jornada',informe.jornada],['Encuentro',informe.encuentro],['Fecha',fmtD(informe.fecha)],['Hora partido',informe.hora_partido],['Hora Montaje UM',informe.hora_montaje_um],['Horario Montaje UM MD-1',informe.horario_md1]].map(([k,v])=>cell(k,v)).join('')}
</div>
<h2>Equipo técnico</h2>
<div class="grid">
  ${[['Responsable CCEE',informe.responsable],['Unidad Móvil',informe.um],['J. Técnico UM',informe.jefe_tecnico],['Realizador',informe.realizador],['Productor',informe.productor]].map(([k,v])=>cell(k,v)).join('')}
</div>
${vehiculoHtml}
${schedHtml}
${opRows?`<h2>Operadores</h2><table><thead><tr><th>Rol</th><th>Nombre</th></tr></thead><tbody>${opRows}</tbody></table>`:''}
${Object.keys(logItems).length>0?`<h2>Logística</h2><table><thead><tr><th>Elemento</th><th style="width:60px;text-align:center">Estado</th></tr></thead><tbody>${logRows}</tbody></table>${log.incidencias?`<div class="obs" style="margin-bottom:10px;border-radius:5px;border:1px solid #fde68a">${log.incidencias}</div>`:''}`:''}
${activeCams.length>0?`<h2>Cámaras · ${activeCams.length} activas</h2>${camSections}`:''}
</div>
<div class="ftr">
  <span>MEDIAPRO · Cámaras Especiales</span>
  <span>Generado: ${new Date().toLocaleString('es-ES')}</span>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;

  const win = window.open('','_blank','width=940,height=800');
  if (win) { win.document.write(html); win.document.close(); }
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
    <div style={{minHeight:'100vh',background:'#F5F0EC',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:360,background:'#fff',border:'1px solid #DDD5CE',borderRadius:12,padding:32,boxShadow:'0 1px 3px 0 rgba(0,0,0,0.07)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <img src="/logo.png" alt="CCEE" style={{width:72,height:72,objectFit:'contain',marginBottom:8}} />
          <div style={{fontSize:16,fontWeight:600}}>MEDIAPRO · CCEE</div>
          <div style={{fontSize:12,color:'#7A7168',marginTop:3}}>Cámaras Especiales</div>
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
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#7A7168'}}>
      Cargando...
    </div>
  );

  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,color:'#7A7168'}}>Cargando...</div>}>
      {user.role === 'coordinador' || user.role === 'supervisor'
        ? <CoordView user={user} onLogout={handleLogout} />
        : user.role === 'operador'
          ? <OperadorView user={user} onLogout={handleLogout} />
          : <UsuarioView user={user} onLogout={handleLogout} readonly={user.role==='readonly'} />
      }
    </Suspense>
  );
}
