import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env') })

const app = express()
app.use(cors({ origin: '*', methods: '*', allowedHeaders: '*' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// init DB + seed admin
import { ensureDb } from './utils/pg.js'
import { ensureSeed } from './utils/auth.js'
try { await ensureDb() } catch (e) { console.warn('ensureDb failed (fallback file):', e.message) }
await ensureSeed()

// routes
import ping from './routes/ping.js'
import game from './routes/game.js'
import leaderboard from './routes/leaderboard.js'
import stories from './routes/stories.js'
import members from './routes/members.js'
import admin from './routes/admin.js'
import proker from './routes/proker.js'
import spinner from './routes/spinner.js'

app.use('/api/ping', ping)
app.use('/api/game', game)
app.use('/api/leaderboard', leaderboard)
app.use('/api/stories', stories)
app.use('/api/members', members)
app.use('/api/admin', admin)
app.use('/api/proker', proker)
app.use('/api/spinner', spinner)

// serve uploads for gallery (Vercel: /tmp writable only)
import { existsSync as existsUpload } from 'fs'
const isVercelUpload = Boolean(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.NOW_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  __dirname.includes('task') ||
  __dirname.startsWith('/var')
)
let uploadsDir = isVercelUpload ? join('/tmp', 'uploads') : join(__dirname, 'data/uploads')
try {
  if (!existsUpload(uploadsDir)) {
    const { mkdirSync } = await import('fs')
    mkdirSync(uploadsDir, { recursive: true })
  }
} catch (e) {
  uploadsDir = join('/tmp', 'uploads')
  try {
    const { mkdirSync } = await import('fs')
    if (!existsUpload(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })
  } catch {}
}
app.use('/uploads', expressStatic.static(uploadsDir))

// static frontend if built
import { existsSync } from 'fs'
import expressStatic from 'express'
const dist = join(__dirname, '../../frontend/dist')
if (existsSync(join(dist, 'index.html'))) {
  app.use(expressStatic.static(dist))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ detail: 'Not found' })
    res.sendFile(join(dist, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Backup custom Vue+Express listening on ${PORT}`))
}

// jangan pernah bocorkan stack trace; bungkus error middleware (multer dsb.) jadi JSON
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ detail: 'Ukuran file maksimal 5MB' })
  if (err?.message?.includes('Hanya file gambar')) return res.status(400).json({ detail: 'Hanya file gambar' })
  if (err instanceof multer.MulterError) return res.status(400).json({ detail: err.message })
  res.status(500).json({ error: 'Server error' })
})

export default app
