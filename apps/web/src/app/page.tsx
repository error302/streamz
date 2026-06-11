'use client';

import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gradient">StreamZ</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
              <a href="#platforms" className="hover:text-white transition-colors">Platforms</a>
              {isLoaded && isSignedIn ? (
                <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors">
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <button className="px-4 py-2 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-medium transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors">
                      Get Started
                    </button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-[#0f0f13] to-[#0f0f13]" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Now in Development — Phase 5
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Automate Your <span className="text-gradient">Gaming Content</span><br />Pipeline
          </h1>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            StreamZ captures your streams, detects highlight moments using chat &amp; audio analysis,
            generates AI-optimized content for every platform, and publishes on schedule — all on autopilot.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoaded && isSignedIn ? (
              <Link href="/dashboard" className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold text-lg transition-all glow-brand">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold text-lg transition-all glow-brand">
                    Start Automating
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="px-8 py-3 rounded-xl glass text-gray-300 hover:text-white font-semibold text-lg transition-all">
                    Sign In
                  </button>
                </SignInButton>
              </>
            )}
          </div>
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
            <div><div className="text-2xl sm:text-3xl font-bold text-orange-400">5</div><div className="text-xs sm:text-sm text-gray-500">Platforms</div></div>
            <div><div className="text-2xl sm:text-3xl font-bold text-orange-400">AI</div><div className="text-xs sm:text-sm text-gray-500">Powered</div></div>
            <div><div className="text-2xl sm:text-3xl font-bold text-orange-400">24/7</div><div className="text-xs sm:text-sm text-gray-500">Automated</div></div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for <span className="text-gradient">Gaming Creators</span></h2>
            <p className="text-gray-400 max-w-xl mx-auto">From stream detection to multi-platform publishing — every step is automated.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Stream Capture', desc: 'Auto-detect live streams on Twitch & YouTube. Capture VOD and IRC chat in real-time.' },
              { title: 'Highlight Detection', desc: 'Chat spike analysis + audio energy scoring detects the best moments automatically.' },
              { title: 'AI Content Generation', desc: 'Platform-specific titles, descriptions, tags, and hashtags generated by Claude AI.' },
              { title: 'Smart Clip Extraction', desc: 'FFmpeg-powered clip extraction with platform-specific formatting and duration limits.' },
              { title: 'Multi-Platform Publishing', desc: 'Schedule and publish to YouTube, Instagram, and TikTok from a single dashboard.' },
              { title: 'Analytics Dashboard', desc: 'Track views, engagement, and retention across all published content in one place.' },
            ].map((f) => (
              <div key={f.title} className="group p-6 rounded-2xl glass hover:border-orange-500/30 transition-all">
                <h3 className="text-lg font-semibold mb-2 group-hover:text-orange-400 transition-colors">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="platforms" className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-12">Publish <span className="text-gradient">Everywhere</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'YouTube VOD', color: 'border-red-500/30' },
              { name: 'YouTube Shorts', color: 'border-red-500/30' },
              { name: 'Instagram Reels', color: 'border-purple-500/30' },
              { name: 'IG Stories', color: 'border-purple-500/30' },
              { name: 'TikTok', color: 'border-cyan-500/30' },
            ].map((p) => (
              <div key={p.name} className={`p-4 rounded-xl glass ${p.color} hover:bg-white/5 transition-all text-center`}>
                <div className="text-sm font-medium">{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-white/10 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-purple-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gradient">StreamZ</span>
          </div>
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} StreamZ. Built for gaming content creators.</p>
        </div>
      </footer>
    </div>
  );
}
