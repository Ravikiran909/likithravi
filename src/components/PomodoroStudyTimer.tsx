import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Bell,
  BellRing,
  CheckCircle2,
  Flame,
  Coffee,
  Sparkles,
  Volume2,
  VolumeX,
  BookOpen,
  Target,
  Award,
  Clock,
  SlidersHorizontal,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import { StudentProfile, FocusSession } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface PomodoroStudyTimerProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  completedMinutesToday?: number;
}

type PomodoroMode = 'focus' | 'short_break' | 'long_break';

interface NotificationLogItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  mode: PomodoroMode;
  subject: string;
  minutesLogged: number;
  browserDelivered: boolean;
}

export const PomodoroStudyTimer: React.FC<PomodoroStudyTimerProps> = ({
  profile,
  onProfileUpdate,
  onLogStudyMinutes,
  onNavigateToChat,
  onNavigateToQuiz,
  completedMinutesToday,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Customizable durations (in minutes)
  const [focusDurationMins, setFocusDurationMins] = useState<number>(25);
  const [shortBreakMins, setShortBreakMins] = useState<number>(5);
  const [longBreakMins, setLongBreakMins] = useState<number>(15);
  const [showCustomDurationEditor, setShowCustomDurationEditor] = useState<boolean>(false);

  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [autoStartBreaks, setAutoStartBreaks] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const availableSubjects = Array.from(
    new Set([...(profile.subjects || []), 'DSA', 'Government Exams', 'Python', 'Mathematics'])
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(availableSubjects[0] || 'DSA');
  const [focusTopicGoal, setFocusTopicGoal] = useState<string>(
    profile.weakTopics?.[0] || 'Sliding Window & Dynamic Programming'
  );

  // Browser Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState<boolean>(true);
  const [activeCompletionBanner, setActiveCompletionBanner] = useState<NotificationLogItem | null>(
    null
  );
  const [notificationLogs, setNotificationLogs] = useState<NotificationLogItem[]>([
    {
      id: 'init_pomo_log_1',
      title: 'Focus Block Complete: DSA (25m)',
      body: 'Logged +25 mins to your daily study goal and weekly streak. Time for a 5m recharge break!',
      timestamp: 'Earlier Today',
      mode: 'focus',
      subject: 'DSA',
      minutesLogged: 25,
      browserDelivered: true,
    },
  ]);

  // Synced progress state derived from profile
  const totalFocusMinutes = profile.focusStats?.totalFocusMinutes ?? 125;
  const completedPomodoroBlocks = profile.focusStats?.completedSessions ?? 5;
  const todayFocusMinutes =
    completedMinutesToday !== undefined
      ? completedMinutesToday
      : profile.focusStats?.todayFocusMinutes ?? profile.dailyStudyMinutesCompleted ?? 50;

  const dailyTargetMinutes = Math.max(30, Math.round((profile.studyHoursPerDay || 2) * 60));
  const dailyProgressPct = Math.min(100, Math.round((todayFocusMinutes / dailyTargetMinutes) * 100));

  const currentCycleBlock = (completedPomodoroBlocks % 4) + 1;

  const getModeDurationSeconds = (targetMode: PomodoroMode): number => {
    if (targetMode === 'focus') return focusDurationMins * 60;
    if (targetMode === 'short_break') return shortBreakMins * 60;
    return longBreakMins * 60;
  };

  const totalCurrentSeconds = getModeDurationSeconds(mode);
  const elapsedSeconds = Math.max(0, totalCurrentSeconds - secondsLeft);
  const timerProgressPercent =
    totalCurrentSeconds > 0 ? Math.min(100, Math.round((elapsedSeconds / totalCurrentSeconds) * 100)) : 0;

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play Web Audio API bell chime when focus block or break ends
  const playCompletionChime = (completedMode: PomodoroMode) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const notes = completedMode === 'focus' ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 523.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.14 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + idx * 0.14 + 0.45);
      });
    } catch {
      // Ignore if AudioContext is blocked
    }
  };

  // Request Browser Notification Permission
  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied' as NotificationPermission;
    }
    try {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
      setBrowserNotificationsEnabled(result === 'granted');
      return result;
    } catch {
      return Notification.permission;
    }
  };

  // Send Browser Notification (Notification API + ServiceWorker fallback + in-app toast)
  const dispatchBrowserNotification = async (
    title: string,
    body: string,
    completedMode: PomodoroMode,
    minutesEarned: number
  ) => {
    let deliveredNative = false;

    if (browserNotificationsEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      let perm = Notification.permission;
      if (perm === 'default') {
        perm = await handleRequestNotificationPermission();
      }
      if (perm === 'granted') {
        try {
          const n = new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: `pomodoro-${completedMode}-${Date.now()}`,
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
          deliveredNative = true;
        } catch {
          // Fallback to service worker registration notification if available
          if ('serviceWorker' in navigator) {
            try {
              const reg = await navigator.serviceWorker.getRegistration();
              if (reg) {
                await reg.showNotification(title, {
                  body,
                  icon: '/favicon.ico',
                  tag: `pomodoro-${completedMode}-${Date.now()}`,
                });
                deliveredNative = true;
              }
            } catch {
              // Ignore SW notification failure
            }
          }
        }
      }
    }

    const logEntry: NotificationLogItem = {
      id: `pomo_notif_${Date.now()}`,
      title,
      body,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: completedMode,
      subject: selectedSubject,
      minutesLogged: minutesEarned,
      browserDelivered: deliveredNative,
    };

    setActiveCompletionBanner(logEntry);
    setNotificationLogs((prev) => [logEntry, ...prev.slice(0, 5)]);
  };

  // Sync completed Focus Block with StudentProfile, Firestore, and Backend
  const handleFocusBlockEnded = async (completedMode: PomodoroMode) => {
    setIsRunning(false);
    playCompletionChime(completedMode);

    if (completedMode === 'focus') {
      const minutesEarned = focusDurationMins;
      const newTotalFocusMinutes = totalFocusMinutes + minutesEarned;
      const newCompletedSessions = completedPomodoroBlocks + 1;
      const newTodayFocusMinutes = todayFocusMinutes + minutesEarned;
      const newDailyMinutes = (profile.dailyStudyMinutesCompleted || 0) + minutesEarned;
      const addedHours = Number((minutesEarned / 60).toFixed(2));
      const newWeeklyHours = Number(((profile.weeklyHoursCompleted || 0) + addedHours).toFixed(2));
      const newTotalSessions = (profile.totalSessions || 0) + 1;
      const newOverallProgress = Math.min(100, (profile.overallProgress || 0) + 1);

      const newFocusStats = {
        totalFocusMinutes: newTotalFocusMinutes,
        completedSessions: newCompletedSessions,
        todayFocusMinutes: newTodayFocusMinutes,
        lastSessionDate: todayStr,
      };

      const sessionLabel = `${minutesEarned}m Pomodoro Focus (${selectedSubject}: ${
        focusTopicGoal.trim() || 'Core Study'
      })`;

      // Notify parent dashboard logger so daily/weekly charts & progress bars update immediately
      if (onLogStudyMinutes) {
        onLogStudyMinutes(minutesEarned, sessionLabel);
      }

      const updatedProfile: StudentProfile = {
        ...profile,
        dailyStudyMinutesCompleted: newDailyMinutes,
        weeklyHoursCompleted: newWeeklyHours,
        totalSessions: newTotalSessions,
        overallProgress: newOverallProgress,
        lastActiveDate: todayStr,
        focusStats: newFocusStats,
      };

      onProfileUpdate(updatedProfile);

      // Fire Browser Notification
      const nextIsLongBreak = newCompletedSessions % 4 === 0;
      const notifTitle = `🍅 Focus Block Complete! (+${minutesEarned}m ${selectedSubject})`;
      const notifBody = `Great focus on "${
        focusTopicGoal.trim() || selectedSubject
      }"! Your study progress (${newTodayFocusMinutes}m today, ${newCompletedSessions} Pomodoros) is synced. Time for a ${
        nextIsLongBreak ? `${longBreakMins}m Long Break` : `${shortBreakMins}m Short Break`
      }.`;

      await dispatchBrowserNotification(notifTitle, notifBody, 'focus', minutesEarned);

      const sessionId = `focus_${Date.now()}`;
      const newSessionRecord: FocusSession = {
        id: sessionId,
        userId: profile.userId,
        durationMinutes: minutesEarned,
        subject: selectedSubject,
        topic: focusTopicGoal.trim() || `${selectedSubject} Pomodoro Focus`,
        completedAt: new Date().toISOString(),
        type: 'pomodoro',
      };

      // Persist to Firestore & Express API
      try {
        if (db && profile.userId) {
          await setDoc(
            doc(db, 'profiles', profile.userId),
            {
              dailyStudyMinutesCompleted: newDailyMinutes,
              weeklyHoursCompleted: newWeeklyHours,
              totalSessions: newTotalSessions,
              overallProgress: newOverallProgress,
              lastActiveDate: todayStr,
              focusStats: newFocusStats,
            },
            { merge: true }
          );
          await setDoc(doc(db, 'focus_sessions', sessionId), newSessionRecord);
        }

        await fetch('/api/focus-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSessionRecord),
        }).catch(() => {});
      } catch {
        // Non-blocking fallback
      }

      // Advance to Break Mode
      const nextMode: PomodoroMode = nextIsLongBreak ? 'long_break' : 'short_break';
      setMode(nextMode);
      setSecondsLeft(nextIsLongBreak ? longBreakMins * 60 : shortBreakMins * 60);
      if (autoStartBreaks) {
        setIsRunning(true);
      }
    } else {
      // Break ended -> notify student to start next focus block
      const breakMins = completedMode === 'short_break' ? shortBreakMins : longBreakMins;
      const notifTitle = `⏰ Break Finished! Ready for ${selectedSubject}?`;
      const notifBody = `Your ${breakMins}-minute recharge break has ended. Start your next ${focusDurationMins}-minute focus block on ${selectedSubject}!`;

      await dispatchBrowserNotification(notifTitle, notifBody, completedMode, 0);

      setMode('focus');
      setSecondsLeft(focusDurationMins * 60);
    }
  };

  // Keep latest callback ref for interval tick
  const finishCallbackRef = useRef(handleFocusBlockEnded);
  useEffect(() => {
    finishCallbackRef.current = handleFocusBlockEnded;
  });

  // Countdown Effect
  useEffect(() => {
    if (!isRunning) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          finishCallbackRef.current(mode);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning, mode]);

  const handleSelectMode = (targetMode: PomodoroMode) => {
    setIsRunning(false);
    setMode(targetMode);
    setSecondsLeft(getModeDurationSeconds(targetMode));
  };

  const handleApplyFocusPreset = (mins: number) => {
    setIsRunning(false);
    setFocusDurationMins(mins);
    if (mode === 'focus') {
      setSecondsLeft(mins * 60);
    }
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(getModeDurationSeconds(mode));
  };

  const formatMMSS = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
            <Timer className="w-4 h-4" />
            <span>Pomodoro Study Timer</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-emerald-400">Progress & Firestore Synced</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-400">
              Cycle Block {currentCycleBlock} of 4
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Focus Block Timer & Browser Notification Alerts
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Run structured Pomodoro study sprints that automatically credit completed focus minutes to your daily goal, weekly study hours, and Firestore profile—and trigger a browser notification when a focus block ends.
          </p>
        </div>

        {/* Right Controls: Browser Notification Permission + Audio + Customizer */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <button
            type="button"
            onClick={async () => {
              if (notificationPermission !== 'granted') {
                await handleRequestNotificationPermission();
              } else {
                setBrowserNotificationsEnabled(!browserNotificationsEnabled);
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              browserNotificationsEnabled && notificationPermission === 'granted'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Configure Browser Notification when Focus Block ends"
          >
            <BellRing className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {notificationPermission === 'granted'
                ? browserNotificationsEnabled
                  ? 'Browser Alerts On'
                  : 'Browser Alerts Muted'
                : 'Enable Browser Alerts'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              dispatchBrowserNotification(
                `🔔 Test Focus Alert: ${selectedSubject} (${focusDurationMins}m)`,
                `Browser notifications are active! You will be alerted as soon as your ${focusDurationMins}-minute ${selectedSubject} focus block ends.`,
                mode,
                0
              )
            }
            className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Test End-of-Block Alert</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title={soundEnabled ? 'Sound Chime Enabled' : 'Sound Chime Muted'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowCustomDurationEditor(!showCustomDurationEditor)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Customize Pomodoro Durations"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* End-of-Focus-Block Notification Banner */}
      {activeCompletionBanner && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <span>{activeCompletionBanner.title}</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400/80 font-normal">
                  {activeCompletionBanner.browserDelivered
                    ? 'Sent via Browser Notification API'
                    : 'In-App Alert Delivered'}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1">{activeCompletionBanner.body}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToQuiz && activeCompletionBanner.mode === 'focus' && (
              <button
                type="button"
                onClick={onNavigateToQuiz}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Take 3-Min Recall Quiz
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveCompletionBanner(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Dismiss notification banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Custom Duration Editor Drawer */}
      {showCustomDurationEditor && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Focus Block (mins)
            </label>
            <input
              type="number"
              min={5}
              max={90}
              value={focusDurationMins}
              onChange={(e) => {
                const val = Math.max(1, Math.min(120, Number(e.target.value) || 25));
                setFocusDurationMins(val);
                if (mode === 'focus' && !isRunning) setSecondsLeft(val * 60);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Short Break (mins)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={shortBreakMins}
              onChange={(e) => {
                const val = Math.max(1, Math.min(30, Number(e.target.value) || 5));
                setShortBreakMins(val);
                if (mode === 'short_break' && !isRunning) setSecondsLeft(val * 60);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Long Break (mins)
            </label>
            <input
              type="number"
              min={5}
              max={45}
              value={longBreakMins}
              onChange={(e) => {
                const val = Math.max(5, Math.min(45, Number(e.target.value) || 15));
                setLongBreakMins(val);
                if (mode === 'long_break' && !isRunning) setSecondsLeft(val * 60);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoStartBreaks}
                onChange={(e) => setAutoStartBreaks(e.target.checked)}
                className="accent-amber-500 rounded cursor-pointer"
              />
              <span>Auto-start breaks</span>
            </label>
          </div>
        </div>
      )}

      {/* Main 12-Column Timer + Progress Sync Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left 7 Columns: Mode Selector + Interactive Circular Pomodoro Timer + Controls */}
        <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-6 flex flex-col items-center justify-between space-y-6">
          {/* Segmented Mode Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md">
            <button
              type="button"
              onClick={() => handleSelectMode('focus')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'focus'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Focus Block ({focusDurationMins}m)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode('short_break')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'short_break'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Short Break ({shortBreakMins}m)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode('long_break')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'long_break'
                  ? 'bg-indigo-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Long Break ({longBreakMins}m)</span>
            </button>
          </div>

          {/* Quick Focus Block Duration Presets */}
          {mode === 'focus' && (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-xs text-slate-400 mr-1">Sprint Preset:</span>
              {[
                { mins: 15, label: '15m Quick' },
                { mins: 25, label: '25m Classic' },
                { mins: 45, label: '45m Exam Prep' },
                { mins: 50, label: '50m Deep Work' },
              ].map((preset) => (
                <button
                  key={preset.mins}
                  type="button"
                  onClick={() => handleApplyFocusPreset(preset.mins)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    focusDurationMins === preset.mins
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Circular Progress Dial */}
          <div className="relative w-60 h-60 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="52"
                className="text-slate-800"
                strokeWidth="7"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                className={`transition-all duration-500 ${
                  mode === 'focus'
                    ? 'text-amber-500'
                    : mode === 'short_break'
                    ? 'text-emerald-400'
                    : 'text-indigo-400'
                }`}
                strokeWidth="7"
                strokeDasharray={326.72}
                strokeDashoffset={326.72 - (326.72 * timerProgressPercent) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <span className="text-5xl font-bold text-white font-mono tabular-nums tracking-tight">
                {formatMMSS(secondsLeft)}
              </span>
              <span className="text-xs font-medium text-slate-400 mt-1.5">
                {mode === 'focus'
                  ? `Focusing on ${selectedSubject}`
                  : mode === 'short_break'
                  ? 'Short Recharge Break'
                  : 'Extended Recovery Break'}
              </span>
              <span className="text-[11px] text-amber-400 font-medium mt-0.5 max-w-[170px] truncate">
                {focusTopicGoal}
              </span>
            </div>
          </div>

          {/* Primary Transport Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleResetTimer}
              className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className={`px-7 py-3 rounded-xl font-bold text-sm transition flex items-center gap-2 cursor-pointer shadow-lg ${
                isRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Block</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{mode === 'focus' ? 'Start Focus Block' : 'Start Break Timer'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleFocusBlockEnded(mode)}
              className="px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Finish current block now, sync study progress, and send browser notification"
            >
              <SkipForward className="w-4 h-4 text-amber-400" />
              <span>Complete Block Now</span>
            </button>
          </div>
        </div>

        {/* Right 5 Columns: Subject/Topic Focus + Synced User Progress + Recent Browser Alerts */}
        <div className="lg:col-span-5 space-y-4">
          {/* Subject & Topic Selector */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-semibold text-white flex items-center justify-between">
              <span>Current Focus Block Target</span>
              <span className="text-slate-400 font-normal">
                +{focusDurationMins}m on completion
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Topic / Milestone</label>
                <input
                  type="text"
                  value={focusTopicGoal}
                  onChange={(e) => setFocusTopicGoal(e.target.value)}
                  placeholder="e.g. Graph BFS & Dijkstra"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Synced Progress Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                Synced Daily & Weekly Study Progress
              </span>
              <span className="text-xs font-mono tabular-nums text-emerald-400 font-semibold">
                {todayFocusMinutes}m / {dailyTargetMinutes}m ({dailyProgressPct}%)
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400 transition-all duration-500"
                style={{ width: `${dailyProgressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
                <div className="text-[11px] text-slate-400">Focus Blocks</div>
                <div className="text-base font-bold text-white font-mono tabular-nums mt-0.5">
                  {completedPomodoroBlocks}
                </div>
                <div className="text-[10px] text-slate-500">Pomodoros done</div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
                <div className="text-[11px] text-slate-400">Today Studied</div>
                <div className="text-base font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                  {todayFocusMinutes}m
                </div>
                <div className="text-[10px] text-slate-500">
                  {(todayFocusMinutes / 60).toFixed(1)} hrs logged
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5">
                <div className="text-[11px] text-slate-400">Total Focus</div>
                <div className="text-base font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                  {(totalFocusMinutes / 60).toFixed(1)}h
                </div>
                <div className="text-[10px] text-slate-500">{totalFocusMinutes}m all-time</div>
              </div>
            </div>
          </div>

          {/* Recent Focus Block Notifications Log */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Recent Focus Block Alerts</span>
              <span className="text-slate-400">
                {notificationLogs.length} logged
              </span>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {notificationLogs.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{item.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">{item.body}</div>
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-slate-500 shrink-0">
                    {item.timestamp}
                  </span>
                </div>
              ))}
            </div>

            {onNavigateToChat && (
              <button
                type="button"
                onClick={() =>
                  onNavigateToChat(
                    `I just finished a ${focusDurationMins}-minute Pomodoro focus block on ${selectedSubject} (${focusTopicGoal}). Give me 3 rapid active-recall questions to verify my understanding.`
                  )
                }
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-amber-400 hover:text-amber-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Verify Focus Block with AI Tutor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
