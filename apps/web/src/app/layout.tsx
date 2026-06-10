import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'StreamZ - Social Media Automation for Gaming Creators',
  description:
    'Automate your gaming content pipeline. Capture streams, detect highlights, generate AI-optimized content, and publish across platforms.',
  keywords: ['streaming', 'automation', 'gaming', 'content creation', 'AI', 'highlights'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-surface text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
