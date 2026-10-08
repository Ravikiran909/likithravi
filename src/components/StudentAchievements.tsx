import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Flame,
  Target,
  GraduationCap,
  Award,
  CheckCircle2,
  Lock,
  Share2,
  ArrowRight,
  Zap,
  Crown,
  BookOpen,
  Medal,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Code2,
  Building2,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

export type MilestoneCategoryFilter =
  | 'all'
  | 'earned_only'
  | 'streak'
  | 'questions'
  | 'topic_mastery';

export interface StudentMilestoneBadge {
  id: string;
  title: string;
  badgeCode: string;
  milestoneLabel: string;
  category: 'streak' | 'questions' | 'topic_mastery';
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  xpPoints: number;
  description: string;
  requirementSummary: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  unlocked: boolean;
  awardedAt?: string;
  masteredTopicList?: string[];
  accent: 'amber' | 'indigo' | 'emerald' | 'sky';
  iconName:
    | 'flame'
    | 'zap'
    | 'crown'
    | 'target'
    | 'trophy'
    | 'medal'
    | 'graduation'
    | 'book'
    | 'award'
    | 'code'
    | 'building';
}

interface StudentAchievementsProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  onNavigateToRoadmap?: () => void;
}

export const StudentAchievements: React.FC<StudentAchievementsProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  onNavigateToRoadmap,
}) => {
  const [activeFilter, setActiveFilter] = useState<MilestoneCategoryFilter>('all');
  const [inspectedBadge, setInspectedBadge] = useState<StudentMilestoneBadge | null>(null);
  const [newlyAwardedBadge, setNewlyAwardedBadge] = useState<StudentMilestoneBadge | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [newTopicInput, setNewTopicInput] = useState<string>('');
  const [showTopicAdder, setShowTopicAdder] = useState<boolean>(false);

  // Extract core student metrics from profile
  const currentStreak = profile.streak || 0;
  const totalQuestions = profile.totalQuestionsAnswered || 0;
  const correctQuestions = profile.correctAnswers || 0;

  const masteredTopics = useMemo(() => {
    const fromHistory = (profile.learningHistory || [])
      .filter((item) => item.mastered)
      .map((item) => item.topic);
    const fromStrong = profile.strongTopics || [];
    return Array.from(new Set([...fromStrong, ...fromHistory])).filter(Boolean);
  }, [profile.learningHistory, profile.strongTopics]);

  const masteredTopicsCount = masteredTopics.length;

  const earnedMap = useMemo(() => {
    const map = new Map<string, string>();
    (profile.earnedBadges || []).forEach((b) => {
      map.set(b.id, b.awardedAt);
    });
    (profile.achievements || []).forEach((id) => {
      if (typeof id === 'string' && !map.has(id)) {
        map.set(id, profile.lastActiveDate || new Date().toISOString());
      }
    });
    return map;
  }, [profile.earnedBadges, profile.achievements, profile.lastActiveDate]);

  // Digital badges definitions featuring 'Quiz Streak Hero' (7-day streak), 'Concept Master' (Topic mastery), and '100 Questions Answered'
  const milestoneBadges: StudentMilestoneBadge[] = useMemo(() => {
    const isUnlocked = (id: string, condition: boolean) => condition || earnedMap.has(id);
    const getAwardDate = (id: string, unlocked: boolean) =>
      earnedMap.get(id) ||
      (unlocked ? profile.lastActiveDate || new Date().toISOString() : undefined);

    const quizStreakHeroUnlocked = isUnlocked(
      'milestone_7_day_streak',
      currentStreak >= 7 ||
        earnedMap.has('badge_streak_7') ||
        earnedMap.has('streak_7_day_guardian') ||
        earnedMap.has('quiz_streak_hero')
    );

    const centurionQuestionsUnlocked = isUnlocked(
      'milestone_100_questions_answered',
      totalQuestions >= 100 || earnedMap.has('badge_questions_100')
    );

    const conceptMasterUnlocked = isUnlocked(
      'milestone_mastered_new_topic',
      masteredTopicsCount >= 1 || earnedMap.has('concept_master')
    );

    return [
      // 1. SIGNATURE DIGITAL BADGE: 'Quiz Streak Hero' (7-Day Study Streak)
      {
        id: 'milestone_7_day_streak',
        title: 'Quiz Streak Hero',
        badgeCode: 'BDG-STRK-07',
        milestoneLabel: '7-Day Study Streak',
        category: 'streak',
        tier: 'Gold',
        xpPoints: 450,
        description:
          'Awarded for maintaining a 7-day study and daily quiz streak without missing a single day.',
        requirementSummary: 'Complete a 7-day study & quiz streak',
        currentValue: Math.min(7, currentStreak),
        targetValue: 7,
        unit: 'days',
        unlocked: quizStreakHeroUnlocked,
        awardedAt: getAwardDate('milestone_7_day_streak', quizStreakHeroUnlocked),
        accent: 'amber',
        iconName: 'flame',
      },

      // 2. SIGNATURE DIGITAL BADGE: 'Centurion Problem Solver' (100 Questions Answered)
      {
        id: 'milestone_100_questions_answered',
        title: '100-Question Centurion',
        badgeCode: 'BDG-QUIZ-100',
        milestoneLabel: '100 Questions Answered',
        category: 'questions',
        tier: 'Gold',
        xpPoints: 500,
        description:
          'Awarded for answering 100 adaptive quiz and exam practice questions across DSA, STEM, and Government Exams.',
        requirementSummary: 'Answer 100 practice or quiz questions',
        currentValue: Math.min(100, totalQuestions),
        targetValue: 100,
        unit: 'questions',
        unlocked: centurionQuestionsUnlocked,
        awardedAt: getAwardDate('milestone_100_questions_answered', centurionQuestionsUnlocked),
        accent: 'indigo',
        iconName: 'trophy',
      },

      // 3. SIGNATURE DIGITAL BADGE: 'Concept Master' (Mastered a New Topic)
      {
        id: 'milestone_mastered_new_topic',
        title: 'Concept Master',
        badgeCode: 'BDG-MSTR-01',
        milestoneLabel: 'Mastered a New Topic',
        category: 'topic_mastery',
        tier: 'Gold',
        xpPoints: 400,
        description:
          'Awarded for achieving verified conceptual mastery in a curriculum topic through Socratic tutoring and high quiz accuracy.',
        requirementSummary: 'Master at least 1 core curriculum topic',
        currentValue: Math.min(1, masteredTopicsCount),
        targetValue: 1,
        unit: 'topic',
        masteredTopicList: masteredTopics,
        unlocked: conceptMasterUnlocked,
        awardedAt: getAwardDate('milestone_mastered_new_topic', conceptMasterUnlocked),
        accent: 'emerald',
        iconName: 'graduation',
      },

      // Additional Streak Digital Badges
      {
        id: 'milestone_3_day_streak',
        title: '3-Day Ignited Spark',
        badgeCode: 'BDG-STRK-03',
        milestoneLabel: '3-Day Study Streak',
        category: 'streak',
        tier: 'Bronze',
        xpPoints: 150,
        description:
          'Built initial study momentum by completing 3 consecutive days of active recall and daily quizzes.',
        requirementSummary: 'Reach a 3-day study streak',
        currentValue: Math.min(3, currentStreak),
        targetValue: 3,
        unit: 'days',
        unlocked: isUnlocked('milestone_3_day_streak', currentStreak >= 3),
        awardedAt: getAwardDate(
          'milestone_3_day_streak',
          isUnlocked('milestone_3_day_streak', currentStreak >= 3)
        ),
        accent: 'amber',
        iconName: 'zap',
      },
      {
        id: 'milestone_14_day_streak',
        title: 'Fortnight Streak Guardian',
        badgeCode: 'BDG-STRK-14',
        milestoneLabel: '14-Day Study Streak',
        category: 'streak',
        tier: 'Diamond',
        xpPoints: 800,
        description:
          'Sustained two full weeks of uninterrupted daily study, Pomodoro focus blocks, and quiz practice.',
        requirementSummary: 'Reach a 14-day study streak',
        currentValue: Math.min(14, currentStreak),
        targetValue: 14,
        unit: 'days',
        unlocked: isUnlocked('milestone_14_day_streak', currentStreak >= 14),
        awardedAt: getAwardDate(
          'milestone_14_day_streak',
          isUnlocked('milestone_14_day_streak', currentStreak >= 14)
        ),
        accent: 'amber',
        iconName: 'crown',
      },

      // Additional Questions Answered Digital Badges
      {
        id: 'milestone_25_questions_answered',
        title: 'Rapid Quiz Tactician',
        badgeCode: 'BDG-QUIZ-25',
        milestoneLabel: '25 Questions Answered',
        category: 'questions',
        tier: 'Bronze',
        xpPoints: 150,
        description:
          'Completed your first 25 diagnostic and practice MCQs with step-by-step concept review.',
        requirementSummary: 'Answer 25 practice or quiz questions',
        currentValue: Math.min(25, totalQuestions),
        targetValue: 25,
        unit: 'questions',
        unlocked: isUnlocked('milestone_25_questions_answered', totalQuestions >= 25),
        awardedAt: getAwardDate(
          'milestone_25_questions_answered',
          isUnlocked('milestone_25_questions_answered', totalQuestions >= 25)
        ),
        accent: 'indigo',
        iconName: 'target',
      },
      {
        id: 'milestone_50_questions_answered',
        title: 'Half-Century Quiz Challenger',
        badgeCode: 'BDG-QUIZ-50',
        milestoneLabel: '50 Questions Answered',
        category: 'questions',
        tier: 'Silver',
        xpPoints: 300,
        description:
          'Solved 50 adaptive quiz questions across core curriculum topics to sharpen exam readiness.',
        requirementSummary: 'Answer 50 practice or quiz questions',
        currentValue: Math.min(50, totalQuestions),
        targetValue: 50,
        unit: 'questions',
        unlocked: isUnlocked('milestone_50_questions_answered', totalQuestions >= 50),
        awardedAt: getAwardDate(
          'milestone_50_questions_answered',
          isUnlocked('milestone_50_questions_answered', totalQuestions >= 50)
        ),
        accent: 'indigo',
        iconName: 'medal',
      },

      // Additional Concept Mastery Digital Badges
      {
        id: 'milestone_mastered_3_topics',
        title: 'DSA & Algorithm Architect',
        badgeCode: 'BDG-MSTR-03',
        milestoneLabel: 'Mastered 3 Topics',
        category: 'topic_mastery',
        tier: 'Gold',
        xpPoints: 500,
        description:
          'Achieved verified mastery across 3 distinct academic topics including Data Structures & Algorithms.',
        requirementSummary: 'Master 3 distinct curriculum topics',
        currentValue: Math.min(3, masteredTopicsCount),
        targetValue: 3,
        unit: 'topics',
        masteredTopicList: masteredTopics,
        unlocked: isUnlocked('milestone_mastered_3_topics', masteredTopicsCount >= 3),
        awardedAt: getAwardDate(
          'milestone_mastered_3_topics',
          isUnlocked('milestone_mastered_3_topics', masteredTopicsCount >= 3)
        ),
        accent: 'emerald',
        iconName: 'code',
      },
      {
        id: 'milestone_mastered_5_topics',
        title: 'Grand Concept Virtuoso',
        badgeCode: 'BDG-MSTR-05',
        milestoneLabel: 'Mastered 5 Topics',
        category: 'topic_mastery',
        tier: 'Diamond',
        xpPoints: 750,
        description:
          'Mastered 5 or more core topics across DSA, Government Exams, and STEM subjects with high retention.',
        requirementSummary: 'Master 5 distinct curriculum topics',
        currentValue: Math.min(5, masteredTopicsCount),
        targetValue: 5,
        unit: 'topics',
        masteredTopicList: masteredTopics,
        unlocked: isUnlocked('milestone_mastered_5_topics', masteredTopicsCount >= 5),
        awardedAt: getAwardDate(
          'milestone_mastered_5_topics',
          isUnlocked('milestone_mastered_5_topics', masteredTopicsCount >= 5)
        ),
        accent: 'emerald',
        iconName: 'award',
      },
    ];
  }, [
    currentStreak,
    totalQuestions,
    masteredTopicsCount,
    masteredTopics,
    earnedMap,
    profile.lastActiveDate,
  ]);

  // Automatically sync unlocked milestone badges to student profile & Firestore
  useEffect(() => {
    const unlockedList = milestoneBadges.filter((b) => b.unlocked);
    const existingEarned = profile.earnedBadges || [];
    const existingIds = new Set(existingEarned.map((b) => b.id));
    const newlyUnlocked = unlockedList.filter((b) => !existingIds.has(b.id));

    if (newlyUnlocked.length > 0 && profile.userId) {
      const nowIso = new Date().toISOString();
      const updatedEarned = [
        ...existingEarned,
        ...newlyUnlocked.map((b) => ({
          id: b.id,
          name: b.title,
          awardedAt: b.awardedAt || nowIso,
        })),
      ];
      const updatedAchievements = Array.from(
        new Set([...(profile.achievements || []), ...unlockedList.map((b) => b.id)])
      );

      if (db && profile.userId) {
        setDoc(
          doc(db, 'profiles', profile.userId),
          {
            userId: profile.userId,
            earnedBadges: updatedEarned,
            achievements: updatedAchievements,
          },
          { merge: true }
        ).catch(() => {});
      }
    }
  }, [milestoneBadges, profile.userId]);

  const filteredBadges = useMemo(() => {
    if (activeFilter === 'earned_only') {
      return milestoneBadges.filter((b) => b.unlocked);
    }
    if (activeFilter === 'all') {
      return milestoneBadges;
    }
    return milestoneBadges.filter((b) => b.category === activeFilter);
  }, [milestoneBadges, activeFilter]);

  const summaryStats = useMemo(() => {
    const earned = milestoneBadges.filter((b) => b.unlocked);
    const totalXp = earned.reduce((acc, b) => acc + b.xpPoints, 0);
    const completionPct = Math.round((earned.length / milestoneBadges.length) * 100);
    return {
      earnedCount: earned.length,
      totalCount: milestoneBadges.length,
      totalXp,
      completionPct,
    };
  }, [milestoneBadges]);

  // Signature Trio: 'Quiz Streak Hero' (7-day streak), '100-Question Centurion' (100 questions), 'Concept Master' (Mastered topic)
  const signatureMilestones = useMemo(() => {
    return milestoneBadges.filter((b) =>
      [
        'milestone_7_day_streak',
        'milestone_100_questions_answered',
        'milestone_mastered_new_topic',
      ].includes(b.id)
    );
  }, [milestoneBadges]);

  const persistProfileChanges = async (
    updates: Partial<StudentProfile>,
    badgeToAward: StudentMilestoneBadge,
    feedbackText: string
  ) => {
    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const existingEarned = profile.earnedBadges || [];
      const nextEarned = existingEarned.some((b) => b.id === badgeToAward.id)
        ? existingEarned
        : [...existingEarned, { id: badgeToAward.id, name: badgeToAward.title, awardedAt: nowIso }];

      const nextAchievements = Array.from(
        new Set([...(profile.achievements || []), badgeToAward.id])
      );

      const mergedProfile: StudentProfile = {
        ...profile,
        ...updates,
        earnedBadges: nextEarned,
        achievements: nextAchievements,
        lastActiveDate: nowIso.split('T')[0],
      };

      onProfileUpdate(mergedProfile);

      if (db && profile.userId) {
        try {
          await setDoc(
            doc(db, 'profiles', profile.userId),
            {
              userId: profile.userId,
              streak: mergedProfile.streak,
              totalQuestionsAnswered: mergedProfile.totalQuestionsAnswered,
              correctAnswers: mergedProfile.correctAnswers,
              overallProgress: mergedProfile.overallProgress,
              strongTopics: mergedProfile.strongTopics,
              learningHistory: mergedProfile.learningHistory,
              earnedBadges: nextEarned,
              achievements: nextAchievements,
              lastActiveDate: mergedProfile.lastActiveDate,
            },
            { merge: true }
          );
        } catch {}
      }

      try {
        await fetch(`/api/students/${profile.userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...updates,
            earnedBadges: nextEarned,
            achievements: nextAchievements,
            lastActiveDate: mergedProfile.lastActiveDate,
          }),
        });
      } catch {}

      setNewlyAwardedBadge({
        ...badgeToAward,
        unlocked: true,
        currentValue: badgeToAward.targetValue,
        awardedAt: nowIso,
      });
      setStatusMessage(feedbackText);
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordMilestoneProgress = async (badge: StudentMilestoneBadge) => {
    if (badge.category === 'streak') {
      const nextStreak = Math.max(currentStreak + 1, badge.targetValue);
      await persistProfileChanges(
        { streak: nextStreak },
        badge,
        `🏆 Digital Badge Awarded: "${badge.title}" (${nextStreak}-day study streak unlocked!)`
      );
    } else if (badge.category === 'questions') {
      const nextQuestions = Math.max(totalQuestions + 10, badge.targetValue);
      const addedQuestions = Math.max(0, nextQuestions - totalQuestions);
      const nextCorrect = correctQuestions + Math.round(addedQuestions * 0.85);
      await persistProfileChanges(
        {
          totalQuestionsAnswered: nextQuestions,
          correctAnswers: nextCorrect,
        },
        badge,
        `🏆 Digital Badge Awarded: "${badge.title}" (${nextQuestions} questions answered!)`
      );
    } else if (badge.category === 'topic_mastery') {
      const candidateTopics = [
        'Dynamic Programming & Memoization',
        'Indian Polity — Fundamental Rights (Art. 12–35)',
        'Graph Algorithms — Dijkstra & BFS',
        'Quantitative Aptitude — Profit & Loss',
        'Python Asynchronous Generators',
      ];
      const nextTopic =
        candidateTopics.find((t) => !masteredTopics.includes(t)) ||
        `Advanced ${profile.subjects?.[0] || 'DSA'} Concept #${masteredTopicsCount + 1}`;
      const updatedStrong = Array.from(new Set([...(profile.strongTopics || []), nextTopic]));
      const updatedHistory = [
        ...(profile.learningHistory || []),
        {
          topic: nextTopic,
          subject: profile.subjects?.[0] || 'DSA',
          date: new Date().toISOString().split('T')[0],
          score: 94,
          mastered: true,
        },
      ];
      await persistProfileChanges(
        {
          strongTopics: updatedStrong,
          learningHistory: updatedHistory,
          overallProgress: Math.min(100, (profile.overallProgress || 68) + 4),
        },
        badge,
        `🏆 Digital Badge Awarded: "${badge.title}" — Mastered "${nextTopic}"!`
      );
    }
  };

  const handleAddCustomMasteredTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTopicInput.trim();
    if (!trimmed) return;

    const topicBadge =
      milestoneBadges.find((b) => b.id === 'milestone_mastered_new_topic') || milestoneBadges[2];
    const updatedStrong = Array.from(new Set([...(profile.strongTopics || []), trimmed]));
    const updatedHistory = [
      ...(profile.learningHistory || []),
      {
        topic: trimmed,
        subject: profile.subjects?.[0] || 'DSA & Exams',
        date: new Date().toISOString().split('T')[0],
        score: 95,
        mastered: true,
      },
    ];

    await persistProfileChanges(
      {
        strongTopics: updatedStrong,
        learningHistory: updatedHistory,
        overallProgress: Math.min(100, (profile.overallProgress || 68) + 5),
      },
      topicBadge,
      `🏆 Awarded "Concept Master" badge for mastering "${trimmed}"!`
    );
    setNewTopicInput('');
    setShowTopicAdder(false);
  };

  const renderBadgeIcon = (
    iconName: StudentMilestoneBadge['iconName'],
    className = 'w-5 h-5'
  ) => {
    switch (iconName) {
      case 'flame':
        return <Flame className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'crown':
        return <Crown className={className} />;
      case 'target':
        return <Target className={className} />;
      case 'trophy':
        return <Trophy className={className} />;
      case 'medal':
        return <Medal className={className} />;
      case 'graduation':
        return <GraduationCap className={className} />;
      case 'book':
        return <BookOpen className={className} />;
      case 'code':
        return <Code2 className={className} />;
      case 'building':
        return <Building2 className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  return (
    <section
      aria-label="Student Achievements"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden"
    >
      {/* Subtle Background Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Digital Badge Summary */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 font-bold text-amber-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Verified Digital Badges</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-white font-semibold">
              {summaryStats.earnedCount}/{summaryStats.totalCount} Badges Unlocked (
              {summaryStats.completionPct}%)
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-emerald-400 font-bold">
              +{summaryStats.totalXp} Achievement XP
            </span>
          </div>

          <h3 className="text-lg font-bold text-white flex items-center gap-2.5 pt-1">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Student Achievements &amp; Digital Badges</span>
          </h3>

          <p className="text-xs text-slate-400 max-w-2xl">
            Earn verified digital badges including{' '}
            <span className="text-amber-300 font-semibold">Quiz Streak Hero</span> (7-day study
            streak),{' '}
            <span className="text-emerald-300 font-semibold">Concept Master</span> (curriculum
            topic mastery), and{' '}
            <span className="text-indigo-300 font-semibold">100-Question Centurion</span> (100
            questions answered).
          </p>
        </div>

        {/* Category Segmented Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter Achievement Milestones"
            className="inline-flex flex-wrap items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs"
          >
            {[
              { id: 'all', label: 'All Badges' },
              { id: 'earned_only', label: `Earned (${summaryStats.earnedCount})` },
              { id: 'streak', label: 'Quiz Streak Hero' },
              { id: 'questions', label: '100 Questions' },
              { id: 'topic_mastery', label: 'Concept Master' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as MilestoneCategoryFilter)}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowTopicAdder(!showTopicAdder)}
            className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>+ Log Concept Mastery</span>
          </button>
        </div>
      </div>

      {/* Animated Digital Badge Unlock Banner */}
      <AnimatePresence>
        {newlyAwardedBadge && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="relative z-10 bg-gradient-to-r from-amber-500/20 via-indigo-500/15 to-emerald-500/20 border border-amber-400/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
          >
            <div className="flex items-center space-x-3.5">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8 }}
                className="w-12 h-12 rounded-2xl bg-amber-500/25 border border-amber-400 text-amber-300 flex items-center justify-center shrink-0 shadow-md"
              >
                {renderBadgeIcon(newlyAwardedBadge.iconName, 'w-6 h-6')}
              </motion.div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                    New Digital Badge Unlocked!
                  </span>
                  <span className="text-xs font-mono text-amber-300 font-bold">
                    +{newlyAwardedBadge.xpPoints} XP
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-white mt-0.5">
                  {newlyAwardedBadge.title} ({newlyAwardedBadge.milestoneLabel})
                </h4>
                <p className="text-xs text-slate-200">{newlyAwardedBadge.description}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setInspectedBadge(newlyAwardedBadge)}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                View Certificate
              </button>
              <button
                type="button"
                onClick={() => setNewlyAwardedBadge(null)}
                className="p-1.5 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Toast Feedback */}
      {statusMessage && !newlyAwardedBadge && (
        <div
          role="status"
          className="relative z-10 bg-emerald-950/70 border border-emerald-500/40 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-emerald-200"
        >
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Optional Inline Form to Record a Newly Mastered Topic */}
      {showTopicAdder && (
        <form
          onSubmit={handleAddCustomMasteredTopic}
          className="relative z-10 bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-white">
              Unlock &ldquo;Concept Master&rdquo; Digital Badge
            </div>
            <p className="text-[11px] text-slate-400">
              Log a DSA, Government Exam, or STEM topic you have mastered to claim or upgrade your Concept Master badge.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="text"
              value={newTopicInput}
              onChange={(e) => setNewTopicInput(e.target.value)}
              placeholder="e.g., Dynamic Programming, Fundamental Rights..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isSaving || !newTopicInput.trim()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
            >
              Award Badge
            </button>
          </div>
        </form>
      )}

      {/* Featured Digital Badges Trio ('Quiz Streak Hero', '100-Question Centurion', 'Concept Master') */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {signatureMilestones.map((badge) => {
          const pct = Math.min(100, Math.round((badge.currentValue / badge.targetValue) * 100));
          const isAmber = badge.accent === 'amber';
          const isIndigo = badge.accent === 'indigo';

          return (
            <motion.div
              key={badge.id}
              whileHover={{ y: -2 }}
              className={`rounded-2xl p-5 border transition flex flex-col justify-between relative overflow-hidden ${
                badge.unlocked
                  ? isAmber
                    ? 'bg-gradient-to-br from-amber-950/35 via-slate-950 to-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : isIndigo
                    ? 'bg-gradient-to-br from-indigo-950/35 via-slate-950 to-slate-900 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                    : 'bg-gradient-to-br from-emerald-950/35 via-slate-950 to-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                  : 'bg-slate-950/60 border-slate-800/90'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner ${
                        badge.unlocked
                          ? isAmber
                            ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                            : isIndigo
                            ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-300'
                            : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {renderBadgeIcon(badge.iconName, 'w-6 h-6')}
                    </div>

                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                          {badge.badgeCode}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-[11px] text-amber-400 font-semibold">
                          {badge.milestoneLabel}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-white leading-snug mt-0.5">
                        {badge.title}
                      </h4>
                    </div>
                  </div>

                  <div className="text-xs font-mono tabular-nums shrink-0">
                    {badge.unlocked ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Earned</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[11px]">
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed">{badge.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-slate-400 font-sans">{badge.requirementSummary}</span>
                  <span className="text-white font-bold">
                    {badge.currentValue} / {badge.targetValue} {badge.unit}
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.unlocked
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : isAmber
                        ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                        : isIndigo
                        ? 'bg-gradient-to-r from-indigo-500 to-sky-400'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-amber-300/90 font-mono tabular-nums font-semibold">
                    {badge.tier} Badge · +{badge.xpPoints} XP
                  </span>

                  {badge.unlocked ? (
                    <button
                      type="button"
                      onClick={() => setInspectedBadge(badge)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect Badge</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleRecordMilestoneProgress(badge)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-200 transition cursor-pointer flex items-center space-x-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Award Badge Now</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Complete Earned & In-Progress Digital Achievement Badges Grid */}
      <div className="relative z-10 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            All Digital Achievement Badges ({filteredBadges.length})
          </h4>
          {masteredTopics.length > 0 && (
            <div className="text-xs text-slate-400 truncate max-w-md">
              Verified Mastered Concepts:{' '}
              <span className="text-emerald-400 font-semibold">
                {masteredTopics.slice(0, 3).join(' · ')}
                {masteredTopics.length > 3 ? ` +${masteredTopics.length - 3} more` : ''}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredBadges.map((badge) => {
            const pct = Math.min(100, Math.round((badge.currentValue / badge.targetValue) * 100));
            return (
              <div
                key={badge.id}
                onClick={() => setInspectedBadge(badge)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  badge.unlocked
                    ? 'bg-slate-950/75 border-slate-700/90 hover:border-amber-500/40 shadow-sm'
                    : 'bg-slate-950/30 border-slate-800/70 opacity-85 hover:opacity-100 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          badge.unlocked
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                            : 'bg-slate-900/70 border-slate-800 text-slate-500'
                        }`}
                      >
                        {badge.unlocked ? (
                          renderBadgeIcon(badge.iconName, 'w-5 h-5')
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <span>{badge.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {badge.milestoneLabel} · {badge.tier}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-full border ${
                        badge.unlocked
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {badge.unlocked ? 'Earned' : `${pct}%`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-2.5 line-clamp-2">{badge.description}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-slate-400">
                    {badge.currentValue}/{badge.targetValue} {badge.unit}
                  </span>
                  <span className="text-amber-400 font-semibold">+{badge.xpPoints} XP</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspected Digital Badge Certificate Modal */}
      {inspectedBadge && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInspectedBadge(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                  {renderBadgeIcon(inspectedBadge.iconName, 'w-6 h-6')}
                </div>
                <div>
                  <div className="text-xs text-amber-400 font-semibold flex items-center space-x-1.5">
                    <span>{inspectedBadge.badgeCode}</span>
                    <span>·</span>
                    <span>{inspectedBadge.tier} Digital Badge</span>
                  </div>
                  <h4 className="text-base font-bold text-white">{inspectedBadge.title}</h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedBadge(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{inspectedBadge.description}</p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Milestone:</span>
                <span className="text-amber-300 font-semibold">{inspectedBadge.milestoneLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Requirement:</span>
                <span className="text-white font-medium">{inspectedBadge.requirementSummary}</span>
              </div>
              <div className="flex items-center justify-between font-mono tabular-nums">
                <span className="text-slate-400 font-sans">Current Progress:</span>
                <span className="text-emerald-400 font-semibold">
                  {inspectedBadge.currentValue} / {inspectedBadge.targetValue} {inspectedBadge.unit}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono tabular-nums">
                <span className="text-slate-400 font-sans">Status:</span>
                <span
                  className={
                    inspectedBadge.unlocked ? 'text-emerald-400 font-semibold' : 'text-amber-400'
                  }
                >
                  {inspectedBadge.unlocked
                    ? `Awarded on ${new Date(
                        inspectedBadge.awardedAt || Date.now()
                      ).toLocaleDateString()}`
                    : 'In Progress'}
                </span>
              </div>
            </div>

            {inspectedBadge.masteredTopicList && inspectedBadge.masteredTopicList.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-300">
                  Verified Mastered Topics:
                </div>
                <div className="text-xs text-emerald-400">
                  {inspectedBadge.masteredTopicList.join(' · ')}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {!inspectedBadge.unlocked && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    handleRecordMilestoneProgress(inspectedBadge);
                    setInspectedBadge(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Award Digital Badge Now</span>
                </button>
              )}

              {onNavigateToChat && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToChat(
                      `I earned the "${inspectedBadge.title}" (${inspectedBadge.milestoneLabel}) digital badge! Give me a next-level challenge.`
                    );
                    setInspectedBadge(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share with AI Tutor</span>
                </button>
              )}

              {onNavigateToQuiz && inspectedBadge.category === 'questions' && (
                <button
                  type="button"
                  onClick={() => {
                    setInspectedBadge(null);
                    onNavigateToQuiz();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Practice More Questions
                </button>
              )}

              {onNavigateToRoadmap && inspectedBadge.category === 'topic_mastery' && (
                <button
                  type="button"
                  onClick={() => {
                    setInspectedBadge(null);
                    onNavigateToRoadmap();
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  Open Curriculum Roadmap
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
