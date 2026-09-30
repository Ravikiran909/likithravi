import { LearningRankInfo, StudentProfile } from '../types/index.ts';

export const RANK_TIERS: LearningRankInfo[] = [
  {
    name: 'Novice',
    title: 'Novice Learner',
    tier: 1,
    minQuestions: 0,
    minProgress: 0,
    badgeColor: 'text-slate-300 bg-slate-800/80 border-slate-700',
    borderColor: 'border-slate-700/80',
    bgGradient: 'from-slate-900 via-slate-900 to-slate-800/60',
    icon: '🌱',
    perks: [
      'Access to daily WhatsApp AI quizzes',
      'Step-by-step doubt resolution in English, Hindi & Kannada',
      'Study milestone badge tracking',
    ],
    summary: 'Embarking on the learning journey. Answer questions and complete curriculum topics to level up.',
  },
  {
    name: 'Apprentice',
    title: 'Active Apprentice',
    tier: 2,
    minQuestions: 25,
    minProgress: 30,
    badgeColor: 'text-sky-300 bg-sky-950/80 border-sky-500/40',
    borderColor: 'border-sky-500/40',
    bgGradient: 'from-sky-950/40 via-slate-900 to-slate-900',
    icon: '🧭',
    perks: [
      'Adaptive quiz difficulty scaling',
      'Weak-topic recommendations & flashcards',
      'Personalized study session scheduler',
    ],
    summary: 'Demonstrating consistent practice with at least 25 questions answered and 30% curriculum mastery.',
  },
  {
    name: 'Scholar',
    title: 'Distinguished Scholar',
    tier: 3,
    minQuestions: 75,
    minProgress: 60,
    badgeColor: 'text-amber-300 bg-amber-950/80 border-amber-500/40',
    borderColor: 'border-amber-500/40',
    bgGradient: 'from-amber-950/30 via-slate-900 to-indigo-950/30',
    icon: '🎓',
    perks: [
      'Upcoming Exam Radar & automated WhatsApp reminders',
      'Downloadable Official PDF Progress Summary & Certificate',
      'Advanced problem sets & timed mock exams',
      'Priority AI tutor response pipeline',
    ],
    summary: 'High-achieving learner with 75+ questions answered and 60%+ overall curriculum progress.',
  },
  {
    name: 'Master',
    title: 'Grandmaster Scholar',
    tier: 4,
    minQuestions: 150,
    minProgress: 85,
    badgeColor: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/40',
    borderColor: 'border-emerald-500/40',
    bgGradient: 'from-emerald-950/30 via-slate-900 to-teal-950/30',
    icon: '👑',
    perks: [
      'Full curriculum mastery designation',
      'Unlimited mock tests with instant error diagnosis',
      'Elite WhatsApp badge and personalized AI prompts',
      'Custom revision roadmaps for competitive exams',
    ],
    summary: 'Elite master of subjects with 150+ questions answered and 85%+ curriculum mastery.',
  },
];

export interface StudentRankDetails {
  currentRank: LearningRankInfo;
  nextRank: LearningRankInfo | null;
  questionsAnswered: number;
  overallProgress: number;
  questionsNeeded: number;
  progressNeeded: number;
  questionProgressPercent: number;
  curriculumProgressPercent: number;
  overallRankProgressPercent: number;
  isMaxRank: boolean;
}

/**
 * Calculates student's rank details based on totalQuestionsAnswered and overallProgress
 */
export function calculateLearningRank(
  totalQuestionsAnswered: number,
  overallProgress: number
): StudentRankDetails {
  const questions = Math.max(0, totalQuestionsAnswered || 0);
  const progress = Math.max(0, Math.min(100, overallProgress || 0));

  // Determine current tier from highest satisfied tier
  let currentTierIndex = 0;
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (questions >= RANK_TIERS[i].minQuestions && progress >= RANK_TIERS[i].minProgress) {
      currentTierIndex = i;
      break;
    }
  }

  const currentRank = RANK_TIERS[currentTierIndex];
  const nextRank = currentTierIndex < RANK_TIERS.length - 1 ? RANK_TIERS[currentTierIndex + 1] : null;

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      questionsAnswered: questions,
      overallProgress: progress,
      questionsNeeded: 0,
      progressNeeded: 0,
      questionProgressPercent: 100,
      curriculumProgressPercent: 100,
      overallRankProgressPercent: 100,
      isMaxRank: true,
    };
  }

  const prevQuestions = currentRank.minQuestions;
  const questionsSpan = nextRank.minQuestions - prevQuestions;
  const questionsCompletedInTier = Math.max(0, questions - prevQuestions);
  const questionProgressPercent = Math.min(
    100,
    Math.round((questionsCompletedInTier / Math.max(1, questionsSpan)) * 100)
  );

  const prevProgress = currentRank.minProgress;
  const progressSpan = nextRank.minProgress - prevProgress;
  const progressCompletedInTier = Math.max(0, progress - prevProgress);
  const curriculumProgressPercent = Math.min(
    100,
    Math.round((progressCompletedInTier / Math.max(1, progressSpan)) * 100)
  );

  const questionsNeeded = Math.max(0, nextRank.minQuestions - questions);
  const progressNeeded = Math.max(0, nextRank.minProgress - progress);

  // Overall rank progress is the average of both requirements towards next rank
  const overallRankProgressPercent = Math.min(
    99,
    Math.round((questionProgressPercent + curriculumProgressPercent) / 2)
  );

  return {
    currentRank,
    nextRank,
    questionsAnswered: questions,
    overallProgress: progress,
    questionsNeeded,
    progressNeeded,
    questionProgressPercent,
    curriculumProgressPercent,
    overallRankProgressPercent,
    isMaxRank: false,
  };
}
