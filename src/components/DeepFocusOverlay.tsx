import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  BellOff,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Coffee,
  Flame,
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface DeepFocusOverlayProps {
  profile: StudentProfile;
  isActive: boolean;
  onToggleDeepFocus: (nextState: boolean) => void;
  onSessionMinutesLogged?: (mins: number) => void;
}

type FocusModeType = 'pomodoro' | 'short_break' | 'long_break';

const DURATIONS: Record<FocusModeType, number> = {
  pomodoro: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

export const DeepFocusOverlay: React.FC<DeepFocusOverlayProps> = ({
  profile,
  isActive,
  onToggleDeepFocus,
  onSessionMinutesLogged,
}) => {
  const [mode, setMode] = useState<FocusModeType>('pomodoro');
  const [secondsLeft, setSecondsLeft] = useState<number>(DURATIONS.pomodoro);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [focusTopic, setFocusTopic] = useState<string>(
    profile.weakTopics && profile.weakTopics.length > 0
      ? profile.weakTopics[0]
      : profile.subjects[0] || 'Deep Curriculum Study'
  );
  const [deferredCount, setDeferredCount] = useState<number>(
    profile.mutedNotificationsCount || 2
  );
  const [completedBanner, setCompletedBanner] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically start running countdown when Deep Focus is activated
  useEffect(() => {
    if (isActive) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handleTimerCompleted();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isRunning, mode]);

  const handleTimerCompleted = () => {
    setIsRunning(false);
    if (soundEnabled) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch {}
    }

    if (mode === 'pomodoro') {
      if (onSessionMinutesLogged) onSessionMinutesLogged(25);
      setCompletedBanner(`🎉 25m Deep Focus completed on "${focusTopic}"! +25m logged.`);
      setMode('short_break');
      setSecondsLeft(DURATIONS.short_break);
    } else {
      setCompletedBanner('☕ Break complete! Ready for the next Deep Focus sprint.');
      setMode('pomodoro');
      setSecondsLeft(DURATIONS.pomodoro);
    }
  };

  if (!isActive) return null;

  const totalDuration = DURATIONS[mode];
  const progressPercent = Math.round(((totalDuration - secondsLeft) / totalDuration) * 100);
  const mins = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const secs = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <>
      {/* Floating / Expandable Pomodoro & WhatsApp DND Overlay */}
      <div
        className={`fixed z-50 transition-all duration-300 ${
          isExpanded
            ? 'inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4'
            : 'bottom-5 right-5 max-w-sm w-full'
        }`}
      >
        <div
          className={`bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border-2 border-amber-500/50 rounded-3xl shadow-2xl shadow-amber-500/10 text-white overflow-hidden ${
            isExpanded ? 'max-w-xl w-full p-8 space-y-6' : 'p-4 space-y-3.5'
          }`}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <BellOff className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Deep Focus Mode Active
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-[10px] text-slate-400">
                  Non-emergency WhatsApp notifications muted ({deferredCount} deferred)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title={soundEnabled ? 'Mute Timer Chime' : 'Unmute Timer Chime'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title={isExpanded ? 'Minimize to floating HUD' : 'Expand full focus overlay'}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onToggleDeepFocus(false)}
                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                title="Exit Deep Focus & Unmute WhatsApp"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {completedBanner && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
              <span>{completedBanner}</span>
              <button
                type="button"
                onClick={() => setCompletedBanner(null)}
                className="text-emerald-300 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mode Selector Pills */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setMode('pomodoro');
                setSecondsLeft(DURATIONS.pomodoro);
                setIsRunning(false);
              }}
              className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer flex items-center justify-center space-x-1 ${
                mode === 'pomodoro'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Focus 25m</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('short_break');
                setSecondsLeft(DURATIONS.short_break);
                setIsRunning(false);
              }}
              className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer flex items-center justify-center space-x-1 ${
                mode === 'short_break'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coffee className="w-3 h-3" />
              <span>Break 5m</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('long_break');
                setSecondsLeft(DURATIONS.long_break);
                setIsRunning(false);
              }}
              className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer flex items-center justify-center space-x-1 ${
                mode === 'long_break'
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Long 15m</span>
            </button>
          </div>

          {/* Timer Display & Controls */}
          <div className="flex items-center justify-between gap-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Current Focus Target
              </div>
              <div className="text-xs font-bold text-amber-300 truncate max-w-[160px]">
                {focusTopic}
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mt-1">
                {mins}:{secs}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-lg ${
                  isRunning
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Resume</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRunning(false);
                  setSecondsLeft(DURATIONS[mode]);
                }}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Session Progress ({progressPercent}%)</span>
              <button
                type="button"
                onClick={() => setDeferredCount((c) => c + 1)}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                🔕 Test Mute Non-Urgent Ping
              </button>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {isExpanded && (
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Active Study Topic During Deep Focus
                </label>
                <input
                  type="text"
                  value={focusTopic}
                  onChange={(e) => setFocusTopic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between">
                <span>
                  🛡️ <strong>WhatsApp DND Shield:</strong> Daily nudges & non-urgent chat pings are queued silently until your Pomodoro ends.
                </span>
                <button
                  type="button"
                  onClick={() => handleTimerCompleted()}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-[11px] shrink-0 ml-3 cursor-pointer"
                >
                  Complete & Log +25m
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
