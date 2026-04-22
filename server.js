import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createRequire } from 'module'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit')
const XLSX = require('xlsx')

// ── LOOKUP TABLES FOR HOJA-PDF (mirror App.jsx CAMERA_CATALOG / OPERATOR_GROUPS) ──
const CAMERA_ORDER = [
  'OBVAN_CCEE','CAMARA_UHS','SKYCAM_4','AR_SKYCAM',
  'STEADY_L','STEADY_R','STEADY_PERSO',
  'RF_L','RF_R','RF_PERSO',
  'POLECAM_L','POLECAM_R',
  'MINICAM_L','MINICAM_R',
  'KIT_CINEMA_L','KIT_CINEMA_R',
  'DRONE','BODYCAM','PTZ_1','PTZ_2','OTROS'
]
const CAMERA_LABELS = {
  OBVAN_CCEE:'OBVAN CCEE', CAMARA_UHS:'Cámara UHS', SKYCAM_4:'4SkyCam',
  AR_SKYCAM:'AR Skycam', STEADY_L:'Steady L', STEADY_R:'Steady R',
  STEADY_PERSO:'Steady Perso', RF_L:'RF L', RF_R:'RF R', RF_PERSO:'RF Perso',
  POLECAM_L:'Polecam L', POLECAM_R:'Polecam R',
  MINICAM_L:'Minicám. L', MINICAM_R:'Minicám. R',
  KIT_CINEMA_L:'Cinema L', KIT_CINEMA_R:'Cinema R',
  DRONE:'Drone', BODYCAM:'Bodycam', PTZ_1:'PTZ 1', PTZ_2:'PTZ 2', OTROS:'Otros'
}
const OPERATOR_ROLES_ORDERED = [
  {key:'obvan_jefe_tec',      label:'Jefe Técnico OBVAN'},
  {key:'obvan_resp_montaje',  label:'Responsable Montaje OBVAN'},
  {key:'obvan_aux1',          label:'Auxiliar 1 OBVAN'},
  {key:'obvan_aux2',          label:'Auxiliar 2 OBVAN'},
  {key:'skycam_piloto',       label:'Piloto'},
  {key:'skycam_operador',     label:'Operador'},
  {key:'skycam_auxiliar',     label:'Auxiliar'},
  {key:'ar_tec1',             label:'Técnico AR 1'},
  {key:'ar_tec2',             label:'Técnico AR 2'},
  {key:'steady_l',            label:'Steady L'},
  {key:'steady_r',            label:'Steady R'},
  {key:'steady_perso',        label:'Steady Perso'},
  {key:'rf_l',                label:'RF L'},
  {key:'rf_r',                label:'RF R'},
  {key:'rf_perso',            label:'RF Perso'},
  {key:'polecam_l',           label:'Polecam L'},
  {key:'polecam_r',           label:'Polecam R'},
  {key:'foquista_l',          label:'Foquista L'},
  {key:'foquista_r',          label:'Foquista R'},
  {key:'drone_piloto',        label:'Piloto (Drone)'},
  {key:'drone_tec',           label:'Técnico (Drone)'},
  {key:'bodycam',             label:'Operador (Bodycam)'},
  {key:'minicams',            label:'Operador (Minicams)'},
  {key:'ptz1_op',             label:'PTZ 1 Operador'},
  {key:'ptz2_op',             label:'PTZ 2 Operador'},
  {key:'uhs_op',              label:'Operador UHS'},
]

const { Pool } = pg
const app = express()
const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
})

app.use(express.json({ limit: '10mb' }))
app.use(express.static(join(__dirname, 'dist')))

// ── AUTH MIDDLEWARE ────────────────────────────────────────
function requireAuth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET)
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Sin permisos' })
      }
      req.user = payload
      next()
    } catch {
      return res.status(401).json({ error: 'Token inválido' })
    }
  }
}

