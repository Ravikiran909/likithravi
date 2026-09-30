import React, { useState } from 'react';
import {
  Flame,
  Award,
  BookOpen,
  Calculator,
  Code2,
  Trophy,
  Zap,
  CheckCircle2,
  Lock,
  Sparkles,
  Star,
  Target,
  Clock,
  ArrowRight,
  Download,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface LearningMilestonesProps {
  profile: StudentProfile;
  onNavigateToChat?: (prefilledText?: string) => void;
  onDownloadReport?: () => void;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  category: 'streak' | 'questions' | 'mastery' | 'consistency';
  icon: React.ReactNode;
  badgeColor: string; // Tailwind colors for border, glow, and icon
  unlocked: boolean;
  currentValue: number;
  targetValue: number;
  unit: string;
  unlockedDate?: string;
  actionText?: string;
  actionPrompt?: string;
}

export const LearningMilestones: React.FC<LearningMilestonesProps> = ({
  profile,
  onNavigateToChat,
  onDownloadReport,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const accuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 0;

  // Compute milestones based on real profile metrics
  const milestones: Milestone[] = [
    {
      id: 'streak-7',
      title: '7-Day Streak',
      description: 'Study consecutively for 7 days on WhatsApp without breaking the chain.',
      category: 'streak',
      icon: <Flame className="w-6 h-6 text-amber-400 fill-amber-400" />,
      badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-amber-500/20',
      unlocked: profile.streak >= 7,
      currentValue: Math.min(profile.streak, 7),
      targetValue: 7,
      unit: 'days',
      unlockedDate: profile.streak >= 7 ? profile.lastActiveDate || 'Recently' : undefined,
      actionText: 'Keep Streak Alive',
      actionPrompt: 'Teach me today\'s concept to keep my streak going!',
    },
    {
      id: 'questions-100',
      title: '100 Questions Answered',
      description: 'Solve 100 curriculum and quiz challenge questions.',
      category: 'questions',
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
      badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-emerald-500/20',
      unlocked: profile.totalQuestionsAnswered >= 100,
      currentValue: Math.min(profile.totalQuestionsAnswered, 100),
      targetValue: 100,
      unit: 'questions',
      unlockedDate: profile.totalQuestionsAnswered >= 100 ? 'Unlocked' : undefined,
      actionText: 'Practice 5 MCQs',
      actionPrompt: '/quiz Python',
    },
    {
      id: 'math-master',
      title: 'Math Master',
      description: 'Achieve advanced proficiency in Calculus limits, derivatives, or algebra.',
      category: 'mastery',
      icon: <Calculator className="w-6 h-6 text-violet-400" />,
      badgeColor: 'border-violet-500/40 bg-violet-500/10 text-violet-300 shadow-violet-500/20',
      unlocked: profile.overallProgress >= 70 || profile.subjects.includes('Calculus'),
      currentValue: Math.min(profile.overallProgress, 70),
      targetValue: 70,
      unit: '% mastery',
      unlockedDate: profile.overallProgress >= 70 ? 'Unlocked' : undefined,
      actionText: 'Solve Math Challenge',
      actionPrompt: 'Give me a challenging Calculus integration problem to solve',
    },
    {
      id: 'python-pioneer',
      title: 'Python Pioneer',
      description: 'Master core Python programming, functions, loops, and OOP concepts.',
      category: 'mastery',
      icon: <Code2 className="w-6 h-6 text-teal-400" />,
      badgeColor: 'border-teal-500/40 bg-teal-500/10 text-teal-300 shadow-teal-500/20',
      unlocked: profile.subjects.includes('Python'),
      currentValue: profile.subjects.includes('Python') ? 1 : 0,
      targetValue: 1,
      unit: 'subject',
      unlockedDate: 'Enrolled',
      actionText: 'Deep Dive Python',
      actionPrompt: 'Teach me Python recursion and decorators',
    },
    {
      id: 'quiz-champion',
      title: 'Quiz Champion',
      description: 'Maintain an 80%+ quiz accuracy across multiple topic challenges.',
      category: 'questions',
      icon: <Trophy className="w-6 h-6 text-yellow-400" />,
      badgeColor: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300 shadow-yellow-500/20',
      unlocked: accuracy >= 80 && profile.totalQuestionsAnswered >= 10,
      currentValue: accuracy,
      targetValue: 80,
      unit: '% accuracy',
      unlockedDate: accuracy >= 80 ? 'Active' : undefined,
      actionText: 'Test Accuracy',
      actionPrompt: '/quiz',
    },
    {
      id: 'consistent-scholar',
      title: 'Consistent Scholar',
      description: 'Complete 25 or more interactive WhatsApp tutoring sessions.',
      category: 'consistency',
      icon: <Zap className="w-6 h-6 text-sky-400" />,
      badgeColor: 'border-sky-500/40 bg-sky-500/10 text-sky-300 shadow-sky-500/20',
      unlocked: profile.totalSessions >= 25,
      currentValue: Math.min(profile.totalSessions, 25),
      targetValue: 25,
      unit: 'sessions',
      unlockedDate: profile.totalSessions >= 25 ? 'Earned' : undefined,
      actionText: 'Start Session',
      actionPrompt: 'Hi! Let\'s start today\'s study plan session.',
    },
    {
      id: 'knowledge-seeker',
      title: 'RAG Knowledge Seeker',
      description: 'Study verified curriculum course notes and textbook excerpts.',
      category: 'mastery',
      icon: <BookOpen className="w-6 h-6 text-rose-400" />,
      badgeColor: 'border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-rose-500/20',
      unlocked: true,
      currentValue: 1,
      targetValue: 1,
      unit: 'explored',
      unlockedDate: 'Verified',
      actionText: 'Review Notes',
      actionPrompt: 'Show me verified course summary on integration and recursion',
    },
    {
      id: 'streak-30',
      title: '30-Day Legend',
      description: 'Achieve the ultimate study consistency: 30 consecutive days of learning.',
      category: 'streak',
      icon: <Sparkles className="w-6 h-6 text-amber-300" />,
      badgeColor: 'border-amber-400/40 bg-amber-400/10 text-amber-200 shadow-amber-400/20',
      unlocked: profile.streak >= 30,
      currentValue: Math.min(profile.streak, 30),
      targetValue: 30,
      unit: 'days',
      actionText: 'Build 30-Day Streak',
      actionPrompt: 'What is my plan to reach a 30-day streak?',
    },
  ];

  const unlockedCount = milestones.filter((m) => m.unlocked).length;
  const filteredMilestones = milestones.filter((m) => {
    if (filter === 'unlocked') return m.unlocked;
    if (filter === 'locked') return !m.unlocked;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Trophy className="w-4 h-4" />
              <span>Student Achievements & Accolades</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Learning Milestones & Badges
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Earn badges by answering quiz questions, building your daily study streak, and mastering academic subjects over WhatsApp.
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-slate-950/70 border border-slate-800 px-5 py-3 rounded-2xl">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">
                {unlockedCount} / {milestones.length}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Badges Unlocked</div>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {Math.round((unlockedCount / milestones.length) * 100)}%
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Completion Rate</div>
            </div>
          </div>
        </div>

        {/* Filter Pills and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === 'all'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Milestones ({milestones.length})
            </button>
            <button
              onClick={() => setFilter('unlocked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                filter === 'unlocked'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Unlocked ({unlockedCount})</span>
            </button>
            <button
              onClick={() => setFilter('locked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                filter === 'locked'
                  ? 'bg-slate-700 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>In Progress ({milestones.length - unlockedCount})</span>
            </button>
          </div>

          {onDownloadReport && (
            <button
              onClick={onDownloadReport}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-lg text-xs font-medium transition shadow-sm active:scale-95"
              title="Download official PDF report with verified badge achievements"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Milestones PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredMilestones.map((m) => {
          const progressPercent = Math.min(100, Math.round((m.currentValue / m.targetValue) * 100));

          return (
            <div
              key={m.id}
              onClick={() => setSelectedMilestone(m)}
              className={`rounded-2xl border p-5 transition relative flex flex-col justify-between cursor-pointer group shadow-lg ${
                m.unlocked
                  ? `${m.badgeColor} hover:border-slate-500 hover:scale-[1.02]`
                  : 'bg-slate-900/80 border-slate-800/90 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`p-3 rounded-2xl border ${
                      m.unlocked
                        ? 'bg-slate-950/80 border-slate-700/60 shadow-md'
                        : 'bg-slate-800/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    {m.icon}
                  </div>

                  {m.unlocked ? (
                    <span className="flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <Star className="w-3 h-3 fill-emerald-400" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      <Lock className="w-3 h-3" />
                      <span>{progressPercent}%</span>
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                  {m.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {m.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                {/* Progress bar */}
                <div className="flex justify-between items-center text-[11px] mb-1.5 font-medium">
                  <span className="text-slate-400">Progress</span>
                  <span className={m.unlocked ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                    {m.currentValue} / {m.targetValue} {m.unit}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      m.unlocked ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {m.actionText && onNavigateToChat && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (m.actionPrompt) {
                        onNavigateToChat(m.actionPrompt);
                      }
                    }}
                    className="mt-3 w-full text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline flex items-center justify-center space-x-1 py-1"
                  >
                    <span>{m.actionText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Milestone Detail Modal */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setSelectedMilestone(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm p-1 rounded-lg bg-slate-800"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700">
                {selectedMilestone.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedMilestone.title}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedMilestone.unlocked
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {selectedMilestone.unlocked ? '🎉 Milestone Achieved' : 'In Progress'}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-4">{selectedMilestone.description}</p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs mb-5">
              <div className="flex justify-between text-slate-400">
                <span>Criteria:</span>
                <span className="font-semibold text-white">
                  {selectedMilestone.targetValue} {selectedMilestone.unit}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Current Standing:</span>
                <span className="font-semibold text-emerald-400">
                  {selectedMilestone.currentValue} {selectedMilestone.unit}
                </span>
              </div>
              {selectedMilestone.unlockedDate && (
                <div className="flex justify-between text-slate-400">
                  <span>Status Date:</span>
                  <span className="text-slate-300">{selectedMilestone.unlockedDate}</span>
                </div>
              )}
            </div>

            {selectedMilestone.actionPrompt && onNavigateToChat && (
              <button
                onClick={() => {
                  onNavigateToChat(selectedMilestone.actionPrompt);
                  setSelectedMilestone(null);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                <span>Practice this Goal on WhatsApp</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
