import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { isDbEnabled, getDb } from './pg.js'
import { addMemberToSheets, cloudMembers, isSheetsEnabled, cloudAddMember, cloudAllMembers, isKvEnabled } from './cloudStore.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isVercel = !!process.env.VERCEL
const origDataDir = join(__dirname, '../data')
const dataDir = isVercel ? join('/tmp', 'data') : origDataDir
const csvPath = join(dataDir, 'members.csv')
const origCsvPath = join(origDataDir, 'members.csv')
const FIELDS = ['timestamp', 'nama', 'no_hp', 'jurusan']
const ALLOWED_JURUSAN = new Set(['Ilmu Komputer','Manajemen','Akuntansi','Bisnis Digital','Sains Data','Agribisnis','Lainnya'])

function ensureFile() {
  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }) } catch {}
  if (!existsSync(csvPath)) {
    try {
      if (isVercel && existsSync(origCsvPath)) {
        writeFileSync(csvPath, readFileSync(origCsvPath, 'utf-8'), 'utf-8')
        return
      }
    } catch {}
    try { writeFileSync(csvPath, FIELDS.join(',')+'\n', 'utf-8') } catch {}
  } else {
    try {
      const header = readFileSync(csvPath, 'utf-8').split('\n')[0].trim()
      if (header !== FIELDS.join(',')) {
        const backup = csvPath.replace('.csv','.corrupt.csv')
        try { writeFileSync(backup, readFileSync(csvPath, 'utf-8'), 'utf-8') } catch {}
        writeFileSync(csvPath, FIELDS.join(',')+'\n', 'utf-8')
      }
    } catch {}
  }
}

function sanitize(v) {
  if (/^[=+\-@|%]/.test(v)) return "'" + v
  return v
}

function parseCsv() {
  ensureFile()
  const txt = readFileSync(csvPath, 'utf-8')
  const lines = txt.split('\n').filter(l=>l.trim())
  if (!lines.length) return []
  const header = lines[0].split(',')
  if (header.join(',') !== FIELDS.join(',')) return []
  const rows=[]
  for(let i=1;i<lines.length;i++){
    const parts = lines[i].split(',')
    if(parts.length < FIELDS.length) continue
    const obj={}
    FIELDS.forEach((f,idx)=> obj[f]=parts[idx])
    if(!obj.nama) continue
    rows.push(obj)
  }
  return rows
}

export async function addMember(nama, no_hp, jurusan) {
  const n = sanitize(nama.trim()).slice(0,40)
  const hp = sanitize(no_hp.trim()).slice(0,15)
  const j = sanitize(jurusan.trim()).slice(0,30)
  if (!ALLOWED_JURUSAN.has(j)) throw new Error(`Jurusan tidak valid: ${j}`)
  const row = { timestamp: new Date().toISOString().slice(0,19), nama: n, no_hp: hp, jurusan: j }
  if (isKvEnabled()) {
    return cloudAddMember(row)
  }
  if (isSheetsEnabled()) {
    return addMemberToSheets(row)
  }
  if (isDbEnabled()) {
    const pool = getDb()
    const { rows } = await pool.query(
      'INSERT INTO members (nama, no_hp, jurusan) VALUES ($1,$2,$3) RETURNING timestamp, nama, no_hp, jurusan',
      [n, hp, j]
    )
    const r = rows[0]
    // format timestamp to ISO slice
    r.timestamp = new Date(r.timestamp).toISOString().slice(0,19)
    return r
  }
  ensureFile()
  const line = FIELDS.map(f=>row[f]).join(',')+'\n'
  const cur = readFileSync(csvPath,'utf-8')
  writeFileSync(csvPath, cur + line, 'utf-8')
  return row
}

export async function allMembers(limit=100){
  if (isKvEnabled()) return cloudAllMembers(limit)
  if (isSheetsEnabled()) return cloudMembers(limit)
  if (isDbEnabled()) {
    const pool = getDb()
    const { rows } = await pool.query('SELECT timestamp, nama, no_hp, jurusan FROM members ORDER BY id DESC LIMIT $1', [limit])
    return rows.map(r => ({ ...r, timestamp: new Date(r.timestamp).toISOString().slice(0,19) }))
  }
  const rows=parseCsv()
  return [...rows].reverse().slice(0,limit)
}

export async function highlight(limit=30){
  const rows= await allMembers(limit)
  return rows.map(r=>({ nama:r.nama, jurusan:r.jurusan, timestamp:r.timestamp }))
}

export function csvFilePath(){
  ensureFile()
  return csvPath
}
