import { Router } from 'express'
const r = Router()
r.get('/', (req, res) => res.json({ pong: true }))
export default r
