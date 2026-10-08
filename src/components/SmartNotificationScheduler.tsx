import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sparkles,
  Clock,
  Send,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Brain,
  Flame,
  Target,
  Zap,
  ExternalLink,
  Smartphone,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface SmartNotificationSchedulerProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
}

interface SmartStudySlot {
  id: string;
  time: string;
  windowLabel: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  cognitiveMatchScore: number;
  examAlignment?: string;
  activityInsight?: string;
  rationale: string;
  whatsappPreview: string;
  selected?: boolean;
}

interface AnalyzedExam {
  subject: string;
  date: string;
  title: string;
  daysRemaining: number;
  urgency: 'critical' | 'high' | 'moderate';
}

interface AnalyzedMetrics {
  accuracy: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  streak: number;
  weakTopicsCount: number;
  focusMinutes: number;
  focusSessions: number;
  historySessionsCount: number;
  masteredTopicsCount: number;
  preferredStudyTime: string;
  detectedPeakWindow: string;
  upcomingExams: AnalyzedExam[];
}

export const SmartNotificationScheduler: React.FC<SmartNotificationSchedulerProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
}) => {
  const [horizon, setHorizon] = useState<'today' | 'tomorrow'>('today');
  const [targetDateLabel, setTargetDateLabel] = useState<string>('Today');
  const [targetDateIso, setTargetDateIso] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [aiSummary, setAiSummary] = useState<string>('');
  const [metrics, setMetrics] = useState<AnalyzedMetrics | null>(null);
  const [slots, setSlots] = useState<SmartStudySlot[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [syncToStudyPlan, setSyncToStudyPlan] = useState<boolean>(true);
  const [pushSuccessBanner, setPushSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    runSmartReminderAnalysis(horizon);
  }, [profile.userId, horizon]);

  const runSmartReminderAnalysis = async (selectedHorizon: 'today' | 'tomorrow' = horizon) => {
    setIsAnalyzing(true);
    setPushSuccessBanner(null);
    try {
      const res = await fetch('/api/smart-notification-scheduler/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.userId, horizon: selectedHorizon }),
      });
      if (res.ok) {
        const data = await res.json();
        setTargetDateLabel(data.targetDateLabel || data.tomorrowDate || 'Today');
        setTargetDateIso(data.targetDateIso || new Date().toISOString().split('T')[0]);
        setAiSummary(data.aiSummary || '');
        if (data.metricsAnalyzed) {
          setMetrics(data.metricsAnalyzed);
        }
        if (Array.isArray(data.slots)) {
          setSlots(data.slots.map((s: SmartStudySlot) => ({ ...s, selected: true })));
        }
      }
    } catch (err) {
      console.warn('Smart reminder analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleSlotSelection = (slotId: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, selected: !s.selected } : s))
    );
  };

  const handleUpdateSlotTime = (slotId: string, newTime: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, time: newTime } : s))
    );
  };

  const handlePushScheduleToWhatsApp = async (
    singleSlot?: SmartStudySlot,
    openSimulatorAfter = false
  ) => {
    const targetSlots = singleSlot
      ? [singleSlot]
      : slots.filter((s) => s.selected !== false);

    if (targetSlots.length === 0) return;

    setIsPushing(true);
    setPushSuccessBanner(null);
    try {
      const res = await fetch('/api/smart-notification-scheduler/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          slots: targetSlots,
          updatePreferredTime: targetSlots[0]?.time,
          targetDateLabel,
          targetDateIso,
          syncToStudyPlan,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.updatedProfile) {
          onProfileUpdate(data.updatedProfile);
        }
        setPushSuccessBanner(
          `📲 Dispatched ${targetSlots.length} Smart Reminder slot(s) for ${targetDateLabel} to the WhatsApp Simulator (${profile.whatsappNumber})!`
        );
        if (openSimulatorAfter && onNavigateToChat) {
          onNavigateToChat();
        }
      }
    } catch (err) {
      console.warn('Failed to push smart schedule to WhatsApp:', err);
    } finally {
      setIsPushing(false);
    }
  };

  const accuracy =
    metrics?.accuracy ??
    (profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 75);

  const upcomingExams: AnalyzedExam[] =
    metrics?.upcomingExams ||
    (profile.examDates || []).map((e) => {
      const daysLeft = Math.max(
        0,
        Math.ceil((new Date(e.date).getTime() - Date.now()) / 86400000)
      );
      return {
        ...e,
        daysRemaining: daysLeft,
        urgency: daysLeft <= 7 ? 'critical' : daysLeft <= 14 ? 'high' : 'moderate',
      };
    });

  const selectedCount = slots.filter((s) => s.selected !== false).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                AI Smart Reminder System
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Past Study Activity + Exam Schedule Analyzer
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                WhatsApp Simulator Connected ({profile.whatsappNumber})
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5">
              Optimal Daily Study Time Suggestions & WhatsApp Simulator Dispatcher
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Analyzes your past study activity ({accuracy}% quiz accuracy, {metrics?.focusMinutes || 125}m Deep Focus, learning history) and upcoming exam countdowns to suggest optimal study windows for{' '}
              <strong className="text-white">{targetDateLabel}</strong>.
            </p>
          </div>
        </div>

        {/* Horizon Toggle & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setHorizon('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                horizon === 'today'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Today's Schedule
            </button>
            <button
              type="button"
              onClick={() => setHorizon('tomorrow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                horizon === 'tomorrow'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tomorrow
            </button>
          </div>

          <button
            type="button"
            onClick={() => runSmartReminderAnalysis(horizon)}
            disabled={isAnalyzing}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Re-Analyze'}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePushScheduleToWhatsApp(undefined, false)}
            disabled={isPushing || selectedCount === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isPushing
                ? 'Sending...'
                : `Send ${selectedCount} Optimal Time(s) to Simulator`}
            </span>
          </button>

          {onNavigateToChat && (
            <button
              type="button"
              onClick={() => handlePushScheduleToWhatsApp(undefined, true)}
              disabled={isPushing || selectedCount === 0}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Send & Open Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Past Study Activity & Exam Schedule Telemetry Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Past Study Activity Analysis */}
        <div className="p-4 rounded-2xl bg-slate-950/75 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Past Study Activity Analysis</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
              {metrics?.detectedPeakWindow || `Peak: 08:30 AM & ${profile.preferredStudyTime || '07:00 PM'}`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Accuracy</div>
              <div className="text-sm font-black text-emerald-400 mt-0.5">{accuracy}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Focus Time</div>
              <div className="text-sm font-black text-indigo-400 mt-0.5">
                {metrics?.focusMinutes ?? (profile.focusStats?.totalFocusMinutes || 125)}m
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Topics Done</div>
              <div className="text-sm font-black text-amber-400 mt-0.5">
                {metrics?.masteredTopicsCount ??
                  (profile.learningHistory || []).filter((h) => h.mastered).length}
                /{metrics?.historySessionsCount ?? (profile.learningHistory || []).length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Streak</div>
              <div className="text-sm font-black text-orange-400 mt-0.5">
                {profile.streak}d 🔥
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {aiSummary ||
              `Calibrated from ${profile.name}'s ${accuracy}% quiz accuracy, ${
                (profile.weakTopics || []).length
              } priority weak topics, and ${profile.streak}-day study streak.`}
          </p>
        </div>

        {/* Card 2: Upcoming Exam Schedule Urgency Matrix */}
        <div className="p-4 rounded-2xl bg-slate-950/75 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Upcoming Exam Schedule Alignment</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                {upcomingExams.length} Exam(s) Tracked
              </span>
            </div>

            {upcomingExams.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                No upcoming exam dates set. Smart Reminders are calibrated for continuous mastery across {(profile.subjects || []).join(', ')}.
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingExams.slice(0, 2).map((exam, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center space-x-2">
                        <span>{exam.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                          {exam.subject}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Exam Date: <strong className="text-slate-200">{exam.date}</strong>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase shrink-0 ${
                        exam.urgency === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : exam.urgency === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      ⏳ {exam.daysRemaining}d left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center space-x-2 text-xs text-slate-300 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={syncToStudyPlan}
              onChange={(e) => setSyncToStudyPlan(e.target.checked)}
              className="accent-emerald-500 rounded cursor-pointer"
            />
            <span>Also auto-add these optimal study slots to {targetDateLabel}'s Study Planner</span>
          </label>
        </div>
      </div>

      {/* WhatsApp Push Confirmation Toast */}
      {pushSuccessBanner && (
        <div className="relative z-10 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{pushSuccessBanner}</span>
          </div>
          {onNavigateToChat && (
            <button
              type="button"
              onClick={() => onNavigateToChat()}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center space-x-1.5 transition cursor-pointer shrink-0"
            >
              <span>View in WhatsApp Simulator</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* 3 Personalized Optimal Study Time Slot Cards */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {slots.map((slot) => {
          const isSelected = slot.selected !== false;
          return (
            <div
              key={slot.id}
              className={`p-5 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-slate-950/90 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                  : 'bg-slate-950/40 border-slate-800 opacity-70'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSlotSelection(slot.id)}
                      className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {slot.cognitiveMatchScore}% Optimal Match
                    </span>
                  </label>

                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                    {slot.subject} • {slot.durationMinutes}m
                  </span>
                </div>

                {/* Editable Time Picker */}
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-base font-black font-mono text-white">
                      {slot.time}
                    </span>
                  </div>
                  <select
                    value={slot.time}
                    onChange={(e) => handleUpdateSlotTime(slot.id, e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                    title="Customize reminder time"
                  >
                    {[
                      slot.time,
                      '07:30 AM',
                      '08:30 AM',
                      '10:00 AM',
                      '02:00 PM',
                      '04:30 PM',
                      '06:30 PM',
                      '07:00 PM',
                      '08:30 PM',
                      '09:30 PM',
                    ]
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Exam & Activity Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {slot.examAlignment && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                      📅 {slot.examAlignment}
                    </span>
                  )}
                  {slot.activityInsight && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
                      ⚡ {slot.activityInsight}
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {slot.windowLabel}
                  </div>
                  <h4 className="text-sm font-extrabold text-white mt-0.5">
                    {slot.topic}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {slot.rationale}
                  </p>
                </div>

                {/* WhatsApp Simulator Preview Box */}
                <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/20 text-[11px] text-emerald-200/90 font-mono">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block mb-0.5">
                    WhatsApp Simulator Reminder Preview:
                  </span>
                  {slot.whatsappPreview}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPushing}
                  onClick={() => handlePushScheduleToWhatsApp(slot, false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send {slot.time} Alert</span>
                </button>
                {onNavigateToChat && (
                  <button
                    type="button"
                    disabled={isPushing}
                    onClick={() => handlePushScheduleToWhatsApp(slot, true)}
                    className="py-2 px-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                    title="Send to WhatsApp Simulator and open chat"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
