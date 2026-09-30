import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Target,
  Sparkles,
  BookOpen,
  Trash2,
  Send,
  Flame,
  Check,
  RotateCcw,
  Edit2,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { StudentProfile, StudyPlan, StudyPlanItem } from '../types/index.ts';

interface WeeklyStudyCalendarProps {
  profile: StudentProfile;
  studyPlan: StudyPlan | null;
  onPlanUpdate: (updatedPlan: StudyPlan) => void;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
}

interface PoolTask {
  id: string;
  title: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  type: 'exam_prep' | 'weak_topic' | 'custom';
  examTitle?: string;
}

export const WeeklyStudyCalendar: React.FC<WeeklyStudyCalendarProps> = ({
  profile,
  studyPlan,
  onPlanUpdate,
  onProfileUpdate,
  onNavigateToChat,
}) => {
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedItemTitle, setDraggedItemTitle] = useState<string | null>(null);

  // Quick edit state for preferred study time & daily hours
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [tempPreferredTime, setTempPreferredTime] = useState(profile.preferredStudyTime || '7:00 PM');
  const [tempHours, setTempHours] = useState(profile.studyHoursPerDay || 2);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Custom task form
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [customTaskSubject, setCustomTaskSubject] = useState(profile.subjects[0] || 'Python');
  const [customTaskDuration, setCustomTaskDuration] = useState(60);
  const [poolFilter, setPoolFilter] = useState<'all' | 'exam' | 'weak' | 'custom'>('all');

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compute the 7 days of the selected week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMonday = (currentDay + 6) % 7;

    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNumber = d.getDate();
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      return {
        date: d,
        dateStr,
        dayName,
        fullDayName,
        monthShort,
        dayNumber,
        isToday,
      };
    });
  }, [weekOffset]);

  // Format week range label (e.g., "Sep 28 – Oct 4, 2026")
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length === 0) return '';
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.monthShort} ${start.dayNumber} – ${end.monthShort} ${end.dayNumber}, ${end.date.getFullYear()}`;
  }, [weekDays]);

  // Map exam dates from profile to dates
  const examsByDate = useMemo(() => {
    const map = new Map<string, Array<{ subject: string; date: string; title: string; daysRemaining: number }>>();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    (profile.examDates || []).forEach((exam) => {
      const examDate = new Date(exam.date);
      examDate.setHours(0, 0, 0, 0);
      const diffMs = examDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const list = map.get(exam.date) || [];
      list.push({ ...exam, daysRemaining });
      map.set(exam.date, list);
    });

    return map;
  }, [profile.examDates]);

  // Find nearest upcoming exam
  const nearestExam = useMemo(() => {
    const sorted = [...(profile.examDates || [])]
      .map((e) => {
        const d = new Date(e.date);
        d.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return { ...e, daysRemaining: days };
      })
      .filter((e) => e.daysRemaining >= 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return sorted[0] || null;
  }, [profile.examDates]);

  // Dynamic Pool of Study Tasks: Auto-generated from examDates, weakTopics, and user additions
  const taskPool: PoolTask[] = useMemo(() => {
    const list: PoolTask[] = [];

    // 1. Exam preparation tasks mapped from profile.examDates
    (profile.examDates || []).forEach((exam) => {
      list.push({
        id: `exam_prep_rev_${exam.subject}_${exam.date}`,
        title: `${exam.subject} Comprehensive Exam Review`,
        subject: exam.subject,
        topic: `${exam.title} High-Yield Concepts`,
        durationMinutes: 60,
        type: 'exam_prep',
        examTitle: exam.title,
      });
      list.push({
        id: `exam_prep_practice_${exam.subject}_${exam.date}`,
        title: `${exam.subject} Timed Challenge Problems`,
        subject: exam.subject,
        topic: `Exam Drill: ${exam.title}`,
        durationMinutes: 45,
        type: 'exam_prep',
        examTitle: exam.title,
      });
    });

    // 2. Weak topics reinforcement tasks from profile.weakTopics
    (profile.weakTopics || []).forEach((weakTopic, idx) => {
      // Find matching subject
      const matchingSub = profile.subjects.find((s) =>
        weakTopic.toLowerCase().includes(s.toLowerCase())
      ) || profile.subjects[0] || 'Curriculum';

      list.push({
        id: `weak_topic_${idx}_${weakTopic.replace(/\s+/g, '_')}`,
        title: `Remediate Weak Topic: ${weakTopic}`,
        subject: matchingSub,
        topic: weakTopic,
        durationMinutes: 45,
        type: 'weak_topic',
      });
    });

    // 3. Core subjects practice tasks
    profile.subjects.forEach((sub) => {
      list.push({
        id: `core_practice_${sub}`,
        title: `${sub} Daily Problem Solving Session`,
        subject: sub,
        topic: `${sub} Core Competencies`,
        durationMinutes: 30,
        type: 'custom',
      });
    });

    return list;
  }, [profile.examDates, profile.weakTopics, profile.subjects]);

  const filteredTaskPool = useMemo(() => {
    if (poolFilter === 'all') return taskPool;
    if (poolFilter === 'exam') return taskPool.filter((t) => t.type === 'exam_prep');
    if (poolFilter === 'weak') return taskPool.filter((t) => t.type === 'weak_topic');
    return taskPool.filter((t) => t.type === 'custom');
  }, [taskPool, poolFilter]);

  // Group studyPlan items by dateStr
  const scheduledItemsByDate = useMemo(() => {
    const map = new Map<string, StudyPlanItem[]>();
    (studyPlan?.items || []).forEach((item) => {
      const current = map.get(item.dateStr) || [];
      current.push(item);
      map.set(item.dateStr, current);
    });
    return map;
  }, [studyPlan?.items]);

  // Save updated study preferences to profile & backend
  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredStudyTime: tempPreferredTime,
          studyHoursPerDay: Number(tempHours),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);
        setIsEditingPreferences(false);
        showToast('Preferred study schedule successfully updated!');
      }
    } catch (err) {
      console.error('Failed to update study preferences:', err);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Add custom task to pool and schedule it
  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskTitle.trim()) return;

    // Pick current highlighted day or today
    const targetDate = weekDays.find((d) => d.isToday)?.dateStr || weekDays[0].dateStr;
    const newItem: Partial<StudyPlanItem> = {
      id: `plan_item_${Date.now()}`,
      dayNumber: (studyPlan?.items.length || 0) + 1,
      dateStr: targetDate,
      title: customTaskTitle.trim(),
      topic: customTaskTitle.trim(),
      subject: customTaskSubject,
      durationMinutes: Number(customTaskDuration),
      tasks: [
        { task: `Review ${customTaskTitle.trim()}`, completed: false },
        { task: `Solve practice questions for ${customTaskSubject}`, completed: false },
      ],
      isCompleted: false,
      isMissed: false,
      timeSlot: profile.preferredStudyTime || '7:00 PM',
    };

    try {
      const res = await fetch(`/api/study-plan/${profile.userId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        const data = await res.json();
        onPlanUpdate(data.studyPlan);
        setCustomTaskTitle('');
        showToast(`Scheduled "${newItem.title}" for ${targetDate}!`);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // DRAG AND DROP HANDLERS
  const handleDragStartFromPool = (e: React.DragEvent, task: PoolTask) => {
    setIsDragging(true);
    setDraggedItemTitle(task.title);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        source: 'pool',
        task,
      })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragStartFromCalendar = (e: React.DragEvent, item: StudyPlanItem) => {
    setIsDragging(true);
    setDraggedItemTitle(item.title);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        source: 'calendar',
        itemId: item.id,
        currentDateStr: item.dateStr,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverDate(null);
    setDraggedItemTitle(null);
  };

  const handleDropOnDate = async (targetDateStr: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDate(null);
    setIsDragging(false);
    setDraggedItemTitle(null);

    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    try {
      const payload = JSON.parse(rawData);

      // Case A: Dragged from the Study Tasks Pool onto the calendar
      if (payload.source === 'pool') {
        const task: PoolTask = payload.task;
        const newItem: Partial<StudyPlanItem> = {
          id: `plan_item_${Date.now()}`,
          dayNumber: (studyPlan?.items.length || 0) + 1,
          dateStr: targetDateStr,
          title: task.title,
          topic: task.topic,
          subject: task.subject,
          durationMinutes: task.durationMinutes,
          tasks: [
            { task: `Study key concepts for ${task.topic}`, completed: false },
            { task: `Solve 3 challenge problems (${task.subject})`, completed: false },
            { task: `Clarify doubts with WhatsApp AI Tutor`, completed: false },
          ],
          isCompleted: false,
          isMissed: false,
          timeSlot: profile.preferredStudyTime || '7:00 PM',
        };

        const res = await fetch(`/api/study-plan/${profile.userId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem),
        });

        if (res.ok) {
          const data = await res.json();
          onPlanUpdate(data.studyPlan);
          showToast(`Scheduled "${task.title}" for ${targetDateStr} at ${profile.preferredStudyTime || '7:00 PM'}!`);
        }
      }

      // Case B: Rescheduling an existing calendar item to another day
      if (payload.source === 'calendar') {
        const { itemId, currentDateStr } = payload;
        if (currentDateStr === targetDateStr) return; // No change

        const res = await fetch(`/api/study-plan/${profile.userId}/items/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dateStr: targetDateStr,
            timeSlot: profile.preferredStudyTime || '7:00 PM',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          onPlanUpdate(data.studyPlan);
          showToast(`Rescheduled study session to ${targetDateStr}!`);
        }
      }
    } catch (err) {
      console.error('Error handling drop on day:', err);
    }
  };

  // Toggle study session completed
  const handleToggleCompleted = async (item: StudyPlanItem) => {
    const newStatus = !item.isCompleted;
    try {
      const res = await fetch(`/api/study-plan/${profile.userId}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        onPlanUpdate(data.studyPlan);
        showToast(newStatus ? `🎉 Session "${item.title}" completed!` : `Session reopened.`);
      }
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  // Delete a study session
  const handleDeleteSession = async (itemId: string, title: string) => {
    try {
      const res = await fetch(`/api/study-plan/${profile.userId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        onPlanUpdate(data.studyPlan);
        showToast(`Removed "${title}" from study plan.`);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const getSubjectColor = (subject: string) => {
    const s = subject.toLowerCase();
    if (s.includes('python')) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    if (s.includes('calculus') || s.includes('math')) return 'bg-violet-500/10 text-violet-300 border-violet-500/30';
    if (s.includes('dsa') || s.includes('algo')) return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
    if (s.includes('machine') || s.includes('ai')) return 'bg-pink-500/10 text-pink-300 border-pink-500/30';
    return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Toast alert banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Profile Schedule Integration Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Interactive Weekly Drag & Drop Study Planner</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Study Calendar for {profile.name}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Drag study tasks from your tasks pool onto any day of the week. Exam countdowns and your preferred study time are synchronized live with your profile.
            </p>
          </div>

          {/* Profile Study Metrics Chips & Preferences Quick Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Preferred Study Time from Profile */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-2.5">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>Preferred Study Time</span>
              </div>
              <div className="text-sm font-bold text-indigo-300 mt-0.5">
                {profile.preferredStudyTime || '7:00 PM'}
              </div>
            </div>

            {/* Daily Hours Target */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-2.5">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>Daily Target</span>
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {profile.studyHoursPerDay} hrs / day
              </div>
            </div>

            {/* Nearest Exam Countdown */}
            {nearestExam && (
              <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl px-4 py-2.5">
                <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Target className="w-3 h-3 text-amber-400" />
                  <span>Nearest Exam</span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5 flex items-center space-x-1.5">
                  <span>{nearestExam.subject}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {nearestExam.daysRemaining === 0 ? 'Today!' : `${nearestExam.daysRemaining}d`}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsEditingPreferences(!isEditingPreferences)}
              className="flex items-center space-x-1 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-2xl text-slate-200 border border-slate-700 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isEditingPreferences ? 'Close' : 'Edit Time'}</span>
            </button>
          </div>
        </div>

        {/* Quick Edit Profile Time Drawer */}
        {isEditingPreferences && (
          <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end bg-slate-950/70 p-4 rounded-2xl animate-fade-in">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Preferred Study Time (WhatsApp Alert)
              </label>
              <input
                type="text"
                value={tempPreferredTime}
                onChange={(e) => setTempPreferredTime(e.target.value)}
                placeholder="e.g. 7:30 PM"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
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
                value={tempHours}
                onChange={(e) => setTempHours(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSavePreferences}
                disabled={isSavingPreferences}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {isSavingPreferences ? 'Saving...' : 'Save Preferences'}
              </button>
              <button
                onClick={() => setIsEditingPreferences(false)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Drag-and-Drop Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* LEFT COLUMN: Study Tasks & Topics Pool (Draggable Cards) */}
        <div className="xl:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Study Tasks Pool
              </h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {filteredTaskPool.length} available
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Drag any task card onto a calendar day to schedule it for that date.
          </p>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'exam', label: 'Exams' },
              { id: 'weak', label: 'Weak Topics' },
              { id: 'custom', label: 'Core' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setPoolFilter(cat.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                  poolFilter === cat.id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Draggable Task Cards List */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredTaskPool.map((task) => (
              <div
                key={task.id}
                draggable={true}
                onDragStart={(e) => handleDragStartFromPool(e, task)}
                onDragEnd={handleDragEnd}
                className="group p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/60 transition-all cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-indigo-500/5 select-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 shrink-0" />
                    <span className="text-xs font-bold text-white group-hover:text-indigo-200 transition truncate">
                      {task.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full border font-semibold ${getSubjectColor(task.subject)}`}>
                    {task.subject}
                  </span>
                  <div className="flex items-center space-x-1 text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{task.durationMinutes}m</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Custom Task Creator */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center space-x-1">
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quick Create & Add Task</span>
            </div>

            <form onSubmit={handleCreateCustomTask} className="space-y-2">
              <input
                type="text"
                placeholder="e.g. Master Calculus Taylor Series"
                value={customTaskTitle}
                onChange={(e) => setCustomTaskTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={customTaskSubject}
                  onChange={(e) => setCustomTaskSubject(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {profile.subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>

                <select
                  value={customTaskDuration}
                  onChange={(e) => setCustomTaskDuration(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={30}>30 mins</option>
                  <option value={45}>45 mins</option>
                  <option value={60}>60 mins</option>
                  <option value={90}>90 mins</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!customTaskTitle.trim()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
              >
                + Schedule into Calendar
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive 7-Day Weekly Calendar Grid */}
        <div className="xl:col-span-3 space-y-4">
          {/* Calendar Week Navigation Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  Current Week
                </button>
                <button
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Next Week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {weekRangeLabel}
              </h3>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>Exam Target</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                <span>Preferred Slot ({profile.preferredStudyTime || '7:00 PM'})</span>
              </span>
            </div>
          </div>

          {/* 7-Day Dropzone Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const scheduledItems = scheduledItemsByDate.get(day.dateStr) || [];
              const dayExams = examsByDate.get(day.dateStr) || [];
              const isOver = dragOverDate === day.dateStr;

              return (
                <div
                  key={day.dateStr}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDate(day.dateStr);
                  }}
                  onDragLeave={() => {
                    if (dragOverDate === day.dateStr) setDragOverDate(null);
                  }}
                  onDrop={(e) => handleDropOnDate(day.dateStr, e)}
                  className={`rounded-2xl border transition-all flex flex-col min-h-[480px] p-3 ${
                    day.isToday
                      ? 'bg-slate-900/90 border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5'
                      : 'bg-slate-900/60 border-slate-800'
                  } ${
                    isOver
                      ? 'border-indigo-400 bg-indigo-950/30 scale-[1.01] ring-2 ring-indigo-500/50'
                      : ''
                  }`}
                >
                  {/* Day Column Header */}
                  <div className="pb-2.5 mb-2 border-b border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {day.dayName}
                      </span>
                      {day.isToday && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-white mt-0.5">
                      {day.dayNumber} <span className="text-xs font-normal text-slate-400">{day.monthShort}</span>
                    </div>

                    {/* Preferred Daily Study Time Indicator */}
                    <div className="mt-1 flex items-center space-x-1 text-[10px] text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-500/20">
                      <Clock className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{profile.preferredStudyTime || '7:00 PM'}</span>
                    </div>
                  </div>

                  {/* Exam Milestone Alert Marker (Mapped from profile.examDates) */}
                  {dayExams.map((exam, i) => (
                    <div
                      key={i}
                      className="mb-2 p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-200 shadow-sm"
                    >
                      <div className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        <Target className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Exam Milestone</span>
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5 leading-tight">
                        {exam.subject}
                      </div>
                      <div className="text-[10px] text-slate-300 truncate mt-0.5">
                        {exam.title}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[9px]">
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 font-semibold">
                          {exam.daysRemaining === 0 ? 'Today!' : `in ${exam.daysRemaining}d`}
                        </span>
                        <button
                          onClick={() => onNavigateToChat(`/quiz ${exam.subject}`)}
                          className="text-amber-300 hover:text-white font-medium underline"
                        >
                          Prep Quiz
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Scheduled Tasks List inside the Day */}
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {scheduledItems.map((item) => (
                      <div
                        key={item.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStartFromCalendar(e, item)}
                        onDragEnd={handleDragEnd}
                        className={`p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing group select-none ${
                          item.isCompleted
                            ? 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                            : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <button
                            onClick={() => handleToggleCompleted(item)}
                            className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-400 cursor-pointer"
                          >
                            {item.isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Circle className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <h5
                              className={`text-[11px] font-bold leading-snug truncate ${
                                item.isCompleted ? 'line-through text-slate-500' : 'text-white'
                              }`}
                            >
                              {item.title}
                            </h5>

                            <div className="flex items-center space-x-1 mt-1 text-[9px]">
                              <span className={`px-1.5 py-0.2 rounded-full border font-semibold ${getSubjectColor(item.subject)}`}>
                                {item.subject}
                              </span>
                              <span className="text-slate-400">
                                {item.durationMinutes}m
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteSession(item.id, item.title)}
                            className="text-slate-600 hover:text-rose-400 p-0.5 transition cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Remove session"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* WhatsApp Practice trigger */}
                        <div className="mt-2 pt-1.5 border-t border-slate-900/80 flex items-center justify-between text-[9px]">
                          <span className="text-indigo-400 font-mono">
                            {item.timeSlot || profile.preferredStudyTime}
                          </span>
                          <button
                            onClick={() => onNavigateToChat(`I am ready to study "${item.title}" for ${item.subject}.`)}
                            className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-0.5 cursor-pointer"
                          >
                            <span>WhatsApp</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Empty Day Dropzone State */}
                    {scheduledItems.length === 0 && dayExams.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center p-3 text-center rounded-xl border border-dashed border-slate-800 text-slate-600">
                        <CalendarIcon className="w-4 h-4 mb-1 text-slate-700" />
                        <span className="text-[10px]">No tasks</span>
                        <span className="text-[9px] text-slate-700 mt-0.5">Drag to add</span>
                      </div>
                    )}

                    {/* Active Drag-Over Cue */}
                    {isOver && (
                      <div className="p-3 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-950/50 text-indigo-300 text-center text-[10px] font-bold animate-pulse">
                        + Drop here for {day.dayName} ({profile.preferredStudyTime || '7:00 PM'})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
