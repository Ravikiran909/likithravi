import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Bell,
  Plus,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Send,
  Trash2,
  Sparkles,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Check,
  ChevronRight,
  Flame,
  X,
  Target,
  FileQuestion,
  Smartphone,
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
  const [activeTab, setActiveTab] = useState<'weekly_calendar' | 'daily_sessions' | 'upcoming_exams' | 'reminders_center'>('weekly_calendar');

  // Form states for new study session
  const [sessionSubject, setSessionSubject] = useState(profile.subjects[0] || 'Python');
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
  const [examSubject, setExamSubject] = useState(profile.subjects[0] || 'Calculus');
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [createExamReminder, setCreateExamReminder] = useState(true);
  const [examReminderTime, setExamReminderTime] = useState('08:00 AM');

  // Form states for custom reminder
  const [customReminderText, setCustomReminderText] = useState('');
  const [customReminderTime, setCustomReminderTime] = useState(profile.preferredStudyTime || '7:00 PM');
  const [customReminderSubject, setCustomReminderSubject] = useState(profile.subjects[0] || 'DSA');
  const [customReminderFrequency, setCustomReminderFrequency] = useState<'daily' | 'once' | 'weekly'>('daily');

  // Inline profile study settings quick-edit
  const [isEditingStudyHours, setIsEditingStudyHours] = useState(false);
  const [tempHours, setTempHours] = useState(profile.studyHoursPerDay);
  const [tempStudyTime, setTempStudyTime] = useState(profile.preferredStudyTime || '7:00 PM');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [triggeringReminderId, setTriggeringReminderId] = useState<string | null>(null);

  useEffect(() => {
    loadStudyPlanAndReminders();
  }, [profile.userId]);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4000);
  };

  const loadStudyPlanAndReminders = async () => {
    setIsLoading(true);
    try {
      const [planRes, remRes] = await Promise.all([
        fetch(`/api/study-plan/${profile.userId}`),
        fetch(`/api/reminders/${profile.userId}`),
      ]);
      if (planRes.ok) {
        const data = await planRes.json();
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
      const newItem: Partial<StudyPlanItem> = {
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
        body: JSON.stringify(newItem),
      });

      if (res.ok) {
        const data = await res.json();
        setStudyPlan(data.studyPlan);

        // Optionally create a reminder
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

  // Trigger an instant reminder to WhatsApp
  const handleTriggerReminder = async (reminder: Reminder) => {
    setTriggeringReminderId(reminder.id);
    try {
      const res = await fetch(`/api/reminders/${reminder.id}/trigger`, {
        method: 'POST',
      });
      if (res.ok) {
        showNotification(`🚀 Alert sent to WhatsApp (${profile.whatsappNumber})!`);
      }
    } catch (err) {
      console.error('Failed to trigger reminder:', err);
    } finally {
      setTriggeringReminderId(null);
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
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReminders((prev) => [...prev, data.reminder]);
        setShowAddReminderModal(false);
        setCustomReminderText('');
        showNotification(`Reminder configured for ${customReminderTime}!`);
      }
    } catch (err) {
      console.error('Failed to add custom reminder:', err);
    }
  };

  // Auto-schedule exam prep sessions tailored to weak topics
  const handleAutoScheduleExamPrep = async (exam: { subject: string; date: string; title: string }) => {
    const daysLeft = calculateDaysRemaining(exam.date);
    if (daysLeft <= 0) return;

    const weakInSubject = profile.weakTopics.find((w) =>
      w.toLowerCase().includes(exam.subject.toLowerCase())
    ) || `${exam.subject} Key Topics`;

    // Schedule 3 targeted prep sessions
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

  // Group study sessions into upcoming vs past
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
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = allSessions.filter((s) => s.dateStr === dateStr).length;
    return { dateStr, dayName, formatted, count };
  });

  return (
    <div className="space-y-6">
      {/* Toast feedback banner */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Main Header & Profile Data Integration Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personalized Study Planner & Exam Radar</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Study Planner for {profile.name}</span>
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Schedule your daily study sessions, track upcoming exam countdowns, and receive automated WhatsApp study reminders calibrated to your goals.
            </p>
          </div>

          {/* Profile Study Metrics Pills */}
          <div className="flex flex-wrap items-center gap-3">
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
                <span>Study Alert</span>
              </div>
              <div className="text-sm font-bold text-amber-300 mt-0.5">
                {profile.preferredStudyTime || '7:00 PM'}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-2.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Flame className="w-3 h-3 text-emerald-400" />
                <span>Streak</span>
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {profile.streak} Days
              </div>
            </div>

            <button
              onClick={() => setIsEditingStudyHours(!isEditingStudyHours)}
              className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white px-3 py-2 rounded-xl border border-slate-700 transition"
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
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving...' : 'Save Preferences'}
              </button>
              <button
                onClick={() => setIsEditingStudyHours(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Closest Exam Radar Banner (Smart AI Alert) */}
      {nearestExam && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Upcoming Exam Radar
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {calculateDaysRemaining(nearestExam.date)} Days Remaining
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {nearestExam.title} ({nearestExam.subject})
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Scheduled for <span className="text-white font-medium">{nearestExam.date}</span>. Recommended focus: practice high-frequency questions & review weak topics.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleAutoScheduleExamPrep(nearestExam)}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-md shadow-amber-500/20"
              title="Automatically creates 3 targeted prep sessions for this exam"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>Auto-Schedule Prep</span>
            </button>
            <button
              onClick={() => onNavigateToChat(`/quiz ${nearestExam.subject}`)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium px-3.5 py-2 rounded-xl text-xs border border-slate-700 transition"
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Take Quiz</span>
            </button>
          </div>
        </div>
      )}

      {/* Study Planner Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('weekly_calendar')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'weekly_calendar'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-300" />
            <span>Weekly Calendar (Drag & Drop)</span>
          </button>
          <button
            onClick={() => setActiveTab('daily_sessions')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'daily_sessions'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Daily Study Sessions ({allSessions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('upcoming_exams')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
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
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
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
          {activeTab === 'weekly_calendar' && (
            <button
              onClick={() => setShowAddSessionModal(true)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Session</span>
            </button>
          )}

          {activeTab === 'daily_sessions' && (
            <button
              onClick={() => setShowAddSessionModal(true)}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Session</span>
            </button>
          )}

          {activeTab === 'upcoming_exams' && (
            <button
              onClick={() => setShowAddExamModal(true)}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Upcoming Exam</span>
            </button>
          )}

          {activeTab === 'reminders_center' && (
            <button
              onClick={() => setShowAddReminderModal(true)}
              className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Reminder</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* TAB 0: WEEKLY DRAG & DROP CALENDAR */}
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
      {/* TAB 1: DAILY STUDY SESSIONS */}
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
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
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
                  Complete tasks and check in on WhatsApp to protect your {profile.streak}-day streak!
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400">
                  Total Completed: <span className="text-emerald-400 font-bold">{completedSessionsCount}/{totalSessionsCount}</span> ({planProgressPct}%)
                </span>
                <button
                  onClick={() => {
                    setSessionDate(selectedDate);
                    setShowAddSessionModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white border border-slate-700 flex items-center space-x-1.5 transition"
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
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition"
                >
                  Schedule Session Now
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessionsOnSelectedDate.map((item) => (
                  <div
                    key={item.id}
                    className={`p-5 rounded-xl border transition ${
                      item.isCompleted
                        ? 'bg-slate-950/70 border-slate-800 opacity-90'
                        : 'bg-slate-800/80 border-slate-700 shadow-md'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start space-x-3.5">
                        <button
                          onClick={() => handleToggleSessionComplete(item)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-400 transition"
                          title={item.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
                          ) : (
                            <Circle className="w-6 h-6 text-slate-500 hover:text-indigo-400" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center space-x-2">
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
                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          onClick={() => onNavigateToChat(`Teach me ${item.topic} in ${item.subject}`)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Study on WhatsApp</span>
                        </button>

                        <button
                          onClick={() => handleDeleteSession(item.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition"
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
                ))}
              </div>
            )}
          </div>

          {/* All upcoming sessions preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-indigo-400" />
              <span>Full Study Plan Roadmap ({allSessions.length} Sessions)</span>
            </h3>

            <div className="space-y-3">
              {allSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition"
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
                        📅 {session.dateStr} • ⏱️ {session.durationMinutes} mins
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
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium border border-slate-700 transition"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: UPCOMING EXAMS & EXAM REMINDERS */}
      {/* ==================================================== */}
      {activeTab === 'upcoming_exams' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(profile.examDates || []).map((exam, index) => {
              const daysLeft = calculateDaysRemaining(exam.date);
              const isUrgent = daysLeft >= 0 && daysLeft <= 7;
              const isApproaching = daysLeft > 7 && daysLeft <= 14;

              // Find reminder configured for this exam
              const matchingReminder = reminders.find(
                (r) => r.examTitle === exam.title || r.subject === exam.subject
              );

              return (
                <div
                  key={index}
                  className={`p-6 rounded-2xl border transition relative overflow-hidden flex flex-col justify-between ${
                    isUrgent
                      ? 'bg-gradient-to-br from-red-950/30 to-slate-900 border-red-500/40 shadow-xl'
                      : isApproaching
                      ? 'bg-gradient-to-br from-amber-950/30 to-slate-900 border-amber-500/30 shadow-lg'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                        {exam.subject}
                      </span>

                      <div className="flex items-center space-x-2">
                        {daysLeft < 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            Completed
                          </span>
                        ) : (
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                              isUrgent
                                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                                : isApproaching
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            ⏳ {daysLeft === 0 ? 'Today!' : `${daysLeft} days remaining`}
                          </span>
                        )}

                        <button
                          onClick={() => handleDeleteExam(exam.title)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                          title="Remove exam"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-white">{exam.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Exam Date: <strong className="text-white">{exam.date}</strong></span>
                    </p>

                    {/* Reminder Status Box */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center space-x-1">
                          <Bell className="w-3 h-3 text-amber-400" />
                          <span>WhatsApp Reminder</span>
                        </span>
                        <span className="text-emerald-400 font-bold">
                          {matchingReminder ? 'Active Alert' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {matchingReminder
                          ? `Scheduled ${matchingReminder.frequency} at ${matchingReminder.targetTime} to ${profile.whatsappNumber}`
                          : `No specific exam alert configured yet.`}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    {matchingReminder ? (
                      <button
                        onClick={() => handleTriggerReminder(matchingReminder)}
                        disabled={triggeringReminderId === matchingReminder.id}
                        className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition active:scale-95 disabled:opacity-50"
                        title="Send immediate exam alert message to WhatsApp"
                      >
                        <Send className="w-3 h-3" />
                        <span>
                          {triggeringReminderId === matchingReminder.id
                            ? 'Sending Alert...'
                            : 'Send Alert to WhatsApp'}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          const res = await fetch('/api/reminders', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              userId: profile.userId,
                              reminderText: `Exam in ${daysLeft} days: ${exam.title}`,
                              targetTime: '08:00 AM',
                              frequency: 'daily',
                              subject: exam.subject,
                              type: 'exam',
                              examTitle: exam.title,
                              examDate: exam.date,
                              daysBeforeExam: daysLeft,
                              sendWhatsAppNow: true,
                            }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setReminders((prev) => [...prev, data.reminder]);
                            showNotification(`WhatsApp exam countdown reminder activated!`);
                          }
                        }}
                        className="flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition"
                      >
                        <Bell className="w-3 h-3" />
                        <span>Enable WhatsApp Alert</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleAutoScheduleExamPrep(exam)}
                      className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-700 transition"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Prep Roadmap</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {(profile.examDates || []).length === 0 && (
            <div className="text-center py-16 px-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Upcoming Exams Scheduled</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Add your upcoming school, university, or competitive exams to get personalized daily countdowns and automated study reminders.
              </p>
              <button
                onClick={() => setShowAddExamModal(true)}
                className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition"
              >
                Add Your First Exam
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: REMINDERS MANAGEMENT CENTER */}
      {/* ==================================================== */}
      {activeTab === 'reminders_center' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Configured WhatsApp Study Reminders</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Delivered straight to WhatsApp (+91 {profile.whatsappNumber}) in your preferred time zone.
              </p>
            </div>

            <button
              onClick={() => setShowAddReminderModal(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Reminder</span>
            </button>
          </div>

          <div className="space-y-3">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`p-2.5 rounded-xl border mt-0.5 ${
                      rem.type === 'exam'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {rem.type === 'exam' ? 'Exam Countdown' : rem.subject || 'Daily Study'}
                      </span>
                      <span className="text-xs font-semibold text-emerald-400">
                        🕒 {rem.targetTime}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({rem.frequency === 'daily' ? 'Repeats Daily' : 'One-time'})
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white mt-1">
                      {rem.reminderText}
                    </h4>

                    {rem.examDate && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Exam Date: <strong className="text-white">{rem.examDate}</strong>
                        {rem.daysBeforeExam !== undefined && ` (${rem.daysBeforeExam} days left)`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    onClick={() => handleTriggerReminder(rem)}
                    disabled={triggeringReminderId === rem.id}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium border border-slate-700 transition disabled:opacity-50"
                    title="Send test message right now to WhatsApp"
                  >
                    <Send className="w-3 h-3 text-emerald-400" />
                    <span>
                      {triggeringReminderId === rem.id ? 'Sending...' : 'Test WhatsApp Ping'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleDeleteReminder(rem.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                    title="Delete reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: SCHEDULE DAILY STUDY SESSION */}
      {/* ==================================================== */}
      {showAddSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                <span>Schedule Daily Study Session</span>
              </h3>
              <button
                onClick={() => setShowAddSessionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSession} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Subject
                </label>
                <select
                  value={sessionSubject}
                  onChange={(e) => setSessionSubject(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {profile.subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="General Study">General Revision</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Session Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Recursion and Call Stack"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Start Time Slot
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7:00 PM"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Duration (Minutes)
                </label>
                <select
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={30}>30 Minutes (Quick Quiz & Review)</option>
                  <option value={45}>45 Minutes (Concept Deep Dive)</option>
                  <option value={60}>60 Minutes (Standard Study Session)</option>
                  <option value={90}>90 Minutes (Practice & Problem Set)</option>
                  <option value={120}>120 Minutes (Timed Exam Mock)</option>
                </select>
              </div>

              {/* Tasks Checklist Inputs */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Action Checklist Tasks:
                </label>
                <div className="space-y-2 mb-2">
                  {sessionTasks.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800"
                    >
                      <span className="text-slate-300">• {t}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSessionTasks(sessionTasks.filter((_, i) => i !== idx))
                        }
                        className="text-slate-500 hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Add a specific task..."
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTaskInput.trim()) {
                        setSessionTasks([...sessionTasks, newTaskInput.trim()]);
                        setNewTaskInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
                  >
                    Add Task
                  </button>
                </div>
              </div>

              {/* Checkbox for WhatsApp notification */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="sessionRemCheck"
                  checked={setReminderForSession}
                  onChange={(e) => setSetReminderForSession(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="sessionRemCheck" className="text-xs text-slate-300">
                  Send automated WhatsApp reminder at session start time
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddSessionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: ADD UPCOMING EXAM */}
      {/* ==================================================== */}
      {showAddExamModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <span>Add Upcoming Exam</span>
              </h3>
              <button
                onClick={() => setShowAddExamModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExam} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Subject
                </label>
                <select
                  value={examSubject}
                  onChange={(e) => setExamSubject(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {profile.subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="General Science">General Science</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End Semester Theory Examination"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Exam Date
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="examRemCheck"
                    checked={createExamReminder}
                    onChange={(e) => setCreateExamReminder(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="examRemCheck" className="text-xs text-white font-medium">
                    Auto-configure WhatsApp Exam Countdown Alert
                  </label>
                </div>

                {createExamReminder && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Daily Alert Dispatch Time:
                    </label>
                    <input
                      type="text"
                      value={examReminderTime}
                      onChange={(e) => setExamReminderTime(e.target.value)}
                      placeholder="e.g. 08:00 AM"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddExamModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition"
                >
                  Save Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: ADD CUSTOM REMINDER */}
      {/* ==================================================== */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Create WhatsApp Reminder</span>
              </h3>
              <button
                onClick={() => setShowAddReminderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reminder Message / Task
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Practice 3 dynamic programming problems"
                  value={customReminderText}
                  onChange={(e) => setCustomReminderText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Subject
                  </label>
                  <select
                    value={customReminderSubject}
                    onChange={(e) => setCustomReminderSubject(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {profile.subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7:00 PM"
                    value={customReminderTime}
                    onChange={(e) => setCustomReminderTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Frequency
                </label>
                <select
                  value={customReminderFrequency}
                  onChange={(e: any) => setCustomReminderFrequency(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="daily">Daily Repeat 🔄</option>
                  <option value="once">One-time Notification 📌</option>
                  <option value="weekly">Weekly Check-in 📅</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
