export default function HighlightsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-slate-800 rounded w-32 mb-2" />
        <div className="h-4 bg-slate-800 rounded w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="h-36 bg-slate-800" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-800 rounded w-3/4" />
              <div className="space-y-2">
                <div className="h-2 bg-slate-800 rounded" />
                <div className="h-2 bg-slate-800 rounded w-5/6" />
                <div className="h-2 bg-slate-800 rounded w-4/6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
