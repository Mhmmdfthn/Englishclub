// Helper waktu tunggal: simpan tetap UTC/ISO, sajikan WIB saat ditampilkan.
// Dipakai backend untuk embed Discord, field *_wib di respon API, dan prefix log.

const wibFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function toWIB(iso) {
  if (!iso) return '-'
  if (iso instanceof Date) {
    if (Number.isNaN(iso.getTime())) return '-'
    return `${wibFormatter.format(iso)} WIB`
  }
  // String naive "YYYY-MM-DDTHH:mm:ss" (hasil toISOString().slice(0,19)) dibaca sebagai UTC.
  const s = String(iso)
  const zoned = /[Zz]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`
  const d = new Date(zoned)
  if (Number.isNaN(d.getTime())) return '-'
  return `${wibFormatter.format(d)} WIB`
}

// Kembalian: salinan row + field turunan siap tampil (tanpa mengubah field asli).
export function enrichWIB(row) {
  if (!row || typeof row !== 'object') return row
  const out = { ...row }
  if (typeof out.timestamp === 'string' && !out.timestamp_wib) {
    out.timestamp_wib = toWIB(out.timestamp)
  }
  if (typeof out.created_at === 'string' && !out.created_at_wib) {
    out.created_at_wib = toWIB(out.created_at)
  }
  return out
}

export function withWIB(rows) {
  if (!Array.isArray(rows)) return rows
  return rows.map(enrichWIB)
}
