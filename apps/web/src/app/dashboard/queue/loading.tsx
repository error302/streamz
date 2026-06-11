export default function QueueLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-slate-800 rounded w-40 mb-2" />
        <div className="h-4 bg-slate-800 rounded w-56" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="h-6 bg-slate-800 rounded w-12 mb-2" />
            <div className="h-3 bg-slate-800 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 bg-slate-800 rounded w-20" />
            <div className="h-4 bg-slate-800 rounded w-32" />
            <div className="h-4 bg-slate-800 rounded w-16" />
            <div className="h-4 bg-slate-800 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
