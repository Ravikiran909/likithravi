import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target,
  Clock,
  CheckCircle2,
  Sparkles,
  Trophy,
  Flame,
  Plus,
  Sliders,
  ArrowRight,
  RotateCcw,
  PartyPopper,
  Award,
  Heart,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';
import { CircularStudyGoal } from './CircularStudyGoal.tsx';

interface DailyStudyGoalProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  completedMinutesToday: number;
  onLogStudyMinutes: (mins: number, activityLabel?: string) => void;
  onUpdateTargetHours?: (newTargetHours: number) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
}

interface EncouragingMessageItem {
  headline: string;
  message: string;
  subtext: string;
}

const GOAL_MET_ENCOURAGING_MESSAGES: EncouragingMessageItem[] = [
  {
    headline: '🎉 Outstanding Work! You Met Your Daily Study Goal!',
    message:
      'Consistency is the ultimate superpower. Every hour you invested today compounds toward mastering DSA, Government Exams, and your core curriculum!',
    subtext: 'Your daily study target is locked in and synced to your academic profile.',
  },
  {
    headline: '🌟 Daily Study Goal Crushed — Keep Shining!',
    message:
      'You showed up, focused deeply, and completed 100% of your daily study hours goal. Take a well-deserved break or tackle a quick bonus quiz!',
    subtext: 'Top 5% consistency pace achieved for today’s learning session.',
  },
  {
    headline: '🏆 Champion Discipline! Daily Study Target Complete!',
    message:
      'Small daily victories build extraordinary exam results. Your dedication today brings you one step closer to top rank mastery!',
    subtext: 'All logged study minutes have been credited toward your weekly goal and streak.',
  },
];

