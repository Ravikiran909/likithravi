import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Zap,
  Trophy,
  CheckCircle2,
  Sparkles,
  Target,
  Play,
  RotateCcw,
  Award,
  Plus,
  Sliders,
  ArrowRight,
  Brain,
  Check,
  Shield,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface DailyQuizStreakCounterProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToQuiz: () => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

interface StreakLightningQuestion {
  id: string;
  subject: 'DSA' | 'Government Exams' | 'Python' | 'Mathematics';
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const STREAK_LIGHTNING_QUESTIONS: StreakLightningQuestion[] = [
  {
    id: 'slq_1',
    subject: 'DSA',
    topic: 'Dynamic Programming — Memoization',
    question: 'What is the time complexity of computing the N-th Fibonacci number using top-down DP (memoization)?',
    options: ['O(2^N)', 'O(N)', 'O(N log N)', 'O(N^2)'],
    correctIndex: 1,
    explanation: 'Each state fib(k) for k = 0..N is computed once and cached in O(1) lookup time, yielding O(N) time complexity.',
  },
  {
    id: 'slq_2',
    subject: 'Government Exams',
    topic: 'Indian Polity — Fundamental Rights',
    question: 'Which Article of the Indian Constitution was described by Dr. B.R. Ambedkar as the "Heart and Soul of the Constitution"?',
    options: ['Article 14', 'Article 19', 'Article 21', 'Article 32'],
    correctIndex: 3,
    explanation: 'Article 32 grants the Right to Constitutional Remedies, allowing citizens to move the Supreme Court directly for enforcement of Fundamental Rights.',
  },
  {
    id: 'slq_3',
    subject: 'DSA',
    topic: 'Graph Algorithms — Dijkstra',
    question: 'Which data structure is used in standard Dijkstra’s algorithm to efficiently extract the vertex with the minimum tentative distance?',
    options: ['FIFO Queue', 'LIFO Stack', 'Min-Priority Queue (Binary Heap)', 'Disjoint Set Union'],
    correctIndex: 2,
    explanation: 'A Min-Priority Queue extracts the minimum-distance vertex in O(log V) time, giving O((V + E) log V) overall complexity.',
  },
  {
    id: 'slq_4',
    subject: 'Government Exams',
    topic: 'Quantitative Aptitude — Compound Interest',
    question: 'At 10% per annum compound interest, what is the effective percentage increase on a principal after 2 years?',
    options: ['20%', '20.5%', '21%', '22%'],
    correctIndex: 2,
    explanation: 'Using successive percentage formula: a + b + (a×b)/100 = 10 + 10 + (100/100) = 21%.',
  },
  {
    id: 'slq_5',
    subject: 'Python',
    topic: 'Closures & Lexical Scope',
    question: 'Which keyword in Python 3 allows a nested inner function to rebind a variable defined in its enclosing non-global scope?',
    options: ['global', 'nonlocal', 'extern', 'static'],
    correctIndex: 1,
    explanation: 'The `nonlocal` keyword binds variables to the nearest enclosing function scope rather than creating a new local variable.',
  },
];

interface EmberParticle {
  id: number;
  xOffset: number;
  delay: number;
  scale: number;
  color: string;
}

const EMBER_PARTICLES: EmberParticle[] = [
  { id: 1, xOffset: -42, delay: 0, scale: 1.1, color: 'bg-amber-400' },
  { id: 2, xOffset: -24, delay: 0.12, scale: 0.85, color: 'bg-orange-500' },
  { id: 3, xOffset: -8, delay: 0.25, scale: 1.25, color: 'bg-yellow-300' },
  { id: 4, xOffset: 10, delay: 0.08, scale: 0.95, color: 'bg-rose-500' },
  { id: 5, xOffset: 26, delay: 0.18, scale: 1.15, color: 'bg-amber-300' },
  { id: 6, xOffset: 44, delay: 0.3, scale: 0.9, color: 'bg-orange-400' },
  { id: 7, xOffset: -32, delay: 0.35, scale: 1.0, color: 'bg-rose-400' },
  { id: 8, xOffset: 18, delay: 0.4, scale: 1.2, color: 'bg-yellow-400' },
];

export const DailyQuizStreakCounter: React.FC<DailyQuizStreakCounterProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToQuiz,
  onNavigateToChat,
  onLogStudyMinutes,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const streakCelebratedKey = `daily_quiz_streak_ignited_${profile.userId}_${todayStr}`;

