'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Filter,
  Check,
  X,
  Clock,
  Calendar,
  Edit3,
  ChevronRight,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// ---- Mock Data ----

type ContentStatus = 'pending' | 'approved' | 'scheduled' | 'published';

const mockContent = [
  {
    id: 'content-001',
    highlightTitle: 'INSANE 1v5 Clutch on Ascent 🔥',
    streamTitle: 'Ranked Valorant — Pushing to Immortal',
    platform: 'youtube_shorts' as const,
    title: 'INSANE 1v5 Clutch on Ascent 🔥 #shorts',
    description: 'Watch this unbelievable 1v5 clutch on Ascent!',
    status: 'pending' as ContentStatus,
    createdAt: '2 hours ago',
    scheduledAt: null,
  },
  {
    id: 'content-002',
    highlightTitle: 'INSANE 1v5 Clutch on Ascent 🔥',
    streamTitle: 'Ranked Valorant — Pushing to Immortal',
    platform: 'instagram_reels' as const,
    title: '1v5 Clutch That Broke the Internet 🔥',
    description: 'When they said it was impossible...',
    status: 'approved' as ContentStatus,
    createdAt: '2 hours ago',
    scheduledAt: 'Today, 8:30 PM EST',
  },
  {
    id: 'content-003',
    highlightTitle: 'INSANE 1v5 Clutch on Ascent 🔥',
    streamTitle: 'Ranked Valorant — Pushing to Immortal',
    platform: 'tiktok' as const,
    title: 'The 1v5 Clutch That Made Chat Lose It 🤯',
    description: 'POV: You clutch a 1v5 and the chat goes INSANE',
    status: 'scheduled' as ContentStatus,
    createdAt: '2 hours ago',
    scheduledAt: 'Tomorrow, 12:00 PM EST',
  },
  {
    id: 'content-004',
    highlightTitle: 'First Boss Down After 47 Attempts!',
    streamTitle: 'Elden Ring DLC First Playthrough',
    platform: 'youtube_shorts' as const,
    title: '47 Tries Later... FINALLY! Elden Ring Boss Fight 🎮',
    description: 'After 47 attempts, the boss finally goes down!',
    status: 'published' as ContentStatus,
    createdAt: '5 hours ago',
    scheduledAt: 'Yesterday, 6:00 PM EST',
  },
  {
    id: 'content-005',
    highlightTitle: '20 Kill Game — Pathfinder Movement',
    streamTitle: 'Apex Legends — Predator Ranked Grind',
    platform: 'instagram_reels' as const,
    title: '20 Kill Game with Insane Movement 💀',
    description: 'Pathfinder movement that will blow your mind',
    status: 'pending' as ContentStatus,
    createdAt: '1 day ago',
    scheduledAt: null,
  },
  {
    id: 'content-006',
    highlightTitle: '20 Kill Game — Pathfinder Movement',
    streamTitle: 'Apex Legends — Predator Ranked Grind',
    platform: 'tiktok' as const,
    title: 'This Pathfinder Movement Is ILLEGAL 🤯',
    description: '20 kills with the craziest movement you\'ve ever seen',
    status: 'pending' as ContentStatus,
    createdAt: '1 day ago',
    scheduledAt: null,
  },
  {
    id: 'content-007',
    highlightTitle: 'Baron Steal with Smite',
    streamTitle: 'League of Legends — Clash Tournament',
    platform: 'youtube_shorts' as const,
    title: 'Baron Steal That Won the Game! 🏆',
    description: 'The smite steal that changed everything',
    status: 'approved' as ContentStatus,
    createdAt: '2 days ago',
    scheduledAt: 'Today, 7:00 PM EST',
  },
  {
    id: 'content-008',
    highlightTitle: 'Ace Round with Operator',
    streamTitle: 'Ranked Valorant — Pushing to Immortal',
    platform: 'youtube_shorts' as const,
    title: 'Operator Ace — No Scope No Problem 🎯',
    description: 'Full operator ace round on Ascent',
    status: 'published' as ContentStatus,
    createdAt: '3 days ago',
    scheduledAt: '2 days ago, 3:00 PM EST',
  },
];

