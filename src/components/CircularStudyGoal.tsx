import React from 'react';
import { CheckCircle2, Flame } from 'lucide-react';

interface CircularStudyGoalProps {
  completedHours: number;
  completedMinutes?: number;
  targetHours: number;
  targetMinutes?: number;
  remainingHours: number;
  remainingMinutes: number;
  progressPercent: number;
  isGoalAchieved: boolean;
  streak?: number;
  streakTarget?: number;
  size?: number;
  strokeWidth?: number;
}

export const CircularStudyGoal: React.FC<CircularStudyGoalProps> = ({
  completedHours,
  completedMinutes,
  targetHours,
  targetMinutes,
  remainingHours,
  remainingMinutes,
  progressPercent,
  isGoalAchieved,
  streak = 0,
  streakTarget,
  size = 168,
  strokeWidth = 12,
}) => {
  const radius = (size - strokeWidth * 1.6) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, progressPercent));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  // Inner concentric streak ring geometry
  const innerStrokeWidth = Math.max(4, Math.round(strokeWidth * 0.55));
  const innerRadius = Math.max(12, radius - strokeWidth * 0.95 - 4);
  const innerCircumference = 2 * Math.PI * innerRadius;
  const resolvedStreakTarget =
    streakTarget || (streak < 3 ? 3 : streak < 7 ? 7 : streak < 14 ? 14 : 30);
  const streakPercent = Math.min(
    100,
    Math.max(0, Math.round((streak / Math.max(1, resolvedStreakTarget)) * 100))
  );
  const innerDashoffset =
    innerCircumference - (streakPercent / 100) * innerCircumference;

  const gradientId = `daily-learning-ring-${Math.round(targetHours * 10)}-${size}`;
  const streakGradientId = `streak-ring-${size}`;
  const isCompact = size < 80;

  const actualCompletedMins =
    completedMinutes !== undefined ? completedMinutes : Math.round(completedHours * 60);
  const actualTargetMins =
    targetMinutes !== undefined ? targetMinutes : Math.round(targetHours * 60);
  const displayCompletedHours = Math.round((actualCompletedMins / 60) * 10) / 10;

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 origin-center"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {isGoalAchieved ? (
                <>
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="50%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#2DD4BF" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="50%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#10B981" />
                </>
              )}
            </linearGradient>
            <linearGradient id={streakGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#FB7185" />
            </linearGradient>
            <filter id={`ringGlow-${size}`} x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation={isCompact ? '1.5' : '3.5'}
                floodColor={isGoalAchieved ? '#10B981' : '#38BDF8'}
                floodOpacity="0.45"
              />
            </filter>
          </defs>

          {/* Outer Subtle Milestone Ring */}
          {!isCompact && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius + strokeWidth * 0.65}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="3 6"
              fill="transparent"
              className={isGoalAchieved ? 'text-emerald-500/40' : 'text-slate-700/70'}
            />
          )}

          {/* Outer Background Track (Daily Study Hours) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-800/90"
          />

          {/* Outer Animated Progress Ring (Daily Study Hours) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
            filter={`url(#ringGlow-${size})`}
          />

          {/* Inner Concentric Track & Progress Ring (Study Streak) */}
          {!isCompact && (
            <>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke="currentColor"
                strokeWidth={innerStrokeWidth}
                fill="transparent"
                className="text-slate-800/70"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke={`url(#${streakGradientId})`}
                strokeWidth={innerStrokeWidth}
                strokeDasharray={innerCircumference}
                strokeDashoffset={innerDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </>
          )}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          {isCompact ? (
            <span className="text-[11px] font-black text-white">
              {clampedPercent}%
            </span>
          ) : isGoalAchieved ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-0.5 animate-bounce" />
              <span className="text-xl font-black text-white leading-tight">
                {displayCompletedHours}h <span className="text-xs font-bold text-emerald-300">/ {targetHours}h</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Goal Met ({progressPercent}%)
              </span>
              <div className="mt-1 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>{streak}d Streak</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                Daily Study Ring
              </span>
              <span className="text-xl font-black text-white tracking-tight leading-none mt-0.5">
                {displayCompletedHours}h{' '}
                <span className="text-xs text-slate-400 font-bold">/ {targetHours}h</span>
              </span>
              <span className="text-[10px] font-bold text-sky-300 mt-0.5 font-mono">
                {clampedPercent}% • {actualCompletedMins}m
              </span>
              <div className="mt-1 inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse" />
                <span>{streak}d Streak</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ring Legend (Outer = Study Hours, Inner = Streak) */}
      {!isCompact && (
        <div className="mt-2.5 flex items-center justify-center gap-3 text-[10px] text-slate-400 font-medium">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 inline-block" />
            <span>Hours ({displayCompletedHours}/{targetHours}h)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 inline-block" />
            <span>Streak ({streak}/{resolvedStreakTarget}d)</span>
          </span>
        </div>
      )}
    </div>
  );
};
