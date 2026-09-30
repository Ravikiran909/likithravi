import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Target,
  Trophy,
  ArrowRight,
  TrendingUp,
  Brain,
  Edit2,
  Check,
  Plus,
  Flame,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface DailyLearningGoalTrackerProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToQuiz: () => void;
}

export const DailyLearningGoalTracker: React.FC<DailyLearningGoalTrackerProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToQuiz,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Daily target for questions answered (defaults to 10 if not set)
  const [targetQuestions, setTargetQuestions] = useState<number>(() => {
    return profile.dailyQuestionsGoal || 10;
  });

  // Tracked count for today (stored per student per date in localStorage + profile)
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`daily_questions_${profile.userId}_${todayStr}`);
      if (saved !== null) return Number(saved);
    } catch {}
    return profile.questionsAnsweredToday || 6;
  });

  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [tempGoal, setTempGoal] = useState<number>(targetQuestions);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [justCelebrated, setJustCelebrated] = useState<boolean>(false);

  // Sync if profile changes
  useEffect(() => {
    if (profile.dailyQuestionsGoal && profile.dailyQuestionsGoal !== targetQuestions) {
      setTargetQuestions(profile.dailyQuestionsGoal);
      setTempGoal(profile.dailyQuestionsGoal);
    }
  }, [profile.dailyQuestionsGoal]);

  const progressPercent = Math.min(100, Math.round((questionsAnswered / Math.max(1, targetQuestions)) * 100));
  const isGoalMet = questionsAnswered >= targetQuestions;
  const questionsRemaining = Math.max(0, targetQuestions - questionsAnswered);

  // Save new goal to profile and Firestore
  const handleSaveGoal = async () => {
    if (tempGoal < 1) return;
    setIsSaving(true);
    const updated: StudentProfile = {
      ...profile,
      dailyQuestionsGoal: tempGoal,
    };

    try {
      // Save to Firestore
      if (db && profile.userId) {
        await setDoc(doc(db, 'profiles', profile.userId), { dailyQuestionsGoal: tempGoal }, { merge: true });
      }
      // Save to backend API
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyQuestionsGoal: tempGoal }),
      });
    } catch (err) {
      console.warn('Sync to remote DB failed:', err);
    } finally {
      setTargetQuestions(tempGoal);
      onProfileUpdate(updated);
      setIsSaving(false);
      setIsEditingGoal(false);
    }
  };

  // Log answered questions
  const handleLogQuestions = async (count: number) => {
    const nextVal = questionsAnswered + count;
    setQuestionsAnswered(nextVal);

    try {
      localStorage.setItem(`daily_questions_${profile.userId}_${todayStr}`, String(nextVal));
    } catch {}

    const updated: StudentProfile = {
      ...profile,
      questionsAnsweredToday: nextVal,
      totalQuestionsAnswered: (profile.totalQuestionsAnswered || 0) + count,
    };

    if (nextVal >= targetQuestions && questionsAnswered < targetQuestions) {
      setJustCelebrated(true);
      setTimeout(() => setJustCelebrated(false), 5000);
    }

    try {
      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            questionsAnsweredToday: nextVal,
            totalQuestionsAnswered: updated.totalQuestionsAnswered,
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn('Firestore update warning:', e);
    }

    onProfileUpdate(updated);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Daily Learning Goal
              </span>
              {isGoalMet && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1 animate-pulse">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Goal Achieved!</span>
                </span>
              )}
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5 tracking-tight flex items-center space-x-2">
              <span>Questions Answered Tracker</span>
            </h3>
          </div>
        </div>

        {/* Target Question Setting & Quick Adjustment */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {!isEditingGoal ? (
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 rounded-2xl px-3.5 py-1.5">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Daily Target</div>
                <div className="text-xs font-bold text-indigo-300">{targetQuestions} Questions</div>
              </div>
              <button
                onClick={() => {
                  setTempGoal(targetQuestions);
                  setIsEditingGoal(true);
                }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Change questions target"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-950 border border-indigo-500/50 rounded-2xl p-1.5 animate-in fade-in">
              <input
                type="number"
                min="1"
                max="100"
                value={tempGoal}
                onChange={(e) => setTempGoal(Math.max(1, Number(e.target.value)))}
                className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white text-center font-bold focus:outline-none focus:border-indigo-400"
              />
              <button
                onClick={handleSaveGoal}
                disabled={isSaving}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition cursor-pointer text-xs font-semibold"
                title="Save target"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditingGoal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Target Setting Preset Buttons (when editing) */}
      {isEditingGoal && (
        <div className="mt-3 flex items-center space-x-1.5 overflow-x-auto pb-1 relative z-10">
          <span className="text-[10px] text-slate-400 mr-1">Presets:</span>
          {[5, 10, 15, 20, 25, 30].map((num) => (
            <button
              key={num}
              onClick={() => setTempGoal(num)}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                tempGoal === num
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {num} Qs
            </button>
          ))}
        </div>
      )}

      {/* Main Visual Progress Bar Representation */}
      <div className="mt-5 space-y-2.5 relative z-10">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-white">{questionsAnswered}</span>
            <span className="text-slate-400 font-medium">/ {targetQuestions} questions answered</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-black text-indigo-300">{progressPercent}%</span>
            {isGoalMet ? (
              <span className="text-[11px] text-emerald-400 font-bold flex items-center space-x-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>Completed</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">
                {questionsRemaining} more to reach goal
              </span>
            )}
          </div>
        </div>

        {/* Visual Progress Bar Track */}
        <div className="w-full bg-slate-950/80 rounded-full h-4 p-0.5 border border-slate-800/80 shadow-inner overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out relative ${
              isGoalMet
                ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-md shadow-emerald-500/40'
                : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400 shadow-md shadow-indigo-500/30'
            }`}
            style={{ width: `${progressPercent}%` }}
          >
            {/* Shimmer lighting animation */}
            <div className="absolute inset-0 bg-white/20 skew-x-12 animate-pulse rounded-full" />
          </div>
        </div>
      </div>

      {/* Bottom Action Strip: Quick Logging & Quiz Navigation */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Log Practice:</span>
          <button
            onClick={() => handleLogQuestions(1)}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer active:scale-95 flex items-center space-x-1"
          >
            <Plus className="w-3 h-3 text-indigo-400" />
            <span>+1 Q</span>
          </button>
          <button
            onClick={() => handleLogQuestions(3)}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer active:scale-95 flex items-center space-x-1"
          >
            <Plus className="w-3 h-3 text-indigo-400" />
            <span>+3 Qs</span>
          </button>
          <button
            onClick={() => handleLogQuestions(5)}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer active:scale-95 flex items-center space-x-1"
          >
            <Plus className="w-3 h-3 text-indigo-400" />
            <span>+5 Qs</span>
          </button>
        </div>

        <button
          onClick={onNavigateToQuiz}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer active:scale-95 self-start sm:self-auto"
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Take Adaptive Quiz Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Goal Achieved Celebration Banner */}
      {(justCelebrated || isGoalMet) && (
        <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">
              Daily Question Target Completed! Excellent dedication to mastering your subjects.
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider shrink-0">
            +50 XP Bonus
          </span>
        </div>
      )}
    </div>
  );
};
