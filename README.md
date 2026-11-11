# Semester Marks Analytics Platform
**Production-Ready Academic SaaS | Google Sheets Direct Streaming | PWA Enabled | Desktop & Mobile Optimized**

A specialized, high-performance academic analytics platform engineered for college lecturers and department heads to monitor semester examination marks, track continuous assessment tests (Internal-I/CAT-1, Internal-II/CAT-2, Internal-III/CAT-3), analyze subject-level performance across 5 subjects, audit internal assessment and assignment submissions, identify at-risk students, and export official institution marksheets.

---

## 🚀 Key Highlights & Architectural Features

1. **Google Sheets as Single Source of Truth (Zero-Cache Direct Fetching)**
   - Connects directly to Google Sheets via live CSV streaming or authorized Google Apps Script bridge without requiring complex OAuth setups.
   - **Zero Student Marks Caching**: Academic marks are retrieved fresh directly on demand. Downstream caches, proxies, and service workers are instructed with `Cache-Control: no-store` to guarantee real-time marks reflection and data privacy.
   - **Strict Read-Only Access**: Zero modification of the lecturer's Google Spreadsheet.

2. **Accurate Academic Classification & 2-Row Grouped Header Mapping**
   - **Academic Workflow**:
     - `Internal-I` $\rightarrow$ **CAT-1**
     - `Internal-II` $\rightarrow$ **CAT-2**
     - `Internal-III` $\rightarrow$ **CAT-3**
   - **Subjects Tracked**:
     - `DL` (Deep Learning): Exam + Assessment + Assignment
     - `GEN AI` (Generative AI): Exam + Assessment + Assignment
     - `RL` (Reinforcement Learning): Exam + Assessment + Assignment
     - `BA` (Business Analytics): Exam + Assessment + Assignment
     - `RE&CCE` (Renewable Energy & Cloud Computing): Exam only (Assessment & Assignment display as N/A)
   - **Grading Scale**: Maximum marks: 40 | Passing threshold: 16 (configurable in Academic Settings).

3. **Installable Progressive Web Application (PWA)**
   - Fully installable on Android, iOS, Windows, macOS, and Linux.
   - Custom installation banners and dedicated iOS Safari "Add to Home Screen" instructions.
   - Service Worker (v3.0) provides offline application shell loading while strictly bypassing all academic API requests to ensure zero student marks are stored in CacheStorage.

4. **Multi-Format Academic Reporting**
   - **Master Excel Marksheet (`.xlsx`)**: Formatted multi-tab workbooks with pass/fail conditional styling generated via ExcelJS.
   - **Official PDF Examination Report (`.pdf`)**: Publication-ready landscape scorecards with institutional headings and student marks tables generated via jsPDF.
   - **Standard CSV Template**: Pre-formatted CSV file pre-populated with student identities and 2-row grouped column headers.

5. **Split Production Cloud Architecture (Ready for Render)**
   - Engineered for Render split deployment:
     - **Frontend**: Render Static Site (Vite React SPA with `_redirects` SPA rewrite).
     - **Backend**: Render Web Service (Node.js 20+ / Express bound to `0.0.0.0` with dynamic `$PORT` and restricted CORS).

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 6, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router v7 |
| **Backend** | Node.js (ESM), Express 4, TypeScript, CSV-Parse, ExcelJS, jsPDF, Axios, Zod |
| **PWA** | Web App Manifest, Service Worker v3.0, Maskable Icons (192px & 512px) |
| **Data Source** | Google Sheets CSV Export / Google Apps Script Bridge |
| **Testing** | Vitest (50 passing unit & integration tests), Playwright Core (responsive audit) |
| **Deployment Target** | Render (Static Site + Web Service) |

---

## ☁️ Production Deployment Architecture (Render)

The platform is configured for zero-friction deployment to **Render** across two dedicated services:

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│      Google Spreadsheet         │           │       Teacher / Student         │
│    (Single Source of Truth)     │           │      (Browser or Installed PWA) │
└───────────────┬─────────────────┘           └────────────────┬────────────────┘
                │ Direct CSV Stream                            │
                ▼                                              │ Loads SPA assets
