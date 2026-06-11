'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button, getPlatformBadgeVariant } from '@/components/ui';
import { Eye, Check, X, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface AIContent { id: string; target_platform: string; title: string; description: string; tags: string[]; hashtags: string[]; }

export default function ReviewPage() {
  const [content, setContent] = useState<AIContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchContent(); }, []);

  async function fetchContent() {
    setLoading(true);
    try { const res = await fetch('/api/content/pending'); const data = await res.json(); setContent(data.content || []); } catch {}
    setLoading(false);
  }

  async function approveItem(id: string) {
    try { const res = await fetch(`/api/content/${id}/approve`, { method: 'POST' }); if (res.ok) setContent(content.filter(c => c.id !== id)); } catch {}
  }

  async function rejectItem(id: string) {
    try { const res = await fetch(`/api/content/${id}/reject`, { method: 'POST' }); if (res.ok) setContent(content.filter(c => c.id !== id)); } catch {}
  }

  async function batchApprove() {
    try { const res = await fetch('/api/content/batch-approve', { method: 'POST' }); if (res.ok) setContent([]); } catch {}
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-white">Review Content</h2><p className="text-slate-400 mt-1">{content.length} items pending review</p></div>
        {content.length > 0 && <Button onClick={batchApprove} className="flex items-center gap-2"><Check className="w-4 h-4" /> Approve All</Button>}
      </div>
      {content.length === 0 ? (
        <div className="text-center py-16"><Eye className="w-14 h-14 text-slate-600 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-300 mb-2">No content pending review</h3><p className="text-slate-500 mb-6 max-w-md mx-auto">Content will appear here after AI generates metadata from your highlights.</p><Link href="/dashboard/highlights"><Button variant="primary" className="flex items-center gap-2 mx-auto"><Sparkles className="w-4 h-4" /> Browse Highlights</Button></Link></div>
      ) : (
        <div className="space-y-4">{content.map((item) => (
          <Card key={item.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={getPlatformBadgeVariant(item.target_platform)}>{item.target_platform.replace('_', ' ')}</Badge>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={() => approveItem(item.id)} className="flex items-center gap-1"><Check className="w-4 h-4" /> Approve</Button>
                <Button variant="danger" size="sm" onClick={() => rejectItem(item.id)} className="flex items-center gap-1"><X className="w-4 h-4" /> Reject</Button>
              </div>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500 block mb-1">Title</label><p className="text-slate-200 font-medium">{item.title}</p></div>
              <div><label className="text-xs text-slate-500 block mb-1">Description</label><p className="text-sm text-slate-300 line-clamp-3">{item.description}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-slate-500 block mb-1">Tags</label><div className="flex flex-wrap gap-1">{(item.tags || []).map((tag, i) => <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">{tag}</span>)}</div></div>
                <div><label className="text-xs text-slate-500 block mb-1">Hashtags</label><div className="flex flex-wrap gap-1">{(item.hashtags || []).map((tag, i) => <span key={i} className="px-2 py-0.5 bg-orange-500/10 rounded text-xs text-orange-400">{tag}</span>)}</div></div>
              </div>
            </div>
          </Card>
        ))}</div>
      )}
    </div>
  );
}
