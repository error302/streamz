'use client';

import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-white">Analytics</h2><p className="text-slate-400 mt-1">Performance across all platforms</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: 'Total Views', value: '—', color: 'text-blue-400' }, { label: 'Engagement Rate', value: '—', color: 'text-orange-400' }, { label: 'Total Published', value: '0', color: 'text-emerald-400' }, { label: 'Avg. Retention', value: '—', color: 'text-purple-400' }].map(s => (
          <Card key={s.label} className="text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-slate-500 mt-1">{s.label}</p></Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><h3 className="text-lg font-semibold text-white mb-4">Views Over Time</h3><div className="h-64 bg-slate-700/20 rounded-lg flex items-center justify-center"><p className="text-slate-500 text-sm">Connect platforms and publish content to see analytics</p></div></Card>
        <Card><h3 className="text-lg font-semibold text-white mb-4">Engagement by Platform</h3><div className="h-64 bg-slate-700/20 rounded-lg flex items-center justify-center"><p className="text-slate-500 text-sm">Platform engagement data will appear here</p></div></Card>
      </div>
    </div>
  );
}
