import { Card, Badge, Button, getPublishStatusVariant } from '@/components/ui';
import { Send, Eye } from 'lucide-react';
import Link from 'next/link';

async function getQueue() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/queue?limit=50`, { cache: 'no-store' });
    if (!res.ok) return { jobs: [], total: 0 };
    return await res.json();
  } catch { return { jobs: [], total: 0 }; }
}

function getPlatformVariant(platform: string): 'default' | 'danger' | 'purple' | 'info' | 'warning' {
  const map: Record<string, 'default' | 'danger' | 'purple' | 'info' | 'warning'> = { youtube_vod: 'danger', youtube_shorts: 'danger', instagram_reels: 'purple', instagram_stories: 'warning', tiktok: 'info' };
  return map[platform] || 'default';
}

export default async function QueuePage() {
  const { jobs } = await getQueue();
  const stats = { queued: jobs.filter((j: any) => j.status === 'queued').length, publishing: jobs.filter((j: any) => j.status === 'publishing').length, published: jobs.filter((j: any) => j.status === 'published').length, failed: jobs.filter((j: any) => j.status === 'failed').length };
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-white">Publish Queue</h2><p className="text-slate-400 mt-1">Track scheduled and published content</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{ label: 'Queued', value: stats.queued, color: 'text-yellow-400' }, { label: 'Publishing', value: stats.publishing, color: 'text-blue-400' }, { label: 'Published', value: stats.published, color: 'text-emerald-400' }, { label: 'Failed', value: stats.failed, color: 'text-red-400' }].map(s => (
          <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
        ))}
      </div>
      {jobs.length > 0 ? (
        <Card className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-800/80 text-slate-400 text-left"><th scope="col" className="px-4 py-3 font-medium">Platform</th><th scope="col" className="px-4 py-3 font-medium">Title</th><th scope="col" className="px-4 py-3 font-medium">Status</th><th scope="col" className="px-4 py-3 font-medium">Scheduled</th><th scope="col" className="px-4 py-3 font-medium">Published</th></tr></thead>
        <tbody>{jobs.map((job: any) => (<tr key={job.id} className="border-t border-slate-700/50 hover:bg-slate-800/30"><td className="px-4 py-3"><Badge variant={getPlatformVariant(job.target_platform || job.platform)}>{(job.target_platform || job.platform || '').replace('_', ' ')}</Badge></td><td className="px-4 py-3 text-slate-200 font-medium">{job.title || '—'}</td><td className="px-4 py-3"><Badge variant={getPublishStatusVariant(job.status)}>{job.status}</Badge></td><td className="px-4 py-3 text-slate-400">{job.scheduled_at ? new Date(job.scheduled_at).toLocaleString() : '—'}</td><td className="px-4 py-3 text-slate-400">{job.published_at ? new Date(job.published_at).toLocaleString() : '—'}</td></tr>))}</tbody></table></div></Card>
      ) : (
        <div className="text-center py-16"><Send className="w-14 h-14 text-slate-600 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-300 mb-2">No items in the publish queue</h3><p className="text-slate-500 mb-6 max-w-md mx-auto">Approved content will be scheduled for publishing automatically.</p><Link href="/dashboard/review"><Button variant="primary" className="flex items-center gap-2 mx-auto"><Eye className="w-4 h-4" /> Review Content</Button></Link></div>
      )}
    </div>
  );
}
