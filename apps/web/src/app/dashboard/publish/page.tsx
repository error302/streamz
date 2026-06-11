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
  List,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/components/ui';

// ---- Types ----

type PublishItemStatus = 'pending' | 'scheduled' | 'publishing' | 'published' | 'failed';

interface PublishItem {
  id: string;
  title: string;
  platform: 'youtube_shorts' | 'instagram_reels' | 'tiktok';
  status: PublishItemStatus;
  scheduledAt: string;
  scheduledAtISO: string;
  publishedAt: string | null;
  publishedAtISO: string | null;
  platformContentId: string | null;
  retryCount: number;
  errorMessage: string | null;
  errorDetails: string | null;
}

// ---- Mock Data ----

const now = new Date();

const mockPublishQueue: PublishItem[] = [
  {
    id: 'pub-001',
    title: 'INSANE 1v5 Clutch on Ascent 🔥 #shorts',
    platform: 'youtube_shorts',
    status: 'scheduled',
    scheduledAt: 'Today, 6:00 PM EST',
    scheduledAtISO: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    publishedAt: null,
    publishedAtISO: null,
    platformContentId: null,
    retryCount: 0,
    errorMessage: null,
    errorDetails: null,
  },
  {
    id: 'pub-002',
    title: '1v5 Clutch That Broke the Internet 🔥',
    platform: 'instagram_reels',
    status: 'scheduled',
    scheduledAt: 'Today, 8:30 PM EST',
    scheduledAtISO: new Date(now.getTime() + 4.5 * 60 * 60 * 1000).toISOString(),
    publishedAt: null,
    publishedAtISO: null,
    platformContentId: null,
    retryCount: 0,
    errorMessage: null,
    errorDetails: null,
  },
  {
    id: 'pub-003',
    title: 'The 1v5 Clutch That Made Chat Lose It 🤯',
    platform: 'tiktok',
    status: 'pending',
    scheduledAt: 'Tomorrow, 12:00 PM EST',
    scheduledAtISO: new Date(now.getTime() + 20 * 60 * 60 * 1000).toISOString(),
    publishedAt: null,
    publishedAtISO: null,
    platformContentId: null,
    retryCount: 0,
    errorMessage: null,
    errorDetails: null,
  },
  {
    id: 'pub-004',
    title: '47 Tries Later... FINALLY! Elden Ring Boss Fight 🎮',
    platform: 'youtube_shorts',
    status: 'published',
    scheduledAt: 'Yesterday, 6:00 PM EST',
    scheduledAtISO: new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString(),
    publishedAt: 'Yesterday, 6:02 PM EST',
    publishedAtISO: new Date(now.getTime() - 22 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(),
    platformContentId: 'yt_abc123',
    retryCount: 0,
    errorMessage: null,
    errorDetails: null,
  },
  {
    id: 'pub-005',
    title: 'Baron Steal That Won the Game! 🏆',
    platform: 'youtube_shorts',
    status: 'published',
    scheduledAt: '2 days ago, 3:00 PM EST',
    scheduledAtISO: new Date(now.getTime() - 46 * 60 * 60 * 1000).toISOString(),
    publishedAt: '2 days ago, 3:01 PM EST',
    publishedAtISO: new Date(now.getTime() - 46 * 60 * 60 * 1000 + 60 * 1000).toISOString(),
    platformContentId: 'yt_def456',
    retryCount: 0,
    errorMessage: null,
    errorDetails: null,
  },
  {
    id: 'pub-006',
    title: 'Operator Ace — No Scope No Problem 🎯',
    platform: 'instagram_reels',
    status: 'failed',
    scheduledAt: '3 days ago, 7:00 PM EST',
    scheduledAtISO: new Date(now.getTime() - 70 * 60 * 60 * 1000).toISOString(),
    publishedAt: null,
    publishedAtISO: null,
    platformContentId: null,
    retryCount: 3,
    errorMessage: 'Instagram API rate limit exceeded. Please try again later.',
    errorDetails: `HTTP 429 Too Many Requests
Endpoint: POST /v18.0/{ig-user-id}/media_publish
Response: {"error":{"message":"Application request limit reached","type":"OAuthException","code":4,"error_subcode":2207026,"is_transient":true,"error_user_msg":"You have exceeded the maximum number of requests allowed per hour. Please try again later."}}
Stack: InstagramPublisher.publish() -> InstagramAPI.createMedia() -> HTTPClient.post()
Retry attempts: 3/3 (exhausted)
Next available slot: ${new Date(now.getTime() + 3600 * 1000).toLocaleString()}`,
  },
  {
    id: 'pub-007',
    title: 'Funniest League Moments This Week',
    platform: 'tiktok',
    status: 'publishing',
    scheduledAt: 'Now',
    scheduledAtISO: now.toISOString(),
    publishedAt: null,
    publishedAtISO: null,
    platformContentId: null,
    retryCount: 0,
    errorMessage: null,
    errorDetails: null,
  },
];

const statusFilters = ['all', 'pending', 'scheduled', 'publishing', 'published', 'failed'] as const;

// ---- Helpers ----

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'youtube_shorts':
    case 'youtube_vod':
      return <span className="text-red-500 font-bold text-xs">▶</span>;
    case 'instagram_reels':
    case 'instagram_stories':
      return <span className="text-pink-500 font-bold text-xs">IG</span>;
    case 'tiktok':
      return <span className="text-cyan-400 font-bold text-xs">TT</span>;
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

function getLocalTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return isoString;
  }
}

