import React from 'react';
import { Target, CheckCircle2, Flame, Sparkles } from 'lucide-react';

interface CircularStudyGoalProps {
  completedHours: number;
  targetHours: number;
  remainingHours: number;
  remainingMinutes: number;
  progressPercent: number;
  isGoalAchieved: boolean;
  size?: number;
  strokeWidth?: number;
}

export const CircularStudyGoal: React.FC<CircularStudyGoalProps> = ({
  completedHours,
  targetHours,
  remainingHours,
  remainingMinutes,
  progressPercent,
  isGoalAchieved,
  size = 140,
  strokeWidth = 10,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, progressPercent));
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  const gradientId = `circle-goal-gradient-${Math.round(targetHours * 10)}`;

  return (
    <div className="flex flex-col items-center justify-center relative">
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
                  <stop offset="100%" stopColor="#2DD4BF" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="50%" stopColor="#0EA5E9" />
                  <stop offset="100%" stopColor="#10B981" />
                </>
              )}
            </linearGradient>
            <filter id="goalGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="3"
                floodColor={isGoalAchieved ? '#10B981' : '#6366F1'}
                floodOpacity="0.4"
              />
            </filter>
          </defs>

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-800/80"
          />

          {/* Progress Ring */}
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
            filter="url(#goalGlow)"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          {isGoalAchieved ? (
            <div className="flex flex-col items-center animate-bounce">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-0.5" />
              <span className="text-base font-extrabold text-white leading-tight">100%</span>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                Achieved!
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-xl font-extrabold text-white tracking-tight leading-none">
                {clampedPercent}%
              </span>
              <span className="text-[11px] font-bold text-slate-300 mt-0.5">
                {completedHours} <span className="text-slate-500 font-normal">/ {targetHours}h</span>
              </span>
              <span className="text-[9px] text-amber-400 font-medium mt-0.5 flex items-center space-x-0.5">
                <span>{remainingHours > 0 ? `${remainingHours}h left` : 'Done!'}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
