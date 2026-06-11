'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Check,
  X,
  Edit3,
  Clock,
  BarChart3,
  MessageSquare,
  Music,
  Tag,
  Hash,
  ExternalLink,
  Save,
} from 'lucide-react';

// ---- Mock Data ----

const mockHighlight = {
  id: 'hl-001',
  streamTitle: 'Ranked Valorant — Pushing to Immortal',
  streamId: 'stream-001',
  startTime: '01:23:45',
  endTime: '01:25:12',
  duration: '1m 27s',
  score: 0.94,
  chatSpike: 8.7,
  audioEnergy: 0.82,
  clipType: 'short',
  status: 'pending',
  platformContent: {
    youtube_shorts: {
      title: 'INSANE 1v5 Clutch on Ascent 🔥 #shorts',
      description: 'Watch this unbelievable 1v5 clutch on Ascent! The enemy team thought they had it... they were wrong. 💀\n\n#valorant #clutch #gaming #shorts',
      tags: ['valorant', 'clutch', 'ascent', '1v5', 'gaming', 'fps', 'highlights'],
      hashtags: ['#shorts', '#valorant', '#clutch', '#gaming'],
    },
    instagram_reels: {
      title: '1v5 Clutch That Broke the Internet 🔥',
      description: 'When they said it was impossible... 😤💥\n\nThis Valorant clutch had the WHOLE chat going crazy! Drop a 🔥 if you could pull this off!\n\n#valorant #gamingclips #clutch #reels',
      tags: ['valorant', 'clutch', 'reels', 'gaming', 'fps'],
      hashtags: ['#valorant', '#gamingclips', '#clutch', '#reels', '#viral'],
    },
    tiktok: {
      title: 'The 1v5 Clutch That Made Chat Lose It 🤯',
      description: 'POV: You clutch a 1v5 and the chat goes INSANE 🤯🔥 Could you do this?\n\n#valorant #clutch #gaming #fyp #viral',
      tags: ['valorant', 'clutch', 'gaming', 'fyp', 'viral'],
      hashtags: ['#valorant', '#clutch', '#gaming', '#fyp'],
    },
  },
};

const platforms = [
  { key: 'youtube_shorts' as const, label: 'YouTube Shorts', color: 'text-accent-youtube', bgColor: 'bg-accent-youtube/20', borderColor: 'border-accent-youtube/30' },
  { key: 'instagram_reels' as const, label: 'Instagram Reels', color: 'text-accent-instagram', bgColor: 'bg-accent-instagram/20', borderColor: 'border-accent-instagram/30' },
  { key: 'tiktok' as const, label: 'TikTok', color: 'text-accent-tiktok', bgColor: 'bg-accent-tiktok/20', borderColor: 'border-accent-tiktok/30' },
];

// ---- Component ----

