'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  Check,
  X,
  Sparkles,
  ChevronDown,
  Filter,
  Keyboard,
  ArrowUpDown,
  Play,
  ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/components/ui';
import { BatchOperationsBar } from '@/components/streamz/batch-operations';

// ---- Types ----

type Platform = 'youtube_shorts' | 'instagram_reels' | 'tiktok';
type ContentType = 'clip' | 'highlight' | 'compilation';

interface OriginalContent {
  title: string;
  description: string;
  platform: Platform;
  streamTitle: string;
  duration: string;
  thumbnailUrl?: string;
}

interface ReviewItem {
  id: string;
  original: OriginalContent;
  aiGenerated: {
    title: string;
    description: string;
    tags: string[];
    hashtags: string[];
  };
  contentType: ContentType;
  createdAt: string;
}

interface RejectionReason {
  value: string;
  label: string;
}

const rejectionReasons: RejectionReason[] = [
  { value: 'poor_title', label: 'Poor Title' },
  { value: 'bad_description', label: 'Bad Description' },
  { value: 'wrong_tags', label: 'Wrong Tags' },
  { value: 'not_engaging', label: 'Not Engaging' },
  { value: 'other', label: 'Other' },
];

// ---- Mock Data ----

const mockReviewItems: ReviewItem[] = [
  {
    id: 'review-001',
    original: {
      title: 'INSANE 1v5 Clutch on Ascent 🔥',
      description: 'Ranked Valorant match clip — pushing to Immortal rank',
      platform: 'youtube_shorts',
      streamTitle: 'Ranked Valorant — Pushing to Immortal',
      duration: '0:32',
    },
    aiGenerated: {
      title: 'INSANE 1v5 Clutch on Ascent 🔥 #shorts',
      description: 'Watch this unbelievable 1v5 clutch on Ascent! The enemy team thought they had us, but I clutched it out with style. Drop a like if you would have panicked! 🔥',
      tags: ['valorant', 'clutch', '1v5', 'ascent', 'fps', 'gaming'],
      hashtags: ['#valorant', '#clutch', '#shorts', '#gaming', '#fps'],
    },
    contentType: 'clip',
    createdAt: '2 hours ago',
  },
  {
    id: 'review-002',
    original: {
      title: '20 Kill Game — Pathfinder Movement',
      description: 'Apex Legends ranked game with insane Pathfinder movement',
      platform: 'instagram_reels',
      streamTitle: 'Apex Legends — Predator Ranked Grind',
      duration: '0:45',
    },
    aiGenerated: {
      title: '20 Kill Game with Insane Movement 💀',
      description: 'Pathfinder movement that will blow your mind. 20 kills later and they still couldn\'t catch me 🏃‍♂️💨',
      tags: ['apex-legends', 'pathfinder', 'movement', '20kills', 'ranked'],
      hashtags: ['#apexlegends', '#pathfinder', '#reels', '#movement', '#gaming'],
    },
    contentType: 'highlight',
    createdAt: '3 hours ago',
  },
  {
    id: 'review-003',
    original: {
      title: 'Baron Steal with Smite',
      description: 'Critical baron steal in clash tournament',
      platform: 'tiktok',
      streamTitle: 'League of Legends — Clash Tournament',
      duration: '0:28',
    },
    aiGenerated: {
      title: 'Baron Steal That Won the Game! 🏆',
      description: 'POV: You smite steal the Baron and win the game. The enemy team was NOT happy 😂',
      tags: ['leagueoflegends', 'baron', 'steal', 'smite', 'clash'],
      hashtags: ['#leagueoflegends', '#baronsteal', '#tiktok', '#gaming', '#clash'],
    },
    contentType: 'clip',
    createdAt: '4 hours ago',
  },
  {
    id: 'review-004',
    original: {
      title: 'First Boss Down After 47 Attempts!',
      description: 'Elden Ring DLC boss finally defeated after 47 attempts',
      platform: 'youtube_shorts',
      streamTitle: 'Elden Ring DLC First Playthrough',
      duration: '1:12',
    },
    aiGenerated: {
      title: '47 Tries Later... FINALLY! Elden Ring Boss Fight 🎮',
      description: 'After 47 attempts, the boss finally goes down! The relief is REAL. Would you have given up? 🎮',
      tags: ['eldenring', 'boss', 'died', 'finally', 'soulslike', 'gaming'],
      hashtags: ['#eldenring', '#bossfight', '#shorts', '#soulslike', '#gaming'],
    },
    contentType: 'highlight',
    createdAt: '5 hours ago',
  },
  {
    id: 'review-005',
    original: {
      title: 'Operator Ace — No Scope No Problem',
      description: 'Full operator ace round on Ascent',
      platform: 'instagram_reels',
      streamTitle: 'Ranked Valorant — Pushing to Immortal',
      duration: '0:55',
    },
    aiGenerated: {
      title: 'Operator Ace — No Scope No Problem 🎯',
      description: 'When your aim is just built different. Full operator ace round, no scope needed 🎯',
      tags: ['valorant', 'operator', 'ace', 'noscope', 'aim', 'fps'],
      hashtags: ['#valorant', '#operator', '#ace', '#reels', '#gaming'],
    },
    contentType: 'compilation',
    createdAt: '6 hours ago',
  },
];