// ── INIT DATABASE ─────────────────────────────────────────
async function initDB() {
  // Tabla original de informes
  await pool.query(`
    CREATE TABLE IF NOT EXISTS informes (
      id SERIAL PRIMARY KEY,
      jornada VARCHAR(20),
      encuentro VARCHAR(100),
      fecha DATE,
      hora_partido VARCHAR(10),
      hora_montaje_um VARCHAR(20),
      responsable VARCHAR(100),
      um VARCHAR(50),
      jefe_tecnico VARCHAR(100),
      realizador VARCHAR(100),
      productor VARCHAR(100),
      horario_md1 VARCHAR(50),
      operadores JSONB,
      camaras_activas JSONB,
      logistica JSONB,
      cam_data JSONB,
      incidencias_graves INT DEFAULT 0,
      incidencias_leves INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  // Tabla de usuarios
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name          VARCHAR(100) NOT NULL,
      role          VARCHAR(20) NOT NULL CHECK (role IN ('coordinador','usuario','readonly','supervisor')),
      active        BOOLEAN DEFAULT true,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `)

  // Tabla de servicios (creados por coordinador, pasos 1-3)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS servicios (
      id              SERIAL PRIMARY KEY,
      tipo_servicio   VARCHAR(30),
      jornada         VARCHAR(20),
      encuentro       VARCHAR(100),
      fecha           DATE,
      hora_partido    VARCHAR(10),
      hora_montaje_um   VARCHAR(20),
      responsable     VARCHAR(100),
      um              VARCHAR(50),
      jefe_tecnico    VARCHAR(100),
      realizador      VARCHAR(100),
      productor       VARCHAR(100),
      horario_md1     VARCHAR(50),
      operadores      JSONB,
      camaras_activas JSONB,
      assigned_to     INTEGER REFERENCES users(id),
      created_by      INTEGER REFERENCES users(id),
      status          VARCHAR(20) DEFAULT 'pendiente' CHECK (status IN ('pendiente','completado')),
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `)

  // Tabla de documentos adjuntos a servicios
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documentos (
      id          SERIAL PRIMARY KEY,
      servicio_id INTEGER REFERENCES servicios(id) ON DELETE CASCADE,
      descripcion VARCHAR(200) NOT NULL,
      nombre      VARCHAR(255),
      tipo        VARCHAR(100),
      datos       TEXT,
      tamano      INTEGER DEFAULT 0,
      created_at  TIMESTAMP DEFAULT NOW()
    )
  `)

  // Añadir columnas a informes si no existen (sin romper datos existentes)
  await pool.query(`ALTER TABLE informes ADD COLUMN IF NOT EXISTS servicio_id  INTEGER REFERENCES servicios(id)`)
  await pool.query(`ALTER TABLE informes ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id)`)
  await pool.query(`ALTER TABLE informes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'enviado'`)
  await pool.query(`UPDATE informes SET status='enviado' WHERE status IS NULL`)

  // Ampliar rol para incluir 'readonly' (para bases de datos existentes)
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='users_role_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
      END IF;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('coordinador','usuario','readonly','operador','supervisor'));
    END $$
  `)

  // Campos para operadores con acceso a la app
  await pool.query(`ALTER TABLE operadores_pool ADD COLUMN IF NOT EXISTS email     VARCHAR(255)`)
  await pool.query(`ALTER TABLE operadores_pool ADD COLUMN IF NOT EXISTS plantilla BOOLEAN NOT NULL DEFAULT false`)
  await pool.query(`ALTER TABLE operadores_pool ADD COLUMN IF NOT EXISTS user_id   INTEGER REFERENCES users(id)`)

  // Promover lcatala@mediapro.tv a supervisor
  await pool.query(`UPDATE users SET role='supervisor' WHERE email='lcatala@mediapro.tv' AND role='coordinador'`)

  // cam_models: modelos de equipo seleccionados por el coordinador
  await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS cam_models JSONB DEFAULT '{}'::jsonb`)
  // observaciones libres por servicio
  await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS observaciones TEXT DEFAULT ''`)

  // Tabla de vehículos
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehiculos (
      id         SERIAL PRIMARY KEY,
      referencia VARCHAR(100) NOT NULL,
      matricula  VARCHAR(200) NOT NULL DEFAULT '',
      modelo     VARCHAR(200) NOT NULL DEFAULT '',
      activo     BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  // Migración: renombrar articulo → matricula
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vehiculos' AND column_name='articulo') THEN
        ALTER TABLE vehiculos RENAME COLUMN articulo TO matricula;
      END IF;
    END $$;
  `)

  // Tabla junction: múltiples vehículos por servicio
  await pool.query(`
    CREATE TABLE IF NOT EXISTS servicio_vehiculos (
      servicio_id INTEGER REFERENCES servicios(id) ON DELETE CASCADE,
      vehiculo_id INTEGER REFERENCES vehiculos(id) ON DELETE CASCADE,
      PRIMARY KEY (servicio_id, vehiculo_id)
    )`)

  // Migración: copiar vehiculo_id → servicio_vehiculos y eliminar columna legacy
  await pool.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='servicios' AND column_name='vehiculo_id') THEN
        INSERT INTO servicio_vehiculos (servicio_id, vehiculo_id)
          SELECT id, vehiculo_id FROM servicios WHERE vehiculo_id IS NOT NULL
          ON CONFLICT DO NOTHING;
        ALTER TABLE servicios DROP COLUMN vehiculo_id;
      END IF;
    END $$;
  `)

  // Seed: importar 58 vehículos del Excel — idempotente (comprueba por referencia)
  try {
    const VEHICLE_SEED = [
      ['CCEE 03','3007 LHK','FORD TRANSIT'],
      ['CCEE 04','6473 NGP','RENAULT TRAFIC'],
      ['CCEE 05','1282 KZL','FORD TRANSIT'],
      ['CCEE 07','8441 MJF','RENAULT TRAFIC'],
      ['CCEE 08','2673 LJP','PEUGEOT 308'],
      ['CCEE 10','2291 KDS','RENAULT MASTER'],
      ['CCEE 11','2286 KDS','RENAULT MASTER'],
      ['CCEE 12','9968 MKN',''],
      ['CCEE 14','2477 LKN','FORD TRANSIT'],
      ['CCEE 15','4096 MLJ','PEUGEOT EXPERT'],
      ['PPV 16','2193 MJL','SKODA SCALA'],
      ['PPV 17','2555 LKN','FORD TRANSIT'],
      ['CCEE 18','4481 MFB','RENAULT EXPRESS'],
      ['CCEE 19','2203 LZC','CITROEN BERLINGO'],
      ['CCEE 20','1377 NFR','OPEL MOVANO'],
      ['CCEE 22','5675 MDS','SKODA SCALA'],
      ['CCEE 23','8494 MBX','SEAT LEON'],
      ['CCEE 24','5678 MDS','SKODA SCALA'],
      ['PPV 26','3981 MTY','RENAULT MEGANE'],
      ['CCEE 28','8674 MLL','RENAULT MEGANE'],
      ['CCEE 29','5679 MDS','SKODA SCALA'],
      ['CCEE 30','6798 LBH','FORD TRANSIT'],
      ['CCEE 31','6474 NGP','RENAULT TRAFIC'],
      ['PPV 32','8959 LKZ','FORD TRANSIT'],
      ['CCEE 33','6352 MCY','SKODA SCALA'],
      ['CCEE 34','2314 MKL','SKODA SCALA'],
      ['CCEE 35','6721 MKL','FIAT DOBLO'],
      ['CCEE 36','6135 MLK','OPEL VIVARO'],
      ['CCEE 37','4748 MSW','NISAN INTERSTAR'],
      ['CCEE 38','2002 NFP','NISAN INTERSTAR'],
      ['CCEE 39','1109 NFX','CITROEN JUMPY'],
      ['CCEE 43','4724 MSW','RENAULT TRAFIC'],
      ['44 FEM','1577 MBS','IVECO DAYLY'],
      ['OB70','0756 DZG','RENAULT'],
      ['APOYO OB70','6875 DKD','RENAULT'],
      ['DRONE 01','1191-LXN','Renault Kangoo (Madrid)'],
      ['DRONE 02','9988-FKF','Nissan Navara (Madrid)'],
      ['DRONE 03','0337-KWK','Kia Niro (Madrid)'],
      ['DRONE 04','1392-MHH','Hyundai Kona (Madrid)'],
      ['DRONE 05','1394-MHH','Hyundai Kona (Madrid)'],
      ['DRONE 06','0842-FND','Mercedes Sprinter E334 (Madrid)'],
      ['DRONE 07','1819-FTY','Volkswagen Crafter E344 (Madrid)'],
      ['DRONE 08','1194-MND','Mercedes Vito (Madrid)'],
      ['DRONE 09','0465-MGW','Toyota Corolla (Madrid)'],
      ['DRONE 10','4093-MJD','Toyota Corolla (Madrid)'],
      ['DRONE 11','4098-MJD','Toyota Corolla (Madrid)'],
      ['DRONE 12','4100-MJD','Toyota Corolla (Madrid)'],
      ['DRONE 13','1411-LXS','Renault Kangoo (Bilbao)'],
      ['DRONE 14','9357-CSD','Mercedes Vito E91 (Bilbao)'],
      ['DRONE 15','1200-LXN','Renault Kangoo (Sevilla)'],
      ['DRONE 16','0480-MCW','Toyota Corolla (Sevilla)'],
      ['DRONE 17','8373-BGK','Mercedes Sprinter E78 (Santiago)'],
      ['DRONE 18','4995-FGL','Volkswagen Crafter E302 (Santiago)'],
      ['DRONE 19','2329-MKK','Peugeot Partner (Valencia)'],
      ['DRONE 20','4099-MJD','Toyota Corolla (Valencia)'],
      ['DRONE 21','1925-FKR','Volkswagen Caddy (Valencia)'],
      ['DRONE 22','5245-GJP','Mercedes Vito E96 (Mallorca)'],
      ['DRONE 23','1410-LXS','Renault Kangoo (Barcelona)'],
    ]
    const existing = await pool.query('SELECT referencia FROM vehiculos')
    const existingSet = new Set(existing.rows.map(r => r.referencia))
    const toInsert = VEHICLE_SEED.filter(v => !existingSet.has(v[0]))
    if (toInsert.length > 0) {
      const ph = toInsert.map((_, i) => `($${i*3+1},$${i*3+2},$${i*3+3})`).join(',')
      await pool.query(`INSERT INTO vehiculos (referencia, matricula, modelo) VALUES ${ph}`, toInsert.flat())
      console.log(`✓ Seed: ${toInsert.length} vehículos importados`)
    }
  } catch (seedErr) {
    console.error('⚠ Seed vehículos falló (no crítico):', seedErr.message)
  }

  // Teléfonos de contacto del equipo técnico
  await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS tel_jefe_tecnico VARCHAR(50) DEFAULT ''`)
  await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS tel_realizador VARCHAR(50) DEFAULT ''`)
  await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS tel_productor VARCHAR(50) DEFAULT ''`)

  // Directorio de personal técnico reutilizable
  await pool.query(`
    CREATE TABLE IF NOT EXISTS personal_tecnico (
      id         SERIAL PRIMARY KEY,
      rol        VARCHAR(20) NOT NULL CHECK (rol IN ('jefe_tecnico','realizador','productor')),
      nombre     VARCHAR(100) NOT NULL,
      telefono   VARCHAR(50) DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (rol, nombre)
    )
  `)

  // Pool de operadores por especialidad
  await pool.query(`
    CREATE TABLE IF NOT EXISTS operadores_pool (
      id     SERIAL PRIMARY KEY,
      pool   VARCHAR(60) NOT NULL,
      nombre VARCHAR(200) NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      UNIQUE(pool, nombre)
    )
  `)

  // Modelos de cámara/equipo por tipo
  await pool.query(`
    CREATE TABLE IF NOT EXISTS modelos_camara (
      id     SERIAL PRIMARY KEY,
      tipo   VARCHAR(60) NOT NULL,
      modelo VARCHAR(200) NOT NULL,
      activo BOOLEAN NOT NULL DEFAULT true,
      UNIQUE(tipo, modelo)
    )
  `)

  // Seed operadores_pool (idempotente)
  try {
    const OPERADORES_SEED = {
      RESP_CCEE:          ["CELEDONIO GARCIA RAUSELL","DANIEL MURILLO PERALES","ISMAEL BARROSO FERNÁNDEZ","JOAQUIN QUINTO ANTON","JUAN MARÍN GÓMEZ","PASCUAL LOPEZ MONTOYA"],
      OP_SKYCAM:          ["ADRIÁN ZAPAIA FERNÁNDEZ","AFONSO GAMBOA DE COAMPOS","AURELIO ROMERO MARTINEZ","CESAR PASTOR PEREZ","CESAR SALA PONT","CLAUDIO GONZALEZ CASTELAO","DANIEL MUÑOZ TOMAS","DAVID DIAZ MARTINEZ","DOMINGO BELLIDO VERDOY","FRANCISCO RODRIGUEZ-TRELLES","HUMBERTO TORREALBA ORTEGANO","JOSE FERRER BARGUES","LUIS PASCUAL MENDOZA","NICOLAS FORES OZEKI","RUBEN MONTEIRO ORTET","SERGIO CABEDO MOLTO","VICTOR FERRANDIZ MANGLANO"],
      TEC_SKYCAM:         ["ALEJANDRO LLORENS SANZ","DAVID VAZQUEZ TORNERO","JORGE PASCUAL RIVEIRA","JUAN CARLOS VAZQUEZ TORNERO","LAURA MUÑOZ CUEVAS","MANEL MAZCUÑAN TARREGA","MARCOS SANCHEZ MARTI","SERGIO TORRES SANTIAGO","VICENTE GOMEZ AGUT"],
      TEC_AR:             ["CLARA BRONSTEN","DANIEL LOZANO ROSALES","DAVID ARRIBAS","DIDAC GARCÍA PÉREZ","EDUARD GISPERT","ENRIC LÓPEZ MATAS","JOAN ROCA FONT","JOAO MARTINS BASTOS","MIGUEL GALINDO","MIGUEL GÓMEZ","PEDRO GARCÍA SÁNCHEZ","ROGER FOLCH ALCARAZ"],
      STEADYCAM:          ["ALBANO SÁNCHEZ GRACIA","ANGEL NAVARRO LATORRE","BORJA SANCHEZ JORGE","CURT OSWALD SCHALER","EDUARDO MATO MATA","FERNANDO RODRIGO CANO","JAVIER ALFONSO BARTOLOZZI","JAVIER NAVALON APARICIO","MANUEL RODRÍGUEZ GIRONA","MANUEL TOMAS GARCIA","ÁNGEL GODAY RODRÍGUEZ"],
      TEC_RF:             ["ALBERTO MOLINA HIDALGO","CARLOS CALVO GUTES","DAMIAN VAZQUEZ PARRILLA","DAVID SOLIS RICA","ERNESTO PRIMO BOSCH","HECTOR RODRIGUEZ ESPAÑA","JAVIER RICO GUERRERO","JONATAN GONZÁLEZ RODRÍGUEZ","JOSÉ CARLOS CRUZ GIGANTE","JUAN MIGUEL MARTÍN-CAMACHO SÁNCHEZ","JULIA DOMENECH BONET","MANUEL CRESPO LOPEZ","MARCOS ANDRÉ TEIXEIRA LANDEIROTO","MARTÍ LAGO CASARES","PABLO ANDRÉS COCCIOLO","RAFAEL GALVAÑ GINER","RAÚL MORGADO PULIDO","SANTIAGO LABOREL PICOS","SERGIO NAVARRO CERVANTES","SERVANDO AGUILAR BERMÚDEZ","XAVIER SEGURA RODRÍGUEZ"],
      POLECAM:            ["ADRIÁN ZAPAIA FERNÁNDEZ","ANGEL MOLINA FERRER","ATILANO CANO OLIVER","FRANCISCO TORREBEJANO VALDERAS","IZARNE VILLAVERDE ARRANZ","JAVIER ARANDA GARCÍA"],
      FOQUISTA:           ["ADRIAN SEGUI SEGUI","FEDERICO TAUS QUINTANA","HÉCTOR ACEITUNO COBREROS","IZARNE VILLAVERDE ARRANZ","JAUME VERDÚ FRANCÉS","JESÚS RONQUILLO VIEDMA","LUCIA GONZALEZ MORENO","MAX PONCE PONS","SAMUEL ROBLES ARIZA","SANTIAGO CAPILLA CUENCA","VÍCTOR RODRÍGUEZ SÁNCHEZ"],
      DRONE_PILOTO:       ["ANTONIO HARDCASTLE BONED","GONZALO RUIZ GARCÍA","HUGO KUKLA NUÑEZ","IVÁN FUENTES DEL AMO","JAVIER ANTELO SEOANE","JORGE CAPOTILLO CUADRADO","JOSÉ CLEMENTE LÁZARO ALEGRE","JOSÉ REULA SABORIT","JUAN CARLOS LEÓN GARCÍA","JULIO DANIEL BUENO GÓMEZ","MANUEL CAPDEQUI GARCíA","ORIOL TUBAU LOPEZ","RUBEN MARTÍN SANCHEZ"],
      DRONE_TEC:          ["ADRIÁN GALLEGO JIMÉNEZ","AINHOA ARENAS ÁLVAREZ","ALBERTO DÍAZ FRANCO","ALEIX CONDE TOMÁS","ALEJANDRA NOGUEIRA REGÜELA","ALEJANDRO ARJONA RAMIREZ","ALEJANDRO LEÓN SERRANO","ANGEL LÓPEZ PAZOS","ARNALDO SÁEZ PIÑERA","CARLOS ALBERTO MEDORI BRISSIO","DANIEL MÍNGUEZ PERNAS","DAVID ALBERT MUÑIZ","DAVID MARTÍN TOUSET","EDISON JAVIER ESPINOZA ALBÁN","ELENA GÓMEZ DORADO","ESTEBAN TABAR GOMARRA","HÉCTOR SERNA MENA","JESÚS GONZÁLEZ SARRIÁ","JOSE DAVID GAMALLO MOUTEIRA","JOSE LUIS VALERO ALCALÁ","JUAN ANTONIO VIDAL MACLAUCHLAN","JULIA DOMÉNECH BONET","LUCAS FERNÁNDEZ CANOSA","MANUEL IGLESIAS MOSCONI","MARTÍ MORUNO HERNÁNDEZ","MIGUEL DÍAZ ÁLVAREZ","MIGUEL RODELLAR AGUILAR","NOELIA OSORIO FERNÁNDEZ","PIETRO CONTE","RAQUEL PÉREZ HIDALGO","RAÚL GALINDO MARTÍN","RICARDO RAMOS TORTAJADA","SANAA EL JAOUHARY EL KHALLAY","VÍCTOR POLO ANTÓN","ÓSCAR IGLESIAS GARAZO"],
      BODYCAM:            ["DAVID VAZQUEZ LUNA","HECTOR RODRIGUEZ ESPAÑA"],
      MINICAMS:           ["GORKA DAPIA FERNÁNDEZ","MARCOS SANCHEZ MARTI","MOHAMED TAJ BELHORMA"],
      TEC_PTZ:            [],
      OP_UHS:             [],
      PERSONAL_OBVAN_JEFE:["CELEDONIO GARCIA RAUSELL","DANIEL MURILLO PERALES","DAVID SÁNCHEZ JARQUE","ISMAEL BARROSO FERNÁNDEZ","JOAQUIN QUINTO ANTON","JUAN MARÍN GÓMEZ","PASCUAL LOPEZ MONTOYA"],
      PERSONAL_OBVAN_RESP:["GORKA DAPIA FERNÁNDEZ","MOHAMED TAJ BELHORMA"],
      PERSONAL_OBVAN_AUX: ["AARON PORCAR OLMO","AROA FERRER MARÍN","CARLOS NUÑEZ DIAZ","CRESEN ANGULO LÓPEZ","DANIEL GONZALEZ DORADO","DANIEL PABLOS DURBAY","DANIELE ADDEI","DAVID JIMÉNEZ SÁNCHEZ","ELIA MURILLO VAÑÓ","FABRIZIO OLSO GONZALEZ","GERARD CASALS PÉREZ","HÉCTOR BELLES BELTRÁN","ISMAEL SANTAMARIA FERNANDEZ","JAIME MARTINEZ ATIENZA","JOHN NTUI MARTIN","JOSÉ CARLOS PÉREZ GAGO","JOSÉ CARLOS PÉREZ PÉREZ","JOSÉ SANTIAGO GONZÁLEZ MARTÍNEZ","JUAN JOSÉ RODRÍGUEZ PALOMEQUE","KESTON JASON PHILLIPS MENEZO","LUIS RAMÓN FERREIRO VARELA","MARIO DEL REINO MUÑOZ","MIRANDA MARTÍNEZ FRANCOS","NAROA SEVILLANO SÁEZ","NIL FUENTES MERIN","NOE NOUH BERBEL EL FELK","ROBERTO ARANDA GARCÍA","SANTIAGO GARCÍA CUTILLAS","SANTIAGO MAYOL RUIZ","SERGIO ORTOLA GONZÁLEZ","SERGIO TORRES SANTIAGO"],
    }
    const existOps = await pool.query('SELECT pool, nombre FROM operadores_pool')
    const existOpsSet = new Set(existOps.rows.map(r => `${r.pool}::${r.nombre}`))
    const opRows = []
    for (const [poolKey, nombres] of Object.entries(OPERADORES_SEED)) {
      for (const nombre of nombres) {
        if (!existOpsSet.has(`${poolKey}::${nombre}`)) opRows.push([poolKey, nombre])
      }
    }
    if (opRows.length > 0) {
      const ph = opRows.map((_, i) => `($${i*2+1},$${i*2+2})`).join(',')
      await pool.query(`INSERT INTO operadores_pool (pool, nombre) VALUES ${ph} ON CONFLICT DO NOTHING`, opRows.flat())
      console.log(`✓ Seed: ${opRows.length} operadores importados`)
    }
  } catch (e) { console.error('⚠ Seed operadores_pool falló:', e.message) }

  // Seed modelos_camara (idempotente)
  try {
    const MODELOS_SEED = {
      OBVAN:    ["CE10","CE11","70","RACK A","RACK B"],
      SKYCAM:   ["A 4K AR","B 1080P","C 1080P","D 1080P","E 1080P","F 4K AR","G 4K AR","H 4K AR"],
      UHS_CAM:  ["No3 FOR-A HS","No4 FOR-A HS","No5 FOR-A HS","No6 FOR-A HS","No7 FOR-A HS"],
      UHS_OPT:  ["No3 FUJI 107x","No4 FUJI 107x","No5 FUJI 107x","No6 FUJI 107x","No7 FUJI 107x"],
      STEADY:   ["ARRI","SHADOW","ULTRA","SSM1","SSM2","SSM3","PRO","M1","MASTER"],
      RF:       ["RF2 3GHZ 12G - 4K DIV.8","RF3 3GHZ 12G - 4K DIV.8","RF4 3GHZ 12G DIV.8","RF5 7GHZ 12G DIV.8","RF6 7GHZ 12G DIV.8","RF8","RF9","RF10","RF11","RF12","RF7-RF13","RF14","RF15 2GHZ","RF16","RF17 SVP","RF18 SVP","RF 19","RF 20 3GHZ/7GHZ 12G","RF 21 3GHZ/7GHZ 12G","RF 22 3GHZ/7GHZ - 12G 4K","RF 23","RF 24","RF 25 1GHZ/7GHZ - 12G 4K","RF 26 OVERON 1G DRON DIV.2","RF 27 OVERON RX4 1G DIV.2","RF 28 OVERON RX8 1G DIV.2","RF1 OVERON","RF2 OVERON","RF3 OVERON"],
      CINEMA:   ["A KIT FOCO + RED","B KIT FOCO + RED","C KIT FOCO + RED","D KIT FOCO + RED","E KIT FOCO","F KIT FOCO"],
      POLECAM:  ["No1","No2 MADRID","No3 BARCELONA","No4","No5","No6 CE 10","No7","No8 CE 11","No15"],
      POL_GIM:  ["No1","No2","No3","No4","No5","No6","No7 MAD","No8 CE 11","No9 CE 10","No10 BAR","No11"],
      POL_MINI: ["No1 ANTELOPE","No2 ANTELOPE","No3 ANTELOPE","No4 ANTELOPE","No5 ANTELOPE","No6 ANTELOPE","No7 ANTELOPE","No8 ANTELOPE"],
      MINICAM:  ["SIN CAM MINI 1,5G ROJA","12 NVP MINI 3G VERDE","13 NVP MINI 3G VERDE","14 NVP MINI 3G VERDE","No46 NVP MINI 3G GRIS","No47 NVP MINI 3G GRIS","No3 23.1 MINI 3G AZUL","No4 23.2 MINI 3G AZUL","No5 33.11 BAR MINI 3G GRIS","No6 33.12 MINI 3G GRIS","No7 33.46 MINI 3G GRIS","No8 33.48 MINI 3G GRIS","No44 44.44 MINI 3G GRIS","No45 44.45 MINI 3G GRIS","MINI 3G CE 10 33.3","MINI 3G CE 10 33.4","MINI 3G CE 10 33.5","MINI 3G CE 11 33.2","MINI 3G CE 11 33.6","MINI 3G CE 11 33.8","No 46.36 VX5 MINI 3G VERDE","No 46.38 VX5 MINI 3G VERDE","No 45.5 MINI 3G GRIS","No 45.7 MINI 3G GRIS","48.23 MINI 12G NEGRO","48.27 MINI 12G NEGRO","48.28 MINI 12G NEGRO","48.29 MINI 12G NEGRO","48.30 MINI 12G NEGRO","48.31 MINI 12G NEGRO","48.32 MINI 12G NEGRO"],
      MINI_RCP: ["No 1 RCP MINI 002 7085","No 2 RCP MINI 002 7010","No 3 BAR RCP MINI 002","No 4 RCP MINI 002","No 5 RCP MINI 002 7022","No 6 RCP MINI 002 7073","CE 10 RCP MINI 002","CE 11 RCP MINI 002","No 7 RCP MINI 003 7130","No 8 RCP MINI 003 7154i","No 9 RCP MINI 003 7165i","No10 RCP MINI 003 7167i","RCP MINI"],
      BODYCAM:  ["BODYCAM N1","BODYCAM N2"],
      PTZ:      ["N1 PTZ AW 150+CONTROL","N2 PTZ AW 150+CONTROL","N3 PTZ AW 150","N4 PTZ AW 150","N5 PTZ AW 150","No1 QBALL","No2 QBALL"],
      PTZ_CTL:  ["N3 CONTROL PTZ","N4 CONTROL PTZ","QBALL CONTROL"],
    }
    const existMods = await pool.query('SELECT tipo, modelo FROM modelos_camara')
    const existModsSet = new Set(existMods.rows.map(r => `${r.tipo}::${r.modelo}`))
    const modRows = []
    for (const [tipo, modelos] of Object.entries(MODELOS_SEED)) {
      for (const modelo of modelos) {
        if (!existModsSet.has(`${tipo}::${modelo}`)) modRows.push([tipo, modelo])
      }
    }
    if (modRows.length > 0) {
      const ph = modRows.map((_, i) => `($${i*2+1},$${i*2+2})`).join(',')
      await pool.query(`INSERT INTO modelos_camara (tipo, modelo) VALUES ${ph} ON CONFLICT DO NOTHING`, modRows.flat())
      console.log(`✓ Seed: ${modRows.length} modelos de cámara importados`)
    }
  } catch (e) { console.error('⚠ Seed modelos_camara falló:', e.message) }

  // Migración: renombrar hora_citacion → hora_montaje_um en tablas existentes
  for (const tbl of ['informes', 'servicios']) {
    try {
      await pool.query(`ALTER TABLE ${tbl} RENAME COLUMN hora_citacion TO hora_montaje_um`)
      console.log(`✓ Migración: ${tbl}.hora_citacion → hora_montaje_um`)
    } catch (_) { /* columna ya renombrada o no existe */ }
  }
  console.log('✓ Base de datos lista')

  // Bootstrap: crear coordinador inicial si no hay usuarios
  const userCount = await pool.query('SELECT COUNT(*) FROM users')
  if (parseInt(userCount.rows[0].count) === 0) {
    const email = process.env.INITIAL_COORD_EMAIL || 'admin@ccee.es'
    const password = process.env.INITIAL_COORD_PASSWORD || 'ccee2026'
    const hash = await bcrypt.hash(password, 10)
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'coordinador')`,
      [email, hash, 'Coordinador Principal']
    )
    console.log(`✓ Coordinador inicial creado: ${email}`)
  }
}

// ── AUTH ROUTES ────────────────────────────────────────────

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' })

    const r = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND active = true', [email.toLowerCase()]
    )
    const user = r.rows[0]
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET, { expiresIn: '7d' }
    )
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Validar token
app.get('/api/auth/me', requireAuth(), async (req, res) => {
  if (req.user.role === 'operador' || req.user.role === 'usuario') {
    const op = await pool.query('SELECT nombre FROM operadores_pool WHERE user_id=$1', [req.user.id]).catch(() => ({ rows: [] }))
    return res.json({ ...req.user, operador_nombre: op.rows[0]?.nombre || '' })
  }
  res.json(req.user)
})

// ── USERS ROUTES (solo coordinador) ───────────────────────

// Crear usuario
app.post('/api/users', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { email, password, name, role } = req.body
    if (!email || !password || !name) return res.status(400).json({ error: 'Faltan campos obligatorios' })
    if (!['supervisor', 'coordinador', 'usuario', 'readonly'].includes(role)) return res.status(400).json({ error: 'Rol inválido' })

    const hash = await bcrypt.hash(password, 10)
    const r = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, active, created_at`,
      [email.toLowerCase(), hash, name, role]
    )
    res.json({ ok: true, user: r.rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El email ya existe' })
    res.status(500).json({ error: err.message })
  }
})

