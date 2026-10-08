import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  BookOpen,
  Trophy,
  Award,
  CheckCircle2,
  Lock,
  Unlock,
  ArrowRight,
  Share2,
  Zap,
  Target,
  GraduationCap,
  Medal,
  Crown,
  ChevronRight,
  Check,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { getAllMilestoneProgress } from '../utils/offlineDb.ts';
import { db, auth, doc, setDoc } from '../firebase.ts';

export type BadgePillar = 'all' | 'streaks' | 'completed_lessons' | 'quiz_scores';

export interface EarnedAchievementBadgeItem {
  id: string;
  title: string;
  subtitle: string;
  pillar: 'streaks' | 'completed_lessons' | 'quiz_scores';
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  xpReward: number;
  description: string;
  requirementText: string;
  currentValue: number;
  targetValue: number;
  unitLabel: string;
  unlocked: boolean;
  awardedAt?: string;
  iconType: 'flame' | 'zap' | 'crown' | 'book' | 'graduation' | 'check' | 'trophy' | 'medal' | 'target';
  accentColor: 'amber' | 'emerald' | 'indigo' | 'sky';
}

interface AchievementBadgesShowcaseProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  onNavigateToLessons?: () => void;
  onOpenFullVault?: () => void;
}

export const AchievementBadgesShowcase: React.FC<AchievementBadgesShowcaseProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  onNavigateToLessons,
  onOpenFullVault,
}) => {
  const [selectedPillar, setSelectedPillar] = useState<BadgePillar>('all');
  const [activeBadgeModal, setActiveBadgeModal] = useState<EarnedAchievementBadgeItem | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [roadmapLessonsCompleted, setRoadmapLessonsCompleted] = useState<number>(0);

  useEffect(() => {
    getAllMilestoneProgress()
      .then((map) => {
        const count = Object.values(map).filter((m) => m.completed).length;
        setRoadmapLessonsCompleted(count);
      })
      .catch(() => {});
  }, []);

  // Compute live metrics for the three core pillars: Streaks, Completed Lessons, and High Quiz Scores
  const streakDays = profile.streak || 0;
  const completedLessonsCount = useMemo(() => {
    const coursesDone = profile.completedCourseIds?.length || 0;
    const historyMastered = profile.learningHistory?.filter((h) => h.mastered).length || 0;
    const strongCount = profile.strongTopics?.length || 0;
    const sessionsDone = profile.totalSessions || 0;
    return Math.max(
      coursesDone + historyMastered + roadmapLessonsCompleted,
      strongCount + roadmapLessonsCompleted,
      Math.min(12, Math.floor(sessionsDone / 2) + historyMastered + coursesDone)
    );
  }, [
    profile.completedCourseIds,
    profile.learningHistory,
    profile.strongTopics,
    profile.totalSessions,
    roadmapLessonsCompleted,
  ]);

  const quizAccuracy = useMemo(() => {
    if (!profile.totalQuestionsAnswered || profile.totalQuestionsAnswered <= 0) return 0;
    return Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100);
  }, [profile.correctAnswers, profile.totalQuestionsAnswered]);

  const highQuizScoresCount = useMemo(() => {
    const historyHighScores =
      profile.learningHistory?.filter((h) => typeof h.score === 'number' && h.score >= 80).length || 0;
    const impliedFromAccuracy =
      quizAccuracy >= 80 && (profile.totalQuestionsAnswered || 0) >= 5
        ? Math.max(1, Math.floor((profile.totalQuestionsAnswered || 0) / 5))
        : 0;
    return Math.max(historyHighScores, impliedFromAccuracy);
  }, [profile.learningHistory, quizAccuracy, profile.totalQuestionsAnswered]);

  const earnedBadgesMap = useMemo(() => {
    const map = new Map<string, string>();
    (profile.earnedBadges || []).forEach((b) => {
      map.set(b.id, b.awardedAt);
    });
    return map;
  }, [profile.earnedBadges]);

  const badges: EarnedAchievementBadgeItem[] = useMemo(() => {
    const resolveUnlocked = (id: string, condition: boolean) =>
      condition || earnedBadgesMap.has(id);

    const resolveDate = (id: string, unlocked: boolean) =>
      earnedBadgesMap.get(id) || (unlocked ? profile.lastActiveDate || new Date().toISOString() : undefined);

    return [
      // 1. STREAKS PILLAR
      {
        id: 'streak_3_day_spark',
        title: '3-Day Momentum Spark',
        subtitle: 'Study Streak',
        pillar: 'streaks',
        tier: 'Bronze',
        xpReward: 150,
        description:
          'Maintain an active learning streak for 3 consecutive days via WhatsApp sessions or dashboard study logs.',
        requirementText: '3 consecutive days of active study',
        currentValue: Math.min(3, streakDays),
        targetValue: 3,
        unitLabel: 'days',
        unlocked: resolveUnlocked('streak_3_day_spark', streakDays >= 3),
        awardedAt: resolveDate('streak_3_day_spark', resolveUnlocked('streak_3_day_spark', streakDays >= 3)),
        iconType: 'flame',
        accentColor: 'amber',
      },
      {
        id: 'streak_7_day_guardian',
        title: '7-Day Streak Guardian',
        subtitle: 'Study Streak',
        pillar: 'streaks',
        tier: 'Gold',
        xpReward: 350,
        description:
          'Complete a full week of uninterrupted daily study sessions, demonstrating disciplined academic consistency.',
        requirementText: '7 consecutive days of active study',
        currentValue: Math.min(7, streakDays),
        targetValue: 7,
        unitLabel: 'days',
        unlocked: resolveUnlocked('streak_7_day_guardian', streakDays >= 7 || earnedBadgesMap.has('streak-master')),
        awardedAt: resolveDate(
          'streak_7_day_guardian',
          resolveUnlocked('streak_7_day_guardian', streakDays >= 7 || earnedBadgesMap.has('streak-master'))
        ),
        iconType: 'zap',
        accentColor: 'amber',
      },
      {
        id: 'streak_14_day_unstoppable',
        title: '14-Day Unstoppable Scholar',
        subtitle: 'Study Streak',
        pillar: 'streaks',
        tier: 'Diamond',
        xpReward: 700,
        description:
          'Two full weeks of daily deep-work sessions, active recall flashcards, and Socratic tutoring.',
        requirementText: '14 consecutive days of active study',
        currentValue: Math.min(14, streakDays),
        targetValue: 14,
        unitLabel: 'days',
        unlocked: resolveUnlocked('streak_14_day_unstoppable', streakDays >= 14),
        awardedAt: resolveDate('streak_14_day_unstoppable', resolveUnlocked('streak_14_day_unstoppable', streakDays >= 14)),
        iconType: 'crown',
        accentColor: 'amber',
      },

      // 2. COMPLETED LESSONS PILLAR
      {
        id: 'lessons_first_module',
        title: 'First Lesson Graduate',
        subtitle: 'Completed Lessons',
        pillar: 'completed_lessons',
        tier: 'Bronze',
        xpReward: 150,
        description:
          'Complete your first structured curriculum lesson, video module, or mastered topic milestone.',
        requirementText: 'Complete 1 curriculum lesson or topic',
        currentValue: Math.min(1, completedLessonsCount),
        targetValue: 1,
        unitLabel: 'lessons',
        unlocked: resolveUnlocked('lessons_first_module', completedLessonsCount >= 1),
        awardedAt: resolveDate('lessons_first_module', resolveUnlocked('lessons_first_module', completedLessonsCount >= 1)),
        iconType: 'book',
        accentColor: 'emerald',
      },
      {
        id: 'lessons_5_curriculum_builder',
        title: '5-Lesson Curriculum Builder',
        subtitle: 'Completed Lessons',
        pillar: 'completed_lessons',
        tier: 'Silver',
        xpReward: 300,
        description:
          'Finish 5 distinct lessons across your syllabus, building a strong conceptual foundation.',
        requirementText: 'Complete 5 lessons or topic modules',
        currentValue: Math.min(5, completedLessonsCount),
        targetValue: 5,
        unitLabel: 'lessons',
        unlocked: resolveUnlocked('lessons_5_curriculum_builder', completedLessonsCount >= 5),
        awardedAt: resolveDate(
          'lessons_5_curriculum_builder',
          resolveUnlocked('lessons_5_curriculum_builder', completedLessonsCount >= 5)
        ),
        iconType: 'check',
        accentColor: 'emerald',
      },
      {
        id: 'lessons_10_syllabus_architect',
        title: '10-Lesson Syllabus Architect',
        subtitle: 'Completed Lessons',
        pillar: 'completed_lessons',
        tier: 'Gold',
        xpReward: 500,
        description:
          'Master 10 comprehensive curriculum lessons and roadmap modules across multiple subjects.',
        requirementText: 'Complete 10 lessons or topic modules',
        currentValue: Math.min(10, completedLessonsCount),
        targetValue: 10,
        unitLabel: 'lessons',
        unlocked: resolveUnlocked('lessons_10_syllabus_architect', completedLessonsCount >= 10),
        awardedAt: resolveDate(
          'lessons_10_syllabus_architect',
          resolveUnlocked('lessons_10_syllabus_architect', completedLessonsCount >= 10)
        ),
        iconType: 'graduation',
        accentColor: 'emerald',
      },

      // 3. HIGH QUIZ SCORES PILLAR
      {
        id: 'quiz_sharp_80_accuracy',
        title: '80%+ High Score Ace',
        subtitle: 'High Quiz Scores',
        pillar: 'quiz_scores',
        tier: 'Silver',
        xpReward: 250,
        description:
          'Achieve 80% or higher accuracy on adaptive quizzes to prove strong command of core concepts.',
        requirementText: '80%+ quiz accuracy (min 5 questions)',
        currentValue: Math.min(80, quizAccuracy),
        targetValue: 80,
        unitLabel: '% score',
        unlocked: resolveUnlocked(
          'quiz_sharp_80_accuracy',
          (quizAccuracy >= 80 && (profile.totalQuestionsAnswered || 0) >= 5) ||
            earnedBadgesMap.has('quiz-champion')
        ),
        awardedAt: resolveDate(
          'quiz_sharp_80_accuracy',
          resolveUnlocked(
            'quiz_sharp_80_accuracy',
            (quizAccuracy >= 80 && (profile.totalQuestionsAnswered || 0) >= 5) ||
              earnedBadgesMap.has('quiz-champion')
          )
        ),
        iconType: 'target',
        accentColor: 'indigo',
      },
      {
        id: 'quiz_90_distinction_master',
        title: '90%+ Distinction Laureate',
        subtitle: 'High Quiz Scores',
        pillar: 'quiz_scores',
        tier: 'Gold',
        xpReward: 450,
        description:
          'Score 90% or above on a subject assessment or maintain 90%+ cumulative quiz accuracy.',
        requirementText: '90%+ quiz score or cumulative accuracy',
        currentValue: Math.min(90, Math.max(quizAccuracy, highQuizScoresCount >= 2 ? 90 : quizAccuracy)),
        targetValue: 90,
        unitLabel: '% score',
        unlocked: resolveUnlocked('quiz_90_distinction_master', quizAccuracy >= 90 || highQuizScoresCount >= 3),
        awardedAt: resolveDate(
          'quiz_90_distinction_master',
          resolveUnlocked('quiz_90_distinction_master', quizAccuracy >= 90 || highQuizScoresCount >= 3)
        ),
        iconType: 'medal',
        accentColor: 'indigo',
      },
      {
        id: 'quiz_perfect_centurion',
        title: 'Quiz Grandmaster (25+ Correct)',
        subtitle: 'High Quiz Scores',
        pillar: 'quiz_scores',
        tier: 'Diamond',
        xpReward: 600,
        description:
          'Solve at least 25 adaptive quiz questions accurately while maintaining high assessment scores.',
        requirementText: '25+ correct quiz answers logged',
        currentValue: Math.min(25, profile.correctAnswers || 0),
        targetValue: 25,
        unitLabel: 'correct',
        unlocked: resolveUnlocked('quiz_perfect_centurion', (profile.correctAnswers || 0) >= 25),
        awardedAt: resolveDate(
          'quiz_perfect_centurion',
          resolveUnlocked('quiz_perfect_centurion', (profile.correctAnswers || 0) >= 25)
        ),
        iconType: 'trophy',
        accentColor: 'sky',
      },
    ];
  }, [
    streakDays,
    completedLessonsCount,
    quizAccuracy,
    highQuizScoresCount,
    profile.totalQuestionsAnswered,
    profile.correctAnswers,
    profile.lastActiveDate,
    earnedBadgesMap,
  ]);

  const filteredBadges = useMemo(() => {
    if (selectedPillar === 'all') return badges;
    return badges.filter((b) => b.pillar === selectedPillar);
  }, [badges, selectedPillar]);

  const unlockedBadges = useMemo(() => badges.filter((b) => b.unlocked), [badges]);
  const totalXpEarned = useMemo(
    () => unlockedBadges.reduce((sum, item) => sum + item.xpReward, 0),
    [unlockedBadges]
  );

  // Next closest badge to unlock for motivation
  const nextMilestoneBadge = useMemo(() => {
    const locked = badges.filter((b) => !b.unlocked);
    if (locked.length === 0) return null;
    return locked.sort(
      (a, b) => b.currentValue / b.targetValue - a.currentValue / a.targetValue
    )[0];
  }, [badges]);

  const renderIcon = (
    iconType: EarnedAchievementBadgeItem['iconType'],
    unlocked: boolean,
    accent: EarnedAchievementBadgeItem['accentColor']
  ) => {
    const colorClass = !unlocked
      ? 'text-slate-500'
      : accent === 'amber'
      ? 'text-amber-400'
      : accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'sky'
      ? 'text-sky-400'
      : 'text-indigo-400';

    switch (iconType) {
      case 'flame':
        return <Flame className={`w-5 h-5 ${colorClass}`} />;
      case 'zap':
        return <Zap className={`w-5 h-5 ${colorClass}`} />;
      case 'crown':
        return <Crown className={`w-5 h-5 ${colorClass}`} />;
      case 'book':
        return <BookOpen className={`w-5 h-5 ${colorClass}`} />;
      case 'check':
        return <CheckCircle2 className={`w-5 h-5 ${colorClass}`} />;
      case 'graduation':
        return <GraduationCap className={`w-5 h-5 ${colorClass}`} />;
      case 'target':
        return <Target className={`w-5 h-5 ${colorClass}`} />;
      case 'medal':
        return <Medal className={`w-5 h-5 ${colorClass}`} />;
      case 'trophy':
      default:
        return <Trophy className={`w-5 h-5 ${colorClass}`} />;
    }
  };

  // Handle simulating / claiming a milestone so students can test engagement mechanics immediately
  const handleClaimOrPracticeBadge = async (badge: EarnedAchievementBadgeItem) => {
    setIsSyncing(true);
    try {
      const nowIso = new Date().toISOString();
      const existingEarned = profile.earnedBadges || [];
      const alreadyHas = existingEarned.some((b) => b.id === badge.id);
      const updatedEarned = alreadyHas
        ? existingEarned
        : [...existingEarned, { id: badge.id, name: badge.title, awardedAt: nowIso }];

      const patch: Partial<StudentProfile> = {
        earnedBadges: updatedEarned,
      };

      if (badge.pillar === 'streaks' && (profile.streak || 0) < badge.targetValue) {
        patch.streak = badge.targetValue;
      } else if (badge.pillar === 'completed_lessons') {
        const currentCourses = profile.completedCourseIds || [];
        const needed = Math.max(0, badge.targetValue - completedLessonsCount);
        const addedCourseIds = Array.from({ length: Math.max(1, needed) }, (_, idx) => `lesson_mod_${Date.now()}_${idx}`);
        patch.completedCourseIds = Array.from(new Set([...currentCourses, ...addedCourseIds]));
        patch.overallProgress = Math.min(100, Math.max(profile.overallProgress || 0, 75));
      } else if (badge.pillar === 'quiz_scores') {
        const currentTotal = Math.max(profile.totalQuestionsAnswered || 0, 10);
        const targetAcc = badge.targetValue >= 90 ? 0.92 : 0.85;
        const nextTotal = badge.id === 'quiz_perfect_centurion' ? Math.max(currentTotal, 28) : currentTotal;
        const nextCorrect =
          badge.id === 'quiz_perfect_centurion'
            ? Math.max(profile.correctAnswers || 0, 25)
            : Math.max(profile.correctAnswers || 0, Math.ceil(nextTotal * targetAcc));
        patch.totalQuestionsAnswered = nextTotal;
        patch.correctAnswers = nextCorrect;
      }

      const updatedProfile: StudentProfile = {
        ...profile,
        ...patch,
      };

      onProfileUpdate(updatedProfile);

      if (auth.currentUser && db) {
        await setDoc(doc(db, 'profiles', profile.userId), patch, { merge: true }).catch(() => {});
      }

      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }).catch(() => {});

      setStatusFeedback(`Unlocked "${badge.title}" (+${badge.xpReward} XP)`);
      setTimeout(() => setStatusFeedback(null), 3500);
      setActiveBadgeModal(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleShareOnWhatsApp = (badge: EarnedAchievementBadgeItem) => {
    if (!onNavigateToChat) return;
    const message = `🏆 I just earned the "${badge.title}" (${badge.tier} Tier) achievement badge! Current stats: ${streakDays}-day streak, ${completedLessonsCount} lessons completed, and ${quizAccuracy}% quiz accuracy. Let's keep studying!`;
    onNavigateToChat(message);
    setActiveBadgeModal(null);
  };

  return (
    <section
      aria-label="Earned Achievement Badges"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
    >
      {/* Top Header & Core Engagement Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <Award className="w-4 h-4 shrink-0" />
            <span>Student Engagement & Recognition</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400 font-mono tabular-nums">
              {unlockedBadges.length}/{badges.length} Earned
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-emerald-400 font-mono tabular-nums">
              {totalXpEarned} XP
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white tracking-tight">
            Earned Achievement Badges
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Milestones awarded automatically for consecutive study streaks, completed curriculum lessons, and high adaptive quiz scores.
          </p>
        </div>

        {/* Interactive Pillar Filter Controls (Segmented Control) */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start lg:self-center">
          <button
            type="button"
            onClick={() => setSelectedPillar('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              selectedPillar === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({badges.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedPillar('streaks')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedPillar === 'streaks'
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Streaks</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPillar('completed_lessons')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedPillar === 'completed_lessons'
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lessons</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPillar('quiz_scores')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedPillar === 'quiz_scores'
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quiz Scores</span>
          </button>
        </div>
      </div>

      {/* Status Toast Feedback */}
      {statusFeedback && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFeedback(null)}
            className="text-emerald-400 hover:text-emerald-200 font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Three Pillar Progress Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Active Study Streak</span>
            </div>
            <div className="text-xl font-semibold text-white font-mono tabular-nums">
              {streakDays} {streakDays === 1 ? 'Day' : 'Days'}
            </div>
            <div className="text-xs text-slate-500">
              {badges.filter((b) => b.pillar === 'streaks' && b.unlocked).length} of 3 streak badges earned
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPillar(selectedPillar === 'streaks' ? 'all' : 'streaks')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-medium border border-slate-800 transition cursor-pointer"
          >
            View
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completed Lessons</span>
            </div>
            <div className="text-xl font-semibold text-white font-mono tabular-nums">
              {completedLessonsCount} {completedLessonsCount === 1 ? 'Lesson' : 'Lessons'}
            </div>
            <div className="text-xs text-slate-500">
              {badges.filter((b) => b.pillar === 'completed_lessons' && b.unlocked).length} of 3 lesson badges earned
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setSelectedPillar(selectedPillar === 'completed_lessons' ? 'all' : 'completed_lessons')
            }
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-medium border border-slate-800 transition cursor-pointer"
          >
            View
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quiz Score Accuracy</span>
            </div>
            <div className="text-xl font-semibold text-white font-mono tabular-nums">
              {quizAccuracy}%
            </div>
            <div className="text-xs text-slate-500">
              {badges.filter((b) => b.pillar === 'quiz_scores' && b.unlocked).length} of 3 quiz badges earned
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPillar(selectedPillar === 'quiz_scores' ? 'all' : 'quiz_scores')}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-400 text-xs font-medium border border-slate-800 transition cursor-pointer"
          >
            View
          </button>
        </div>
      </div>

      {/* Achievement Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBadges.map((badge) => {
          const progressPct = Math.min(100, Math.round((badge.currentValue / badge.targetValue) * 100));
          const borderAccent = !badge.unlocked
            ? 'border-slate-800/80 hover:border-slate-700'
            : badge.accentColor === 'amber'
            ? 'border-amber-500/40 hover:border-amber-400/70'
            : badge.accentColor === 'emerald'
            ? 'border-emerald-500/40 hover:border-emerald-400/70'
            : badge.accentColor === 'sky'
            ? 'border-sky-500/40 hover:border-sky-400/70'
            : 'border-indigo-500/40 hover:border-indigo-400/70';

          const barColor = !badge.unlocked
            ? 'bg-slate-600'
            : badge.accentColor === 'amber'
            ? 'bg-amber-400'
            : badge.accentColor === 'emerald'
            ? 'bg-emerald-400'
            : badge.accentColor === 'sky'
            ? 'bg-sky-400'
            : 'bg-indigo-400';

          return (
            <div
              key={badge.id}
              onClick={() => setActiveBadgeModal(badge)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveBadgeModal(badge);
                }
              }}
              className={`group p-4 rounded-xl bg-slate-950/70 border transition-all text-left flex flex-col justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${borderAccent}`}
            >
              <div>
                {/* Top Icon + Unboxed Metadata */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${
                      badge.unlocked
                        ? 'bg-slate-900 border-slate-700/80 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800/70 opacity-60'
                    }`}
                  >
                    {renderIcon(badge.iconType, badge.unlocked, badge.accentColor)}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums">
                    <span className={badge.unlocked ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                      {badge.unlocked ? 'Earned' : 'Locked'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{badge.tier}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-400/90">+{badge.xpReward} XP</span>
                  </div>
                </div>

                {/* Primary Title & Description */}
                <h4
                  className={`text-sm font-semibold tracking-tight ${
                    badge.unlocked ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {badge.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {badge.description}
                </p>
              </div>

              {/* Progress Bar & Action Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 truncate max-w-[170px]">{badge.subtitle}</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {badge.currentValue}/{badge.targetValue} {badge.unitLabel} ({progressPct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Motivational Next-Milestone Bar */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/80 text-xs">
        {nextMilestoneBadge ? (
          <div className="flex items-center gap-2 text-slate-300">
            <Unlock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Next closest achievement:{' '}
              <strong className="text-white font-semibold">{nextMilestoneBadge.title}</strong> (
              {nextMilestoneBadge.currentValue}/{nextMilestoneBadge.targetValue}{' '}
              {nextMilestoneBadge.unitLabel})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>All 9 core streak, lesson, and quiz score achievements unlocked!</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {onNavigateToQuiz && (
            <button
              type="button"
              onClick={onNavigateToQuiz}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Take Adaptive Quiz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {onNavigateToLessons && (
            <button
              type="button"
              onClick={onNavigateToLessons}
              className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Complete a Lesson</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenFullVault && (
            <button
              type="button"
              onClick={onOpenFullVault}
              className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Open Full Badge Vault</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Detailed Modal Inspector */}
      {activeBadgeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveBadgeModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                {renderIcon(
                  activeBadgeModal.iconType,
                  activeBadgeModal.unlocked,
                  activeBadgeModal.accentColor
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums">
                <span className={activeBadgeModal.unlocked ? 'text-emerald-400' : 'text-slate-400'}>
                  {activeBadgeModal.unlocked ? 'Earned' : 'Locked'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeBadgeModal.tier} Tier</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400">+{activeBadgeModal.xpReward} XP</span>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white">{activeBadgeModal.title}</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {activeBadgeModal.description}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Category</span>
                <span className="text-slate-200 font-medium">{activeBadgeModal.subtitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Requirement</span>
                <span className="text-slate-200 font-medium text-right">
                  {activeBadgeModal.requirementText}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Progress</span>
                <span className="text-emerald-400 font-mono tabular-nums font-semibold">
                  {activeBadgeModal.currentValue} / {activeBadgeModal.targetValue}{' '}
                  {activeBadgeModal.unitLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              {activeBadgeModal.unlocked ? (
                onNavigateToChat && (
                  <button
                    type="button"
                    onClick={() => handleShareOnWhatsApp(activeBadgeModal)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share on WhatsApp</span>
                  </button>
                )
              ) : (
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => handleClaimOrPracticeBadge(activeBadgeModal)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {isSyncing ? 'Unlocking...' : 'Simulate Unlock (+XP)'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveBadgeModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
