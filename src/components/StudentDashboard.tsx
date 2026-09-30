import React, { useState, useEffect } from 'react';
import {
  Flame,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Settings,
  Languages,
  Check,
  Trophy,
  Download,
  FileText,
  Target,
  Brain,
} from 'lucide-react';
import { StudentProfile, StudyPlan, Recommendation } from '../types/index.ts';
import { StudentProgressChart } from './StudentProgressChart.tsx';
import { LearningMilestones } from './LearningMilestones.tsx';
import { StudyPlanner } from './StudyPlanner.tsx';
import { AdaptiveQuiz } from './AdaptiveQuiz.tsx';
import { Badges, ProfileBadgesWidget } from './Badges.tsx';
import { LearningRankCard } from './LearningRankCard.tsx';
import { CircularStudyGoal } from './CircularStudyGoal.tsx';
import { DailyStudyReminderCard } from './DailyStudyReminderCard.tsx';
import { StreakNotification } from './StreakNotification.tsx';
import { DailyLearningGoalTracker } from './DailyLearningGoalTracker.tsx';
import { PomodoroFocusTimer } from './PomodoroFocusTimer.tsx';
import { WeeklyStudyReport } from './WeeklyStudyReport.tsx';
import { FlashcardDeckGenerator } from './FlashcardDeckGenerator.tsx';
import { StudyMaterialsBrowser } from './StudyMaterialsBrowser.tsx';
import { FreeCoursesAndVideos } from './FreeCoursesAndVideos.tsx';
import { calculateLearningRank } from '../utils/learningRank.ts';
import { generateStudentProgressPdf } from '../utils/generatePdfReport.ts';
import { BarChart2, Timer, Layers, Pin, Youtube } from 'lucide-react';

