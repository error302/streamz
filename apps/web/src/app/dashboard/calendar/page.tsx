'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  GripVertical,
  Clock,
  X,
} from 'lucide-react';

// ---- Types ----

type Platform = 'youtube_shorts' | 'instagram_reels' | 'tiktok';

interface ScheduledPost {
  id: string;
  title: string;
  platform: Platform;
  scheduledDate: Date;
  scheduledTime: string;
  status: 'scheduled' | 'publishing' | 'published' | 'failed';
}

// ---- Mock Data ----

const today = new Date();

function makeDate(dayOffset: number): Date {
  const d = new Date(today);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

const mockScheduledPosts: ScheduledPost[] = [
  { id: 'sp-1', title: 'INSANE 1v5 Clutch on Ascent 🔥 #shorts', platform: 'youtube_shorts', scheduledDate: makeDate(0), scheduledTime: '6:00 PM', status: 'scheduled' },
  { id: 'sp-2', title: '1v5 Clutch That Broke the Internet 🔥', platform: 'instagram_reels', scheduledDate: makeDate(0), scheduledTime: '8:30 PM', status: 'scheduled' },
  { id: 'sp-3', title: 'The 1v5 Clutch That Made Chat Lose It 🤯', platform: 'tiktok', scheduledDate: makeDate(1), scheduledTime: '12:00 PM', status: 'scheduled' },
  { id: 'sp-4', title: '47 Tries Later... FINALLY! Elden Ring Boss Fight', platform: 'youtube_shorts', scheduledDate: makeDate(2), scheduledTime: '3:00 PM', status: 'scheduled' },
  { id: 'sp-5', title: '20 Kill Game with Insane Movement 💀', platform: 'instagram_reels', scheduledDate: makeDate(3), scheduledTime: '7:00 PM', status: 'scheduled' },
  { id: 'sp-6', title: 'Baron Steal That Won the Game! 🏆', platform: 'youtube_shorts', scheduledDate: makeDate(5), scheduledTime: '5:00 PM', status: 'scheduled' },
  { id: 'sp-7', title: 'Operator Ace — No Scope No Problem 🎯', platform: 'tiktok', scheduledDate: makeDate(7), scheduledTime: '2:00 PM', status: 'scheduled' },
  { id: 'sp-8', title: 'Funniest League Moments This Week', platform: 'instagram_reels', scheduledDate: makeDate(-1), scheduledTime: '4:00 PM', status: 'published' },
  { id: 'sp-9', title: 'Pathfinder Movement Is ILLEGAL 🤯', platform: 'tiktok', scheduledDate: makeDate(-2), scheduledTime: '11:00 AM', status: 'published' },
  { id: 'sp-10', title: 'Best Valorant Aces Compilation', platform: 'youtube_shorts', scheduledDate: makeDate(10), scheduledTime: '6:00 PM', status: 'scheduled' },
];

// ---- Helpers ----

function getPlatformColor(platform: Platform): string {
  switch (platform) {
    case 'youtube_shorts': return 'bg-red-500';
    case 'instagram_reels': return 'bg-pink-500';
    case 'tiktok': return 'bg-cyan-400';
  }
}

function getPlatformDotBorder(platform: Platform): string {
  switch (platform) {
    case 'youtube_shorts': return 'border-red-500/50';
    case 'instagram_reels': return 'border-pink-500/50';
    case 'tiktok': return 'border-cyan-400/50';
  }
}

function getPlatformLabel(platform: Platform): string {
  switch (platform) {
    case 'youtube_shorts': return 'YouTube Shorts';
    case 'instagram_reels': return 'Instagram Reels';
    case 'tiktok': return 'TikTok';
  }
}

function getStatusBadge(status: string): string {
  switch (status) {
    case 'scheduled': return 'bg-blue-500/20 text-blue-400';
    case 'publishing': return 'bg-amber-500/20 text-amber-400';
    case 'published': return 'bg-green-500/20 text-green-400';
    case 'failed': return 'bg-red-500/20 text-red-400';
    default: return 'bg-slate-500/20 text-slate-400';
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ---- Component ----

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isMobileListView, setIsMobileListView] = useState(false);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

  const postsByDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    mockScheduledPosts.forEach((post) => {
      const key = `${post.scheduledDate.getFullYear()}-${post.scheduledDate.getMonth()}-${post.scheduledDate.getDate()}`;
      const existing = map.get(key) || [];
      existing.push(post);
      map.set(key, existing);
    });
    return map;
  }, []);

  const getPostsForDay = (day: number): ScheduledPost[] => {
    const key = `${currentYear}-${currentMonth}-${day}`;
    return postsByDay.get(key) || [];
  };

  const selectedDayPosts = selectedDate
    ? mockScheduledPosts.filter((p) => isSameDay(p.scheduledDate, selectedDate))
    : [];

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(today);
  };

  const isToday = (day: number) =>
    currentYear === today.getFullYear() && currentMonth === today.getMonth() && day === today.getDate();

  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  // Sort posts for list view by date
  const sortedPosts = useMemo(() => {
    return [...mockScheduledPosts].sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }, []);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-orange-400" />
            Calendar
          </h2>
          <p className="text-slate-400 mt-1">Schedule and manage your content publications</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile view toggle */}
          <button
            onClick={() => setIsMobileListView(!isMobileListView)}
            className="sm:hidden px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            {isMobileListView ? 'Calendar View' : 'List View'}
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-xs text-slate-400">YouTube</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
          <span className="text-xs text-slate-400">Instagram</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-xs text-slate-400">TikTok</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <GripVertical className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-500 italic">Drag to reschedule (coming soon)</span>
        </div>
      </div>

      {/* Mobile List View */}
      {isMobileListView && (
        <div className="sm:hidden space-y-3">
          {sortedPosts.map((post) => (
            <div
              key={post.id}
              className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50"
            >
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${getPlatformColor(post.platform)}`} />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-white truncate">{post.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">{getPlatformLabel(post.platform)}</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {post.scheduledTime}
                    </span>
                  </div>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(post.status)}`}>
                    {post.status}
                  </span>
                </div>
                <GripVertical className="w-4 h-4 text-slate-600 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid View */}
      {!isMobileListView && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            <button
              onClick={goToPrevMonth}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-white">
              {monthName} {currentYear}
            </h3>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week Day Headers */}
          <div className="grid grid-cols-7 border-b border-slate-700/50">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs text-slate-500 py-3 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before the 1st */}
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] p-2 border-b border-r border-slate-700/30 bg-slate-900/30" />
            ))}

            {/* Actual days */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayPosts = getPostsForDay(day);
              const isDayToday = isCurrentMonth && isToday(day);
              const isSelected = selectedDate && isCurrentMonth && selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
                  className={`min-h-[100px] p-2 border-b border-r border-slate-700/30 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-orange-500/10 ring-1 ring-orange-500/30'
                      : isDayToday
                      ? 'bg-slate-700/30'
                      : 'hover:bg-slate-700/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-medium ${
                        isDayToday
                          ? 'w-7 h-7 flex items-center justify-center rounded-full bg-orange-500 text-white'
                          : 'text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {dayPosts.length > 0 && (
                      <span className="text-xs text-slate-500">{dayPosts.length}</span>
                    )}
                  </div>

                  {/* Post indicators */}
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate ${getPlatformDotBorder(post.platform)} border bg-slate-800/60 group cursor-grab`}
                        title={`${post.title} — ${post.scheduledTime}`}
                      >
                        <GripVertical className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getPlatformColor(post.platform)}`} />
                        <span className="truncate text-slate-300">{post.scheduledTime}</span>
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <span className="text-xs text-slate-500 pl-1.5">+{dayPosts.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Fill remaining cells to complete the last row */}
            {Array.from({ length: (7 - (firstDayOfWeek + daysInMonth) % 7) % 7 }, (_, i) => (
              <div key={`empty-end-${i}`} className="min-h-[100px] p-2 border-b border-r border-slate-700/30 bg-slate-900/30" />
            ))}
          </div>
        </div>
      )}

      {/* Selected Day Detail Panel */}
      {selectedDate && (
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold text-white">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              aria-label="Close day detail"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDayPosts.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No posts scheduled for this day</p>
              <p className="text-slate-500 text-sm mt-1">Click a date with colored dots to see scheduled content</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {selectedDayPosts.map((post) => (
                <div key={post.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <GripVertical className="w-4 h-4 text-slate-600 cursor-grab" />
                    <span className={`w-3 h-3 rounded-full ${getPlatformColor(post.platform)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white">{post.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400">{getPlatformLabel(post.platform)}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {post.scheduledTime}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${getStatusBadge(post.status)}`}>
                    {post.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Posts Summary (always visible) */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white">Upcoming Schedule</h3>
        </div>
        <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto scrollbar-thin">
          {sortedPosts
            .filter((p) => p.scheduledDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
            .slice(0, 6)
            .map((post) => (
              <div key={post.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-700/20 transition-colors">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getPlatformColor(post.platform)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{post.title}</p>
                  <p className="text-xs text-slate-400">
                    {post.scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {post.scheduledTime}
                  </p>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">{getPlatformLabel(post.platform)}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
