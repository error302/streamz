'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Search,
  Filter,
  Sparkles,
  Edit3,
  Check,
  X,
  Calendar,
  Play,
  ArrowUpRight,
  Hash,
  Tag,
  Send,
} from 'lucide-react';

// ---- Mock Data ----

const mockShorts = [
  {
    id: 'short-001',
    highlightTitle: 'INSANE 1v5 Clutch on Ascent 🔥',
    streamTitle: 'Ranked Valorant — Pushing to Immortal',
    status: 'pending' as const,
    title: 'INSANE 1v5 Clutch on Ascent 🔥 #shorts',
    description: 'Watch this unbelievable 1v5 clutch on Ascent! The enemy team thought they had it... they were wrong. 💀\n\n#valorant #clutch #gaming #shorts',
    hashtags: ['#shorts', '#valorant', '#clutch', '#gaming'],
    suggestedPostTime: 'Today, 6:00 PM EST',
    hookRating: 'A+',
    createdAt: '2 hours ago',
  },
  {
    id: 'short-002',
    highlightTitle: 'First Boss Down After 47 Attempts!',
    streamTitle: 'Elden Ring DLC First Playthrough',
    status: 'approved' as const,
    title: '47 Tries Later... FINALLY! Elden Ring Boss Fight 🎮',
    description: 'After 47 attempts, the boss finally goes down! The reaction is PRICELESS 😭\n\n#eldenring #bossfight #gaming #shorts',
    hashtags: ['#shorts', '#eldenring', '#bossfight', '#gaming'],
    suggestedPostTime: 'Tomorrow, 12:00 PM EST',
    hookRating: 'A',
    createdAt: '5 hours ago',
  },
  {
    id: 'short-003',
    highlightTitle: '20 Kill Game — Pathfinder Movement',
    streamTitle: 'Apex Legends — Predator Ranked Grind',
    status: 'scheduled' as const,
    title: '20 Kill Game — This Movement Is ILLEGAL 🤯',
    description: 'Pathfinder movement that will blow your mind. 20 kills in ONE game! 💀\n\n#apexlegends #pathfinder #movement #shorts',
    hashtags: ['#shorts', '#apexlegends', '#pathfinder', '#movement'],
    suggestedPostTime: 'Tomorrow, 3:00 PM EST',
    hookRating: 'A+',
    createdAt: '1 day ago',
  },
  {
    id: 'short-004',
    highlightTitle: 'Baron Steal with Smite',
    streamTitle: 'League of Legends — Clash Tournament',
    status: 'published' as const,
    title: 'Baron Steal That Won the Game! 🏆 #shorts',
    description: 'The smite steal that changed EVERYTHING. GG! 🏆\n\n#leagueoflegends #baron #smite #shorts',
    hashtags: ['#shorts', '#leagueoflegends', '#baron', '#smite'],
    suggestedPostTime: '2 days ago, 3:00 PM EST',
    hookRating: 'B+',
    createdAt: '2 days ago',
  },
  {
    id: 'short-005',
    highlightTitle: 'Operator Ace Round',
    streamTitle: 'Ranked Valorant — Pushing to Immortal',
    status: 'pending' as const,
    title: 'Operator Ace — No Scope No Problem 🎯',
    description: 'Full operator ace round on Ascent. No scope needed! 🎯🔥\n\n#valorant #operator #ace #shorts',
    hashtags: ['#shorts', '#valorant', '#operator', '#ace'],
    suggestedPostTime: 'Today, 8:00 PM EST',
    hookRating: 'B',
    createdAt: '3 days ago',
  },
];

const statusFilters = ['all', 'pending', 'approved', 'scheduled', 'published'] as const;

// ---- Helpers ----

