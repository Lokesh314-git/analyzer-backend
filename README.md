# Semester Marks Analytics Platform
**Production-Ready Academic SaaS | Google Sheets Link-Only Integration | Desktop & Mobile Responsive**

A specialized, read-only academic analytics platform engineered for college lecturers to monitor student semester examination marks, track continuous assessment tests (CAT), analyze subject-level performance, audit assignment and assessment submissions, identify pass/fail/absent students, and export official reports.

---

## 🚀 Key Highlights & Architectural Features

1. **Google Sheets Link-Only Integration (Zero-Cloud Setup)**
   - Connects to public Google Sheets via URL without requiring Google Cloud projects, OAuth tokens, or API keys.
   - Live synchronization parses the single source of truth every 30 seconds with manual **"Sync Now"** capability.
   - **Cache Resilience**: Caches the last successful dataset in memory. If Google Sheets is temporarily unreachable, the platform continues serving cached academic data with a visible stale-data notice. Valid cached data is **never** overwritten by failed responses.
   - **Strict Read-Only Enforcement**: Outbound requests are limited to read operations. No student records or spreadsheet structures can be modified.

2. **Accurate Academic Classification Engine**
   - **Scale**: Maximum marks: 40 | Passing threshold: 16 (both dynamically configurable in Settings).
   - **Grading Matrix**:
     - `16 – 40`: **PASS**
     - `0 – 15`: **FAIL**
     - `A / AB / ABSENT`: **ABSENT**
     - `Blank`: **PENDING** (Never silently converted to zero)
     - `> 40 or Unrecognized text`: **INVALID** (Flagged in Data Quality diagnostics)
   - **Independent Overall CAT Classification**:
     - **PASS**: All 5 subjects (DL, GEN AI, RL, BA, RE&CCE) passed.
     - **FAIL**: At least 1 subject failed (the student appears in that subject's fail list and overall fail list).
     - **ABSENT**: No failed subjects, but at least 1 subject is absent.
     - **PENDING**: No failures or absences, but at least 1 mark is pending.
     - **INVALID**: Unresolved invalid marks exist.

3. **Separate Assessment & Assignment Tracking**
   - Completely independent modules for Internal Assessments and Assignments.
   - **Submission Matrix**:
     - `Explicit NS / Not Submitted`: **NOT SUBMITTED**
     - `Numeric 0`: **ZERO MARKS** (Never classified as not submitted)
     - `Positive Numeric Score`: **SUBMITTED / MARKED**
     - `Blank`: **PENDING / UNCONFIRMED**
     - `Invalid / Corrupt`: **INVALID**

4. **Multi-Format Academic Reporting**
   - **Excel Workbooks (`.xlsx`)**: Formatted master marksheets with colored pass/fail conditional styling generated via ExcelJS.
   - **Official PDF Reports (`.pdf`)**: Publication-ready landscape academic scorecards with institutional headers, statistics boxes, and student marks.
   - **CSV Template Generator**: Downloadable CSV pre-populated with all 54 students and standard column headers.

5. **Desktop & Mobile Responsive Design**
   - Automated audit verified across 10 viewport widths (320px, 360px, 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px, 1920px) with **0 horizontal overflows**.
   - Collapsible desktop sidebar navigation, responsive slide-out mobile drawer, touch-friendly KPI cards, and responsive data tables.
   - Accessible Light and Dark themes with contrast preservation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router v7 |
| **Backend** | Node.js, Express.js, TypeScript, CSV-Parse, ExcelJS, jsPDF, jsPDF-AutoTable |
| **Data Source** | Google Sheets CSV Export via Public Link |
| **Testing** | Vitest (Unit & Integration), Playwright Core (Responsive Viewport Audits) |

---

## 📂 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/              # Academic & Sheets runtime configurations
│   │   ├── controllers/         # REST API route controllers
│   │   ├── middleware/          # Security, error handling, CORS
│   │   ├── routes/              # Express API route declarations
│   │   ├── services/
│   │   │   ├── analytics/       # Grading engine, dashboard analytics, tracking
│   │   │   ├── googleSheets/    # CSV fetcher, validator, and default roster
│   │   │   ├── reports/         # ExcelJS & jsPDF document generators
│   │   │   └── synchronization/ # Periodic sync manager & in-memory cache
│   │   ├── tests/               # Vitest test suite & responsive viewport auditor
│   │   ├── types/               # TypeScript interfaces & types
│   │   └── index.ts             # Express server entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/          # Recharts performance trend, pass rate, donut
│   │   │   ├── layout/          # Sidebar, Header, Breadcrumbs, AppLayout
│   │   │   └── shared/          # StatusBadge, MetricCard, SyncIndicator
│   │   ├── context/             # SyncContext (30s live state), ThemeContext
│   │   ├── pages/
│   │   │   ├── Dashboard/       # Main academic dashboard with KPI cards
│   │   │   ├── Students/        # All Students, Student Profile, Passed, Failed, Absent
│   │   │   ├── Subjects/        # Curriculum overview & DL, GEN AI, RL, BA, RE&CCE pages
│   │   │   ├── CAT/             # CAT-1, CAT-2, CAT-3 analytics
│   │   │   ├── Assessment/      # Internal assessment submission tracking
│   │   │   ├── Assignment/      # Assignment submission tracking
│   │   │   ├── Reports/         # Download Excel, PDF, and CSV templates
│   │   │   ├── Connection/      # Dedicated Google Sheets connection & Data Quality
│   │   │   └── Settings/        # Academic parameters & sync interval config
│   │   ├── services/            # Axios API client
│   │   ├── types/               # Frontend academic types
│   │   ├── App.tsx              # Router declaration
│   │   ├── index.css            # Tailwind directives & responsive rules
│   │   └── main.tsx             # React DOM root
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service uptime and health check |
| `GET` | `/api/dashboard?cat=CAT-1` | Summary KPI cards, chart metrics, and attention lists |
| `GET` | `/api/students` | Filterable, searchable directory of all 54 students |
| `GET` | `/api/students/:id` | Individual student profile with subject breakdown |
| `GET` | `/api/students/passed` | Students passing all 5 subjects in the selected CAT |
| `GET` | `/api/students/failed` | Students failing ≥ 1 subject with failure tags |
| `GET` | `/api/students/absent` | Students recorded absent in the selected CAT |
| `GET` | `/api/subjects` | Pass percentages and statistics across all 5 subjects |
| `GET` | `/api/subjects/:id` | Deep dive into DL, GEN AI, RL, BA, or RE&CCE |
| `GET` | `/api/cat/:catNum` | CAT-1, CAT-2, or CAT-3 examination analytics |
| `GET` | `/api/assessment/issues` | Internal assessment submission compliance |
| `GET` | `/api/assignment/issues` | Assignment submission compliance |
| `GET` | `/api/data-quality` | Diagnostic audit of spreadsheet values and headers |
| `GET` | `/api/sync/status` | Connection status, last sync timestamp, and cache state |
| `POST` | `/api/sync/now` | Trigger immediate synchronization from Google Sheets |
| `GET/POST`| `/api/connection` | View or update connected Google Spreadsheet URL |
| `GET/POST`| `/api/settings` | Configure passing marks, max marks, and college name |
| `GET` | `/api/reports/excel` | Download formatted master Excel marksheet (`.xlsx`) |
| `GET` | `/api/reports/pdf` | Download official landscape PDF report (`.pdf`) |
| `GET` | `/api/reports/template`| Download standard Google Sheets marks CSV template |

---

## ⚡ Running the Platform Locally

### Prerequisites
- Node.js v18+ (Node v24 recommended)
- npm v9+

### 1. Start the Backend API
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000`.*

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173` with reverse proxy to `http://localhost:5000/api`.*

### 3. Run Automated Tests
```bash
# Run academic logic and integration tests
cd backend
npm test

# Run responsive viewport browser audit across 10 viewports
node src/tests/run_viewport_tests.js
```

