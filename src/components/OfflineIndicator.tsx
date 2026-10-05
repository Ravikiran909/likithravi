import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Database, HardDrive, ShieldCheck } from 'lucide-react';
import { syncPendingOfflineActions, getPendingOfflineActions } from '../utils/offlineDb.ts';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showRestoredNotice, setShowRestoredNotice] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setShowRestoredNotice(true);
      setIsSyncing(true);
      try {
        await syncPendingOfflineActions();
        const pending = await getPendingOfflineActions();
        setPendingCount(pending.length);
      } catch (err) {
        console.warn('Sync failed:', err);
      } finally {
        setIsSyncing(false);
      }

      // Hide restored notice after 5 seconds
      setTimeout(() => {
        setShowRestoredNotice(false);
      }, 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredNotice(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of pending actions
    getPendingOfflineActions().then((actions) => setPendingCount(actions.length)).catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncPendingOfflineActions();
      const pending = await getPendingOfflineActions();
      setPendingCount(pending.length);
    } finally {
      setIsSyncing(false);
    }
  };

  // If online and not showing notice or pending syncs, show a tiny subtle badge or nothing
  if (isOnline && !showRestoredNotice && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      {!isOnline && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center space-x-3 text-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
            <WifiOff className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-amber-400">Rural Offline Mode Active</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                IndexedDB
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
              Curriculum documents, roadmaps, and flashcards are cached for offline study.
            </p>
          </div>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] shrink-0 font-mono">
              {pendingCount} saved
            </span>
          )}
        </div>
      )}

      {showRestoredNotice && isOnline && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center space-x-3 text-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-emerald-400">Connection Restored</span>
              {isSyncing && (
                <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Synced offline milestones and study progress.
            </p>
          </div>
        </div>
      )}

      {!isOnline && pendingCount > 0 && (
        <div className="mt-1 text-right">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
          >
            {isSyncing ? 'Checking sync...' : 'Check sync queue'}
          </button>
        </div>
      )}
    </div>
  );
};
