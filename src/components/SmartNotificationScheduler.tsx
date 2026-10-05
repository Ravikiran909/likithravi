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
  Sliders,
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
  rationale: string;
  whatsappPreview: string;
  selected?: boolean;
}

export const SmartNotificationScheduler: React.FC<SmartNotificationSchedulerProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
}) => {
  const [tomorrowDate, setTomorrowDate] = useState<string>('Tomorrow');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [slots, setSlots] = useState<SmartStudySlot[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushSuccessBanner, setPushSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    runSmartPerformanceAnalysis();
  }, [profile.userId]);

  const runSmartPerformanceAnalysis = async () => {
    setIsAnalyzing(true);
    setPushSuccessBanner(null);
    try {
      const res = await fetch('/api/smart-notification-scheduler/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTomorrowDate(data.tomorrowDate || 'Tomorrow');
        setAiSummary(data.aiSummary || '');
        if (Array.isArray(data.slots)) {
          setSlots(data.slots.map((s: SmartStudySlot) => ({ ...s, selected: true })));
        }
      }
    } catch (err) {
      console.warn('Smart notification analysis error:', err);
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

  const handlePushScheduleToWhatsApp = async (singleSlot?: SmartStudySlot) => {
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
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.updatedProfile) {
          onProfileUpdate(data.updatedProfile);
        }
        setPushSuccessBanner(
          `📲 Pushed ${targetSlots.length} AI-optimized study notification slot(s) for ${tomorrowDate} to WhatsApp (${profile.whatsappNumber})!`
        );
      }
    } catch (err) {
      console.warn('Failed to push smart schedule to WhatsApp:', err);
    } finally {
      setIsPushing(false);
    }
  };

  const accuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 75;

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
                AI Smart Notification Scheduler
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Next-Day Chronotype Optimizer
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                WhatsApp Push Ready ({profile.whatsappNumber})
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5">
              Personalized Next-Day Study Windows & WhatsApp Notification Dispatcher
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Analyzes your quiz accuracy ({accuracy}%), weak topics, and Deep Focus velocity to recommend optimal study times for{' '}
              <strong className="text-white">{tomorrowDate}</strong> and pushes automated reminders directly to your WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={runSmartPerformanceAnalysis}
            disabled={isAnalyzing}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing Performance...' : 'Re-Analyze with AI'}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePushScheduleToWhatsApp()}
            disabled={isPushing || selectedCount === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isPushing
                ? 'Pushing to WhatsApp...'
                : `Push ${selectedCount} Optimal Slot(s) to WhatsApp`}
            </span>
          </button>
        </div>
      </div>

      {/* AI Performance Diagnosis Banner */}
      <div className="relative z-10 p-4 rounded-2xl bg-indigo-950/35 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
              AI Past-Performance & Chronotype Synthesis for {tomorrowDate}
            </div>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed">
              {aiSummary ||
                `Analyzing ${profile.name}'s quiz accuracy (${accuracy}%), ${profile.streak}-day streak, and weak topics to compute tomorrow's highest-retention study windows...`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0 text-xs">
          <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Accuracy</div>
            <div className="text-sm font-black text-emerald-400">{accuracy}%</div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Weak Areas</div>
            <div className="text-sm font-black text-amber-400">
              {profile.weakTopics?.length || 1}
            </div>
          </div>
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
              className="px-3 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center space-x-1 transition cursor-pointer shrink-0"
            >
              <span>View in WhatsApp Simulator</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* 3 Personalized Study Time Slot Cards for Tomorrow */}
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
                      {slot.cognitiveMatchScore}% AI Match
                    </span>
                  </label>

                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                    {slot.subject} • {slot.durationMinutes}m
                  </span>
                </div>

                {/* Editable Time Picker + Window Title */}
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
                    title="Customize notification time"
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

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {slot.windowLabel}
                  </div>
                  <h4 className="text-sm font-extrabold text-white mt-0.5">
                    {slot.topic}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {slot.rationale}
                  </p>
                </div>

                {/* WhatsApp Push Preview Box */}
                <div className="p-2.5 rounded-xl bg-emerald-950/25 border border-emerald-500/20 text-[11px] text-emerald-200/90 font-mono">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block mb-0.5">
                    WhatsApp Push Preview:
                  </span>
                  {slot.whatsappPreview}
                </div>
              </div>

              <button
                type="button"
                disabled={isPushing}
                onClick={() => handlePushScheduleToWhatsApp(slot)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Push {slot.time} Alert to WhatsApp</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
