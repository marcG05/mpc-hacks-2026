# mpc-hacks-2026

## Local development

1. Start the python engine socket service:
   - `cd python`
   - `PY_ENGINE_HOST=0.0.0.0` (optional, default `0.0.0.0`)
   - `PY_ENGINE_PORT=3001` (optional, default `3001`)
   - `python main.py`
2. Start the backend API:
   - `cd backend`
   - `npm install`
   - `PY_ENGINE_HOST=127.0.0.1` (optional, default `127.0.0.1`)
   - `PY_ENGINE_PORT=3001` (optional, default `3001`)
   - `npm run start:dev`
3. Start the frontend:
   - `cd frontend`
   - `npm install`
   - `VITE_API_URL=http://localhost:3000`
   - `npm run dev`

Health check: `GET http://localhost:3000/engine/health`

Note: In PowerShell, set env vars like `$env:PY_ENGINE_PORT=3001` before running commands.
