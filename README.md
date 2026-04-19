# Stadscyklar Sverige

A real-time bike-sharing station tracker for Sweden, built with React, Node.js, and Socket.IO.

Station data is fetched from the public CityBikes API every 10 seconds and pushed live to all connected clients — no page refresh needed.

---

## Features

- **Live updates** — stations refresh automatically every 10 seconds via WebSockets
- **Sweden only** — filters the CityBikes API to Swedish networks exclusively
- **List view** — stations grouped by city in collapsible panels, with a search bar
- **Map view** — interactive Leaflet map with colour-coded markers (green / amber / red)
- **Jump to map** — click the pin icon on any station card to fly to it on the map and open its popup
- **Stats bar** — live counts of cities, stations, available bikes, and free docks
- **Swedish UI** — all interface text is in Swedish
- **Responsive** — works on desktop and mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Map | Leaflet 1.9, react-leaflet 4 |
| Real-time | Socket.IO (client + server) |
| Backend | Node.js 18+, Express 4 |
| Data source | CityBikes API (api.citybik.es) |
| Storage | In-memory (no database) |

---

## Project Structure

```
City Bikes Tracker/
├── backend/
│   ├── package.json
│   └── server.js          # Express + Socket.IO server, polls CityBikes API
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── index.css
        ├── App.jsx                     # Root component, all top-level state
        └── components/
            ├── StationList.jsx         # Collapsible city panels
            ├── StationItem.jsx         # Individual station card
            └── MapView.jsx             # Leaflet map with live markers
```

---

## Requirements

- Node.js 18 or later (native `fetch` is used in the backend)
- npm

---

## Getting Started

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start the backend

```bash
cd backend
npm run dev
```

The server starts on `http://localhost:3001`. On startup it immediately fetches station data and then repeats every 10 seconds. You will see log output like:

```
Backend running on http://localhost:3001
[2024-...] Updated: 84 stations across 3 networks
```

### 3. Start the frontend

In a separate terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## How It Works

1. The backend calls `GET api.citybik.es/v2/networks`, filters for `country === 'SE'`, then fetches full station data for each Swedish network in parallel.
2. The combined station list is stored in memory and broadcast to all connected clients via `socket.emit('stations', stations)`.
3. The frontend connects via Socket.IO and calls `setStations()` on every broadcast, triggering a re-render.
4. The REST endpoint `GET /api/stations` is also available for direct JSON access.

---

## Station Card

Each card shows:

- Network name and city
- **Tillgänglig** (green) / **Få** (amber, ≤ 2 bikes) / **Tom** (red, 0 bikes) status pill
- Available bike count and free dock count
- Capacity bar (percentage of slots currently holding bikes)
- Map pin icon — click to jump to that station on the map

---

## Map View

- Markers are colour-coded: green (bikes available), amber (1–2 bikes), red (empty)
- Click any marker to see a popup with bike and dock counts
- Click the pin icon on a station card to fly to it at zoom 15 and open its popup automatically
- The focused highlight clears when you click anywhere on the map or switch back to list view

---

## Available Scripts

### Backend

| Script | Description |
|---|---|
| `npm run dev` | Start with `--watch` (auto-restarts on file change) |
| `npm start` | Start without watch mode |

### Frontend

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend port (set as environment variable) |

The Vite dev server proxies `/api` to `http://localhost:3001`, so you can call `/api/stations` from the frontend without hardcoding the backend URL.

---

## License

MIT