interface StudentDashboardProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
}) => {
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'materials' | 'courses' | 'focus' | 'weekly_report' | 'flashcards' | 'quiz' | 'badges' | 'plan' | 'subjects' | 'milestones' | 'settings'>('overview');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Settings form state
  const [preferredLang, setPreferredLang] = useState(profile.preferredLanguage);
  const [studyHours, setStudyHours] = useState(profile.studyHoursPerDay);
  const [educationLevel, setEducationLevel] = useState(profile.educationLevel);
  const [preferredStudyTime, setPreferredStudyTime] = useState(profile.preferredStudyTime || '07:00 PM');
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(
    profile.dailyReminderEnabled !== undefined ? Boolean(profile.dailyReminderEnabled) : true
  );

  // Daily Study Goal tracking state
  const todayStr = new Date().toISOString().split('T')[0];
  const [extraLoggedMinutesToday, setExtraLoggedMinutesToday] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`study_minutes_${profile.userId}_${todayStr}`);
      return saved !== null ? Number(saved) : 45;
    } catch {
      return 45;
    }
  });

  const handleAddStudyMinutes = (mins: number) => {
    const nextVal = Math.max(0, extraLoggedMinutesToday + mins);
    setExtraLoggedMinutesToday(nextVal);
    try {
      localStorage.setItem(`study_minutes_${profile.userId}_${todayStr}`, String(nextVal));
    } catch (e) {}
  };

  // Calculate studied minutes and remaining hours based on profile.studyHoursPerDay
  const targetHours = profile.studyHoursPerDay || 2;
  const targetMinutes = Math.round(targetHours * 60);
  const totalStudiedMinutesToday = extraLoggedMinutesToday;
  const completedHours = Math.round((totalStudiedMinutesToday / 60) * 10) / 10;
  const remainingHours = Math.max(0, Math.round((targetHours - completedHours) * 10) / 10);
  const remainingMinutes = Math.max(0, targetMinutes - totalStudiedMinutesToday);
  const goalProgressPercent = Math.min(100, Math.round((totalStudiedMinutesToday / targetMinutes) * 100));
  const isGoalAchieved = totalStudiedMinutesToday >= targetMinutes;

  useEffect(() => {
    fetchStudyPlan();
    fetchRecommendations();
    setPreferredLang(profile.preferredLanguage);
    setStudyHours(profile.studyHoursPerDay);
    setEducationLevel(profile.educationLevel);
    setPreferredStudyTime(profile.preferredStudyTime || '07:00 PM');
    setDailyReminderEnabled(
      profile.dailyReminderEnabled !== undefined ? Boolean(profile.dailyReminderEnabled) : true
    );
  }, [profile.userId]);

  /**
   * Generates a downloadable PDF summary of the student's learning progress,
   * streak, and latest performance metrics.
   */
  const generateProgressReportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Brief timeout to ensure visual feedback state renders
      await new Promise((resolve) => setTimeout(resolve, 150));
      generateStudentProgressPdf(profile, {
        studyPlan,
        recommendations,
      });
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to generate PDF summary:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const fetchStudyPlan = async () => {
    try {
      const res = await fetch(`/api/study-plan/${profile.userId}`);
      if (res.ok) {
        const data = await res.json();
        setStudyPlan(data.studyPlan);
      }
    } catch (err) {
      console.error('Failed to load study plan', err);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`/api/recommendations/${profile.userId}`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error('Failed to load recommendations', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingSettings(true);
    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredLanguage: preferredLang,
          studyHoursPerDay: Number(studyHours),
          educationLevel,
          preferredStudyTime,
          dailyReminderEnabled,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to update settings', err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const accuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-100">
      {/* Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Welcome back, {profile.name}!</span>
            <span className="text-xl">👋</span>
          </h1>
          <p className="text-sm text-slate-400">
            Your personal AI learning dashboard and study plan tracker
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={generateProgressReportPdf}
            disabled={isGeneratingPdf}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white px-3.5 py-1.5 rounded-xl border border-slate-700/80 hover:border-slate-600 text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
            title="Download comprehensive PDF summary of streak, metrics, and milestones"
          >
            {isGeneratingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : pdfSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">PDF Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download PDF Summary</span>
              </>
            )}
          </button>

          <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'overview' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'materials' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
              <span>Study Materials</span>
              {profile.pinnedDocumentIds && profile.pinnedDocumentIds.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[9px] flex items-center space-x-0.5">
                  <Pin className="w-2.5 h-2.5 fill-slate-950" />
                  <span>{profile.pinnedDocumentIds.length}</span>
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'courses' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Youtube className="w-3.5 h-3.5 text-red-400" />
              <span>Free Courses & Videos</span>
            </button>
            <button
              onClick={() => setActiveTab('focus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'focus' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Pomodoro Focus</span>
            </button>
            <button
              onClick={() => setActiveTab('weekly_report')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'weekly_report' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-sky-300" />
              <span>Weekly Report</span>
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'flashcards' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-300" />
              <span>Flashcards</span>
              {profile.weakTopics && profile.weakTopics.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[9px]">
                  {profile.weakTopics.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'quiz' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-amber-300" />
              <span>Adaptive Quiz</span>
              {profile.weakTopics && profile.weakTopics.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('badges')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'badges' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>Virtual Badges</span>
              {profile.earnedBadges && profile.earnedBadges.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[9px]">
                  {profile.earnedBadges.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                activeTab === 'plan' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Study Planner</span>
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'subjects' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Curriculum Mastery
            </button>
            <button
              onClick={() => setActiveTab('milestones')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                activeTab === 'milestones' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Milestones</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'settings' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Preferences
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Visual Streak Alert & Toast Component (Triggered on 3+ day streak) */}
          <StreakNotification
            profile={profile}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onProfileUpdate={onProfileUpdate}
          />

          {/* Daily Learning Goal Tracker (Questions Answered Progress Bar) */}
          <DailyLearningGoalTracker
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToQuiz={() => setActiveTab('quiz')}
          />

          {/* Daily Learning Mode Card (Requirement #12) */}
          <div className="bg-gradient-to-r from-emerald-900/60 via-slate-900 to-teal-900/40 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Daily Learning Mode Active</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  Today's Session: Python Functions & Scoping Rules
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  ⏱️ Estimated time: 45 mins • Goals: Understand parameters, practice 3 problems, and complete a mini quiz to maintain your {profile.streak}-day streak!
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigateToChat('Teach me Python Functions and Scope')}
                  className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Start Session on WhatsApp</span>
                </button>
                <button
                  onClick={() => onNavigateToChat('/quiz Python')}
                  className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2.5 rounded-xl border border-slate-700 transition"
                >
                  <span>Quick Quiz</span>
                </button>
              </div>
            </div>
          </div>

          {/* Weak Topics Practice Spotlight Card */}
          {profile.weakTopics && profile.weakTopics.length > 0 && (
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white">Targeted Remediation Available</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {profile.weakTopics.length} Weak Areas
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Recommended practice: <strong>{profile.weakTopics[0]}</strong>. Practice now to strengthen your foundation and track performance in Firestore.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('quiz')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition shrink-0 cursor-pointer flex items-center space-x-1.5"
              >
                <span>Take Adaptive Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Daily Study Goal Progress Card with Circular Indicator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Circular Progress Gauge */}
              <div className="flex-shrink-0 flex items-center justify-center p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 shadow-inner">
                <CircularStudyGoal
                  completedHours={completedHours}
                  targetHours={targetHours}
                  remainingHours={remainingHours}
                  remainingMinutes={remainingMinutes}
                  progressPercent={goalProgressPercent}
                  isGoalAchieved={isGoalAchieved}
                  size={144}
                  strokeWidth={11}
                />
              </div>

              {/* Goal Details & Controls */}
              <div className="flex-1 w-full space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                        <Target className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-white">Daily Study Goal</h3>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border transition ${
                          isGoalAchieved
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {isGoalAchieved ? '🎉 Goal Achieved!' : `${goalProgressPercent}% Completed`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Target based on profile: <span className="text-white font-semibold">{profile.studyHoursPerDay} hrs/day</span> ({targetMinutes} mins)
                    </p>
                  </div>

                  {/* Status & Counter Badges */}
                  <div className="flex items-center space-x-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 self-stretch sm:self-auto justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Remaining
                      </div>
                      <div className="text-sm font-bold text-amber-400 flex items-center sm:justify-end space-x-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{remainingHours > 0 ? `${remainingHours} hrs (${remainingMinutes}m)` : '0 hrs left!'}</span>
                      </div>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Studied
                      </div>
                      <div className="text-sm font-bold text-emerald-400">
                        {completedHours} / {profile.studyHoursPerDay} hrs
                      </div>
                    </div>
                  </div>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>0 hrs</span>
                    <span className="text-slate-200 font-semibold">
                      {completedHours} hrs studied • {remainingHours > 0 ? `${remainingHours} hrs remaining` : 'Target reached!'}
                    </span>
                    <span>{profile.studyHoursPerDay} hrs target</span>
                  </div>

                  <div className="w-full h-3.5 bg-slate-950 rounded-full p-0.5 border border-slate-800 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 relative ${
                        isGoalAchieved
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20'
                          : 'bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 shadow-md shadow-indigo-500/20'
                      }`}
                      style={{ width: `${goalProgressPercent}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Progress Bar Footer Notes & Quick Study Logger */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-slate-400 flex items-center space-x-2">
                    <span
                      className={`w-2 h-2 rounded-full inline-block ${
                        isGoalAchieved ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                      }`}
                    />
                    <span>
                      {isGoalAchieved
                        ? `Fantastic work! You have satisfied your ${profile.studyHoursPerDay}-hour daily target for today!`
                        : `Keep learning on WhatsApp to log the remaining ${remainingHours} hours for today.`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] text-slate-400 font-medium mr-1">Log Study Time:</span>
                    <button
                      onClick={() => handleAddStudyMinutes(15)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition active:scale-95"
                      title="Log 15 minutes of study"
                    >
                      +15m
                    </button>
                    <button
                      onClick={() => handleAddStudyMinutes(30)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition active:scale-95"
                      title="Log 30 minutes of study"
                    >
                      +30m
                    </button>
                    <button
                      onClick={() => handleAddStudyMinutes(45)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition active:scale-95"
                      title="Log 45 minutes of study"
                    >
                      +45m
                    </button>
                    <button
                      onClick={() => handleAddStudyMinutes(60)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95"
                      title="Log 1 hour of study"
                    >
                      +1h
                    </button>
                    {extraLoggedMinutesToday > 0 && (
                      <button
                        onClick={() => handleAddStudyMinutes(-extraLoggedMinutesToday)}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded-lg text-[10px] border border-slate-800 transition"
                        title="Reset today's logged study time"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Study Streak</span>
                <Flame className={`w-5 h-5 ${profile.streak >= 3 ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-slate-500'}`} />
              </div>
              <div className="text-3xl font-bold text-white flex items-baseline justify-between">
                <span>{profile.streak} Days</span>
                {profile.streak >= 3 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    🔥 3+ Active
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className={profile.streak >= 3 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                  {profile.streak >= 3 ? 'Milestone alert active!' : 'Reach 3 days for alert!'}
                </span>
                <button
                  onClick={() => onProfileUpdate({ ...profile, streak: profile.streak >= 3 ? profile.streak + 1 : 3 })}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  title="Increment streak or test 3-day notification"
                >
                  {profile.streak < 3 ? 'Simulate 3d' : '+1 Day'}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Quiz Accuracy</span>
                <Award className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-white">{accuracy}%</div>
              <p className="text-xs text-slate-400 mt-1">
                {profile.correctAnswers} correct out of {profile.totalQuestionsAnswered} answered
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                  <span>Daily Study Target</span>
                  <Target className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-white flex items-baseline space-x-1.5">
                    <span>{completedHours}</span>
                    <span className="text-xs font-normal text-slate-400">/ {profile.studyHoursPerDay} hrs</span>
                  </div>
                  <div className="p-1">
                    <CircularStudyGoal
                      completedHours={completedHours}
                      targetHours={targetHours}
                      remainingHours={remainingHours}
                      remainingMinutes={remainingMinutes}
                      progressPercent={goalProgressPercent}
                      isGoalAchieved={isGoalAchieved}
                      size={44}
                      strokeWidth={4.5}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-amber-400 font-medium">
                    {remainingHours > 0 ? `${remainingHours}h remaining` : 'Goal met! 🎉'}
                  </span>
                  <span className="text-slate-400 font-semibold">{goalProgressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${goalProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Curriculum Mastery</span>
                <TrendingUp className="w-5 h-5 text-teal-400" />
              </div>
              <div className="text-3xl font-bold text-white">{profile.overallProgress}%</div>
              <p className="text-xs text-emerald-400 mt-1">Advancing well</p>
            </div>
          </div>

          {/* WhatsApp Daily Study Session Reminders Feature */}
          <DailyStudyReminderCard
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
          />

          {/* Virtual Badges Profile Section Showcase Widget */}
          <ProfileBadgesWidget
            profile={profile}
            onNavigateToBadges={() => setActiveTab('badges')}
          />

          {/* 30-Day Streak & Learning Progress Visualization (Recharts) */}
          <StudentProgressChart profile={profile} />

          {/* Subject Mastery Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-base">Subject Mastery Breakdown</h3>
                <span className="text-xs text-slate-400">Based on recent quizzes</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-white">Python Programming</span>
                    <span className="text-emerald-400 font-semibold">82%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '82%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-white">Java & Object-Oriented</span>
                    <span className="text-emerald-400 font-semibold">74%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '74%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-white">Data Structures & Algorithms</span>
                    <span className="text-amber-400 font-semibold">61%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '61%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-white">Calculus & Mathematics</span>
                    <span className="text-rose-400 font-semibold">45%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Calculus requires priority revision</span>
                <button
                  onClick={() => onNavigateToChat('Revise Calculus limits and integrals')}
                  className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1"
                >
                  <span>Revise Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* AI Recommendations (Requirement #10 & #13) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-base flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>AI Learning Recommendations</span>
                </h3>
                <span className="text-xs text-emerald-400 font-medium">Adaptive Engine</span>
              </div>

              <div className="space-y-3">
                {recommendations.length > 0 ? (
                  recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-slate-800/80 border border-slate-700/60 p-3.5 rounded-xl hover:border-slate-600 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-white text-sm">{rec.title}</div>
                          <p className="text-xs text-slate-400 mt-0.5">{rec.reason}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rec.priority === 'high'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <button
                        onClick={() => onNavigateToChat(`Teach me ${rec.topic}`)}
                        className="mt-2.5 text-xs text-emerald-400 hover:underline flex items-center space-x-1"
                      >
                        <span>Start Practice</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No pending recommendations. Keep learning!</p>
                )}
              </div>
            </div>
          </div>

          {/* Learning Milestones Spotlight Banner */}
          <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-amber-400 shadow-md">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Achievements Spotlight</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {profile.streak >= 7 ? '🔥 7-Day Streak Active' : 'Target: 7-Day Streak'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">Learning Milestones & Badges</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Unlock achievements like '7-Day Streak', '100 Questions Answered', and 'Math Master' by practicing topics and answering quizzes over WhatsApp.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('milestones')}
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 text-xs whitespace-nowrap"
            >
              <Award className="w-4 h-4 fill-slate-950" />
              <span>Explore All Milestones</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Recall Flashcard Deck Generator Spotlight (Pulls Weak Topics) */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-amber-400 shadow-md">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Active Recall Memory Engine
                  </span>
                  {profile.weakTopics && profile.weakTopics.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      {profile.weakTopics.length} Weak Areas Detected
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Flashcard Decks for Weak Topics
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Practice targeted active recall on {profile.weakTopics && profile.weakTopics.length > 0 ? profile.weakTopics.join(', ') : 'core curriculum topics'}. Flip cards, test memory, and graduate topics to mastered in your profile.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('flashcards')}
              className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 text-xs whitespace-nowrap cursor-pointer"
            >
              <Layers className="w-4 h-4 fill-slate-950" />
              <span>Practice Flashcards Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pinned Study Materials & RAG Knowledge Base Spotlight */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/30 border border-emerald-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 text-emerald-400 shadow-md">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    RAG Knowledge Base & Study Notes
                  </span>
                  {profile.pinnedDocumentIds && profile.pinnedDocumentIds.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center space-x-1">
                      <Pin className="w-2.5 h-2.5 fill-amber-300" />
                      <span>{profile.pinnedDocumentIds.length} Pinned for Chat</span>
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Search & Pin Verified Curriculum Materials
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Browse verified course documents, textbook chapters, and cheatsheets. Pin your key materials to quickly ask doubts or generate targeted quizzes directly in the WhatsApp chat.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('materials')}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black px-5 py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-95 text-xs whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Study Materials</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Study Planner & Exam Reminders Spotlight */}
          <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/30 text-indigo-400 shadow-md">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Study Planner & Exam Radar</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    {profile.examDates?.length || 0} Upcoming Exams
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">Daily Session Scheduling & WhatsApp Reminders</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Schedule daily study sessions matching your {profile.studyHoursPerDay} hrs/day goal, set alerts for {profile.preferredStudyTime || '7:00 PM'}, and receive automated WhatsApp reminders for upcoming exams.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('plan')}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition active:scale-95 text-xs whitespace-nowrap"
            >
              <Calendar className="w-4 h-4" />
              <span>Open Study Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Download PDF Learning Summary Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl shadow-sm">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-white">
                    Download Learning Progress Summary (PDF)
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    Official Report
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Export your current <span className="text-amber-400 font-semibold">{profile.streak}-day streak</span>, <span className="text-emerald-400 font-semibold">{accuracy}% quiz accuracy</span>, curriculum progress, and unlocked milestone badges into a clean printable PDF summary.
                </p>
              </div>
            </div>

            <button
              onClick={generateProgressReportPdf}
              disabled={isGeneratingPdf}
              className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-95 text-xs whitespace-nowrap disabled:opacity-50"
              title="Download comprehensive PDF summary"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : pdfSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>PDF Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Download PDF Summary</span>
                </>
              )}
            </button>
          </div>

          {/* Weekly Study Report & Session Bar Chart */}
          <WeeklyStudyReport
            profile={profile}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
          />
        </div>
      )}

      {/* RAG Knowledge Base Study Materials & Pinned Documents Tab */}
      {activeTab === 'materials' && (
        <StudyMaterialsBrowser
          profile={profile}
          onProfileUpdate={onProfileUpdate}
          onNavigateToChat={onNavigateToChat}
          onNavigateToQuiz={() => setActiveTab('quiz')}
        />
      )}

      {/* Free Courses & YouTube Videos Tab */}
      {activeTab === 'courses' && (
        <FreeCoursesAndVideos
          profile={profile}
          onNavigateToChat={onNavigateToChat}
        />
      )}

      {/* Pomodoro Focus Deep Work Timer Tab */}
      {activeTab === 'focus' && (
        <PomodoroFocusTimer
          profile={profile}
          onProfileUpdate={onProfileUpdate}
          onNavigateToChat={onNavigateToChat}
        />
      )}

      {/* Weekly Study Report Tab */}
      {activeTab === 'weekly_report' && (
        <WeeklyStudyReport
          profile={profile}
          onNavigateToChat={onNavigateToChat}
          onNavigateToQuiz={() => setActiveTab('quiz')}
        />
      )}

      {/* Active Recall Flashcard Deck Generator Tab */}
      {activeTab === 'flashcards' && (
        <FlashcardDeckGenerator
          profile={profile}
          onProfileUpdate={onProfileUpdate}
          onNavigateToQuiz={() => setActiveTab('quiz')}
        />
      )}

      {activeTab === 'quiz' && (
        <AdaptiveQuiz
          profile={profile}
          onProfileUpdate={onProfileUpdate}
          onNavigateToChat={onNavigateToChat}
        />
      )}

      {activeTab === 'badges' && (
        <Badges
          profile={profile}
          onProfileUpdate={onProfileUpdate}
          onNavigateToQuiz={() => setActiveTab('quiz')}
          onNavigateToChat={onNavigateToChat}
        />
      )}

      {activeTab === 'plan' && (
        <StudyPlanner
          profile={profile}
          onProfileUpdate={onProfileUpdate}
          onNavigateToChat={onNavigateToChat}
        />
      )}

      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profile.subjects.map((sub) => (
            <div key={sub} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-white text-base">{sub}</div>
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Core concepts, algorithmic patterns, homework doubt solver, and practice questions.
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onNavigateToChat(`Teach me ${sub}`)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-xl text-white transition text-center"
                >
                  Learn Concepts
                </button>
                <button
                  onClick={() => onNavigateToChat(`/quiz ${sub}`)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-xl text-white transition text-center"
                >
                  Take Quiz
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'milestones' && (
        <LearningMilestones
          profile={profile}
          onNavigateToChat={onNavigateToChat}
          onDownloadReport={generateProgressReportPdf}
        />
      )}

      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>Student Personalization Settings</span>
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Preferred Explanation Language
              </label>
              <select
                value={preferredLang}
                onChange={(e: any) => setPreferredLang(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="en">English</option>
                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                <option value="hi">Hindi (हिंदी)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                The AI Tutor will format explanations and technical analogies in your preferred language.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Education Level
              </label>
              <select
                value={educationLevel}
                onChange={(e: any) => setEducationLevel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="school">School Student (High School / K-12)</option>
                <option value="college">College / University Student</option>
                <option value="competitive_exam">Competitive Exam Candidate (JEE / GATE / GRE)</option>
                <option value="professional">Working Professional / Self-Taught Learner</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Daily Study Target (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="8"
                value={studyHours}
                onChange={(e) => setStudyHours(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold text-white">
                    Daily Study Session Reminders
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Receive an automatic reminder on WhatsApp (+{profile.whatsappNumber}) at your preferred study time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDailyReminderEnabled(!dailyReminderEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                    dailyReminderEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                      dailyReminderEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Preferred Daily Study Time
                </label>
                <input
                  type="text"
                  value={preferredStudyTime}
                  onChange={(e) => setPreferredStudyTime(e.target.value)}
                  placeholder="e.g. 07:00 PM or 19:00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="submit"
                disabled={isUpdatingSettings}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition shadow-md shadow-emerald-600/30"
              >
                {isUpdatingSettings ? 'Saving...' : 'Save Preferences'}
              </button>

              {settingsSuccess && (
                <span className="text-xs text-emerald-400 flex items-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>Preferences updated!</span>
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
