import { Card, Badge, Button } from '@/components/ui';
import { Sparkles, Radio } from 'lucide-react';
import Link from 'next/link';

async function getHighlights() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/highlights?limit=18`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.highlights || [];
  } catch { return []; }
}

function formatTime(seconds: number): string { const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m}:${s.toString().padStart(2, '0')}`; }

export default async function HighlightsPage() {
  const highlights = await getHighlights();
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-white">Highlights</h2><p className="text-slate-400 mt-1">Clips extracted from your streams</p></div>
      {highlights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {highlights.map((h: any) => (
            <Card key={h.id} className="space-y-4">
              <div className="aspect-video bg-slate-700/50 rounded-lg flex items-center justify-center"><Sparkles className="w-8 h-8 text-slate-500" /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Highlight Score</span><span className="text-sm font-bold text-orange-400">{(h.highlight_score * 100).toFixed(0)}%</span></div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${h.highlight_score * 100}%` }} /></div>
                <div className="flex gap-4 text-xs text-slate-400"><span>Chat: {(h.chat_spike_intensity * 100).toFixed(0)}%</span><span>Audio: {(h.audio_energy_score * 100).toFixed(0)}%</span></div>
              </div>
              <div className="flex items-center justify-between"><Badge>{h.clip_type}</Badge><span className="text-xs text-slate-500">{Math.round(h.clip_duration)}s</span></div>
              <div className="text-xs text-slate-500">{formatTime(h.start_time)} → {formatTime(h.end_time)}</div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16"><Sparkles className="w-14 h-14 text-slate-600 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-300 mb-2">No highlights yet</h3><p className="text-slate-500 mb-6 max-w-md mx-auto">Highlights are extracted automatically after streams are captured and processed.</p><Link href="/dashboard/streams"><Button variant="primary" className="flex items-center gap-2 mx-auto"><Radio className="w-4 h-4" /> View Streams</Button></Link></div>
      )}
    </div>
  );
}
