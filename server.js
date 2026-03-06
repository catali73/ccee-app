import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createRequire } from 'module'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit')

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
      hora_citacion VARCHAR(20),
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
      role          VARCHAR(20) NOT NULL CHECK (role IN ('coordinador','usuario')),
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
      hora_citacion   VARCHAR(20),
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

  // cam_models: modelos de equipo seleccionados por el coordinador
  await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS cam_models JSONB DEFAULT '{}'::jsonb`)

  // Teléfonos de contacto del equipo técnico
  await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS tel_jefe_tecnico VARCHAR(50) DEFAULT ''`)
  await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS tel_realizador VARCHAR(50) DEFAULT ''`)
  await pool.query(`ALTER TABLE servicios ADD COLUMN IF NOT EXISTS tel_productor VARCHAR(50) DEFAULT ''`)

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
app.get('/api/auth/me', requireAuth(), (req, res) => {
  res.json(req.user)
})

// ── USERS ROUTES (solo coordinador) ───────────────────────

// Crear usuario
app.post('/api/users', requireAuth(['coordinador']), async (req, res) => {
  try {
    const { email, password, name, role } = req.body
    if (!email || !password || !name) return res.status(400).json({ error: 'Faltan campos obligatorios' })
    if (!['coordinador', 'usuario'].includes(role)) return res.status(400).json({ error: 'Rol inválido' })

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
app.get('/api/users', requireAuth(['coordinador']), async (req, res) => {
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
app.delete('/api/users/:id', requireAuth(['coordinador']), async (req, res) => {
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
app.patch('/api/users/:id/activate', requireAuth(['coordinador']), async (req, res) => {
  try {
    await pool.query('UPDATE users SET active = true WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── SERVICIOS ROUTES ───────────────────────────────────────

// Crear servicio (coordinador: pasos 1-3 + asignación)
app.post('/api/servicios', requireAuth(['coordinador']), async (req, res) => {
  try {
    const { match, selectedCams, operators, assigned_to, tipo_servicio, cam_models } = req.body
    const r = await pool.query(`
      INSERT INTO servicios (
        tipo_servicio, jornada, encuentro, fecha, hora_partido, hora_citacion,
        responsable, um, jefe_tecnico, tel_jefe_tecnico, realizador, tel_realizador,
        productor, tel_productor, horario_md1,
        operadores, camaras_activas, cam_models, assigned_to, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING id
    `, [
      tipo_servicio,
      match.jornada, match.encuentro, match.fecha || null,
      match.hora_partido, match.hora_citacion,
      match.responsable, match.um, match.jefe_tecnico, match.tel_jefe_tecnico||'',
      match.realizador, match.tel_realizador||'',
      match.productor, match.tel_productor||'', match.horario_md1,
      JSON.stringify(operators), JSON.stringify(selectedCams),
      JSON.stringify(cam_models || {}),
      assigned_to, req.user.id
    ])
    res.json({ ok: true, id: r.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// Listar servicios (coordinador: todos · usuario: solo los suyos)
app.get('/api/servicios', requireAuth(), async (req, res) => {
  try {
    let query, params
    if (req.user.role === 'coordinador') {
      query = `
        SELECT s.*, u.name as assigned_to_name, c.name as created_by_name
        FROM servicios s
        LEFT JOIN users u ON s.assigned_to = u.id
        LEFT JOIN users c ON s.created_by = c.id
        ORDER BY s.created_at DESC`
      params = []
    } else {
      query = `
        SELECT s.*, u.name as assigned_to_name, c.name as created_by_name
        FROM servicios s
        LEFT JOIN users u ON s.assigned_to = u.id
        LEFT JOIN users c ON s.created_by = c.id
        WHERE s.assigned_to = $1
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
      SELECT s.*, u.name as assigned_to_name, c.name as created_by_name
      FROM servicios s
      LEFT JOIN users u ON s.assigned_to = u.id
      LEFT JOIN users c ON s.created_by = c.id
      WHERE s.id = $1
    `, [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
    const servicio = r.rows[0]
    if (req.user.role === 'usuario' && servicio.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
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
      FROM servicios s LEFT JOIN users u ON s.assigned_to = u.id
      WHERE s.id = $1
    `, [req.params.id])
    if (r.rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
    const sv = r.rows[0]
    if (req.user.role === 'usuario' && sv.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Sin permisos' })
    }

    const fmtD = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—'
    const ops = sv.operadores || {}
    const camModels = sv.cam_models || {}
    const activeCams = sv.camaras_activas ? Object.entries(sv.camaras_activas).filter(([,v])=>v) : []

    // Importar CAMERA_CATALOG y OPERATOR_GROUPS desde datos estáticos
    // (usamos datos básicos sin importar el módulo frontend)
    const filename = `hoja-servicio-${sv.id}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true })
    doc.pipe(res)

    const PW = doc.page.width
    const M = 50
    const CW = PW - 2 * M

    // ── HEADER ──
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#111111')
      .text(sv.encuentro || '—', M, 50)
    doc.fontSize(11).font('Helvetica').fillColor('#666666')
      .text(`${sv.jornada || ''} · ${fmtD(sv.fecha)}`, M, 74)
    doc.fontSize(9).fillColor('#999999')
      .text('MEDIAPRO · CCEE', PW - M, 50, { align: 'right', width: CW })
      .text('Hoja de servicio · Temporada 25/26', PW - M, 62, { align: 'right', width: CW })
    doc.fillColor('#000000')
    doc.moveTo(M, 95).lineTo(PW - M, 95).strokeColor('#cccccc').stroke()

    let y = 110

    // ── SECTION TITLE ──
    const sec = (title) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#888888')
        .text(title.toUpperCase(), M, y)
      doc.moveTo(M, y + 12).lineTo(PW - M, y + 12).strokeColor('#dddddd').stroke()
      y += 20; doc.fillColor('#000000')
    }

    // ── 3-COL GRID OF CELLS ──
    const grid = (items) => {
      const CW3 = (CW - 10) / 3
      const RH = 36
      items.forEach(([label, val], i) => {
        const col = i % 3, row = Math.floor(i / 3)
        const cx = M + col * (CW3 + 5), cy = y + row * RH
        doc.rect(cx, cy, CW3, RH - 4).fillAndStroke('#f7f7f7', '#e8e8e8')
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#aaaaaa')
          .text((label || '').toUpperCase(), cx + 6, cy + 5, { width: CW3 - 12 })
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#111111')
          .text(String(val || '—').substring(0, 32), cx + 6, cy + 17, { width: CW3 - 12 })
      })
      y += Math.ceil(items.length / 3) * RH + 8
      doc.fillColor('#000000')
    }

    // ── DATOS DEL SERVICIO ──
    sec('Datos del servicio')
    grid([
      ['Jornada', sv.jornada], ['Encuentro', sv.encuentro], ['Fecha', fmtD(sv.fecha)],
      ['Hora partido', sv.hora_partido], ['Hora citación', sv.hora_citacion],
      ['Horario citación MD-1', sv.horario_md1],
    ])

    // ── EQUIPO TÉCNICO ──
    sec('Equipo técnico')
    grid([
      ['Responsable CCEE', sv.responsable], ['Unidad Móvil', sv.um], ['', ''],
      ['J. Técnico UM', sv.jefe_tecnico], ['Teléfono', sv.tel_jefe_tecnico || '—'], ['', ''],
      ['Realizador', sv.realizador], ['Teléfono', sv.tel_realizador || '—'], ['', ''],
      ['Productor', sv.productor], ['Teléfono', sv.tel_productor || '—'], ['', ''],
    ])

    // ── CÁMARAS Y MODELOS ──
    if (activeCams.length > 0) {
      sec(`Cámaras activas · ${activeCams.length}`)
      activeCams.forEach(([id]) => {
        const models = camModels[id]
        const modelStr = models ? Object.values(models).filter(Boolean).join(' · ') : ''
        doc.rect(M, y, CW, 20).fillAndStroke('#f0f0f0', '#dddddd')
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#111111')
          .text(id, M + 6, y + 6, { width: CW / 2 })
        if (modelStr) {
          doc.fontSize(9).font('Helvetica').fillColor('#555555')
            .text(modelStr, M + CW / 2, y + 7, { width: CW / 2 - 6, align: 'right' })
        }
        doc.fillColor('#000000'); y += 22
      })
      y += 6
    }

    // ── OPERADORES ──
    const opEntries = Object.entries(ops).filter(([, v]) => v)
    if (opEntries.length > 0) {
      sec('Operadores asignados')
      opEntries.forEach(([key, name], i) => {
        if (i % 2 === 0) doc.rect(M, y, CW, 18).fill('#fafafa')
        doc.fontSize(9).font('Helvetica').fillColor('#777777')
          .text(key, M + 6, y + 5, { width: 160 })
        doc.font('Helvetica-Bold').fillColor('#111111')
          .text(String(name), M + 170, y + 5, { width: CW - 180 })
        doc.moveTo(M, y + 18).lineTo(PW - M, y + 18).strokeColor('#eeeeee').stroke()
        doc.fillColor('#000000'); y += 18
      })
    }

    // ── FOOTER ──
    doc.fontSize(8).font('Helvetica').fillColor('#bbbbbb')
      .text('MEDIAPRO · Cámaras Especiales · Hoja de servicio', M, 780)
      .text(`Generado: ${new Date().toLocaleString('es-ES')}`, PW - M, 780, { align: 'right', width: CW })

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
          jornada, encuentro, fecha, hora_partido, hora_citacion,
          responsable, um, jefe_tecnico, realizador, productor, horario_md1,
          operadores, camaras_activas, logistica, cam_data,
          incidencias_graves, incidencias_leves,
          servicio_id, submitted_by, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        RETURNING id
      `, [
        s.jornada, s.encuentro, s.fecha, s.hora_partido, s.hora_citacion,
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
    if (req.user.role === 'coordinador') {
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
app.put('/api/servicios/:id', requireAuth(['coordinador']), async (req, res) => {
  try {
    const { match, selectedCams, operators, assigned_to, tipo_servicio, cam_models } = req.body
    await pool.query(`
      UPDATE servicios SET
        tipo_servicio=$1, jornada=$2, encuentro=$3, fecha=$4, hora_partido=$5,
        hora_citacion=$6, responsable=$7, um=$8, jefe_tecnico=$9, tel_jefe_tecnico=$10,
        realizador=$11, tel_realizador=$12, productor=$13, tel_productor=$14,
        horario_md1=$15, operadores=$16, camaras_activas=$17,
        cam_models=$18, assigned_to=$19
      WHERE id=$20
    `, [
      tipo_servicio,
      match.jornada, match.encuentro, match.fecha || null,
      match.hora_partido, match.hora_citacion,
      match.responsable, match.um, match.jefe_tecnico, match.tel_jefe_tecnico||'',
      match.realizador, match.tel_realizador||'',
      match.productor, match.tel_productor||'', match.horario_md1,
      JSON.stringify(operators), JSON.stringify(selectedCams),
      JSON.stringify(cam_models || {}),
      assigned_to, req.params.id
    ])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── DOCUMENTOS ROUTES ──────────────────────────────────────

// Subir documento a un servicio (coordinador)
app.post('/api/servicios/:id/documentos', requireAuth(['coordinador']), async (req, res) => {
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
app.delete('/api/documentos/:id', requireAuth(['coordinador']), async (req, res) => {
  try {
    await pool.query('DELETE FROM documentos WHERE id=$1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Eliminar informe (coordinador · resetea el servicio a pendiente)
app.delete('/api/informes/:id', requireAuth(['coordinador']), async (req, res) => {
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
app.get('/api/stats', requireAuth(['coordinador']), async (req, res) => {
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
