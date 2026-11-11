# Environment Variables Reference Guide
**Semester Marks Analytics Platform**

This document provides a comprehensive specification of all environment variables used across the frontend and backend services.

---

## 1. Backend Web Service Variables (`backend/`)

Configure these variables in the **Render Web Service Settings > Environment** tab (or in `backend/.env` for local testing).

| Variable Name | Required | Default Value | Sensitivity | Description | Example Value |
|---|---|---|---|---|---|
| `PORT` | Optional | `5000` | Non-Sensitive | HTTP port on which the Express server listens. Render automatically injects this variable in production. | `5000` |
| `NODE_ENV` | Recommended | `development` | Non-Sensitive | Runtime environment flag (`production` or `development`). In `production`, internal stack traces are suppressed in error responses. | `production` |
| `FRONTEND_URL` | **Required in Prod** | Localhost origins | Non-Sensitive | Allowed origin(s) for CORS. Can be a single origin or comma-separated list of origins. In non-production, localhost origins are allowed automatically. | `https://semester-marks-analytics.onrender.com` |
| `SPREADSHEET_URL` | Recommended | Built-in fallback URL | Non-Sensitive | Full Google Sheets link. Used to parse the spreadsheet ID and export URL if `SPREADSHEET_ID` is omitted. | `https://docs.google.com/spreadsheets/d/1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY/edit` |
| `SPREADSHEET_ID` | **Required** | `1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY` | Non-Sensitive | The 44-character Google Sheet Document ID extracted from the spreadsheet URL. Used to stream live CSV marks. | `1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY` |
| `WORKSHEET_GID` | Optional | `undefined` (1st sheet) | Non-Sensitive | The worksheet tab identifier (`gid=...`) when marks are located on a non-default tab. | `0` or `184729104` |
| `APPS_SCRIPT_URL` | Optional | `""` | Non-Sensitive | Web App endpoint deployed via Google Apps Script. Used when the spreadsheet is restricted to institutional/domain users. | `https://script.google.com/macros/s/AKfycbx.../exec` |
| `APPS_SCRIPT_TOKEN` | Optional | `""` | **CRITICAL SENSITIVE** | Pre-shared bearer token used to authenticate requests to the private Google Apps Script bridge. Never commit this to source control or expose it to frontend clients. | `sec_98f4a18c8e244b...` |

---

## 2. Frontend Static Site Variables (`frontend/`)

Configure these variables in the **Render Static Site Settings > Environment** tab before triggering the build.

> [!IMPORTANT]
> Because Vite embeds environment variables at build time, any variable meant for the frontend **must** begin with `VITE_`. If you update `VITE_API_BASE_URL` in Render, you must trigger a **Manual Deploy > Clear build cache & deploy** for changes to take effect in client JavaScript bundles.

| Variable Name | Required | Default Value | Sensitivity | Description | Example Value |
|---|---|---|---|---|---|
| `VITE_API_BASE_URL` | **Required in Prod** | `""` (relative `/api`) | Public / Non-Sensitive | The full HTTPS origin of your deployed Render backend Web Service. In local development, leave this unset to use Vite's built-in dev proxy. | `https://semester-marks-backend.onrender.com` |

---

## 3. Local Development vs. Production Configuration Matrix

### Local Development (`npm run dev`)
- **Backend**: Runs on `http://localhost:5000`. Reads `backend/.env`.
- **Frontend**: Runs on `http://localhost:5173`. Reads `frontend/.env` (optional).
- **Proxy**: Vite automatically proxies `/api` requests to `http://localhost:5000` (defined in `frontend/vite.config.ts`), so `VITE_API_BASE_URL` can remain unset.

### Render Production
- **Backend**: Deployed as a **Render Web Service** with URL `https://<backend-name>.onrender.com`.
  - Injected Environment Variables:
    ```env
    NODE_ENV=production
    FRONTEND_URL=https://<frontend-name>.onrender.com
    SPREADSHEET_ID=1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY
    SPREADSHEET_URL=https://docs.google.com/spreadsheets/d/1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY/edit?usp=sharing
    ```
- **Frontend**: Deployed as a **Render Static Site** with URL `https://<frontend-name>.onrender.com`.
  - Injected Environment Variables:
    ```env
    VITE_API_BASE_URL=https://<backend-name>.onrender.com
    ```

