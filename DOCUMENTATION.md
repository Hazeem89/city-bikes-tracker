# Stadscyklar Sverige — Project Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Data Flow](#3-data-flow)
4. [Backend](#4-backend)
5. [Frontend](#5-frontend)
6. [Component Reference](#6-component-reference)
7. [UI & Design System](#7-ui--design-system)
8. [External API](#8-external-api)
9. [State Management](#9-state-management)
10. [Known Limitations & Extension Points](#10-known-limitations--extension-points)

---

## 1. Project Overview

**Stadscyklar Sverige** is a real-time bike-sharing station tracker focused exclusively on Sweden. It polls the public CityBikes API every 10 seconds, filters for Swedish networks, and pushes live updates to all connected browser clients via WebSockets.

The application is a full-stack local project with a clear separation between backend and frontend. There is no database — all station data is held in memory on the backend and replaced on every poll cycle.

**Language:** Swedish (UI), English (code and documentation)

---

## 2. Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                    │
│                                             │
│  React 18 + Vite (localhost:5173)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   App    │  │StationList│  │ MapView  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│        │  Socket.IO client                  │
└────────┼────────────────────────────────────┘
         │ WebSocket (ws://localhost:3001)
┌────────┼────────────────────────────────────┐
│        │         Backend                    │
│  Express + Socket.IO (localhost:3001)       │
│        │                                    │
│  ┌─────▼──────┐    ┌────────────────────┐   │
│  │ In-memory  │◄───│ fetchSwedenStations │   │
│  │  stations[]│    │  (every 10s)        │   │
│  └────────────┘    └────────────────────┘   │
│        │                    │               │
│  REST GET /api/stations      │               │
└─────────────────────────────┼───────────────┘
                               │ HTTP
                    ┌──────────▼──────────┐
                    │  CityBikes API       │
                    │  api.citybik.es/v2  │
                    └─────────────────────┘
```

### Key design choices

| Decision | Rationale |
|---|---|
| In-memory storage | No persistence needed; data is refreshed every 10 s from the live API |
| Socket.IO over plain WebSocket | Automatic reconnection, event namespacing, fallback transports |
| `Promise.all` for network fetches | Fetches all Swedish networks in parallel, minimising total latency |
| `useMemo` for search filtering | Avoids re-filtering the full station list on every render |
| `key={view}` on content wrapper | Forces remount on view switch, re-triggering the CSS enter animation |

---

## 3. Data Flow

### Initial connection

```
Client connects via Socket.IO
  → server emits current stations[] immediately
  → client sets state, renders list
```

### Polling cycle (every 10 seconds)

```
setInterval triggers fetchSwedenStations()
  → GET api.citybik.es/v2/networks
  → filter networks where location.country === 'SE'
  → Promise.all: GET each network's full detail
  → flatten all stations into one array
  → replace in-memory stations[]
  → io.emit('stations', stations)  ← broadcast to all clients
  → each client: socket.on('stations') → setStations() → re-render
```

### Station focus (map pin click)

```
User clicks map-pin icon on a StationItem
  → App.showOnMap(station)
      → setFocusedStation(station)
      → setView('map')
  → MapView renders with focusedStation set
      → FlyToStation: map.flyTo([lat, lng], zoom=15)
      → StationMarker with focused=true: markerRef.current.openPopup()
      → marker renders larger (r=12) with teal border

User clicks anywhere on the map
  → MapClickHandler: useMapEvents({ click: onClearFocus })
  → setFocusedStation(null) → marker returns to normal

User switches back to Lista
  → switchView('list') → setFocusedStation(null)
```

---

## 4. Backend

**Entry point:** `backend/server.js`
**Runtime:** Node.js 18+ (native `fetch` required)
**Port:** `3001` (configurable via `PORT` env var)

### Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.18.2 | HTTP server and REST routing |
| `socket.io` | ^4.7.5 | WebSocket server with auto-reconnect |
| `cors` | ^2.8.5 | Cross-origin headers for Vite dev server |

### REST endpoint

```
GET /api/stations
```

Returns the current in-memory `stations[]` as JSON. Useful for debugging or non-WebSocket consumers. Returns an empty array `[]` before the first poll completes.

### Socket.IO events

| Direction | Event | Payload |
|---|---|---|
| Server → Client | `stations` | `Station[]` — full array, sent on connect and after every poll |

### Station object shape

```js
{
  id: string,          // "{networkId}::{stationId}" — globally unique
  networkId: string,   // CityBikes network slug
  networkName: string, // Human-readable network name
  city: string,        // City from network location
  name: string,        // Station name
  lat: number,         // WGS-84 latitude
  lng: number,         // WGS-84 longitude
  freeBikes: number,   // Available bikes (null coerced to 0)
  emptySlots: number,  // Available docking slots (null coerced to 0)
  updatedAt: string,   // ISO timestamp from CityBikes
}
```

### Error handling

If any fetch fails (network error, API down), the error is logged to stdout and the previous `stations[]` is kept unchanged. Clients continue showing stale data until the next successful poll.

---

## 5. Frontend

**Dev server:** Vite 5 on `localhost:5173`
**Build tool:** Vite + `@vitejs/plugin-react`
**Styling:** Tailwind CSS 3 + PostCSS + Autoprefixer
**Map:** Leaflet 1.9 via react-leaflet 4

### Dependencies

| Package | Purpose |
|---|---|
| `react` / `react-dom` | UI framework |
| `socket.io-client` | WebSocket client |
| `leaflet` + `react-leaflet` | Interactive map |
| `tailwindcss` | Utility-first styling |
| `vite` + `@vitejs/plugin-react` | Dev server and bundler |

### Vite proxy

`vite.config.js` proxies `/api` to `http://localhost:3001`, so the frontend can call `/api/stations` without hardcoding the backend port. Socket.IO still connects directly to `http://localhost:3001`.

---

## 6. Component Reference

### `App` — `src/App.jsx`

Root component. Owns all top-level state and the Socket.IO connection (module-level singleton).

**State**

| State | Type | Description |
|---|---|---|
| `stations` | `Station[]` | Latest full station list from the server |
| `connected` | `boolean` | Socket.IO connection status |
| `lastUpdated` | `Date \| null` | Timestamp of the last received `stations` event |
| `view` | `'list' \| 'map'` | Current active view |
| `search` | `string` | Live search query |
| `focusedStation` | `Station \| null` | Station to fly to and highlight on the map |

**Key functions**

- `showOnMap(station)` — sets `focusedStation` and switches to map view
- `switchView(v)` — switches view; clears `focusedStation` when switching to list
- `filtered` (memo) — station list filtered by `search` across city, networkName, and name

**Renders**

- Sticky header with connection indicator and last-updated time
- Stats bar (cities, stations, available bikes, free docks)
- Search input + Lista/Karta toggle
- Content area: `StationList` or `MapView`, wrapped in `key={view}` for enter animation

---

### `StationList` — `src/components/StationList.jsx`

Displays stations grouped by city as collapsible accordion panels.

**Props**

| Prop | Type | Description |
|---|---|---|
| `stations` | `Station[]` | Filtered station list from App |
| `onShowOnMap` | `(station) => void` | Passed down to each StationItem |

**Behaviour**

- Groups stations by `city`, sorts cities alphabetically
- Each city is a panel collapsed by default (`expanded` state initialises to `{}`)
- Clicking the city header toggles it; state is per-city so panels are independent
- Shows station count in the header
- Chevron (&#8964;) rotates 180° when open

---

### `StationItem` — `src/components/StationItem.jsx`

Card UI for a single station.

**Props**

| Prop | Type | Description |
|---|---|---|
| `station` | `Station` | Station data object |
| `onShowOnMap` | `(station) => void` | Called when the map-pin icon is clicked |

**Displays**

- Network name (teal, uppercase)
- Map-pin icon button (calls `onShowOnMap`, tooltip: "Visa på karta")
- Availability pill: **Tillgänglig** (green) / **Få** (amber, ≤ 2 bikes) / **Tom** (red, 0 bikes)
- Station name and city
- Bike count (colour-coded) and dock count
- Capacity progress bar showing percentage of slots occupied by bikes

---

### `MapView` — `src/components/MapView.jsx`

Interactive Leaflet map of Sweden with one `CircleMarker` per station.

**Props**

| Prop | Type | Description |
|---|---|---|
| `stations` | `Station[]` | Filtered station list |
| `focusedStation` | `Station \| null` | Station to highlight and fly to |
| `onClearFocus` | `() => void` | Called on map background click |

**Internal components**

| Component | Purpose |
|---|---|
| `MapClickHandler` | `useMapEvents({ click })` — clears focus when the map background is clicked |
| `FlyToStation` | `useMap()` + `useEffect` — calls `map.flyTo([lat, lng], 15, { duration: 1 })` when `focusedStation` changes |
| `StationMarker` | `CircleMarker` with a `ref`; when `focused` becomes true, calls `markerRef.current.openPopup()` |

**Marker colours**

| Colour | Condition |
|---|---|
| `#34d399` (green) | `freeBikes > 2` |
| `#fbbf24` (amber) | `freeBikes` is 1 or 2 |
| `#f87171` (red) | `freeBikes === 0` |

Focused marker: radius 12 (vs 8), teal border `#0f766e`, weight 3.

**Map defaults:** center `[62.0, 15.0]`, zoom 5 (full Sweden view). OpenStreetMap tiles.

---

## 7. UI & Design System

### Colour palette (Tailwind)

| Role | Tailwind token | Hex |
|---|---|---|
| Page background | `from-sky-50 to-emerald-50` | gradient |
| Card background | `white` | `#ffffff` |
| Card border | `sky-100` | `#e0f2fe` |
| Primary accent | `teal-500` | `#14b8a6` |
| Network label | `teal-600` | `#0d9488` |
| City header dot | `teal-400` | `#2dd4bf` |
| Available bikes | `emerald-600` / `emerald-100` | `#059669` / `#d1fae5` |
| Low bikes | `amber-600` / `amber-100` | `#d97706` / `#fef3c7` |
| No bikes | `red-600` / `red-100` | `#dc2626` / `#fee2e2` |
| Dock count | `sky-700` / `sky-50` | `#0369a1` / `#f0f9ff` |
| Connected indicator | `emerald-400` | `#34d399` |
| Disconnected indicator | `red-400` | `#f87171` |

### View transition

Defined in `src/index.css`:

```css
@keyframes view-enter {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.view-enter { animation: view-enter 0.3s ease-out both; }
```

Applied to the `key={view}` wrapper in `App`. Re-triggers on every view switch.

### Responsiveness

- Stats bar: 2 columns on mobile, 4 on `md+`
- Station grid: 1 col → 2 (`sm`) → 3 (`lg`) → 4 (`xl`)
- Last-updated time: hidden on small screens (`hidden sm:inline`)
- Controls: stacked on mobile, row on `sm+`

---

## 8. External API

**Base URL:** `http://api.citybik.es/v2`
**Authentication:** None
**Rate limiting:** Undocumented; polling at 10 s intervals is conservative

### Endpoints used

#### `GET /networks`

Returns all bike-sharing networks worldwide. The backend filters on:

```js
network.location.country === 'SE'
```

#### `GET /networks/{id}`

Returns full network detail including the `stations` array. Called once per Swedish network per polling cycle.

**Note:** The API returns `free_bikes` and `empty_slots` as integers or `null`. The backend coerces `null` to `0` using the nullish coalescing operator (`?? 0`).

---

## 9. State Management

There is no external state library. All state is managed with React's built-in `useState` and `useMemo` hooks.

```
App (owns all state)
 ├── stations[]         ← from Socket.IO
 ├── connected          ← from Socket.IO
 ├── lastUpdated        ← from Socket.IO
 ├── view               ← user interaction
 ├── search             ← user interaction
 ├── focusedStation     ← set by StationItem, cleared by MapView/switchView
 │
 ├── filtered (memo)    ← derived from stations + search
 │
 ├── StationList
 │    ├── expanded{}    ← local: which city panels are open
 │    └── StationItem   ← receives onShowOnMap callback
 │
 └── MapView            ← receives focusedStation + onClearFocus
```

The Socket.IO client is instantiated once at module level (outside the component) to survive re-renders.

---

## 10. Known Limitations & Extension Points

### Limitations

- **No database** — restarting the server loses nothing, but a client connecting during the first 10 s before the first poll receives an empty array.
- **CORS is open (`origin: '*'`)** — suitable for local development only; should be restricted for any deployment.
- **CityBikes API is HTTP** — not HTTPS; fine for local use, blocked in some browser environments.
- **No authentication** — the `/api/stations` endpoint and Socket.IO server are publicly accessible on the local network.

### Extension points

| Feature | Where to add |
|---|---|
| Filter by city or availability | Add filter state in `App`, pass to `StationList` |
| Notifications (empty station alert) | Compare previous and next `stations[]` in the `socket.on('stations')` handler |
| Search by station name on the map | Pass `search` into `MapView`, filter markers |
| Persist last-seen data across restarts | Write `stations[]` to a JSON file after each poll |
| Deploy to a server | Set `PORT` env var; restrict CORS origin; use a process manager (PM2) |
| Dark mode | Add Tailwind `dark:` variants and a toggle in the header |
