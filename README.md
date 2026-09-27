# 🎸 Tabber

> A modern, web-based guitar tablature reader, chord sheet manager, and interactive practice tool built with **React 18**, **TypeScript**, and **Supabase**.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ecf8e.svg)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Tabber provides guitarists with a clean, distraction-free environment to read, store, and practice guitar tabs. It combines authentic ASCII tablature alignment, inline ChordPro lyric formatting, dynamic SVG fretboard chord voicings, and hands-free performance tools optimized for both desktop monitors and mobile devices.

---

## ✨ Features

### 📖 Interactive Tab & Lyric Engine
- **ChordPro & Two-Line Chord Support**: Format songs using standard ChordPro syntax (e.g. `[G]Almost [D]heaven`) or standard two-line ASCII chord sheets with automatic chord pill placement.
- **Monospace Alignment for Tablature**: 6-string tablature staves (`e|--- B|--- G|--- D|--- A|--- E|---`) and measure chord annotations preserve exact character spacing without font misalignment.
- **Interactive Chord Inspection**: Clicking any chord pill or tab chord symbol instantly highlights its fretboard diagram and fingering variations.

### 🎸 Dynamic SVG Chord Diagrams & CAGED Engine
- **Accurate Fretboard Fingerings**: Realistic SVG diagrams with open/muted string markers, barre indicators, and base fret offsets.
- **Multi-Voicing Support**: Browse through different voicings and positions up the neck for each chord (open shapes, barre shapes, movable CAGED variations).
- **Responsive Display**: Resizable side panel on desktop and an intuitive bottom-sheet drawer on mobile.

### 📱 Mobile Performance & Focus Mode
- **Dedicated "Maximize Lyrics" Setting**: Collapses navigation bars and headers into an ultra-slim 38px toolbar, allocating ~95% of the mobile screen strictly to lyrics and chords.
- **Collapsible Tab Riff Accordion**: Intro riffs and fingerings are neatly tucked into a 1-tap expandable accordion so they don't push lyrics off the screen.
- **Touch-Friendly Controls**: Fluid touch handles powered by W3C Pointer Events and pointer capture for smooth 60fps interaction on iOS Safari and Android.

### ⚡ Practice & Performance Utilities
- **Hands-Free Auto-Scroll**: Smooth auto-scroller with adjustable speed (1x to 5x) for playing along without taking your hands off the guitar neck.
- **Instant Font Zoom**: Adjust font sizing dynamically (`A-` / `A+`) to match your distance from the screen or tablet stand.
- **Metadata Badges**: Quick indicators for tuning (Standard, Drop D, DADGAD, Half Step Down), capo position, and difficulty rating.

### ☁️ Flexible Storage Architecture
- **Supabase Cloud (PostgreSQL + Realtime)**: Direct database integration with live sync across open devices and authentication (GitHub, Google, Email).
- **Offline / Local Storage Fallback**: Runs immediately out of the box with built-in starter songs, even without an active internet connection or cloud credentials.

---

## 🏗️ Architecture & Project Structure

The project is structured into a modern client-first application with an optional FastAPI backend service:

```text
tabber/
├── frontend/                      # React 18 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/            # UI components
│   │   │   ├── ChordDiagram.tsx   # Dynamic SVG fretboard chord renderer
│   │   │   ├── LyricChordView.tsx # Monospace tab & ChordPro lyric engine
│   │   │   ├── TabEditorModal.tsx # Song creation and editing dialog
│   │   │   └── TabViewer.tsx      # Main tab reader with auto-scroll & focus mode
│   │   ├── context/               # Global state (Authentication, user session)
│   │   ├── hooks/                 # Custom React hooks (useIsMobile, responsive detection)
│   │   ├── services/              # API clients (Supabase queries & LocalStorage fallback)
│   │   ├── types/                 # TypeScript interfaces and schema types
│   │   ├── utils/                 # CAGED chord database and parser algorithms
│   │   ├── App.tsx                # Application layout and responsive state
│   │   └── main.tsx               # Client entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                       # Optional Python / FastAPI auxiliary service
│   ├── app/                       # REST endpoints and SQLite / Supabase connectors
│   ├── supabase_schema.sql        # PostgreSQL table definitions, RLS, and starter data
│   └── requirements.txt
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** (v9+) or **yarn** / **pnpm**

### 1. Clone the Repository
```bash
git clone https://github.com/JeffJeffisawesome/tabber.git
cd tabber
```

### 2. Install Dependencies & Start Dev Server
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser. By default, the application runs in **Local Storage Mode** with starter tabs pre-loaded.

---

## ☁️ Connecting Supabase (Optional)

To enable user accounts, cloud persistence, and multi-device live sync:

1. **Create a Supabase Project**: Create a new project at [supabase.com](https://supabase.com).
2. **Execute Database Schema**:
   - In your Supabase dashboard, navigate to the **SQL Editor**.
   - Copy the contents of [`backend/supabase_schema.sql`](backend/supabase_schema.sql) and run the script. This creates the `tabs` table, indexes, Row-Level Security (RLS) policies, and initial songs.
3. **Configure Environment Variables**:
   - In the `frontend/` directory, create a `.env` file based on `.env.example`:
     ```bash
     cp .env.example .env
     ```
   - Populate your Supabase project URL and public anon key:
     ```env
     VITE_SUPABASE_URL=https://your-project-ref.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-public-key
     ```
4. **Restart the Dev Server**:
   ```bash
   npm run dev
   ```
   The health badge in the navbar will update to **`☁️ Supabase Cloud (Live)`**.

---

## 🐍 Auxiliary Python Backend (Optional)

The frontend communicates directly with Supabase via `@supabase/supabase-js`. For setups requiring a standalone Python backend (e.g. SQLite deployment or server-side automation):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API documentation will be available at `http://localhost:8000/docs`.

---

## 📝 Song Formatting Syntax

Tabber supports both standard **ChordPro syntax** and **ASCII tablature**:

### ChordPro Format (Lyrics & Chords)
Place chord names inside square brackets immediately preceding the syllable they accompany:
```text
[Verse 1]
[G]Almost heaven, [Em]West Virginia
[D]Blue Ridge Mountains, [C]Shenandoah [G]River
```

### 6-String Guitar Tablature
Write standard 6-string staves using string identifiers (`e|`, `B|`, `G|`, `D|`, `A|`, `E|`). Chords placed directly above the staff maintain exact column alignment:
```text
   Em7                  G
e|-------------------|-------------------|
B|-------3-----------|-------3-----------|
G|-------0-----------|-------0-----------|
D|---0h2---2p0-------|---0h2---2p0-------|
A|-------------2-----|-------------2-----|
E|-------------------|---------------3---|
```

### Section Headers
Enclose structural headers in brackets:
```text
[Intro]
[Verse 1]
[Chorus]
[Bridge]
[Guitar Solo]
[Outro]
```

---

## 🛠️ Build & Verification

To verify TypeScript types and generate production-ready assets:

```bash
cd frontend
npm run build
```

To preview the built production bundle locally:
```bash
npm run preview
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
