'use client';

import React, { useState, useCallback } from 'react';
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
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { BatchOperationsBar } from '@/components/streamz/batch-operations';
import { Modal } from '@/components/ui';

// ---- Types ----

type ContentStatus = 'pending' | 'approved' | 'scheduled' | 'published';

interface ContentItem {
  id: string;
  highlightTitle: string;
  streamTitle: string;
  platform: 'youtube_shorts' | 'instagram_reels' | 'tiktok';
  title: string;
  description: string;
  status: ContentStatus;
  createdAt: string;
  scheduledAt: string | null;
}

// ---- Mock Data ----

const mockContent: ContentItem[] = [
  {
    id: 'content-001',
    highlightTitle: 'INSANE 1v5 Clutch on Ascent 🔥',
    streamTitle: 'Ranked Valorant — Pushing to Immortal',
    platform: 'youtube_shorts',
    title: 'INSANE 1v5 Clutch on Ascent 🔥 #shorts',
    description: 'Watch this unbelievable 1v5 clutch on Ascent!',
    status: 'pending',
    createdAt: '2 hours ago',
    scheduledAt: null,
  },
  {
    id: 'content-002',
    highlightTitle: 'INSANE 1v5 Clutch on Ascent 🔥',
    streamTitle: 'Ranked Valorant — Pushing to Immortal',
    platform: 'instagram_reels',
    title: '1v5 Clutch That Broke the Internet 🔥',
    description: 'When they said it was impossible...',
    status: 'approved',
    createdAt: '2 hours ago',
    scheduledAt: 'Today, 8:30 PM EST',
  },
  {
    id: 'content-003',
    highlightTitle: 'INSANE 1v5 Clutch on Ascent 🔥',
    streamTitle: 'Ranked Valorant — Pushing to Immortal',
    platform: 'tiktok',
    title: 'The 1v5 Clutch That Made Chat Lose It 🤯',
    description: 'POV: You clutch a 1v5 and the chat goes INSANE',
    status: 'scheduled',
    createdAt: '2 hours ago',
    scheduledAt: 'Tomorrow, 12:00 PM EST',
  },
  {
    id: 'content-004',
    highlightTitle: 'First Boss Down After 47 Attempts!',
    streamTitle: 'Elden Ring DLC First Playthrough',
    platform: 'youtube_shorts',
    title: '47 Tries Later... FINALLY! Elden Ring Boss Fight 🎮',
    description: 'After 47 attempts, the boss finally goes down!',
    status: 'published',
    createdAt: '5 hours ago',
    scheduledAt: 'Yesterday, 6:00 PM EST',
  },
  {
    id: 'content-005',
    highlightTitle: '20 Kill Game — Pathfinder Movement',
    streamTitle: 'Apex Legends — Predator Ranked Grind',
    platform: 'instagram_reels',
    title: '20 Kill Game with Insane Movement 💀',
    description: 'Pathfinder movement that will blow your mind',
    status: 'pending',
    createdAt: '1 day ago',
    scheduledAt: null,
  },
  {
    id: 'content-006',
    highlightTitle: '20 Kill Game — Pathfinder Movement',
    streamTitle: 'Apex Legends — Predator Ranked Grind',
    platform: 'tiktok',
    title: 'This Pathfinder Movement Is ILLEGAL 🤯',
    description: '20 kills with the craziest movement you\'ve ever seen',
    status: 'pending',
    createdAt: '1 day ago',
    scheduledAt: null,
  },
  {
    id: 'content-007',
    highlightTitle: 'Baron Steal with Smite',
    streamTitle: 'League of Legends — Clash Tournament',
    platform: 'youtube_shorts',
    title: 'Baron Steal That Won the Game! 🏆',
    description: 'The smite steal that changed everything',
    status: 'approved',
    createdAt: '2 days ago',
    scheduledAt: 'Today, 7:00 PM EST',
  },
  {
    id: 'content-008',
    highlightTitle: 'Ace Round with Operator',
    streamTitle: 'Ranked Valorant — Pushing to Immortal',
    platform: 'youtube_shorts',
    title: 'Operator Ace — No Scope No Problem 🎯',
    description: 'Full operator ace round on Ascent',
    status: 'published',
    createdAt: '3 days ago',
    scheduledAt: '2 days ago, 3:00 PM EST',
  },
];

