export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse" role="status">
      <div className="h-8 bg-slate-800 rounded w-48" />
      <div className="h-4 bg-slate-800 rounded w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="h-64 bg-slate-800 rounded-xl" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
