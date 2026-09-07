import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '../data')
const csvPath = join(dataDir, 'members.csv')
const FIELDS = ['timestamp', 'nama', 'no_hp', 'jurusan']
const ALLOWED_JURUSAN = new Set(['Ilmu Komputer','Manajemen','Akuntansi','Bisnis Digital','Sains Data','Agribisnis','Lainnya'])

function ensureFile() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!existsSync(csvPath)) {
    writeFileSync(csvPath, FIELDS.join(',')+'\n', 'utf-8')
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

export function addMember(nama, no_hp, jurusan) {
  ensureFile()
  const n = sanitize(nama.trim()).slice(0,40)
  const hp = sanitize(no_hp.trim()).slice(0,15)
  const j = sanitize(jurusan.trim()).slice(0,30)
  if (!ALLOWED_JURUSAN.has(j)) throw new Error(`Jurusan tidak valid: ${j}`)
  const ts = new Date().toISOString().slice(0,19)
  const row = { timestamp: ts, nama: n, no_hp: hp, jurusan: j }
  const line = FIELDS.map(f=>row[f]).join(',')+'\n'
  const cur = readFileSync(csvPath,'utf-8')
  writeFileSync(csvPath, cur + line, 'utf-8')
  return row
}

export function allMembers(limit=100){
  const rows=parseCsv()
  return [...rows].reverse().slice(0,limit)
}

export function highlight(limit=30){
  const rows=allMembers(limit)
  return rows.map(r=>({ nama:r.nama, jurusan:r.jurusan, timestamp:r.timestamp }))
}

export function csvFilePath(){
  ensureFile()
  return csvPath
}
