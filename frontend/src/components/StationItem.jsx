export default function StationItem({ station, onShowOnMap }) {
  const { networkName, city, name, freeBikes, emptySlots } = station;
  const total = freeBikes + emptySlots;
  const bikePercent = total > 0 ? Math.round((freeBikes / total) * 100) : 0;

  const status = freeBikes === 0 ? 'empty' : freeBikes <= 2 ? 'low' : 'good';

  const statusStyle = {
    empty: { pill: 'bg-red-100 text-red-600', bar: 'bg-red-400', label: 'Tom' },
    low: { pill: 'bg-amber-100 text-amber-600', bar: 'bg-amber-400', label: 'Få' },
    good: { pill: 'bg-emerald-100 text-emerald-700', bar: 'bg-teal-400', label: 'Tillgänglig' },
  }[status];

  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200">
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide leading-tight">
            {networkName}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onShowOnMap(station)}
              title="Visa på karta"
              className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </button>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle.pill}`}>
              {statusStyle.label}
            </span>
          </div>
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mt-1 leading-snug">{name}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{city}</p>
      </div>

      <div className="flex gap-2">
        <div className={`flex-1 rounded-xl p-2.5 text-center ${statusStyle.pill}`}>
          <div className="text-xl font-bold">{freeBikes}</div>
          <div className="text-xs mt-0.5 font-medium">Cyklar</div>
        </div>
        <div className="flex-1 rounded-xl p-2.5 text-center bg-sky-50 text-sky-700">
          <div className="text-xl font-bold">{emptySlots}</div>
          <div className="text-xs mt-0.5 font-medium">Platser</div>
        </div>
      </div>

      {total > 0 && (
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Kapacitet</span>
            <span>{bikePercent}% cyklar</span>
          </div>
          <div className="h-1.5 bg-sky-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusStyle.bar}`}
              style={{ width: `${bikePercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
