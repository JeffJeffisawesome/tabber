# 🎸 Tabber - Guitar Tab Finder & Manager

A modern Single Page Application (SPA) built for guitarists to **find, store, and practice guitar tabs**, featuring **TypeScript (React + Vite)** on the frontend and **Python (FastAPI + SQLite)** on the backend.

---

## 🌟 Key Features

- **🔍 Search & Find Tabs**:
  - Instant live search matching song titles, artists, or lyrics & chords.
  - Quick filter chips: `All`, `⭐ Favorites`, `Beginner`, `Intermediate`, and `Advanced`.
  - Pre-seeded with famous classic riffs (Pink Floyd, The Beatles, Eagles, Metallica, Led Zeppelin).
- **💾 Store & Organize Guitar Tabs**:
  - Full CRUD support to store your own guitar tabs and chord sheets.
  - Guitar-specific fields: Song Title, Artist, Tuning presets (Standard, Drop D, DADGAD, Open D/G, Custom), Capo position, Difficulty, and Favorite status.
  - Automatic persistence to a local SQLite database (`tabs.db`) across server restarts.
- **🎵 Hands-Free Practice Tools**:
  - **Auto-Scroll**: Toggleable hands-free auto-scroller with adjustable speed slider (1x - 5x) so you can play without pausing to scroll.
  - **Font Zoom**: Instant font sizing (`A-` / `A+`) for comfortable reading while holding an instrument.
  - **Monospaced Layout**: Perfect ASCII alignment for 6-string staves and chord charts.
  - **One-Click Copy**: Copy complete tab staves directly to clipboard.

---

## 📁 Project Structure

```text
tabber/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── health.py        # GET /api/health
│   │   │   └── tabs.py          # CRUD & search endpoints for guitar tabs
│   │   ├── __init__.py
│   │   ├── config.py            # App settings and CORS origins
│   │   ├── db.py                # SQLite database manager & starter seed tabs
│   │   ├── main.py              # FastAPI application entrypoint
│   │   └── schemas.py           # Pydantic models for Tab, TabCreate, TabUpdate
│   ├── requirements.txt         # Python dependencies (fastapi, uvicorn, pydantic)
│   └── tabs.db                  # Local SQLite database (auto-created on first run)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TabEditorModal.tsx # Modal to store/edit guitar tabs
│   │   │   └── TabViewer.tsx      # Monospaced tab reader with auto-scroll
│   │   ├── services/
│   │   │   └── api.ts             # Typed Fetch API client
│   │   ├── types/
│   │   │   └── api.ts             # TypeScript interfaces for guitar tabs
│   │   ├── App.css                # Musician dark theme & split layout styling
│   │   ├── App.tsx                # Main guitar tab finder & manager dashboard
│   │   ├── index.css              # Global variables & typography
│   │   └── main.tsx               # React entry point
│   ├── index.html                 # HTML entry with guitar favicon
│   ├── package.json               # NPM dependencies & scripts
│   ├── tsconfig.json              # TypeScript configuration
│   └── vite.config.ts             # Vite dev server & /api proxy
├── .gitignore
└── README.md
```

---

## 🚀 Quickstart

### Prerequisites
- **Python 3.9+**
- **Node.js 18+** (or npm/pnpm/yarn)

---

### 1. Start Backend (FastAPI + SQLite)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Root**: [http://localhost:8000](http://localhost:8000)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### 2. Start Frontend (React + TypeScript)

In a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

- **Web App**: Open [http://localhost:5173](http://localhost:5173) in your browser.
- Vite proxies `/api/*` requests directly to `http://localhost:8000`.

---

### 3. Production Build & Deployment

To build a standalone production bundle where FastAPI serves the compiled SPA:

1. **Build the frontend**:
   ```bash
   cd frontend
   npm run build
   ```
2. **Launch FastAPI**:
   ```bash
   cd ../backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   FastAPI automatically mounts `frontend/dist` and serves the web application at `http://localhost:8000/`.
