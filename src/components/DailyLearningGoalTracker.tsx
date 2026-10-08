import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Target,
  Trophy,
  ArrowRight,
  Brain,
  Edit2,
  Check,
  Plus,
  Clock,
  Zap,
  Play,
  Award,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface DailyLearningGoalTrackerProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToQuiz: () => void;
  completedMinutesToday?: number;
  onLogStudyMinutes?: (mins: number, activityLabel?: string) => void;
}

interface MiniQuizItem {
  id: string;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  correctLetter: string;
  explanation: string;
  minutesReward: number;
}

const QUICK_QUIZ_BANK: MiniQuizItem[] = [
  {
    id: 'qq_1',
    subject: 'Python',
    topic: 'Recursion & Call Stack',
    question: 'What happens if a recursive function in Python lacks a valid base case?',
    options: [
      'A) Python automatically converts it into a while loop',
      'B) Call stack frames overflow and raise RecursionError',
      'C) It returns 0 after 10 iterations',
      'D) It garbage-collects active stack frames immediately',
    ],
    correctLetter: 'B',
    explanation:
      'Every recursive call pushes a new stack frame onto the LIFO Call Stack. Without a base case, it hits sys.getrecursionlimit() and raises RecursionError.',
    minutesReward: 15,
  },
  {
    id: 'qq_2',
    subject: 'Calculus',
    topic: 'Integration by Parts',
    question: 'According to the LIATE rule for ∫ u dv, which function type has the highest priority to be chosen as u?',
    options: [
      'A) Exponential functions (e^x)',
      'B) Trigonometric functions (sin x)',
      'C) Logarithmic functions (ln x)',
      'D) Algebraic polynomials (x^2)',
    ],
    correctLetter: 'C',
    explanation:
      'LIATE stands for Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential. Logarithmic functions differentiate cleanly into algebraic terms (1/x).',
    minutesReward: 15,
  },
  {
    id: 'qq_3',
    subject: 'DSA',
    topic: 'Binary Search Trees & Complexity',
    question: 'What is the worst-case time complexity of searching for a key in an unbalanced Binary Search Tree (BST) with N nodes?',
    options: [
      'A) O(1)',
      'B) O(log N)',
      'C) O(N)',
      'D) O(N log N)',
    ],
    correctLetter: 'C',
    explanation:
      'If elements are inserted in sorted order, an unbalanced BST degenerates into a skewed linked list of height N, making lookup O(N).',
    minutesReward: 15,
  },
];

