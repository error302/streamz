'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Youtube,
  Instagram,
  Music,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/components/ui';

// ---- Mock Data ----

const viewsOverTime7d = [
  { date: 'Mon', views: 2400, engagement: 400 },
  { date: 'Tue', views: 1398, engagement: 300 },
  { date: 'Wed', views: 3800, engagement: 658 },
  { date: 'Thu', views: 3908, engagement: 720 },
  { date: 'Fri', views: 4800, engagement: 890 },
  { date: 'Sat', views: 3800, engagement: 680 },
  { date: 'Sun', views: 4300, engagement: 750 },
];

const viewsOverTime30d = [
  { date: 'Week 1', views: 12400, engagement: 2100 },
  { date: 'Week 2', views: 15300, engagement: 2800 },
  { date: 'Week 3', views: 18900, engagement: 3400 },
  { date: 'Week 4', views: 22100, engagement: 4100 },
];

const viewsOverTime90d = [
  { date: 'Jan', views: 32000, engagement: 5600 },
  { date: 'Feb', views: 45000, engagement: 7800 },
  { date: 'Mar', views: 58000, engagement: 10200 },
];

const engagementByPlatform = [
  { platform: 'YouTube', views: 45000, likes: 3200, comments: 890, shares: 1200 },
  { platform: 'Instagram', views: 28000, likes: 5600, comments: 1200, shares: 890 },
  { platform: 'TikTok', views: 62000, likes: 8900, comments: 2300, shares: 3400 },
];

const topPerformingContent = [
  { id: '1', title: 'INSANE 1v5 Clutch on Ascent 🔥', platform: 'youtube_shorts', views: 12400, engagement: 8.4, publishedAt: '2 days ago' },
  { id: '2', title: '20 Kill Game with Insane Movement 💀', platform: 'tiktok', views: 9800, engagement: 12.1, publishedAt: '3 days ago' },
  { id: '3', title: 'Baron Steal That Won the Game! 🏆', platform: 'youtube_shorts', views: 7600, engagement: 6.8, publishedAt: '4 days ago' },
  { id: '4', title: '47 Tries Later... FINALLY! 🎮', platform: 'instagram_reels', views: 5400, engagement: 9.2, publishedAt: '5 days ago' },
  { id: '5', title: 'Operator Ace — No Scope No Problem 🎯', platform: 'tiktok', views: 4200, engagement: 7.5, publishedAt: '1 week ago' },
];

// Best posting times heatmap (day × hour, value = engagement score)
const heatmapData = [
  // [day, hour, score]
  ['Mon', '6AM', 12], ['Mon', '9AM', 28], ['Mon', '12PM', 45], ['Mon', '3PM', 62], ['Mon', '6PM', 85], ['Mon', '9PM', 92], ['Mon', '12AM', 55],
  ['Tue', '6AM', 10], ['Tue', '9AM', 32], ['Tue', '12PM', 48], ['Tue', '3PM', 58], ['Tue', '6PM', 78], ['Tue', '9PM', 88], ['Tue', '12AM', 50],
  ['Wed', '6AM', 15], ['Wed', '9AM', 35], ['Wed', '12PM', 52], ['Wed', '3PM', 65], ['Wed', '6PM', 82], ['Wed', '9PM', 95], ['Wed', '12AM', 58],
  ['Thu', '6AM', 11], ['Thu', '9AM', 30], ['Thu', '12PM', 50], ['Thu', '3PM', 60], ['Thu', '6PM', 75], ['Thu', '9PM', 85], ['Thu', '12AM', 48],
  ['Fri', '6AM', 18], ['Fri', '9AM', 42], ['Fri', '12PM', 58], ['Fri', '3PM', 72], ['Fri', '6PM', 90], ['Fri', '9PM', 98], ['Fri', '12AM', 65],
  ['Sat', '6AM', 25], ['Sat', '9AM', 55], ['Sat', '12PM', 70], ['Sat', '3PM', 80], ['Sat', '6PM', 95], ['Sat', '9PM', 100], ['Sat', '12AM', 72],
  ['Sun', '6AM', 22], ['Sun', '9AM', 48], ['Sun', '12PM', 65], ['Sun', '3PM', 75], ['Sun', '6PM', 88], ['Sun', '9PM', 92], ['Sun', '12AM', 60],
];

const platformComparisonCards = [
  {
    platform: 'YouTube',
    icon: Youtube,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    metrics: [
      { label: 'Views', value: '45.2K', trend: '+12%', up: true },
      { label: 'Subscribers', value: '+234', trend: '+8%', up: true },
      { label: 'Watch Time', value: '1.2K hrs', trend: '+15%', up: true },
      { label: 'CTR', value: '4.8%', trend: '-0.3%', up: false },
    ],
  },
  {
    platform: 'Instagram',
    icon: Instagram,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    metrics: [
      { label: 'Views', value: '28.1K', trend: '+18%', up: true },
      { label: 'Followers', value: '+156', trend: '+5%', up: true },
      { label: 'Reach', value: '42.3K', trend: '+22%', up: true },
      { label: 'Eng. Rate', value: '6.2%', trend: '+0.8%', up: true },
    ],
  },
  {
    platform: 'TikTok',
    icon: Music,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    metrics: [
      { label: 'Views', value: '62.4K', trend: '+34%', up: true },
      { label: 'Followers', value: '+892', trend: '+28%', up: true },
      { label: 'Avg. Watch', value: '85%', trend: '+5%', up: true },
      { label: 'Shares', value: '3.4K', trend: '+42%', up: true },
    ],
  },
];

