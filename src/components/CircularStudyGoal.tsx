import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface CircularStudyGoalProps {
  completedHours: number;
  completedMinutes?: number;
  targetHours: number;
  targetMinutes?: number;
  remainingHours: number;
  remainingMinutes: number;
  progressPercent: number;
  isGoalAchieved: boolean;
  size?: number;
  strokeWidth?: number;
}

export const CircularStudyGoal: React.FC<CircularStudyGoalProps> = ({
  completedHours,
  completedMinutes,
  targetHours,
  progressPercent,
  isGoalAchieved,
  size = 168,
  strokeWidth = 12,
}) => {
  const radius = (size - strokeWidth * 1.6) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, progressPercent));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  const gradientId = `daily-learning-ring-${Math.round(targetHours * 10)}-${size}`;
  const isCompact = size < 80;

  const actualCompletedMins =
    completedMinutes !== undefined ? completedMinutes : Math.round(completedHours * 60);
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

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-800/90"
          />

          {/* Animated Progress Ring */}
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
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          {isCompact ? (
            <span className="text-[11px] font-black text-white">
              {clampedPercent}%
            </span>
          ) : isGoalAchieved ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-0.5" />
              <span className="text-xl font-black text-white leading-tight">
                {displayCompletedHours}h <span className="text-xs font-bold text-emerald-300">/ {targetHours}h</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Goal Met ({progressPercent}%)
              </span>
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
              <span className="text-[10px] font-bold text-sky-300 mt-1 font-mono tabular-nums">
                {clampedPercent}% · {actualCompletedMins}m
              </span>
            </div>
          )}
        </div>
      </div>

      {!isCompact && (
        <div className="mt-2.5 flex items-center justify-center gap-3 text-[10px] text-slate-400 font-medium">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 inline-block" />
            <span>Study Hours ({displayCompletedHours}/{targetHours}h)</span>
          </span>
        </div>
      )}
    </div>
  );
};