┌─────────────────────────────────┐           ┌────────────────┴────────────────┐
│       Render Web Service        │◄──────────┤       Render Static Site        │
│   (semester-marks-backend)      │   CORS    │  (semester-marks-analytics)     │
│   Port dynamic / Node.js ESM    │  REST API │   Published from frontend/dist  │
│   Health check: /health         │           │   SPA rewrite: /* -> index.html │
└─────────────────────────────────┘           └─────────────────────────────────┘
```

For complete deployment instructions and environment configurations:
- 📖 [**DEPLOYMENT_GUIDE.md**](./DEPLOYMENT_GUIDE.md): Step-by-step instructions for creating and linking Render services.
- ⚙️ [**ENVIRONMENT_VARIABLES.md**](./ENVIRONMENT_VARIABLES.md): Detailed reference of all frontend and backend variables.
- ✅ [**PRODUCTION_CHECKLIST.md**](./PRODUCTION_CHECKLIST.md): Pre-flight checklist for production readiness.

---

## ⚡ Running the Platform Locally

### Prerequisites
- Node.js v18+ (Node v20 or v24 recommended)
- npm v9+

### 1. Start the Backend Web Service
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000` with root health endpoint at `http://localhost:5000/health`.*

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` with reverse proxy to `http://localhost:5000/api`.*

### 3. Run Automated Tests & Production Builds
```bash
# Run backend test suite (50 unit & integration tests)
cd backend
npm test

# Build backend for production
npm run build

# Build frontend for production
cd ../frontend
npm run build
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Root health check for cloud service probes (Render Web Service) |
| `GET` | `/api/health` | API health check with process uptime and sync status |
| `GET` | `/api/dashboard?cat=CAT-1` | Summary KPI cards, chart metrics, and attention lists |
| `GET` | `/api/students` | Searchable directory of students with pagination |
| `GET` | `/api/students/:id` | Individual student profile with subject marks |
| `GET` | `/api/students/passed` | Students passing all 5 subjects in the selected CAT |
| `GET` | `/api/students/failed` | Students failing ≥ 1 subject with fail tags |
| `GET` | `/api/students/absent` | Students recorded absent in the selected CAT |
| `GET` | `/api/subjects` | Pass percentages and statistics across all 5 subjects |
| `GET` | `/api/subjects/:id` | Deep dive into DL, GEN AI, RL, BA, or RE&CCE |
| `GET` | `/api/cat/:catNum` | CAT-1, CAT-2, or CAT-3 examination analytics |
| `GET` | `/api/assessment/issues`| Internal assessment submission tracking |
| `GET` | `/api/assignment/issues`| Assignment submission tracking |
| `GET` | `/api/data-quality` | Diagnostic audit of spreadsheet values and headers |
| `GET` | `/api/sync/status` | Current connection status and last fetch timestamp |
| `POST`| `/api/sync/now` | Trigger immediate synchronization from Google Sheets |
| `GET/POST`| `/api/connection` | View or update connected Google Spreadsheet URL |
| `GET/POST`| `/api/settings` | Configure passing marks, max marks, and college name |
| `GET` | `/api/reports/excel` | Download formatted master Excel marksheet (`.xlsx`) |
| `GET` | `/api/reports/pdf` | Download official landscape PDF report (`.pdf`) |
| `GET` | `/api/reports/template`| Download standard Google Sheets marks CSV template |

---

## 🔒 Security & Data Privacy

- **Strict Student Privacy**: No student marks or personal details are persisted in browser storage (`localStorage`, `sessionStorage`, `IndexedDB`) or committed to Git.
- **Zero-Cache Response Headers**: All `/api/*` endpoints issue HTTP `Cache-Control: no-store` headers.
- **CORS Lockdown**: Backend enforces explicit origin checking against `FRONTEND_URL` in production.
- **Masked Credentials**: Institutional Google Apps Script tokens are masked before connection settings are returned to the client.
