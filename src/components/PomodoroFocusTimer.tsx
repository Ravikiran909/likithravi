import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Sparkles,
  Flame,
  Coffee,
  BookOpen,
  Volume2,
  VolumeX,
  Target,
  Trophy,
  Calendar,
  Layers,
} from 'lucide-react';
import { StudentProfile, FocusSession } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface PomodoroFocusTimerProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
}

type TimerMode = 'pomodoro' | 'short_break' | 'long_break';

const MODE_DURATIONS: Record<TimerMode, number> = {
  pomodoro: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

export const PomodoroFocusTimer: React.FC<PomodoroFocusTimerProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState<number>(MODE_DURATIONS.pomodoro);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<string>(profile.subjects[0] || 'Python');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);
  const [completionAlert, setCompletionAlert] = useState<string | null>(null);

  // Cumulative Focus Stats (from profile or fallback)
  const [totalFocusMinutes, setTotalFocusMinutes] = useState<number>(
    profile.focusStats?.totalFocusMinutes || 125
  );
  const [completedSessionsCount, setCompletedSessionsCount] = useState<number>(
    profile.focusStats?.completedSessions || 5
  );
  const [todayFocusMinutes, setTodayFocusMinutes] = useState<number>(
    profile.focusStats?.todayFocusMinutes || 50
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep total duration of current mode
  const totalModeDuration = MODE_DURATIONS[mode];
  const progressPercent = Math.round(((totalModeDuration - timeLeft) / totalModeDuration) * 100);

  // Timer Tick Effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, selectedSubject]);

  // Handle Session Completion
  const handleSessionComplete = async () => {
    setIsRunning(false);

    if (soundEnabled) {
      playBeep();
    }

    if (mode === 'pomodoro') {
      const sessionMinutes = Math.round(totalModeDuration / 60);
      const newTotal = totalFocusMinutes + sessionMinutes;
      const newSessions = completedSessionsCount + 1;
      const newToday = todayFocusMinutes + sessionMinutes;

      setTotalFocusMinutes(newTotal);
      setCompletedSessionsCount(newSessions);
      setTodayFocusMinutes(newToday);

      const sessionId = `focus_${Date.now()}`;
      const newSession: FocusSession = {
        id: sessionId,
        userId: profile.userId,
        durationMinutes: sessionMinutes,
        subject: selectedSubject,
        topic: sessionNotes.trim() || `${selectedSubject} Deep Work`,
        completedAt: new Date().toISOString(),
        type: 'pomodoro',
      };

      setRecentSessions((prev) => [newSession, ...prev.slice(0, 4)]);
      setCompletionAlert(`🎉 Great job! Completed ${sessionMinutes}m deep work in ${selectedSubject}!`);

      // SAVE SESSION STATISTICS TO USER'S FIRESTORE PROFILE
      const updatedProfile: StudentProfile = {
        ...profile,
        focusStats: {
          totalFocusMinutes: newTotal,
          completedSessions: newSessions,
          todayFocusMinutes: newToday,
          lastSessionDate: todayStr,
        },
      };

      try {
        if (db && profile.userId) {
          // 1. Save stats to Firestore profile document
          await setDoc(
            doc(db, 'profiles', profile.userId),
            {
              userId: profile.userId,
              name: profile.name || 'Student',
              preferredLanguage: profile.preferredLanguage || 'en',
              focusStats: {
                totalFocusMinutes: newTotal,
                completedSessions: newSessions,
                todayFocusMinutes: newToday,
                lastSessionDate: todayStr,
              },
            },
            { merge: true }
          );

          // 2. Save individual session record in focus_sessions collection
          await setDoc(doc(db, 'focus_sessions', sessionId), newSession);
        }

        // 3. Post to backend
        await fetch(`/api/focus-sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSession),
        });
      } catch (err) {
        console.warn('Failed to save focus session stats to Firestore:', err);
      }

      onProfileUpdate(updatedProfile);

      // Auto switch to short break
      setTimeout(() => {
        setMode('short_break');
        setTimeLeft(MODE_DURATIONS.short_break);
      }, 2000);
    } else {
      setCompletionAlert('☕ Break finished! Ready for the next deep work session?');
      setTimeout(() => {
        setMode('pomodoro');
        setTimeLeft(MODE_DURATIONS.pomodoro);
      }, 2000);
    }
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODE_DURATIONS[newMode]);
    setCompletionAlert(null);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(MODE_DURATIONS[mode]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-6">
      {/* Top Banner and Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Pomodoro Focus Session
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Firestore Synced
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white mt-0.5 tracking-tight">
              Deep Work & Focus Timer
            </h3>
          </div>
        </div>

        {/* Audio Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer self-start sm:self-auto border border-slate-700"
          title={soundEnabled ? 'Mute Chime' : 'Enable Chime'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>
      </div>

      {/* Completion Toast Banner */}
      {completionAlert && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{completionAlert}</span>
          <button onClick={() => setCompletionAlert(null)} className="text-emerald-400 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Mode Selection Tabs (Focus, Short Break, Long Break) */}
      <div className="flex items-center justify-center space-x-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 max-w-md mx-auto">
        <button
          onClick={() => switchMode('pomodoro')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
            mode === 'pomodoro'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Deep Work (25m)</span>
        </button>

        <button
          onClick={() => switchMode('short_break')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
            mode === 'short_break'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Short Break (5m)</span>
        </button>

        <button
          onClick={() => switchMode('long_break')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
            mode === 'long_break'
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Long Break (15m)</span>
        </button>
      </div>

      {/* Main Circular Countdown Display */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Circular SVG Progress */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-slate-800"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Progress Stroke */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className={`transition-all duration-500 ${
                mode === 'pomodoro'
                  ? 'text-amber-500'
                  : mode === 'short_break'
                  ? 'text-emerald-400'
                  : 'text-indigo-400'
              }`}
              strokeWidth="6"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Time Countdown In Center */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-black text-white tracking-tight font-mono">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">
              {mode === 'pomodoro' ? 'Focused Study' : 'Rest & Recharge'}
            </span>
            <span className="text-[11px] font-bold text-amber-400 mt-0.5">
              {selectedSubject}
            </span>
          </div>
        </div>

        {/* Play / Pause / Reset Controls */}
        <div className="flex items-center space-x-4 mt-6">
          <button
            onClick={resetTimer}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition cursor-pointer border border-slate-700 active:scale-95"
            title="Reset timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide transition cursor-pointer active:scale-95 flex items-center space-x-2 shadow-xl ${
              isRunning
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-white" />
                <span>PAUSE SESSION</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-slate-950" />
                <span>START FOCUS</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleSessionComplete()}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition cursor-pointer border border-slate-700 active:scale-95"
            title="Complete session now"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Session Subject & Deep Work Tagging */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Subject Focus
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={isRunning}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
          >
            {profile.subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Session Goal / Topic Note
          </label>
          <input
            type="text"
            placeholder="e.g. Master Recursion base cases"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Cumulative Deep Work Statistics (Persisted in Firestore) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Completed Pomodoros</span>
          </div>
          <div className="text-xl font-black text-white mt-1">
            {completedSessionsCount} sessions
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Stored in Firestore</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total Deep Work Time</span>
          </div>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {totalFocusMinutes} mins ({Math.round((totalFocusMinutes / 60) * 10) / 10}h)
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">All-time accumulation</div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Studied Today</span>
          </div>
          <div className="text-xl font-black text-orange-400 mt-1">
            {todayFocusMinutes} mins
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{todayStr}</div>
        </div>
      </div>
    </div>
  );
};
