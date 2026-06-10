export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ---- Navigation ---- */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-twitch flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gradient">StreamZ</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#platforms" className="hover:text-white transition-colors">
                Platforms
              </a>
              <a
                href="#get-started"
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ---- Hero Section ---- */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900/20 via-surface to-surface" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-accent-twitch/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-200 border border-surface-300/50 text-sm text-gray-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Now in Development — Phase 1
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Automate Your{' '}
            <span className="text-gradient">Gaming Content</span>
            <br />
            Pipeline
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            StreamZ captures your streams, detects highlight moments using chat &amp; audio
            analysis, generates AI-optimized content for every platform, and publishes on
            schedule — all on autopilot.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#get-started"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold text-lg transition-all glow-brand"
            >
              Start Automating
            </a>
            <a
              href="#how-it-works"
              className="px-8 py-3 rounded-xl glass text-gray-300 hover:text-white font-semibold text-lg transition-all"
            >
              See How It Works
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-brand-400">5</div>
              <div className="text-xs sm:text-sm text-gray-500">Platforms</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-brand-400">AI</div>
              <div className="text-xs sm:text-sm text-gray-500">Powered</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-brand-400">24/7</div>
              <div className="text-xs sm:text-sm text-gray-500">Automated</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Features Section ---- */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for <span className="text-gradient">Gaming Creators</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              From stream detection to multi-platform publishing — every step is automated.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '📡',
                title: 'Stream Capture',
                description:
                  'Auto-detect live streams on Twitch & YouTube. Capture VOD and IRC chat in real-time.',
              },
              {
                icon: '🔥',
                title: 'Highlight Detection',
                description:
                  'Chat spike analysis + audio energy scoring detects the best moments automatically.',
              },
              {
                icon: '🤖',
                title: 'AI Content Generation',
                description:
                  'Platform-specific titles, descriptions, tags, and hashtags generated by Claude AI.',
              },
              {
                icon: '🎬',
                title: 'Smart Clip Extraction',
                description:
                  'FFmpeg-powered clip extraction with platform-specific formatting and duration limits.',
              },
              {
                icon: '📤',
                title: 'Multi-Platform Publishing',
                description:
                  'Schedule and publish to YouTube, Instagram, and TikTok from a single dashboard.',
              },
              {
                icon: '📊',
                title: 'Analytics Dashboard',
                description:
                  'Track views, engagement, and retention across all published content in one place.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl glass hover:border-brand-500/30 transition-all hover:glow-brand"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-brand-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- How It Works ---- */}
      <section id="how-it-works" className="py-20 px-4 bg-surface-50/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How It <span className="text-gradient">Works</span>
            </h2>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Stream Goes Live',
                description:
                  'Twitch EventSub or YouTube push notifications trigger automatic VOD capture and IRC chat logging.',
              },
              {
                step: '02',
                title: 'Highlights Detected',
                description:
                  'BullMQ worker analyzes chat spikes and audio energy to score and extract the best moments from the stream.',
              },
              {
                step: '03',
                title: 'AI Generates Content',
                description:
                  'Claude AI creates platform-optimized titles, descriptions, tags, and hashtags for each highlight clip.',
              },
              {
                step: '04',
                title: 'Review & Publish',
                description:
                  'Review AI-generated content in the dashboard, approve or edit, then schedule or publish to all platforms.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-mono font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Platforms Section ---- */}
      <section id="platforms" className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Publish <span className="text-gradient">Everywhere</span>
          </h2>
          <p className="text-gray-400 mb-12">
            One content pipeline, five platforms. Each with platform-specific optimizations.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'YouTube VOD', color: 'bg-accent-youtube', icon: '📺' },
              { name: 'YouTube Shorts', color: 'bg-accent-youtube', icon: '📱' },
              { name: 'Instagram Reels', color: 'bg-accent-instagram', icon: '🎬' },
              { name: 'Instagram Stories', color: 'bg-accent-instagram', icon: '📸' },
              { name: 'TikTok', color: 'bg-accent-tiktok', icon: '🎵' },
            ].map((platform) => (
              <div
                key={platform.name}
                className="p-4 rounded-xl glass hover:border-brand-500/30 transition-all text-center"
              >
                <div className="text-2xl mb-2">{platform.icon}</div>
                <div className="text-sm font-medium">{platform.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA Section ---- */}
      <section id="get-started" className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="p-8 sm:p-12 rounded-2xl glass glow-brand">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to <span className="text-gradient">Automate</span>?
            </h2>
            <p className="text-gray-400 mb-8">
              Get started with StreamZ and let AI handle your content pipeline. Clone the
              repo, configure your env, and docker compose up.
            </p>
            <div className="bg-surface rounded-xl p-4 font-mono text-sm text-left text-gray-300 border border-surface-300/50">
              <span className="text-brand-400">$</span> git clone https://github.com/your-org/streamz.git
              <br />
              <span className="text-brand-400">$</span> cp .env.example .env
              <br />
              <span className="text-brand-400">$</span> docker compose up -d
              <br />
              <span className="text-brand-400">$</span> bun run db:migrate && bun run db:seed
            </div>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="mt-auto border-t border-surface-300/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-accent-twitch flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gradient">StreamZ</span>
          </div>
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} StreamZ. Built for gaming content creators.
          </p>
        </div>
      </footer>
    </div>
  );
}
