'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  HardDrive,
  Database,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/components/ui';

// ---- Types ----

type WorkerStatus = 'running' | 'stopped' | 'error';

interface WorkerInfo {
  name: string;
  displayName: string;
  status: WorkerStatus;
  jobsProcessed: number;
  jobsFailed: number;
  avgProcessingTime: string;
  lastHeartbeat: string;
  icon: React.ElementType;
  description: string;
}

interface QueueInfo {
  name: string;
  pending: number;
  active: number;
  completed: number;
  failed: number;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  worker: string;
  message: string;
  severity: 'error' | 'warning';
}

// ---- Mock Data ----

const mockWorkers: WorkerInfo[] = [
  {
    name: 'capture',
    displayName: 'Capture Worker',
    status: 'running',
    jobsProcessed: 1247,
    jobsFailed: 23,
    avgProcessingTime: '4m 32s',
    lastHeartbeat: '12 seconds ago',
    icon: Server,
    description: 'Captures VODs from Twitch and YouTube streams',
  },
  {
    name: 'highlight',
    displayName: 'Highlight Worker',
    status: 'running',
    jobsProcessed: 3891,
    jobsFailed: 87,
    avgProcessingTime: '2m 15s',
    lastHeartbeat: '8 seconds ago',
    icon: Zap,
    description: 'Detects highlights using chat activity and audio analysis',
  },
  {
    name: 'optimizer',
    displayName: 'AI Optimizer Worker',
    status: 'running',
    jobsProcessed: 2156,
    jobsFailed: 45,
    avgProcessingTime: '15s',
    lastHeartbeat: '5 seconds ago',
    icon: Cpu,
    description: 'Generates optimized metadata using OpenRouter AI',
  },
  {
    name: 'publisher',
    displayName: 'Publisher Worker',
    status: 'running',
    jobsProcessed: 982,
    jobsFailed: 34,
    avgProcessingTime: '45s',
    lastHeartbeat: '3 seconds ago',
    icon: Activity,
    description: 'Publishes content to YouTube, Instagram, and TikTok',
  },
  {
    name: 'analytics',
    displayName: 'Analytics Worker',
    status: 'stopped',
    jobsProcessed: 456,
    jobsFailed: 12,
    avgProcessingTime: '1m 8s',
    lastHeartbeat: '2 hours ago',
    icon: BarChart3,
    description: 'Collects and aggregates performance analytics',
  },
];

const mockQueues: QueueInfo[] = [
  { name: 'capture', pending: 3, active: 1, completed: 1247, failed: 23 },
  { name: 'highlight', pending: 7, active: 2, completed: 3891, failed: 87 },
  { name: 'optimizer', pending: 12, active: 1, completed: 2156, failed: 45 },
  { name: 'publisher', pending: 5, active: 1, completed: 982, failed: 34 },
  { name: 'analytics', pending: 0, active: 0, completed: 456, failed: 12 },
];

