# Backup Custom Vue + Express (translate Python)

Full translate dari `backend/*.py` ke Node JS.

## Jalankan backup
```
npm install --prefix backup-custom
npm run dev --prefix backup-custom  # server di 3001
npm run dev -- --host 0.0.0.0       # frontend di 5173 (vite proxy /api -> 3001 ubah vite.config.js jika mau)
```

Env: `backup-custom/.env` ADMIN_TOKEN=ec2026onlyblue (tetap)

Endpoints: sama 1:1 dengan Python (ping, game, leaderboard, stories, members, admin/verify)

Data backup: `backup-custom/server/data/members.csv` + `scores.json`/`stories.json` (tidak ganggu backend/data python)

Vercel: preset vercel, api/index.js export app. Deploy nanti.