export default function HighlightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [activePlatform, setActivePlatform] = useState<'youtube_shorts' | 'instagram_reels' | 'tiktok'>('youtube_shorts');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(mockHighlight.platformContent);
  const [reviewNotes, setReviewNotes] = useState('');

  // In a real app, we'd use the id to fetch data
  // For now, we unwrap the params promise for Next.js 15
  void params;

  const currentContent = editedContent[activePlatform];

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href="/dashboard/highlights"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Highlights
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{mockHighlight.platformContent.youtube_shorts.title}</h1>
          <p className="text-gray-400 text-sm mt-1">
            From: {mockHighlight.streamTitle}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium border flex-shrink-0 self-start ${
            mockHighlight.status === 'pending'
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              : mockHighlight.status === 'approved'
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}
        >
          {mockHighlight.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player + Stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player Placeholder */}
          <div className="aspect-video rounded-2xl bg-surface-200 border border-surface-300/50 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-accent-twitch/10" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-brand-600/30 flex items-center justify-center border border-brand-500/30 hover:bg-brand-600/50 transition-colors cursor-pointer">
                <Play className="w-8 h-8 text-brand-400 ml-1" />
              </div>
              <span className="text-sm text-gray-400">Click to play highlight clip</span>
              <span className="text-xs text-gray-500 font-mono">
                {mockHighlight.startTime} — {mockHighlight.endTime} ({mockHighlight.duration})
              </span>
            </div>
          </div>

          {/* Highlight Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl glass text-center">
              <BarChart3 className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-green-400">{(mockHighlight.score * 100).toFixed(0)}%</div>
              <div className="text-xs text-gray-500">Confidence</div>
            </div>
            <div className="p-3 rounded-xl glass text-center">
              <MessageSquare className="w-5 h-5 text-brand-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-brand-400">{mockHighlight.chatSpike}x</div>
              <div className="text-xs text-gray-500">Chat Spike</div>
            </div>
            <div className="p-3 rounded-xl glass text-center">
              <Music className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-amber-400">{(mockHighlight.audioEnergy * 100).toFixed(0)}%</div>
              <div className="text-xs text-gray-500">Audio Energy</div>
            </div>
            <div className="p-3 rounded-xl glass text-center">
              <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-blue-400">{mockHighlight.duration}</div>
              <div className="text-xs text-gray-500">Duration</div>
            </div>
          </div>

          {/* Platform Content Tabs */}
          <div className="rounded-2xl glass overflow-hidden">
            <div className="flex border-b border-surface-300/50 overflow-x-auto">
              {platforms.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setActivePlatform(p.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activePlatform === p.key
                      ? `${p.color} border-current bg-surface-200/50`
                      : 'text-gray-400 hover:text-white border-transparent'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4">
              {isEditing ? (
                <>
                  {/* Title */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                      <Edit3 className="w-3 h-3" />
                      Title
                    </label>
                    <input
                      type="text"
                      value={currentContent.title}
                      onChange={(e) =>
                        setEditedContent({
                          ...editedContent,
                          [activePlatform]: { ...currentContent, title: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-surface-300 border border-surface-400 text-sm text-white focus:outline-none focus:border-brand-500/50"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                      <Edit3 className="w-3 h-3" />
                      Description
                    </label>
                    <textarea
                      value={currentContent.description}
                      onChange={(e) =>
                        setEditedContent({
                          ...editedContent,
                          [activePlatform]: { ...currentContent, description: e.target.value },
                        })
                      }
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg bg-surface-300 border border-surface-400 text-sm text-white focus:outline-none focus:border-brand-500/50 resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                      <Tag className="w-3 h-3" />
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {currentContent.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-surface-300 border border-surface-400 text-xs text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                      <Hash className="w-3 h-3" />
                      Hashtags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {currentContent.hashtags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-brand-600/20 border border-brand-500/30 text-xs text-brand-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-200 hover:bg-surface-300 text-gray-300 text-sm font-medium transition-colors border border-surface-300/50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Title */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                      Title
                    </label>
                    <p className="text-sm font-medium">{currentContent.title}</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                      Description
                    </label>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{currentContent.description}</p>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {currentContent.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-surface-300 border border-surface-400 text-xs text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                      Hashtags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {currentContent.hashtags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-brand-600/20 border border-brand-500/30 text-xs text-brand-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-200 hover:bg-surface-300 text-gray-300 text-sm font-medium transition-colors border border-surface-300/50"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Content
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Actions */}
        <div className="space-y-4">
          {/* Review Actions */}
          <div className="rounded-2xl glass p-4">
            <h3 className="font-semibold mb-3">Review Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-colors">
                <Check className="w-4 h-4" />
                Approve Highlight
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium text-sm transition-colors border border-red-500/20">
                <X className="w-4 h-4" />
                Reject Highlight
              </button>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-400 mb-1.5 block">Review Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes for this review..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-surface-300 border border-surface-400 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500/50 resize-none"
              />
            </div>
          </div>

          {/* Quick Info */}
          <div className="rounded-2xl glass p-4">
            <h3 className="font-semibold mb-3">Highlight Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Highlight ID</span>
                <span className="text-sm font-mono text-gray-300">{mockHighlight.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Clip Type</span>
                <span className="text-sm text-gray-300 capitalize">{mockHighlight.clipType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Platform</span>
                <div className="flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-accent-twitch" />
                  <span className="text-sm text-gray-300 capitalize">Twitch</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Stream</span>
                <Link
                  href={`/dashboard/streams`}
                  className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  View Stream
                </Link>
              </div>
            </div>
          </div>

          {/* Platform Previews */}
          <div className="rounded-2xl glass p-4">
            <h3 className="font-semibold mb-3">Platform Previews</h3>
            <div className="space-y-2">
              {platforms.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setActivePlatform(p.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    activePlatform === p.key
                      ? `${p.bgColor} border ${p.borderColor}`
                      : 'bg-surface-200 hover:bg-surface-300 border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${p.bgColor} flex items-center justify-center`}>
                    <Play className={`w-4 h-4 ${p.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-sm font-medium ${activePlatform === p.key ? p.color : 'text-gray-300'}`}>
                      {p.label}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {editedContent[p.key].title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