const statusFilters = ['all', 'pending', 'approved', 'scheduled', 'published'] as const;

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

function getStatusConfig(status: ContentStatus) {
  switch (status) {
    case 'pending':
      return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock, label: 'Pending' };
    case 'approved':
      return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle2, label: 'Approved' };
    case 'scheduled':
      return { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Calendar, label: 'Scheduled' };
    case 'published':
      return { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Send, label: 'Published' };
  }
}

// ---- Component ----

export default function ContentPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredContent = mockContent.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.streamTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingItems = mockContent.filter((c) => c.status === 'pending');
  const allPendingSelected = pendingItems.length > 0 && pendingItems.every((c) => selectedIds.has(c.id));

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingItems.map((c) => c.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Content Queue</h1>
          <p className="text-gray-400 text-sm mt-1">
            Review and schedule AI-generated content
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors">
              <Check className="w-4 h-4" />
              Bulk Approve ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', count: mockContent.filter((c) => c.status === 'pending').length, color: 'text-amber-400', bgColor: 'bg-amber-600/20' },
          { label: 'Approved', count: mockContent.filter((c) => c.status === 'approved').length, color: 'text-blue-400', bgColor: 'bg-blue-600/20' },
          { label: 'Scheduled', count: mockContent.filter((c) => c.status === 'scheduled').length, color: 'text-purple-400', bgColor: 'bg-purple-600/20' },
          { label: 'Published', count: mockContent.filter((c) => c.status === 'published').length, color: 'text-green-400', bgColor: 'bg-green-600/20' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-xl glass">
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
            placeholder="Search content..."
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

      {/* Select All */}
      {pendingItems.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAllPending}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              allPendingSelected ? 'bg-brand-600 border-brand-500' : 'border-surface-400'
            }`}>
              {allPendingSelected && <Check className="w-3 h-3 text-white" />}
            </div>
            Select all pending ({pendingItems.length})
          </button>
        </div>
      )}

      {/* Content List */}
      <div className="space-y-3">
        {filteredContent.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No content found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredContent.map((content) => {
            const statusConfig = getStatusConfig(content.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={content.id}
                className="group p-4 rounded-2xl glass hover:border-brand-500/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox for pending items */}
                  {content.status === 'pending' && (
                    <button
                      onClick={() => toggleSelect(content.id)}
                      className="mt-1 flex-shrink-0"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedIds.has(content.id) ? 'bg-brand-600 border-brand-500' : 'border-surface-400 hover:border-gray-400'
                      }`}>
                        {selectedIds.has(content.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  )}
                  {!content.status.includes('pending') && <div className="w-4 flex-shrink-0" />}

                  {/* Platform Icon */}
                  <div className="w-10 h-10 rounded-xl bg-surface-300 flex items-center justify-center flex-shrink-0">
                    {getPlatformIcon(content.platform)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">{content.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {content.highlightTitle} · {content.streamTitle}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">
                        {getPlatformLabel(content.platform)}
                      </span>
                      <span className="text-xs text-gray-500">·</span>
                      <span className="text-xs text-gray-500">{content.createdAt}</span>
                      {content.scheduledAt && (
                        <>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="flex items-center gap-1 text-xs text-purple-400">
                            <Calendar className="w-3 h-3" />
                            {content.scheduledAt}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {content.status === 'pending' && (
                        <>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-xs font-medium text-green-400 transition-colors border border-green-500/20">
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-xs font-medium text-red-400 transition-colors border border-red-500/20">
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                      {content.status === 'approved' && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-xs font-medium text-purple-400 transition-colors border border-purple-500/20">
                          <Calendar className="w-3.5 h-3.5" />
                          Schedule
                        </button>
                      )}
                      {(content.status === 'pending' || content.status === 'approved') && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-xs font-medium text-gray-300 transition-colors border border-surface-300/50">
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                      <Link
                        href={`/dashboard/highlights/${content.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-300 text-xs font-medium text-gray-300 transition-colors border border-surface-300/50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        View Highlight
                      </Link>
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
