import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'StreamZ - Social Media Automation for Gaming Creators',
  description:
    'Automate your gaming content pipeline. Capture streams, detect highlights, generate AI-optimized content, and publish across platforms.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#f97316',
          colorBackground: '#0f172a',
          colorInputBackground: '#1e293b',
          colorInputText: '#e2e8f0',
        },
        elements: {
          formButtonPrimary: 'bg-orange-500 hover:bg-orange-600 text-white',
          card: 'bg-slate-900 border-slate-700',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={`${inter.variable} font-sans antialiased bg-[#0f0f13] text-white min-h-screen`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
