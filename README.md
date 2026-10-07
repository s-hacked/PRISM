# PRISM Predictive Intelligence

## Environment configuration

Create a `.env` file (or set environment variables) to point the React frontend at the backend API:

```
VITE_API_URL=http://localhost:8000
```

> In development, `npm run dev` starts both the Express API (port 8000) and the Vite dev server
> (port 5173). The Vite dev server proxies `/api/*` to `VITE_API_URL`, so the browser only ever
> calls same-origin `/api/...` paths.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Production

```bash
npm run build
npm start
```

`npm start` serves the built React bundle from the Express server on port 8000.

## Architecture

```
app/
  server/            Express API — validation, feature engineering, ML, SHAP, forecasting
  src/
    components/      Reusable UI components (Stitch design system)
    pages/           Overview, ChurnRisk, Customers, Forecast, ModelHealth, Data, Reports, Auth
    services/api.ts  API client (base URL from VITE_API_URL)
    hooks/           Polling + query hooks
    types/           Shared TypeScript types
```
