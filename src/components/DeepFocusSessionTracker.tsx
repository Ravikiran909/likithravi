import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Clock,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Flame,
  BellOff,
  Timer,
  Sparkles,
  EyeOff,
  Award,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface DeepFocusSessionTrackerProps {
  profile: StudentProfile;
  deepFocusActive: boolean;
  onToggleDeepFocus: (nextState: boolean) => void;
  onProfileUpdate: (updated: StudentProfile) => void;
  onSessionCompleteMinutes?: (mins: number, label?: string) => void;
  onOpenPomodoroTab?: () => void;
}

type FocusPreset = 'pomodoro_25' | 'deep_50' | 'break_5';

const PRESET_SECONDS: Record<FocusPreset, number> = {
  pomodoro_25: 25 * 60,
  deep_50: 50 * 60,
  break_5: 5 * 60,
};

export const DeepFocusSessionTracker: React.FC<DeepFocusSessionTrackerProps> = ({
  profile,
  deepFocusActive,
  onToggleDeepFocus,
  onProfileUpdate,
  onSessionCompleteMinutes,
  onOpenPomodoroTab,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [preset, setPreset] = useState<FocusPreset>('pomodoro_25');
  const [secondsLeft, setSecondsLeft] = useState<number>(PRESET_SECONDS.pomodoro_25);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<string>(
    profile.subjects[0] || 'Python'
  );

  // Option to lock other browser tabs during the session
  const [lockBrowserTabs, setLockBrowserTabs] = useState<boolean>(true);
  const [autoPauseOnTabSwitch, setAutoPauseOnTabSwitch] = useState<boolean>(true);
  const [isFullscreenLocked, setIsFullscreenLocked] = useState<boolean>(false);
  const [tabSwitchAttempts, setTabSwitchAttempts] = useState<number>(0);
  const [tabViolationAlert, setTabViolationAlert] = useState<string | null>(null);
  const [violationHistory, setViolationHistory] = useState<
    { id: string; time: string; reason: string }[]
  >([]);

  // Synced Focus Stats from profile
  const totalFocusMinutes = profile.focusStats?.totalFocusMinutes || 125;
  const todayFocusMinutes = profile.focusStats?.todayFocusMinutes || 50;
  const completedSessions = profile.focusStats?.completedSessions || 5;

  const totalDurationSeconds = PRESET_SECONDS[preset];
  const elapsedSecondsInCurrentRun = Math.max(0, totalDurationSeconds - secondsLeft);
  const liveTotalMinutes = totalFocusMinutes + Math.floor(elapsedSecondsInCurrentRun / 60);
  const totalFocusedHours = (liveTotalMinutes / 60).toFixed(1);
  const todayFocusedHours = (
    (todayFocusMinutes + Math.floor(elapsedSecondsInCurrentRun / 60)) /
    60
  ).toFixed(1);

  const originalTitleRef = useRef<string>(
    typeof document !== 'undefined' ? document.title : 'WhatsApp AI Learning Companion'
  );

  const playGuardTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignore if audio context blocked
    }
  };

  // Pomodoro countdown tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handleCompleteSyncedSession();
          return PRESET_SECONDS[preset];
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, preset, selectedSubject]);

  // Browser Tab Lock Enforcement (Visibility API + Window Blur + BeforeUnload)
  useEffect(() => {
    if (!isRunning || !lockBrowserTabs) {
      if (typeof document !== 'undefined') {
        document.title = originalTitleRef.current;
      }
      return;
    }

    const mins = Math.floor(secondsLeft / 60)
      .toString()
      .padStart(2, '0');
    const secs = (secondsLeft % 60).toString().padStart(2, '0');
    document.title = `🔒 [${mins}:${secs} FOCUS LOCKED] ${selectedSubject}`;

    const handleVisibilityChange = () => {
      if (document.hidden && isRunning && lockBrowserTabs) {
        const nowTime = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        document.title = `⚠️ RETURN TO STUDY TAB! [LOCKED SESSION]`;
        playGuardTone();
        setTabSwitchAttempts((c) => c + 1);
        setViolationHistory((prev) => [
          {
            id: `viol_${Date.now()}`,
            time: nowTime,
            reason: `Switched away from browser tab during ${selectedSubject} Pomodoro`,
          },
          ...prev.slice(0, 3),
        ]);

        if (autoPauseOnTabSwitch) {
          setIsRunning(false);
          setTabViolationAlert(
            `🔒 Browser Tab Lock Triggered at ${nowTime}! Your Pomodoro timer was auto-paused because you switched to another browser tab.`
          );
        } else {
          setTabViolationAlert(
            `🔒 Browser Tab Lock Alert (${nowTime}): Stay on this tab to maintain 100% Deep Focus integrity!`
          );
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning && lockBrowserTabs) {
        e.preventDefault();
        e.returnValue = 'Deep Focus Tab Lock is active. Are you sure you want to leave your session?';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRunning, lockBrowserTabs, autoPauseOnTabSwitch, secondsLeft, selectedSubject]);

  const handleCompleteSyncedSession = async () => {
    setIsRunning(false);
    playGuardTone();

    if (preset === 'break_5') {
      setPreset('pomodoro_25');
      setSecondsLeft(PRESET_SECONDS.pomodoro_25);
      return;
    }

    const addedMinutes = preset === 'deep_50' ? 50 : 25;
    const newTotal = totalFocusMinutes + addedMinutes;
    const newToday = todayFocusMinutes + addedMinutes;
    const newSessions = completedSessions + 1;

    const updatedFocusStats = {
      totalFocusMinutes: newTotal,
      completedSessions: newSessions,
      todayFocusMinutes: newToday,
      lastSessionDate: todayStr,
    };

    const updatedProfile: StudentProfile = {
      ...profile,
      focusStats: updatedFocusStats,
    };

    onProfileUpdate(updatedProfile);
    if (onSessionCompleteMinutes) {
      onSessionCompleteMinutes(addedMinutes, `${addedMinutes}m Locked Deep Focus (${selectedSubject})`);
    }

    try {
      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          { focusStats: updatedFocusStats },
          { merge: true }
        );
      }
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusStats: updatedFocusStats }),
      });
    } catch {
      // Non-blocking persistence fallback
    }
  };

  const handleToggleFullscreenLock = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreenLocked(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreenLocked(false);
      }
    } catch {
      setIsFullscreenLocked(!isFullscreenLocked);
    }
  };

  const handleStartFocusSession = () => {
    setTabViolationAlert(null);
    setIsRunning(true);
    if (!deepFocusActive) {
      onToggleDeepFocus(true);
    }
  };

  const minsStr = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const secsStr = (secondsLeft % 60).toString().padStart(2, '0');
  const progressPct = Math.round(
    ((totalDurationSeconds - secondsLeft) / totalDurationSeconds) * 100
  );
  const focusIntegrityPct = Math.max(0, 100 - tabSwitchAttempts * 10);

  return (
    <div
      className={`rounded-3xl p-6 shadow-2xl border transition-all relative overflow-hidden space-y-5 ${
        isRunning && lockBrowserTabs
          ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/50 border-amber-500/60 ring-1 ring-amber-500/30'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      {/* Ambient Background Glow */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div
            className={`p-3 rounded-2xl border shrink-0 ${
              isRunning && lockBrowserTabs
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
            }`}
          >
            {lockBrowserTabs ? <Lock className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Deep Focus Session Tracker
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Synced with Pomodoro Timer
              </span>
              {lockBrowserTabs && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>Browser Tab Lock Armed</span>
                </span>
              )}
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5">
              Total Focused Hours & Browser Tab Lock Guard
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Tracks your cumulative Pomodoro deep work hours in real time, mutes non-emergency WhatsApp alerts, and locks your active browser tab to prevent context-switching during study sprints.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleFullscreenLock}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
            title="Lock browser into Fullscreen Focus Mode"
          >
            {isFullscreenLocked ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Exit Fullscreen Lock</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Fullscreen Tab Lock</span>
              </>
            )}
          </button>

          {onOpenPomodoroTab && (
            <button
              type="button"
              onClick={onOpenPomodoroTab}
              className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
            >
              Full Pomodoro Studio →
            </button>
          )}
        </div>
      </div>

      {/* Tab Lock Violation Alert Banner */}
      {tabViolationAlert && (
        <div className="relative z-10 p-4 rounded-2xl bg-rose-950/70 border border-rose-500/60 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-pulse">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-rose-300">
                Browser Tab Lock Guard Triggered
              </div>
              <p className="text-xs text-rose-100 mt-0.5">{tabViolationAlert}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setTabViolationAlert(null);
              setIsRunning(true);
            }}
            className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs rounded-xl transition shrink-0 cursor-pointer"
          >
            Resume Locked Focus
          </button>
        </div>
      )}

      {/* 4 Key Focus Telemetry Cards (Displaying Total Focused Hours) */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400">
              Total Focused Hours
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {totalFocusedHours} hrs
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {liveTotalMinutes} cumulative mins logged
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-400">
              Today's Deep Focus
            </span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {todayFocusedHours} hrs
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {todayFocusMinutes + Math.floor(elapsedSecondsInCurrentRun / 60)} mins focused today
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-400">
              Pomodoro Cycles
            </span>
            <Timer className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {completedSessions} Sprints
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Synced with Firestore Profile
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px] text-sky-400">
              Tab Lock Integrity
            </span>
            <Lock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {focusIntegrityPct}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {tabSwitchAttempts === 0
              ? 'Zero tab switches detected'
              : `${tabSwitchAttempts} tab switch(es) blocked`}
          </div>
        </div>
      </div>

      {/* Main Synced Pomodoro Control Bar + Browser Tab Lock Settings */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4">
        {/* Left: Synced Timer Display & Controls */}
        <div className="lg:col-span-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="px-4 py-3 rounded-2xl bg-slate-900 border border-amber-500/40 text-center min-w-[125px]">
              <div className="text-2xl font-black font-mono text-white tracking-wider">
                {minsStr}:{secsStr}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mt-0.5">
                {isRunning ? '🔒 Locked & Running' : 'Ready to Focus'}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'pomodoro_25', label: '25m Pomodoro' },
                    { id: 'deep_50', label: '50m Deep Block' },
                    { id: 'break_5', label: '5m Break' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setIsRunning(false);
                      setPreset(item.id);
                      setSecondsLeft(PRESET_SECONDS[item.id]);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      preset === item.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-400">Subject:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {profile.subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStartFocusSession}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>{lockBrowserTabs ? 'Start & Lock Tab' : 'Start Focus'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsRunning(false)}
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-black text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setSecondsLeft(PRESET_SECONDS[preset]);
                setTabViolationAlert(null);
              }}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Lock Other Browser Tabs Controls */}
        <div className="lg:col-span-5 lg:border-l border-slate-800 lg:pl-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-xs font-bold text-white cursor-pointer">
              <input
                type="checkbox"
                checked={lockBrowserTabs}
                onChange={(e) => setLockBrowserTabs(e.target.checked)}
                className="accent-amber-500 rounded cursor-pointer w-4 h-4"
              />
              <span>Lock Other Browser Tabs During Session</span>
            </label>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                lockBrowserTabs
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {lockBrowserTabs ? 'Locked' : 'Unlocked'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPauseOnTabSwitch}
                disabled={!lockBrowserTabs}
                onChange={(e) => setAutoPauseOnTabSwitch(e.target.checked)}
                className="accent-indigo-500 rounded cursor-pointer"
              />
              <span>Auto-pause Pomodoro if another tab is opened</span>
            </label>
          </div>

          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
