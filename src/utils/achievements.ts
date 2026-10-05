import { StudentProfile, LearningResource } from '../types/index.ts';

export interface AchievementBadge {
  id: string;
  title: string;
  category: 'streak' | 'course_completion' | 'mastery';
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
  glowColor: string; // Tailwind glow classes
}

export function calculateLearningAchievements(
  profile: StudentProfile,
  courses: LearningResource[] = []
): {
  allBadges: AchievementBadge[];
  streakBadges: AchievementBadge[];
  courseBadges: AchievementBadge[];
  unlockedCount: number;
  totalCount: number;
  completionRate: number;
  currentStreakTier: string;
} {
  const streak = profile.streak || 0;
  const completedIds = profile.completedCourseIds || [];
  const completedCount = completedIds.length;

  // Find completed courses matching subjects
  const completedCourses = courses.filter((c) => completedIds.includes(c.id));
  const hasCompletedGenAI = completedCourses.some(
    (c) => c.subject === 'Generative AI' || c.keyTopics.some((t) => /genai|llm|transformer|gpt/i.test(t))
  );
  const hasCompletedAgents = completedCourses.some(
    (c) => c.subject === 'AI Agents' || c.keyTopics.some((t) => /agent|react|langgraph|crewai/i.test(t))
  );

  // 1. Streak Badges
  const streakBadges: AchievementBadge[] = [
    {
      id: 'badge_streak_3',
      title: 'Streak Starter',
      category: 'streak',
      tier: 'Bronze',
      icon: '🔥',
      description: 'Study 3 consecutive days on WhatsApp to jumpstart your daily momentum.',
      requirementDescription: 'Maintain a 3-day study streak',
      currentValue: Math.min(streak, 3),
      targetValue: 3,
      unlocked: streak >= 3,
      progressPercent: Math.min(Math.round((streak / 3) * 100), 100),
      rarity: 'Common',
      glowColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
    },
    {
      id: 'badge_streak_7',
      title: 'Weekly Warrior',
      category: 'streak',
      tier: 'Silver',
      icon: '⚡',
      description: 'Maintain an unbroken 7-day study streak across the week.',
      requirementDescription: 'Maintain a 7-day study streak',
      currentValue: Math.min(streak, 7),
      targetValue: 7,
      unlocked: streak >= 7,
      progressPercent: Math.min(Math.round((streak / 7) * 100), 100),
      rarity: 'Rare',
      glowColor: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
    },
    {
      id: 'badge_streak_14',
      title: 'Fortnight Legend',
      category: 'streak',
      tier: 'Gold',
      icon: '🛡️',
      description: 'Conquer 14 straight days of active recall and curriculum study.',
      requirementDescription: 'Maintain a 14-day study streak',
      currentValue: Math.min(streak, 14),
      targetValue: 14,
      unlocked: streak >= 14,
      progressPercent: Math.min(Math.round((streak / 14) * 100), 100),
      rarity: 'Epic',
      glowColor: 'from-amber-400/20 to-yellow-500/20 border-amber-400/50 text-amber-300',
    },
    {
      id: 'badge_streak_30',
      title: 'Monthly Master',
      category: 'streak',
      tier: 'Platinum',
      icon: '👑',
      description: 'The golden milestone: 30 consecutive days of daily learning consistency.',
      requirementDescription: 'Maintain a 30-day study streak',
      currentValue: Math.min(streak, 30),
      targetValue: 30,
      unlocked: streak >= 30,
      progressPercent: Math.min(Math.round((streak / 30) * 100), 100),
      rarity: 'Legendary',
      glowColor: 'from-purple-500/20 to-pink-500/20 border-purple-500/50 text-purple-300',
    },
    {
      id: 'badge_streak_50',
      title: 'Centurion Streak',
      category: 'streak',
      tier: 'Diamond',
      icon: '🏆',
      description: 'Achieve legendary discipline with a 50+ day study streak.',
      requirementDescription: 'Maintain a 50-day study streak',
      currentValue: Math.min(streak, 50),
      targetValue: 50,
      unlocked: streak >= 50,
      progressPercent: Math.min(Math.round((streak / 50) * 100), 100),
      rarity: 'Legendary',
      glowColor: 'from-emerald-400/20 to-teal-500/20 border-emerald-400/50 text-emerald-300',
    },
  ];

  // 2. Course Completion Badges
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
      unlocked: completedCount >= 1,
      progressPercent: completedCount >= 1 ? 100 : 0,
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
      currentValue: hasCompletedGenAI ? 1 : 0,
      targetValue: 1,
      unlocked: hasCompletedGenAI,
      progressPercent: hasCompletedGenAI ? 100 : 0,
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
      currentValue: hasCompletedAgents ? 1 : 0,
      targetValue: 1,
      unlocked: hasCompletedAgents,
      progressPercent: hasCompletedAgents ? 100 : 0,
      rarity: 'Epic',
      glowColor: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-300',
    },
    {
      id: 'badge_course_3',
      title: 'Polyglot Coder',
      category: 'course_completion',
      tier: 'Gold',
      icon: '🚀',
      description: 'Expand your mental model by completing 3 distinct technical courses.',
      requirementDescription: 'Complete 3 courses',
      currentValue: Math.min(completedCount, 3),
      targetValue: 3,
      unlocked: completedCount >= 3,
      progressPercent: Math.min(Math.round((completedCount / 3) * 100), 100),
      rarity: 'Epic',
      glowColor: 'from-amber-500/20 to-rose-500/20 border-amber-500/40 text-amber-300',
    },
    {
      id: 'badge_course_5',
      title: 'Curriculum Conqueror',
      category: 'course_completion',
      tier: 'Platinum',
      icon: '🌟',
      description: 'Demonstrate deep academic devotion by finishing 5 courses.',
      requirementDescription: 'Complete 5 courses',
      currentValue: Math.min(completedCount, 5),
      targetValue: 5,
      unlocked: completedCount >= 5,
      progressPercent: Math.min(Math.round((completedCount / 5) * 100), 100),
      rarity: 'Legendary',
      glowColor: 'from-violet-500/20 to-fuchsia-500/20 border-violet-500/50 text-violet-300',
    },
    {
      id: 'badge_course_10',
      title: 'Grand Master Polymath',
      category: 'course_completion',
      tier: 'Diamond',
      icon: '💎',
      description: 'The pinnacle of achievement: 10 completed courses and masterclasses.',
      requirementDescription: 'Complete 10 courses',
      currentValue: Math.min(completedCount, 10),
      targetValue: 10,
      unlocked: completedCount >= 10,
      progressPercent: Math.min(Math.round((completedCount / 10) * 100), 100),
      rarity: 'Legendary',
      glowColor: 'from-sky-400/20 to-indigo-500/20 border-sky-400/50 text-sky-300',
    },
  ];

  const allBadges = [...streakBadges, ...courseBadges];
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
    courseBadges,
    unlockedCount,
    totalCount,
    completionRate,
    currentStreakTier,
  };
}
