'use client';

import React, { useState } from 'react';
import {
  Check,
  X,
  Calendar,
  Trash2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/components/ui';

interface BatchOperationsBarProps {
  selectedCount: number;
  onApproveAll?: () => Promise<void> | void;
  onRejectAll?: () => Promise<void> | void;
  onScheduleAll?: () => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onClearSelection?: () => void;
  className?: string;
}

type ConfirmAction = 'approve' | 'reject' | 'schedule' | 'delete' | null;

export function BatchOperationsBar({
  selectedCount,
  onApproveAll,
  onRejectAll,
  onScheduleAll,
  onDelete,
  onClearSelection,
  className,
}: BatchOperationsBarProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) return null;

  const handleAction = async (action: () => Promise<void> | void) => {
    setIsProcessing(true);
    try {
      await action();
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const getActionConfig = (action: ConfirmAction) => {
    switch (action) {
      case 'approve':
        return {
          label: 'Approve All',
          description: `Are you sure you want to approve ${selectedCount} item${selectedCount > 1 ? 's' : ''}?`,
          icon: Check,
          buttonColor: 'bg-green-600 hover:bg-green-500',
          onConfirm: onApproveAll,
        };
      case 'reject':
        return {
          label: 'Reject All',
          description: `Are you sure you want to reject ${selectedCount} item${selectedCount > 1 ? 's' : ''}? This action can be undone.`,
          icon: X,
          buttonColor: 'bg-red-600 hover:bg-red-500',
          onConfirm: onRejectAll,
        };
      case 'schedule':
        return {
          label: 'Schedule All',
          description: `Schedule ${selectedCount} item${selectedCount > 1 ? 's' : ''} for publishing?`,
          icon: Calendar,
          buttonColor: 'bg-purple-600 hover:bg-purple-500',
          onConfirm: onScheduleAll,
        };
      case 'delete':
        return {
          label: 'Delete',
          description: `Permanently delete ${selectedCount} item${selectedCount > 1 ? 's' : ''}? This cannot be undone.`,
          icon: Trash2,
          buttonColor: 'bg-red-600 hover:bg-red-500',
          onConfirm: onDelete,
        };
      default:
        return null;
    }
  };

  const actionConfig = confirmAction ? getActionConfig(confirmAction) : null;

  return (
    <>
      {/* Main Toolbar */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 lg:left-64',
          'bg-slate-900/95 backdrop-blur-sm border-t border-slate-700',
          'px-4 sm:px-6 py-3',
          'transform transition-transform duration-200',
          className
        )}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-sm font-bold text-orange-400">{selectedCount}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
              </p>
              {onClearSelection && (
                <button
                  onClick={onClearSelection}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {onApproveAll && (
              <button
                onClick={() => setConfirmAction('approve')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-xs font-medium text-green-400 transition-colors border border-green-500/20 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Approve All</span>
              </button>
            )}
            {onRejectAll && (
              <button
                onClick={() => setConfirmAction('reject')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-xs font-medium text-red-400 transition-colors border border-red-500/20 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reject All</span>
              </button>
            )}
            {onScheduleAll && (
              <button
                onClick={() => setConfirmAction('schedule')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-xs font-medium text-purple-400 transition-colors border border-purple-500/20 disabled:opacity-50"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Schedule All</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => setConfirmAction('delete')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-600/20 hover:bg-slate-600/30 text-xs font-medium text-slate-300 transition-colors border border-slate-500/20 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {actionConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isProcessing && setConfirmAction(null)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-md mx-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{actionConfig.label}</h3>
              </div>
              <p className="text-sm text-slate-300 mb-6">{actionConfig.description}</p>

              {isProcessing && (
                <div className="flex items-center gap-2 mb-4 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </div>
              )}

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => actionConfig.onConfirm && handleAction(actionConfig.onConfirm)}
                  disabled={isProcessing}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2',
                    actionConfig.buttonColor
                  )}
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {actionConfig.label}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
