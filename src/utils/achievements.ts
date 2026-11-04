import { StudentProfile, LearningResource } from '../types/index.ts';

export interface AchievementBadge {
  id: string;
  title: string;
  category: 'streak' | 'questions_milestone' | 'subject_mastery' | 'course_completion';
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
  profile: StudentProfile,
  courses: LearningResource[] = []
): {
  allBadges: AchievementBadge[];
  streakBadges: AchievementBadge[];
  questionBadges: AchievementBadge[];
  masteryBadges: AchievementBadge[];
  courseBadges: AchievementBadge[];
  unlockedCount: number;
  totalCount: number;
  completionRate: number;
  currentStreakTier: string;
} {
  const streak = profile.streak || 0;
  const totalQuestions = profile.totalQuestionsAnswered || 0;
  const correctAnswers = profile.correctAnswers || 0;
  const accuracy =
    totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : profile.overallProgress || 0;
  const completedIds = profile.completedCourseIds || [];
  const completedCount = completedIds.length;

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

  // Find completed courses matching subjects
  const completedCourses = courses.filter((c) => completedIds.includes(c.id));
  const hasCompletedGovExams = completedCourses.some(
    (c) => c.subject === 'Government Exams' || c.keyTopics.some((t) => /upsc|ssc|banking/i.test(t))
  );
  const hasCompletedSkills = completedCourses.some(
    (c) => c.subject === 'Professional Skills' || c.keyTopics.some((t) => /thinking|communication|leadership/i.test(t))
  );

  // 1. Study Streak Milestone Badges
  const streakBadges: AchievementBadge[] = [
    {
      id: 'badge_streak_3',
      title: '3-Day Streak Starter',
      category: 'streak',
      tier: 'Bronze',
      icon: '🔥',
      description: 'Study 3 consecutive days to jumpstart your daily learning habit.',
      requirementDescription: 'Maintain a 3-day study streak',
      currentValue: Math.min(streak, 3),
      targetValue: 3,
      unlocked: isStoredOrUnlocked('badge_streak_3', streak >= 3),
      progressPercent: Math.min(Math.round((streak / 3) * 100), 100),
      unlockedAt: earnedMap.get('badge_streak_3'),
      rarity: 'Common',
      glowColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
    },
    {
      id: 'badge_streak_7',
      title: '7-Day Streak',
      category: 'streak',
      tier: 'Silver',
      icon: '⚡',
      description: 'Maintain an unbroken 7-day study streak across a full week of active learning.',
      requirementDescription: 'Maintain a 7-day study streak',
      currentValue: Math.min(streak, 7),
      targetValue: 7,
      unlocked: isStoredOrUnlocked('badge_streak_7', streak >= 7),
      progressPercent: Math.min(Math.round((streak / 7) * 100), 100),
      unlockedAt: earnedMap.get('badge_streak_7'),
      rarity: 'Rare',
      glowColor: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
    },
    {
      id: 'badge_streak_14',
      title: '14-Day Fortnight Legend',
      category: 'streak',
      tier: 'Gold',
      icon: '🛡️',
      description: 'Conquer 14 straight days of active recall and structured curriculum study.',
      requirementDescription: 'Maintain a 14-day study streak',
      currentValue: Math.min(streak, 14),
      targetValue: 14,
      unlocked: isStoredOrUnlocked('badge_streak_14', streak >= 14),
      progressPercent: Math.min(Math.round((streak / 14) * 100), 100),
      unlockedAt: earnedMap.get('badge_streak_14'),
      rarity: 'Epic',
      glowColor: 'from-amber-400/20 to-yellow-500/20 border-amber-400/50 text-amber-300',
    },
    {
      id: 'badge_streak_30',
      title: '30-Day Monthly Master',
      category: 'streak',
      tier: 'Platinum',
      icon: '👑',
      description: 'The golden milestone: 30 consecutive days of daily learning consistency.',
      requirementDescription: 'Maintain a 30-day study streak',
      currentValue: Math.min(streak, 30),
      targetValue: 30,
      unlocked: isStoredOrUnlocked('badge_streak_30', streak >= 30),
      progressPercent: Math.min(Math.round((streak / 30) * 100), 100),
      unlockedAt: earnedMap.get('badge_streak_30'),
      rarity: 'Legendary',
      glowColor: 'from-purple-500/20 to-pink-500/20 border-purple-500/50 text-purple-300',
    },
    {
      id: 'badge_early_bird',
      title: 'Early Bird',
      category: 'streak',
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

  // 2. Questions Answered Milestone Badges (including 'Quiz Master' and '100 Questions Answered')
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
      description: 'Solve 50 adaptive quiz and practice questions across your curriculum subjects.',
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

  // 4. Course Completion Badges
  const courseBadges: AchievementBadge[] = [
    {
      id: 'badge_course_first',
      title: 'First Steps Scholar',
      category: 'course_completion',
      tier: 'Bronze',
      icon: '🎓',
      description: 'Complete your first verified government exam or professional skills course.',
      requirementDescription: 'Complete 1 course',
      currentValue: Math.min(completedCount, 1),
      targetValue: 1,
      unlocked: isStoredOrUnlocked('badge_course_first', completedCount >= 1),
      progressPercent: isStoredOrUnlocked('badge_course_first', completedCount >= 1) ? 100 : 0,
      unlockedAt: earnedMap.get('badge_course_first'),
      rarity: 'Common',
      glowColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    },
    {
      id: 'badge_course_gov_exams',
      title: 'Exam Strategist',
      category: 'course_completion',
      tier: 'Silver',
      icon: '🎯',
      description: 'Complete a verified course in UPSC, SSC, or Banking preparations.',
      requirementDescription: 'Complete 1 Government Exam course',
      currentValue: isStoredOrUnlocked('badge_course_gov_exams', hasCompletedGovExams) ? 1 : 0,
      targetValue: 1,
      unlocked: isStoredOrUnlocked('badge_course_gov_exams', hasCompletedGovExams),
      progressPercent: isStoredOrUnlocked('badge_course_gov_exams', hasCompletedGovExams) ? 100 : 0,
      unlockedAt: earnedMap.get('badge_course_gov_exams'),
      rarity: 'Rare',
      glowColor: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/40 text-indigo-300',
    },
    {
      id: 'badge_course_skills',
      title: 'Professional Pro',
      category: 'course_completion',
      tier: 'Gold',
      icon: '💼',
      description: 'Master critical thinking, business communication, or leadership modules.',
      requirementDescription: 'Complete 1 Professional Skills course',
      currentValue: isStoredOrUnlocked('badge_course_skills', hasCompletedSkills) ? 1 : 0,
      targetValue: 1,
      unlocked: isStoredOrUnlocked('badge_course_skills', hasCompletedSkills),
      progressPercent: isStoredOrUnlocked('badge_course_skills', hasCompletedSkills) ? 100 : 0,
      unlockedAt: earnedMap.get('badge_course_skills'),
      rarity: 'Epic',
      glowColor: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-300',
    },
  ];


  const allBadges = [...streakBadges, ...questionBadges, ...masteryBadges, ...courseBadges];
  const unlockedCount = allBadges.filter((b) => b.unlocked).length;
  const totalCount = allBadges.length;
  const completionRate = Math.round((unlockedCount / totalCount) * 100);

  let currentStreakTier = 'Novice';
  if (streak >= 50) currentStreakTier = 'Diamond Centurion';
  else if (streak >= 30) currentStreakTier = 'Platinum Master';
  else if (streak >= 14) currentStreakTier = 'Gold Legend';
  else if (streak >= 7) currentStreakTier = 'Silver Warrior';
  else if (streak >= 3) currentStreakTier = 'Bronze Starter';

  return {
    allBadges,
    streakBadges,
    questionBadges,
    masteryBadges,
    courseBadges,
    unlockedCount,
    totalCount,
    completionRate,
    currentStreakTier,
  };
}
