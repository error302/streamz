'use client';

import React, { useState, useCallback } from 'react';
import {
  Bell,
  Radio,
  Sparkles,
  Check,
  Send,
  AlertCircle,
  AlertTriangle,
  X,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/components/ui';

// ---- Types ----

type NotificationType =
  | 'stream_captured'
  | 'highlights_ready'
  | 'content_approved'
  | 'publish_succeeded'
  | 'publish_failed'
  | 'system_alert';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

// ---- Mock Data ----

const mockNotifications: Notification[] = [
  {
    id: 'n-1',
    type: 'stream_captured',
    title: 'Stream Captured',
    description: 'Ranked Valorant — Pushing to Immortal (2h 34m) has been captured and is ready for processing.',
    timestamp: '5 minutes ago',
    read: false,
  },
  {
    id: 'n-2',
    type: 'highlights_ready',
    title: 'Highlights Ready',
    description: '3 highlights found from "Apex Legends — Predator Ranked Grind". Ready for review.',
    timestamp: '23 minutes ago',
    read: false,
  },
  {
    id: 'n-3',
    type: 'content_approved',
    title: 'Content Approved',
    description: '"INSANE 1v5 Clutch on Ascent 🔥 #shorts" has been approved and queued for scheduling.',
    timestamp: '1 hour ago',
    read: false,
  },
  {
    id: 'n-4',
    type: 'publish_succeeded',
    title: 'Publish Succeeded',
    description: '"47 Tries Later... FINALLY! Elden Ring Boss Fight 🎮" was published to YouTube Shorts.',
    timestamp: '2 hours ago',
    read: true,
  },
  {
    id: 'n-5',
    type: 'publish_failed',
    title: 'Publish Failed',
    description: '"Operator Ace — No Scope No Problem 🎯" failed to publish to Instagram Reels. Rate limit exceeded.',
    timestamp: '3 hours ago',
    read: false,
  },
  {
    id: 'n-6',
    type: 'system_alert',
    title: 'Worker Restarted',
    description: 'The highlight worker was restarted after an unexpected error. All jobs are being retried.',
    timestamp: '4 hours ago',
    read: true,
  },
  {
    id: 'n-7',
    type: 'stream_captured',
    title: 'Stream Captured',
    description: 'Elden Ring DLC First Playthrough (4h 12m) has been captured successfully.',
    timestamp: '5 hours ago',
    read: true,
  },
  {
    id: 'n-8',
    type: 'highlights_ready',
    title: 'Highlights Ready',
    description: '2 highlights found from "League of Legends — Clash Tournament". Ready for review.',
    timestamp: '6 hours ago',
    read: true,
  },
  {
    id: 'n-9',
    type: 'publish_succeeded',
    title: 'Publish Succeeded',
    description: '"Baron Steal That Won the Game! 🏆" was published to YouTube Shorts.',
    timestamp: '1 day ago',
    read: true,
  },
  {
    id: 'n-10',
    type: 'system_alert',
    title: 'Storage Warning',
    description: 'R2 storage usage is at 78%. Consider cleaning up old VODs to free space.',
    timestamp: '1 day ago',
    read: true,
  },
];

// ---- Helpers ----

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'stream_captured':
      return Radio;
    case 'highlights_ready':
      return Sparkles;
    case 'content_approved':
      return Check;
    case 'publish_succeeded':
      return Send;
    case 'publish_failed':
      return AlertCircle;
    case 'system_alert':
      return AlertTriangle;
  }
}

function getNotificationIconColor(type: NotificationType): string {
  switch (type) {
    case 'stream_captured':
      return 'bg-purple-500/20 text-purple-400';
    case 'highlights_ready':
      return 'bg-orange-500/20 text-orange-400';
    case 'content_approved':
      return 'bg-green-500/20 text-green-400';
    case 'publish_succeeded':
      return 'bg-emerald-500/20 text-emerald-400';
    case 'publish_failed':
      return 'bg-red-500/20 text-red-400';
    case 'system_alert':
      return 'bg-amber-500/20 text-amber-400';
  }
}

function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'stream_captured': return 'Stream';
    case 'highlights_ready': return 'Highlights';
    case 'content_approved': return 'Content';
    case 'publish_succeeded': return 'Publish';
    case 'publish_failed': return 'Failed';
    case 'system_alert': return 'System';
  }
}

const allTypes: NotificationType[] = [
  'stream_captured',
  'highlights_ready',
  'content_approved',
  'publish_succeeded',
  'publish_failed',
  'system_alert',
];

// ---- Component ----

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter(
    (n) => filterType === 'all' || n.type === filterType
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-orange-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setIsOpen(false); setShowFilterMenu(false); }}
            aria-hidden="true"
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-96 max-h-[32rem] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                    aria-label="Filter notifications"
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                  {showFilterMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10 py-1">
                      <button
                        onClick={() => { setFilterType('all'); setShowFilterMenu(false); }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors',
                          filterType === 'all' ? 'text-orange-400' : 'text-slate-300'
                        )}
                      >
                        All notifications
                      </button>
                      {allTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => { setFilterType(type); setShowFilterMenu(false); }}
                          className={cn(
                            'w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors',
                            filterType === type ? 'text-orange-400' : 'text-slate-300'
                          )}
                        >
                          {getNotificationTypeLabel(type)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No notifications</p>
                  {filterType !== 'all' && (
                    <button
                      onClick={() => setFilterType('all')}
                      className="text-xs text-orange-400 hover:text-orange-300 mt-1 transition-colors"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {filteredNotifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <button
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={cn(
                          'w-full text-left p-3 hover:bg-slate-800/50 transition-colors',
                          !notification.read && 'bg-slate-800/30'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                            getNotificationIconColor(notification.type)
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                'text-sm font-medium truncate',
                                notification.read ? 'text-slate-300' : 'text-white'
                              )}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{notification.description}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{notification.timestamp}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-700 flex-shrink-0">
              <p className="text-[10px] text-slate-500 text-center">
                Press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-600 text-[9px] font-mono">?</kbd> for keyboard shortcuts
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
