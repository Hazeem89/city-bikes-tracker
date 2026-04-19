import { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import StationList from './components/StationList';
import MapView from './components/MapView';

const socket = io('http://localhost:3001');

export default function App() {
  const [stations, setStations] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [focusedStation, setFocusedStation] = useState(null);

  const showOnMap = station => {
    setFocusedStation(station);
    setView('map');
  };

  const switchView = v => {
    setView(v);
    if (v === 'list') setFocusedStation(null);
  };

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('stations', (data) => {
      setStations(data);
      setLastUpdated(new Date());
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('stations');
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return stations;
    const q = search.toLowerCase();
    return stations.filter(
      s =>
        s.city.toLowerCase().includes(q) ||
        s.networkName.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [stations, search]);

  const totalBikes = stations.reduce((sum, s) => sum + s.freeBikes, 0);
  const totalDocks = stations.reduce((sum, s) => sum + s.emptySlots, 0);
  const cityCount = new Set(stations.map(s => s.city)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-emerald-50">
      <header className="bg-white border-b border-sky-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">&#x1F6B2;</span>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">Stadscyklar Sverige</h1>
              <p className="text-xs text-slate-400">Realtidsspårning av cykelstationer</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`}
            />
            <span className="text-sm text-slate-500">{connected ? 'Live' : 'Frånkopplad'}</span>
            {lastUpdated && (
              <span className="text-xs text-slate-400 hidden sm:inline ml-1">
                &mdash; {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Städer', value: cityCount, accent: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Stationer', value: stations.length, accent: 'text-teal-600', bg: 'bg-teal-50' },
            { label: 'Tillgängliga cyklar', value: totalBikes, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Lediga platser', value: totalDocks, accent: 'text-indigo-500', bg: 'bg-indigo-50' },
          ].map(stat => (
            <div
              key={stat.label}
              className={`${stat.bg} rounded-2xl border border-white shadow-sm p-4 text-center`}
            >
              <div className={`text-2xl font-bold ${stat.accent}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Sök på stad, nätverk eller station..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-sky-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-300 text-sm shadow-sm"
          />
          <div className="flex rounded-xl overflow-hidden border border-sky-200 shadow-sm">
            {['list', 'map'].map(v => (
              <button
                key={v}
                onClick={() => switchView(v)}
                className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-teal-500 text-white'
                    : 'bg-white text-slate-600 hover:bg-sky-50'
                }`}
              >
                {v === 'list' ? 'Lista' : 'Karta'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {stations.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <div className="text-5xl mb-4">&#x1F6B2;</div>
            <p className="text-lg font-medium">Hämtar stationer...</p>
            <p className="text-sm mt-1">Ansluter till CityBikes API</p>
          </div>
        ) : (
          <div key={view} className="view-enter">
            {view === 'list' ? (
              <StationList stations={filtered} onShowOnMap={showOnMap} />
            ) : (
              <MapView stations={filtered} focusedStation={focusedStation} onClearFocus={() => setFocusedStation(null)} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
