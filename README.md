# 🎸 Tabber - Guitar Tab Finder & Manager

A modern Single Page Application (SPA) built for guitarists to **find, store, and practice guitar tabs**, featuring **React 18 + TypeScript** connecting directly to **Supabase Cloud (PostgreSQL + Realtime)** with automatic local storage fallback.

---

## 🌟 Key Features

- **⚡ Direct Supabase (BaaS) Architecture**:
  - No middleman backend needed to store or sync guitar tabs.
  - Connects directly from React via `@supabase/supabase-js`.
  - **Live Real-Time Syncing**: Changes made on one device (or window) appear instantly on all others in real time.
- **🔍 Search & Find Tabs**:
  - Instant live search matching song titles, artists, or lyrics & chords.
  - Quick filter chips: `All`, `⭐ Favorites`, `Beginner`, `Intermediate`, and `Advanced`.
- **🎸 Standardized Chords & SVG Diagrams**:
  - **Chords Over Lyrics**: Uses standard ChordPro syntax (e.g. `[G]Almost [D]heaven...`) to align chord names directly over words.
  - **SVG Chord Diagram Side Panel**: Displays interactive fretboard diagrams matching real guitar fingerings with barre indicators, fret offsets, and open/muted string markers.
- **🎵 Hands-Free Practice Tools**:
  - **Auto-Scroll**: Toggleable hands-free auto-scroller with adjustable speed (1x - 5x).
  - **Font Zoom**: Instant font sizing (`A-` / `A+`).
  - **Monospaced Layout**: Keeps 6-string fingerstyle staves aligned.
- **💾 Offline / Local Storage Fallback**:
  - Runs out of the box with classic starter tabs even before entering Supabase keys.

---

## 📁 Project Structure

```text
tabber/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChordDiagram.tsx   # SVG guitar chord diagram component
│   │   │   ├── LyricChordView.tsx # Chords-over-lyrics & tab renderer
│   │   │   ├── TabEditorModal.tsx # Modal to store/edit guitar tabs
│   │   │   └── TabViewer.tsx      # Tab viewer with auto-scroll & chord sidebar
│   │   ├── services/
│   │   │   ├── api.ts             # Direct Supabase table queries & local fallback
│   │   │   ├── starterData.ts     # Seed tabs for offline/demo mode
│   │   │   └── supabase.ts        # Supabase client initialization
│   │   ├── types/
│   │   │   └── api.ts             # TypeScript interfaces
│   │   ├── utils/
│   │   │   └── chordData.ts       # Chord dictionary & fingering definitions
│   │   ├── App.css                # Musician dark & parchment styling
│   │   ├── App.tsx                # Main dashboard with realtime sync
│   │   ├── index.css              # Global variables & typography
│   │   └── main.tsx               # React entry point
│   ├── .env.example               # Supabase credentials template
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                       # Optional auxiliary Python service
│   ├── supabase_schema.sql        # Supabase SQL table & seed setup script
│   └── ...
├── .gitignore
└── README.md
```

---

## 🚀 Quickstart

### 1. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

*(By default, it will run in `💾 Local Storage (Demo)` mode with starter songs ready to play!)*

---

## ☁️ Connecting Supabase (in 2 Minutes)

### Step 1: Run the Database Schema in Supabase
1. Log into your project on **[supabase.com](https://supabase.com)**.
2. Click **SQL Editor** in the left sidebar.
3. Open [`backend/supabase_schema.sql`](backend/supabase_schema.sql), copy its contents, paste it into the editor, and click **Run**.

### Step 2: Grab Keys from the "Connect" Button
1. At the top of your Supabase dashboard, click the **"Connect"** button (next to your project status).
2. Choose **"App"** or **"React / Vite"**.
3. Copy the two lines into `frontend/.env`:
   ```bash
   cd frontend
   cp .env.example .env
   ```
   Paste your values:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```

### Step 3: Restart Vite
Restart `npm run dev`. The status pill in the top right will turn into **`☁️ Supabase Cloud (Live)`**, and your tabs will now sync to the cloud in real time!
