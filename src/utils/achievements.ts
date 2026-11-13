import { StudentProfile } from '../types/index.ts';

export interface AchievementBadge {
  id: string;
  title: string;
  category: 'sessions_milestone' | 'questions_milestone' | 'subject_mastery';
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  icon: string;
  description: string;
  requirementDescription: string;
  currentValue: number;
  targetValue: number;
  unlocked: boolean;
  progressPercent: number;
  unlockedAt?: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  glowColor: string;
}

export function calculateLearningAchievements(
  profile: StudentProfile
): {
  allBadges: AchievementBadge[];
  sessionBadges: AchievementBadge[];
  questionBadges: AchievementBadge[];
  masteryBadges: AchievementBadge[];
  unlockedCount: number;
  totalCount: number;
  completionRate: number;
  currentScholarTier: string;
} {
  const totalSessions = profile.totalSessions || 0;
  const totalQuestions = profile.totalQuestionsAnswered || 0;
  const correctAnswers = profile.correctAnswers || 0;
  const accuracy =
    totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : profile.overallProgress || 0;

  const earnedMap = new Map<string, string>();
  (profile.earnedBadges || []).forEach((eb) => {
    earnedMap.set(eb.id, eb.awardedAt);
  });
  const achievementsSet = new Set<string>(profile.achievements || []);

  const isStoredOrUnlocked = (id: string, condition: boolean) =>
    condition || earnedMap.has(id) || achievementsSet.has(id);

  const strongLower = (profile.strongTopics || []).map((s) => s.toLowerCase());
  const weakLower = (profile.weakTopics || []).map((w) => w.toLowerCase());
  const historyMastered = (profile.learningHistory || []).filter((h) => h.mastered);

  const hasPolityMastery =
    strongLower.some((s) => /polity|constitution|fundamental rights|parliament/i.test(s)) ||
    historyMastered.some((h) => /polity/i.test(h.subject) || /polity|constitution|rights/i.test(h.topic)) ||
    (!weakLower.some((w) => /polity/i.test(w)) && (profile.overallProgress || 0) >= 85);

  const hasHistoryMastery =
    strongLower.some((s) => /history|freedom struggle|gandhian/i.test(s)) ||
    historyMastered.some((h) => /history/i.test(h.subject)) ||
    (profile.overallProgress || 0) >= 75;

  const hasEconomyMastery =
    strongLower.some((s) => /economy|banking|rbi|budget/i.test(s)) ||
    historyMastered.some((h) => /economy/i.test(h.subject));

  // 1. Study Sessions Milestone Badges
  const sessionBadges: AchievementBadge[] = [
    {
      id: 'badge_streak_3',
      title: '3-Session Starter',
      category: 'sessions_milestone',
      tier: 'Bronze',
      icon: '⚡',
      description: 'Complete 3 study sessions to build your learning momentum.',
      requirementDescription: 'Complete 3 study sessions',
      currentValue: Math.min(totalSessions, 3),
      targetValue: 3,
      unlocked: isStoredOrUnlocked('badge_streak_3', totalSessions >= 3),
      progressPercent: Math.min(Math.round((totalSessions / 3) * 100), 100),
      unlockedAt: earnedMap.get('badge_streak_3'),
      rarity: 'Common',
      glowColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
    },
    {
      id: 'badge_streak_7',
      title: '7-Session Champion',
      category: 'sessions_milestone',
      tier: 'Silver',
      icon: '⚡',
      description: 'Complete 7 full study sessions across active learning topics.',
      requirementDescription: 'Complete 7 study sessions',
      currentValue: Math.min(totalSessions, 7),
      targetValue: 7,
      unlocked: isStoredOrUnlocked('badge_streak_7', totalSessions >= 7),
      progressPercent: Math.min(Math.round((totalSessions / 7) * 100), 100),
      unlockedAt: earnedMap.get('badge_streak_7'),
      rarity: 'Rare',
      glowColor: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
    },
    {
      id: 'badge_streak_14',
      title: '14-Session Fortnight Legend',
      category: 'sessions_milestone',
      tier: 'Gold',
      icon: '🛡️',
      description: 'Conquer 14 structured sessions of active recall and study.',
      requirementDescription: 'Complete 14 study sessions',
      currentValue: Math.min(totalSessions, 14),
      targetValue: 14,
      unlocked: isStoredOrUnlocked('badge_streak_14', totalSessions >= 14),
      progressPercent: Math.min(Math.round((totalSessions / 14) * 100), 100),
      unlockedAt: earnedMap.get('badge_streak_14'),
      rarity: 'Epic',
      glowColor: 'from-amber-400/20 to-yellow-500/20 border-amber-400/50 text-amber-300',
    },
    {
      id: 'badge_streak_30',
      title: '30-Session Master',
      category: 'sessions_milestone',
      tier: 'Platinum',
      icon: '👑',
      description: 'The golden milestone: 30 completed guided learning sessions.',
      requirementDescription: 'Complete 30 study sessions',
      currentValue: Math.min(totalSessions, 30),
      targetValue: 30,
      unlocked: isStoredOrUnlocked('badge_streak_30', totalSessions >= 30),
      progressPercent: Math.min(Math.round((totalSessions / 30) * 100), 100),
      unlockedAt: earnedMap.get('badge_streak_30'),
      rarity: 'Legendary',
      glowColor: 'from-purple-500/20 to-pink-500/20 border-purple-500/50 text-purple-300',
    },
    {
      id: 'badge_early_bird',
      title: 'Early Bird',
      category: 'sessions_milestone',
      tier: 'Bronze',
      icon: '🌅',
      description: 'Start your study session or conquer a quiz before 9:00 AM to kickstart your day.',
      requirementDescription: 'Study or take a quiz before 9:00 AM',
      currentValue:
        profile.preferredStudyTime?.toLowerCase().includes('am') ||
        (profile.focusStats?.completedSessions && profile.focusStats.completedSessions > 0)
          ? 1
          : 0,
      targetValue: 1,
      unlocked: isStoredOrUnlocked(
        'badge_early_bird',
        Boolean(profile.preferredStudyTime?.toLowerCase().includes('am')) ||
          Boolean(profile.focusStats?.completedSessions && profile.focusStats.completedSessions > 0)
      ),
      progressPercent: isStoredOrUnlocked(
        'badge_early_bird',
        Boolean(profile.preferredStudyTime?.toLowerCase().includes('am')) ||
          Boolean(profile.focusStats?.completedSessions && profile.focusStats.completedSessions > 0)
      )
        ? 100
        : 0,
      unlockedAt: earnedMap.get('badge_early_bird'),
      rarity: 'Common',
      glowColor: 'from-amber-400/20 to-orange-400/20 border-amber-400/40 text-amber-300',
    },
  ];

  // 2. Questions Answered Milestone Badges
  const questionBadges: AchievementBadge[] = [
    {
      id: 'badge_quiz_master',
      title: 'Quiz Master',
      category: 'questions_milestone',
      tier: 'Gold',
      icon: '🧠',
      description: 'Achieve 85%+ quiz accuracy with at least 10 answered questions.',
      requirementDescription: 'Score 85%+ accuracy across at least 10 questions',
      currentValue: Math.min(accuracy, 85),
      targetValue: 85,
      unlocked: isStoredOrUnlocked(
        'badge_quiz_master',
        accuracy >= 85 && totalQuestions >= 10
      ),
      progressPercent: isStoredOrUnlocked(
        'badge_quiz_master',
        accuracy >= 85 && totalQuestions >= 10
      )
        ? 100
        : Math.min(100, Math.round((accuracy / 85) * 100)),
      unlockedAt: earnedMap.get('badge_quiz_master'),
      rarity: 'Epic',
      glowColor: 'from-emerald-400/20 to-teal-500/20 border-emerald-400/50 text-emerald-300',
    },
    {
      id: 'badge_questions_50',
      title: '50 Questions Answered',
      category: 'questions_milestone',
      tier: 'Silver',
      icon: '🎯',
      description: 'Solve 50 adaptive quiz and practice questions across your study subjects.',
      requirementDescription: 'Answer 50 quiz questions',
      currentValue: Math.min(totalQuestions, 50),
      targetValue: 50,
      unlocked: isStoredOrUnlocked('badge_questions_50', totalQuestions >= 50),
      progressPercent: Math.min(Math.round((totalQuestions / 50) * 100), 100),
      unlockedAt: earnedMap.get('badge_questions_50'),
      rarity: 'Rare',
      glowColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    },
    {
      id: 'badge_questions_100',
      title: '100 Questions Answered',
      category: 'questions_milestone',
      tier: 'Gold',
      icon: '💯',
      description: 'Hit the century milestone by answering 100 adaptive quiz and active recall questions!',
      requirementDescription: 'Answer 100 quiz questions',
      currentValue: Math.min(totalQuestions, 100),
      targetValue: 100,
      unlocked: isStoredOrUnlocked('badge_questions_100', totalQuestions >= 100),
      progressPercent: Math.min(Math.round((totalQuestions / 100) * 100), 100),
      unlockedAt: earnedMap.get('badge_questions_100'),
      rarity: 'Epic',
      glowColor: 'from-amber-400/20 to-orange-500/20 border-amber-400/50 text-amber-300',
    },
    {
      id: 'badge_questions_250',
      title: '250 Questions Grandmaster',
      category: 'questions_milestone',
      tier: 'Diamond',
      icon: '🏆',
      description: 'Elite problem-solving volume: 250 questions answered with Socratic verification.',
      requirementDescription: 'Answer 250 quiz questions',
      currentValue: Math.min(totalQuestions, 250),
      targetValue: 250,
      unlocked: isStoredOrUnlocked('badge_questions_250', totalQuestions >= 250),
      progressPercent: Math.min(Math.round((totalQuestions / 250) * 100), 100),
      unlockedAt: earnedMap.get('badge_questions_250'),
      rarity: 'Legendary',
      glowColor: 'from-cyan-400/20 to-indigo-500/20 border-cyan-400/50 text-cyan-300',
    },
  ];

  // 3. Subject Mastery Badges
  const polityProgress = isStoredOrUnlocked('badge_mastery_polity', hasPolityMastery)
    ? 100
    : Math.min(95, Math.max(45, profile.overallProgress || 60));

  const masteryBadges: AchievementBadge[] = [
    {
      id: 'badge_mastery_polity',
      title: 'Mastery in Indian Polity',
      category: 'subject_mastery',
      tier: 'Gold',
      icon: '⚖️',
      description: 'Demonstrate mastery in Indian Constitution, Fundamental Rights, and Parliamentary procedures.',
      requirementDescription: 'Master Polity sub-topics & pass Polity quizzes (80%+)',
      currentValue: isStoredOrUnlocked('badge_mastery_polity', hasPolityMastery) ? 100 : polityProgress,
      targetValue: 100,
      unlocked: isStoredOrUnlocked('badge_mastery_polity', hasPolityMastery),
      progressPercent: isStoredOrUnlocked('badge_mastery_polity', hasPolityMastery) ? 100 : polityProgress,
      unlockedAt: earnedMap.get('badge_mastery_polity'),
      rarity: 'Epic',
      glowColor: 'from-rose-500/20 to-amber-500/20 border-rose-500/40 text-rose-300',
    },
    {
      id: 'badge_mastery_history',
      title: 'Mastery in Modern History',
      category: 'subject_mastery',
      tier: 'Silver',
      icon: '📜',
      description: 'Achieve high proficiency in the Indian Freedom Struggle and constitutional developments.',
      requirementDescription: 'Master History core modules (80%+)',
      currentValue: isStoredOrUnlocked('badge_mastery_history', hasHistoryMastery) ? 100 : 75,
      targetValue: 100,
      unlocked: isStoredOrUnlocked('badge_mastery_history', hasHistoryMastery),
      progressPercent: isStoredOrUnlocked('badge_mastery_history', hasHistoryMastery) ? 100 : 75,
      unlockedAt: earnedMap.get('badge_mastery_history'),
      rarity: 'Rare',
      glowColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    },
    {
      id: 'badge_mastery_economy',
      title: 'Mastery in Indian Economy',
      category: 'subject_mastery',
      tier: 'Platinum',
      icon: '📊',
      description: 'Conquer Banking, Monetary Policy, Public Finance, and Economic Infrastructure concepts.',
      requirementDescription: 'Master Economy topics & maintain 80%+ quiz accuracy',
      currentValue: isStoredOrUnlocked('badge_mastery_economy', hasEconomyMastery) ? 100 : Math.min(90, accuracy),
      targetValue: 100,
      unlocked: isStoredOrUnlocked('badge_mastery_economy', hasEconomyMastery),
      progressPercent: isStoredOrUnlocked('badge_mastery_economy', hasEconomyMastery) ? 100 : Math.min(90, accuracy),
      unlockedAt: earnedMap.get('badge_mastery_economy'),
      rarity: 'Legendary',
      glowColor: 'from-indigo-500/20 to-violet-500/20 border-indigo-500/40 text-indigo-300',
    },
  ];

  const allBadges = [...sessionBadges, ...questionBadges, ...masteryBadges];
  const unlockedCount = allBadges.filter((b) => b.unlocked).length;
  const totalCount = allBadges.length;
  const completionRate = Math.round((unlockedCount / totalCount) * 100);

  let currentScholarTier = 'Novice';
  if (totalSessions >= 50) currentScholarTier = 'Diamond Centurion';
  else if (totalSessions >= 30) currentScholarTier = 'Platinum Master';
  else if (totalSessions >= 14) currentScholarTier = 'Gold Legend';
  else if (totalSessions >= 7) currentScholarTier = 'Silver Warrior';
  else if (totalSessions >= 3) currentScholarTier = 'Bronze Starter';

  return {
    allBadges,
    sessionBadges,
    questionBadges,
    masteryBadges,
    unlockedCount,
    totalCount,
    completionRate,
    currentScholarTier,
  };
}
