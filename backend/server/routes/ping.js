import { Router } from 'express'
import { isSupabaseEnabled } from '../utils/supabase.js'
const r = Router()
r.get('/', async (req, res) => {
  const { supabaseHealth } = await import('../utils/supabase.js')
  let db = { enabled: isSupabaseEnabled() }
  try {
    if (db.enabled) db = await supabaseHealth()
  } catch {}
  res.json({
    pong: true,
    vercel: Boolean(process.env.VERCEL),
    supabaseConfigured: isSupabaseEnabled(),
    supabase: db,
    syncConfigured: Boolean(process.env.SUPABASE_SYNC_TOKEN),
  })
})
export default r