function getStatusConfig(status: string) {
  switch (status) {
    case 'pending':
      return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Pending' };
    case 'approved':
      return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Approved' };
    case 'scheduled':
      return { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Scheduled' };
    case 'published':
      return { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Published' };
    default:
      return { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: status };
  }
}

function getHookColor(rating: string) {
  if (rating.startsWith('A')) return 'text-green-400 bg-green-600/20 border-green-500/30';
  if (rating.startsWith('B')) return 'text-amber-400 bg-amber-600/20 border-amber-500/30';
  return 'text-gray-400 bg-gray-600/20 border-gray-500/30';
}

// ---- Component ----

export default function ShortsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const filteredShorts = mockShorts.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.streamTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (id: string, title: string, description: string) => {
    setEditingId(id);
    setEditTitle(title);
    setEditDescription(description);
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/content"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back to Content
      </Link>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-youtube/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-accent-youtube" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">YouTube Shorts</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Vertical clip management and optimization
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-amber-400">
            <Sparkles className="w-4 h-4" />
            {mockShorts.filter((s) => s.status === 'pending').length} pending review
          </span>
        </div>
      </div>

      {/* Shorts Optimization Tips */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-youtube/10 to-accent-youtube/5 border border-accent-youtube/20">
        <h3 className="text-sm font-semibold text-accent-youtube mb-2">Shorts Optimization Tips</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="text-xs text-gray-300">
            <span className="font-medium text-white">Hook First 3s:</span> Front-load the most exciting moment in the first 3 seconds
          </div>
          <div className="text-xs text-gray-300">
            <span className="font-medium text-white">Vertical Format:</span> All clips are auto-cropped to 9:16 with smart subject detection
          </div>
          <div className="text-xs text-gray-300">
            <span className="font-medium text-white">Trending Hashtags:</span> AI selects trending + niche hashtags for maximum reach
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search shorts..."
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

      {/* Shorts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredShorts.map((short) => (
          <div
            key={short.id}
            className="group rounded-2xl glass overflow-hidden hover:border-brand-500/30 transition-all"
          >
            {/* Vertical Preview (9:16 aspect ratio) */}
            <div className="aspect-[9/16] bg-surface-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-accent-youtube/10" />
              
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:bg-accent-youtube/30 transition-colors">
                  <Play className="w-7 h-7 text-white ml-1" />
                </div>
              </div>

              {/* Hook Rating Badge */}
              <div className="absolute top-3 right-3">
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${getHookColor(short.hookRating)}`}>
                  Hook: {short.hookRating}
                </span>
              </div>

              {/* Status Badge */}
              <div className="absolute top-3 left-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusConfig(short.status).color}`}>
                  {getStatusConfig(short.status).label}
                </span>
              </div>

              {/* Bottom gradient with title */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                {editingId === short.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-black/50 border border-brand-500/50 text-xs text-white focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <h3 className="text-sm font-semibold line-clamp-2">{short.title}</h3>
                )}
              </div>
            </div>

            {/* Card Content */}
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{short.streamTitle}</span>
              </div>

              {/* Hashtags */}
              <div className="flex flex-wrap gap-1">
                {short.hashtags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded bg-accent-youtube/10 text-accent-youtube text-xs"
                  >
                    {tag}
                  </span>
                ))}
                {short.hashtags.length > 3 && (
                  <span className="text-xs text-gray-500">+{short.hashtags.length - 3}</span>
                )}
              </div>

              {/* Suggested time */}
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {short.suggestedPostTime}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {short.status === 'pending' && (
                  <>
                    <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-xs font-medium text-green-400 transition-colors">
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                    <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-xs font-medium text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                      Reject
                    </button>
                  </>
                )}
                {short.status === 'approved' && (
                  <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-xs font-medium text-purple-400 transition-colors">
                    <Send className="w-3 h-3" />
                    Upload to Shorts
                  </button>
                )}
                <button
                  onClick={() => handleEdit(short.id, short.title, short.description)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-200 hover:bg-surface-300 text-xs font-medium text-gray-300 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredShorts.length === 0 && (
        <div className="text-center py-12">
          <Smartphone className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No shorts found</p>
          <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
