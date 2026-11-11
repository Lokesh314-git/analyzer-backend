# Render Production Deployment Guide
**Semester Marks Analytics Platform**

This guide provides end-to-end instructions for deploying the Semester Marks Analytics Platform to **Render** using a high-performance split architecture:
- **Backend**: Render Web Service (Node.js 20+ / Express)
- **Frontend**: Render Static Site (React 18 + Vite SPA)

---

## Architecture Topology

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

---

## Deployment Strategy & Sequence

Deploy the services in the following order:
1. **Deploy the Backend Web Service first** to obtain its live HTTPS URL (`https://semester-marks-backend.onrender.com`).
2. **Deploy the Frontend Static Site second**, injecting the backend URL as `VITE_API_BASE_URL`.
3. **Update the Backend's `FRONTEND_URL`** with the deployed frontend URL to lock down CORS.

---

## Step 1: Deploy Backend Web Service

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top navigation bar and select **Web Service**.
3. Connect your GitHub repository (`Lokesh314-git/analyzer-backend`).
4. Configure the Web Service settings as follows:

| Field | Configuration Value |
|---|---|
| **Name** | `semester-marks-backend` (or your choice) |
| **Region** | Choose the region closest to your users (e.g., *Singapore*, *Frankfurt*, *Oregon*) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or Starter) |

5. Scroll down to **Advanced** and expand the section:
   - **Health Check Path**: `/health` (or `/api/health`)
   - **Auto-Deploy**: Yes (recommended)
6. Add the following **Environment Variables**:

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations and disables stack trace leakage |
| `FRONTEND_URL` | `*` (temporarily until frontend is created) | Will update in Step 3 |
| `SPREADSHEET_ID` | `1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY` | Your Google Sheets Document ID |
| `SPREADSHEET_URL` | `https://docs.google.com/spreadsheets/d/1EAvs5Do15sVTqKk6vuCgEBrHdsZFXZaHhOapyHFAPJY/edit?usp=sharing` | Share link |

7. Click **Create Web Service**.
8. Wait for the build and deployment to complete. Once deployed, copy your backend URL (e.g., `https://semester-marks-backend.onrender.com`).

### Verify Backend Deployment
Open a browser tab or terminal and run:
```bash
curl https://semester-marks-backend.onrender.com/health
```
You should receive a `200 OK` response:
```json
{
  "status": "ok",
  "service": "semester-marks-backend",
  "uptime": 12,
  "timestamp": "2026-11-11T13:20:00.000Z",
  "sheetsIntegration": {
    "status": "success",
    "lastSuccessfulSync": "2026-11-11T13:20:00.000Z"
  }
}
```

---

## Step 2: Deploy Frontend Static Site

1. In the Render Dashboard, click **New +** and select **Static Site**.
2. Connect the same GitHub repository (`Lokesh314-git/analyzer-backend`).
3. Configure the Static Site settings:

| Field | Configuration Value |
|---|---|
| **Name** | `semester-marks-analytics` (or your choice) |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. Scroll down to **Redirects / Rewrites**:
   - The repository includes a `frontend/public/_redirects` file that automatically handles rewrites.
   - You can also add an explicit rule in Render:
     - **Type**: `Rewrite`
     - **Source**: `/*`
     - **Destination**: `/index.html`
5. Add the following **Environment Variable**:

| Key | Value | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `https://semester-marks-backend.onrender.com` | Use your actual backend URL from Step 1 (NO trailing slash) |

6. Click **Create Static Site**.
7. Wait for the build to finish. Once published, Render provides your frontend URL (e.g., `https://semester-marks-analytics.onrender.com`).

---

## Step 3: Lock Down Backend CORS

Now that your frontend URL is live:
1. Navigate back to your **Backend Web Service** in Render.
2. Go to **Environment**.
3. Update `FRONTEND_URL` to match your frontend domain:
   ```env
   FRONTEND_URL=https://semester-marks-analytics.onrender.com
   ```
   *(If you also use a custom domain, provide comma-separated values: `https://semester-marks-analytics.onrender.com,https://yourdomain.edu`)*
4. Click **Save Changes**. Render will automatically re-deploy the backend with the new CORS origin restriction in seconds.

---

## Step 4: End-to-End Post-Deployment Verification

Verify each key component of the live application:

1. **Dashboard Loading**:
   - Open `https://<frontend-url>.onrender.com` in your browser.
   - Verify that CAT-1, CAT-2, and CAT-3 summary statistics (Pass Rate, Class Average, Top Performers) load cleanly without mock student data.
2. **Deep-Link SPA Routing**:
   - Navigate directly to `https://<frontend-url>.onrender.com/students` and press browser refresh (**F5**).
   - Ensure the page reloads cleanly without a 404 error.
3. **Report Generation**:
   - Go to `/reports` and test downloading:
     - Master Excel Marksheet (`.xlsx`)
     - Official PDF Examination Report (`.pdf`)
     - CSV Template (`.csv`)
   - Confirm file downloads trigger and format correctly.
4. **PWA Installability**:
   - On Chrome or mobile Safari, verify the browser recognizes the app as an installable PWA.
   - Check the custom install banner and verify that application icons render crisply.

---

## Troubleshooting & FAQ

### Issue 1: API calls return 404 on the Frontend
- **Cause**: `VITE_API_BASE_URL` was not set during the frontend build, causing the browser to send requests to `https://<frontend-url>/api/...` instead of the backend Web Service.
- **Fix**: In the Render Static Site dashboard, verify that `VITE_API_BASE_URL` is configured under **Environment**, then trigger **Manual Deploy > Clear build cache & deploy** (Vite embeds variables at build time).

### Issue 2: CORS Error in Browser Console (`CORS blocked for origin...`)
- **Cause**: The backend's `FRONTEND_URL` does not match the frontend's origin, or has a trailing slash.
- **Fix**: In the backend's environment variables, ensure `FRONTEND_URL` has no trailing slash (e.g., `https://semester-marks-analytics.onrender.com`).

### Issue 3: Page refresh on `/students` or `/cat/1` shows 404
- **Cause**: Static host is not rewriting requests to `index.html`.
- **Fix**: Verify `frontend/public/_redirects` exists and is published in `dist/`. In the Render Static Site dashboard, add a Rewrite rule: Source `/*`, Destination `/index.html`, Action `Rewrite`.

### Issue 4: Backend Free Tier Sleep Mode
- **Cause**: On Render's Free tier, Web Services spin down after 15 minutes of inactivity. The initial request can take 30–50 seconds to wake up.
- **Fix**: The frontend displays a smooth loading indicator with automatic retry. For zero cold starts, upgrade the backend to the Render Starter instance ($7/month).

