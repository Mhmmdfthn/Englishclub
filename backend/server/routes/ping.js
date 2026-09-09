import { Router } from 'express'
import { isKvEnabled, isSheetsEnabled } from '../utils/cloudStore.js'
const r = Router()
r.get('/', (req, res) => res.json({
	pong: true,
	vercel: Boolean(process.env.VERCEL),
	adminConfigured: Boolean(process.env.ADMIN_TOKEN),
	syncConfigured: Boolean(process.env.SYNC_TOKEN || process.env.ADMIN_TOKEN),
	kvConfigured: isKvEnabled(),
	sheetsConfigured: isSheetsEnabled(),
}))
export default r
