import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Bell,
  Plus,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Trash2,
  Sparkles,
  Target,
  FileQuestion,
  Smartphone,
  X,
  Check,
  Pause,
  Flame,
} from 'lucide-react';
import { StudentProfile, StudyPlan, StudyPlanItem, Reminder } from '../types/index.ts';
import { WeeklyStudyCalendar } from './WeeklyStudyCalendar.tsx';

interface StudyPlannerProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
}

export const StudyPlanner: React.FC<StudyPlannerProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
}) => {
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Date selection state for daily sessions
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Modals / forms visibility
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'weekly_calendar' | 'daily_sessions' | 'upcoming_exams' | 'reminders_center'
  >('daily_sessions');

  // Form states for new study session
  const [sessionSubject, setSessionSubject] = useState(profile.subjects[0] || 'General Studies');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionDate, setSessionDate] = useState(todayStr);
  const [sessionTime, setSessionTime] = useState(profile.preferredStudyTime || '7:00 PM');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [sessionTasks, setSessionTasks] = useState<string[]>([
    'Review key concepts & formulas',
    'Solve 3 practice questions',
    'WhatsApp doubt resolution',
  ]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [setReminderForSession, setSetReminderForSession] = useState(true);

  // Form states for new exam
  const [examSubject, setExamSubject] = useState(profile.subjects[0] || 'Indian Polity');
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [createExamReminder, setCreateExamReminder] = useState(true);
  const [examReminderTime, setExamReminderTime] = useState('08:00 AM');

  // Form states for custom reminder
  const [customReminderText, setCustomReminderText] = useState('');
  const [customReminderTime, setCustomReminderTime] = useState(profile.preferredStudyTime || '7:00 PM');
  const [customReminderSubject, setCustomReminderSubject] = useState(profile.subjects[0] || 'Indian Polity');
  const [customReminderFrequency, setCustomReminderFrequency] = useState<'daily' | 'once' | 'weekly'>('daily');

  // Automated WhatsApp Simulator Reminder Auto-Dispatcher state
  const [autoSimulatorEnabled, setAutoSimulatorEnabled] = useState(true);
  const [autoCountdownSec, setAutoCountdownSec] = useState<number | null>(null);
  const [lastDispatchedLog, setLastDispatchedLog] = useState<{
    title: string;
    timestamp: string;
    whatsappNumber: string;
  } | null>(null);

  // Inline profile study settings quick-edit
  const [isEditingStudyHours, setIsEditingStudyHours] = useState(false);
  const [tempHours, setTempHours] = useState(profile.studyHoursPerDay);
  const [tempStudyTime, setTempStudyTime] = useState(profile.preferredStudyTime || '7:00 PM');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [triggeringReminderId, setTriggeringReminderId] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setActionErrorMsg(null);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4500);
  };

  const showError = (msg: string) => {
    setActionErrorMsg(msg);
    setTimeout(() => {
      setActionErrorMsg(null);
    }, 5500);
  };

  useEffect(() => {
    loadStudyPlanAndReminders();
  }, [profile.userId]);

  // Automated Simulator Countdown Timer (when user starts a live automated reminder timer)
  useEffect(() => {
    if (autoCountdownSec === null) return;
    if (autoCountdownSec <= 0) {
      setAutoCountdownSec(null);
      handleDispatchNextAutomatedSimulatorReminder(false);
      return;
    }
    const timer = setTimeout(() => {
      setAutoCountdownSec((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoCountdownSec]);

  const loadStudyPlanAndReminders = async () => {
    setIsLoading(true);
    try {
      const [planRes, remRes] = await Promise.all([
        fetch(`/api/study-plan/${profile.userId}`),
        fetch(`/api/reminders/${profile.userId}`),
      ]);
      if (planRes.ok) {
        const data = await planRes.ok ? await planRes.json() : { studyPlan: { items: [] } };
        setStudyPlan(data.studyPlan);
      }
      if (remRes.ok) {
        const remData = await remRes.json();
        setReminders(remData);
      }
    } catch (err) {
      console.error('Error fetching planner data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate days remaining to an exam
  const calculateDaysRemaining = (examDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(examDateStr);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Find nearest upcoming exam
  const sortedExams = [...(profile.examDates || [])].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  const nearestExam = sortedExams.find((e) => calculateDaysRemaining(e.date) >= 0);

  // Quick save daily study goal & preferred time to profile
  const handleSaveProfilePreferences = async () => {
    setIsSavingProfile(true);
    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studyHoursPerDay: Number(tempHours),
          preferredStudyTime: tempStudyTime,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);
        setIsEditingStudyHours(false);
        showNotification('Profile study preferences updated successfully!');
      }
    } catch (err) {
      console.error('Failed to update profile study target', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Add a new scheduled study session
  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;

    try {
      const createdItem: StudyPlanItem = {
        id: 'plan_item_' + Date.now(),
        dayNumber: (studyPlan?.items.length || 0) + 1,
        dateStr: sessionDate,
        title: sessionTitle.trim(),
        topic: sessionTopic.trim() || sessionTitle.trim(),
        subject: sessionSubject,
        durationMinutes: Number(sessionDuration),
        tasks: sessionTasks.map((t) => ({ task: t, completed: false })),
        isCompleted: false,
        isMissed: false,
        timeSlot: sessionTime,
      };

      const res = await fetch(`/api/study-plan/${profile.userId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createdItem),
      });

      if (res.ok) {
        const data = await res.json();
        setStudyPlan(data.studyPlan);

        // Optionally create an automated WhatsApp reminder
        if (setReminderForSession) {
          const remRes = await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.userId,
              reminderText: `Study Session: ${sessionTitle} (${sessionSubject})`,
              targetTime: sessionTime,
              frequency: 'daily',
              subject: sessionSubject,
              type: 'daily_session',
              sendWhatsAppNow: true,
            }),
          });
          if (remRes.ok) {
            const remData = await remRes.json();
            setReminders((prev) => [...prev, remData.reminder]);
          }
        }

        setShowAddSessionModal(false);
        setSessionTitle('');
        setSessionTopic('');
        showNotification(`Session scheduled for ${sessionDate} at ${sessionTime}!`);
      }
    } catch (err) {
      console.error('Failed to add study session:', err);
    }
  };

  // Toggle study session completed
  const handleToggleSessionComplete = async (item: StudyPlanItem) => {
    const updatedStatus = !item.isCompleted;
    try {
      const res = await fetch(`/api/study-plan/${profile.userId}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: updatedStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setStudyPlan(data.studyPlan);
        showNotification(
          updatedStatus ? `Marked "${item.title}" as completed! 🎉` : `Session reopened.`
        );
      }
    } catch (err) {
      console.error('Failed to toggle session complete:', err);
    }
  };

  // Toggle individual task within session
  const handleToggleTask = async (item: StudyPlanItem, taskIndex: number) => {
    const updatedTasks = item.tasks.map((t, idx) =>
      idx === taskIndex ? { ...t, completed: !t.completed } : t
    );
    const allCompleted = updatedTasks.every((t) => t.completed);

    try {
      const res = await fetch(`/api/study-plan/${profile.userId}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks, isCompleted: allCompleted }),
      });
      if (res.ok) {
        const data = await res.json();
        setStudyPlan(data.studyPlan);
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Delete a study session
  const handleDeleteSession = async (itemId: string) => {
    try {
      const res = await fetch(`/api/study-plan/${profile.userId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setStudyPlan(data.studyPlan);
        showNotification('Study session removed from planner.');
      }
    } catch (err) {
      console.error('Failed to delete study session:', err);
    }
  };

  // Add an upcoming exam to student's profile
  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) return;

    try {
      const newExam = {
        subject: examSubject,
        date: examDate,
        title: examTitle.trim(),
      };

      const updatedExams = [...(profile.examDates || []), newExam];

      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examDates: updatedExams }),
      });

      if (res.ok) {
        const updatedProfile = await res.json();
        onProfileUpdate(updatedProfile);

        // Optionally create an exam countdown reminder
        if (createExamReminder) {
          const daysLeft = calculateDaysRemaining(examDate);
          const remRes = await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.userId,
              reminderText: `Upcoming Exam: ${newExam.title}`,
              targetTime: examReminderTime,
              frequency: 'daily',
              subject: newExam.subject,
              type: 'exam',
              examTitle: newExam.title,
              examDate: newExam.date,
              daysBeforeExam: daysLeft,
            }),
          });
          if (remRes.ok) {
            const remData = await remRes.json();
            setReminders((prev) => [...prev, remData.reminder]);
          }
        }

        setShowAddExamModal(false);
        setExamTitle('');
        showNotification(`Exam "${newExam.title}" scheduled for ${examDate}!`);
      }
    } catch (err) {
      console.error('Failed to add exam:', err);
    }
  };

  // Delete an upcoming exam from student's profile
  const handleDeleteExam = async (examTitleToDelete: string) => {
    try {
      const updatedExams = (profile.examDates || []).filter((e) => e.title !== examTitleToDelete);
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examDates: updatedExams }),
      });
      if (res.ok) {
        const updatedProfile = await res.json();
        onProfileUpdate(updatedProfile);
        showNotification(`Exam removed from your schedule.`);
      }
    } catch (err) {
      console.error('Failed to delete exam:', err);
    }
  };

  // Trigger an instant reminder to the WhatsApp simulator
  const handleTriggerReminder = async (reminder: Reminder, openSimulator = false) => {
    setTriggeringReminderId(reminder.id);
    try {
      const res = await fetch(`/api/reminders/${reminder.id}/trigger`, {
        method: 'POST',
      });
      if (res.ok) {
        setLastDispatchedLog({
          title: reminder.reminderText,
          timestamp: new Date().toLocaleTimeString(),
          whatsappNumber: profile.whatsappNumber,
        });
        showNotification(`🚀 Automated Reminder dispatched to WhatsApp Simulator (${profile.whatsappNumber})!`);
        if (openSimulator) {
          onNavigateToChat();
        }
      }
    } catch (err) {
      console.error('Failed to trigger reminder:', err);
    } finally {
      setTriggeringReminderId(null);
    }
  };

  // Dispatch the next scheduled study session as an automated WhatsApp simulator reminder
  const handleDispatchNextAutomatedSimulatorReminder = async (openSimulatorAfter = false) => {
    const nextSession =
      (studyPlan?.items || []).find((s) => !s.isCompleted && s.dateStr >= todayStr) ||
      (studyPlan?.items || [])[0];

    if (reminders.length > 0) {
      await handleTriggerReminder(reminders[0], openSimulatorAfter);
      return;
    }

    if (nextSession) {
      try {
        const res = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.userId,
            reminderText: `Automated Study Session Alert: ${nextSession.title} (${nextSession.subject}) — ${nextSession.durationMinutes} mins`,
            targetTime: nextSession.timeSlot || profile.preferredStudyTime || '7:00 PM',
            frequency: 'daily',
            subject: nextSession.subject,
            type: 'daily_session',
            sendWhatsAppNow: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setReminders((prev) => [data.reminder, ...prev]);
          setLastDispatchedLog({
            title: data.reminder.reminderText,
            timestamp: new Date().toLocaleTimeString(),
            whatsappNumber: profile.whatsappNumber,
          });
          showNotification(`🔔 Automated study session reminder delivered to WhatsApp Simulator!`);
          if (openSimulatorAfter) {
            onNavigateToChat();
          }
        }
      } catch (err) {
        console.error('Failed to dispatch automated session reminder:', err);
      }
    }
  };

  // Delete a reminder
  const handleDeleteReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        showNotification('Reminder removed.');
      }
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  // Create custom reminder
  const handleAddCustomReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customReminderText.trim()) return;

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          reminderText: customReminderText.trim(),
          targetTime: customReminderTime,
          frequency: customReminderFrequency,
          subject: customReminderSubject,
          type: 'custom',
          sendWhatsAppNow: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReminders((prev) => [...prev, data.reminder]);
        setShowAddReminderModal(false);
        setCustomReminderText('');
        showNotification(`Reminder configured for ${customReminderTime} & sent to WhatsApp Simulator!`);
      }
    } catch (err) {
      console.error('Failed to add custom reminder:', err);
    }
  };

  // Auto-schedule exam prep sessions tailored to weak topics
  const handleAutoScheduleExamPrep = async (exam: { subject: string; date: string; title: string }) => {
    const daysLeft = calculateDaysRemaining(exam.date);
    if (daysLeft <= 0) return;

    const weakInSubject =
      profile.weakTopics.find((w) => w.toLowerCase().includes(exam.subject.toLowerCase())) ||
      `${exam.subject} Key Topics`;

    const sessionDates = [
      todayStr,
      new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
      new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    ];

    const topicsToCover = [
      `Review Weak Area: ${weakInSubject}`,
      `High-Yield Practice Problems for ${exam.subject}`,
      `Full Timed Mock & Error Review for ${exam.title}`,
    ];

    for (let i = 0; i < 3; i++) {
      await fetch(`/api/study-plan/${profile.userId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `plan_auto_${Date.now()}_${i}`,
          dayNumber: (studyPlan?.items.length || 0) + i + 1,
          dateStr: sessionDates[i],
          title: topicsToCover[i],
          topic: topicsToCover[i],
          subject: exam.subject,
          durationMinutes: Math.round(profile.studyHoursPerDay * 60) || 90,
          tasks: [
            { task: `Study key formulas & concepts (${exam.subject})`, completed: false },
            { task: `Solve 4 high-frequency exam questions`, completed: false },
            { task: `Ask AI Tutor on WhatsApp for doubt clarification`, completed: false },
          ],
          isCompleted: false,
          timeSlot: profile.preferredStudyTime || '7:00 PM',
        }),
      });
    }

    await loadStudyPlanAndReminders();
    showNotification(`⚡ 3 targeted study sessions auto-scheduled for ${exam.title}!`);
  };

  // Filter study sessions for selected date
  const sessionsOnSelectedDate = (studyPlan?.items || []).filter(
    (item) => item.dateStr === selectedDate
  );

  const allSessions = studyPlan?.items || [];
  const completedSessionsCount = allSessions.filter((s) => s.isCompleted).length;
  const totalSessionsCount = allSessions.length;
  const planProgressPct =
    totalSessionsCount > 0 ? Math.round((completedSessionsCount / totalSessionsCount) * 100) : 0;

  // Next 7 days helper for day picker
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName =
      i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = allSessions.filter((s) => s.dateStr === dateStr).length;
    return { dateStr, dayName, formatted, count };
  });

  return (
    <div className="space-y-6">
      {/* Toast feedback banners */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="fixed top-20 right-6 z-50 bg-rose-950 border border-rose-500 text-rose-200 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-sm font-medium">{actionErrorMsg}</span>
        </div>
      )}

      {/* Profile Study Target Quick Summary */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-700/60 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <CalendarIcon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Active Study Planner</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Organize your government exam targets and receive WhatsApp reminders
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>Daily Target</span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {profile.studyHoursPerDay} hrs / day
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Bell className="w-3 h-3 text-amber-400" />
                <span>WhatsApp Alert</span>
              </div>
              <div className="text-sm font-bold text-amber-300 mt-0.5">
                {profile.preferredStudyTime || '7:00 PM'}
              </div>
            </div>

            <button
              onClick={() => setIsEditingStudyHours(!isEditingStudyHours)}
              className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-slate-700 transition cursor-pointer"
            >
              {isEditingStudyHours ? 'Close Settings' : 'Edit Target'}
            </button>
          </div>
        </div>

        {/* Quick Edit Profile Target Drawer */}
        {isEditingStudyHours && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-950/60 p-4 rounded-xl">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Daily Study Target (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="8"
                value={tempHours}
                onChange={(e) => setTempHours(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Preferred Study Time (WhatsApp Notification)
              </label>
              <input
                type="text"
                placeholder="e.g. 7:00 PM"
                value={tempStudyTime}
                onChange={(e) => setTempStudyTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveProfilePreferences}
                disabled={isSavingProfile}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 cursor-pointer"
              >
                {isSavingProfile ? 'Saving...' : 'Save Preferences'}
              </button>
              <button
                onClick={() => setIsEditingStudyHours(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Automated WhatsApp Simulator Reminder Dispatch Bar */}
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Automated WhatsApp Simulator Reminder Engine
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  autoSimulatorEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {autoSimulatorEnabled ? 'Auto-Scheduler Active (60s cycle)' : 'Paused'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {lastDispatchedLog ? (
                <span>
                  Last automated WhatsApp alert: <strong className="text-white">{lastDispatchedLog.title}</strong> at{' '}
                  <span className="text-emerald-400 font-mono">{lastDispatchedLog.timestamp}</span>
                </span>
              ) : (
                <span>
                  Automatically dispatches daily study session reminders and interactive quiz prompts to the WhatsApp Simulator ({profile.whatsappNumber}).
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {autoCountdownSec !== null ? (
            <button
              onClick={() => setAutoCountdownSec(null)}
              className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Auto-Dispatching in {autoCountdownSec}s (Cancel)</span>
            </button>
          ) : (
            <button
              onClick={() => setAutoCountdownSec(60)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trigger Next Reminder Now</span>
            </button>
          )}

          <button
            onClick={() => handleDispatchNextAutomatedSimulatorReminder(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
          >
            Dispatch & Open Simulator
          </button>
        </div>
      </div>

      {/* Featured Header for Upcoming Exams */}
      {nearestExam && (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 relative overflow-hidden">
              <Flame className="w-6 h-6 fill-indigo-400/20" />
              <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  Upcoming Exam Goal
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                  {calculateDaysRemaining(nearestExam.date)} Days Left
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{nearestExam.title}</h3>
              <p className="text-xs text-slate-400">Scheduled for {new Date(nearestExam.date).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => handleAutoScheduleExamPrep(nearestExam)}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>Auto-Schedule Prep</span>
            </button>
            <button
              onClick={() => onNavigateToChat(`/quiz ${nearestExam.subject}`)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium px-3.5 py-2 rounded-xl text-xs border border-slate-700 transition cursor-pointer"
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Take Quiz</span>
            </button>
          </div>
        </div>
      )}

      {/* Study Planner Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('daily_sessions')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'daily_sessions'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Daily Study Sessions ({allSessions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('weekly_calendar')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'weekly_calendar'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-300" />
            <span>Weekly Drag & Drop</span>
          </button>

          <button
            onClick={() => setActiveTab('upcoming_exams')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'upcoming_exams'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Upcoming Exams ({profile.examDates?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('reminders_center')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'reminders_center'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>WhatsApp Reminders ({reminders.length})</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddSessionModal(true)}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Daily Session</span>
          </button>

          {activeTab === 'upcoming_exams' && (
            <button
              onClick={() => setShowAddExamModal(true)}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Exam</span>
            </button>
          )}

          {activeTab === 'reminders_center' && (
            <button
              onClick={() => setShowAddReminderModal(true)}
              className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Reminder</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB: WEEKLY DRAG & DROP CALENDAR */}
      {/* ==================================================== */}
      {activeTab === 'weekly_calendar' && (
        <WeeklyStudyCalendar
          profile={profile}
          studyPlan={studyPlan}
          onPlanUpdate={(updated) => setStudyPlan(updated)}
          onProfileUpdate={onProfileUpdate}
          onNavigateToChat={onNavigateToChat}
        />
      )}

      {/* ==================================================== */}
      {/* TAB: DAILY STUDY SESSIONS */}
      {/* ==================================================== */}
      {activeTab === 'daily_sessions' && (
        <div className="space-y-6">
          {/* Day Selector Pills Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {nextDays.map((day) => {
              const isSelected = selectedDate === day.dateStr;
              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-lg ring-1 ring-indigo-500'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{day.dayName}</span>
                    {day.count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold">
                        {day.count}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">{day.formatted}</span>
                </button>
              );
            })}
          </div>

          {/* Sessions List for Selected Date */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Sessions Scheduled for {selectedDate}</span>
                  {selectedDate === todayStr && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      Today's Schedule
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete tasks and receive automated reminders on WhatsApp!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-400">
                  Completed: <span className="text-emerald-400 font-bold">{completedSessionsCount}/{totalSessionsCount}</span> ({planProgressPct}%)
                </span>
                <button
                  onClick={() => {
                    setSessionDate(selectedDate);
                    setShowAddSessionModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add for This Day</span>
                </button>
              </div>
            </div>

            {sessionsOnSelectedDate.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-300">
                  No study sessions scheduled for this date
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Keep your daily momentum by scheduling a focused study session now.
                </p>
                <button
                  onClick={() => {
                    setSessionDate(selectedDate);
                    setShowAddSessionModal(true);
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition cursor-pointer"
                >
                  Schedule Session Now
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessionsOnSelectedDate.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={`p-5 rounded-xl border transition ${
                        item.isCompleted
                          ? 'bg-slate-950/70 border-slate-800 opacity-90'
                          : 'bg-slate-800/80 border-slate-700 shadow-md'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start space-x-3.5">
                          <button
                            onClick={() => handleToggleSessionComplete(item)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                            title={item.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                          >
                            {item.isCompleted ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
                            ) : (
                              <Circle className="w-6 h-6 text-slate-500 hover:text-indigo-400" />
                            )}
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {item.subject}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{item.timeSlot || profile.preferredStudyTime}</span>
                                <span>•</span>
                                <span>{item.durationMinutes} mins</span>
                              </span>
                            </div>

                            <h4
                              className={`text-sm font-bold mt-1 ${
                                item.isCompleted ? 'text-slate-400 line-through' : 'text-white'
                              }`}
                            >
                              {item.title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">{item.topic}</p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                          <button
                            onClick={() =>
                              onNavigateToChat(`Teach me ${item.topic} in ${item.subject}`)
                            }
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Study on WhatsApp</span>
                          </button>

                          <button
                            onClick={() => handleDeleteSession(item.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition cursor-pointer"
                            title="Delete session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Subtasks checklist */}
                      {item.tasks && item.tasks.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-700/60 pl-9 space-y-2">
                          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Tasks & Checkpoints:
                          </div>
                          {item.tasks.map((task, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleToggleTask(item, idx)}
                              className="flex items-center space-x-2.5 text-xs text-slate-300 cursor-pointer hover:text-white transition group"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 flex-shrink-0" />
                              )}
                              <span className={task.completed ? 'line-through text-slate-500' : ''}>
                                {task.task}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Full Study Plan Roadmap */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <span>Full Study Plan Roadmap ({allSessions.length} Sessions)</span>
              </h3>
            </div>

            <div className="space-y-3">
              {allSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        session.isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      D{session.dayNumber}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center space-x-2">
                        <span>{session.title}</span>
                        <span className="text-[10px] text-slate-400">({session.subject})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        📅 {session.dateStr} • 🕒 {session.timeSlot || profile.preferredStudyTime || '7:00 PM'} • ⏱️ {session.durationMinutes} mins
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {session.isCompleted ? (
                      <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Done</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => onNavigateToChat(`Teach me ${session.topic}`)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        Start on WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {allSessions.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs italic">
                  No roadmap items yet. Start by adding a session above.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB: UPCOMING EXAMS */}
      {/* ==================================================== */}
      {activeTab === 'upcoming_exams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(profile.examDates || []).map((exam, idx) => {
              const daysLeft = calculateDaysRemaining(exam.date);
              return (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                        {exam.subject}
                      </span>
                      <span className={`text-[10px] font-bold ${daysLeft < 7 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {daysLeft < 0 ? 'Passed' : daysLeft === 0 ? 'Today' : `${daysLeft} Days Left`}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">{exam.title}</h4>
                    <p className="text-xs text-slate-400">Date: {new Date(exam.date).toLocaleDateString()}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => handleAutoScheduleExamPrep(exam)}
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Schedule Prep</span>
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.title)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setShowAddExamModal(true)}
              className="border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 transition bg-slate-950/20 cursor-pointer"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider">Add Exam Target</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB: WHATSAPP REMINDERS CENTER */}
      {/* ==================================================== */}
      {activeTab === 'reminders_center' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Reminder Message
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Topic
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reminders.map((rem) => (
                  <tr key={rem.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-amber-500/15 rounded-lg text-amber-400">
                          <Bell className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-200">{rem.reminderText}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{rem.targetTime}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{rem.frequency}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-medium border border-slate-700">
                        {rem.subject || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleTriggerReminder(rem)}
                          disabled={triggeringReminderId === rem.id}
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg transition border border-emerald-500/30 cursor-pointer disabled:opacity-50"
                          title="Trigger instant simulator dispatch"
                        >
                          {triggeringReminderId === rem.id ? (
                            <X className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteReminder(rem.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
                          title="Delete reminder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {reminders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                      No WhatsApp reminders configured. Keep your study habit alive by adding one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD STUDY SESSION */}
      {/* ==================================================== */}
      {showAddSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Schedule Study Session</span>
              </h3>
              <button onClick={() => setShowAddSessionModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSession} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Subject</label>
                  <select
                    value={sessionSubject}
                    onChange={(e) => setSessionSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    {profile.subjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                    <option value="General Studies">General Studies</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Date</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Session Title</label>
                <input
                  type="text"
                  placeholder="e.g. Master Indian Polity Articles"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Start Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 7:00 PM"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Duration (Mins)</label>
                  <input
                    type="number"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSessionModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD EXAM TARGET */}
      {/* ==================================================== */}
      {showAddExamModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Target className="w-5 h-5 text-indigo-400" />
                <span>Add Exam Milestone</span>
              </h3>
              <button onClick={() => setShowAddExamModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExam} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Exam Name</label>
                <input
                  type="text"
                  placeholder="e.g. UPSC Prelims 2026"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Subject</label>
                  <select
                    value={examSubject}
                    onChange={(e) => setExamSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    {profile.subjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Exam Date</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExamModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                >
                  Save Exam Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD CUSTOM REMINDER */}
      {/* ==================================================== */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <span>Configure WhatsApp Reminder</span>
              </h3>
              <button onClick={() => setShowAddReminderModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomReminder} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Message Content</label>
                <textarea
                  placeholder="e.g. Time to review Five Year Plans and Economy notes!"
                  value={customReminderText}
                  onChange={(e) => setCustomReminderText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Reminder Time</label>
                  <input
                    type="text"
                    placeholder="7:00 PM"
                    value={customReminderTime}
                    onChange={(e) => setCustomReminderTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Frequency</label>
                  <select
                    value={customReminderFrequency}
                    onChange={(e) => setCustomReminderFrequency(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="once">Once</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition cursor-pointer"
                >
                  Active Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
