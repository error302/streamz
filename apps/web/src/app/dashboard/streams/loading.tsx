export default function StreamsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-slate-800 rounded w-32 mb-2" />
        <div className="h-4 bg-slate-800 rounded w-56" />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 bg-slate-800 rounded w-20" />
              <div className="h-4 bg-slate-800 rounded w-48" />
              <div className="h-4 bg-slate-800 rounded w-24" />
              <div className="h-4 bg-slate-800 rounded w-16" />
              <div className="h-4 bg-slate-800 rounded w-20" />
              <div className="h-4 bg-slate-800 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
