export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-slate-800 rounded w-28 mb-2" />
        <div className="h-4 bg-slate-800 rounded w-56" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="h-7 bg-slate-800 rounded w-20 mb-2" />
            <div className="h-3 bg-slate-800 rounded w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="h-5 bg-slate-800 rounded w-32 mb-4" />
            <div className="h-64 bg-slate-800/30 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