// ---- Custom Tooltip ----

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-xs font-medium" style={{ color: entry.color }}>
          {entry.dataKey === 'views' ? 'Views' : 'Engagement'}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ---- Heatmap Cell ----

function HeatmapCell({ score }: { score: number }) {
  const intensity = score / 100;
  const bg = `rgba(249, 115, 22, ${intensity * 0.8 + 0.05})`;
  return (
    <div
      className="w-full aspect-square rounded-sm flex items-center justify-center text-[10px] font-medium"
      style={{ backgroundColor: bg, color: intensity > 0.5 ? 'white' : 'rgb(148,163,184)' }}
      title={`Engagement score: ${score}`}
    >
      {score}
    </div>
  );
}

// ---- Component ----

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  const viewsData = period === '7d' ? viewsOverTime7d : period === '30d' ? viewsOverTime30d : viewsOverTime90d;

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube_shorts': return <span className="text-red-400 font-bold text-xs">▶</span>;
      case 'instagram_reels': return <span className="text-pink-400 font-bold text-xs">IG</span>;
      case 'tiktok': return <span className="text-cyan-400 font-bold text-xs">TT</span>;
      default: return null;
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'youtube_shorts': return 'YouTube Shorts';
      case 'instagram_reels': return 'Instagram Reels';
      case 'tiktok': return 'TikTok';
      default: return platform;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-400" />
            Analytics
          </h2>
          <p className="text-slate-400 mt-1">Performance across all platforms</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-800/50 p-1">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                period === p ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Views', value: '135.7K', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', trend: '+18%', up: true },
          { label: 'Engagement Rate', value: '7.2%', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20', trend: '+1.4%', up: true },
          { label: 'Total Published', value: '23', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', trend: '+5', up: true },
          { label: 'Avg. Retention', value: '78%', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20', trend: '+3%', up: true },
        ].map((s) => (
          <div key={s.label} className={cn('p-4 rounded-xl border', s.bgColor)}>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{s.label}</p>
              {s.up ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-400" />
              )}
            </div>
            <p className={cn('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
            <p className={cn('text-xs mt-0.5', s.up ? 'text-emerald-400' : 'text-red-400')}>{s.trend}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Over Time */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Views Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={viewsData}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#f97316"
                  fill="url(#viewsGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="#3b82f6"
                  fill="url(#engagementGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-slate-400">Views</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-400">Engagement</span>
            </div>
          </div>
        </div>

        {/* Engagement by Platform */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Engagement by Platform</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementByPlatform} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="platform" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="likes" fill="#f97316" radius={[4, 4, 0, 0]} name="likes">
                  {engagementByPlatform.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#ec4899' : '#06b6d4'} />
                  ))}
                </Bar>
                <Bar dataKey="comments" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="comments" />
                <Bar dataKey="shares" fill="#22c55e" radius={[4, 4, 0, 0]} name="shares" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-slate-400">Likes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs text-slate-400">Comments</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-400">Shares</span>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Comparison Cards */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Platform Comparison</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {platformComparisonCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.platform}
                className={cn('rounded-xl border p-4 sm:p-5', card.bgColor, card.borderColor)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', card.bgColor)}>
                    <Icon className={cn('w-5 h-5', card.color)} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{card.platform}</h4>
                    <p className="text-xs text-slate-500">Last {period}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {card.metrics.map((metric) => (
                    <div key={metric.label}>
                      <p className="text-xs text-slate-500">{metric.label}</p>
                      <p className="text-sm font-bold text-white">{metric.value}</p>
                      <p className={cn('text-[10px]', metric.up ? 'text-emerald-400' : 'text-red-400')}>
                        {metric.trend}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performing Content + Best Posting Times */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Content */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-white">Top Performing Content</h3>
          </div>
          <div className="divide-y divide-slate-700/50">
            {topPerformingContent.map((content, idx) => (
              <div key={content.id} className="px-4 sm:px-6 py-3 hover:bg-slate-700/20 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-600 w-6 text-center">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {getPlatformIcon(content.platform)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{content.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{getPlatformLabel(content.platform)}</span>
                      <span className="text-xs text-slate-600">·</span>
                      <span className="text-xs text-slate-500">{content.publishedAt}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">{(content.views / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-emerald-400">{content.engagement}% eng.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Posting Times Heatmap */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" />
            Best Posting Times
          </h3>
          <p className="text-xs text-slate-500 mb-3">Engagement score by day and time (higher = better)</p>

          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              {/* Hour labels */}
              <div className="grid grid-cols-8 gap-1 mb-1">
                <div /> {/* empty corner */}
                {['6AM', '9AM', '12PM', '3PM', '6PM', '9PM', '12AM'].map((hour) => (
                  <div key={hour} className="text-center text-[10px] text-slate-500 font-medium">{hour}</div>
                ))}
              </div>

              {/* Heatmap rows */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="grid grid-cols-8 gap-1 mb-1">
                  <div className="flex items-center text-[10px] text-slate-500 font-medium pr-1">{day}</div>
                  {heatmapData
                    .filter(([d]) => d === day)
                    .map(([, hour, score]) => (
                      <HeatmapCell key={`${day}-${hour}`} score={score as number} />
                    ))}
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-[10px] text-slate-500">Low</span>
                <div className="flex gap-0.5">
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map((opacity) => (
                    <div
                      key={opacity}
                      className="w-4 h-3 rounded-sm"
                      style={{ backgroundColor: `rgba(249, 115, 22, ${opacity})` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-500">High</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
