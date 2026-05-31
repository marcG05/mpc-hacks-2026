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
   - `MAP=MAPBOX_API_KEY`
   - `gemapikey=GEMINI_API_KEY`
   - `npm run start:dev`
3. Start the frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

Health check: `GET http://localhost:3000/engine/health`

## General setup

You can use the docker compose file instead with the command:
`docker compose up -d --build`

For the frontend:
`GET http://localhost:5173/`

For the tuner:
`GET http://localhost:5555/`

### Default creds

User: `Marc`
Password: `1234`




Note: In PowerShell, set env vars like `$env:PY_ENGINE_PORT=3001` before running commands.