const mockErrors: ErrorLog[] = [
  { id: 'e1', timestamp: '2 minutes ago', worker: 'publisher', message: 'Instagram API rate limit exceeded. Retry in 3600s.', severity: 'error' },
  { id: 'e2', timestamp: '15 minutes ago', worker: 'highlight', message: 'Audio analysis failed for stream VOD-1234: file corrupted', severity: 'error' },
  { id: 'e3', timestamp: '23 minutes ago', worker: 'capture', message: 'Twitch webhook delivery delayed by 45s', severity: 'warning' },
  { id: 'e4', timestamp: '1 hour ago', worker: 'optimizer', message: 'OpenRouter API timeout after 30s — retrying', severity: 'warning' },
  { id: 'e5', timestamp: '1 hour ago', worker: 'publisher', message: 'YouTube upload failed: video exceeds duration limit for Shorts', severity: 'error' },
  { id: 'e6', timestamp: '2 hours ago', worker: 'analytics', message: 'Worker stopped: no active platform connections', severity: 'error' },
  { id: 'e7', timestamp: '3 hours ago', worker: 'capture', message: 'YouTube VOD not available: stream was deleted by creator', severity: 'warning' },
  { id: 'e8', timestamp: '4 hours ago', worker: 'highlight', message: 'Chat analysis returned empty result for stream VOD-9876', severity: 'warning' },
  { id: 'e9', timestamp: '5 hours ago', worker: 'optimizer', message: 'OpenRouter API returned 429 — rate limit hit', severity: 'error' },
  { id: 'e10', timestamp: '6 hours ago', worker: 'publisher', message: 'TikTok API authentication expired. Please reconnect.', severity: 'error' },
  { id: 'e11', timestamp: '7 hours ago', worker: 'highlight', message: 'FFmpeg process killed: out of memory', severity: 'error' },
  { id: 'e12', timestamp: '8 hours ago', worker: 'capture', message: 'Twitch webhook secret validation failed', severity: 'warning' },
  { id: 'e13', timestamp: '10 hours ago', worker: 'optimizer', message: 'AI response contained invalid JSON — falling back to defaults', severity: 'warning' },
  { id: 'e14', timestamp: '12 hours ago', worker: 'publisher', message: 'Instagram Reels upload: video format not supported (codec H.265)', severity: 'error' },
  { id: 'e15', timestamp: '14 hours ago', worker: 'analytics', message: 'Database query timeout: analytics aggregation taking too long', severity: 'warning' },
  { id: 'e16', timestamp: '16 hours ago', worker: 'capture', message: 'YouTube API quota nearly exhausted (95% used)', severity: 'warning' },
  { id: 'e17', timestamp: '18 hours ago', worker: 'highlight', message: 'Sentiment analysis model returned unexpected score: -999', severity: 'error' },
  { id: 'e18', timestamp: '20 hours ago', worker: 'publisher', message: 'YouTube Shorts: video vertical aspect ratio required (9:16)', severity: 'warning' },
  { id: 'e19', timestamp: '22 hours ago', worker: 'optimizer', message: 'Prompt template rendering failed: missing variable {{stream_title}}', severity: 'error' },
  { id: 'e20', timestamp: '1 day ago', worker: 'capture', message: 'Twitch stream ended before minimum capture duration (5m)', severity: 'warning' },
];

// ---- Helpers ----

function getStatusConfig(status: WorkerStatus) {
  switch (status) {
    case 'running':
      return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle2, label: 'Running' };
    case 'stopped':
      return { color: 'text-slate-400', bg: 'bg-slate-500/20', icon: XCircle, label: 'Stopped' };
    case 'error':
      return { color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle, label: 'Error' };
  }
}

// ---- Component ----