// ---- Helpers ----

function getPlatformBadge(platform: Platform) {
  const config = {
    youtube_shorts: { label: 'YouTube Shorts', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    instagram_reels: { label: 'Instagram Reels', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
    tiktok: { label: 'TikTok', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  };
  return config[platform];
}

function getContentTypeBadge(type: ContentType) {
  const config = {
    clip: { label: 'Clip', color: 'bg-blue-500/20 text-blue-400' },
    highlight: { label: 'Highlight', color: 'bg-orange-500/20 text-orange-400' },
    compilation: { label: 'Compilation', color: 'bg-purple-500/20 text-purple-400' },
  };
  return config[type];
}

// ---- Component ----

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>(mockReviewItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');
  const [rejectModalOpen, setRejectModalOpen] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [showComparison, setShowComparison] = useState(true);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesPlatform = platformFilter === 'all' || item.original.platform === platformFilter;
    const matchesType = typeFilter === 'all' || item.contentType === typeFilter;
    return matchesPlatform && matchesType;
  });

  const currentItem = filteredItems[activeIndex] || null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;

      if (e.key === 'a' && !e.ctrlKey && !e.metaKey && currentItem) {
        e.preventDefault();
        // Inline approve logic to avoid dependency
        setItems((prev) => prev.filter((i) => i.id !== currentItem.id));
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(currentItem.id); return next; });
        setActiveIndex(Math.max(0, Math.min(activeIndex, filteredItems.length - 2)));
        addToast('Content approved and queued for scheduling', 'success');
      }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && currentItem) {
        e.preventDefault();
        setRejectModalOpen(currentItem.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentItem, activeIndex, filteredItems.length, addToast]);

  const handleApprove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setActiveIndex(Math.max(0, Math.min(activeIndex, filteredItems.length - 2)));
    addToast('Content approved and queued for scheduling', 'success');
  };

  const handleReject = (id: string, reason: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setActiveIndex(Math.max(0, Math.min(activeIndex, filteredItems.length - 2)));
    setRejectModalOpen(null);
    setSelectedReason('');
    addToast(`Content rejected: ${reason || 'No reason specified'}`, 'info');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchApprove = async () => {
    const count = selectedIds.size;
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    setActiveIndex(0);
    addToast(`${count} items approved`, 'success');
  };

  const handleBatchReject = async () => {
    const count = selectedIds.size;
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    setActiveIndex(0);
    addToast(`${count} items rejected`, 'info');
  };

  const handleBatchDelete = async () => {
    const count = selectedIds.size;
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
    setSelectedIds(new Set());
    setActiveIndex(0);
    addToast(`${count} items deleted`, 'info');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border ${
              toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-300'
              : toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300'
              : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
            }`}
          >
            {toast.type === 'success' && <Check className="w-4 h-4" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {toast.type === 'info' && <Eye className="w-4 h-4" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Eye className="w-6 h-6 text-orange-400" />
            Review Content
          </h2>
          <p className="text-slate-400 mt-1">{filteredItems.length} items pending review</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Comparison toggle */}
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              showComparison
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Compare
          </button>
          {/* Keyboard hint */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] font-mono">A</kbd>
            Approve
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] font-mono ml-2">R</kbd>
            Reject
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <button
            onClick={() => { setPlatformFilter('all'); setTypeFilter('all'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              platformFilter === 'all' && typeFilter === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          {(['youtube_shorts', 'instagram_reels', 'tiktok'] as Platform[]).map((p) => {
            const badge = getPlatformBadge(p);
            return (
              <button
                key={p}
                onClick={() => setPlatformFilter(platformFilter === p ? 'all' : p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  platformFilter === p
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {badge.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {(['clip', 'highlight', 'compilation'] as ContentType[]).map((t) => {
            const badge = getContentTypeBadge(t);
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${
                  typeFilter === t
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {badge.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <Eye className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">No content pending review</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">Content will appear here after AI generates metadata from your highlights.</p>
        </div>
      ) : (
        /* Review Cards */
        <div className="space-y-4">
          {filteredItems.map((item, idx) => {
            const platformBadge = getPlatformBadge(item.original.platform);
            const typeBadge = getContentTypeBadge(item.contentType);
            const isSelected = selectedIds.has(item.id);
            const isActive = idx === activeIndex;

            return (
              <div
                key={item.id}
                onClick={() => setActiveIndex(idx)}
                className={`rounded-xl border transition-all ${
                  isActive
                    ? 'border-orange-500/30 bg-orange-500/5 ring-1 ring-orange-500/20'
                    : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-orange-500 border-orange-400' : 'border-slate-500 hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${platformBadge.color}`}>
                      {platformBadge.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.color}`}>
                      {typeBadge.label}
                    </span>
                    <span className="text-xs text-slate-500">{item.createdAt}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-xs font-medium text-green-400 transition-colors border border-green-500/20"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Approve</span>
                      <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-slate-800 border border-slate-600 text-[9px] font-mono text-slate-400 ml-1">A</kbd>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRejectModalOpen(item.id); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-xs font-medium text-red-400 transition-colors border border-red-500/20"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reject</span>
                      <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-slate-800 border border-slate-600 text-[9px] font-mono text-slate-400 ml-1">R</kbd>
                    </button>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-4 sm:p-6">
                  {showComparison ? (
                    /* Side-by-Side Comparison */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Original */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5" />
                          Original Content
                        </h4>
                        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 space-y-3">
                          {/* Thumbnail placeholder */}
                          <div className="w-full aspect-video rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center">
                            <div className="text-center">
                              <Play className="w-8 h-8 text-slate-600 mx-auto mb-1" />
                              <p className="text-xs text-slate-500">{item.original.duration}</p>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Title</label>
                            <p className="text-sm text-slate-200 font-medium">{item.original.title}</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Description</label>
                            <p className="text-sm text-slate-300">{item.original.description}</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Stream</label>
                            <p className="text-xs text-slate-400">{item.original.streamTitle}</p>
                          </div>
                        </div>
                      </div>

                      {/* AI Generated */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI Generated
                        </h4>
                        <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20 space-y-3">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Title</label>
                            <p className="text-sm text-white font-medium">{item.aiGenerated.title}</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">Description</label>
                            <p className="text-sm text-slate-200">{item.aiGenerated.description}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs text-slate-500 block mb-1">Tags</label>
                              <div className="flex flex-wrap gap-1">
                                {item.aiGenerated.tags.map((tag, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 block mb-1">Hashtags</label>
                              <div className="flex flex-wrap gap-1">
                                {item.aiGenerated.hashtags.map((tag, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-orange-500/10 rounded text-xs text-orange-400">{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Simple View */
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-20 aspect-video rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
                          <Play className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white">{item.aiGenerated.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.aiGenerated.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.aiGenerated.hashtags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-orange-500/10 rounded text-xs text-orange-400">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Batch Operations Bar */}
      <BatchOperationsBar
        selectedCount={selectedIds.size}
        onApproveAll={handleBatchApprove}
        onRejectAll={handleBatchReject}
        onDelete={handleBatchDelete}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setRejectModalOpen(null); setSelectedReason(''); }} aria-hidden="true" />
          <div className="relative z-50 w-full max-w-md mx-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Reject Content</h3>
              <p className="text-sm text-slate-400">Please select a reason for rejection:</p>
              <div className="space-y-2">
                {rejectionReasons.map((reason) => (
                  <button
                    key={reason.value}
                    onClick={() => setSelectedReason(reason.value === selectedReason ? '' : reason.value)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors border ${
                      selectedReason === reason.value
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => { setRejectModalOpen(null); setSelectedReason(''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(rejectModalOpen, selectedReason)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
