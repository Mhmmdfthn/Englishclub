// Aturan waktu tunggal (mirror backend utils/time.js):
// tampilkan WIB berlabel, simpan tetap UTC/ISO.

const wibFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const wibDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatWIB(iso) {
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

// Tanggal hari ini (YYYY-MM-DD) menurut WIB — untuk filter "hari ini".
export function todayWIB() {
  return wibDayFormatter.format(new Date())
}

// Waktu siap tampil dari row API: pakai field server bila ada, fallback format lokal.
export function displayTime(row) {
  if (!row) return '-'
  return row.timestamp_wib || row.created_at_wib || formatWIB(row.timestamp || row.created_at)
}
