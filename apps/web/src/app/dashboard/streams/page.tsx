import { Card, Badge, Button, getStreamStatusVariant } from '@/components/ui';
import { Radio, Link2 } from 'lucide-react';
import Link from 'next/link';

async function getStreams() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/streams?limit=50`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.streams || [];
  } catch { return []; }
}

export default async function StreamsPage() {
  const streams = await getStreams();
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-white">Streams</h2><p className="text-slate-400 mt-1">All detected and captured streams</p></div>
      {streams.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-800/80 text-slate-400 text-left"><th scope="col" className="px-4 py-3 font-medium">Platform</th><th scope="col" className="px-4 py-3 font-medium">Title</th><th scope="col" className="px-4 py-3 font-medium">Game</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Started</th><th scope="col" className="px-4 py-3 font-medium">Duration</th></tr></thead>
          <tbody>{streams.map((stream: any) => (<tr key={stream.id} className="border-t border-slate-700/50 hover:bg-slate-800/30"><td className="px-4 py-3"><span className="flex items-center gap-2">{stream.platform === 'twitch' ? '🟣' : '🔴'}<span className="capitalize text-slate-200">{stream.platform}</span></span></td><td className="px-4 py-3 text-slate-200 font-medium">{stream.title}</td><td className="px-4 py-3 text-slate-400">{stream.game_category || '—'}</td><td className="px-4 py-3"><Badge variant={getStreamStatusVariant(stream.status)}>{stream.status}</Badge></td><td className="px-4 py-3 text-slate-400">{stream.started_at ? new Date(stream.started_at).toLocaleString() : '—'}</td><td className="px-4 py-3 text-slate-400">{stream.ended_at && stream.started_at ? `${Math.round((new Date(stream.ended_at).getTime() - new Date(stream.started_at).getTime()) / 60000)} min` : 'Live / —'}</td></tr>))}</tbody></table></div>
        </Card>
      ) : (
        <div className="text-center py-16"><Radio className="w-14 h-14 text-slate-600 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-300 mb-2">No streams yet</h3><p className="text-slate-500 mb-6 max-w-md mx-auto">Connect your Twitch or YouTube account to start capturing streams automatically.</p><Link href="/dashboard"><Button variant="primary" className="flex items-center gap-2 mx-auto"><Link2 className="w-4 h-4" /> Connect Account</Button></Link></div>
      )}
    </div>
  );
}
