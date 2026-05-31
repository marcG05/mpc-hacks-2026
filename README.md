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


Detection strategy:  
   
    1. Feature engineering (velocity, cross‑border, night activity, high‑risk category, device/IP sharing, spending patterns).  
    2. Rule‑based scoring with weighted heuristics to flag known fraud patterns.  
    3. Anomaly detection (Isolation Forest) to catch outliers beyond the rules.  
    4. Ensemble verdict that combines rule and anomaly signals into a single fraud score and thresholded verdict.
With another week:  
   1. Add labeled data and evaluate precision/recall/F1; tune weights and thresholds.  
   2. Expand signals (geolocation from IP, merchant risk scoring, cardholder behavior baselines).  
   3. Calibrate explanations (top contributing rules per decision) and improve the UI to drill into why a transaction was flagged.