export default function MonitoringPage() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  // Auto refresh counter
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const toggleErrorExpand = (id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalJobsProcessed = mockWorkers.reduce((sum, w) => sum + w.jobsProcessed, 0);
  const totalJobsFailed = mockWorkers.reduce((sum, w) => sum + w.jobsFailed, 0);
  const runningWorkers = mockWorkers.filter((w) => w.status === 'running').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-orange-400" />
            System Monitoring
          </h2>
          <p className="text-slate-400 mt-1">Worker health, queue status, and error tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {autoRefresh ? 'Auto-refresh 30s' : 'Paused'}
          </div>
          <button
            onClick={() => { setAutoRefresh(!autoRefresh); setLastRefresh(new Date()); }}
            className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            aria-label="Toggle auto-refresh"
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          </button>
          <span className="text-xs text-slate-500">
            Last: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-2xl font-bold text-emerald-400">{runningWorkers}/{mockWorkers.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Workers Running</div>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-400">{totalJobsProcessed.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Jobs Processed</div>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="text-2xl font-bold text-red-400">{totalJobsFailed.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Failed Jobs</div>
        </div>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="text-2xl font-bold text-amber-400">{((totalJobsFailed / totalJobsProcessed) * 100).toFixed(1)}%</div>
          <div className="text-xs text-slate-500 mt-0.5">Error Rate</div>
        </div>
      </div>

      {/* Worker Status Cards */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Worker Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockWorkers.map((worker) => {
            const statusConfig = getStatusConfig(worker.status);
            const StatusIcon = statusConfig.icon;
            const WorkerIcon = worker.icon;
            const isExpanded = expandedWorker === worker.name;

            return (
              <div
                key={worker.name}
                className={`rounded-xl border transition-all ${
                  worker.status === 'running'
                    ? 'border-slate-700/50 bg-slate-800/50'
                    : worker.status === 'error'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-slate-700/30 bg-slate-800/30'
                }`}
              >
                {/* Worker Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusConfig.bg}`}>
                        <WorkerIcon className={`w-5 h-5 ${statusConfig.color}`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{worker.displayName}</h4>
                        <p className="text-xs text-slate-500">{worker.description}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </div>
                  </div>

                  {/* Worker Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded-lg bg-slate-900/50">
                      <p className="text-xs text-slate-500">Processed</p>
                      <p className="text-sm font-bold text-white">{worker.jobsProcessed.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/50">
                      <p className="text-xs text-slate-500">Failed</p>
                      <p className="text-sm font-bold text-red-400">{worker.jobsFailed}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/50">
                      <p className="text-xs text-slate-500">Avg Time</p>
                      <p className="text-sm font-bold text-white">{worker.avgProcessingTime}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/50">
                      <p className="text-xs text-slate-500">Heartbeat</p>
                      <p className="text-sm font-bold text-white">{worker.lastHeartbeat}</p>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedWorker(isExpanded ? null : worker.name)}
                    className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExpanded ? 'Less' : 'More details'}
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-700/50 pt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Success Rate</span>
                      <span className="text-white font-medium">
                        {((worker.jobsProcessed / (worker.jobsProcessed + worker.jobsFailed)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(worker.jobsProcessed / (worker.jobsProcessed + worker.jobsFailed)) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Uptime (24h)</span>
                      <span className="text-white font-medium">{worker.status === 'running' ? '99.8%' : '0%'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Memory Usage</span>
                      <span className="text-white font-medium">{worker.status === 'running' ? `${Math.floor(Math.random() * 30 + 40)}%` : '0%'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Infrastructure Status */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Infrastructure</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Redis */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-medium text-white">Redis</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">Connected</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Queue Depth</span>
                <span className="text-white">{mockQueues.reduce((s, q) => s + q.pending + q.active, 0)} jobs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Memory</span>
                <span className="text-white">128 MB / 512 MB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Uptime</span>
                <span className="text-white">14d 7h 23m</span>
              </div>
            </div>
          </div>

          {/* Database */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-medium text-white">PostgreSQL</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">Connected</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Connections</span>
                <span className="text-white">12 / 100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Size</span>
                <span className="text-white">2.4 GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Uptime</span>
                <span className="text-white">30d 12h 45m</span>
              </div>
            </div>
          </div>

          {/* R2 Storage */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-medium text-white">R2 Storage</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">78% Used</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Used</span>
                <span className="text-white">7.8 GB / 10 GB</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '78%' }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">VODs Stored</span>
                <span className="text-white">42 files</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Depths */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Queue Depths</h3>
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-left">
                  <th scope="col" className="px-4 py-3 font-medium">Queue</th>
                  <th scope="col" className="px-4 py-3 font-medium">Pending</th>
                  <th scope="col" className="px-4 py-3 font-medium">Active</th>
                  <th scope="col" className="px-4 py-3 font-medium">Completed</th>
                  <th scope="col" className="px-4 py-3 font-medium">Failed</th>
                </tr>
              </thead>
              <tbody>
                {mockQueues.map((queue) => (
                  <tr key={queue.name} className="border-t border-slate-700/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-white font-medium capitalize">{queue.name}</td>
                    <td className="px-4 py-3">
                      {queue.pending > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">{queue.pending}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {queue.active > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">{queue.active}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-emerald-400">{queue.completed.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {queue.failed > 0 ? (
                        <span className="text-red-400">{queue.failed}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Error Log */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Error Log (Last 20)</h3>
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
          <div className="max-h-96 overflow-y-auto scrollbar-thin divide-y divide-slate-700/50">
            {mockErrors.map((error) => {
              const isExpanded = expandedErrors.has(error.id);
              return (
                <div key={error.id}>
                  <button
                    onClick={() => toggleErrorExpand(error.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-700/20 transition-colors flex items-start gap-3"
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      error.severity === 'error' ? 'bg-red-500/20' : 'bg-amber-500/20'
                    }`}>
                      {error.severity === 'error' ? (
                        <XCircle className="w-3 h-3 text-red-400" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-500">{error.worker}</span>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="text-xs text-slate-500">{error.timestamp}</span>
                      </div>
                      <p className="text-sm text-slate-200 truncate">{error.message}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 pl-12">
                      <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                        <p className="text-xs text-slate-400 font-mono whitespace-pre-wrap">{error.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span>Worker: {error.worker}</span>
                          <span>Severity: {error.severity}</span>
                          <span>Time: {error.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