// Listar usuarios
app.get('/api/users', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, email, name, role, active, created_at FROM users ORDER BY created_at DESC'
    )
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Desactivar usuario (soft delete)
app.delete('/api/users/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' })
    }
    await pool.query('UPDATE users SET active = false WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Reactivar usuario
app.patch('/api/users/:id/activate', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    await pool.query('UPDATE users SET active = true WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Resetear contraseña (coordinador genera contraseña temporal)
app.post('/api/users/:id/reset-password', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const tempPass = 'CCEE-' + Math.floor(1000 + Math.random() * 9000)
    const hash = await bcrypt.hash(tempPass, 10)
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.params.id])
    res.json({ ok: true, password_temporal: tempPass })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Cambiar contraseña propia (cualquier usuario autenticado)
app.post('/api/auth/change-password', requireAuth(), async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) return res.status(400).json({ error: 'Faltan campos' })
    if (new_password.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' })
    const r = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id])
    if (!r.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' })
    const ok = await bcrypt.compare(current_password, r.rows[0].password_hash)
    if (!ok) return res.status(400).json({ error: 'La contraseña actual no es correcta' })
    const newHash = await bcrypt.hash(new_password, 10)
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, req.user.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Editar usuario (nombre, email, rol) + restablecer contraseña opcional
app.put('/api/users/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { name, email, role, new_password } = req.body
    if (!name || !email || !role) return res.status(400).json({ error: 'Faltan campos obligatorios' })
    if (!['supervisor', 'coordinador', 'usuario', 'readonly'].includes(role)) return res.status(400).json({ error: 'Rol inválido' })
    if (new_password) {
      const hash = await bcrypt.hash(new_password, 10)
      await pool.query(
        'UPDATE users SET name=$1, email=$2, role=$3, password_hash=$4 WHERE id=$5',
        [name, email.toLowerCase(), role, hash, req.params.id]
      )
    } else {
      await pool.query(
        'UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4',
        [name, email.toLowerCase(), role, req.params.id]
      )
    }
    res.json({ ok: true })
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El email ya está en uso' })
    res.status(500).json({ error: err.message })
  }
})

