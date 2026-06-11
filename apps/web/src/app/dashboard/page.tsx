import { Card, StatCard, Button } from '@/components/ui';
import { Radio, Sparkles, Eye, Send, Activity } from 'lucide-react';
import Link from 'next/link';

async function getStats() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/stats`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function DashboardPage() {
  const stats = await getStats();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 mt-1">Overview of your StreamZ automation pipeline</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Streams" value={stats?.totalStreams ?? 0} icon={<Radio className="w-6 h-6" />} color="orange" />
        <StatCard title="Highlights Found" value={stats?.totalHighlights ?? 0} icon={<Sparkles className="w-6 h-6" />} color="blue" />
        <StatCard title="Pending Review" value={stats?.pendingReview ?? 0} icon={<Eye className="w-6 h-6" />} color="yellow" />
        <StatCard title="Published" value={stats?.published ?? 0} icon={<Send className="w-6 h-6" />} color="green" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-orange-400" /> Pipeline Status</h3>
          <div className="space-y-3">
            {[
              { stage: 'Stream Detection', status: 'Active', desc: 'Watching for live events on Twitch & YouTube' },
              { stage: 'VOD Capture', status: 'Ready', desc: 'Workers standing by for capture jobs' },
              { stage: 'Highlight Engine', status: 'Ready', desc: 'Chat + audio analysis pipeline' },
              { stage: 'AI Optimizer', status: 'Ready', desc: 'OpenRouter integration configured' },
              { stage: 'Publish Queue', status: 'Ready', desc: 'BullMQ scheduler active' },
            ].map((item) => (
              <div key={item.stage} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <div><p className="text-sm font-medium text-slate-200">{item.stage}</p><p className="text-xs text-slate-500">{item.desc}</p></div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">{item.status}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/streams" className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"><p className="text-sm font-medium text-slate-200">View All Streams</p><p className="text-xs text-slate-500">See detected and captured streams</p></Link>
            <Link href="/dashboard/highlights" className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"><p className="text-sm font-medium text-slate-200">Browse Highlights</p><p className="text-xs text-slate-500">View extracted clips and scores</p></Link>
            <Link href="/dashboard/review" className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"><p className="text-sm font-medium text-orange-400">Review Pending Content</p><p className="text-xs text-slate-500">Approve or reject AI-generated metadata</p></Link>
            <Link href="/dashboard/queue" className="block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"><p className="text-sm font-medium text-slate-200">Publish Queue</p><p className="text-xs text-slate-500">Track scheduled and published content</p></Link>
          </div>
        </Card>
      </div>
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Streams</h3>
        {stats?.recentStreams?.length > 0 ? (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-slate-400 text-left"><th scope="col" className="pb-3 font-medium">Platform</th><th scope="col" className="pb-3 font-medium">Title</th><th scope="col" className="pb-3 font-medium">Status</th><th scope="col" className="pb-3 font-medium">Started</th></tr></thead><tbody>
            {stats.recentStreams.map((s: any) => (<tr key={s.id} className="border-t border-slate-700/50"><td className="py-2.5 capitalize">{s.platform === 'twitch' ? '🟣 Twitch' : '🔴 YouTube'}</td><td className="py-2.5 text-slate-200">{s.title}</td><td className="py-2.5"><span className="px-2 py-0.5 rounded-full text-xs bg-slate-600/50 text-slate-300">{s.status}</span></td><td className="py-2.5 text-slate-400">{s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}</td></tr>))}
          </tbody></table></div>
        ) : (
          <div className="text-center py-12"><Radio className="w-14 h-14 text-slate-600 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-300 mb-2">No streams detected yet</h3><p className="text-slate-500 mb-6 max-w-md mx-auto">Connect your Twitch or YouTube account to start capturing streams automatically.</p><Link href="/dashboard/streams"><Button variant="primary" className="flex items-center gap-2 mx-auto"><Radio className="w-4 h-4" /> Set Up Webhooks</Button></Link></div>
        )}
      </Card>
    </div>
  );
}