// ---- Component ----

export default function PublishPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

  const filteredQueue = mockPublishQueue.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleErrorExpand = (id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Publish Queue</h1>
          <p className="text-slate-400 text-sm mt-1">Monitor and manage scheduled content publications</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              {mockPublishQueue.filter((q) => q.status === 'publishing').length} publishing
            </span>
          </div>
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-800/50 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              )}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === 'timeline' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              )}
              aria-label="Timeline view"
            >
              <GitBranch className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Pending', count: mockPublishQueue.filter((q) => q.status === 'pending').length, color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/20' },
          { label: 'Scheduled', count: mockPublishQueue.filter((q) => q.status === 'scheduled').length, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Publishing', count: mockPublishQueue.filter((q) => q.status === 'publishing').length, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Published', count: mockPublishQueue.filter((q) => q.status === 'published').length, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' },
          { label: 'Failed', count: mockPublishQueue.filter((q) => q.status === 'failed').length, color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={cn('p-4 rounded-xl border text-center', stat.bgColor)}>
            <div className={cn('text-2xl font-bold', stat.color)}>{stat.count}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search publish queue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
          {statusFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize whitespace-nowrap ${
                statusFilter === filter
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filteredQueue.length === 0 ? (
        <div className="text-center py-12">
          <Send className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No items in queue</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : viewMode === 'timeline' ? (
        /* Timeline View */
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-700" />
          <div className="space-y-4">
            {filteredQueue.map((item) => {
              const statusConfig = getPublishStatusConfig(item.status);
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedErrors.has(item.id);

              return (
                <div key={item.id} className="relative pl-14">
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute left-4 top-4 w-4 h-4 rounded-full border-2 z-10',
                    item.status === 'published' ? 'bg-green-500 border-green-400' :
                    item.status === 'failed' ? 'bg-red-500 border-red-400' :
                    item.status === 'publishing' ? 'bg-amber-500 border-amber-400 animate-pulse' :
                    item.status === 'scheduled' ? 'bg-blue-500 border-blue-400' :
                    'bg-slate-500 border-slate-400'
                  )} />

                  <div className={cn(
                    'p-4 rounded-xl border transition-all',
                    item.status === 'failed' ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-800/50 border-slate-700/50'
                  )}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <div className="w-5 h-5 rounded bg-slate-700 flex items-center justify-center">
                            {getPlatformIcon(item.platform)}
                          </div>
                          <span className="text-xs text-slate-400">{getPlatformLabel(item.platform)}</span>
                          <span className="text-xs text-slate-500">·</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.scheduledAt}
                          </span>
                        </div>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 flex-shrink-0', statusConfig.color)}>
                        <StatusIcon className={cn('w-3 h-3', 'spin' in statusConfig && statusConfig.spin ? 'animate-spin' : '')} />
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Local timezone */}
                    {item.scheduledAtISO && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                        <Globe className="w-3 h-3" />
                        {getLocalTime(item.scheduledAtISO)}
                      </div>
                    )}

                    {/* Error details */}
                    {item.errorMessage && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleErrorExpand(item.id)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          View error details
                          {item.retryCount > 0 && ` (${item.retryCount}/3 retries)`}
                        </button>
                        <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-xs text-red-400">{item.errorMessage}</p>
                        </div>
                        {isExpanded && item.errorDetails && (
                          <div className="mt-2 p-3 rounded-lg bg-slate-900 border border-slate-700">
                            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">{item.errorDetails}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {(item.status === 'pending' || item.status === 'scheduled') && (
                        <>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-xs font-medium text-slate-300 transition-colors border border-slate-600/50">
                            <Calendar className="w-3.5 h-3.5" />
                            Reschedule
                          </button>
                          {cancelConfirm === item.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCancelConfirm(null)}
                                className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white"
                              >
                                No
                              </button>
                              <button
                                onClick={() => setCancelConfirm(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                              >
                                Confirm Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setCancelConfirm(item.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-xs font-medium text-red-400 transition-colors border border-red-500/20"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                      {item.status === 'failed' && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-xs font-medium text-orange-400 transition-colors border border-orange-500/20">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Retry
                        </button>
                      )}
                      {item.status === 'published' && item.platformContentId && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-xs font-medium text-slate-300 transition-colors border border-slate-600/50">
                          <ExternalLink className="w-3.5 h-3.5" />
                          View on Platform
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredQueue.map((item) => {
            const statusConfig = getPublishStatusConfig(item.status);
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedErrors.has(item.id);

            return (
              <div
                key={item.id}
                className={cn(
                  'group p-4 rounded-2xl transition-all',
                  item.status === 'failed' ? 'bg-red-500/5 border border-red-500/20 hover:border-red-500/40' : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {getPlatformIcon(item.platform)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500">{getPlatformLabel(item.platform)}</span>
                          <span className="text-xs text-slate-500">·</span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Calendar className="w-3 h-3" />
                            {item.scheduledAt}
                          </span>
                          {item.scheduledAtISO && (
                            <>
                              <span className="text-xs text-slate-500">·</span>
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Globe className="w-3 h-3" />
                                {getLocalTime(item.scheduledAtISO)}
                              </span>
                            </>
                          )}
                          {item.publishedAt && (
                            <>
                              <span className="text-xs text-slate-500">·</span>
                              <span className="flex items-center gap-1 text-xs text-green-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Published {item.publishedAt}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 flex-shrink-0', statusConfig.color)}>
                        <StatusIcon className={cn('w-3 h-3', 'spin' in statusConfig && statusConfig.spin ? 'animate-spin' : '')} />
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Error message */}
                    {item.errorMessage && (
                      <div className="mt-2">
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-red-400">{item.errorMessage}</p>
                            <button
                              onClick={() => toggleErrorExpand(item.id)}
                              className="text-red-400/60 hover:text-red-300 transition-colors ml-2 flex-shrink-0"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                          {item.retryCount > 0 && (
                            <p className="text-xs text-red-400/70 mt-1">
                              Retry attempts: {item.retryCount}/3
                            </p>
                          )}
                        </div>
                        {isExpanded && item.errorDetails && (
                          <div className="mt-2 p-3 rounded-lg bg-slate-900 border border-slate-700">
                            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto scrollbar-thin">{item.errorDetails}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {(item.status === 'pending' || item.status === 'scheduled') && (
                        <>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-xs font-medium text-slate-300 transition-colors border border-slate-600/50">
                            <Calendar className="w-3.5 h-3.5" />
                            Reschedule
                          </button>
                          {cancelConfirm === item.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCancelConfirm(null)}
                                className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white"
                              >
                                No
                              </button>
                              <button
                                onClick={() => setCancelConfirm(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                              >
                                Confirm
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setCancelConfirm(item.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-xs font-medium text-red-400 transition-colors border border-red-500/20"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                      {item.status === 'failed' && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-xs font-medium text-orange-400 transition-colors border border-orange-500/20">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Retry
                        </button>
                      )}
                      {item.status === 'published' && item.platformContentId && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-xs font-medium text-slate-300 transition-colors border border-slate-600/50">
                          <ExternalLink className="w-3.5 h-3.5" />
                          View on Platform
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
