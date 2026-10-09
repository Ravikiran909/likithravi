import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Flame,
  CheckCircle2,
  Trophy,
  Zap,
  Target,
  Sparkles,
  Lock,
  Unlock,
  ShieldCheck,
  Star,
  Brain,
  Layers,
  Clock,
  BookOpen,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Share2,
  User,
  Check,
  Database,
} from 'lucide-react';
import { StudentProfile, VirtualBadge } from '../types/index.ts';
import { db, auth, doc, setDoc } from '../firebase.ts';
import { getAllMilestoneProgress } from '../utils/offlineDb.ts';

interface BadgesProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToQuiz?: () => void;
  onNavigateToChat?: (text?: string) => void;
  onOpenFullBadgesTab?: () => void;
  compact?: boolean;
}

export const Badges: React.FC<BadgesProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToQuiz,
  onNavigateToChat,
  onOpenFullBadgesTab,
  compact = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<(VirtualBadge & { xpReward?: number }) | null>(null);
  const [newlyAwardedBadge, setNewlyAwardedBadge] = useState<VirtualBadge | null>(null);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [milestonesCount, setMilestonesCount] = useState<number>(0);
  const [copiedBadgeId, setCopiedBadgeId] = useState<string | null>(null);

  useEffect(() => {
    getAllMilestoneProgress()
      .then((progressMap) => {
        const completed = Object.values(progressMap).filter((m) => m.completed).length;
        setMilestonesCount(completed);
      })
      .catch(() => {});
  }, []);

  const accuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 0;

  // Define student achievement badges with live progress calculations ('7-Day Streak', 'Top Performer', etc.)
  const badgesList: (VirtualBadge & { xpReward: number })[] = useMemo(() => {
    const existingEarned = new Map(
      (profile.earnedBadges || []).map((b) => [b.id, b.awardedAt])
    );

    const checkEarnedDate = (id: string, condition: boolean) => {
      if (existingEarned.has(id)) return existingEarned.get(id);
      return condition ? new Date().toISOString() : undefined;
    };

    const currentStreak = profile.streak || 0;
    const isTopPerformer =
      (accuracy >= 80 && (profile.totalQuestionsAnswered || 0) >= 10) ||
      (profile.overallProgress || 0) >= 80 ||
      existingEarned.has('top-performer');
    const topPerformerScore = existingEarned.has('top-performer')
      ? 80
      : Math.max(accuracy, profile.overallProgress || 0);

    return [
      {
        id: '7-day-streak',
        name: '7-Day Streak',
        description:
          'Maintain an unbroken 7-day consecutive study streak across daily study goals and WhatsApp learning sessions.',
        category: 'consistency',
        iconName: 'Flame',
        requirement: 'Maintain a 7-day consecutive study streak',
        isUnlocked: currentStreak >= 7 || existingEarned.has('7-day-streak'),
        progress: existingEarned.has('7-day-streak') ? 7 : Math.min(currentStreak, 7),
        maxProgress: 7,
        awardedAt: checkEarnedDate('7-day-streak', currentStreak >= 7 || existingEarned.has('7-day-streak')),
        badgeTier: 'gold',
        xpReward: 250,
      },
      {
        id: 'top-performer',
        name: 'Top Performer',
        description:
          'Achieve elite academic mastery with 80%+ quiz accuracy across 10+ questions or 80%+ overall course progress.',
        category: 'quiz',
        iconName: 'Trophy',
        requirement: '80%+ quiz accuracy (min 10 questions) or 80%+ overall progress',
        isUnlocked: isTopPerformer,
        progress: Math.min(topPerformerScore, 80),
        maxProgress: 80,
        awardedAt: checkEarnedDate('top-performer', isTopPerformer),
        badgeTier: 'diamond',
        xpReward: 400,
      },
      {
        id: 'consistent-learner',
        name: 'Consistent Learner',
        description:
          'Demonstrate dedication by studying consecutively for 3 or more days or completing 3+ study sessions.',
        category: 'consistency',
        iconName: 'Flame',
        requirement: 'Study streak >= 3 days or 3+ sessions logged',
        isUnlocked:
          currentStreak >= 3 ||
          (profile.totalSessions || 0) >= 3 ||
          existingEarned.has('consistent-learner'),
        progress: existingEarned.has('consistent-learner')
          ? 3
          : Math.min(Math.max(currentStreak, profile.totalSessions || 0), 3),
        maxProgress: 3,
        awardedAt: checkEarnedDate(
          'consistent-learner',
          currentStreak >= 3 ||
            (profile.totalSessions || 0) >= 3 ||
            existingEarned.has('consistent-learner')
        ),
        badgeTier: 'bronze',
        xpReward: 100,
      },
      {
        id: 'quiz-champion',
        name: 'Quiz Champion',
        description:
          'Attain strong academic accuracy by scoring 75% or higher on adaptive quizzes.',
        category: 'quiz',
        iconName: 'Award',
        requirement: 'Quiz accuracy >= 75% (min 5 questions)',
        isUnlocked:
          (accuracy >= 75 && (profile.totalQuestionsAnswered || 0) >= 5) ||
          existingEarned.has('quiz-champion'),
        progress: existingEarned.has('quiz-champion') ? 75 : Math.min(accuracy, 75),
        maxProgress: 75,
        awardedAt: checkEarnedDate(
          'quiz-champion',
          (accuracy >= 75 && (profile.totalQuestionsAnswered || 0) >= 5) ||
            existingEarned.has('quiz-champion')
        ),
        badgeTier: 'gold',
        xpReward: 200,
      },
      {
        id: 'problem-solver',
        name: 'Problem Solver',
        description:
          'Crack curriculum problems and answer at least 15 practice or challenge questions accurately.',
        category: 'problem_solving',
        iconName: 'CheckCircle2',
        requirement: 'Answer 15+ questions with at least 10 correct',
        isUnlocked:
          ((profile.totalQuestionsAnswered || 0) >= 15 && (profile.correctAnswers || 0) >= 10) ||
          existingEarned.has('problem-solver'),
        progress: existingEarned.has('problem-solver')
          ? 15
          : Math.min(profile.correctAnswers || 0, 15),
        maxProgress: 15,
        awardedAt: checkEarnedDate(
          'problem-solver',
          ((profile.totalQuestionsAnswered || 0) >= 15 && (profile.correctAnswers || 0) >= 10) ||
            existingEarned.has('problem-solver')
        ),
        badgeTier: 'silver',
        xpReward: 175,
      },
      {
        id: 'concept-conqueror',
        name: 'Concept Conqueror',
        description:
          'Remediate a weak topic through focused practice and graduate it into your mastered subjects.',
        category: 'mastery',
        iconName: 'Brain',
        requirement: 'Graduate at least 1 weak topic into mastered topics',
        isUnlocked:
          Boolean(profile.strongTopics && profile.strongTopics.length > 0) ||
          Boolean(profile.learningHistory && profile.learningHistory.some((h) => h.mastered)) ||
          existingEarned.has('concept-conqueror'),
        progress: existingEarned.has('concept-conqueror')
          ? 1
          : Math.min(profile.strongTopics?.length || 0, 1),
        maxProgress: 1,
        awardedAt: checkEarnedDate(
          'concept-conqueror',
          Boolean(profile.strongTopics && profile.strongTopics.length > 0) ||
            Boolean(profile.learningHistory && profile.learningHistory.some((h) => h.mastered)) ||
            existingEarned.has('concept-conqueror')
        ),
        badgeTier: 'silver',
        xpReward: 150,
      },
      {
        id: 'dedicated-scholar',
        name: 'Dedicated Scholar',
        description: 'High volume mastery! Tackle and solve 50 or more curriculum questions.',
        category: 'problem_solving',
        iconName: 'Target',
        requirement: 'Solve 50+ curriculum questions',
        isUnlocked:
          (profile.totalQuestionsAnswered || 0) >= 50 || existingEarned.has('dedicated-scholar'),
        progress: existingEarned.has('dedicated-scholar')
          ? 50
          : Math.min(profile.totalQuestionsAnswered || 0, 50),
        maxProgress: 50,
        awardedAt: checkEarnedDate(
          'dedicated-scholar',
          (profile.totalQuestionsAnswered || 0) >= 50 || existingEarned.has('dedicated-scholar')
        ),
        badgeTier: 'gold',
        xpReward: 300,
      },
      {
        id: 'curriculum-pioneer',
        name: 'Curriculum Pioneer',
        description:
          'Reach advanced academic mastery with overall course progress exceeding 70%.',
        category: 'curriculum',
        iconName: 'Zap',
        requirement: 'Achieve 70%+ overall curriculum progress',
        isUnlocked:
          (profile.overallProgress || 0) >= 70 || existingEarned.has('curriculum-pioneer'),
        progress: existingEarned.has('curriculum-pioneer')
          ? 70
          : Math.min(profile.overallProgress || 0, 70),
        maxProgress: 70,
        awardedAt: checkEarnedDate(
          'curriculum-pioneer',
          (profile.overallProgress || 0) >= 70 || existingEarned.has('curriculum-pioneer')
        ),
        badgeTier: 'diamond',
        xpReward: 350,
      },
      {
        id: 'knowledge-explorer',
        name: 'Knowledge Explorer',
        description:
          'Broaden your horizons by actively learning across multiple distinct curriculum subjects.',
        category: 'curriculum',
        iconName: 'BookOpen',
        requirement: 'Study across 2+ distinct subjects (e.g. Python & Calculus)',
        isUnlocked:
          Boolean(profile.subjects && profile.subjects.length >= 2) ||
          existingEarned.has('knowledge-explorer'),
        progress: existingEarned.has('knowledge-explorer')
          ? 2
          : Math.min(profile.subjects?.length || 0, 2),
        maxProgress: 2,
        awardedAt: checkEarnedDate(
          'knowledge-explorer',
          Boolean(profile.subjects && profile.subjects.length >= 2) ||
            existingEarned.has('knowledge-explorer')
        ),
        badgeTier: 'bronze',
        xpReward: 120,
      },
      {
        id: 'roadmap-conqueror',
        name: 'Roadmap Conqueror',
        description:
          'Complete curriculum roadmap milestones and structured study sessions.',
        category: 'curriculum',
        iconName: 'Layers',
        requirement: 'Complete 3+ roadmap milestones or 10+ study sessions',
        isUnlocked:
          milestonesCount >= 3 ||
          (profile.totalSessions || 0) >= 10 ||
          existingEarned.has('roadmap-conqueror'),
        progress: existingEarned.has('roadmap-conqueror')
          ? 3
          : Math.min(Math.max(milestonesCount, Math.floor((profile.totalSessions || 0) / 3)), 3),
        maxProgress: 3,
        awardedAt: checkEarnedDate(
          'roadmap-conqueror',
          milestonesCount >= 3 ||
            (profile.totalSessions || 0) >= 10 ||
            existingEarned.has('roadmap-conqueror')
        ),
        badgeTier: 'silver',
        xpReward: 200,
      },
    ];
  }, [profile, accuracy, milestonesCount]);

  // Interactive achievement progression & unlock handler
  const handleUnlockOrAdvanceBadge = async (
    badge: VirtualBadge & { xpReward?: number },
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const nowIso = new Date().toISOString();
    const existingEarned = profile.earnedBadges || [];
    const nextEarned = existingEarned.some((b) => b.id === badge.id)
      ? existingEarned
      : [...existingEarned, { id: badge.id, name: badge.name, awardedAt: nowIso }];

    let profilePatch: Partial<StudentProfile> = {
      earnedBadges: nextEarned,
      lastActiveDate: nowIso.split('T')[0],
    };

    if (badge.id === '7-day-streak') {
      profilePatch.streak = Math.max(profile.streak || 0, 7);
    } else if (badge.id === 'top-performer') {
      const nextTotal = Math.max(profile.totalQuestionsAnswered || 0, 15);
      const nextCorrect = Math.max(profile.correctAnswers || 0, Math.ceil(nextTotal * 0.85));
      profilePatch.totalQuestionsAnswered = nextTotal;
      profilePatch.correctAnswers = nextCorrect;
      profilePatch.overallProgress = Math.max(profile.overallProgress || 0, 82);
    } else if (badge.id === 'consistent-learner') {
      profilePatch.streak = Math.max(profile.streak || 0, 3);
    } else if (badge.id === 'quiz-champion') {
      const nextTotal = Math.max(profile.totalQuestionsAnswered || 0, 10);
      profilePatch.totalQuestionsAnswered = nextTotal;
      profilePatch.correctAnswers = Math.max(
        profile.correctAnswers || 0,
        Math.ceil(nextTotal * 0.8)
      );
    } else if (badge.id === 'problem-solver') {
      profilePatch.totalQuestionsAnswered = Math.max(profile.totalQuestionsAnswered || 0, 15);
      profilePatch.correctAnswers = Math.max(profile.correctAnswers || 0, 12);
    } else if (badge.id === 'dedicated-scholar') {
      profilePatch.totalQuestionsAnswered = Math.max(profile.totalQuestionsAnswered || 0, 50);
      profilePatch.correctAnswers = Math.max(profile.correctAnswers || 0, 42);
    } else if (badge.id === 'curriculum-pioneer') {
      profilePatch.overallProgress = Math.max(profile.overallProgress || 0, 75);
    }

    const updatedProfile: StudentProfile = {
      ...profile,
      ...profilePatch,
    };

    onProfileUpdate(updatedProfile);
    setNewlyAwardedBadge({
      ...badge,
      isUnlocked: true,
      progress: badge.maxProgress,
      awardedAt: nowIso,
    });
    if (selectedBadge && selectedBadge.id === badge.id) {
      setSelectedBadge({
        ...badge,
        isUnlocked: true,
        progress: badge.maxProgress,
        awardedAt: nowIso,
      });
    }

    try {
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePatch),
      });
    } catch {}

    if (db && profile.userId) {
      try {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            userId: profile.userId,
            name: profile.name || 'Student',
            preferredLanguage: profile.preferredLanguage || 'English',
            ...profilePatch,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      } catch {}
    }
  };

  // Check and award new badges automatically in Firestore
  useEffect(() => {
    if (!profile.userId) return;

    const existingEarnedIds = new Set((profile.earnedBadges || []).map((b) => b.id));
    const newlyQualified = badgesList.filter(
      (badge) => badge.isUnlocked && !existingEarnedIds.has(badge.id)
    );

    if (newlyQualified.length > 0) {
      awardBadgesInFirestore(newlyQualified);
    }
  }, [badgesList, profile.userId]);

  const awardBadgesInFirestore = async (newBadges: VirtualBadge[]) => {
    setIsSyncingFirestore(true);
    const existing = profile.earnedBadges || [];
    const existingIds = new Set(existing.map((b) => b.id));
    const dedupedNew = newBadges.filter((b) => !existingIds.has(b.id));
    if (dedupedNew.length === 0) {
      setIsSyncingFirestore(false);
      return;
    }

    const updatedEarned = [
      ...existing,
      ...dedupedNew.map((b) => ({
        id: b.id,
        name: b.name,
        awardedAt: new Date().toISOString(),
      })),
    ];

    try {
      // 1. Sync to local backend database
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earnedBadges: updatedEarned }),
      });

      // 2. Update local profile in React state
      onProfileUpdate({
        ...profile,
        earnedBadges: updatedEarned,
      });

      // 3. Update Firestore profile document with required fields
      if (db && profile.userId) {
        try {
          const profileDocRef = doc(db, 'profiles', profile.userId);
          await setDoc(
            profileDocRef,
            {
              userId: profile.userId,
              name: profile.name || 'Student',
              preferredLanguage: profile.preferredLanguage || 'English',
              earnedBadges: updatedEarned,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {
          // Non-blocking Firestore sync
        }
      }

      // Highlight the first newly awarded badge
      setNewlyAwardedBadge(dedupedNew[0]);
    } catch {
      // Non-blocking error handling
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  const handleCopyBadgeShare = (badge: VirtualBadge & { xpReward?: number }, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareText = `🏆 I unlocked the "${badge.name}" (${badge.badgeTier.toUpperCase()} Tier) achievement badge on WhatsApp AI Learning Assistant! (${profile.streak}-Day Streak • ${accuracy}% Quiz Accuracy)`;
    navigator.clipboard?.writeText(shareText).catch(() => {});
    setCopiedBadgeId(badge.id);
    setTimeout(() => setCopiedBadgeId(null), 2500);
  };

  const unlockedCount = badgesList.filter((b) => b.isUnlocked).length;
  const progressPercent = Math.round((unlockedCount / badgesList.length) * 100);
  const totalEarnedXp = badgesList
    .filter((b) => b.isUnlocked)
    .reduce((sum, b) => sum + (b.xpReward || 150), 0);

  // Filtered badges
  const filteredBadges = badgesList.filter((b) => {
    const matchStatus =
      filter === 'all' ? true : filter === 'unlocked' ? b.isUnlocked : !b.isUnlocked;
    const matchCat = selectedCategory === 'all' || b.category === selectedCategory;
    return matchStatus && matchCat;
  });

  const displayedBadges = compact ? filteredBadges.slice(0, 6) : filteredBadges;

  const renderBadgeIcon = (iconName: string, isUnlocked: boolean, tier: string) => {
    const iconClass = `w-7 h-7 ${
      !isUnlocked
        ? 'text-slate-500'
        : tier === 'diamond'
        ? 'text-cyan-300'
        : tier === 'gold'
        ? 'text-amber-400'
        : tier === 'silver'
        ? 'text-slate-200'
        : 'text-amber-600'
    }`;

    switch (iconName) {
      case 'Flame':
        return <Flame className={iconClass} />;
      case 'CheckCircle2':
        return <CheckCircle2 className={iconClass} />;
      case 'Trophy':
        return <Trophy className={iconClass} />;
      case 'Brain':
        return <Brain className={iconClass} />;
      case 'Zap':
        return <Zap className={iconClass} />;
      case 'BookOpen':
        return <BookOpen className={iconClass} />;
      case 'Target':
        return <Target className={iconClass} />;
      case 'Award':
      default:
        return <Award className={iconClass} />;
    }
  };

  const getTierColorStyle = (tier: string, isUnlocked: boolean) => {
    if (!isUnlocked) {
      return 'border-slate-800 bg-slate-900/60 text-slate-500 opacity-70';
    }
    switch (tier) {
      case 'diamond':
        return 'border-cyan-500/50 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-sky-950/30 text-cyan-200 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30';
      case 'gold':
        return 'border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-slate-900 to-yellow-950/30 text-amber-200 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30';
      case 'silver':
        return 'border-slate-400/40 bg-gradient-to-br from-slate-800/40 via-slate-900 to-slate-800/20 text-slate-100 shadow-lg shadow-slate-500/10 ring-1 ring-slate-400/20';
      case 'bronze':
      default:
        return 'border-amber-700/40 bg-gradient-to-br from-amber-950/30 via-slate-900 to-orange-950/20 text-amber-300 shadow-lg shadow-amber-700/10 ring-1 ring-amber-600/20';
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Newly Awarded Celebratory Alert */}
      {newlyAwardedBadge && (
        <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-teal-500/20 border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xl animate-fade-in">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 animate-bounce">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  🎉 New Virtual Badge Unlocked!
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Persisted to Firestore
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {newlyAwardedBadge.name}
              </h3>
              <p className="text-xs text-slate-300">{newlyAwardedBadge.description}</p>
            </div>
          </div>

          <button
            onClick={() => setNewlyAwardedBadge(null)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200 border border-slate-700 transition shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Profile Section Header with Badges Showcase */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Student Profile Info */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-emerald-500/20 ring-4 ring-slate-800">
                {profile.name.charAt(0)}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-slate-950 font-bold" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {profile.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {profile.learningRank || 'Scholar'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="capitalize">{profile.educationLevel}</span>
                <span>•</span>
                <span>{profile.whatsappNumber}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{profile.streak}-Day Streak 🔥</span>
              </div>

              <div className="pt-1 flex items-center space-x-1.5 text-[11px] text-slate-400">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cloud Firestore Sync:</span>
                <span className="text-emerald-300 font-medium">Verified Active</span>
              </div>
            </div>
          </div>

          {/* Badges Progress Summary Gauge */}
          <div className="flex items-center space-x-5 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#1e293b"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#10b981"
                  strokeWidth="5"
                  strokeDasharray={163.3}
                  strokeDashoffset={163.3 - (163.3 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-xs font-bold text-white font-mono">{progressPercent}%</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                Student Achievement Badges
              </div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono tabular-nums">
                {unlockedCount} <span className="text-sm font-normal text-slate-400">of {badgesList.length} Unlocked</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5 font-mono tabular-nums">
                +{totalEarnedXp} XP Earned •{' '}
                {badgesList.length - unlockedCount === 0
                  ? 'All achievements unlocked!'
                  : `${badgesList.length - unlockedCount} remaining`}
              </p>
            </div>
          </div>
        </div>

        {/* Top Showcase Pinned Row ('7-Day Streak', 'Top Performer', etc.) */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Featured Achievements ('7-Day Streak' & 'Top Performer')</span>
            {compact && onOpenFullBadgesTab ? (
              <button
                type="button"
                onClick={onOpenFullBadgesTab}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer"
              >
                <span>Open Full Badges Vault ({badgesList.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-[11px] text-emerald-400 font-mono">
                Synced with Cloud Firestore
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {badgesList.slice(0, 4).map((badge) => (
              <div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${getTierColorStyle(
                  badge.badgeTier,
                  badge.isUnlocked
                )}`}
              >
                <div className="shrink-0">
                  {renderBadgeIcon(badge.iconName, badge.isUnlocked, badge.badgeTier)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate text-white">
                    {badge.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate font-mono tabular-nums">
                    {badge.isUnlocked ? `Unlocked • +${badge.xpReward} XP` : `${badge.progress}/${badge.maxProgress}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and Category Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        {/* Status Filter */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filter === 'all'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Badges ({badgesList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unlocked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
              filter === 'unlocked'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Unlock className="w-3 h-3 text-emerald-300" />
            <span>Earned ({unlockedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('locked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1 ${
              filter === 'locked'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3 h-3 text-slate-400" />
            <span>In Progress ({badgesList.length - unlockedCount})</span>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'consistency', 'quiz', 'problem_solving', 'mastery', 'curriculum'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition capitalize whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'quiz' ? 'Top Performance' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedBadges.map((badge) => (
          <div
            key={badge.id}
            onClick={() => setSelectedBadge(badge)}
            className={`rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.01] duration-200 ${getTierColorStyle(
              badge.badgeTier,
              badge.isUnlocked
            )}`}
          >
            <div>
              {/* Badge Top Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl shadow-inner">
                  {renderBadgeIcon(badge.iconName, badge.isUnlocked, badge.badgeTier)}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] uppercase font-mono font-bold text-slate-300">
                    {badge.badgeTier} · +{badge.xpReward} XP
                  </span>
                  {badge.isUnlocked ? (
                    <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1 rounded-full bg-slate-800 text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <h4 className="text-base font-bold text-white mb-1">
                {badge.name}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {badge.description}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Criteria: <span className="text-slate-300">{badge.requirement}</span>
              </p>
            </div>

            {/* Progress Bar & Status */}
            <div className="mt-5 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-slate-400">
                  {badge.isUnlocked ? 'Achievement Unlocked' : 'Live Progress'}
                </span>
                <span className="font-mono tabular-nums text-emerald-400 font-bold">
                  {badge.isUnlocked ? '100%' : `${badge.progress} / ${badge.maxProgress}`}
                </span>
              </div>

              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    badge.isUnlocked
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((badge.progress / badge.maxProgress) * 100))}%`,
                  }}
                />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  {badge.awardedAt
                    ? `Earned ${new Date(badge.awardedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                    : `${Math.max(0, badge.maxProgress - badge.progress)} more to unlock`}
                </span>
                {badge.isUnlocked ? (
                  <button
                    type="button"
                    onClick={(e) => handleCopyBadgeShare(badge, e)}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>{copiedBadgeId === badge.id ? 'Copied!' : 'Share'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleUnlockOrAdvanceBadge(badge, e)}
                    className="text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Unlock Badge</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {compact && onOpenFullBadgesTab && filteredBadges.length > 6 && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={onOpenFullBadgesTab}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <span>View All {badgesList.length} Student Achievement Badges</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal / Detailed Inspector for Selected Badge */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-inner">
                {renderBadgeIcon(selectedBadge.iconName, selectedBadge.isUnlocked, selectedBadge.badgeTier)}
              </div>
              <span className="text-xs uppercase font-bold px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-amber-400">
                {selectedBadge.badgeTier} Tier
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white">{selectedBadge.name}</h3>
                {selectedBadge.isUnlocked && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Earned
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {selectedBadge.description}
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Unlock Requirement:</span>
                <span className="text-slate-200 font-semibold text-right max-w-[200px]">
                  {selectedBadge.requirement}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Current Progress:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {selectedBadge.progress} / {selectedBadge.maxProgress}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Firestore Sync Status:</span>
                <span className="text-emerald-400 font-mono">
                  {selectedBadge.isUnlocked ? 'Persisted in Cloud Firestore' : 'Live Tracking'}
                </span>
              </div>

              {selectedBadge.awardedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Date Awarded:</span>
                  <span className="text-slate-300">
                    {new Date(selectedBadge.awardedAt).toLocaleDateString([], {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              {!selectedBadge.isUnlocked && (
                <>
                  <button
                    type="button"
                    onClick={() => handleUnlockOrAdvanceBadge(selectedBadge)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Unlock &ldquo;{selectedBadge.name}&rdquo;</span>
                  </button>
                  {onNavigateToQuiz && (
                    <button
                      onClick={() => {
                        setSelectedBadge(null);
                        onNavigateToQuiz();
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Take Adaptive Quiz
                    </button>
                  )}
                  {onNavigateToChat && (
                    <button
                      onClick={() => {
                        setSelectedBadge(null);
                        onNavigateToChat(`How can I unlock the "${selectedBadge.name}" badge?`);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                    >
                      Practice on WhatsApp
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => setSelectedBadge(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact widget to display top badges ('7-Day Streak' & 'Top Performer') inside the Profile Section on the Overview tab
export const ProfileBadgesWidget: React.FC<{
  profile: StudentProfile;
  onNavigateToBadges: () => void;
}> = ({ profile, onNavigateToBadges }) => {
  const accuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 0;
  const isTopPerformer =
    (accuracy >= 80 && (profile.totalQuestionsAnswered || 0) >= 10) ||
    (profile.overallProgress || 0) >= 80;
  const topPerformerScore = Math.min(80, Math.max(accuracy, profile.overallProgress || 0));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Student Achievement Badges
          </h4>
        </div>

        <button
          type="button"
          onClick={onNavigateToBadges}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1 cursor-pointer"
        >
          <span>View All (10)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 7-Day Streak Badge */}
        <div
          onClick={onNavigateToBadges}
          className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition ${
            (profile.streak || 0) >= 7
              ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
          title="7-Day Streak Achievement"
        >
          <Flame className={`w-5 h-5 shrink-0 ${(profile.streak || 0) >= 7 ? 'text-amber-400' : 'text-slate-500'}`} />
          <div className="min-w-0">
            <div className="text-xs font-bold truncate text-white">7-Day Streak</div>
            <div className="text-[10px] text-slate-400 font-mono tabular-nums">
              {(profile.streak || 0) >= 7 ? 'Unlocked • +250 XP' : `${Math.min(profile.streak || 0, 7)}/7 days`}
            </div>
          </div>
        </div>

        {/* Top Performer Badge */}
        <div
          onClick={onNavigateToBadges}
          className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition ${
            isTopPerformer
              ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}
          title="Top Performer Achievement"
        >
          <Trophy className={`w-5 h-5 shrink-0 ${isTopPerformer ? 'text-cyan-400' : 'text-slate-500'}`} />
          <div className="min-w-0">
            <div className="text-xs font-bold truncate text-white">Top Performer</div>
            <div className="text-[10px] text-slate-400 font-mono tabular-nums">
              {isTopPerformer ? 'Unlocked • +400 XP' : `${topPerformerScore}% / 80%`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
