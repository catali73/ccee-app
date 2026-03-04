import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'

const { Pool } = pg
const app = express()
const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
})

app.use(express.json({ limit: '10mb' }))
app.use(express.static(join(__dirname, 'dist')))

// ── INIT DATABASE ─────────────────────────────────────────
async function initDB() {
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
  console.log('✓ Base de datos lista')
}

// ── API ENDPOINTS ─────────────────────────────────────────

// Guardar informe
app.post('/api/informes', async (req, res) => {
  try {
    const {
      match, operators, selectedCams, logistica, camData,
      incidenciasGraves, incidenciasLeves
    } = req.body

    const result = await pool.query(`
      INSERT INTO informes (
        jornada, encuentro, fecha, hora_partido, hora_citacion,
        responsable, um, jefe_tecnico, realizador, productor, horario_md1,
        operadores, camaras_activas, logistica, cam_data,
        incidencias_graves, incidencias_leves
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING id
    `, [
      match.jornada, match.encuentro, match.fecha || null,
      match.hora_partido, match.hora_citacion,
      match.responsable, match.um, match.jefe_tecnico,
      match.realizador, match.productor, match.horario_md1,
      JSON.stringify(operators),
      JSON.stringify(selectedCams),
      JSON.stringify(logistica),
      JSON.stringify(camData),
      incidenciasGraves, incidenciasLeves
    ])

    res.json({ ok: true, id: result.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Listar todos los informes
app.get('/api/informes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, jornada, encuentro, fecha, hora_partido,
             responsable, um, incidencias_graves, incidencias_leves,
             created_at
      FROM informes
      ORDER BY created_at DESC
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Obtener informe completo
app.get('/api/informes/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM informes WHERE id = $1', [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Stats para dashboard
app.get('/api/stats', async (req, res) => {
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
    res.json({
      total: parseInt(total.rows[0].count),
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
  // Arrancar sin BD para no romper la app
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CCEE App corriendo en puerto ${PORT} (sin BD)`)
  })
})
