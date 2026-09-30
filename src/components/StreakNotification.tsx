import React, { useState, useEffect } from 'react';
import {
  Flame,
  Sparkles,
  X,
  Trophy,
  Zap,
  ArrowRight,
  Share2,
  Calendar,
  CheckCircle2,
  Bell,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface StreakNotificationProps {
  profile: StudentProfile;
  onNavigateToChat?: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  onProfileUpdate?: (updated: StudentProfile) => void;
}

export const StreakNotification: React.FC<StreakNotificationProps> = ({
  profile,
  onNavigateToChat,
  onNavigateToQuiz,
  onProfileUpdate,
}) => {
  const [showToast, setShowToast] = useState(false);
  const [isDismissedForSession, setIsDismissedForSession] = useState(false);
  const [hasCopiedShare, setHasCopiedShare] = useState(false);

  // Trigger toast alert when streak is 3 or more days
  useEffect(() => {
    if (profile.streak >= 3 && !isDismissedForSession) {
      // Check if dismissed recently in this session or show on load
      setShowToast(true);
    }
  }, [profile.streak, isDismissedForSession]);

  const handleDismissToast = () => {
    setShowToast(false);
    setIsDismissedForSession(true);
  };

  const handleTriggerToastManually = () => {
    setIsDismissedForSession(false);
    setShowToast(true);
  };

  const handleShareStreak = async () => {
    const text = `🔥 I have maintained a ${profile.streak}-day learning streak on WhatsApp AI Learning Agent! Mastered ${profile.subjects.join(', ')} with AI.`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setHasCopiedShare(true);
      setTimeout(() => setHasCopiedShare(false), 3000);
    }
  };

  // Only render if student has at least a 3-day streak
  if (profile.streak < 3) {
    return null;
  }

  // Calculate next milestone
  const nextMilestone = profile.streak < 5 ? 5 : profile.streak < 7 ? 7 : profile.streak < 14 ? 14 : 30;
  const daysToNextMilestone = nextMilestone - profile.streak;

  return (
    <>
      {/* 1. FLOATING VISUAL CELEBRATION TOAST ALERT */}
      {showToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-full animate-in slide-in-from-top-6 fade-in duration-300 drop-shadow-2xl">
          <div className="bg-gradient-to-br from-slate-900 via-amber-950/80 to-slate-900 border-2 border-amber-500/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Ambient Flame Glow Effect */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-orange-600/20 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleDismissToast}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Toast Content */}
            <div className="flex items-start space-x-3.5 relative z-10">
              {/* Animated Fiery Flame Icon */}
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-orange-500/40 animate-pulse">
                  <Flame className="w-7 h-7 text-white fill-white" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-400 text-[9px] font-black text-slate-950 items-center justify-center">
                    ★
                  </span>
                </span>
              </div>

              {/* Text Information */}
              <div className="space-y-1 pr-4 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Streak Milestone Alert</span>
                  </span>
                </div>

                <h4 className="text-base font-extrabold text-white tracking-tight flex items-center space-x-1.5">
                  <span>🔥 {profile.streak}-Day Streak Maintained!</span>
                </h4>

                <p className="text-xs text-amber-200/90 leading-relaxed">
                  Incredible momentum! You have studied for <strong>{profile.streak} consecutive days</strong>. Consistent daily practice dramatically boosts recall and exam confidence.
                </p>

                {/* Perk Badge */}
                <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>1.5x Mastery Boost Active</span>
                  </span>
                  {daysToNextMilestone > 0 && (
                    <span className="text-slate-400">
                      🎯 {daysToNextMilestone} days until {nextMilestone}-day reward!
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 flex items-center space-x-2 pt-1">
                  {onNavigateToChat && (
                    <button
                      onClick={() => {
                        handleDismissToast();
                        onNavigateToChat('I am here to continue my daily study streak!');
                      }}
                      className="flex-1 py-1.5 px-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <span>Study on WhatsApp</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {onNavigateToQuiz && (
                    <button
                      onClick={() => {
                        handleDismissToast();
                        onNavigateToQuiz();
                      }}
                      className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      Streak Quiz
                    </button>
                  )}

                  <button
                    onClick={handleShareStreak}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition cursor-pointer"
                    title="Copy streak achievement to share"
                  >
                    {hasCopiedShare ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PERSISTENT VISUAL ALERT BANNER IN DASHBOARD OVERVIEW */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-amber-500/15 via-orange-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Flame Icon & Streak Header */}
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0 animate-bounce">
              <Flame className="w-8 h-8 text-white fill-white" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>3+ Day Streak Power</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Streak Protected</span>
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-white mt-1 tracking-tight flex items-center space-x-2">
                <span>{profile.streak}-Day Learning Streak Active!</span>
                <span className="text-base text-amber-400">🔥</span>
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 max-w-xl leading-relaxed">
                You have logged in and completed study sessions for {profile.streak} days in a row. Daily consistency is the #1 predictor of academic excellence!
              </p>
            </div>
          </div>

          {/* Last 7 Days Visual Streak Tracker & Action Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
            {/* Visual 7-Day Dots Indicator */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl px-4 py-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Last 7 Days Streak</span>
                <span className="text-amber-400 font-bold">{Math.min(7, profile.streak)}/7</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {Array.from({ length: 7 }, (_, i) => {
                  const isActive = i < Math.min(7, profile.streak);
                  return (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/40 ring-1 ring-amber-400'
                          : 'bg-slate-800 text-slate-600 border border-slate-700/60'
                      }`}
                      title={isActive ? `Day ${i + 1} completed!` : `Day ${i + 1} target`}
                    >
                      {isActive ? '🔥' : i + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleTriggerToastManually}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-xl text-xs font-semibold border border-amber-500/30 transition cursor-pointer flex items-center space-x-1"
                title="Re-open streak celebration toast"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>View Alert</span>
              </button>

              {onNavigateToChat && (
                <button
                  onClick={() => onNavigateToChat('I am continuing my daily study streak!')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 shadow-md shadow-amber-500/20"
                >
                  <Flame className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                  <span>Extend Streak</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