// ── PERSONAL TÉCNICO ROUTES ────────────────────────────────

// Listar personal técnico (coordinador)
app.get('/api/personal-tecnico', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM personal_tecnico ORDER BY rol, nombre ASC')
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Crear/actualizar personal técnico (coordinador)
app.post('/api/personal-tecnico', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { rol, nombre, telefono } = req.body
    if (!['jefe_tecnico','realizador','productor'].includes(rol)) return res.status(400).json({ error: 'Rol inválido' })
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
    const r = await pool.query(
      `INSERT INTO personal_tecnico (rol, nombre, telefono, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (rol, nombre) DO UPDATE SET telefono=$3, updated_at=NOW()
       RETURNING *`,
      [rol, nombre.trim(), telefono||'']
    )
    res.json({ ok: true, persona: r.rows[0] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/personal-tecnico/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { nombre, telefono } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
    await pool.query(
      'UPDATE personal_tecnico SET nombre=$1, telefono=$2, updated_at=NOW() WHERE id=$3',
      [nombre.trim(), telefono||'', req.params.id]
    )
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/personal-tecnico/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    await pool.query('DELETE FROM personal_tecnico WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Helper: upsert one personal técnico entry (called internally on service save)
async function upsertPersonalTecnico(rol, nombre, telefono) {
  if (!nombre?.trim()) return
  await pool.query(`
    INSERT INTO personal_tecnico (rol, nombre, telefono, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (rol, nombre) DO UPDATE SET telefono=$3, updated_at=NOW()
  `, [rol, nombre.trim(), telefono || ''])
}

// ── VEHÍCULOS ROUTES ──────────────────────────────────────
app.get('/api/vehiculos', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM vehiculos WHERE activo=true ORDER BY referencia ASC')
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/vehiculos', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { referencia, matricula, modelo } = req.body
    const r = await pool.query(
      'INSERT INTO vehiculos (referencia, matricula, modelo) VALUES ($1,$2,$3) RETURNING *',
      [referencia, matricula, modelo]
    )
    res.json({ ok: true, vehiculo: r.rows[0] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/vehiculos/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { referencia, matricula, modelo } = req.body
    await pool.query(
      'UPDATE vehiculos SET referencia=$1, matricula=$2, modelo=$3 WHERE id=$4',
      [referencia, matricula, modelo, req.params.id]
    )
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/vehiculos/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    await pool.query('UPDATE vehiculos SET activo=false WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── OPERADORES POOL ROUTES ─────────────────────────────────

// Descargar plantilla Excel de operadores de plantilla
app.get('/api/operadores-pool/export-plantilla', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id, pool, nombre, email
      FROM operadores_pool
      WHERE activo=true AND plantilla=true
      ORDER BY pool, nombre
    `)
    const POOL_MAP = {
      RESP_CCEE:'Responsable CCEE', STEADY:'Steadycam', SKYCAM:'Skycam',
      REFCAM:'Refcam', RF:'RF', DRON:'Dron', OBVAN:'Obvan',
      CAM_UHS:'Cámara UHS', AYUDANTE:'Ayudante'
    }
    const data = r.rows.map(op => ({
      'ID':          op.id,
      'Especialidad': POOL_MAP[op.pool] || op.pool,
      'Nombre':      op.nombre,
      'Email':       op.email || '',
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.length ? data : [{ ID:'', Especialidad:'', Nombre:'', Email:'' }]), 'Operadores')
    const buf = XLSX.write(wb, { type:'buffer', bookType:'xlsx' })
    res.setHeader('Content-Disposition', 'attachment; filename="operadores-plantilla.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buf)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Importar emails desde Excel
app.post('/api/operadores-pool/import-emails', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', async () => {
      const buf  = Buffer.concat(chunks)
      const wb   = XLSX.read(buf, { type:'buffer' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws)
      let updated = 0, errors = []
      for (const row of rows) {
        const id    = row['ID'] || row['id']
        const email = (row['Email'] || row['email'] || '').toString().trim().toLowerCase()
        if (!id) continue
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push(`ID ${id}: email inválido (${email})`)
          continue
        }
        await pool.query('UPDATE operadores_pool SET email=$1 WHERE id=$2 AND plantilla=true', [email || null, id])
        updated++
      }
      res.json({ ok: true, updated, errors })
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/operadores-pool', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT op.id, op.pool, op.nombre, op.plantilla, op.email, op.user_id,
             u.active AS cuenta_activa
      FROM operadores_pool op
      LEFT JOIN users u ON u.id = op.user_id
      WHERE op.activo = true
      ORDER BY op.pool, op.nombre
    `)
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/operadores-pool', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { pool: poolKey, nombre } = req.body
    const r = await pool.query(
      'INSERT INTO operadores_pool (pool, nombre) VALUES ($1, $2) ON CONFLICT (pool, nombre) DO UPDATE SET activo=true RETURNING id',
      [poolKey, nombre.trim()]
    )
    res.json({ ok: true, id: r.rows[0].id })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/operadores-pool/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { nombre, email, plantilla } = req.body
    const fields = []
    const vals   = []
    if (nombre    !== undefined) { fields.push(`nombre=$${fields.length+1}`);    vals.push(nombre.trim()) }
    if (email     !== undefined) { fields.push(`email=$${fields.length+1}`);     vals.push(email ? email.trim().toLowerCase() : null) }
    if (plantilla !== undefined) { fields.push(`plantilla=$${fields.length+1}`); vals.push(!!plantilla) }
    if (!fields.length) return res.json({ ok: true })
    vals.push(req.params.id)
    await pool.query(`UPDATE operadores_pool SET ${fields.join(',')} WHERE id=$${vals.length}`, vals)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/operadores-pool/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    await pool.query('UPDATE operadores_pool SET activo=false WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Jerarquía de roles: nunca bajar de rango
const ROLE_RANK = { supervisor: 4, coordinador: 3, usuario: 2, operador: 1, readonly: 0 }
const superiorOIgual = (actual, nuevo) => (ROLE_RANK[actual] ?? 0) >= (ROLE_RANK[nuevo] ?? 0)

// Crear cuenta de operador (genera contraseña temporal)
app.post('/api/operadores-pool/:id/crear-cuenta', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { id } = req.params
    const op = await pool.query('SELECT * FROM operadores_pool WHERE id=$1', [id])
    if (!op.rows.length) return res.status(404).json({ error: 'Operador no encontrado' })
    const row = op.rows[0]
    if (!row.email)     return res.status(400).json({ error: 'El operador no tiene email' })
    if (!row.plantilla) return res.status(400).json({ error: 'Solo operadores de plantilla pueden tener cuenta' })

    // Si ya tiene cuenta vinculada → informar sin tocar nada
    if (row.user_id) {
      const u = await pool.query('SELECT id, email, role, active FROM users WHERE id=$1', [row.user_id])
      if (u.rows.length) return res.json({ ok: true, ya_existia: true, user: u.rows[0] })
    }

    // Buscar si ya existe usuario con ese email
    const existing = await pool.query('SELECT id, role, name FROM users WHERE LOWER(email)=LOWER($1)', [row.email])
    if (existing.rows.length) {
      const u = existing.rows[0]
      // Solo subir de rol, nunca bajar (coordinador/usuario conservan su rol)
      if (!superiorOIgual(u.role, 'operador')) {
        await pool.query(`UPDATE users SET role='operador' WHERE id=$1`, [u.id])
      }
      await pool.query('UPDATE operadores_pool SET user_id=$1 WHERE id=$2', [u.id, id])
      return res.json({ ok: true, ya_existia: true, rol_conservado: u.role, user: { id: u.id, email: row.email, name: u.name } })
    }

    // Crear cuenta nueva con rol operador
    const partes    = row.nombre.trim().split(/\s+/)
    const iniciales = partes.map(p => p[0]).join('').toUpperCase().slice(0, 3)
    const tempPass  = `${iniciales}${String(Math.floor(1000 + Math.random() * 9000))}`
    const hash      = require('bcryptjs').hashSync(tempPass, 10)
    const nombre    = partes.slice(0, 2).join(' ')
    const nu = await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,'operador') RETURNING id`,
      [row.email, hash, nombre]
    )
    await pool.query('UPDATE operadores_pool SET user_id=$1 WHERE id=$2', [nu.rows[0].id, id])
    res.json({ ok: true, ya_existia: false, password_temporal: tempPass, user: { id: nu.rows[0].id, email: row.email, name: nombre } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Desactivar cuenta de operador
app.delete('/api/operadores-pool/:id/cuenta', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const op = await pool.query('SELECT user_id FROM operadores_pool WHERE id=$1', [req.params.id])
    if (!op.rows.length || !op.rows[0].user_id) return res.status(404).json({ error: 'Sin cuenta' })
    await pool.query('UPDATE users SET active=false WHERE id=$1', [op.rows[0].user_id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── MIS SERVICIOS (operador) ────────────────────────────────
// Busca case-insensitive en operadores JSONB + campos de personal del servicio
const MATCH_NOMBRE_SQL = `(
  EXISTS (SELECT 1 FROM jsonb_each_text(s.operadores) kv WHERE LOWER(kv.value) = LOWER($1))
  OR LOWER(s.responsable)    = LOWER($1)
  OR LOWER(s.jefe_tecnico)   = LOWER($1)
  OR LOWER(s.realizador)     = LOWER($1)
  OR LOWER(s.productor)      = LOWER($1)
)`

app.get('/api/mis-servicios', requireAuth(['operador', 'usuario']), async (req, res) => {
  try {
    const opRow = await pool.query('SELECT nombre FROM operadores_pool WHERE user_id=$1', [req.user.id])
    if (!opRow.rows.length) return res.json([])
    const nombre = opRow.rows[0].nombre

    const r = await pool.query(`
      SELECT s.id, s.jornada, s.encuentro, s.fecha, s.hora_partido, s.hora_montaje_um,
             s.responsable, s.jefe_tecnico, s.realizador, s.productor,
             s.um, s.tipo_servicio, s.operadores, s.status
      FROM servicios s
      WHERE s.status NOT IN ('borrador')
        AND ${MATCH_NOMBRE_SQL}
      ORDER BY s.fecha DESC
    `, [nombre])
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── DETALLE SERVICIO PARA OPERADOR ──────────────────────────
app.get('/api/mis-servicios/:id', requireAuth(['operador', 'usuario']), async (req, res) => {
  try {
    const opRow = await pool.query('SELECT nombre FROM operadores_pool WHERE user_id=$1', [req.user.id])
    if (!opRow.rows.length) return res.status(403).json({ error: 'Sin acceso' })
    const nombre = opRow.rows[0].nombre

    const r = await pool.query(`
      SELECT s.*,
             array_agg(json_build_object('id',d.id,'nombre',d.nombre,'tipo',d.tipo))
               FILTER (WHERE d.id IS NOT NULL) AS documentos
      FROM servicios s
      LEFT JOIN documentos d ON d.servicio_id = s.id
      WHERE s.id = $1 AND ${MATCH_NOMBRE_SQL.replace(/\$1/g, '$2')}
      GROUP BY s.id
    `, [req.params.id, nombre])
    if (!r.rows.length) return res.status(403).json({ error: 'Sin acceso' })
    res.json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── VINCULAR CUENTA EXISTENTE A OPERADOR ────────────────────
app.post('/api/operadores-pool/:id/vincular-cuenta', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email requerido' })

    const op = await pool.query('SELECT * FROM operadores_pool WHERE id=$1', [req.params.id])
    if (!op.rows.length) return res.status(404).json({ error: 'Operador no encontrado' })
    if (!op.rows[0].plantilla) return res.status(400).json({ error: 'Solo operadores de plantilla' })

    const user = await pool.query('SELECT id, name, email, role FROM users WHERE LOWER(email)=LOWER($1)', [email.trim()])
    if (!user.rows.length) return res.status(404).json({ error: `No existe ningún usuario con email ${email}` })

    const u = user.rows[0]
    // Jerarquía: solo subir de rol, nunca bajar
    // coordinador/usuario conservan su rol tal cual
    if (!superiorOIgual(u.role, 'operador')) {
      await pool.query(`UPDATE users SET role='operador' WHERE id=$1`, [u.id])
    }
    await pool.query('UPDATE operadores_pool SET user_id=$1 WHERE id=$2', [u.id, req.params.id])
    if (!op.rows[0].email) {
      await pool.query('UPDATE operadores_pool SET email=$1 WHERE id=$2', [u.email, req.params.id])
    }
    const rolFinal = superiorOIgual(u.role, 'operador') ? u.role : 'operador'
    res.json({ ok: true, rol_conservado: u.role, rol_final: rolFinal, user: { id: u.id, name: u.name, email: u.email } })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── MODELOS CÁMARA ROUTES ──────────────────────────────────

app.get('/api/modelos-camara', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const r = await pool.query('SELECT id, tipo, modelo FROM modelos_camara WHERE activo=true ORDER BY tipo, modelo')
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/modelos-camara', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { tipo, modelo } = req.body
    const r = await pool.query(
      'INSERT INTO modelos_camara (tipo, modelo) VALUES ($1, $2) ON CONFLICT (tipo, modelo) DO UPDATE SET activo=true RETURNING id',
      [tipo, modelo.trim()]
    )
    res.json({ ok: true, id: r.rows[0].id })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/modelos-camara/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { modelo } = req.body
    await pool.query('UPDATE modelos_camara SET modelo=$1 WHERE id=$2', [modelo.trim(), req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/modelos-camara/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    await pool.query('UPDATE modelos_camara SET activo=false WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── SERVICIOS ROUTES ───────────────────────────────────────

// Crear servicio (coordinador: pasos 1-3 + asignación)
app.post('/api/servicios', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { match, selectedCams, operators, assigned_to, tipo_servicio, cam_models, vehiculo_ids } = req.body
    const r = await pool.query(`
      INSERT INTO servicios (
        tipo_servicio, jornada, encuentro, fecha, hora_partido, hora_montaje_um,
        responsable, um, jefe_tecnico, tel_jefe_tecnico, realizador, tel_realizador,
        productor, tel_productor, horario_md1,
        operadores, camaras_activas, cam_models, assigned_to, created_by, observaciones
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING id
    `, [
      tipo_servicio,
      match.jornada, match.encuentro, match.fecha || null,
      match.hora_partido, match.hora_montaje_um,
      match.responsable, match.um, match.jefe_tecnico, match.tel_jefe_tecnico||'',
      match.realizador, match.tel_realizador||'',
      match.productor, match.tel_productor||'', match.horario_md1,
      JSON.stringify(operators), JSON.stringify(selectedCams),
      JSON.stringify(cam_models || {}),
      assigned_to, req.user.id, match.observaciones||''
    ])
    const serviceId = r.rows[0].id
    const vids = Array.isArray(vehiculo_ids) ? vehiculo_ids : []
    if (vids.length > 0) {
      await Promise.all(vids.map(vid =>
        pool.query('INSERT INTO servicio_vehiculos VALUES ($1,$2) ON CONFLICT DO NOTHING', [serviceId, vid])
      ))
    }
    // Guardar/actualizar directorio de personal técnico para reutilización futura
    await Promise.all([
      upsertPersonalTecnico('jefe_tecnico', match.jefe_tecnico, match.tel_jefe_tecnico),
      upsertPersonalTecnico('realizador',   match.realizador,   match.tel_realizador),
      upsertPersonalTecnico('productor',    match.productor,    match.tel_productor),
    ])
    res.json({ ok: true, id: serviceId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Listar servicios (coordinador: todos · usuario: solo los suyos)
app.get('/api/servicios', requireAuth(), async (req, res) => {
  try {
    let query, params
    if (req.user.role === 'coordinador' || req.user.role === 'supervisor' || req.user.role === 'readonly') {
      query = `
        SELECT s.*, u.name as assigned_to_name, c.name as created_by_name,
               COALESCE(json_agg(json_build_object('id',v.id,'referencia',v.referencia,'matricula',v.matricula,'modelo',v.modelo))
                 FILTER (WHERE v.id IS NOT NULL), '[]') as vehiculos
        FROM servicios s
        LEFT JOIN users u ON s.assigned_to = u.id
        LEFT JOIN users c ON s.created_by = c.id
        LEFT JOIN servicio_vehiculos sv ON sv.servicio_id = s.id
        LEFT JOIN vehiculos v ON v.id = sv.vehiculo_id
        GROUP BY s.id, u.name, c.name
        ORDER BY s.created_at DESC`
      params = []
    } else {
      query = `
        SELECT s.*, u.name as assigned_to_name, c.name as created_by_name,
               COALESCE(json_agg(json_build_object('id',v.id,'referencia',v.referencia,'matricula',v.matricula,'modelo',v.modelo))
                 FILTER (WHERE v.id IS NOT NULL), '[]') as vehiculos
        FROM servicios s
        LEFT JOIN users u ON s.assigned_to = u.id
        LEFT JOIN users c ON s.created_by = c.id
        LEFT JOIN servicio_vehiculos sv ON sv.servicio_id = s.id
        LEFT JOIN vehiculos v ON v.id = sv.vehiculo_id
        WHERE s.assigned_to = $1
        GROUP BY s.id, u.name, c.name
        ORDER BY s.created_at DESC`
      params = [req.user.id]
    }
    const r = await pool.query(query, params)
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Obtener servicio completo
app.get('/api/servicios/:id', requireAuth(), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.*, u.name as assigned_to_name, c.name as created_by_name,
             COALESCE(json_agg(json_build_object('id',v.id,'referencia',v.referencia,'matricula',v.matricula,'modelo',v.modelo))
               FILTER (WHERE v.id IS NOT NULL), '[]') as vehiculos
      FROM servicios s
      LEFT JOIN users u ON s.assigned_to = u.id
      LEFT JOIN users c ON s.created_by = c.id
      LEFT JOIN servicio_vehiculos sv ON sv.servicio_id = s.id
      LEFT JOIN vehiculos v ON v.id = sv.vehiculo_id
      WHERE s.id = $1
      GROUP BY s.id, u.name, c.name
    `, [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
    const servicio = r.rows[0]
    if (req.user.role === 'usuario' && servicio.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    // readonly: can view any service
    res.json(servicio)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Hoja de servicio en PDF (descarga directa)
app.get('/api/servicios/:id/hoja-pdf', requireAuth(), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.*, u.name as assigned_to_name
      FROM servicios s
      LEFT JOIN users u ON s.assigned_to = u.id
      WHERE s.id = $1
    `, [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
    const sv = r.rows[0]
    const vr = await pool.query(`
      SELECT v.referencia, v.matricula, v.modelo
      FROM servicio_vehiculos sv JOIN vehiculos v ON v.id = sv.vehiculo_id
      WHERE sv.servicio_id = $1
      ORDER BY v.referencia ASC
    `, [req.params.id])
    const vehiculosData = vr.rows
    // Operadores y usuarios del pool tienen acceso si aparecen en el servicio
    if (req.user.role === 'usuario' && sv.assigned_to !== req.user.id) {
      const opRow = await pool.query('SELECT nombre FROM operadores_pool WHERE user_id=$1', [req.user.id])
      if (!opRow.rows.length) return res.status(403).json({ error: 'Sin permisos' })
      const nombre = opRow.rows[0].nombre
      const ops = sv.operadores || {}
      const enServicio = Object.values(ops).some(v => v?.toLowerCase() === nombre.toLowerCase())
        || [sv.responsable, sv.jefe_tecnico, sv.realizador, sv.productor].some(v => v?.toLowerCase() === nombre.toLowerCase())
      if (!enServicio) return res.status(403).json({ error: 'Sin permisos' })
    }

    const fmtD = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—'
    const ops = sv.operadores || {}
    const camModels = sv.cam_models || {}
    const camarasActivas = sv.camaras_activas || {}

    // ── Sort cameras by catalog order, then filter active ones ──
    const activeCamIds = CAMERA_ORDER.filter(id => camarasActivas[id])

    // ── Build ordered operator list with proper labels ──
    const opList = OPERATOR_ROLES_ORDERED.filter(r => ops[r.key])

    const filename = `hoja-servicio-${sv.id}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    doc.pipe(res)

    const PW = doc.page.width   // 595.28
    const PH = doc.page.height  // 841.89
    const M = 50
    const CW = PW - 2 * M
    const CONTENT_BOTTOM = PH - 55 // content must not go below this (footer lives at PH-40)

    let y = 50

    // ── FOOTER ──
    const drawFooter = () => {
      const fy = PH - 30
      doc.fontSize(8).font('Helvetica').fillColor('#bbbbbb')
        .text('MEDIAPRO · Cámaras Especiales · Hoja de servicio', M, fy, { width: CW * 0.55, lineBreak: false })
      doc.fontSize(8).font('Helvetica').fillColor('#bbbbbb')
        .text(`Generado: ${new Date().toLocaleString('es-ES')}`, M + CW * 0.45, fy, { width: CW * 0.55, align: 'right', lineBreak: false })
    }

    // ── PAGE BREAK: draw footer then open new page ──
    const addPage = () => {
      drawFooter()
      doc.addPage()
      y = M
    }

    // ── CHECK BREAK before drawing neededHeight points ──
    const checkBreak = (neededHeight) => {
      if (y + neededHeight > CONTENT_BOTTOM) addPage()
    }

    // ── HEADER (first page) ──
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#111111')
      .text(sv.encuentro || '—', M, y)
    doc.fontSize(11).font('Helvetica').fillColor('#666666')
      .text(`${sv.jornada || ''} · ${fmtD(sv.fecha)}`, M, y + 24)
    doc.fontSize(9).fillColor('#999999')
      .text('MEDIAPRO · CCEE', M, y, { align: 'right', width: CW })
      .text('Hoja de servicio · Temporada 25/26', M, y + 12, { align: 'right', width: CW })
    doc.fillColor('#000000')
    doc.moveTo(M, y + 45).lineTo(PW - M, y + 45).strokeColor('#cccccc').stroke()
    y += 60

    // ── SECTION TITLE ──
    const sec = (title) => {
      checkBreak(30)
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#888888')
        .text(title.toUpperCase(), M, y)
      doc.moveTo(M, y + 12).lineTo(PW - M, y + 12).strokeColor('#dddddd').stroke()
      y += 20
      doc.fillColor('#000000')
    }

    // ── 3-COL GRID OF CELLS ──
    const grid = (items) => {
      const CW3 = (CW - 10) / 3
      const RH = 36
      const rows = Math.ceil(items.length / 3)
      checkBreak(rows * RH + 8)
      items.forEach(([label, val], i) => {
        const col = i % 3, row = Math.floor(i / 3)
        const cx = M + col * (CW3 + 5), cy = y + row * RH
        doc.rect(cx, cy, CW3, RH - 4).fillAndStroke('#f7f7f7', '#e8e8e8')
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#aaaaaa')
          .text((label || '').toUpperCase(), cx + 6, cy + 5, { width: CW3 - 12, lineBreak: false })
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#111111')
          .text(String(val || '—').substring(0, 32), cx + 6, cy + 17, { width: CW3 - 12, lineBreak: false })
      })
      y += rows * RH + 8
      doc.fillColor('#000000')
    }

    // ── DATOS DEL SERVICIO ──
    sec('Datos del servicio')
    grid([
      ['Jornada', sv.jornada], ['Encuentro', sv.encuentro], ['Fecha', fmtD(sv.fecha)],
      ['Hora partido', sv.hora_partido], ['Hora Montaje UM', sv.hora_montaje_um],
      ['Horario Montaje UM MD-1', sv.horario_md1],
    ])

    // ── EQUIPO TÉCNICO ──
    sec('Equipo técnico')
    grid([
      ['Responsable CCEE', sv.responsable], ['Unidad Móvil', sv.um], ['', ''],
      ['J. Técnico UM', sv.jefe_tecnico], ['Teléfono', sv.tel_jefe_tecnico || '—'], ['', ''],
      ['Realizador', sv.realizador], ['Teléfono', sv.tel_realizador || '—'], ['', ''],
      ['Productor', sv.productor], ['Teléfono', sv.tel_productor || '—'], ['', ''],
    ])

    // ── VEHÍCULOS ──
    if (vehiculosData.length > 0) {
      sec(`Vehículos asignados (${vehiculosData.length})`)
      for (const v of vehiculosData) {
        grid([
          ['Referencia', v.referencia],
          ['Matrícula',  v.matricula],
          ['Modelo',     v.modelo || '—'],
        ])
      }
    }

    // ── OBSERVACIONES ──
    if (sv.observaciones) {
      sec('Observaciones')
      checkBreak(40)
      doc.rect(M, y, CW, 2).fill('#e8e8e8')
      y += 6
      doc.fontSize(10).font('Helvetica').fillColor('#222222')
        .text(sv.observaciones, M + 6, y, { width: CW - 12 })
      y = doc.y + 14
    }

    // ── CÁMARAS Y MODELOS ──
    if (activeCamIds.length > 0) {
      sec(`Cámaras activas · ${activeCamIds.length}`)
      activeCamIds.forEach(id => {
        checkBreak(24)
        const camLabel = CAMERA_LABELS[id] || id
        const models = camModels[id]
        const modelStr = models ? Object.values(models).filter(Boolean).join(' · ') : ''
        doc.rect(M, y, CW, 20).fillAndStroke('#f0f0f0', '#dddddd')
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#111111')
          .text(camLabel, M + 6, y + 6, { width: CW / 2, lineBreak: false })
        if (modelStr) {
          doc.fontSize(9).font('Helvetica').fillColor('#555555')
            .text(modelStr, M + CW / 2, y + 7, { width: CW / 2 - 6, align: 'right', lineBreak: false })
        }
        doc.fillColor('#000000')
        y += 22
      })
      y += 4
    }

    // ── OPERADORES ──
    if (opList.length > 0) {
      sec('Operadores asignados')
      opList.forEach(({ key, label }, i) => {
        checkBreak(20)
        if (i % 2 === 0) doc.rect(M, y, CW, 18).fill('#fafafa')
        doc.fontSize(9).font('Helvetica').fillColor('#777777')
          .text(label, M + 6, y + 5, { width: 160, lineBreak: false })
        doc.font('Helvetica-Bold').fillColor('#111111')
          .text(String(ops[key]), M + 170, y + 5, { width: CW - 180, lineBreak: false })
        doc.moveTo(M, y + 18).lineTo(PW - M, y + 18).strokeColor('#eeeeee').stroke()
        doc.fillColor('#000000')
        y += 18
      })
    }

    // ── FOOTER on last page ──
    drawFooter()

    doc.end()
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
})

// ── INFORMES ROUTES ────────────────────────────────────────

// Guardar informe (usuario, ligado a un servicio — soporta draft/borrador)
app.post('/api/informes', requireAuth(['usuario']), async (req, res) => {
  try {
    const { servicio_id, logistica, camData, incidenciasGraves, incidenciasLeves, draft } = req.body
    const isDraft = !!draft
    const newStatus = isDraft ? 'borrador' : 'enviado'

    // Verificar que el servicio está asignado a este usuario
    const sv = await pool.query(
      'SELECT * FROM servicios WHERE id = $1 AND assigned_to = $2',
      [servicio_id, req.user.id]
    )
    if (sv.rows.length === 0) {
      return res.status(403).json({ error: 'Servicio no asignado a este usuario' })
    }
    const s = sv.rows[0]

    // Upsert: si ya existe un borrador para este servicio+usuario, actualizarlo
    const existing = await pool.query(
      "SELECT id FROM informes WHERE servicio_id=$1 AND submitted_by=$2 AND status='borrador'",
      [servicio_id, req.user.id]
    )

    let informeId
    if (existing.rows.length > 0) {
      // Actualizar borrador existente
      const upd = await pool.query(`
        UPDATE informes SET
          logistica=$1, cam_data=$2, incidencias_graves=$3, incidencias_leves=$4, status=$5
        WHERE id=$6 RETURNING id
      `, [
        JSON.stringify(logistica), JSON.stringify(camData),
        incidenciasGraves, incidenciasLeves, newStatus,
        existing.rows[0].id
      ])
      informeId = upd.rows[0].id
    } else {
      // Crear nuevo informe
      const result = await pool.query(`
        INSERT INTO informes (
          jornada, encuentro, fecha, hora_partido, hora_montaje_um,
          responsable, um, jefe_tecnico, realizador, productor, horario_md1,
          operadores, camaras_activas, logistica, cam_data,
          incidencias_graves, incidencias_leves,
          servicio_id, submitted_by, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        RETURNING id
      `, [
        s.jornada, s.encuentro, s.fecha, s.hora_partido, s.hora_montaje_um,
        s.responsable, s.um, s.jefe_tecnico, s.realizador, s.productor, s.horario_md1,
        s.operadores, s.camaras_activas,
        JSON.stringify(logistica), JSON.stringify(camData),
        incidenciasGraves, incidenciasLeves,
        servicio_id, req.user.id, newStatus
      ])
      informeId = result.rows[0].id
    }

    // Solo marcar como completado si es envío definitivo
    if (!isDraft) {
      await pool.query("UPDATE servicios SET status='completado' WHERE id=$1", [servicio_id])
    }

    res.json({ ok: true, id: informeId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Listar informes (coordinador: solo enviados · usuario: todos los suyos incl. borradores)
app.get('/api/informes', requireAuth(), async (req, res) => {
  try {
    let query = `
      SELECT id, jornada, encuentro, fecha, hora_partido,
             responsable, um, incidencias_graves, incidencias_leves,
             created_at, servicio_id, submitted_by, status
      FROM informes`
    const params = []
    if (req.user.role === 'coordinador' || req.user.role === 'supervisor') {
      query += " WHERE status='enviado'"
    } else {
      query += ' WHERE submitted_by = $1'
      params.push(req.user.id)
    }
    query += ' ORDER BY created_at DESC'
    const r = await pool.query(query, params)
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Obtener informe completo
app.get('/api/informes/:id', requireAuth(), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM informes WHERE id = $1', [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
    const informe = r.rows[0]
    if (req.user.role === 'usuario' && informe.submitted_by !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    res.json(informe)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Actualizar servicio (coordinador)
app.put('/api/servicios/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { match, selectedCams, operators, assigned_to, tipo_servicio, cam_models, vehiculo_ids } = req.body
    await pool.query(`
      UPDATE servicios SET
        tipo_servicio=$1, jornada=$2, encuentro=$3, fecha=$4, hora_partido=$5,
        hora_montaje_um=$6, responsable=$7, um=$8, jefe_tecnico=$9, tel_jefe_tecnico=$10,
        realizador=$11, tel_realizador=$12, productor=$13, tel_productor=$14,
        horario_md1=$15, operadores=$16, camaras_activas=$17,
        cam_models=$18, assigned_to=$19, observaciones=$20
      WHERE id=$21
    `, [
      tipo_servicio,
      match.jornada, match.encuentro, match.fecha || null,
      match.hora_partido, match.hora_montaje_um,
      match.responsable, match.um, match.jefe_tecnico, match.tel_jefe_tecnico||'',
      match.realizador, match.tel_realizador||'',
      match.productor, match.tel_productor||'', match.horario_md1,
      JSON.stringify(operators), JSON.stringify(selectedCams),
      JSON.stringify(cam_models || {}),
      assigned_to, match.observaciones||'', req.params.id
    ])
    // Reemplazar vehículos asignados
    const vids = Array.isArray(vehiculo_ids) ? vehiculo_ids : []
    await pool.query('DELETE FROM servicio_vehiculos WHERE servicio_id=$1', [req.params.id])
    if (vids.length > 0) {
      await Promise.all(vids.map(vid =>
        pool.query('INSERT INTO servicio_vehiculos VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, vid])
      ))
    }
    // Actualizar directorio de personal técnico
    await Promise.all([
      upsertPersonalTecnico('jefe_tecnico', match.jefe_tecnico, match.tel_jefe_tecnico),
      upsertPersonalTecnico('realizador',   match.realizador,   match.tel_realizador),
      upsertPersonalTecnico('productor',    match.productor,    match.tel_productor),
    ])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Eliminar servicio (coordinador)
app.delete('/api/servicios/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    await pool.query('DELETE FROM servicios WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── DOCUMENTOS ROUTES ──────────────────────────────────────

// Subir documento a un servicio (coordinador)
app.post('/api/servicios/:id/documentos', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const { descripcion, nombre, tipo, datos, tamano } = req.body
    if (!descripcion || !datos) return res.status(400).json({ error: 'Faltan campos obligatorios' })
    const r = await pool.query(
      `INSERT INTO documentos (servicio_id, descripcion, nombre, tipo, datos, tamano)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [req.params.id, descripcion, nombre || '', tipo || '', datos, tamano || 0]
    )
    res.json({ ok: true, id: r.rows[0].id })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Listar documentos de un servicio — solo metadatos, sin datos binarios (autenticado)
app.get('/api/servicios/:id/documentos', requireAuth(), async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, descripcion, nombre, tipo, tamano, created_at FROM documentos WHERE servicio_id=$1 ORDER BY created_at ASC',
      [req.params.id]
    )
    res.json(r.rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Obtener documento completo con datos (autenticado)
app.get('/api/documentos/:id', requireAuth(), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM documentos WHERE id=$1', [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
    res.json(r.rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Eliminar documento (coordinador)
app.delete('/api/documentos/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    await pool.query('DELETE FROM documentos WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Eliminar informe (coordinador · resetea el servicio a pendiente)
app.delete('/api/informes/:id', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const r = await pool.query('SELECT servicio_id FROM informes WHERE id = $1', [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'Informe no encontrado' })
    const { servicio_id } = r.rows[0]
    await pool.query('DELETE FROM informes WHERE id = $1', [req.params.id])
    if (servicio_id) {
      await pool.query("UPDATE servicios SET status = 'pendiente' WHERE id = $1", [servicio_id])
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Stats para dashboard (solo coordinador)
app.get('/api/stats', requireAuth(['coordinador','supervisor']), async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM informes')
    const porJornada = await pool.query(`
      SELECT jornada, COUNT(*) as partidos,
             SUM(incidencias_graves) as graves,
             SUM(incidencias_leves) as leves
      FROM informes GROUP BY jornada ORDER BY jornada
    `)
    const ultimos = await pool.query(`
      SELECT jornada, encuentro, incidencias_graves, incidencias_leves, created_at
      FROM informes ORDER BY created_at DESC LIMIT 5
    `)
    const pendientes = await pool.query(`SELECT COUNT(*) FROM servicios WHERE status = 'pendiente'`)
    res.json({
      total: parseInt(total.rows[0].count),
      pendientes: parseInt(pendientes.rows[0].count),
      porJornada: porJornada.rows,
      ultimos: ultimos.rows
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── ANALISIS ROUTES ─────────────────────────────────────────

// Obtener todos los informes enviados para análisis (coordinador)
app.get('/api/analisis', requireAuth(['supervisor']), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT i.*, u.name as submitted_by_name, s.cam_models, s.tipo_servicio,
             COALESCE((
               SELECT json_agg(json_build_object('referencia',v.referencia,'matricula',v.matricula,'modelo',v.modelo))
               FROM servicio_vehiculos sv2 JOIN vehiculos v ON v.id=sv2.vehiculo_id
               WHERE sv2.servicio_id=s.id
             ), '[]') as vehiculos
      FROM informes i
      LEFT JOIN users u ON u.id = i.submitted_by
      LEFT JOIN servicios s ON s.id = i.servicio_id
      WHERE i.status = 'enviado'
      ORDER BY i.jornada ASC, i.created_at ASC
    `)
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Grupos de cámaras para analytics (bloques, no posiciones individuales)
const CAM_BLOCK_MAP = {
  STEADY_L:'Steadycam', STEADY_R:'Steadycam', STEADY_PERSO:'Steadycam',
  RF_L:'RF', RF_R:'RF', RF_PERSO:'RF',
  KIT_CINEMA_L:'Cinema', KIT_CINEMA_R:'Cinema',
  POLECAM_L:'Polecam', POLECAM_R:'Polecam',
  MINICAM_L:'Minicám.', MINICAM_R:'Minicám.',
  PTZ_1:'PTZ', PTZ_2:'PTZ',
}
const camBlock = id => CAM_BLOCK_MAP[id] || CAMERA_LABELS[id] || id

// Exportar informes a Excel (coordinador)
app.post('/api/analisis/export', requireAuth(['supervisor']), async (req, res) => {
  try {
    const { ids } = req.body
    let query
    let params = []
    if (ids && ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
      query = `
        SELECT i.*, u.name as submitted_by_name, s.cam_models
        FROM informes i
        LEFT JOIN users u ON u.id = i.submitted_by
        LEFT JOIN servicios s ON s.id = i.servicio_id
        WHERE i.id IN (${placeholders}) AND i.status = 'enviado'
        ORDER BY i.jornada ASC, i.created_at ASC
      `
      params = ids
    } else {
      query = `
        SELECT i.*, u.name as submitted_by_name, s.cam_models
        FROM informes i
        LEFT JOIN users u ON u.id = i.submitted_by
        LEFT JOIN servicios s ON s.id = i.servicio_id
        WHERE i.status = 'enviado'
        ORDER BY i.jornada ASC, i.created_at ASC
      `
    }
    const r = await pool.query(query, params)
    const informes = r.rows

    // Hoja 1: resumen por informe
    const resumen = informes.map(inf => ({
      'Jornada':            inf.jornada || '',
      'Encuentro':          inf.encuentro || '',
      'Fecha':              inf.fecha ? new Date(inf.fecha).toLocaleDateString('es-ES') : '',
      'UM':                 inf.um || '',
      'Técnico':            inf.submitted_by_name || '',
      'Jefe Técnico UM':    inf.jefe_tecnico || '',
      'Realizador':         inf.realizador || '',
      'Productor':          inf.productor || '',
      'Incidencias Graves': inf.incidencias_graves || 0,
      'Incidencias Leves':  inf.incidencias_leves || 0,
    }))

    // Hoja 2: detalle por bloque de cámara
    const porCamara = []
    for (const inf of informes) {
      const camData = inf.cam_data || {}
      const camarasActivas = inf.camaras_activas || {}
      const camModels = inf.cam_models || {}
      for (const [camId, activa] of Object.entries(camarasActivas)) {
        if (!activa) continue
        const cam = camData[camId] || {}
        const modelRaw = camModels[camId] || {}
        const modeloStr = Object.values(modelRaw).filter(Boolean).join(', ')
        const items = cam.items || {}
        const incG = Object.values(items).filter(v => v === 'G').length
        const incL = Object.values(items).filter(v => v === 'L').length
        const itemsKO = Object.entries(items).filter(([, v]) => v === 'G' || v === 'L').map(([k, v]) => `${k}:${v}`).join(', ')
        porCamara.push({
          'Jornada':   inf.jornada || '',
          'Encuentro': inf.encuentro || '',
          'UM':        inf.um || '',
          'Técnico':   inf.submitted_by_name || '',
          'Bloque':    camBlock(camId),
          'Cámara':    CAMERA_LABELS[camId] || camId,
          'Modelo':    modeloStr,
          'Inc. Graves (items)': incG,
          'Inc. Leves (items)':  incL,
          'Items KO':  itemsKO,
        })
      }
    }

    // Hoja 3: estadísticas por modelo de equipo
    const modelMap = {}
    for (const inf of informes) {
      const camData = inf.cam_data || {}
      const camarasActivas = inf.camaras_activas || {}
      const camModels = inf.cam_models || {}
      for (const [camId, activa] of Object.entries(camarasActivas)) {
        if (!activa) continue
        const modelRaw = camModels[camId] || {}
        const modeloStr = Object.values(modelRaw).filter(Boolean).join(', ') || '(sin modelo)'
        const bloque = camBlock(camId)
        const key = `${bloque}||${modeloStr}`
        const cam = camData[camId] || {}
        const items = cam.items || {}
        const incG = Object.values(items).filter(v => v === 'G').length
        const incL = Object.values(items).filter(v => v === 'L').length
        if (!modelMap[key]) modelMap[key] = { 'Bloque': bloque, 'Modelo': modeloStr, 'Usos': 0, 'Inc. Graves': 0, 'Inc. Leves': 0 }
        modelMap[key]['Usos']++
        modelMap[key]['Inc. Graves'] += incG
        modelMap[key]['Inc. Leves'] += incL
      }
    }
    const porModelo = Object.values(modelMap).sort((a, b) => a.Bloque.localeCompare(b.Bloque) || b['Usos'] - a['Usos'])

    // Hoja 4: detalle por operador
    const porOperador = []
    for (const inf of informes) {
      const operadores = inf.operadores || {}
      for (const rol of OPERATOR_ROLES_ORDERED) {
        const nombre = operadores[rol.key]
        if (!nombre) continue
        porOperador.push({
          'Jornada':   inf.jornada || '',
          'Encuentro': inf.encuentro || '',
          'UM':        inf.um || '',
          'Técnico':   inf.submitted_by_name || '',
          'Rol':       rol.label,
          'Operador':  nombre,
        })
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen),     'Informes')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porCamara),   'Por Cámara')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porModelo),   'Por Modelo')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porOperador), 'Operadores')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Disposition', 'attachment; filename="analisis-ccee.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── EXPORTAR INCIDENCIAS ─────────────────────────────────────────────────────
app.post('/api/export/incidencias', requireAuth(['supervisor', 'readonly']), async (req, res) => {
  try {
    const { ids } = req.body
    let query, params = []
    if (ids && ids.length > 0) {
      const ph = ids.map((_, i) => `$${i + 1}`).join(',')
      query = `SELECT * FROM informes WHERE id IN (${ph}) AND status='enviado' ORDER BY jornada ASC, fecha ASC`
      params = ids
    } else {
      query = `SELECT * FROM informes WHERE status='enviado' ORDER BY jornada ASC, fecha ASC`
    }
    const r = await pool.query(query, params)

    const data = r.rows.map(inf => {
      const camData = inf.cam_data || {}
      const camAct  = inf.camaras_activas || {}
      const lines   = []
      for (const camId of CAMERA_ORDER) {
        if (!camAct[camId]) continue
        const cam     = camData[camId] || {}
        const koItems = Object.entries(cam.items || {})
          .filter(([, v]) => v === 'G' || v === 'L')
          .map(([k, v]) => `${k}(${v})`)
        if (koItems.length) lines.push(`${CAMERA_LABELS[camId] || camId}: ${koItems.join(', ')}`)
        if (cam.incidencias) lines.push(cam.incidencias)
      }
      if ((inf.logistica || {}).incidencias) lines.push(`Log: ${inf.logistica.incidencias}`)
      const parts = (inf.encuentro || ' vs ').split(' vs ')
      return {
        'Jornada':     inf.jornada || '',
        'Fecha':       inf.fecha ? new Date(inf.fecha).toLocaleDateString('es-ES') : '',
        'KO':          inf.hora_partido || '',
        'Local':       (parts[0] || '').trim().toUpperCase(),
        'Visitante':   (parts[1] || '').trim().toUpperCase(),
        'Incidencias': lines.length ? lines.join(' | ') : 'SIN INCIDENCIAS',
      }
    })

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.length ? data : [{ Info: 'Sin datos' }]), 'Incidencias')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    res.setHeader('Content-Disposition', 'attachment; filename="incidencias-ccee.xlsx"')
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.send(buf)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── INFORME INCIDENCIAS PDF ───────────────────────────────────────────────────
app.post('/api/export/incidencias-pdf', requireAuth(['supervisor', 'readonly']), async (req, res) => {
  try {
    const { ids, titulo } = req.body
    let query, params = []
    if (ids && ids.length > 0) {
      const ph = ids.map((_, i) => `$${i + 1}`).join(',')
      query = `SELECT * FROM informes WHERE id IN (${ph}) AND status='enviado' ORDER BY jornada ASC, fecha ASC, encuentro ASC`
      params = ids
    } else {
      query = `SELECT * FROM informes WHERE status='enviado' ORDER BY jornada ASC, fecha ASC, encuentro ASC`
    }
    const r = await pool.query(query, params)
    const informes = r.rows

    // Build incident text
    const buildLines = (inf) => {
      const camData = inf.cam_data || {}
      const camAct  = inf.camaras_activas || {}
      const lines   = []
      for (const camId of CAMERA_ORDER) {
        if (!camAct[camId]) continue
        const cam     = camData[camId] || {}
        const koItems = Object.entries(cam.items || {})
          .filter(([, v]) => v === 'G' || v === 'L')
          .map(([k, v]) => `${k} (${v === 'G' ? 'Grave' : 'Leve'})`)
        if (koItems.length) lines.push({ label: CAMERA_LABELS[camId] || camId, text: koItems.join(', ') })
        if (cam.incidencias) lines.push({ label: null, text: cam.incidencias })
      }
      if ((inf.logistica || {}).incidencias) lines.push({ label: 'Logística', text: inf.logistica.incidencias })
      return lines
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="informe-incidencias.pdf"')

    const doc = new PDFDocument({ margin: 0, size: 'A4' })
    doc.pipe(res)

    const PW = doc.page.width   // 595.28
    const PH = doc.page.height  // 841.89
    const M  = 45
    const CW = PW - 2 * M

    const C_BLUE   = '#2B75B4'
    const C_CYAN   = '#52C7D7'
    const C_DARK   = '#1a2a3a'
    const C_GREY   = '#6b7280'
    const C_LGREY  = '#f3f6f9'
    const C_BORDER = '#d1dce8'
    const C_RED    = '#dc2626'
    const C_AMBER  = '#d97706'
    const C_GREEN  = '#16a34a'

    const fmtD = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—'

    // ── FOOTER ──
    const drawFooter = (pageNum) => {
      const fy = PH - 28
      doc.rect(M, fy - 8, CW, 0.5).fill(C_BORDER)
      doc.fontSize(7.5).font('Helvetica').fillColor(C_GREY)
        .text('MEDIAPRO · Cámaras Especiales · Informe de Incidencias', M, fy, { width: CW * 0.6, lineBreak: false })
      doc.fontSize(7.5).font('Helvetica').fillColor(C_GREY)
        .text(`Pág. ${pageNum} · ${new Date().toLocaleString('es-ES')}`, M, fy, { width: CW, align: 'right', lineBreak: false })
    }

    let pageNum = 1
    let y = M

    const checkBreak = (needed) => {
      if (y + needed > PH - 50) {
        drawFooter(pageNum++)
        doc.addPage()
        y = M
      }
    }

    // ── HEADER ──
    doc.rect(0, 0, PW, 70).fill(C_BLUE)
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#ffffff')
      .text('INFORME DE INCIDENCIAS', M, 18, { width: CW - 120, lineBreak: false })
    doc.fontSize(9).font('Helvetica').fillColor('#c8dff2')
      .text('MEDIAPRO · Cámaras Especiales', M, 40, { lineBreak: false })
    const pillText = `${informes.length} partido${informes.length !== 1 ? 's' : ''}`
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
      .text(pillText, PW - M - 110, 28, { width: 110, align: 'right', lineBreak: false })
    if (titulo) {
      doc.fontSize(9).font('Helvetica').fillColor('#c8dff2')
        .text(titulo, PW - M - 110, 42, { width: 110, align: 'right', lineBreak: false })
    }
    y = 82

    // ── SUMMARY ROW ──
    const sinInc  = informes.filter(i => !buildLines(i).length).length
    const conInc  = informes.length - sinInc
    const summaryItems = [
      { label: 'Total partidos',  val: informes.length, color: C_DARK },
      { label: 'Con incidencias', val: conInc,          color: conInc > 0 ? C_RED : C_GREEN },
      { label: 'Sin incidencias', val: sinInc,          color: C_GREEN },
    ]
    const cellW = CW / summaryItems.length
    summaryItems.forEach((s, i) => {
      const cx = M + i * cellW
      doc.rect(cx, y, cellW - 4, 42).fill(C_LGREY)
      doc.fontSize(20).font('Helvetica-Bold').fillColor(s.color)
        .text(String(s.val), cx + 10, y + 5, { width: cellW - 24, align: 'center', lineBreak: false })
      doc.fontSize(8).font('Helvetica').fillColor(C_GREY)
        .text(s.label, cx + 10, y + 28, { width: cellW - 24, align: 'center', lineBreak: false })
    })
    y += 52

    // ── GROUP BY JORNADA ──
    const byJornada = {}
    for (const inf of informes) {
      const k = inf.jornada ? `Jornada ${inf.jornada}` : 'Sin jornada'
      if (!byJornada[k]) byJornada[k] = []
      byJornada[k].push(inf)
    }

    const IW = CW - 28

    for (const [jornada, rows] of Object.entries(byJornada)) {
      checkBreak(36)
      doc.rect(M, y, CW, 22).fill(C_CYAN)
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
        .text(jornada.toUpperCase(), M + 10, y + 6, { lineBreak: false })
      doc.fontSize(9).font('Helvetica').fillColor('#ffffff')
        .text(`${rows.length} partido${rows.length !== 1 ? 's' : ''}`, M, y + 6, { width: CW - 10, align: 'right', lineBreak: false })
      y += 28

      for (const inf of rows) {
        const incLines = buildLines(inf)
        const hasInc   = incLines.length > 0
        const parts    = (inf.encuentro || ' vs ').split(' vs ')
        const local    = (parts[0] || '').trim().toUpperCase()
        const visit    = (parts[1] || '').trim().toUpperCase()
        const fecha    = fmtD(inf.fecha)
        const ko       = inf.hora_partido || '—'

        checkBreak(36)

        // Barra de partido
        doc.rect(M, y, CW, 24).fill(hasInc ? '#fef3c7' : '#f0fdf4')
        doc.rect(M, y, 3, 24).fill(hasInc ? C_AMBER : C_GREEN)
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C_DARK)
          .text(`${fecha}  ·  KO ${ko}`, M + 10, y + 7, { lineBreak: false })
        doc.fontSize(9).font('Helvetica-Bold').fillColor(C_BLUE)
          .text(`${local} vs ${visit}`, M + 10, y + 7, { width: CW - 20, align: 'right', lineBreak: false })
        y += 26

        // Incidencias con wrap
        if (hasInc) {
          for (const line of incLines) {
            checkBreak(14)
            if (line.label) {
              doc.fontSize(8).font('Helvetica-Bold').fillColor(C_RED)
                .text(`${line.label}: `, M + 14, y, { continued: true, width: IW })
              doc.fontSize(8).font('Helvetica').fillColor(C_DARK)
                .text(line.text, { width: IW })
            } else {
              doc.fontSize(8).font('Helvetica').fillColor(C_GREY)
                .text(line.text, M + 14, y, { width: IW })
            }
            y = doc.y + 2
          }
          y += 4
        } else {
          doc.fontSize(8).font('Helvetica').fillColor(C_GREEN)
            .text('Sin incidencias', M + 14, y, { lineBreak: false })
          y = doc.y + 4
        }

        doc.rect(M, y, CW, 0.5).fill(C_BORDER)
        y += 6
      }
      y += 8
    }

    drawFooter(pageNum)
    doc.end()
  } catch (err) {
    console.error(err)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
})

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CCEE App corriendo en puerto ${PORT}`)
  })
}).catch(err => {
  console.error('Error conectando a BD:', err.message)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CCEE App corriendo en puerto ${PORT} (sin BD)`)
  })
})
