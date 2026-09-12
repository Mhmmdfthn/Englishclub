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

// Parse stamp waktu server: string naive "YYYY-MM-DDTHH:mm:ss" (hasil
// toISOString().slice(0,19)) dibaca sebagai UTC; yang berzona dibiarkan.
// Satu-satunya fungsi parse yang boleh dipakai untuk waktu dari server.
export function parseAsUTC(iso) {
  if (!iso) return null
  if (iso instanceof Date) return Number.isNaN(iso.getTime()) ? null : iso
  const s = String(iso).trim().replace(' ', 'T')
  const zoned = /[Zz]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`
  const d = new Date(zoned)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatWIB(iso) {
  const d = parseAsUTC(iso)
  if (!d) return '-'
  return `${wibFormatter.format(d)} WIB`
}

// Tanggal (YYYY-MM-DD) sebuah stamp server menurut WIB — untuk filter "hari ini".
export function wibDay(iso) {
  const d = parseAsUTC(iso)
  if (!d) return ''
  return wibDayFormatter.format(d)
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
