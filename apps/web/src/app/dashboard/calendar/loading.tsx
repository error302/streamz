export default function CalendarLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-slate-800 rounded w-24 mb-2" />
        <div className="h-4 bg-slate-800 rounded w-56" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="h-12 bg-slate-800/50" />
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="h-20 border-r border-b border-slate-800/50 p-2">
              <div className="h-3 bg-slate-800 rounded w-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
