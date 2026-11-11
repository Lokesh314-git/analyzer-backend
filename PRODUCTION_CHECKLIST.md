# Production Readiness Checklist
**Semester Marks Analytics Platform**

Use this checklist before and after deploying to Render to verify that all functional, architectural, and security requirements are met.

---

## 1. Codebase & Build Verification

- [x] **Backend TypeScript Compilation**: `npm run build --prefix backend` compiles without errors (`tsc` exits with code 0).
- [x] **Frontend Production Build**: `npm run build --prefix frontend` compiles without errors (`tsc -b && vite build` outputs to `dist/`).
- [x] **Automated Test Suite**: Vitest unit & integration tests pass 100% (`npm test --prefix backend` executes 50/50 passing tests).
- [x] **Asset Paths**: All static asset references in `index.html` and `manifest.webmanifest` use relative root paths (`/`).
- [x] **No Localhost Leaks**: No hardcoded `localhost:5000` or local dev paths in production client or server code.

---

## 2. API & Networking Architecture

- [x] **Centralized API Base URL**: Frontend uses `import.meta.env.VITE_API_BASE_URL` with a clean fallback to `/api` for local Vite dev proxying.
- [x] **Dynamic Download Links**: Excel (`/api/reports/excel`), PDF (`/api/reports/pdf`), and CSV template (`/api/reports/template`) download anchors dynamically reference the configured `API_BASE`.
- [x] **CORS Configuration**: Backend supports production origin whitelist via `FRONTEND_URL` and preflight `OPTIONS` requests, while permitting local development origins.
- [x] **Container Host Binding**: Express server binds explicitly to `0.0.0.0` with dynamic `process.env.PORT` support for containerized cloud environments.
- [x] **Health Check Probing**: Root `/health` and `/api/health` endpoints return HTTP 200 with service uptime and sheet sync status without leaking sensitive data.

---

## 3. Data Privacy & Zero-Caching Policy

- [x] **No Stored Marks in Client Storage**: No student marks or names are saved to `localStorage`, `sessionStorage`, or `IndexedDB`.
- [x] **Downstream Anti-Caching Headers**: Backend `/api` router sets strict cache-busting headers:
  ```http
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
  Pragma: no-cache
  Expires: 0
  Surrogate-Control: no-store
  ```
- [x] **Service Worker Bypass**: `sw.js` explicitly intercepts `/api/*` requests and executes `fetch(event.request, { cache: 'no-store' })` to guarantee student records are never placed into CacheStorage.
- [x] **No Demo Data Fallback**: When Google Sheets is unreachable, the system returns an informative error state (`503` / `403`) and does **not** substitute fake or mock student records.

---

## 4. Google Sheets Integration

- [x] **Single Source of Truth**: Student data is fetched live on demand directly from the Google Sheets CSV export or authorized Apps Script bridge.
- [x] **Header Layout Compatibility**: 2-row grouped headers (`Internal-I`, `Internal-II`, `Internal-III` mapped to `CAT-1`, `CAT-2`, `CAT-3`) parse correctly.
- [x] **All 5 Academic Subjects Tracked**:
  - `DL`: Exam + Assessment + Assignment
  - `GEN AI`: Exam + Assessment + Assignment
  - `RL`: Exam + Assessment + Assignment
  - `BA`: Exam + Assessment + Assignment
  - `RE&CCE`: Exam only (Assessment & Assignment display as N/A)
- [x] **Student Identity Preservation**: University Register Number (`TU6243202111001...`), Class Roll Number (`1, 2, 3...`), and Student Name (`Abitha E...`) are mapped to their respective fields without swapping.

---

## 5. Single Page App (SPA) Routing & PWA

- [x] **SPA Direct Routing**: `frontend/public/_redirects` contains `/* /index.html 200` to prevent 404 errors on direct URL visits or browser refresh.
- [x] **PWA Manifest Valid**: `manifest.webmanifest` and `manifest.json` specify correct standalone display, theme color (`#0F172A`), start URL (`/`), and application name.
- [x] **Application Icons Present**: Standard icons (`192x192`, `512x512`), maskable icons (`192x192`, `512x512`), and iOS `apple-touch-icon.png` exist in `frontend/public/` and `frontend/dist/`.
- [x] **Fixed Mobile Navigation Bar**: Mobile header stays pinned to the top viewport with CSS `env(safe-area-inset-top)` support across 320px–430px viewports.

---

## 6. Repository & Security Readiness

- [x] **`.gitignore` Configured**: Ignores `.env`, `.env.*`, `node_modules/`, `*.tsbuildinfo`, and test screenshots, while allowing `.env.example` templates.
- [x] **Zero Exposed Secrets**: No API keys, personal access tokens, or private service account certificates are committed.
- [x] **Documentation Provided**:
  - `DEPLOYMENT_GUIDE.md`
  - `ENVIRONMENT_VARIABLES.md`
  - `PRODUCTION_CHECKLIST.md`
  - `.env.example` (Root, Frontend, Backend)
  - Updated `README.md`
- [x] **Git Branch Integrity**: No commits or pushes made without explicit user instruction.

