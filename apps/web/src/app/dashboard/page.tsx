'use client';

import React, { useState } from 'react';
import {
  Radio,
  Sparkles,
  Eye,
  Send,
  Activity,
  ChevronDown,
  ChevronUp,
  Zap,
  ArrowRight,
  Smartphone,
  TrendingUp,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/components/ui';

// ---- Mock Stats ----

const mockStats = {
  totalStreams: 12,
  totalHighlights: 47,
  pendingReview: 8,
  published: 23,
  recentStreams: [
    { id: 's1', platform: 'twitch', title: 'Ranked Valorant — Pushing to Immortal', status: 'captured', started_at: new Date().toISOString() },
    { id: 's2', platform: 'youtube', title: 'Apex Legends — Predator Ranked Grind', status: 'processing', started_at: new Date().toISOString() },
    { id: 's3', platform: 'twitch', title: 'Elden Ring DLC First Playthrough', status: 'live', started_at: new Date().toISOString() },
  ],
};

// ---- StatCard ----

function DashboardStatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}) {
  const colorMap: Record<string, { text: string; bg: string; border: string }> = {
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    yellow: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    green: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  };
  const c = colorMap[color] || colorMap.orange;

  return (
    <div className={cn('rounded-xl border p-4 sm:p-6', c.bg, c.border)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">{title}</p>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.bg)}>
          <Icon className={cn('w-4 h-4', c.text)} />
        </div>
      </div>
      <p className={cn('mt-2 text-2xl sm:text-3xl font-bold', c.text)}>{value}</p>
      {trend && (
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          {trend}
        </div>
      )}
    </div>
  );
}

// ---- Component ----

export default function DashboardPage() {
  const [pipelineExpanded, setPipelineExpanded] = useState(true);
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(true);

  const stats = mockStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 mt-1">Overview of your StreamZ automation pipeline</p>
      </div>

      {/* Stats Grid - responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <DashboardStatCard
          title="Total Streams"
          value={stats.totalStreams}
          icon={Radio}
          color="orange"
          trend="+3 this week"
        />
        <DashboardStatCard
          title="Highlights Found"
          value={stats.totalHighlights}
          icon={Sparkles}
          color="blue"
          trend="+12 this week"
        />
        <DashboardStatCard
          title="Pending Review"
          value={stats.pendingReview}
          icon={Eye}
          color="yellow"
        />
        <DashboardStatCard
          title="Published"
          value={stats.published}
          icon={Send}
          color="green"
          trend="+5 this week"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Status - Collapsible on mobile */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => setPipelineExpanded(!pipelineExpanded)}
            className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
          >
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              Pipeline Status
            </h3>
            {pipelineExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
          {pipelineExpanded && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
              {[
                { stage: 'Stream Detection', status: 'Active', desc: 'Watching for live events on Twitch & YouTube', icon: Radio },
                { stage: 'VOD Capture', status: 'Ready', desc: 'Workers standing by for capture jobs', icon: Smartphone },
                { stage: 'Highlight Engine', status: 'Ready', desc: 'Chat + audio analysis pipeline', icon: Sparkles },
                { stage: 'AI Optimizer', status: 'Ready', desc: 'OpenRouter integration configured', icon: Zap },
                { stage: 'Publish Queue', status: 'Ready', desc: 'BullMQ scheduler active', icon: Send },
              ].map((item) => (
                <div
                  key={item.stage}
                  className="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{item.stage}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions - Collapsible on mobile */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => setQuickActionsExpanded(!quickActionsExpanded)}
            className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
          >
            <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
            {quickActionsExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
          {quickActionsExpanded && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
              {[
                { label: 'View All Streams', desc: 'See detected and captured streams', href: '/dashboard/streams', highlight: false },
                { label: 'Browse Highlights', desc: 'View extracted clips and scores', href: '/dashboard/highlights', highlight: false },
                { label: 'Review Pending Content', desc: 'Approve or reject AI-generated metadata', href: '/dashboard/review', highlight: true },
                { label: 'Publish Queue', desc: 'Track scheduled and published content', href: '/dashboard/queue', highlight: false },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group block p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${action.highlight ? 'text-orange-400' : 'text-slate-200'}`}>
                        {action.label}
                      </p>
                      <p className="text-xs text-slate-500">{action.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Streams */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="p-4 sm:p-6 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white">Recent Streams</h3>
        </div>
        {stats.recentStreams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-left">
                  <th scope="col" className="px-4 sm:px-6 py-3 font-medium">Platform</th>
                  <th scope="col" className="px-4 sm:px-6 py-3 font-medium">Title</th>
                  <th scope="col" className="hidden sm:table-cell px-4 sm:px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="hidden md:table-cell px-4 sm:px-6 py-3 font-medium">Started</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentStreams.map((s) => (
                  <tr key={s.id} className="border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 sm:px-6 py-3 capitalize">
                      {s.platform === 'twitch' ? '🟣 Twitch' : '🔴 YouTube'}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-slate-200 font-medium">{s.title}</td>
                    <td className="hidden sm:table-cell px-4 sm:px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'live' ? 'bg-red-500/20 text-red-400' :
                        s.status === 'processing' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-600/50 text-slate-300'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-4 sm:px-6 py-3 text-slate-400">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Radio className="w-14 h-14 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No streams detected yet</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Connect your Twitch or YouTube account to start capturing streams automatically.
            </p>
            <Link
              href="/dashboard/streams"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
            >
              <Radio className="w-4 h-4" />
              Set Up Webhooks
            </Link>
          </div>
        )}
      </div>

      {/* Mobile swipe hint */}
      <div className="sm:hidden flex items-center justify-center gap-2 py-2 text-xs text-slate-600">
        <Clock className="w-3 h-3" />
        Tap sections to expand/collapse
      </div>
    </div>
  );
}