export const DailyLearningGoalTracker: React.FC<DailyLearningGoalTrackerProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToQuiz,
  completedMinutesToday,
  onLogStudyMinutes,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Sync with profile.studyHoursPerDay
  const targetHours = Number(profile.studyHoursPerDay) || 2;
  const targetMinutes = Math.round(targetHours * 60);

  // Sync studied minutes from prop or profile.focusStats.todayFocusMinutes
  const [studiedMinutes, setStudiedMinutes] = useState<number>(() => {
    if (typeof completedMinutesToday === 'number') return completedMinutesToday;
    if (
      profile.focusStats?.lastSessionDate === todayStr &&
      typeof profile.focusStats?.todayFocusMinutes === 'number'
    ) {
      return profile.focusStats.todayFocusMinutes;
    }
    try {
      const saved = localStorage.getItem(`study_minutes_${profile.userId}_${todayStr}`);
      if (saved !== null) return Number(saved);
    } catch {}
    return 45;
  });

  // Daily target for questions answered (scales with studyHoursPerDay if not explicitly customized)
  const [targetQuestions, setTargetQuestions] = useState<number>(() => {
    return profile.dailyQuestionsGoal || Math.max(6, Math.round(targetHours * 5));
  });

  // Tracked questions answered today
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(() => {
    if (typeof profile.questionsAnsweredToday === 'number') {
      return profile.questionsAnsweredToday;
    }
    try {
      const saved = localStorage.getItem(`daily_questions_${profile.userId}_${todayStr}`);
      if (saved !== null) return Number(saved);
    } catch {}
    return 6;
  });

  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [tempHours, setTempHours] = useState<number>(targetHours);
  const [tempQuestionsGoal, setTempQuestionsGoal] = useState<number>(targetQuestions);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [justCelebrated, setJustCelebrated] = useState<boolean>(false);
  const [liveUpdateToast, setLiveUpdateToast] = useState<string | null>(null);

  // Inline Instant Quiz Challenge state for real-time progress bar verification
  const [showInstantQuiz, setShowInstantQuiz] = useState<boolean>(false);
  const [quizIdx, setQuizIdx] = useState<number>(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState<boolean>(false);

  // Keep studiedMinutes synced when parent or profile updates
  useEffect(() => {
    if (typeof completedMinutesToday === 'number') {
      setStudiedMinutes(completedMinutesToday);
    } else if (
      profile.focusStats?.lastSessionDate === todayStr &&
      typeof profile.focusStats?.todayFocusMinutes === 'number'
    ) {
      setStudiedMinutes(profile.focusStats.todayFocusMinutes);
    }
  }, [completedMinutesToday, profile.focusStats?.todayFocusMinutes, profile.focusStats?.lastSessionDate, todayStr]);

  // Keep questionsAnswered synced when profile.questionsAnsweredToday or totalQuestionsAnswered updates
  useEffect(() => {
    if (
      typeof profile.questionsAnsweredToday === 'number' &&
      profile.questionsAnsweredToday !== questionsAnswered
    ) {
      setQuestionsAnswered(profile.questionsAnsweredToday);
    }
  }, [profile.questionsAnsweredToday]);

  // Sync if profile.studyHoursPerDay or dailyQuestionsGoal changes
  useEffect(() => {
    setTempHours(Number(profile.studyHoursPerDay) || 2);
    if (profile.dailyQuestionsGoal) {
      setTargetQuestions(profile.dailyQuestionsGoal);
      setTempQuestionsGoal(profile.dailyQuestionsGoal);
    }
  }, [profile.studyHoursPerDay, profile.dailyQuestionsGoal]);

  // Study Hours Progress Bar calculations (Primary sync with studyHoursPerDay)
  const studyHoursProgressPercent = Math.min(
    100,
    Math.round((studiedMinutes / Math.max(1, targetMinutes)) * 100)
  );
  const completedHoursFormatted = Math.round((studiedMinutes / 60) * 100) / 100;
  const remainingMinutes = Math.max(0, targetMinutes - studiedMinutes);
  const remainingHoursFormatted = Math.max(0, Math.round((remainingMinutes / 60) * 10) / 10);
  const isHoursGoalMet = studiedMinutes >= targetMinutes;

  // Questions Answered Progress Bar calculations
  const questionsProgressPercent = Math.min(
    100,
    Math.round((questionsAnswered / Math.max(1, targetQuestions)) * 100)
  );
  const isQuestionsGoalMet = questionsAnswered >= targetQuestions;
  const questionsRemaining = Math.max(0, targetQuestions - questionsAnswered);

  // Save updated studyHoursPerDay & dailyQuestionsGoal to profile, backend, and Firestore
  const handleSaveGoal = async () => {
    const clampedHours = Math.max(0.5, Math.min(12, Number(tempHours) || 2));
    const clampedQs = Math.max(1, Math.min(100, Number(tempQuestionsGoal) || 10));
    setIsSaving(true);

    const updated: StudentProfile = {
      ...profile,
      studyHoursPerDay: clampedHours,
      dailyQuestionsGoal: clampedQs,
    };

    try {
      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            studyHoursPerDay: clampedHours,
            dailyQuestionsGoal: clampedQs,
          },
          { merge: true }
        );
      }
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyHoursPerDay: clampedHours,
          dailyQuestionsGoal: clampedQs,
        }),
      });
    } catch (err) {
      console.warn('Sync to remote DB failed:', err);
    } finally {
      setTargetQuestions(clampedQs);
      onProfileUpdate(updated);
      setIsSaving(false);
      setIsEditingGoal(false);
      setLiveUpdateToast(`Synced target: ${clampedHours}h/day (${Math.round(clampedHours * 60)}m) & ${clampedQs} Qs`);
      setTimeout(() => setLiveUpdateToast(null), 3500);
    }
  };

  // Real-time handler when a quiz or practice set is completed
  const handleCompleteQuizRealTime = async (
    questionsCount: number,
    correctCount: number,
    minutesEarned: number,
    topicLabel: string,
    subjectLabel: string
  ) => {
    const nextStudiedMinutes = studiedMinutes + minutesEarned;
    const nextQuestionsAnswered = questionsAnswered + questionsCount;

    setStudiedMinutes(nextStudiedMinutes);
    setQuestionsAnswered(nextQuestionsAnswered);

    if (onLogStudyMinutes) {
      onLogStudyMinutes(minutesEarned, `Quiz: ${topicLabel} (${correctCount}/${questionsCount})`);
    }

    try {
      localStorage.setItem(`study_minutes_${profile.userId}_${todayStr}`, String(nextStudiedMinutes));
      localStorage.setItem(`daily_questions_${profile.userId}_${todayStr}`, String(nextQuestionsAnswered));
    } catch {}

    const existingFocusStats = profile.focusStats || {
      totalFocusMinutes: 0,
      completedSessions: 0,
      todayFocusMinutes: studiedMinutes,
      lastSessionDate: todayStr,
    };

    const updatedFocusStats = {
      totalFocusMinutes: (existingFocusStats.totalFocusMinutes || 0) + minutesEarned,
      completedSessions: (existingFocusStats.completedSessions || 0) + 1,
      todayFocusMinutes: nextStudiedMinutes,
      lastSessionDate: todayStr,
    };

    const updated: StudentProfile = {
      ...profile,
      questionsAnsweredToday: nextQuestionsAnswered,
      totalQuestionsAnswered: (profile.totalQuestionsAnswered || 0) + questionsCount,
      correctAnswers: (profile.correctAnswers || 0) + correctCount,
      focusStats: updatedFocusStats,
      overallProgress: Math.min(100, (profile.overallProgress || 65) + 2),
      learningHistory: [
        ...(profile.learningHistory || []),
        {
          topic: topicLabel,
          subject: subjectLabel,
          date: todayStr,
          mastered: correctCount / Math.max(1, questionsCount) >= 0.7,
        },
      ],
    };

    if (
      (nextStudiedMinutes >= targetMinutes && studiedMinutes < targetMinutes) ||
      (nextQuestionsAnswered >= targetQuestions && questionsAnswered < targetQuestions)
    ) {
      setJustCelebrated(true);
      setTimeout(() => setJustCelebrated(false), 5000);
    }

    setLiveUpdateToast(
      `+${minutesEarned}m study time & +${questionsCount} quiz ${
        questionsCount === 1 ? 'question' : 'questions'
      } synced to your ${targetHours}h daily goal!`
    );
    setTimeout(() => setLiveUpdateToast(null), 4000);

    onProfileUpdate(updated);

    try {
      await fetch('/api/quiz/record-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          topic: topicLabel,
          subject: subjectLabel,
          score: correctCount,
          totalQuestions: questionsCount,
          studyMinutesLogged: minutesEarned,
        }),
      });

      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            questionsAnsweredToday: nextQuestionsAnswered,
            totalQuestionsAnswered: updated.totalQuestionsAnswered,
            correctAnswers: updated.correctAnswers,
            focusStats: updatedFocusStats,
            overallProgress: updated.overallProgress,
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn('Real-time quiz sync warning:', e);
    }
  };

  const currentMiniQuiz = QUICK_QUIZ_BANK[quizIdx % QUICK_QUIZ_BANK.length];

  const handleSubmitInstantQuiz = async () => {
    if (!selectedChoice || quizSubmitted || isSubmittingQuiz) return;
    setIsSubmittingQuiz(true);
    setQuizSubmitted(true);

    const pickedLetter = selectedChoice.trim().charAt(0).toUpperCase();
    const isCorrect = pickedLetter === currentMiniQuiz.correctLetter;

    await handleCompleteQuizRealTime(
      1,
      isCorrect ? 1 : 0,
      currentMiniQuiz.minutesReward,
      currentMiniQuiz.topic,
      currentMiniQuiz.subject
    );
    setIsSubmittingQuiz(false);
  };

  const handleNextInstantQuiz = () => {
    setQuizIdx((prev) => (prev + 1) % QUICK_QUIZ_BANK.length);
    setSelectedChoice(null);
    setQuizSubmitted(false);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950/35 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Real-Time Daily Learning Goal Progress
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Synced with studyHoursPerDay ({targetHours}h / {targetMinutes}m)
              </span>
              {isHoursGoalMet && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1 animate-pulse">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Daily Study Goal Met!</span>
                </span>
              )}
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5 tracking-tight">
              Daily Study Hours & Live Quiz Completion Tracker
            </h3>
          </div>
        </div>

        {/* Target studyHoursPerDay & Question Goal Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {!isEditingGoal ? (
            <div className="flex items-center space-x-3 bg-slate-950/80 border border-slate-800 rounded-2xl px-3.5 py-2">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Daily Target (`studyHoursPerDay`)</div>
                <div className="text-xs font-bold text-indigo-300">
                  {targetHours} hrs/day ({targetMinutes} mins) • {targetQuestions} Qs
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTempHours(targetHours);
                  setTempQuestionsGoal(targetQuestions);
                  setIsEditingGoal(true);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Edit studyHoursPerDay and daily question goal"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 border border-indigo-500/50 rounded-2xl p-2 animate-in fade-in">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-300 font-semibold">Hours/Day:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={tempHours}
                  onChange={(e) => setTempHours(Math.max(0.5, Number(e.target.value)))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white text-center font-bold focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-300 font-semibold">Qs:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tempQuestionsGoal}
                  onChange={(e) => setTempQuestionsGoal(Math.max(1, Number(e.target.value)))}
                  className="w-14 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white text-center font-bold focus:outline-none focus:border-indigo-400"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={isSaving}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition cursor-pointer text-xs font-bold flex items-center space-x-1"
                title="Save target"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingGoal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-xl transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Presets when editing */}
      {isEditingGoal && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pb-1 relative z-10">
          <span className="text-[10px] text-slate-400 mr-1">Quick `studyHoursPerDay` Presets:</span>
          {[1, 1.5, 2, 2.5, 3, 4].map((hrs) => (
            <button
              key={hrs}
              type="button"
              onClick={() => {
                setTempHours(hrs);
                setTempQuestionsGoal(Math.max(5, Math.round(hrs * 5)));
              }}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                Math.abs(tempHours - hrs) < 0.05
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {hrs}h ({Math.round(hrs * 60)}m)
            </button>
          ))}
        </div>
      )}

      {/* Live Toast Notification on Real-Time Quiz Update */}
      {liveUpdateToast && (
        <div className="mt-4 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-emerald-400 animate-bounce" />
            <span>{liveUpdateToast}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Live Sync
          </span>
        </div>
      )}

      {/* PRIMARY PROGRESS BAR: Study Hours Goal (Synced with studyHoursPerDay) */}
      <div className="mt-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-baseline space-x-2">
            <Clock className="w-4 h-4 text-indigo-400 self-center" />
            <span className="text-2xl font-black text-white">
              {completedHoursFormatted} <span className="text-sm font-bold text-indigo-300">hrs</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({studiedMinutes} / {targetMinutes} mins) toward{' '}
              <strong className="text-white">{targetHours}h/day</strong> goal
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-black text-emerald-400">{studyHoursProgressPercent}%</span>
            {isHoursGoalMet ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>Target Reached!</span>
              </span>
            ) : (
              <span className="text-xs text-amber-300 font-medium">
                {remainingMinutes}m ({remainingHoursFormatted}h) remaining today
              </span>
            )}
          </div>
        </div>

        {/* Study Hours Visual Progress Bar Track */}
        <div
          role="progressbar"
          aria-valuenow={studyHoursProgressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Daily study hours goal progress bar"
          className="w-full bg-slate-900 rounded-full h-4 p-0.5 border border-slate-800 shadow-inner overflow-hidden relative"
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out relative ${
              isHoursGoalMet
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-md shadow-emerald-500/40'
                : 'bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 shadow-md shadow-indigo-500/30'
            }`}
            style={{ width: `${studyHoursProgressPercent}%` }}
          >
            <div className="absolute inset-0 bg-white/20 skew-x-12 animate-pulse rounded-full" />
          </div>
        </div>

        {/* Secondary Sub-Bar: Real-Time Quiz Questions Answered */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300 font-semibold">
              Quizzes & Questions Completed Today:
            </span>
            <span className="text-white font-bold">
              {questionsAnswered} / {targetQuestions} Qs ({questionsProgressPercent}%)
            </span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-56">
            <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${questionsProgressPercent}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 whitespace-nowrap">
              {isQuestionsGoalMet ? 'Done! 🎉' : `${questionsRemaining} left`}
            </span>
          </div>
        </div>
      </div>

      {/* Inline Real-Time Mini Quiz Drawer (Allows completing a quiz right on the Overview to watch the bar update live) */}
      {showInstantQuiz && (
        <div className="mt-4 p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/40 space-y-3 relative z-10 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase">
                {currentMiniQuiz.subject} • {currentMiniQuiz.topic}
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">
                +{currentMiniQuiz.minutesReward} mins toward {targetHours}h goal
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowInstantQuiz(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          <p className="text-sm font-bold text-white">{currentMiniQuiz.question}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentMiniQuiz.options.map((opt) => {
              const optLetter = opt.charAt(0).toUpperCase();
              const isSelected = selectedChoice === opt;
              const isCorrectChoice = optLetter === currentMiniQuiz.correctLetter;

              let btnStyle =
                'bg-slate-900 border-slate-800 text-slate-200 hover:border-indigo-500/50';
              if (quizSubmitted) {
                if (isCorrectChoice) {
                  btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200';
                }
              } else if (isSelected) {
                btnStyle = 'bg-indigo-600/30 border-indigo-400 text-white';
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={quizSubmitted}
                  onClick={() => setSelectedChoice(opt)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium transition cursor-pointer ${btnStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {quizSubmitted && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-emerald-400">
                  ✓ +{currentMiniQuiz.minutesReward} mins & +1 Question synced!{' '}
                </span>
                <span>{currentMiniQuiz.explanation}</span>
              </div>
              <button
                type="button"
                onClick={handleNextInstantQuiz}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0 cursor-pointer"
              >
                Next Question →
              </button>
            </div>
          )}

          {!quizSubmitted && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!selectedChoice || isSubmittingQuiz}
                onClick={handleSubmitInstantQuiz}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Submit Answer & Sync Progress (+{currentMiniQuiz.minutesReward}m)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Strip: Quick Quiz Completion & Full Adaptive Quiz Navigation */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1">
            Real-Time Quiz Sync:
          </span>
          <button
            type="button"
            onClick={() => setShowInstantQuiz(!showInstantQuiz)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition cursor-pointer active:scale-95 flex items-center space-x-1.5"
          >
            <Play className="w-3 h-3 fill-emerald-300" />
            <span>{showInstantQuiz ? 'Hide Instant Quiz' : '1-Min Instant Quiz (+15m)'}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleCompleteQuizRealTime(
                3,
                3,
                15,
                profile.weakTopics?.[0] || 'Python Recursion',
                profile.subjects?.[0] || 'Python'
              )
            }
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer active:scale-95 flex items-center space-x-1"
            title="Complete a 3-question mini quiz (+15m study time)"
          >
            <Plus className="w-3 h-3 text-indigo-400" />
            <span>+3 Q Quiz (+15m)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              handleCompleteQuizRealTime(
                5,
                4,
                25,
                profile.weakTopics?.[0] || 'Calculus Integration',
                profile.subjects?.[0] || 'Calculus'
              )
            }
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer active:scale-95 flex items-center space-x-1"
            title="Complete a 5-question adaptive quiz (+25m study time)"
          >
            <Plus className="w-3 h-3 text-indigo-400" />
            <span>+5 Q Quiz (+25m)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onNavigateToQuiz}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer active:scale-95 self-start sm:self-auto"
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Open Full Adaptive Quiz</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Goal Achieved Celebration Banner */}
      {(justCelebrated || isHoursGoalMet) && (
        <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">
              Daily {targetHours}h Study Goal Achieved! Your quiz completions and focus sessions are 100% synced.
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider shrink-0">
            +50 XP Bonus
          </span>
        </div>
      )}
    </div>
  );
};
