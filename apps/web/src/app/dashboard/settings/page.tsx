'use client';

import { Card, Button } from '@/components/ui';
import { Settings, Youtube, Instagram, Music } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';

export default function SettingsPage() {
  const { user } = useUser();
  const [connecting, setConnecting] = useState<string | null>(null);

  const accounts = [
    { platform: 'YouTube', icon: Youtube, color: 'text-red-500', bgColor: 'bg-red-500/10', connected: false, href: '/api/auth/youtube' },
    { platform: 'Instagram', icon: Instagram, color: 'text-purple-500', bgColor: 'bg-purple-500/10', connected: false, href: '/api/auth/instagram' },
    { platform: 'TikTok', icon: Music, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', connected: false, href: '/api/auth/tiktok' },
  ];

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-white">Settings</h2><p className="text-slate-400 mt-1">Manage your account and connected platforms</p></div>
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold">
            {(user?.firstName || 'U')[0]}
          </div>
          <div>
            <p className="text-white font-medium">{user?.fullName || user?.username || 'User'}</p>
            <p className="text-sm text-slate-400">{user?.emailAddresses[0]?.emailAddress || ''}</p>
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Connected Accounts</h3>
        <div className="space-y-4">
          {accounts.map((account) => (
            <div key={account.platform} className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${account.bgColor}`}><account.icon className={`w-5 h-5 ${account.color}`} /></div>
                <div><p className="text-sm font-medium text-white">{account.platform}</p><p className="text-xs text-slate-500">{account.connected ? 'Connected' : 'Not connected'}</p></div>
              </div>
              {account.connected ? (
                <Button variant="ghost" size="sm">Disconnect</Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => { setConnecting(account.platform); window.location.href = account.href; }} disabled={connecting === account.platform}>
                  {connecting === account.platform ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { label: 'Highlights Ready', desc: 'When highlight clips are extracted', enabled: true },
            { label: 'Content Review', desc: 'When AI content needs review', enabled: true },
            { label: 'Publish Success', desc: 'When content is published', enabled: true },
            { label: 'Publish Failed', desc: 'When publishing fails', enabled: true },
            { label: 'Stream Captured', desc: 'When a VOD is captured', enabled: false },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between py-2">
              <div><p className="text-sm font-medium text-slate-200">{pref.label}</p><p className="text-xs text-slate-500">{pref.desc}</p></div>
              <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pref.enabled ? 'bg-orange-500' : 'bg-slate-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pref.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
