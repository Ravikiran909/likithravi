import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Plus,
  Minus,
  Trash2,
  Target,
  Layers,
  Brain,
  Code2,
  BookOpen,
  Calculator,
  Sparkles,
  RotateCcw,
  Check,
  Edit3,
  ArrowRight,
  Zap,
  Trophy,
} from 'lucide-react';
import { StudentProfile, DailyMicroGoal } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface DailyMicroGoalsWidgetProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToQuiz?: () => void;
  onNavigateToFlashcards?: () => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onLogStudyMinutes?: (mins: number, activityLabel?: string) => void;
}

interface MicroGoalTemplate {
  title: string;
  category: DailyMicroGoal['category'];
  subject: string;
  targetCount: number;
  unit: string;
  minutesReward: number;
  xpReward: number;
}

const PRESET_TEMPLATES: MicroGoalTemplate[] = [
  {
    title: 'Solve 5 Math Problems',
    category: 'math',
    subject: 'Calculus',
    targetCount: 5,
    unit: 'problems',
    minutesReward: 15,
    xpReward: 50,
  },
  {
    title: 'Review 2 Flashcards',
    category: 'flashcards',
    subject: 'Python',
    targetCount: 2,
    unit: 'flashcards',
    minutesReward: 10,
    xpReward: 30,
  },
  {
    title: 'Complete 3 DSA Practice Questions',
    category: 'coding',
    subject: 'DSA',
    targetCount: 3,
    unit: 'questions',
    minutesReward: 20,
    xpReward: 60,
  },
  {
    title: 'Pass 1 Adaptive Topic Quiz',
    category: 'quiz',
    subject: 'Government Exams',
    targetCount: 1,
    unit: 'quiz',
    minutesReward: 15,
    xpReward: 45,
  },
  {
    title: 'Read 2 Study Notes Summaries',
    category: 'reading',
    subject: 'Generative AI',
    targetCount: 2,
    unit: 'summaries',
    minutesReward: 10,
    xpReward: 35,
  },
];

const getDefaultMicroGoals = (todayStr: string): DailyMicroGoal[] => [
  {
    id: 'mg_math_5',
    title: 'Solve 5 Math Problems',
    category: 'math',
    subject: 'Calculus',
    currentCount: 3,
    targetCount: 5,
    unit: 'problems',
    minutesReward: 15,
    xpReward: 50,
    completed: false,
    dateStr: todayStr,
  },
  {
    id: 'mg_flashcards_2',
    title: 'Review 2 Flashcards',
    category: 'flashcards',
    subject: 'Python',
    currentCount: 1,
    targetCount: 2,
    unit: 'flashcards',
    minutesReward: 10,
    xpReward: 30,
    completed: false,
    dateStr: todayStr,
  },
  {
    id: 'mg_dsa_3',
    title: 'Complete 3 DSA Practice Questions',
    category: 'coding',
    subject: 'DSA',
    currentCount: 3,
    targetCount: 3,
    unit: 'questions',
    minutesReward: 20,
    xpReward: 60,
    completed: true,
    dateStr: todayStr,
    completedAt: new Date().toISOString(),
  },
  {
    id: 'mg_quiz_1',
    title: 'Finish 1 Adaptive Topic Quiz',
    category: 'quiz',
    subject: 'Government Exams',
    currentCount: 0,
    targetCount: 1,
    unit: 'quiz',
    minutesReward: 15,
    xpReward: 45,
    completed: false,
    dateStr: todayStr,
  },
];

