// Audit push satu arah ke Discord (webhook). Fire-and-forget: kegagalan
// pengiriman tidak boleh menggagalkan request utama. Tanpa env = no-op.
import { toWIB } from './time.js'

const TIMEOUT_MS = 3000
const COLORS = { ok: 0x2ecc71, warn: 0xe6b800, error: 0xe74c3c }

function webhookFor(kind) {
  if (kind === 'tech' && process.env.DISCORD_TECH_WEBHOOK_URL) {
    return process.env.DISCORD_TECH_WEBHOOK_URL
  }
  return process.env.DISCORD_WEBHOOK_URL || null
}

function post(url, payload) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .catch((e) => console.error('Audit Discord gagal:', e.message))
    .finally(() => clearTimeout(timer))
}

function send(kind, { title, color, fields }) {
  const url = webhookFor(kind)
  if (!url) return Promise.resolve() // audit nonaktif: no-op, bukan error
  const prefix = kind === 'tech' && !process.env.DISCORD_TECH_WEBHOOK_URL ? '[TEKNIS] ' : ''
  return post(url, {
    embeds: [{
      title: prefix + title,
      color,
      fields: (fields || []).slice(0, 10).map(([name, value]) => ({
        name: String(name).slice(0, 100),
        value: String(value ?? '-').slice(0, 500),
        inline: true,
      })),
      footer: { text: `${toWIB(new Date().toISOString())}` },
    }],
  })
}

// Aksi admin + aksi publik penting. detail: objek datar tanpa secret.
// Mengembalikan promise: WAJIB di-await oleh rute agar pengiriman selesai
// dalam siklus request (serverless Vercel membekukan fungsi setelah respon).
export function auditAdmin(aksi, aktor, detail = {}) {
  try {
    return send('admin', {
      title: aksi,
      color: COLORS.ok,
      fields: [
        ['Aktor', aktor || '-'],
        ...Object.entries(detail).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v]),
      ],
    })
  } catch (e) {
    console.error('auditAdmin gagal:', e.message)
    return Promise.resolve()
  }
}

// Error / pola mencurigakan. Tidak pernah membawa token/password/no_hp.
export function auditTech(route, status, pesan) {
  try {
    const color = status >= 500 ? COLORS.error : COLORS.warn
    return send('tech', {
      title: `Error ${status} — ${route}`,
      color,
      fields: [['Route', route], ['Status', status], ['Pesan', String(pesan).slice(0, 500)]],
    })
  } catch (e) {
    console.error('auditTech gagal:', e.message)
    return Promise.resolve()
  }
}

// Throttle sederhana: max 1 event per key per interval (hemat rate limit Discord).
const lastSent = new Map()
export function auditTechThrottled(key, intervalMs, route, status, pesan) {
  const now = Date.now()
  if (lastSent.get(key) && now - lastSent.get(key) < intervalMs) return Promise.resolve()
  lastSent.set(key, now)
  return auditTech(route, status, pesan)
}