  // Daily Quiz Target (default 5 or synced with profile.dailyQuestionsGoal)
  const [dailyTarget, setDailyTarget] = useState<number>(() => {
    return profile.dailyQuestionsGoal && profile.dailyQuestionsGoal > 0
      ? profile.dailyQuestionsGoal
      : 5;
  });

  // Questions answered today
  const [questionsToday, setQuestionsToday] = useState<number>(() => {
    if (typeof profile.questionsAnsweredToday === 'number') {
      return profile.questionsAnsweredToday;
    }
    try {
      const saved = localStorage.getItem(`daily_questions_${profile.userId}_${todayStr}`);
      if (saved !== null) return Number(saved);
    } catch {}
    return 3;
  });

  // Whether the fire ignition celebration animation is actively bursting
  const [isIgniting, setIsIgniting] = useState<boolean>(false);
  const [streakIncrementedToday, setStreakIncrementedToday] = useState<boolean>(() => {
    try {
      return localStorage.getItem(streakCelebratedKey) === 'true';
    } catch {
      return false;
    }
  });
  const [showTargetEditor, setShowTargetEditor] = useState<boolean>(false);
  const [showQuickQuiz, setShowQuickQuiz] = useState<boolean>(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const prevTargetCompletedRef = useRef<boolean>(questionsToday >= dailyTarget);

  // Sync with external profile updates (e.g., when AdaptiveQuiz or DailyLearningGoalTracker updates profile)
  useEffect(() => {
    if (
      typeof profile.questionsAnsweredToday === 'number' &&
      profile.questionsAnsweredToday !== questionsToday
    ) {
      setQuestionsToday(profile.questionsAnsweredToday);
    }
  }, [profile.questionsAnsweredToday]);

  useEffect(() => {
    if (
      typeof profile.dailyQuestionsGoal === 'number' &&
      profile.dailyQuestionsGoal > 0 &&
      profile.dailyQuestionsGoal !== dailyTarget
    ) {
      setDailyTarget(profile.dailyQuestionsGoal);
    }
  }, [profile.dailyQuestionsGoal]);

  const isDailyTargetComplete = questionsToday >= dailyTarget;
  const progressPercent = Math.min(100, Math.round((questionsToday / Math.max(1, dailyTarget)) * 100));
  const remainingQuestions = Math.max(0, dailyTarget - questionsToday);

  // Trigger fire celebration animation automatically when transitioning from incomplete -> complete
  useEffect(() => {
    if (!prevTargetCompletedRef.current && isDailyTargetComplete) {
      triggerFireCelebration();
    }
    prevTargetCompletedRef.current = isDailyTargetComplete;
  }, [isDailyTargetComplete]);

  const triggerFireCelebration = () => {
    setIsIgniting(true);
    setTimeout(() => {
      setIsIgniting(false);
    }, 3800);
  };

  // Persist updated quiz progress and streak to backend & Firestore
  const syncProfileProgress = async (
    nextQuestionsToday: number,
    nextDailyTarget: number,
    options?: { answeredDelta?: number; correctDelta?: number; forceStreakIncrement?: boolean }
  ) => {
    const answeredDelta = options?.answeredDelta ?? 0;
    const correctDelta = options?.correctDelta ?? 0;
    const reachedTargetNow = nextQuestionsToday >= nextDailyTarget;

    let nextStreak = profile.streak;
    let didIncrementStreak = false;

    if ((reachedTargetNow && !streakIncrementedToday) || options?.forceStreakIncrement) {
      nextStreak = profile.streak + 1;
      didIncrementStreak = true;
      setStreakIncrementedToday(true);
      try {
        localStorage.setItem(streakCelebratedKey, 'true');
      } catch {}
    }

    try {
      localStorage.setItem(`daily_questions_${profile.userId}_${todayStr}`, String(nextQuestionsToday));
    } catch {}

    const updatedProfile: StudentProfile = {
      ...profile,
      questionsAnsweredToday: nextQuestionsToday,
      dailyQuestionsGoal: nextDailyTarget,
      streak: nextStreak,
      lastActiveDate: new Date().toISOString(),
      totalQuestionsAnswered: profile.totalQuestionsAnswered + answeredDelta,
      correctAnswers: profile.correctAnswers + correctDelta,
      overallProgress: Math.min(100, profile.overallProgress + (didIncrementStreak ? 2 : answeredDelta > 0 ? 1 : 0)),
    };

    onProfileUpdate(updatedProfile);

    try {
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionsAnsweredToday: updatedProfile.questionsAnsweredToday,
          dailyQuestionsGoal: updatedProfile.dailyQuestionsGoal,
          streak: updatedProfile.streak,
          lastActiveDate: updatedProfile.lastActiveDate,
          totalQuestionsAnswered: updatedProfile.totalQuestionsAnswered,
          correctAnswers: updatedProfile.correctAnswers,
          overallProgress: updatedProfile.overallProgress,
        }),
      });
    } catch {}

    try {
      const profileRef = doc(db, 'profiles', profile.userId);
      await setDoc(
        profileRef,
        {
          userId: profile.userId,
          questionsAnsweredToday: updatedProfile.questionsAnsweredToday,
          dailyQuestionsGoal: updatedProfile.dailyQuestionsGoal,
          streak: updatedProfile.streak,
          lastActiveDate: updatedProfile.lastActiveDate,
          totalQuestionsAnswered: updatedProfile.totalQuestionsAnswered,
          correctAnswers: updatedProfile.correctAnswers,
          overallProgress: updatedProfile.overallProgress,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {}

    if (didIncrementStreak) {
      triggerFireCelebration();
      setStatusBanner(
        `🔥 Daily Quiz Target Complete (${nextQuestionsToday}/${nextDailyTarget})! Your streak ignited to ${nextStreak} days!`
      );
      setTimeout(() => setStatusBanner(null), 5500);
    } else if (reachedTargetNow) {
      triggerFireCelebration();
      setStatusBanner(
        `🔥 Daily Target Active (${nextQuestionsToday}/${nextDailyTarget} questions)! Fire streak burning strong at ${nextStreak} days!`
      );
      setTimeout(() => setStatusBanner(null), 4500);
    } else {
      setStatusBanner(
        `+1 Quiz question logged (${nextQuestionsToday}/${nextDailyTarget})! ${Math.max(
          0,
          nextDailyTarget - nextQuestionsToday
        )} more to ignite today's fire streak!`
      );
      setTimeout(() => setStatusBanner(null), 3500);
    }
  };

  // Increment +1 question
  const handleLogOneQuestion = async () => {
    const nextCount = questionsToday + 1;
    setQuestionsToday(nextCount);
    if (onLogStudyMinutes) {
      onLogStudyMinutes(5, 'Daily Streak Quiz Question');
    }
    await syncProfileProgress(nextCount, dailyTarget, { answeredDelta: 1, correctDelta: 1 });
  };

  // Complete entire remaining daily target immediately & animate fire icon
  const handleCompleteDailyTargetNow = async () => {
    const needed = Math.max(1, dailyTarget - questionsToday);
    const nextCount = Math.max(dailyTarget, questionsToday + 1);
    setQuestionsToday(nextCount);
    if (onLogStudyMinutes) {
      onLogStudyMinutes(needed * 5, 'Completed Daily Quiz Streak Target');
    }
    await syncProfileProgress(nextCount, dailyTarget, {
      answeredDelta: needed,
      correctDelta: needed,
      forceStreakIncrement: !streakIncrementedToday,
    });
  };

  // Update daily target preset
  const handleChangeDailyTarget = async (newTarget: number) => {
    const clamped = Math.max(1, Math.min(30, newTarget));
    setDailyTarget(clamped);
    await syncProfileProgress(questionsToday, clamped);
  };

  // Reset today's counter to test the progression from 0 -> target completion animation
  const handleResetDailyProgressDemo = async () => {
    setQuestionsToday(0);
    setStreakIncrementedToday(false);
    prevTargetCompletedRef.current = false;
    try {
      localStorage.removeItem(streakCelebratedKey);
      localStorage.setItem(`daily_questions_${profile.userId}_${todayStr}`, '0');
    } catch {}
    const updatedProfile: StudentProfile = {
      ...profile,
      questionsAnsweredToday: 0,
    };
    onProfileUpdate(updatedProfile);
    setStatusBanner('Daily quiz counter reset to 0 — answer questions or click Complete Target to watch the fire ignition!');
    setTimeout(() => setStatusBanner(null), 4000);
  };

  // Submit answer in the inline Lightning Quiz
  const currentQuestion = STREAK_LIGHTNING_QUESTIONS[currentQuizIndex % STREAK_LIGHTNING_QUESTIONS.length];

  const handleSubmitLightningAnswer = async () => {
    if (selectedOption === null || answerSubmitted) return;
    setAnswerSubmitted(true);
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    const nextCount = questionsToday + 1;
    setQuestionsToday(nextCount);

    if (onLogStudyMinutes) {
      onLogStudyMinutes(5, `Streak Quiz: ${currentQuestion.topic}`);
    }

    await syncProfileProgress(nextCount, dailyTarget, {
      answeredDelta: 1,
      correctDelta: isCorrect ? 1 : 0,
    });
  };

  const handleNextLightningQuestion = () => {
    setSelectedOption(null);
    setAnswerSubmitted(false);
    setCurrentQuizIndex((prev) => (prev + 1) % STREAK_LIGHTNING_QUESTIONS.length);
  };

  // Determine Fire Tier based on streak count
  const getStreakFlameTier = (streakDays: number) => {
    if (streakDays >= 30) {
      return {
        label: 'Supernova Flame',
        multiplier: '3.0x XP Boost',
        badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
      };
    }
    if (streakDays >= 14) {
      return {
        label: 'Inferno Streak',
        multiplier: '2.5x XP Boost',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    }
    if (streakDays >= 7) {
      return {
        label: 'Wildfire Streak',
        multiplier: '2.0x XP Boost',
        badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      };
    }
    return {
      label: 'Kindling Flame',
      multiplier: '1.5x XP Boost',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  };

  const flameTier = getStreakFlameTier(profile.streak);

  // Build 7-day weekly flame chain (Mon-Sun ending Today)
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayIdx = new Date().getDay();
  const sevenDayChain = Array.from({ length: 7 }, (_, idx) => {
    const offsetFromToday = 6 - idx; // 6 days ago .. 0 (today)
    const d = new Date();
    d.setDate(d.getDate() - offsetFromToday);
    const label = offsetFromToday === 0 ? 'Today' : dayLabels[d.getDay()];
    const isToday = offsetFromToday === 0;
    const isLit = isToday
      ? isDailyTargetComplete
      : offsetFromToday <= Math.max(0, profile.streak - (isDailyTargetComplete ? 1 : 0));
    return {
      key: idx,
      label,
      isToday,
      isLit,
    };
  });

  // SVG Ring dimensions around the Fire Icon
  const ringSize = 116;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <motion.div
      layout
      className={`rounded-2xl border p-6 shadow-xl relative overflow-hidden transition-colors duration-500 ${
        isDailyTargetComplete
          ? 'bg-gradient-to-br from-orange-950/60 via-slate-900 to-amber-950/40 border-orange-500/50 shadow-orange-500/10'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      {/* Background Ambient Fire Glow */}
      <div
        className={`absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          isDailyTargetComplete
            ? 'bg-gradient-to-br from-orange-500/25 via-amber-500/15 to-rose-500/10 opacity-100'
            : 'bg-amber-500/5 opacity-60'
        }`}
      />
      <div
        className={`absolute -bottom-24 -left-20 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
          isDailyTargetComplete ? 'bg-amber-500/15 opacity-100' : 'bg-indigo-500/5 opacity-40'
        }`}
      />

      <div className="relative z-10 space-y-5">
        {/* Top Row: Animated Fire Icon Visual Counter + Streak Details + Action Controls */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left: Animated Fire Icon Ring & Visual Counter */}
          <div className="flex flex-col sm:flex-row items-center gap-5 w-full lg:w-auto">
            {/* Circular Progress + Animated Flame Container */}
            <div className="relative flex items-center justify-center shrink-0" style={{ width: ringSize, height: ringSize }}>
              {/* Pulsing Halo when Daily Target is Completed */}
              <AnimatePresence>
                {(isDailyTargetComplete || isIgniting) && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{
                      scale: isIgniting ? [1, 1.32, 1.12] : [1, 1.12, 1],
                      opacity: isIgniting ? [0.85, 0.4, 0.7] : [0.45, 0.75, 0.45],
                    }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{
                      duration: isIgniting ? 0.9 : 2.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-1 rounded-full bg-gradient-to-tr from-orange-500/40 via-amber-400/35 to-rose-500/30 blur-md pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Floating Ember Sparks on Completion / Ignition */}
              <AnimatePresence>
                {(isIgniting || isDailyTargetComplete) &&
                  EMBER_PARTICLES.map((particle) => (
                    <motion.span
                      key={particle.id}
                      initial={{ opacity: 0, y: 18, x: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        y: isIgniting ? [-6, -54] : [-4, -36],
                        x: [0, particle.xOffset],
                        scale: [0, particle.scale, 0.2],
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: isIgniting ? 1.1 : 2.4,
                        repeat: Infinity,
                        delay: particle.delay,
                        ease: 'easeOut',
                      }}
                      className={`absolute w-2 h-2 rounded-full ${particle.color} shadow-sm shadow-amber-300 pointer-events-none`}
                    />
                  ))}
              </AnimatePresence>

              {/* SVG Circular Target Progress Ring */}
              <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${ringSize} ${ringSize}`}>
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  className="text-slate-800/90"
                />
                <motion.circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="transparent"
                  stroke="url(#fireStreakGradient)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.65, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="fireStreakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Fire Icon & Animated Streak Counter */}
              <motion.button
                type="button"
                onClick={triggerFireCelebration}
                title="Click to trigger fire streak animation"
                animate={
                  isIgniting
                    ? {
                        scale: [1, 1.28, 0.94, 1.18, 1],
                        rotate: [0, -10, 10, -6, 0],
                      }
                    : isDailyTargetComplete
                    ? {
                        scale: [1, 1.06, 1],
                        y: [0, -2, 0],
                      }
                    : { scale: 1, y: 0 }
                }
                transition={{
                  duration: isIgniting ? 0.85 : 2.0,
                  repeat: isDailyTargetComplete && !isIgniting ? Infinity : 0,
                  ease: 'easeInOut',
                }}
                className={`absolute inset-3 rounded-full flex flex-col items-center justify-center cursor-pointer border transition-all ${
                  isDailyTargetComplete
                    ? 'bg-gradient-to-b from-orange-500/30 via-amber-500/20 to-slate-950 border-orange-400/50 shadow-inner'
                    : 'bg-slate-950/90 border-slate-800 hover:border-amber-500/40'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  {/* Outer Flame Icon */}
                  <Flame
                    className={`w-9 h-9 transition-all duration-300 ${
                      isDailyTargetComplete
                        ? 'text-orange-400 fill-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.85)]'
                        : questionsToday > 0
                        ? 'text-amber-400 fill-amber-500/40'
                        : 'text-slate-500'
                    }`}
                  />
                  {/* Inner Bright Flame Core when target completed */}
                  {isDailyTargetComplete && (
                    <motion.div
                      animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="absolute bottom-1"
                    >
                      <Flame className="w-4 h-4 text-yellow-200 fill-yellow-300" />
                    </motion.div>
                  )}
                </div>

                {/* Animated Day Counter inside the Flame Ring */}
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={profile.streak}
                    initial={{ y: 10, opacity: 0, scale: 0.7 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -10, opacity: 0, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                    className={`text-sm font-black tracking-tight leading-none mt-0.5 ${
                      isDailyTargetComplete ? 'text-amber-200' : 'text-white'
                    }`}
                  >
                    {profile.streak}d
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Center-Left: Title, Animated Counter Readout, and Status Badges */}
            <div className="space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                    isDailyTargetComplete
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm shadow-orange-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${isDailyTargetComplete ? 'text-orange-400 fill-orange-400' : 'text-amber-400'}`} />
                  <span>Daily Quiz Streak</span>
                </span>

                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${flameTier.badgeClass}`}>
                  {flameTier.label} • {flameTier.multiplier}
                </span>

                {isDailyTargetComplete && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Daily Target Complete!</span>
                  </motion.span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                <div className="flex items-baseline justify-center sm:justify-start space-x-2">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={profile.streak}
                      initial={{ y: 16, opacity: 0, scale: 0.8 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: -16, opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      className="text-3xl sm:text-4xl font-black tracking-tight text-white"
                    >
                      {profile.streak}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-base font-bold text-amber-400">
                    Day Quiz Streak {isDailyTargetComplete ? '🔥' : ''}
                  </span>
                </div>

                <span className="text-xs text-slate-400">
                  • Today&apos;s Target:{' '}
                  <strong className={isDailyTargetComplete ? 'text-emerald-400' : 'text-white'}>
                    {questionsToday} / {dailyTarget} Quiz Questions
                  </strong>{' '}
                  ({progressPercent}%)
                </span>
              </div>

              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {isDailyTargetComplete
                  ? `You crushed your ${dailyTarget}-question daily quiz target! Your fire indicator is lit and your ${profile.streak}-day streak is locked in.`
                  : `Answer ${remainingQuestions} more quiz question${
                      remainingQuestions === 1 ? '' : 's'
                    } today to ignite the fire indicator and extend your ${profile.streak}-day streak!`}
              </p>
            </div>
          </div>

          {/* Right: Interactive Actions & Quick Quiz Toggle */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowQuickQuiz(!showQuickQuiz)}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-orange-500/20 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>{showQuickQuiz ? 'Hide 1-Min Streak Quiz' : '1-Min Streak Quiz'}</span>
            </button>

            {!isDailyTargetComplete ? (
              <button
                type="button"
                onClick={handleCompleteDailyTargetNow}
                className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                title="Complete remaining daily target questions and trigger the fire streak animation"
              >
                <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                <span>Complete Target &amp; Ignite 🔥</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={triggerFireCelebration}
                className="px-3.5 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 border border-orange-500/40 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                title="Replay the daily target fire celebration animation"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Replay Fire Animation 🔥</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogOneQuestion}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition flex items-center space-x-1 cursor-pointer active:scale-95"
              title="Log +1 completed quiz question toward today's target"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>+1 Question</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTargetEditor(!showTargetEditor)}
              className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Customize daily quiz target"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Animated Celebration Toast Banner when Daily Target Ignites */}
        <AnimatePresence>
          {statusBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-emerald-500/20 border border-orange-400/40 flex items-center justify-between gap-3"
            >
              <div className="flex items-center space-x-2.5">
                <Flame className="w-5 h-5 text-orange-400 fill-orange-400 animate-bounce shrink-0" />
                <span className="text-xs font-bold text-amber-100">{statusBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-[11px] font-semibold text-amber-300 hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Segmented Flame Node Progress Bar & 7-Day Streak Chain */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4">
          {/* Left 7 Cols: Daily Quiz Target Flame Nodes + Progress Bar */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                <Target className="w-3.5 h-3.5 text-orange-400" />
                <span>Daily Quiz Target Checkpoints ({questionsToday}/{dailyTarget})</span>
              </span>
              <div className="flex items-center space-x-3">
                <span className={`font-extrabold ${isDailyTargetComplete ? 'text-orange-400' : 'text-amber-400'}`}>
                  {isDailyTargetComplete ? '🔥 100% Target Lit!' : `${progressPercent}% toward fire streak`}
                </span>
                {questionsToday > 0 && (
                  <button
                    type="button"
                    onClick={handleResetDailyProgressDemo}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    title="Reset today's count to 0 to test the animation from scratch"
                  >
                    Reset Today
                  </button>
                )}
              </div>
            </div>

            {/* Individual Question Flame Checkpoints (up to 15 visual nodes) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: Math.min(dailyTarget, 15) }, (_, index) => {
                const questionNumber = index + 1;
                const isCompletedNode = questionsToday >= questionNumber;
                return (
                  <motion.button
                    key={questionNumber}
                    type="button"
                    onClick={handleLogOneQuestion}
                    initial={false}
                    animate={
                      isCompletedNode
                        ? { scale: [1, 1.16, 1], opacity: 1 }
                        : { scale: 1, opacity: 0.75 }
                    }
                    transition={{ duration: 0.35 }}
                    className={`flex-1 min-w-[34px] h-8 rounded-lg border flex items-center justify-center space-x-1 text-[11px] font-bold transition cursor-pointer ${
                      isCompletedNode
                        ? 'bg-gradient-to-r from-orange-500/30 to-amber-500/30 border-orange-400/60 text-amber-200 shadow-sm shadow-orange-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                    }`}
                    title={`Question #${questionNumber} (${isCompletedNode ? 'Completed' : 'Click to log'})`}
                  >
                    <Flame
                      className={`w-3.5 h-3.5 ${
                        isCompletedNode ? 'text-orange-400 fill-orange-400' : 'text-slate-600'
                      }`}
                    />
                    <span>Q{questionNumber}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Smooth Animated Progress Bar */}
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <motion.div
                initial={false}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className={`h-full rounded-full relative ${
                  isDailyTargetComplete
                    ? 'bg-gradient-to-r from-orange-500 via-amber-400 to-rose-500 shadow-md shadow-orange-500/30'
                    : 'bg-gradient-to-r from-amber-500 to-orange-400'
                }`}
              />
            </div>
          </div>

          {/* Right 5 Cols: 7-Day Weekly Fire Chain */}
          <div className="lg:col-span-5 lg:border-l lg:border-slate-800/90 lg:pl-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">7-Day Flame Chain</span>
              <span className="text-[11px] text-amber-400 font-semibold flex items-center space-x-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Streak Freeze Ready</span>
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {sevenDayChain.map((day) => (
                <div
                  key={day.key}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition ${
                    day.isToday
                      ? day.isLit
                        ? 'bg-orange-500/25 border-orange-400 text-amber-200 shadow-md shadow-orange-500/15'
                        : 'bg-slate-900 border-amber-500/50 text-amber-300'
                      : day.isLit
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-slate-900/70 border-slate-800 text-slate-500'
                  }`}
                >
                  <motion.div
                    animate={
                      day.isToday && day.isLit
                        ? { scale: [1, 1.22, 1], rotate: [0, -6, 6, 0] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Flame
                      className={`w-4 h-4 ${
                        day.isLit
                          ? 'text-orange-400 fill-orange-400'
                          : day.isToday
                          ? 'text-amber-400/70'
                          : 'text-slate-600'
                      }`}
                    />
                  </motion.div>
                  <span className="text-[10px] font-bold mt-1">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customizable Daily Quiz Target Drawer */}
        <AnimatePresence>
          {showTargetEditor && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Set Daily Quiz Question Target</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Choose how many quiz questions you want to complete each day to ignite your fire streak.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[3, 5, 8, 10, 15].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleChangeDailyTarget(preset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        dailyTarget === preset
                          ? 'bg-orange-500 border-orange-400 text-slate-950 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {preset} Questions/Day
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline 1-Minute Lightning Streak Quiz Drawer */}
        <AnimatePresence>
          {showQuickQuiz && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 rounded-2xl bg-slate-950/95 border border-orange-500/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      {currentQuestion.subject}
                    </span>
                    <span className="text-xs font-bold text-slate-300">{currentQuestion.topic}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400">
                      Question {(currentQuizIndex % STREAK_LIGHTNING_QUESTIONS.length) + 1} of{' '}
                      {STREAK_LIGHTNING_QUESTIONS.length}
                    </span>
                    <button
                      type="button"
                      onClick={onNavigateToQuiz}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Open Full Adaptive Quiz</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-sm font-bold text-white leading-snug">{currentQuestion.question}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQuestion.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === currentQuestion.correctIndex;
                    let btnStyle =
                      'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700';

                    if (answerSubmitted) {
                      if (isCorrect) {
                        btnStyle =
                          'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-rose-500/20 border-rose-500/50 text-rose-200';
                      }
                    } else if (isSelected) {
                      btnStyle =
                        'bg-orange-500/20 border-orange-400 text-amber-200 font-bold shadow-sm';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={answerSubmitted}
                        onClick={() => setSelectedOption(idx)}
                        className={`p-3 rounded-xl border text-left text-xs transition flex items-center justify-between cursor-pointer ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {answerSubmitted && isCorrect && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {answerSubmitted && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                    <strong className="text-amber-300">Explanation:</strong> {currentQuestion.explanation}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Answering logs <strong className="text-amber-300">+1 Daily Quiz Question</strong> &amp;{' '}
                    <strong className="text-emerald-300">+5 Study Mins</strong>
                  </span>

                  <div className="flex items-center space-x-2">
                    {!answerSubmitted ? (
                      <button
                        type="button"
                        disabled={selectedOption === null}
                        onClick={handleSubmitLightningAnswer}
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs transition cursor-pointer"
                      >
                        Submit &amp; Light Flame 🔥
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNextLightningQuestion}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <span>Next Streak Question</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