const statusFilters = ['all', 'pending', 'approved', 'scheduled', 'published'] as const;

// ---- Toast Notification ----

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl border animate-in slide-in-from-right-full duration-300 ${
            toast.type === 'success'
              ? 'bg-green-500/20 border-green-500/30 text-green-300'
              : toast.type === 'error'
              ? 'bg-red-500/20 border-red-500/30 text-red-300'
              : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
          {toast.type === 'error' && <XCircle className="w-4 h-4" />}
          {toast.type === 'info' && <AlertCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

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
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [content, setContent] = useState<ContentItem[]>(mockContent);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('18:00');

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const filteredContent = content.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.streamTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingItems = content.filter((c) => c.status === 'pending');
  const allPendingSelected = pendingItems.length > 0 && pendingItems.every((c) => selectedIds.has(c.id));

  const toggleSelect = (id: string, shiftKey: boolean = false) => {
    if (shiftKey && lastClickedId) {
      // Range selection
      const visibleIds = filteredContent.map((c) => c.id);
      const startIdx = visibleIds.indexOf(lastClickedId);
      const endIdx = visibleIds.indexOf(id);
      if (startIdx !== -1 && endIdx !== -1) {
        const rangeStart = Math.min(startIdx, endIdx);
        const rangeEnd = Math.max(startIdx, endIdx);
        const rangeIds = visibleIds.slice(rangeStart, rangeEnd + 1);
        const next = new Set(selectedIds);
        rangeIds.forEach((rid) => next.add(rid));
        setSelectedIds(next);
        setLastClickedId(id);
        return;
      }
    }

    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    setLastClickedId(id);
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingItems.map((c) => c.id)));
    }
  };

  const toggleSelectAllOnPage = () => {
    const pageIds = filteredContent.map((c) => c.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageIds));
    }
  };

  const handleApprove = (id: string) => {
    setContent((prev) => prev.map((c) => c.id === id ? { ...c, status: 'approved' as ContentStatus } : c));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    addToast('Content approved successfully', 'success');
  };

  const handleReject = (id: string) => {
    setContent((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    addToast('Content rejected', 'info');
  };

  const handleSchedule = (id: string) => {
    setScheduleTarget(id);
    setScheduleDate(new Date().toISOString().split('T')[0]);
    setScheduleTime('18:00');
    setScheduleModalOpen(true);
  };

  const confirmSchedule = () => {
    if (scheduleTarget) {
      const dateObj = new Date(`${scheduleDate}T${scheduleTime}`);
      const formatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      setContent((prev) => prev.map((c) =>
        c.id === scheduleTarget ? { ...c, status: 'scheduled' as ContentStatus, scheduledAt: formatted } : c
      ));
      addToast('Content scheduled for ' + formatted, 'success');
    }
    setScheduleModalOpen(false);
    setScheduleTarget(null);
  };

  const handleBatchApprove = async () => {
    const ids = Array.from(selectedIds);
    setContent((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, status: 'approved' as ContentStatus } : c));
    setSelectedIds(new Set());
    addToast(`${ids.length} items approved`, 'success');
  };

  const handleBatchReject = async () => {
    const ids = Array.from(selectedIds);
    setContent((prev) => prev.filter((c) => !ids.includes(c.id)));
    setSelectedIds(new Set());
    addToast(`${ids.length} items rejected`, 'info');
  };

  const handleBatchSchedule = async () => {
    const ids = Array.from(selectedIds);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formatted = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', 6:00 PM';
    setContent((prev) => prev.map((c) =>
      ids.includes(c.id) ? { ...c, status: 'scheduled' as ContentStatus, scheduledAt: formatted } : c
    ));
    setSelectedIds(new Set());
    addToast(`${ids.length} items scheduled`, 'success');
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    setContent((prev) => prev.filter((c) => !ids.includes(c.id)));
    setSelectedIds(new Set());
    addToast(`${ids.length} items deleted`, 'info');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Queue</h1>
          <p className="text-slate-400 text-sm mt-1">Review and schedule AI-generated content</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', count: content.filter((c) => c.status === 'pending').length, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Approved', count: content.filter((c) => c.status === 'approved').length, color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Scheduled', count: content.filter((c) => c.status === 'scheduled').length, color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
          { label: 'Published', count: content.filter((c) => c.status === 'published').length, color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-xl border ${stat.bgColor}`}>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
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
            placeholder="Search content..."
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

      {/* Select All Options */}
      <div className="flex items-center gap-4 flex-wrap">
        {pendingItems.length > 0 && (
          <button
            onClick={toggleSelectAllPending}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              allPendingSelected ? 'bg-orange-500 border-orange-400' : 'border-slate-500 hover:border-slate-400'
            }`}>
              {allPendingSelected && <Check className="w-3 h-3 text-white" />}
            </div>
            Select all pending ({pendingItems.length})
          </button>
        )}
        <button
          onClick={toggleSelectAllOnPage}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
            filteredContent.length > 0 && filteredContent.every((c) => selectedIds.has(c.id))
              ? 'bg-orange-500 border-orange-400'
              : 'border-slate-500 hover:border-slate-400'
          }`}>
            {filteredContent.length > 0 && filteredContent.every((c) => selectedIds.has(c.id)) && <Check className="w-3 h-3 text-white" />}
          </div>
          Select all on this page ({filteredContent.length})
        </button>
        {selectedIds.size > 0 && (
          <span className="text-xs text-orange-400 font-medium">
            {selectedIds.size} selected
          </span>
        )}
      </div>

      {/* Content List */}
      <div className="space-y-3">
        {filteredContent.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No content found</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredContent.map((item) => {
            const statusConfig = getStatusConfig(item.status);
            const StatusIcon = statusConfig.icon;
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`group p-4 rounded-2xl transition-all ${
                  isSelected
                    ? 'bg-orange-500/5 border border-orange-500/30 ring-1 ring-orange-500/20'
                    : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  {(item.status === 'pending' || item.status === 'approved') && (
                    <button
                      onClick={(e) => toggleSelect(item.id, e.shiftKey)}
                      className="mt-1 flex-shrink-0"
                      aria-label={`Select ${item.title}`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-orange-500 border-orange-400' : 'border-slate-500 hover:border-slate-400'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  )}
                  {item.status !== 'pending' && item.status !== 'approved' && <div className="w-4 flex-shrink-0" />}

                  {/* Platform Icon */}
                  <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {getPlatformIcon(item.platform)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {item.highlightTitle} · {item.streamTitle}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500">{getPlatformLabel(item.platform)}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-500">{item.createdAt}</span>
                      {item.scheduledAt && (
                        <>
                          <span className="text-xs text-slate-500">·</span>
                          <span className="flex items-center gap-1 text-xs text-purple-400">
                            <Calendar className="w-3 h-3" />
                            {item.scheduledAt}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-xs font-medium text-green-400 transition-colors border border-green-500/20"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-xs font-medium text-red-400 transition-colors border border-red-500/20"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                      {item.status === 'approved' && (
                        <button
                          onClick={() => handleSchedule(item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-xs font-medium text-purple-400 transition-colors border border-purple-500/20"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Schedule
                        </button>
                      )}
                      {(item.status === 'pending' || item.status === 'approved') && (
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-xs font-medium text-slate-300 transition-colors border border-slate-600/50">
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                      <Link
                        href={`/dashboard/highlights/${item.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-xs font-medium text-slate-300 transition-colors border border-slate-600/50"
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

      {/* Batch Operations Bar */}
      <BatchOperationsBar
        selectedCount={selectedIds.size}
        onApproveAll={handleBatchApprove}
        onRejectAll={handleBatchReject}
        onScheduleAll={handleBatchSchedule}
        onDelete={handleBatchDelete}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Schedule Modal */}
      <Modal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Schedule Content"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Date</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Time</label>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-colors"
            />
          </div>
          {scheduleDate && scheduleTime && (
            <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
              <p className="text-xs text-slate-500 mb-1">Scheduled for</p>
              <p className="text-sm text-white font-medium">
                {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmSchedule}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors"
            >
              Schedule
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
