'use client';

import React, { useState } from 'react';
import {
  Settings,
  Youtube,
  Instagram,
  Music,
  Bell,
  Calendar,
  Sparkles,
  Download,
  AlertTriangle,
  Trash2,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/components/ui';

// ---- Toggle Component ----

function Toggle({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <p className="text-sm font-medium text-slate-200">{label}</p>}
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
          enabled ? 'bg-orange-500' : 'bg-slate-600'
        )}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            enabled ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

// ---- Section Component ----

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  variant = 'default',
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-6',
        variant === 'danger'
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-slate-800/50 border-slate-700/50'
      )}
    >
      <div className="flex items-center gap-3 mb-1">
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            variant === 'danger' ? 'bg-red-500/20' : 'bg-slate-700/50'
          )}
        >
          <Icon className={cn('w-4 h-4', variant === 'danger' ? 'text-red-400' : 'text-slate-400')} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-0 divide-y divide-slate-700/30">{children}</div>
    </div>
  );
}

// ---- Component ----

export default function SettingsPage() {
  const { user } = useUser();
  const [connecting, setConnecting] = useState<string | null>(null);

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    highlightsReady: true,
    contentReview: true,
    publishSuccess: true,
    publishFailed: true,
    streamCaptured: false,
    systemAlerts: true,
    weeklyReport: true,
  });

  // Scheduling preferences
  const [schedPrefs, setSchedPrefs] = useState({
    youtubeDefaultTime: '18:00',
    instagramDefaultTime: '12:00',
    tiktokDefaultTime: '19:00',
    autoSchedule: false,
    bufferMinutes: '30',
  });

  // AI preferences
  const [aiPrefs, setAiPrefs] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');

  // Connected accounts
  const accounts = [
    { platform: 'YouTube', icon: Youtube, color: 'text-red-500', bgColor: 'bg-red-500/10', connected: false, href: '/api/auth/youtube' },
    { platform: 'Instagram', icon: Instagram, color: 'text-pink-500', bgColor: 'bg-pink-500/10', connected: false, href: '/api/auth/instagram' },
    { platform: 'TikTok', icon: Music, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', connected: false, href: '/api/auth/tiktok' },
  ];

  // Danger zone
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-orange-400" />
          Settings
        </h2>
        <p className="text-slate-400 mt-1">Manage your account and connected platforms</p>
      </div>

      {/* Account */}
      <SettingsSection icon={Settings} title="Account" description="Your profile information">
        <div className="flex items-center gap-4 py-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {(user?.firstName || 'U')[0]}
          </div>
          <div>
            <p className="text-white font-medium">{user?.fullName || user?.username || 'User'}</p>
            <p className="text-sm text-slate-400">{user?.emailAddresses[0]?.emailAddress || ''}</p>
          </div>
        </div>
      </SettingsSection>

      {/* Connected Accounts */}
      <SettingsSection icon={Youtube} title="Connected Accounts" description="Link your social media platforms">
        <div className="space-y-0 divide-y divide-slate-700/30">
          {accounts.map((account) => (
            <div key={account.platform} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', account.bgColor)}>
                  <account.icon className={cn('w-5 h-5', account.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{account.platform}</p>
                  <p className="text-xs text-slate-500">{account.connected ? 'Connected' : 'Not connected'}</p>
                </div>
              </div>
              {account.connected ? (
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
                  Disconnect
                </button>
              ) : (
                <button
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                  onClick={() => { setConnecting(account.platform); window.location.href = account.href; }}
                  disabled={connecting === account.platform}
                >
                  {connecting === account.platform ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Notification Preferences */}
      <SettingsSection icon={Bell} title="Notification Preferences" description="Choose what notifications you want to receive">
        <Toggle
          label="Highlights Ready"
          description="When highlight clips are extracted from streams"
          enabled={notifPrefs.highlightsReady}
          onChange={(v) => setNotifPrefs({ ...notifPrefs, highlightsReady: v })}
        />
        <Toggle
          label="Content Review"
          description="When AI-generated content needs your review"
          enabled={notifPrefs.contentReview}
          onChange={(v) => setNotifPrefs({ ...notifPrefs, contentReview: v })}
        />
        <Toggle
          label="Publish Success"
          description="When content is successfully published"
          enabled={notifPrefs.publishSuccess}
          onChange={(v) => setNotifPrefs({ ...notifPrefs, publishSuccess: v })}
        />
        <Toggle
          label="Publish Failed"
          description="When a publishing attempt fails"
          enabled={notifPrefs.publishFailed}
          onChange={(v) => setNotifPrefs({ ...notifPrefs, publishFailed: v })}
        />
        <Toggle
          label="Stream Captured"
          description="When a VOD is captured from a live stream"
          enabled={notifPrefs.streamCaptured}
          onChange={(v) => setNotifPrefs({ ...notifPrefs, streamCaptured: v })}
        />
        <Toggle
          label="System Alerts"
          description="Worker errors and infrastructure warnings"
          enabled={notifPrefs.systemAlerts}
          onChange={(v) => setNotifPrefs({ ...notifPrefs, systemAlerts: v })}
        />
        <Toggle
          label="Weekly Report"
          description="Get a weekly summary of your performance"
          enabled={notifPrefs.weeklyReport}
          onChange={(v) => setNotifPrefs({ ...notifPrefs, weeklyReport: v })}
        />
      </SettingsSection>

      {/* Scheduling Preferences */}
      <SettingsSection icon={Calendar} title="Default Scheduling" description="Set default publish times for each platform">
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">YouTube Default Time</label>
              <input
                type="time"
                value={schedPrefs.youtubeDefaultTime}
                onChange={(e) => setSchedPrefs({ ...schedPrefs, youtubeDefaultTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Instagram Default Time</label>
              <input
                type="time"
                value={schedPrefs.instagramDefaultTime}
                onChange={(e) => setSchedPrefs({ ...schedPrefs, instagramDefaultTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">TikTok Default Time</label>
              <input
                type="time"
                value={schedPrefs.tiktokDefaultTime}
                onChange={(e) => setSchedPrefs({ ...schedPrefs, tiktokDefaultTime: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
              />
            </div>
          </div>
          <Toggle
            label="Auto-schedule approved content"
            description="Automatically schedule content using default times when approved"
            enabled={schedPrefs.autoSchedule}
            onChange={(v) => setSchedPrefs({ ...schedPrefs, autoSchedule: v })}
          />
          <div>
            <label className="block text-xs text-slate-500 mb-1.5">Buffer between posts (minutes)</label>
            <select
              value={schedPrefs.bufferMinutes}
              onChange={(e) => setSchedPrefs({ ...schedPrefs, bufferMinutes: e.target.value })}
              className="w-full sm:w-40 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      {/* AI Prompt Preferences */}
      <SettingsSection icon={Sparkles} title="AI Prompt Preferences" description="Control how AI generates your content">
        <div className="py-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-2">Generation Style</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'conservative' as const,
                  label: 'Conservative',
                  desc: 'Minimal changes, close to original content',
                  icon: Shield,
                },
                {
                  id: 'balanced' as const,
                  label: 'Balanced',
                  desc: 'Optimized for engagement while staying authentic',
                  icon: ShieldAlert,
                },
                {
                  id: 'aggressive' as const,
                  label: 'Aggressive',
                  desc: 'Maximum engagement hooks and click-worthy titles',
                  icon: Sparkles,
                },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setAiPrefs(style.id)}
                  className={cn(
                    'p-4 rounded-lg border text-left transition-all',
                    aiPrefs === style.id
                      ? 'bg-orange-500/10 border-orange-500/30 ring-1 ring-orange-500/20'
                      : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <style.icon className={cn('w-4 h-4', aiPrefs === style.id ? 'text-orange-400' : 'text-slate-400')} />
                    <span className={cn('text-sm font-medium', aiPrefs === style.id ? 'text-orange-300' : 'text-slate-300')}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Data Export */}
      <SettingsSection icon={Download} title="Data Export" description="Download your data at any time">
        <div className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Export All Data</p>
            <p className="text-xs text-slate-500">Download all your streams, highlights, content, and analytics data as JSON</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection icon={AlertTriangle} title="Danger Zone" description="Irreversible actions" variant="danger">
        <div className="py-4 space-y-4">
          {/* Disconnect Platform */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Disconnect Platform</p>
              <p className="text-xs text-slate-500">Remove a connected platform and stop publishing</p>
            </div>
            {confirmDisconnect ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDisconnect(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setConfirmDisconnect(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDisconnect('youtube')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-300">Delete Account</p>
              <p className="text-xs text-slate-500">Permanently delete your account and all associated data</p>
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete Forever
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 transition-colors"
              >
                Delete Account
              </button>
            )}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
