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

  const hasCalculusMastery =
    strongLower.some((s) => /calculus|integration|derivative|limit/i.test(s)) ||
    historyMastered.some((h) => /calculus/i.test(h.subject) || /calculus|integral|limit/i.test(h.topic)) ||
    (!weakLower.some((w) => /calculus/i.test(w)) && (profile.overallProgress || 0) >= 85);

  const hasPythonMastery =
    strongLower.some((s) => /python/i.test(s)) ||
    historyMastered.some((h) => /python/i.test(h.subject)) ||
    (profile.overallProgress || 0) >= 75;

  const hasDsaMastery =
    strongLower.some((s) => /dsa|binary|tree|graph|dynamic programming|recursion/i.test(s)) ||
    historyMastered.some((h) => /dsa/i.test(h.subject));

  // Find completed courses matching subjects
  const completedCourses = courses.filter((c) => completedIds.includes(c.id));
  const hasCompletedGenAI = completedCourses.some(
    (c) => c.subject === 'Generative AI' || c.keyTopics.some((t) => /genai|llm|transformer|gpt/i.test(t))
  );
  const hasCompletedAgents = completedCourses.some(
    (c) => c.subject === 'AI Agents' || c.keyTopics.some((t) => /agent|react|langgraph|crewai/i.test(t))
  );

  // 1. Study Streak Milestone Badges
  const streakBadges: AchievementBadge[] = [
    {
      id: 'badge_streak_3',
      title: '3-Day Streak Starter',
      category: 'streak',
      tier: 'Bronze',
      icon: '🔥',
      description: 'Study 3 consecutive days on WhatsApp to jumpstart your daily learning habit.',
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
  ];

  // 2. Questions Answered Milestone Badges (including '100 Questions Answered')
  const questionBadges: AchievementBadge[] = [
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

  // 3. Subject Mastery Badges (including 'Mastery in Calculus')
  const calcProgress = isStoredOrUnlocked('badge_mastery_calculus', hasCalculusMastery)
    ? 100
    : Math.min(95, Math.max(45, profile.overallProgress || 60));

  const masteryBadges: AchievementBadge[] = [
    {
      id: 'badge_mastery_calculus',
      title: 'Mastery in Calculus',
      category: 'subject_mastery',
      tier: 'Gold',
      icon: '∫',
      description: 'Demonstrate mastery in Calculus limits, derivatives, and integration by parts.',
      requirementDescription: 'Master Calculus sub-topics & pass Calculus quizzes (80%+)',
      currentValue: isStoredOrUnlocked('badge_mastery_calculus', hasCalculusMastery) ? 100 : calcProgress,
      targetValue: 100,
      unlocked: isStoredOrUnlocked('badge_mastery_calculus', hasCalculusMastery),
      progressPercent: isStoredOrUnlocked('badge_mastery_calculus', hasCalculusMastery) ? 100 : calcProgress,
      unlockedAt: earnedMap.get('badge_mastery_calculus'),
      rarity: 'Epic',
      glowColor: 'from-rose-500/20 to-amber-500/20 border-rose-500/40 text-rose-300',
    },
    {
      id: 'badge_mastery_python',
      title: 'Mastery in Python',
      category: 'subject_mastery',
      tier: 'Silver',
      icon: '🐍',
      description: 'Achieve high proficiency in Python functions, scoping, OOP, and recursion.',
      requirementDescription: 'Master Python core modules (80%+)',
      currentValue: isStoredOrUnlocked('badge_mastery_python', hasPythonMastery) ? 100 : 75,
      targetValue: 100,
      unlocked: isStoredOrUnlocked('badge_mastery_python', hasPythonMastery),
      progressPercent: isStoredOrUnlocked('badge_mastery_python', hasPythonMastery) ? 100 : 75,
      unlockedAt: earnedMap.get('badge_mastery_python'),
      rarity: 'Rare',
      glowColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    },
    {
      id: 'badge_mastery_dsa',
      title: 'Mastery in DSA & Algorithms',
      category: 'subject_mastery',
      tier: 'Platinum',
      icon: '🧬',
      description: 'Conquer Binary Search, Trees, Graph traversals, and Dynamic Programming invariants.',
      requirementDescription: 'Master DSA topics & maintain 80%+ quiz accuracy',
      currentValue: isStoredOrUnlocked('badge_mastery_dsa', hasDsaMastery) ? 100 : Math.min(90, accuracy),
      targetValue: 100,
      unlocked: isStoredOrUnlocked('badge_mastery_dsa', hasDsaMastery),
      progressPercent: isStoredOrUnlocked('badge_mastery_dsa', hasDsaMastery) ? 100 : Math.min(90, accuracy),
      unlockedAt: earnedMap.get('badge_mastery_dsa'),
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
      description: 'Complete your first verified programming or academic course.',
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
      id: 'badge_course_genai',
      title: 'GenAI Trailblazer',
      category: 'course_completion',
      tier: 'Silver',
      icon: '✨',
      description: 'Complete a verified course in Generative AI, LLMs, or prompt engineering.',
      requirementDescription: 'Complete 1 Generative AI course',
      currentValue: isStoredOrUnlocked('badge_course_genai', hasCompletedGenAI) ? 1 : 0,
      targetValue: 1,
      unlocked: isStoredOrUnlocked('badge_course_genai', hasCompletedGenAI),
      progressPercent: isStoredOrUnlocked('badge_course_genai', hasCompletedGenAI) ? 100 : 0,
      unlockedAt: earnedMap.get('badge_course_genai'),
      rarity: 'Rare',
      glowColor: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/40 text-indigo-300',
    },
    {
      id: 'badge_course_agents',
      title: 'Agent Architect',
      category: 'course_completion',
      tier: 'Gold',
      icon: '🤖',
      description: 'Master autonomous ReAct cycles, tool calling, and multi-agent coordination.',
      requirementDescription: 'Complete 1 AI Agents course',
      currentValue: isStoredOrUnlocked('badge_course_agents', hasCompletedAgents) ? 1 : 0,
      targetValue: 1,
      unlocked: isStoredOrUnlocked('badge_course_agents', hasCompletedAgents),
      progressPercent: isStoredOrUnlocked('badge_course_agents', hasCompletedAgents) ? 100 : 0,
      unlockedAt: earnedMap.get('badge_course_agents'),
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