export const DailyMicroGoalsWidget: React.FC<DailyMicroGoalsWidgetProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToQuiz,
  onNavigateToFlashcards,
  onNavigateToChat,
  onLogStudyMinutes,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const storageKey = `daily_micro_goals_${profile.userId}_${todayStr}`;

  const [microGoals, setMicroGoals] = useState<DailyMicroGoal[]>(() => {
    if (
      Array.isArray(profile.dailyMicroGoals) &&
      profile.dailyMicroGoals.length > 0
    ) {
      return profile.dailyMicroGoals;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return getDefaultMicroGoals(todayStr);
  });

  // Add / Create new micro-goal form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<DailyMicroGoal['category']>('math');
  const [newSubject, setNewSubject] = useState<string>(profile.subjects?.[0] || 'Calculus');
  const [newTargetCount, setNewTargetCount] = useState<number>(5);
  const [newUnit, setNewUnit] = useState<string>('problems');

  // Inline target editing state
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');
  const [editTargetValue, setEditTargetValue] = useState<number>(5);

  // Filter tab state
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  useEffect(() => {
    if (
      Array.isArray(profile.dailyMicroGoals) &&
      profile.dailyMicroGoals.length > 0
    ) {
      setMicroGoals(profile.dailyMicroGoals);
    }
  }, [profile.dailyMicroGoals]);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Persist micro-goals to localStorage, backend, and Firestore
  const syncMicroGoals = async (
    updatedGoals: DailyMicroGoal[],
    rewardMinutesToAdd = 0,
    questionsDelta = 0,
    activityNote?: string
  ) => {
    setMicroGoals(updatedGoals);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedGoals));
    } catch {}

    if (rewardMinutesToAdd > 0 && onLogStudyMinutes) {
      onLogStudyMinutes(rewardMinutesToAdd, activityNote || 'Daily Micro-Goal Completed');
    }

    const updatedProfile: StudentProfile = {
      ...profile,
      dailyMicroGoals: updatedGoals,
      totalQuestionsAnswered:
        (profile.totalQuestionsAnswered || 0) + Math.max(0, questionsDelta),
      questionsAnsweredToday:
        (profile.questionsAnsweredToday || 0) + Math.max(0, questionsDelta),
      overallProgress:
        rewardMinutesToAdd > 0
          ? Math.min(100, (profile.overallProgress || 65) + 1)
          : profile.overallProgress,
    };

    onProfileUpdate(updatedProfile);

    try {
      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            userId: profile.userId,
            name: profile.name || 'Student',
            whatsappNumber: profile.whatsappNumber || '+919876543210',
            preferredLanguage: profile.preferredLanguage || 'en',
            dailyMicroGoals: updatedGoals,
            totalQuestionsAnswered: updatedProfile.totalQuestionsAnswered,
            questionsAnsweredToday: updatedProfile.questionsAnsweredToday,
            overallProgress: updatedProfile.overallProgress,
          },
          { merge: true }
        );
      }

      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyMicroGoals: updatedGoals,
          totalQuestionsAnswered: updatedProfile.totalQuestionsAnswered,
          questionsAnsweredToday: updatedProfile.questionsAnsweredToday,
          overallProgress: updatedProfile.overallProgress,
        }),
      });
    } catch (err) {
      console.warn('Micro-goals cloud sync warning:', err);
    }
  };

  // Increment or decrement progress on a specific micro-goal
  const handleUpdateProgress = (goalId: string, delta: number) => {
    let earnedMinutes = 0;
    let earnedXp = 0;
    let completedTitle = '';
    let questionsAdded = 0;

    const nextGoals = microGoals.map((g) => {
      if (g.id !== goalId) return g;
      const nextCount = Math.max(0, Math.min(g.targetCount, g.currentCount + delta));
      const nowCompleted = nextCount >= g.targetCount;
      const justFinished = nowCompleted && !g.completed;

      if (delta > 0 && (g.category === 'math' || g.category === 'coding' || g.category === 'quiz')) {
        questionsAdded = delta;
      }

      if (justFinished) {
        earnedMinutes = g.minutesReward;
        earnedXp = g.xpReward;
        completedTitle = g.title;
      }

      return {
        ...g,
        currentCount: nextCount,
        completed: nowCompleted,
        completedAt: nowCompleted ? g.completedAt || new Date().toISOString() : undefined,
      };
    });

    if (completedTitle) {
      showToast(
        `Micro-Goal Complete: "${completedTitle}" (+${earnedXp} XP & +${earnedMinutes}m study time)`
      );
    } else if (delta > 0) {
      const targetGoal = nextGoals.find((item) => item.id === goalId);
      if (targetGoal) {
        showToast(
          `Progress logged: ${targetGoal.currentCount}/${targetGoal.targetCount} ${targetGoal.unit} (${Math.round(
            (targetGoal.currentCount / Math.max(1, targetGoal.targetCount)) * 100
          )}%)`
        );
      }
    }

    syncMicroGoals(
      nextGoals,
      earnedMinutes,
      questionsAdded,
      completedTitle ? `Completed Micro-Goal: ${completedTitle}` : undefined
    );
  };

  // Mark a micro-goal 100% complete in one click
  const handleCompleteGoalInstantly = (goalId: string) => {
    const target = microGoals.find((g) => g.id === goalId);
    if (!target) return;

    if (target.completed) {
      // Toggle back to active (targetCount - 1)
      const reopened = microGoals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              currentCount: Math.max(0, g.targetCount - 1),
              completed: false,
              completedAt: undefined,
            }
          : g
      );
      syncMicroGoals(reopened, 0, 0);
      showToast(`Reopened "${target.title}" for additional practice`);
      return;
    }

    const remaining = Math.max(1, target.targetCount - target.currentCount);
    handleUpdateProgress(goalId, remaining);
  };

  // Add a custom micro-goal
  const handleCreateMicroGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    const clampedTarget = Math.max(1, Math.min(100, Number(newTargetCount) || 5));
    const finalTitle =
      trimmedTitle || `Complete ${clampedTarget} ${newSubject} ${newUnit || 'tasks'}`;

    const created: DailyMicroGoal = {
      id: `mg_${Date.now()}`,
      title: finalTitle,
      category: newCategory,
      subject: newSubject || 'General',
      currentCount: 0,
      targetCount: clampedTarget,
      unit: newUnit.trim() || 'items',
      minutesReward: Math.min(45, Math.max(10, clampedTarget * 3)),
      xpReward: Math.min(120, Math.max(25, clampedTarget * 10)),
      completed: false,
      dateStr: todayStr,
    };

    const nextGoals = [created, ...microGoals];
    syncMicroGoals(nextGoals);
    setNewTitle('');
    setNewTargetCount(5);
    setShowAddForm(false);
    showToast(`Added daily micro-goal: "${created.title}"`);
  };

  // Quick-add from preset template
  const handleApplyPreset = (preset: MicroGoalTemplate) => {
    const existing = microGoals.find(
      (g) => g.title.toLowerCase() === preset.title.toLowerCase()
    );
    if (existing) {
      // If it already exists, increment it or reset if completed
      if (existing.completed) {
        const resetGoals = microGoals.map((g) =>
          g.id === existing.id
            ? { ...g, currentCount: 0, completed: false, completedAt: undefined }
            : g
        );
        syncMicroGoals(resetGoals);
        showToast(`Reset "${preset.title}" for a fresh round!`);
      } else {
        handleUpdateProgress(existing.id, 1);
      }
      return;
    }

    const created: DailyMicroGoal = {
      id: `mg_preset_${Date.now()}`,
      title: preset.title,
      category: preset.category,
      subject: preset.subject,
      currentCount: 0,
      targetCount: preset.targetCount,
      unit: preset.unit,
      minutesReward: preset.minutesReward,
      xpReward: preset.xpReward,
      completed: false,
      dateStr: todayStr,
    };

    syncMicroGoals([created, ...microGoals]);
    showToast(`Added "${preset.title}" to today's micro-goals`);
  };

  // Save edited title and target count
  const handleSaveEditedGoal = (goalId: string) => {
    const clampedTarget = Math.max(1, Math.min(100, Number(editTargetValue) || 1));
    const nextGoals = microGoals.map((g) => {
      if (g.id !== goalId) return g;
      const clampedCurrent = Math.min(g.currentCount, clampedTarget);
      const isNowDone = clampedCurrent >= clampedTarget;
      return {
        ...g,
        title: editTitleValue.trim() || g.title,
        targetCount: clampedTarget,
        currentCount: clampedCurrent,
        completed: isNowDone,
      };
    });
    syncMicroGoals(nextGoals);
    setEditingGoalId(null);
    showToast('Updated micro-goal target');
  };

  const handleDeleteGoal = (goalId: string) => {
    const target = microGoals.find((g) => g.id === goalId);
    const nextGoals = microGoals.filter((g) => g.id !== goalId);
    syncMicroGoals(nextGoals);
    if (target) {
      showToast(`Removed "${target.title}"`);
    }
  };

  const handleResetDailyGoals = () => {
    const resetList = microGoals.map((g) => ({
      ...g,
      currentCount: 0,
      completed: false,
      completedAt: undefined,
    }));
    syncMicroGoals(resetList);
    showToast('Reset all daily micro-goal progress bars for today');
  };

  // Aggregate metrics
  const stats = useMemo(() => {
    const totalGoals = microGoals.length;
    const completedGoals = microGoals.filter((g) => g.completed).length;
    const totalUnitsTarget = microGoals.reduce((acc, g) => acc + g.targetCount, 0);
    const totalUnitsDone = microGoals.reduce(
      (acc, g) => acc + Math.min(g.currentCount, g.targetCount),
      0
    );
    const overallPercentage =
      totalUnitsTarget > 0
        ? Math.min(100, Math.round((totalUnitsDone / totalUnitsTarget) * 100))
        : 0;
    const earnedXpToday = microGoals
      .filter((g) => g.completed)
      .reduce((acc, g) => acc + g.xpReward, 0);
    const totalPossibleXp = microGoals.reduce((acc, g) => acc + g.xpReward, 0);

    return {
      totalGoals,
      completedGoals,
      totalUnitsTarget,
      totalUnitsDone,
      overallPercentage,
      earnedXpToday,
      totalPossibleXp,
    };
  }, [microGoals]);

  const filteredGoals = useMemo(() => {
    if (activeFilter === 'active') return microGoals.filter((g) => !g.completed);
    if (activeFilter === 'completed') return microGoals.filter((g) => g.completed);
    return microGoals;
  }, [microGoals, activeFilter]);

  const getCategoryIcon = (category: DailyMicroGoal['category']) => {
    switch (category) {
      case 'math':
        return <Calculator className="w-4 h-4 text-emerald-400" />;
      case 'flashcards':
        return <Layers className="w-4 h-4 text-amber-400" />;
      case 'coding':
        return <Code2 className="w-4 h-4 text-sky-400" />;
      case 'quiz':
        return <Brain className="w-4 h-4 text-indigo-400" />;
      case 'reading':
        return <BookOpen className="w-4 h-4 text-teal-400" />;
      default:
        return <Target className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getProgressBarColor = (percent: number, completed: boolean) => {
    if (completed || percent >= 100) {
      return 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300';
    }
    if (percent >= 60) {
      return 'bg-gradient-to-r from-sky-500 via-indigo-400 to-emerald-400';
    }
    if (percent >= 30) {
      return 'bg-gradient-to-r from-amber-500 to-sky-400';
    }
    return 'bg-gradient-to-r from-indigo-500 to-sky-500';
  };

  return (
    <section
      aria-label="Daily Micro-Goals Tracker"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 relative overflow-hidden"
    >
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-emerald-400">Daily Micro-Goals</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {stats.completedGoals}/{stats.totalGoals} goals completed
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-amber-300">
                {stats.earnedXpToday}/{stats.totalPossibleXp} XP earned
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5 tracking-tight">
              Actionable Study Micro-Goals & Progress Tracker
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Break your daily study plan into bite-sized targets like solving math problems or reviewing flashcards.
            </p>
          </div>
        </div>

        {/* Filter Segmented Control + New Micro-Goal CTA */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {(['all', 'active', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                  activeFilter === tab
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{showAddForm ? 'Close Form' : 'Set Micro-Goal'}</span>
          </button>
        </div>
      </div>

      {/* Overall Micro-Goals Master Progress Bar */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200">
              Overall Daily Micro-Goal Completion
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              ({stats.totalUnitsDone}/{stats.totalUnitsTarget} tasks logged)
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-black font-mono tabular-nums text-emerald-400">
              {stats.overallPercentage}%
            </span>
            <button
              type="button"
              onClick={handleResetDailyGoals}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1 transition cursor-pointer"
              title="Reset today's micro-goal counts to 0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Day</span>
            </button>
          </div>
        </div>

        <div
          role="progressbar"
          aria-valuenow={stats.overallPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall daily micro-goals completion progress"
          className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 transition-all duration-500 ease-out"
            style={{ width: `${stats.overallPercentage}%` }}
          />
        </div>

        {/* One-Click Preset Micro-Goal Chips */}
        <div className="pt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 mr-1">Quick-Add Presets:</span>
          {PRESET_TEMPLATES.map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-medium transition cursor-pointer flex items-center space-x-1"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>{preset.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Feedback Toast */}
      {statusToast && (
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusToast}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">Synced</span>
        </div>
      )}

      {/* Custom Micro-Goal Creation Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateMicroGoal}
          className="bg-slate-950 border border-emerald-500/40 rounded-xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-400">
              Create Custom Daily Micro-Goal
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <label className="block text-[11px] text-slate-400 mb-1">
                Goal Title (e.g., &ldquo;Solve 5 Math Problems&rdquo;)
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Solve 5 Math Problems or Review 2 Flashcards"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => {
                  const cat = e.target.value as DailyMicroGoal['category'];
                  setNewCategory(cat);
                  if (cat === 'math') setNewUnit('problems');
                  else if (cat === 'flashcards') setNewUnit('flashcards');
                  else if (cat === 'coding') setNewUnit('questions');
                  else if (cat === 'quiz') setNewUnit('quizzes');
                  else if (cat === 'reading') setNewUnit('summaries');
                  else setNewUnit('tasks');
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="math">Math Problems</option>
                <option value="flashcards">Flashcards</option>
                <option value="coding">Coding / DSA</option>
                <option value="quiz">Adaptive Quiz</option>
                <option value="reading">Reading / Notes</option>
                <option value="custom">Custom Task</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">Subject</label>
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Calculus">Calculus</option>
                <option value="Python">Python</option>
                <option value="DSA">DSA</option>
                <option value="Government Exams">Government Exams</option>
                <option value="Java">Java</option>
                <option value="Generative AI">Generative AI</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-[11px] text-slate-400 mb-1">Target</label>
              <input
                type="number"
                min={1}
                max={100}
                value={newTargetCount}
                onChange={(e) => setNewTargetCount(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white text-center font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">Unit Label</label>
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="problems / cards"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save Micro-Goal</span>
            </button>
          </div>
        </form>
      )}

      {/* Micro-Goal Cards List with Individual Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.map((goal) => {
          const pct = Math.min(
            100,
            Math.round((goal.currentCount / Math.max(1, goal.targetCount)) * 100)
          );
          const isEditingThis = editingGoalId === goal.id;

          return (
            <div
              key={goal.id}
              className={`rounded-xl p-4 border transition-all flex flex-col justify-between space-y-3.5 ${
                goal.completed
                  ? 'bg-emerald-950/20 border-emerald-500/35'
                  : 'bg-slate-950/75 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Icon, Title, Metadata, Quick Edit / Delete */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start space-x-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleCompleteGoalInstantly(goal.id)}
                    title={
                      goal.completed
                        ? 'Click to reopen micro-goal'
                        : 'Click to complete micro-goal'
                    }
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition cursor-pointer ${
                      goal.completed
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 border-slate-700 hover:border-emerald-500/60'
                    }`}
                  >
                    {goal.completed ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      getCategoryIcon(goal.category)
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    {isEditingThis ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-44 focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={editTargetValue}
                          onChange={(e) =>
                            setEditTargetValue(Math.max(1, Number(e.target.value)))
                          }
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-14 text-center font-mono focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditedGoal(goal.id)}
                          className="px-2 py-1 rounded bg-emerald-500 text-slate-950 text-[11px] font-bold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <h4
                          className={`text-sm font-bold truncate ${
                            goal.completed ? 'text-emerald-200 line-through' : 'text-white'
                          }`}
                        >
                          {goal.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span>{goal.subject}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            +{goal.minutesReward}m study credit
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-amber-400/90">
                            +{goal.xpReward} XP
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Controls */}
                <div className="flex items-center space-x-1 shrink-0">
                  {!isEditingThis && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGoalId(goal.id);
                        setEditTitleValue(goal.title);
                        setEditTargetValue(goal.targetCount);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-900 transition cursor-pointer"
                      title="Edit goal target"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition cursor-pointer"
                    title="Delete micro-goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Individual Micro-Goal Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-mono tabular-nums font-semibold">
                    {goal.currentCount} / {goal.targetCount} {goal.unit}
                  </span>
                  <span
                    className={`font-mono tabular-nums font-bold ${
                      goal.completed ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal.title} progress bar`}
                  className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressBarColor(
                      pct,
                      goal.completed
                    )}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Action Controls: -1, +1 Step, Complete, and Contextual Launch */}
              <div className="pt-1 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    disabled={goal.currentCount <= 0}
                    onClick={() => handleUpdateProgress(goal.id, -1)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 transition cursor-pointer"
                    title="Decrease count by 1"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    disabled={goal.completed}
                    onClick={() => handleUpdateProgress(goal.id, 1)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-40 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+1 {goal.unit.replace(/s$/, '')}</span>
                  </button>

                  {!goal.completed && (
                    <button
                      type="button"
                      onClick={() => handleCompleteGoalInstantly(goal.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition cursor-pointer"
                    >
                      Mark Done
                    </button>
                  )}
                </div>

                {/* Contextual Launch Link (Flashcards / Quiz / AI Tutor) */}
                {goal.category === 'flashcards' && onNavigateToFlashcards ? (
                  <button
                    type="button"
                    onClick={onNavigateToFlashcards}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1 transition cursor-pointer"
                  >
                    <span>Open Flashcards</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : goal.category === 'quiz' || goal.category === 'math' || goal.category === 'coding' ? (
                  onNavigateToQuiz && (
                    <button
                      type="button"
                      onClick={onNavigateToQuiz}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition cursor-pointer"
                    >
                      <span>Practice Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )
                ) : (
                  onNavigateToChat && (
                    <button
                      type="button"
                      onClick={() => onNavigateToChat(`Help me with my micro-goal: ${goal.title}`)}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition cursor-pointer"
                    >
                      <span>Study with Tutor</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty Filter State */}
      {filteredGoals.length === 0 && (
        <div className="text-center py-8 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
          <p className="text-sm font-semibold text-white">
            {activeFilter === 'completed'
              ? 'No micro-goals completed yet today'
              : 'All active micro-goals completed!'}
          </p>
          <p className="text-xs text-slate-400">
            Use the quick-add presets above or click &ldquo;Set Micro-Goal&rdquo; to add a new target.
          </p>
        </div>
      )}

      {/* All Completed Celebration Banner */}
      {stats.totalGoals > 0 && stats.completedGoals === stats.totalGoals && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-200">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">
              All {stats.totalGoals} Daily Micro-Goals Completed! You earned +{stats.earnedXpToday} XP toward your next Learning Rank.
            </span>
          </div>
          <span className="font-mono tabular-nums text-emerald-300 font-bold">
            100% Complete
          </span>
        </div>
      )}
    </section>
  );
};
