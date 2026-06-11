'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Keyboard, X } from 'lucide-react';
import { cn } from '@/components/ui';

// ---- Types ----

interface ShortcutDef {
  key: string;
  label: string;
  description: string;
  handler?: () => void;
  category?: string;
}

interface KeyboardShortcutsContextType {
  registerShortcut: (shortcut: ShortcutDef) => void;
  unregisterShortcut: (key: string) => void;
  showHelp: () => void;
  hideHelp: () => void;
}

// ---- Context ----

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType>({
  registerShortcut: () => {},
  unregisterShortcut: () => {},
  showHelp: () => {},
  hideHelp: () => {},
});

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext);
}

// ---- Global Shortcuts ----

const globalShortcuts: ShortcutDef[] = [
  { key: '?', label: '?', description: 'Show keyboard shortcuts', category: 'General' },
  { key: 'j', label: 'J', description: 'Navigate down in lists', category: 'Navigation' },
  { key: 'k', label: 'K', description: 'Navigate up in lists', category: 'Navigation' },
  { key: 'a', label: 'A', description: 'Approve selected item', category: 'Actions' },
  { key: 'r', label: 'R', description: 'Reject selected item', category: 'Actions' },
  { key: 'e', label: 'E', description: 'Edit selected item', category: 'Actions' },
  { key: 's', label: 'S', description: 'Schedule selected item', category: 'Actions' },
  { key: 'Escape', label: 'Esc', description: 'Close modals / deselect', category: 'General' },
  { key: '1', label: '1', description: 'Go to Dashboard', category: 'Quick Nav' },
  { key: '2', label: '2', description: 'Go to Streams', category: 'Quick Nav' },
  { key: '3', label: '3', description: 'Go to Highlights', category: 'Quick Nav' },
  { key: '4', label: '4', description: 'Go to Review', category: 'Quick Nav' },
  { key: '5', label: '5', description: 'Go to Publish Queue', category: 'Quick Nav' },
  { key: '6', label: '6', description: 'Go to Calendar', category: 'Quick Nav' },
  { key: '7', label: '7', description: 'Go to Analytics', category: 'Quick Nav' },
];

const quickNavRoutes: Record<string, string> = {
  '1': '/dashboard',
  '2': '/dashboard/streams',
  '3': '/dashboard/highlights',
  '4': '/dashboard/review',
  '5': '/dashboard/queue',
  '6': '/dashboard/calendar',
  '7': '/dashboard/analytics',
};

// ---- Help Modal ----

interface ShortcutsHelpModalProps {
  open: boolean;
  onClose: () => void;
  pageShortcuts?: ShortcutDef[];
}

function ShortcutsHelpModal({ open, onClose, pageShortcuts }: ShortcutsHelpModalProps) {
  if (!open) return null;

  const allShortcuts = [...globalShortcuts, ...(pageShortcuts || [])];

  // Group by category
  const categories = new Map<string, ShortcutDef[]>();
  allShortcuts.forEach((s) => {
    const cat = s.category || 'Other';
    const existing = categories.get(cat) || [];
    existing.push(s);
    categories.set(cat, existing);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-50 w-full max-w-lg mx-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {Array.from(categories.entries()).map(([category, shortcuts]) => (
            <div key={category} className="mb-5 last:mb-0">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{category}</h4>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{shortcut.description}</span>
                    <kbd className="inline-flex items-center px-2 py-1 rounded bg-slate-800 border border-slate-600 text-xs font-mono text-slate-300 min-w-[2rem] justify-center">
                      {shortcut.label}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Provider ----

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
  onNavigate?: (path: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onSchedule?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onEscape?: () => void;
}

export function KeyboardShortcutsProvider({
  children,
  onNavigate,
  onApprove,
  onReject,
  onEdit,
  onSchedule,
  onNavigateUp,
  onNavigateDown,
  onEscape,
}: KeyboardShortcutsProviderProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [pageShortcuts, setPageShortcuts] = useState<ShortcutDef[]>([]);

  const registerShortcut = useCallback((shortcut: ShortcutDef) => {
    setPageShortcuts((prev) => {
      const filtered = prev.filter((s) => s.key !== shortcut.key);
      return [...filtered, shortcut];
    });
  }, []);

  const unregisterShortcut = useCallback((key: string) => {
    setPageShortcuts((prev) => prev.filter((s) => s.key !== key));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Only allow Escape from inputs
        if (e.key !== 'Escape') return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          setHelpOpen((prev) => !prev);
          break;
        case 'Escape':
          setHelpOpen(false);
          onEscape?.();
          break;
        case 'j':
          e.preventDefault();
          onNavigateDown?.();
          break;
        case 'k':
          e.preventDefault();
          onNavigateUp?.();
          break;
        case 'a':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onApprove?.();
          }
          break;
        case 'r':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onReject?.();
          }
          break;
        case 'e':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onEdit?.();
          }
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onSchedule?.();
          }
          break;
        default:
          // Quick nav with number keys
          if (quickNavRoutes[e.key] && onNavigate) {
            e.preventDefault();
            onNavigate(quickNavRoutes[e.key]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onApprove, onReject, onEdit, onSchedule, onNavigateUp, onNavigateDown, onEscape, onNavigate]);

  const contextValue = {
    registerShortcut,
    unregisterShortcut,
    showHelp: () => setHelpOpen(true),
    hideHelp: () => setHelpOpen(false),
  };

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}
      <ShortcutsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} pageShortcuts={pageShortcuts} />
    </KeyboardShortcutsContext.Provider>
  );
}

// ---- Shortcut Badge ----

export function ShortcutBadge({ shortcut, className }: { shortcut: string; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] font-mono text-slate-400',
        className
      )}
    >
      {shortcut}
    </kbd>
  );
}
