import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---- Card ----

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-slate-800/50 border border-slate-700/50 p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ---- Button ----

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-orange-500 hover:bg-orange-600 text-white border-transparent',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 border-transparent',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
  outline: 'bg-transparent hover:bg-slate-800 text-slate-300 border-slate-600',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---- Badge ----

type BadgeVariant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'orange';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children?: React.ReactNode;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-slate-700 text-slate-300',
  primary: 'bg-orange-500/20 text-orange-400',
  success: 'bg-emerald-500/20 text-emerald-400',
  danger: 'bg-red-500/20 text-red-400',
  warning: 'bg-amber-500/20 text-amber-400',
  info: 'bg-cyan-500/20 text-cyan-400',
  purple: 'bg-purple-500/20 text-purple-400',
  orange: 'bg-orange-500/20 text-orange-400',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ---- StatCard ----

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'orange' | 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'cyan';
  change?: string;
}

const statColors: Record<string, string> = {
  orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  yellow: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  red: 'text-red-400 bg-red-500/10 border-red-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

const statIconColors: Record<string, string> = {
  orange: 'text-orange-400',
  blue: 'text-blue-400',
  yellow: 'text-amber-400',
  green: 'text-emerald-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
  cyan: 'text-cyan-400',
};

export function StatCard({ title, value, icon, color = 'orange', change }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border p-4', statColors[color])}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium opacity-70">{title}</p>
        {icon && <div className={statIconColors[color]}>{icon}</div>}
      </div>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {change && <p className="mt-1 text-xs opacity-60">{change}</p>}
    </div>
  );
}

// ---- Variant helpers ----

type PlatformVariant = 'default' | 'danger' | 'purple' | 'info' | 'warning';

export function getPlatformBadgeVariant(platform: string): PlatformVariant {
  const map: Record<string, PlatformVariant> = {
    youtube_vod: 'danger',
    youtube_shorts: 'danger',
    instagram_reels: 'purple',
    instagram_stories: 'warning',
    tiktok: 'info',
  };
  return map[platform] || 'default';
}

type PublishStatusVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';

export function getPublishStatusVariant(status: string): PublishStatusVariant {
  const map: Record<string, PublishStatusVariant> = {
    pending: 'warning',
    queued: 'warning',
    scheduled: 'info',
    publishing: 'info',
    published: 'success',
    failed: 'danger',
  };
  return map[status] || 'default';
}

type StreamStatusVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';

export function getStreamStatusVariant(status: string): StreamStatusVariant {
  const map: Record<string, StreamStatusVariant> = {
    live: 'danger',
    capturing: 'warning',
    captured: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger',
  };
  return map[status] || 'default';
}

// ---- Input ----

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ className, label, ...props }: InputProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>}
      <input
        className={cn(
          'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-colors',
          className
        )}
        {...props}
      />
    </div>
  );
}

// ---- Select ----

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ className, label, options, ...props }: SelectProps) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>}
      <select
        className={cn(
          'w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-colors',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ---- Toggle / Switch ----

interface ToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  description?: string;
}

export function Toggle({ enabled, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-slate-200">{label}</p>}
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-orange-500' : 'bg-slate-600'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// ---- Modal / Dialog ----

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'relative z-50 w-full max-w-lg mx-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ---- Tabs ----

interface TabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-800/50 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-orange-500 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
