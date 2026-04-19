import { useState } from 'react';
import StationItem from './StationItem';

export default function StationList({ stations, onShowOnMap }) {
  const [expanded, setExpanded] = useState({});

  if (stations.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-base">Inga stationer matchar din sökning.</p>
      </div>
    );
  }

  const grouped = stations.reduce((acc, s) => {
    if (!acc[s.city]) acc[s.city] = [];
    acc[s.city].push(s);
    return acc;
  }, {});

  const cities = Object.keys(grouped).sort();

  const toggle = city => setExpanded(prev => ({ ...prev, [city]: !prev[city] }));

  return (
    <div className="space-y-3 pb-8">
      {cities.map(city => {
        const isOpen = !!expanded[city];
        return (
          <section key={city} className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
            <button
              onClick={() => toggle(city)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-sky-50 transition-colors"
            >
              <span className="flex items-center gap-2 text-base font-semibold text-slate-700">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-400 shrink-0"></span>
                {city}
                <span className="text-sm font-normal text-slate-400">
                  ({grouped[city].length} {grouped[city].length === 1 ? 'station' : 'stationer'})
                </span>
              </span>
              <span className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                &#8964;
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {grouped[city].map(station => (
                  <StationItem key={station.id} station={station} onShowOnMap={onShowOnMap} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
