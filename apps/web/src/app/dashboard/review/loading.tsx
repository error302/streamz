export default function ReviewLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-slate-800 rounded w-40 mb-2" />
          <div className="h-4 bg-slate-800 rounded w-64" />
        </div>
        <div className="h-9 bg-slate-800 rounded w-28" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="h-5 bg-slate-800 rounded w-24 mb-4" />
            <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-800 rounded w-1/2 mb-3" />
            <div className="flex gap-2">
              <div className="h-5 bg-slate-800 rounded w-12" />
              <div className="h-5 bg-slate-800 rounded w-16" />
              <div className="h-5 bg-slate-800 rounded w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