export const DailyStudyGoal: React.FC<DailyStudyGoalProps> = ({
  profile,
  onProfileUpdate,
  completedMinutesToday,
  onLogStudyMinutes,
  onUpdateTargetHours,
  onNavigateToChat,
  onNavigateToQuiz,
}) => {
  const [showGoalEditor, setShowGoalEditor] = useState<boolean>(false);
  const [encouragementIdx, setEncouragementIdx] = useState<number>(0);
  const [justReachedGoal, setJustReachedGoal] = useState<boolean>(false);

  const targetHours = Math.max(0.5, Number(profile.studyHoursPerDay) || 2);
  const targetMinutes = Math.round(targetHours * 60);

  const studiedMinutes = Math.max(0, completedMinutesToday);
  const completedHours = Math.round((studiedMinutes / 60) * 100) / 100;
  const remainingMinutes = Math.max(0, targetMinutes - studiedMinutes);
  const remainingHours = Math.round((remainingMinutes / 60) * 10) / 10;

  const progressPercent = Math.min(
    100,
    Math.round((studiedMinutes / Math.max(1, targetMinutes)) * 100)
  );
  const isGoalMet = studiedMinutes >= targetMinutes;
  const bonusMinutes = Math.max(0, studiedMinutes - targetMinutes);

  // Trigger celebratory highlight when goal is met
  useEffect(() => {
    if (isGoalMet) {
      setJustReachedGoal(true);
      const timer = setTimeout(() => setJustReachedGoal(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [isGoalMet]);

  // Dynamic stage encouragement for in-progress states
  const stageEncouragement = useMemo(() => {
    if (isGoalMet) {
      return GOAL_MET_ENCOURAGING_MESSAGES[
        encouragementIdx % GOAL_MET_ENCOURAGING_MESSAGES.length
      ];
    }
    if (progressPercent >= 75) {
      return {
        headline: 'Almost There — Final Stretch!',
        message: `You're at ${progressPercent}% of your ${targetHours}h daily study goal! Just ${remainingMinutes} more minutes to unlock today's goal completion celebration.`,
        subtext: 'One short review or quiz session will push you across the finish line!',
      };
    }
    if (progressPercent >= 50) {
      return {
        headline: 'Halfway Milestone Reached!',
        message: `Great momentum, ${profile.name}! You've completed ${completedHours}h of your ${targetHours}h goal. Keep this steady focus going!`,
        subtext: `${remainingMinutes} minutes remaining to complete today's study goal.`,
      };
    }
    if (progressPercent > 0) {
      return {
        headline: 'Strong Start Today!',
        message: `You've logged ${studiedMinutes} minutes (${completedHours}h) so far. Every focused block builds momentum toward your ${targetHours}h daily target.`,
        subtext: `${remainingMinutes} minutes left to reach 100%.`,
      };
    }
    return {
      headline: 'Ready to Begin Today’s Study Goal?',
      message: `Your daily study goal is set to ${targetHours} hours (${targetMinutes} mins). Start a 25m Pomodoro or log a study session to fill your progress bar!`,
      subtext: 'Consistent daily progress is the key to long-term retention.',
    };
  }, [
    isGoalMet,
    encouragementIdx,
    progressPercent,
    targetHours,
    targetMinutes,
    remainingMinutes,
    completedHours,
    studiedMinutes,
    profile.name,
  ]);

  const handleSetTargetHours = async (hrs: number) => {
    const clamped = Math.max(0.5, Math.min(8, Math.round(hrs * 2) / 2));
    if (onUpdateTargetHours) {
      onUpdateTargetHours(clamped);
      return;
    }

    const updatedProfile: StudentProfile = {
      ...profile,
      studyHoursPerDay: clamped,
    };
    onProfileUpdate(updatedProfile);

    try {
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyHoursPerDay: clamped }),
      });
    } catch {}

    try {
      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            userId: profile.userId,
            name: profile.name || 'Student',
            preferredLanguage: profile.preferredLanguage || 'en',
            studyHoursPerDay: clamped,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch {}
  };

  const handleCompleteGoalNow = () => {
    const needed = Math.max(15, targetMinutes - studiedMinutes);
    onLogStudyMinutes(needed, 'Completed Daily Study Goal');
  };

  const handleIncrementStreak = async () => {
    const nextStreak = (profile.streak || 0) + 1;
    const todayIso = new Date().toISOString().split('T')[0];
    const updatedProfile: StudentProfile = {
      ...profile,
      streak: nextStreak,
      lastActiveDate: todayIso,
    };
    onProfileUpdate(updatedProfile);

    try {
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streak: nextStreak, lastActiveDate: todayIso }),
      });
    } catch {}

    try {
      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            userId: profile.userId,
            name: profile.name || 'Student',
            preferredLanguage: profile.preferredLanguage || 'en',
            streak: nextStreak,
            lastActiveDate: todayIso,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch {}
  };

  const currentStreak = profile.streak || 1;
  const nextStreakMilestone =
    currentStreak < 3 ? 3 : currentStreak < 7 ? 7 : currentStreak < 14 ? 14 : 30;

  const checkpoints = [
    { pct: 25, label: '25% Warmup', mins: Math.round(targetMinutes * 0.25) },
    { pct: 50, label: '50% Halfway', mins: Math.round(targetMinutes * 0.5) },
    { pct: 75, label: '75% Deep Work', mins: Math.round(targetMinutes * 0.75) },
    { pct: 100, label: '100% Goal Met', mins: targetMinutes },
  ];

  return (
    <motion.section
      layout
      aria-label="Daily Study Goal"
      className={`rounded-2xl border p-6 shadow-xl relative overflow-hidden transition-colors duration-500 ${
        isGoalMet
          ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/40 border-emerald-500/50 shadow-emerald-500/10'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      {/* Ambient Background Glow */}
      <div
        className={`absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          isGoalMet ? 'bg-emerald-500/20 opacity-100' : 'bg-indigo-500/10 opacity-60'
        }`}
      />

      <div className="relative z-10 space-y-5">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`p-2 rounded-xl border ${
                  isGoalMet
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                }`}
              >
                {isGoalMet ? (
                  <Trophy className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Target className="w-5 h-5 text-indigo-400" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-extrabold text-white">
                    Daily Study Goal & Streak Ring
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                      isGoalMet
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}
                  >
                    {isGoalMet ? '🎉 Goal Met (100%)' : `${progressPercent}% Completed`}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{currentStreak}-Day Streak</span>
                  </span>
                  {bonusMinutes > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      +{bonusMinutes}m Bonus Study
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Daily Target:{' '}
                  <strong className="text-white">{targetHours} hours/day</strong> ({targetMinutes}{' '}
                  mins) • Logged Today:{' '}
                  <strong className={isGoalMet ? 'text-emerald-400' : 'text-indigo-300'}>
                    {completedHours} hrs ({studiedMinutes} mins)
                  </strong>{' '}
                  • Streak Target: <strong className="text-amber-300">{currentStreak}/{nextStreakMilestone} days</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Right Metrics & Target Editor Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-3 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Completed
                </div>
                <div className="text-sm font-black text-emerald-400 font-mono tabular-nums">
                  {completedHours}h / {targetHours}h
                </div>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Streak
                </div>
                <div className="text-sm font-black text-amber-400 font-mono tabular-nums flex items-center space-x-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{currentStreak}d</span>
                </div>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Remaining
                </div>
                <div className="text-sm font-black text-sky-400 font-mono tabular-nums">
                  {remainingMinutes > 0 ? `${remainingHours}h (${remainingMinutes}m)` : '0m left!'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGoalEditor(!showGoalEditor)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer"
              title="Adjust daily study hours goal"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Set Goal</span>
            </button>
          </div>
        </div>

        {/* Circular Progress Ring (Daily Study Hours + Streak) & Progress Bar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5">
          {/* Left: Circular Progress Ring for Daily Study Hours & Streak */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80">
            <CircularStudyGoal
              completedHours={completedHours}
              completedMinutes={studiedMinutes}
              targetHours={targetHours}
              targetMinutes={targetMinutes}
              remainingHours={remainingHours}
              remainingMinutes={remainingMinutes}
              progressPercent={progressPercent}
              isGoalAchieved={isGoalMet}
              streak={currentStreak}
              streakTarget={nextStreakMilestone}
              size={172}
              strokeWidth={12}
            />
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleIncrementStreak}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                title="Log today's study streak day"
              >
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>+1 Streak Day ({currentStreak}d)</span>
              </button>
            </div>
          </div>

          {/* Right: Progress Bar, Checkpoints & 7-Day Streak Chain */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Daily Study Hours Progress ({studiedMinutes} / {targetMinutes} mins)
                </span>
              </span>

              <span
                className={`font-extrabold font-mono tabular-nums ${
                  isGoalMet ? 'text-emerald-400' : 'text-indigo-300'
                }`}
              >
                {completedHours} hrs of {targetHours} hrs ({progressPercent}%)
              </span>
            </div>

            {/* Animated Progress Bar Track */}
            <div
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Daily Study Goal Progress Bar"
              className="w-full h-5 bg-slate-900 rounded-full p-1 border border-slate-800 overflow-hidden relative shadow-inner"
            >
              {/* Quarter Checkpoint Tick Marks */}
              {[25, 50, 75].map((tick) => (
                <div
                  key={tick}
                  style={{ left: `${tick}%` }}
                  className="absolute top-0 bottom-0 w-px bg-slate-700/60 z-10 pointer-events-none"
                />
              ))}

              <motion.div
                initial={false}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full relative overflow-hidden ${
                  isGoalMet
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 shadow-lg shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-400 shadow-md shadow-indigo-500/20'
                }`}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </motion.div>
            </div>

            {/* Checkpoint Pills Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {checkpoints.map((cp) => {
                const reached = studiedMinutes >= cp.mins;
                return (
                  <div
                    key={cp.pct}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] flex items-center justify-between transition ${
                      reached
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-bold'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="flex items-center space-x-1">
                      {reached ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                      )}
                      <span>{cp.label}</span>
                    </span>
                    <span className="font-mono text-[10px] opacity-80">{cp.mins}m</span>
                  </div>
                );
              })}
            </div>

            {/* 7-Day Study Streak Progress Strip */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white">
                    {currentStreak}-Day Continuous Study Streak
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {Math.max(0, nextStreakMilestone - currentStreak) > 0
                      ? `${nextStreakMilestone - currentStreak} more days to unlock ${nextStreakMilestone}-Day Streak Milestone`
                      : `${nextStreakMilestone}-Day Streak Milestone Unlocked!`}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {Array.from({ length: 7 }, (_, idx) => {
                  const dayNum = idx + 1;
                  const active = dayNum <= Math.min(7, currentStreak);
                  return (
                    <div
                      key={dayNum}
                      className={`w-7 h-7 rounded-lg flex flex-col items-center justify-center text-[10px] font-extrabold border transition ${
                        active
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-300 text-slate-950 shadow-sm shadow-amber-500/30'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                      title={`Streak Day ${dayNum}`}
                    >
                      <span>{active ? '🔥' : `D${dayNum}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Encouraging Message Banner (Celebratory when Goal is Met, Motivational while in progress) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isGoalMet ? `goal-met-${encouragementIdx}` : `stage-${progressPercent}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: justReachedGoal ? [1, 1.015, 1] : 1,
            }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className={`rounded-2xl p-4 border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isGoalMet
                ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-amber-500/15 border-emerald-400/50 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-950/80 border-slate-800'
            }`}
          >
            <div className="flex items-start space-x-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isGoalMet
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20'
                    : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                }`}
              >
                {isGoalMet ? (
                  <Sparkles className="w-6 h-6 text-emerald-300 animate-pulse" />
                ) : (
                  <Flame className="w-5 h-5 text-amber-400" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4
                    className={`text-sm font-extrabold ${
                      isGoalMet ? 'text-emerald-200' : 'text-white'
                    }`}
                  >
                    {stageEncouragement.headline}
                  </h4>
                  {isGoalMet && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
                      Daily Goal Achieved
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed max-w-2xl">
                  {stageEncouragement.message}
                </p>
                <p className="text-[11px] text-slate-400">{stageEncouragement.subtext}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isGoalMet ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setEncouragementIdx(
                        (prev) => (prev + 1) % GOAL_MET_ENCOURAGING_MESSAGES.length
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Next Note</span>
                  </button>
                  {onNavigateToChat && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigateToChat(
                          `I just completed my ${targetHours}-hour Daily Study Goal (${studiedMinutes} mins studied today)! Celebrate with me and suggest a quick recap question.`
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <span>Share with AI Tutor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteGoalNow}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center space-x-1.5 active:scale-95"
                  title="Log remaining minutes to complete your daily study goal and view the encouraging celebration message"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Complete Daily Goal ({remainingMinutes}m)</span>
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Quick Study Time Loggers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">
              Quick Log Study Time:
            </span>
            {[
              { mins: 15, label: '+15m Review' },
              { mins: 25, label: '+25m Pomodoro' },
              { mins: 30, label: '+30m DSA Practice' },
              { mins: 45, label: '+45m Mock Class' },
              { mins: 60, label: '+1h Deep Study' },
            ].map((item) => (
              <button
                key={item.mins}
                type="button"
                onClick={() => onLogStudyMinutes(item.mins, item.label)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition flex items-center space-x-1 cursor-pointer active:scale-95"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {onNavigateToQuiz && (
            <button
              type="button"
              onClick={onNavigateToQuiz}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Earn Study Mins via Adaptive Quiz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Adjustable Daily Target Hours Drawer */}
        <AnimatePresence>
          {showGoalEditor && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Customize Daily Study Hours Goal</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select your target daily study hours. Changes sync immediately with your progress bar and Firestore profile.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[1, 1.5, 2, 2.5, 3, 4, 5].map((hrs) => {
                    const isSelected = Math.abs(targetHours - hrs) < 0.05;
                    return (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => handleSetTargetHours(hrs)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {hrs}h ({Math.round(hrs * 60)}m)
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
};
