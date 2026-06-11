export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-3xl animate-pulse">
      <div>
        <div className="h-8 bg-slate-800 rounded w-24 mb-2" />
        <div className="h-4 bg-slate-800 rounded w-56" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="h-5 bg-slate-800 rounded w-40 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-12 bg-slate-800/50 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
