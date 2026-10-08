import React, { useState, useEffect } from 'react';
import {
  Flame,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
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
import { SmartStudyReminderFcm } from './SmartStudyReminderFcm.tsx';
import { StreakNotification } from './StreakNotification.tsx';
import { DailyLearningGoalTracker } from './DailyLearningGoalTracker.tsx';
import { WeeklyGoalTracker } from './WeeklyGoalTracker.tsx';
import { PomodoroFocusTimer } from './PomodoroFocusTimer.tsx';
import { PomodoroStudyTimer } from './PomodoroStudyTimer.tsx';
import { WeeklyStudyReport } from './WeeklyStudyReport.tsx';
import { FlashcardDeckGenerator } from './FlashcardDeckGenerator.tsx';
import { StudyMaterialsBrowser } from './StudyMaterialsBrowser.tsx';
import { FreeCoursesAndVideos } from './FreeCoursesAndVideos.tsx';
import { CurriculumRoadmap } from './CurriculumRoadmap.tsx';
import { LearningAchievementsCard } from './LearningAchievementsCard.tsx';
import { KnowledgeGapsHeatmap } from './KnowledgeGapsHeatmap.tsx';
import { WeeklyLearningActivityChart } from './WeeklyLearningActivityChart.tsx';
import { WeeklyActivityChart } from './WeeklyActivityChart.tsx';
import { DeepFocusOverlay } from './DeepFocusOverlay.tsx';
import { GlobalPeerLeaderboard } from './GlobalPeerLeaderboard.tsx';
import { DailyAffirmationsCard } from './DailyAffirmationsCard.tsx';
import { SpacedRepetitionEngine } from './SpacedRepetitionEngine.tsx';
import { StudyCircles } from './StudyCircles.tsx';
import { DeepFocusSessionTracker } from './DeepFocusSessionTracker.tsx';
import { VoiceToKnowledgeCard } from './VoiceToKnowledgeCard.tsx';
import { BadgesAndAchievements } from './BadgesAndAchievements.tsx';
import { SmartNotificationScheduler } from './SmartNotificationScheduler.tsx';
import { ThirtyDayProgressLineChart } from './ThirtyDayProgressLineChart.tsx';
import { DailyFlashcards } from './DailyFlashcards.tsx';
import { AcademicPdfExportCard } from './AcademicPdfExportCard.tsx';
import { HighLevelThinkingModels } from './HighLevelThinkingModels.tsx';
import { SubTopicMasteryHeatmapChart } from './SubTopicMasteryHeatmapChart.tsx';
import { AchievementBadgesShowcase } from './AchievementBadgesShowcase.tsx';
import { StudentAchievements } from './StudentAchievements.tsx';
import { DsaAndGovExamHub } from './DsaAndGovExamHub.tsx';
import { StudySessionPlanner } from './StudySessionPlanner.tsx';
import { DailyQuizStreakCounter } from './DailyQuizStreakCounter.tsx';
import { DailyStudyGoal } from './DailyStudyGoal.tsx';
import {
  IdentityAndCourseVerificationHub,
  CourseEnrollmentVerificationModal,
  EnrollableCourseTarget,
} from './CourseEnrollmentVerificationModal.tsx';
import { FaceAuthLoginModal } from './FaceAuthLoginModal.tsx';
import { calculateLearningRank } from '../utils/learningRank.ts';
import {
  generateStudentProgressPdf,
  generateExportNotesStudyGuidePdf,
  RagDocumentSummaryItem,
} from '../utils/generatePdfReport.ts';
import { BarChart2, Timer, Layers, Pin, Youtube, BellOff, Shield, MessageSquare } from 'lucide-react';

interface StudentDashboardProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  focusMode?: boolean;
  onToggleFocusMode?: (nextState?: boolean) => void;
  onOpenFaceAuth?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  focusMode,
  onToggleFocusMode,
  onOpenFaceAuth,
}) => {
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'thinking_models' | 'circles' | 'materials' | 'courses' | 'roadmap' | 'focus' | 'weekly_report' | 'flashcards' | 'quiz' | 'badges' | 'plan' | 'subjects' | 'milestones' | 'settings'>('overview');
  const [enrollModalCourse, setEnrollModalCourse] = useState<EnrollableCourseTarget | null>(null);
  const [localFaceAuthOpen, setLocalFaceAuthOpen] = useState<boolean>(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [isExportingNotes, setIsExportingNotes] = useState(false);
  const [exportNotesSuccess, setExportNotesSuccess] = useState(false);

  // Settings form state
  const [preferredLang, setPreferredLang] = useState(profile.preferredLanguage);
  const [studyHours, setStudyHours] = useState(profile.studyHoursPerDay);
  const [educationLevel, setEducationLevel] = useState(profile.educationLevel);
  const [preferredStudyTime, setPreferredStudyTime] = useState(profile.preferredStudyTime || '07:00 PM');
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(
    profile.dailyReminderEnabled !== undefined ? Boolean(profile.dailyReminderEnabled) : true
  );
  const [deepFocusActive, setDeepFocusActive] = useState<boolean>(
    focusMode !== undefined ? focusMode : Boolean(profile.deepFocusEnabled)
  );

  useEffect(() => {
    if (focusMode !== undefined && focusMode !== deepFocusActive) {
      setDeepFocusActive(focusMode);
    }
  }, [focusMode]);

  const handleToggleDeepFocus = async (nextState?: boolean) => {
    const targetState = nextState !== undefined ? nextState : !deepFocusActive;
    setDeepFocusActive(targetState);
    if (onToggleFocusMode) {
      onToggleFocusMode(targetState);
    }
    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deepFocusEnabled: targetState,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);
      } else {
        onProfileUpdate({ ...profile, deepFocusEnabled: targetState });
      }
    } catch {
      onProfileUpdate({ ...profile, deepFocusEnabled: targetState });
    }
  };

  // Daily Study Goal tracking state (synced with profile.studyHoursPerDay & real-time quiz completions)
  const todayStr = new Date().toISOString().split('T')[0];
  const [extraLoggedMinutesToday, setExtraLoggedMinutesToday] = useState<number>(() => {
    if (
      profile.focusStats?.lastSessionDate === todayStr &&
      typeof profile.focusStats?.todayFocusMinutes === 'number'
    ) {
      return profile.focusStats.todayFocusMinutes;
    }
    try {
      const saved = localStorage.getItem(`study_minutes_${profile.userId}_${todayStr}`);
      return saved !== null ? Number(saved) : 45;
    } catch {
      return 45;
    }
  });
  const [lastSyncedQuestionsCount, setLastSyncedQuestionsCount] = useState<number>(
    profile.totalQuestionsAnswered || 0
  );
  const [isEditingDailyGoalRing, setIsEditingDailyGoalRing] = useState<boolean>(false);
  const [customGoalHoursInput, setCustomGoalHoursInput] = useState<number>(
    profile.studyHoursPerDay || 2
  );
  const [customLogMinutes, setCustomLogMinutes] = useState<number>(20);
  const [customLogTopic, setCustomLogTopic] = useState<string>(
    profile.subjects[0] || 'Python Practice'
  );
  const [activityLogsToday, setActivityLogsToday] = useState<
    { id: string; label: string; minutes: number; time: string }[]
  >([
    {
      id: 'init_log_1',
      label: `${profile.subjects[0] || 'Python'} Socratic Review`,
      minutes: 25,
      time: 'Earlier today',
    },
    {
      id: 'init_log_2',
      label: 'Adaptive Practice Drill',
      minutes: 20,
      time: 'Earlier today',
    },
  ]);

  // Real-time sync when profile.focusStats.todayFocusMinutes or profile.totalQuestionsAnswered updates (e.g. from completing a quiz)
  useEffect(() => {
    if (
      profile.focusStats?.lastSessionDate === todayStr &&
      typeof profile.focusStats?.todayFocusMinutes === 'number' &&
      profile.focusStats.todayFocusMinutes !== extraLoggedMinutesToday
    ) {
      setExtraLoggedMinutesToday(profile.focusStats.todayFocusMinutes);
      try {
        localStorage.setItem(
          `study_minutes_${profile.userId}_${todayStr}`,
          String(profile.focusStats.todayFocusMinutes)
        );
      } catch {}
    } else if (
      typeof profile.totalQuestionsAnswered === 'number' &&
      profile.totalQuestionsAnswered > lastSyncedQuestionsCount
    ) {
      const deltaQuestions = profile.totalQuestionsAnswered - lastSyncedQuestionsCount;
      const earnedQuizMinutes = Math.max(5, deltaQuestions * 5);
      const nextMinutes = extraLoggedMinutesToday + earnedQuizMinutes;
      setExtraLoggedMinutesToday(nextMinutes);
      try {
        localStorage.setItem(`study_minutes_${profile.userId}_${todayStr}`, String(nextMinutes));
      } catch {}
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setActivityLogsToday((prev) => [
        {
          id: `quiz_sync_${Date.now()}`,
          label: `Completed Quiz (+${deltaQuestions} Qs)`,
          minutes: earnedQuizMinutes,
          time: nowTime,
        },
        ...prev.slice(0, 4),
      ]);
    }
    setLastSyncedQuestionsCount(profile.totalQuestionsAnswered || 0);
  }, [
    profile.focusStats?.todayFocusMinutes,
    profile.focusStats?.lastSessionDate,
    profile.totalQuestionsAnswered,
    todayStr,
  ]);

  // Keep customGoalHoursInput synced with profile.studyHoursPerDay
  useEffect(() => {
    if (profile.studyHoursPerDay) {
      setCustomGoalHoursInput(profile.studyHoursPerDay);
      setStudyHours(profile.studyHoursPerDay);
    }
  }, [profile.studyHoursPerDay]);

  const handleAddStudyMinutes = async (mins: number, activityLabel?: string) => {
    const nextVal = Math.max(0, extraLoggedMinutesToday + mins);
    setExtraLoggedMinutesToday(nextVal);
    try {
      localStorage.setItem(`study_minutes_${profile.userId}_${todayStr}`, String(nextVal));
    } catch (e) {}

    if (mins > 0) {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setActivityLogsToday((prev) => [
        {
          id: `log_${Date.now()}`,
          label: activityLabel || `${profile.subjects[0] || 'Curriculum'} Study Session`,
          minutes: mins,
          time: nowTime,
        },
        ...prev.slice(0, 4),
      ]);
    } else if (mins < 0) {
      setActivityLogsToday([]);
    }

    const updatedFocusStats = {
      totalFocusMinutes: Math.max(0, (profile.focusStats?.totalFocusMinutes || 0) + mins),
      completedSessions: (profile.focusStats?.completedSessions || 0) + (mins > 0 ? 1 : 0),
      todayFocusMinutes: nextVal,
      lastSessionDate: todayStr,
    };

    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focusStats: updatedFocusStats,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);
      } else {
        onProfileUpdate({ ...profile, focusStats: updatedFocusStats });
      }
    } catch {
      onProfileUpdate({ ...profile, focusStats: updatedFocusStats });
    }
  };

  const handleUpdateDailyTargetHours = async (newTargetHours: number) => {
    const clampedHours = Math.max(0.5, Math.min(12, Math.round(newTargetHours * 2) / 2));
    setCustomGoalHoursInput(clampedHours);
    setStudyHours(clampedHours);
    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyHoursPerDay: clampedHours,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);
      } else {
        onProfileUpdate({ ...profile, studyHoursPerDay: clampedHours });
      }
    } catch {
      onProfileUpdate({ ...profile, studyHoursPerDay: clampedHours });
    }
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
    setDeepFocusActive(Boolean(profile.deepFocusEnabled));
  }, [profile.userId, profile.deepFocusEnabled]);

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

  /**
   * Exports the student's learning history and RAG-based summaries into a clean,
   * downloadable PDF study guide.
   */
  const handleExportNotesPdf = async () => {
    setIsExportingNotes(true);
    try {
      const [docsRes, leitnerRes, msgsRes] = await Promise.all([
        fetch('/api/documents').catch(() => null),
        fetch('/api/flashcards/leitner-deck').catch(() => null),
        fetch(`/api/messages?userId=${encodeURIComponent(profile.userId)}&limit=16`).catch(
          () => null
        ),
      ]);

      const docsData = docsRes && docsRes.ok ? await docsRes.json() : { documents: [] };
      const leitnerData =
        leitnerRes && leitnerRes.ok ? await leitnerRes.json() : { cards: [] };
      const msgsData = msgsRes && msgsRes.ok ? await msgsRes.json() : [];

      const rawDocs: any[] = docsData.documents || [];
      const cards: any[] = leitnerData.cards || [];
      const pinnedIds = new Set(profile.pinnedDocumentIds || []);

      // Sort pinned documents and student's active subjects first
      const sortedDocs = [...rawDocs].sort((a, b) => {
        const aPin = pinnedIds.has(a.id) ? 1 : 0;
        const bPin = pinnedIds.has(b.id) ? 1 : 0;
        return bPin - aPin;
      });

      const ragDocuments: RagDocumentSummaryItem[] = sortedDocs.map((d) => {
        const matchingCards = cards.filter((c) => c.documentId === d.id);
        return {
          id: d.id,
          title: d.title,
          subject: d.subject,
          category: d.category,
          summary: d.summary || 'Verified RAG curriculum document.',
          isPinned: pinnedIds.has(d.id),
          chunks: matchingCards.map((c, idx) => ({
            chunkIndex: idx + 1,
            content: c.back,
            keywords: c.keywords || [],
          })),
        };
      });

      // Extract recent Q&A pairs from WhatsApp chat history
      const recentTutorNotes: { question: string; answer: string; date: string }[] = [];
      if (Array.isArray(msgsData)) {
        for (let i = 0; i < msgsData.length - 1; i++) {
          const curr = msgsData[i];
          const next = msgsData[i + 1];
          if (curr.direction === 'incoming' && next.direction === 'outgoing') {
            recentTutorNotes.push({
              question: curr.content,
              answer: next.content,
              date: new Date(next.timestamp).toLocaleDateString(),
            });
          }
        }
      }

      generateExportNotesStudyGuidePdf(profile, {
        ragDocuments,
        recentTutorNotes: recentTutorNotes.reverse(),
      });

      setExportNotesSuccess(true);
      setTimeout(() => setExportNotesSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to export RAG notes PDF study guide:', err);
    } finally {
      setIsExportingNotes(false);
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
          {/* Compact Daily Quiz Streak Fire Pill in Top Header */}
          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            title="Daily Quiz Streak — Click to open Adaptive Quiz & Daily Streak Counter"
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border transition cursor-pointer ${
              (profile.questionsAnsweredToday ?? 3) >= (profile.dailyQuestionsGoal ?? 5)
                ? 'bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-rose-500/20 border-orange-500/50 text-amber-200 shadow-lg shadow-orange-500/10'
                : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:border-amber-500/40'
            }`}
          >
            <Flame
              className={`w-4 h-4 ${
                (profile.questionsAnsweredToday ?? 3) >= (profile.dailyQuestionsGoal ?? 5)
                  ? 'text-orange-400 fill-orange-400 animate-bounce'
                  : 'text-amber-400 fill-amber-400/30 animate-pulse'
              }`}
            />
            <div className="text-left">
              <div className="text-xs font-extrabold leading-none flex items-center space-x-1">
                <span>{profile.streak}d Streak</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold">
                  {profile.questionsAnsweredToday ?? 3}/{profile.dailyQuestionsGoal ?? 5} Quiz
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {(profile.questionsAnsweredToday ?? 3) >= (profile.dailyQuestionsGoal ?? 5)
                  ? 'Daily Target Complete 🔥'
                  : 'Complete Daily Quiz Target'}
              </span>
            </div>
          </button>

          {/* Deep Focus Toggle (Mutes Non-Emergency WhatsApp Notifications & Activates Pomodoro Overlay) */}
          <div
            className={`flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl border transition ${
              deepFocusActive
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:border-slate-600'
            }`}
          >
            <BellOff
              className={`w-4 h-4 ${
                deepFocusActive ? 'text-amber-400 animate-pulse' : 'text-slate-400'
              }`}
            />
            <div className="text-left">
              <div className="text-xs font-bold leading-none flex items-center space-x-1.5">
                <span>Deep Focus</span>
                {deepFocusActive && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black uppercase">
                    DND + Timer
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {deepFocusActive ? 'WhatsApp Muted • Pomodoro On' : 'Mute Non-Urgent Pings'}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={deepFocusActive}
              aria-label="Toggle Deep Focus Mode"
              onClick={() => handleToggleDeepFocus()}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 cursor-pointer focus:outline-none ${
                deepFocusActive ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                  deepFocusActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Export Notes & PDF Summary Buttons (Hidden in Focus Mode to eliminate clutter) */}
          {!deepFocusActive && (
            <>
              <button
                type="button"
                onClick={handleExportNotesPdf}
                disabled={isExportingNotes}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl border border-indigo-400/40 text-xs font-bold shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Convert your learning history and RAG-based summaries into a clean downloadable PDF study guide"
              >
                {isExportingNotes ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Compiling Study Guide...</span>
                  </>
                ) : exportNotesSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Study Guide Exported!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Export Notes (PDF)</span>
                  </>
                )}
              </button>

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
            </>
          )}

          <div
            className={`flex flex-wrap items-center gap-1.5 p-1 rounded-xl border transition-all ${
              deepFocusActive
                ? 'bg-slate-950 border-amber-500/40 shadow-lg shadow-amber-950/20'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'overview' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {deepFocusActive ? 'Focus Workspace' : 'Overview'}
            </button>
            <button
              onClick={() => setActiveTab('thinking_models')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'thinking_models' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>Thinking Models</span>
            </button>
            {!deepFocusActive && (
              <button
                onClick={() => setActiveTab('circles')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'circles' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                <span>Study Circles</span>
              </button>
            )}
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
            {!deepFocusActive && (
              <>
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
                  onClick={() => setActiveTab('roadmap')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'roadmap' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Curriculum Roadmap</span>
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('focus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'focus' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Pomodoro Focus</span>
            </button>
            {!deepFocusActive && (
              <button
                onClick={() => setActiveTab('weekly_report')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'weekly_report' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 text-sky-300" />
                <span>Weekly Report</span>
              </button>
            )}
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
            {!deepFocusActive && (
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
            )}
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                activeTab === 'plan' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Study Planner</span>
            </button>
            {!deepFocusActive && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Focus Mode Active Banner (Shown when Focus Mode is enabled) */}
          {deepFocusActive && (
            <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  <BellOff className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                      Deep Work Focus Mode Active
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30">
                      Distraction-Free Workspace
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Non-essential social feeds, leaderboards, badge vaults, and secondary analytics are hidden so you can concentrate on your daily learning goal and active study session.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleDeepFocus(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition shrink-0 cursor-pointer"
              >
                Exit Focus Mode
              </button>
            </div>
          )}

          {/* Daily Morning Affirmations & Study Quote Card (Hidden in Focus Mode) */}
          {!deepFocusActive && (
            <DailyAffirmationsCard
              profile={profile}
              onNavigateToChat={onNavigateToChat}
            />
          )}

          {/* Biometric Face Authentication Login & Aadhaar / DigiLocker Course Enrollment Hub */}
          {!deepFocusActive && (
            <IdentityAndCourseVerificationHub
              profile={profile}
              onProfileUpdate={onProfileUpdate}
              onOpenFaceAuthModal={() => {
                if (onOpenFaceAuth) {
                  onOpenFaceAuth();
                } else {
                  setLocalFaceAuthOpen(true);
                }
              }}
              onOpenEnrollModal={(course) => setEnrollModalCourse(course)}
            />
          )}

          {/* Visual Streak Alert & Toast Component (Hidden in Focus Mode) */}
          {!deepFocusActive && (
            <StreakNotification
              profile={profile}
              onNavigateToChat={onNavigateToChat}
              onNavigateToQuiz={() => setActiveTab('quiz')}
              onProfileUpdate={onProfileUpdate}
            />
          )}

          {/* Daily Quiz Streak Visual Counter (Animated Fire Icon Indicator when Daily Target Completes) */}
          <DailyQuizStreakCounter
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onNavigateToChat={onNavigateToChat}
            onLogStudyMinutes={handleAddStudyMinutes}
          />

          {/* Daily Study Goal Progress Bar (Tracks Daily Study Hours Goal + Encouraging Message When Met) */}
          <DailyStudyGoal
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            completedMinutesToday={totalStudiedMinutesToday}
            onLogStudyMinutes={handleAddStudyMinutes}
            onUpdateTargetHours={handleUpdateDailyTargetHours}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
          />

          {/* Daily Learning Goal Tracker (Synced with studyHoursPerDay & Real-Time Quiz Progress Bar) */}
          <DailyLearningGoalTracker
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            completedMinutesToday={totalStudiedMinutesToday}
            onLogStudyMinutes={handleAddStudyMinutes}
          />

          {/* Weekly Goal Tracker Section (Visualize study progress against defined weekly learning hours goal) */}
          <WeeklyGoalTracker
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            completedMinutesToday={totalStudiedMinutesToday}
            onLogStudyMinutes={handleAddStudyMinutes}
            onNavigateToChat={onNavigateToChat}
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

          {/* Daily Learning Goal Progress Ring Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
              {/* Animated Circular Progress Ring */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center p-4 bg-slate-950/70 rounded-2xl border border-slate-800/90 shadow-inner space-y-2">
                <CircularStudyGoal
                  completedHours={completedHours}
                  completedMinutes={totalStudiedMinutesToday}
                  targetHours={targetHours}
                  targetMinutes={targetMinutes}
                  remainingHours={remainingHours}
                  remainingMinutes={remainingMinutes}
                  progressPercent={goalProgressPercent}
                  isGoalAchieved={isGoalAchieved}
                  size={160}
                  strokeWidth={12}
                />
                <button
                  type="button"
                  onClick={() => setIsEditingDailyGoalRing(!isEditingDailyGoalRing)}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                >
                  <Settings className="w-3 h-3" />
                  <span>{isEditingDailyGoalRing ? 'Hide Target Editor' : 'Set Daily Target Time'}</span>
                </button>
              </div>

              {/* Goal Details, Target Time Selector & Automatic Activity Logger */}
              <div className="flex-1 w-full space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                        <Target className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-white">Daily Learning Goal</h3>
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
                      Target study time: <span className="text-white font-semibold">{targetHours} hrs/day</span> ({targetMinutes} mins) • Updates automatically as you log sessions
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
                        <span>{remainingMinutes > 0 ? `${remainingMinutes}m (${remainingHours}h)` : '0m left!'}</span>
                      </div>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Logged Today
                      </div>
                      <div className="text-sm font-bold text-emerald-400">
                        {totalStudiedMinutesToday}m / {targetMinutes}m
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Target Daily Study Time Selector */}
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Set Target Daily Study Time:</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[1, 1.5, 2, 2.5, 3, 4].map((presetHrs) => {
                        const isSelected = Math.abs(targetHours - presetHrs) < 0.05;
                        return (
                          <button
                            key={presetHrs}
                            type="button"
                            onClick={() => handleUpdateDailyTargetHours(presetHrs)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            {presetHrs}h ({Math.round(presetHrs * 60)}m)
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {isEditingDailyGoalRing && (
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                        <span className="text-xs text-slate-400">Custom Target (0.5h – 8h):</span>
                        <input
                          type="range"
                          min="0.5"
                          max="8"
                          step="0.5"
                          value={customGoalHoursInput}
                          onChange={(e) => handleUpdateDailyTargetHours(Number(e.target.value))}
                          className="flex-1 accent-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-white">
                          {customGoalHoursInput}h ({Math.round(customGoalHoursInput * 60)}m)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Horizontal Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>0 mins</span>
                    <span className="text-slate-200 font-semibold">
                      {totalStudiedMinutesToday} mins ({completedHours}h) logged • {remainingMinutes > 0 ? `${remainingMinutes} mins remaining` : 'Daily goal achieved!'}
                    </span>
                    <span>{targetMinutes} mins ({targetHours}h) target</span>
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

                {/* Quick Study Activity Logger & Today's Activity Feed */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">
                      Log Study Activity:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddStudyMinutes(15, '15m Concept Review')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition active:scale-95 cursor-pointer"
                    >
                      +15m Review
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddStudyMinutes(25, '25m Pomodoro Sprint')}
                      className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 transition active:scale-95 cursor-pointer"
                    >
                      +25m Pomodoro
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddStudyMinutes(30, '30m Practice Drill')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition active:scale-95 cursor-pointer"
                    >
                      +30m Practice
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddStudyMinutes(45, '45m Video Lecture')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition active:scale-95 cursor-pointer"
                    >
                      +45m Lecture
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddStudyMinutes(60, '1h Deep Study Session')}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      +1h Deep Study
                    </button>
                    {extraLoggedMinutesToday > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAddStudyMinutes(-extraLoggedMinutesToday)}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded-lg text-[10px] border border-slate-800 transition cursor-pointer"
                        title="Reset today's logged study time"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Recent Logged Activity Pills */}
                  {activityLogsToday.length > 0 && (
                    <div className="flex items-center space-x-1.5 overflow-x-auto text-[10px] text-slate-400">
                      <span className="text-emerald-400 font-bold">Recent:</span>
                      {activityLogsToday.slice(0, 2).map((entry) => (
                        <span
                          key={entry.id}
                          className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300 whitespace-nowrap"
                        >
                          +{entry.minutes}m {entry.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pomodoro-Style Study Timer (Synced with Progress + Browser Notification on Focus Block End) */}
          <PomodoroStudyTimer
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onLogStudyMinutes={handleAddStudyMinutes}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            completedMinutesToday={totalStudiedMinutesToday}
          />

          {/* Deep Focus Session Tracker (Synced with Pomodoro Timer + Browser Tab Lock Option) */}
          <DeepFocusSessionTracker
            profile={profile}
            deepFocusActive={deepFocusActive}
            onToggleDeepFocus={handleToggleDeepFocus}
            onProfileUpdate={onProfileUpdate}
            onSessionCompleteMinutes={handleAddStudyMinutes}
            onOpenPomodoroTab={() => setActiveTab('focus')}
          />

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

          {/* Non-Essential Reminders, Badges & Analytics (Hidden when Focus Mode is enabled) */}
          {!deepFocusActive && (
            <>
              {/* Student Achievements System: Digital Badges ('Concept Master', 'Quiz Streak Hero', '100-Question Centurion') */}
              <StudentAchievements
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
                onNavigateToQuiz={() => setActiveTab('quiz')}
                onNavigateToRoadmap={() => setActiveTab('roadmap')}
              />

              {/* Smart Study Reminder System (Firebase Cloud Messaging Push Notifications based on preferredStudyTime) */}
              <SmartStudyReminderFcm
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
                onNavigateToQuiz={() => setActiveTab('quiz')}
              />

              {/* Study Session Planner: Calendar Time-Blocking for DSA & Government Exams + Upcoming Event View */}
              <StudySessionPlanner
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
                onNavigateToQuiz={() => setActiveTab('quiz')}
                onLogStudyMinutes={handleAddStudyMinutes}
              />

              {/* DSA Study Materials & Government Exams Preparation Documents, Classes & Notifications */}
              <DsaAndGovExamHub
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
                onNavigateToQuiz={() => setActiveTab('quiz')}
                onOpenMaterialsTab={() => setActiveTab('materials')}
                onLogStudyMinutes={handleAddStudyMinutes}
              />

              {/* WhatsApp Daily Study Session Reminders Feature */}
              <DailyStudyReminderCard
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
              />

              {/* Earned Achievement Badges Showcase: Streaks, Completed Lessons & High Quiz Scores */}
              <AchievementBadgesShowcase
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
                onNavigateToQuiz={() => setActiveTab('quiz')}
                onNavigateToLessons={() => setActiveTab('roadmap')}
                onOpenFullVault={() => setActiveTab('badges')}
              />

              {/* Virtual Badges Profile Section Showcase Widget */}
              <ProfileBadgesWidget
                profile={profile}
                onNavigateToBadges={() => setActiveTab('badges')}
              />

              {/* Curriculum Roadmap Progress Banner Spotlight */}
              <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-emerald-950/50 border border-indigo-500/30 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                        Curriculum Roadmap
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Rural Offline Ready
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5">
                      Track Step-by-Step Milestones & Earn Badges
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Structured checklists for Generative AI, AI Agents, Python, Java, C, C++, C#, R, DSA, and Calculus. Mark off milestones as you learn.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('roadmap')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                >
                  <span>Open Roadmap Checklist</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 30-Day Progress & Quiz Scores Line Graph (Recharts LineChart) */}
              <ThirtyDayProgressLineChart
                profile={profile}
                onNavigateToQuiz={() => setActiveTab('quiz')}
                onNavigateToChat={onNavigateToChat}
              />

              {/* Weekly Activity Chart (Recharts: Questions Answered & Study Sessions Completed per Day of Week) */}
              <WeeklyActivityChart
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                completedMinutesToday={totalStudiedMinutesToday}
                onLogStudyMinutes={handleAddStudyMinutes}
                onNavigateToQuiz={() => setActiveTab('quiz')}
                onNavigateToChat={onNavigateToChat}
              />

              {/* Weekly Learning Activity Line Chart (Recharts: Daily Study Hours & Quiz Performance Trends) */}
              <WeeklyLearningActivityChart
                profile={profile}
                extraMinutesToday={extraLoggedMinutesToday}
                onLogStudyMinutes={handleAddStudyMinutes}
              />

              {/* Recharts Sub-Topic Mastery Visual Heatmap (Quiz Performance & Learning History) */}
              <SubTopicMasteryHeatmapChart
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
                onNavigateToQuiz={() => setActiveTab('quiz')}
              />

              {/* Knowledge Gaps Heatmap Visualization Widget (Click Low-Performing Areas for Targeted Review) */}
              <KnowledgeGapsHeatmap
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
                onNavigateToQuiz={() => setActiveTab('quiz')}
                onLogStudyMinutes={handleAddStudyMinutes}
              />
            </>
          )}

          {/* High-Level Thinking Models Studio for Students (Essential Deep-Work Tool — Kept visible in Focus Mode) */}
          <HighLevelThinkingModels
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onLogStudyMinutes={handleAddStudyMinutes}
          />

          {/* Daily Flashcards (Essential Active Recall Tool — Kept visible in Focus Mode) */}
          <DailyFlashcards
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onLogStudyMinutes={handleAddStudyMinutes}
          />

          {/* Secondary Analytics, Social Leaderboards, Study Circles & PDF Exporters (Hidden in Focus Mode) */}
          {!deepFocusActive && (
            <>
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

              {/* Badges & Achievements Collectible Digital Stickers Vault ('7-Day Streak', 'Top Performer', etc.) */}
              <BadgesAndAchievements
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
                onOpenFullBadgesVault={() => setActiveTab('badges')}
              />

              {/* Learning Achievements System: Badges for Course Completions & Study Streaks */}
              <LearningAchievementsCard
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToCourses={() => setActiveTab('courses')}
                onNavigateToChat={onNavigateToChat}
              />

              {/* Global Peer Leaderboard Section (Rank Based on Total Learning Points / XP) */}
              <GlobalPeerLeaderboard
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
              />

              {/* Peer-to-Peer Study Circles (WhatsApp-Bridged Topic Chat Groups) */}
              <StudyCircles
                profile={profile}
                onNavigateToChat={onNavigateToChat}
                onLogStudyMinutes={handleAddStudyMinutes}
              />

              {/* Spaced Repetition Flashcard Engine (5-Box Leitner System Pulling from RAG Knowledge Base) */}
              <SpacedRepetitionEngine
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
                onLogStudyMinutes={handleAddStudyMinutes}
              />
            </>
          )}

          {/* Secondary Promotional Banners & PDF Report Exporters (Hidden in Focus Mode) */}
          {!deepFocusActive && (
            <>
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

              {/* Voice-to-Knowledge Feature (Record Verbal Summaries -> AI Structured Searchable RAG Notes) */}
              <VoiceToKnowledgeCard
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
                onNavigateToMaterials={() => setActiveTab('materials')}
                onLogStudyMinutes={handleAddStudyMinutes}
              />

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

              {/* Smart Notification Scheduler (AI Next-Day Study Time Suggestions + WhatsApp Push) */}
              <SmartNotificationScheduler
                profile={profile}
                onProfileUpdate={onProfileUpdate}
                onNavigateToChat={onNavigateToChat}
              />

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

              {/* Academic Progress Report PDF Exporter & Transcript Preview */}
              <AcademicPdfExportCard
                profile={profile}
                studyPlan={studyPlan}
                recommendations={recommendations}
              />

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

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportNotesPdf}
                    disabled={isExportingNotes}
                    className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition active:scale-95 text-xs whitespace-nowrap disabled:opacity-50 cursor-pointer"
                    title="Export learning history and RAG-based summaries into a clean PDF study guide"
                  >
                    {isExportingNotes ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Exporting Notes...</span>
                      </>
                    ) : exportNotesSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Notes PDF Exported!</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 text-white" />
                        <span>Export Notes (RAG Study Guide)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={generateProgressReportPdf}
                    disabled={isGeneratingPdf}
                    className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-95 text-xs whitespace-nowrap disabled:opacity-50 cursor-pointer"
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
              </div>

              {/* Weekly Study Report & Session Bar Chart */}
              <WeeklyStudyReport
                profile={profile}
                onNavigateToChat={onNavigateToChat}
                onNavigateToQuiz={() => setActiveTab('quiz')}
              />
            </>
          )}
        </div>
      )}

      {/* High-Level Thinking Models Studio Tab */}
      {activeTab === 'thinking_models' && (
        <HighLevelThinkingModels
          profile={profile}
          onProfileUpdate={onProfileUpdate}
          onNavigateToChat={onNavigateToChat}
          onLogStudyMinutes={handleAddStudyMinutes}
        />
      )}

      {/* Peer-to-Peer Study Circles Tab */}
      {activeTab === 'circles' && (
        <StudyCircles
          profile={profile}
          onNavigateToChat={onNavigateToChat}
          onLogStudyMinutes={handleAddStudyMinutes}
        />
      )}

      {/* RAG Knowledge Base Study Materials & Pinned Documents Tab */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          <DsaAndGovExamHub
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onLogStudyMinutes={handleAddStudyMinutes}
          />
          <VoiceToKnowledgeCard
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onLogStudyMinutes={handleAddStudyMinutes}
          />
          <StudyMaterialsBrowser
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
          />
        </div>
      )}

      {/* Free Courses & YouTube Videos Tab */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <IdentityAndCourseVerificationHub
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onOpenFaceAuthModal={() => {
              if (onOpenFaceAuth) {
                onOpenFaceAuth();
              } else {
                setLocalFaceAuthOpen(true);
              }
            }}
            onOpenEnrollModal={(course) => setEnrollModalCourse(course)}
          />
          <DsaAndGovExamHub
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onOpenMaterialsTab={() => setActiveTab('materials')}
            onLogStudyMinutes={handleAddStudyMinutes}
          />
          <FreeCoursesAndVideos
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
          />
        </div>
      )}

      {/* Curriculum Roadmap Step-by-Step Progress Checklist Tab */}
      {activeTab === 'roadmap' && (
        <CurriculumRoadmap
          profile={profile}
          onProfileUpdate={onProfileUpdate}
          onNavigateToChat={onNavigateToChat}
          onNavigateToQuiz={() => setActiveTab('quiz')}
        />
      )}

      {/* Pomodoro Focus Deep Work Timer Tab */}
      {activeTab === 'focus' && (
        <div className="space-y-6">
          <PomodoroStudyTimer
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onLogStudyMinutes={handleAddStudyMinutes}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            completedMinutesToday={totalStudiedMinutesToday}
          />
          <DeepFocusSessionTracker
            profile={profile}
            deepFocusActive={deepFocusActive}
            onToggleDeepFocus={handleToggleDeepFocus}
            onProfileUpdate={onProfileUpdate}
            onSessionCompleteMinutes={handleAddStudyMinutes}
          />
          <PomodoroFocusTimer
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
          />
        </div>
      )}

      {/* Weekly Study Report Tab */}
      {activeTab === 'weekly_report' && (
        <div className="space-y-6">
          <WeeklyGoalTracker
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            completedMinutesToday={totalStudiedMinutesToday}
            onLogStudyMinutes={handleAddStudyMinutes}
            onNavigateToChat={onNavigateToChat}
          />
          <WeeklyActivityChart
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            completedMinutesToday={totalStudiedMinutesToday}
            onLogStudyMinutes={handleAddStudyMinutes}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onNavigateToChat={onNavigateToChat}
          />
          <AcademicPdfExportCard
            profile={profile}
            studyPlan={studyPlan}
            recommendations={recommendations}
          />
          <WeeklyStudyReport
            profile={profile}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
          />
        </div>
      )}

      {/* Active Recall & Leitner Spaced Repetition Flashcards Tab */}
      {activeTab === 'flashcards' && (
        <div className="space-y-8">
          <DailyFlashcards
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onLogStudyMinutes={handleAddStudyMinutes}
          />
          <SpacedRepetitionEngine
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onLogStudyMinutes={handleAddStudyMinutes}
          />
          <FlashcardDeckGenerator
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToQuiz={() => setActiveTab('quiz')}
          />
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="space-y-6">
          <DailyQuizStreakCounter
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onNavigateToChat={onNavigateToChat}
            onLogStudyMinutes={handleAddStudyMinutes}
          />
          <DailyLearningGoalTracker
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            completedMinutesToday={totalStudiedMinutesToday}
            onLogStudyMinutes={handleAddStudyMinutes}
          />
          <AdaptiveQuiz
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onQuizCompleted={({ minutesEarned, questionsCount, score, topic }) => {
              const nowTime = new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              setActivityLogsToday((prev) => [
                {
                  id: `quiz_done_${Date.now()}`,
                  label: `Quiz: ${topic} (${score}/${questionsCount})`,
                  minutes: minutesEarned,
                  time: nowTime,
                },
                ...prev.slice(0, 4),
              ]);
            }}
          />
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="space-y-6">
          <StudentAchievements
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onNavigateToRoadmap={() => setActiveTab('roadmap')}
          />
          <AchievementBadgesShowcase
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onNavigateToLessons={() => setActiveTab('roadmap')}
          />
          <BadgesAndAchievements
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
          />
          <Badges
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onNavigateToChat={onNavigateToChat}
          />
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="space-y-6">
          <StudySessionPlanner
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onLogStudyMinutes={handleAddStudyMinutes}
          />
          <SmartStudyReminderFcm
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
          />
          <SmartNotificationScheduler
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
          />
          <StudyPlanner
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
          />
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-6">
          <KnowledgeGapsHeatmap
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onLogStudyMinutes={handleAddStudyMinutes}
          />
          <SubTopicMasteryHeatmapChart
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
          />
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
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="space-y-8">
          <StudentAchievements
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToChat={onNavigateToChat}
            onNavigateToQuiz={() => setActiveTab('quiz')}
            onNavigateToRoadmap={() => setActiveTab('roadmap')}
          />
          <LearningAchievementsCard
            profile={profile}
            onProfileUpdate={onProfileUpdate}
            onNavigateToCourses={() => setActiveTab('courses')}
            onNavigateToChat={onNavigateToChat}
          />
          <LearningMilestones
            profile={profile}
            onNavigateToChat={onNavigateToChat}
            onDownloadReport={generateProgressReportPdf}
          />
        </div>
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

      {/* Deep Focus Pomodoro Timer & WhatsApp DND Overlay */}
      <DeepFocusOverlay
        profile={profile}
        isActive={deepFocusActive}
        onToggleDeepFocus={(next) => handleToggleDeepFocus(next)}
        onSessionMinutesLogged={(mins) => handleAddStudyMinutes(mins)}
      />

      {/* Aadhaar e-KYC & DigiLocker Course Enrollment Verification Modal */}
      <CourseEnrollmentVerificationModal
        isOpen={!!enrollModalCourse}
        onClose={() => setEnrollModalCourse(null)}
        course={enrollModalCourse}
        profile={profile}
        onProfileUpdate={onProfileUpdate}
        onOpenFaceAuth={() => {
          setEnrollModalCourse(null);
          if (onOpenFaceAuth) {
            onOpenFaceAuth();
          } else {
            setLocalFaceAuthOpen(true);
          }
        }}
      />

      {/* Fallback Local Face Auth Modal if triggered inside StudentDashboard */}
      <FaceAuthLoginModal
        isOpen={localFaceAuthOpen}
        onClose={() => setLocalFaceAuthOpen(false)}
        profiles={[profile]}
        selectedProfile={profile}
        onFaceAuthSuccess={(updated) => {
          onProfileUpdate(updated);
          setLocalFaceAuthOpen(false);
        }}
      />
    </div>
  );
};
