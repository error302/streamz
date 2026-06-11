'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-slate-300 mb-2">Something went wrong</h3>
      <p className="text-slate-500 mb-6 max-w-md mx-auto font-mono text-xs">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors">Try Again</button>
    </div>
  );
}
