'use client';

import React, { useState } from 'react';
import {
  Send,
  Search,
  Filter,
  Clock,
  Calendar,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Sparkles,
  Smartphone,
} from 'lucide-react';

// ---- Mock Data ----

type PublishItemStatus = 'pending' | 'publishing' | 'published' | 'failed';

const mockPublishQueue = [
  {
    id: 'pub-001',
    title: 'INSANE 1v5 Clutch on Ascent 🔥 #shorts',
    platform: 'youtube_shorts' as const,
    status: 'scheduled' as PublishItemStatus,
    scheduledAt: 'Today, 6:00 PM EST',
    publishedAt: null,
    platformContentId: null,
    retryCount: 0,
    errorMessage: null,
  },
  {
    id: 'pub-002',
    title: '1v5 Clutch That Broke the Internet 🔥',
    platform: 'instagram_reels' as const,
    status: 'scheduled' as PublishItemStatus,
    scheduledAt: 'Today, 8:30 PM EST',
    publishedAt: null,
    platformContentId: null,
    retryCount: 0,
    errorMessage: null,
  },
  {
    id: 'pub-003',
    title: 'The 1v5 Clutch That Made Chat Lose It 🤯',
    platform: 'tiktok' as const,
    status: 'pending' as PublishItemStatus,
    scheduledAt: 'Tomorrow, 12:00 PM EST',
    publishedAt: null,
    platformContentId: null,
    retryCount: 0,
    errorMessage: null,
  },
  {
    id: 'pub-004',
    title: '47 Tries Later... FINALLY! Elden Ring Boss Fight 🎮',
    platform: 'youtube_shorts' as const,
    status: 'published' as PublishItemStatus,
    scheduledAt: 'Yesterday, 6:00 PM EST',
    publishedAt: 'Yesterday, 6:02 PM EST',
    platformContentId: 'yt_abc123',
    retryCount: 0,
    errorMessage: null,
  },
  {
    id: 'pub-005',
    title: 'Baron Steal That Won the Game! 🏆',
    platform: 'youtube_shorts' as const,
    status: 'published' as PublishItemStatus,
    scheduledAt: '2 days ago, 3:00 PM EST',
    publishedAt: '2 days ago, 3:01 PM EST',
    platformContentId: 'yt_def456',
    retryCount: 0,
    errorMessage: null,
  },
  {
    id: 'pub-006',
    title: 'Operator Ace — No Scope No Problem 🎯',
    platform: 'instagram_reels' as const,
    status: 'failed' as PublishItemStatus,
    scheduledAt: '3 days ago, 7:00 PM EST',
    publishedAt: null,
    platformContentId: null,
    retryCount: 3,
    errorMessage: 'Instagram API rate limit exceeded. Please try again later.',
  },
  {
    id: 'pub-007',
    title: 'Funniest League Moments This Week',
    platform: 'tiktok' as const,
    status: 'publishing' as PublishItemStatus,
    scheduledAt: 'Now',
    publishedAt: null,
    platformContentId: null,
    retryCount: 0,
    errorMessage: null,
  },
];

const statusFilters = ['all', 'pending', 'scheduled', 'publishing', 'published', 'failed'] as const;

// ---- Helpers ----

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'youtube_shorts':
    case 'youtube_vod':
      return <span className="text-accent-youtube font-bold text-xs">▶</span>;
    case 'instagram_reels':
    case 'instagram_stories':
      return <span className="text-accent-instagram font-bold text-xs">IG</span>;
    case 'tiktok':
      return <span className="text-accent-tiktok font-bold text-xs">TT</span>;
    default:
      return null;
  }
}

function getPlatformLabel(platform: string) {
  switch (platform) {
    case 'youtube_shorts': return 'YouTube Shorts';
    case 'youtube_vod': return 'YouTube VOD';
    case 'instagram_reels': return 'Instagram Reels';
    case 'instagram_stories': return 'Instagram Stories';
    case 'tiktok': return 'TikTok';
    default: return platform;
  }
}

function getPublishStatusConfig(status: PublishItemStatus) {
  switch (status) {
    case 'pending':
      return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock, label: 'Pending' };
    case 'scheduled':
      return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Calendar, label: 'Scheduled' };
    case 'publishing':
      return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Loader2, label: 'Publishing', spin: true };
    case 'published':
      return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2, label: 'Published' };
    case 'failed':
      return { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle, label: 'Failed' };
  }
}

// ---- Component ----

export default function PublishPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredQueue = mockPublishQueue.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Publish Queue</h1>
          <p className="text-gray-400 text-sm mt-1">
            Monitor and manage scheduled content publications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              {mockPublishQueue.filter((q) => q.status === 'publishing').length} publishing
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Pending', count: mockPublishQueue.filter((q) => q.status === 'pending').length, color: 'text-gray-400' },
          { label: 'Scheduled', count: mockPublishQueue.filter((q) => q.status === 'scheduled').length, color: 'text-blue-400' },
          { label: 'Publishing', count: mockPublishQueue.filter((q) => q.status === 'publishing').length, color: 'text-amber-400' },
          { label: 'Published', count: mockPublishQueue.filter((q) => q.status === 'published').length, color: 'text-green-400' },
          { label: 'Failed', count: mockPublishQueue.filter((q) => q.status === 'failed').length, color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl glass text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search publish queue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-200 border border-surface-300/50 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {statusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize whitespace-nowrap ${
                statusFilter === filter
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-200 text-gray-400 hover:text-white hover:bg-surface-300'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Publish Queue List */}
      <div className="space-y-3">
        {filteredQueue.length === 0 ? (
          <div className="text-center py-12">
            <Send className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No items in queue</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredQueue.map((item) => {
            const statusConfig = getPublishStatusConfig(item.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={item.id}
                className={`group p-4 rounded-2xl glass transition-all ${
                  item.status === 'failed' ? 'border-red-500/20 hover:border-red-500/40' : 'hover:border-brand-500/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Platform Icon */}
                  <div className="w-10 h-10 rounded-xl bg-surface-300 flex items-center justify-center flex-shrink-0">
                    {getPlatformIcon(item.platform)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {getPlatformLabel(item.platform)}
                          </span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {item.scheduledAt}
                          </span>
                          {item.publishedAt && (
                            <>
                              <span className="text-xs text-gray-500">·</span>
                              <span className="flex items-center gap-1 text-xs text-green-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Published {item.publishedAt}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 flex-shrink-0 ${statusConfig.color}`}>
                        <StatusIcon className={`w-3 h-3 ${('spin' in statusConfig && statusConfig.spin) ? 'animate-spin' : ''}`} />
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Error message */}
                    {item.errorMessage && (
                      <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">{item.errorMessage}</p>
                        {item.retryCount > 0 && (
                          <p className="text-xs text-red-400/70 mt-1">
                            Retry attempts: {item.retryCount}/3
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {(item.status === 'pending' || item.status === 'scheduled') && (
                        <>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-xs font-medium text-gray-300 transition-colors border border-surface-300/50">
                            <Calendar className="w-3.5 h-3.5" />
                            Reschedule
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-xs font-medium text-red-400 transition-colors border border-red-500/20">
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </>
                      )}
                      {item.status === 'failed' && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-xs font-medium text-brand-400 transition-colors border border-brand-500/20">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Retry
                        </button>
                      )}
                      {item.status === 'published' && item.platformContentId && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-xs font-medium text-gray-300 transition-colors border border-surface-300/50">
                          <ExternalLink className="w-3.5 h-3.5" />
                          View on Platform
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
