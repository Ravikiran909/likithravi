import React, { useState, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  RefreshCw,
  Building2,
  Download,
  ArrowRight,
  Trash2,
  SlidersHorizontal,
  Check,
  X,
  Briefcase,
} from 'lucide-react';
import { StudentProfile, StudyPlanItem } from '../types/index.ts';
import {
  db,
  doc,
  setDoc,
} from '../firebase.ts';

interface StudySessionPlannerProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

export interface PlannedCalendarBlock {
  id: string;
  moduleCategory: 'Professional Skills' | 'Government Exams';
  title: string;
  topic: string;
  subModuleCode: string;
  dateStr: string;
  startTime: string; // e.g. "07:00 AM" or "07:00 PM"
  durationMinutes: number;
  isCompleted: boolean;
  calendarSynced: boolean;
  tasks: string[];
}

const PROFESSIONAL_SKILLS_MODULES_CATALOG = [
  {
    code: 'SKILL-M1',
    title: 'Time Management & Productivity Systems',
    topic: 'Pomodoro, Time Blocking & Eisenhower Matrix',
    durationMinutes: 60,
    tasks: [
      'Master the Eisenhower Matrix for task prioritization',
      'Set up a daily time-blocking schedule',
      'Learn about deep work vs shallow work',
    ],
  },
  {
    code: 'SKILL-M2',
    title: 'Effective Business Writing & Email Etiquette',
    topic: 'Professional Correspondence & Report Drafting',
    durationMinutes: 60,
    tasks: [
      'Draft a formal leave application for a senior officer',
      'Learn the structure of a government meeting minute',
      'Practice concise summary writing for long reports',
    ],
  },
  {
    code: 'SKILL-M3',
    title: 'Emotional Intelligence & Stress Management',
    topic: 'Resilience, Self-Regulation & Conflict Resolution',
    durationMinutes: 60,
    tasks: [
      'Understand the 5 pillars of Emotional Intelligence',
      'Practice box breathing for immediate stress relief',
      'Draft a conflict resolution plan for a team setting',
    ],
  },
  {
    code: 'SKILL-M4',
    title: 'Leadership & Public Administration Ethics',
    topic: 'Constitutional Morality & Integrity in Governance',
    durationMinutes: 75,
    tasks: [
      'Read landmark cases on ethical governance',
      'Draft a personal code of conduct for public service',
      'Analyze the importance of integrity in administration',
    ],
  },
  {
    code: 'SKILL-M5',
    title: 'Digital Literacy & Secure Communication',
    topic: 'Cybersecurity, Document Encryption & Privacy',
    durationMinutes: 60,
    tasks: [
      'Set up end-to-end encrypted messaging for study groups',
      'Learn the basics of document digital signatures',
      'Practice spotting phishing and social engineering attempts',
    ],
  },
];

const GOV_EXAMS_MODULES_CATALOG = [
  {
    code: 'GOV-M1',
    title: 'UPSC CSE & State PCS: Indian Polity, Fundamental Rights & Governance',
    topic: 'Articles 12–35, Constitutional Remedies, Parliament & Basic Structure',
    durationMinutes: 60,
    tasks: [
      'Revise Fundamental Rights (Articles 14–32) & Writs of Supreme Court',
      'Compare Parliamentary vs Presidential committee oversight',
      'Solve 15 UPSC Prelims statement-based Polity MCQs',
    ],
  },
  {
    code: 'GOV-M2',
    title: 'SSC CGL Tier-I & II: Quantitative Aptitude & Percentage-Ratio Shortcuts',
    topic: 'Successive Percentage Change, Profit/Loss, Time & Work LCM Method & Geometry',
    durationMinutes: 60,
    tasks: [
      'Drill fraction-to-percentage table (1/6 to 1/16) & A + B + AB/100 formula',
      'Solve 12 Time & Work efficiency problems using Total Work LCM method',
      'Practice Circle Secant-Tangent & Triangle Similarity theorems',
    ],
  },
  {
    code: 'GOV-M3',
    title: 'IBPS PO, SBI PO & RBI Grade B: Data Interpretation & Seating Puzzles',
    topic: 'Circular/Linear Arrangement, Syllogisms (Venn) & Monetary Policy Repo/CRR',
    durationMinutes: 60,
    tasks: [
      'Solve 2 timed 8-person Circular Seating Arrangement puzzles (inward/outward)',
      'Practice 10 Only-a-few Syllogism & Coded Inequality questions',
      'Review RBI Monetary Policy Committee (Repo, Reverse Repo, SDF, CRR, SLR)',
    ],
  },
  {
    code: 'GOV-M4',
    title: 'UPSC CSE: Ethics, Integrity & Aptitude',
    topic: 'Case Studies, Emotional Intelligence & Foundational Values for Civil Service',
    durationMinutes: 75,
    tasks: [
      'Analyze 2 previous year Ethics case studies (Probity in Governance)',
      'Review foundational values: Integrity, Impartiality & Objectivity',
      'Draft a response on "Conflicts of Interest" in public administration',
    ],
  },
  {
    code: 'GOV-M5',
    title: 'UPSC & SSC General Studies: Modern Indian History & Economic Survey',
    topic: 'Freedom Struggle Chronology (1885–1947), Fiscal Deficit, GDP & Inflation',
    durationMinutes: 60,
    tasks: [
      'Map chronology from Swadeshi (1905) to Quit India Movement (1942)',
      'Distinguish Nominal vs Real GDP, Fiscal vs Primary Deficit, and CPI/WPI',
      'Attempt 10 combined GS rapid-fire revision questions',
    ],
  },
];

function buildCalendarStartEndIso(
  dateStr: string,
  timeStr: string,
  durationMinutes: number
): { startIso: string; endIso: string; timeZone: string } {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  let hours = 19;
  let minutes = 0;

  const cleanTime = (timeStr || '07:00 PM').trim();
  const match12 = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const match24 = cleanTime.match(/^(\d{1,2}):(\d{2})$/);

  if (match12) {
    hours = parseInt(match12[1], 10);
    minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else if (match24) {
    hours = parseInt(match24[1], 10);
    minutes = parseInt(match24[2], 10);
  }

  const [year, month, day] = dateStr.split('-').map((n) => parseInt(n, 10));
  const startDate = new Date(year, (month || 1) - 1, day || 1, hours, minutes, 0);
  const endDate = new Date(startDate.getTime() + (durationMinutes || 60) * 60 * 1000);

  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
    timeZone,
  };
}

function buildDefaultAutoSchedule(preferredEveningTime: string): PlannedCalendarBlock[] {
  const now = new Date();
  const blocks: PlannedCalendarBlock[] = [];

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const targetDate = new Date(now.getTime() + dayOffset * 86400000);
    const dateStr = targetDate.toISOString().split('T')[0];

    const govMod = GOV_EXAMS_MODULES_CATALOG[dayOffset % GOV_EXAMS_MODULES_CATALOG.length];
    const skillMod = PROFESSIONAL_SKILLS_MODULES_CATALOG[dayOffset % PROFESSIONAL_SKILLS_MODULES_CATALOG.length];

    // Morning Calendar Block: Government Exams Preparation
    blocks.push({
      id: `cal_block_gov_${dateStr}_${dayOffset}`,
      moduleCategory: 'Government Exams',
      title: govMod.title,
      topic: govMod.topic,
      subModuleCode: govMod.code,
      dateStr,
      startTime: '07:30 AM',
      durationMinutes: govMod.durationMinutes,
      isCompleted: false,
      calendarSynced: dayOffset < 2,
      tasks: govMod.tasks,
    });

    // Evening Calendar Block: Professional Skills Module
    blocks.push({
      id: `cal_block_skill_${dateStr}_${dayOffset}`,
      moduleCategory: 'Professional Skills',
      title: skillMod.title,
      topic: skillMod.topic,
      subModuleCode: skillMod.code,
      dateStr,
      startTime: preferredEveningTime || '07:00 PM',
      durationMinutes: skillMod.durationMinutes,
      isCompleted: false,
      calendarSynced: dayOffset < 2,
      tasks: skillMod.tasks,
    });
  }

  return blocks;
}

export const StudySessionPlanner: React.FC<StudySessionPlannerProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  onLogStudyMinutes,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Auto-scheduler configuration
  const [govExamSlotTime, setGovExamSlotTime] = useState<string>('07:30 AM');
  const [skillSlotTime, setSkillSlotTime] = useState<string>(profile.preferredStudyTime || '07:00 PM');
  const [blockDurationMins, setBlockDurationMins] = useState<number>(60);
  const [daysToAutoBlock, setDaysToAutoBlock] = useState<number>(5);
  const [filterModule, setFilterModule] = useState<'all' | 'Professional Skills' | 'Government Exams'>('all');
  const [showSchedulerSettings, setShowSchedulerSettings] = useState<boolean>(false);
  const [showAddCustomBlockModal, setShowAddCustomBlockModal] = useState<boolean>(false);

  // Custom block form state
  const [customCategory, setCustomCategory] = useState<'Professional Skills' | 'Government Exams'>('Professional Skills');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [customTime, setCustomTime] = useState<string>(profile.preferredStudyTime || '07:00 PM');
  const [customDuration, setCustomDuration] = useState<number>(60);

  // Planned Calendar Blocks state
  const [plannedBlocks, setPlannedBlocks] = useState<PlannedCalendarBlock[]>(() => {
    try {
      const saved = localStorage.getItem(`study_session_planner_blocks_${profile.userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return buildDefaultAutoSchedule(profile.preferredStudyTime || '07:00 PM');
  });

  const [isSyncingCalendar, setIsSyncingCalendar] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'info';
    text: string;
  } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' = 'success') => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner(null);
    }, 5000);
  };

  const saveBlocksToStorageAndFirestore = useCallback(
    async (nextBlocks: PlannedCalendarBlock[]) => {
      setPlannedBlocks(nextBlocks);
      try {
        localStorage.setItem(
          `study_session_planner_blocks_${profile.userId}`,
          JSON.stringify(nextBlocks)
        );
      } catch {}

      if (db && profile.userId) {
        try {
          await setDoc(
            doc(db, 'profiles', profile.userId),
            {
              scheduledStudyBlocks: nextBlocks.slice(0, 20),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {}
      }
    },
    [profile.userId]
  );

  const handleAutoScheduleModules = async () => {
    setIsSyncingCalendar(true);
    const now = new Date();
    const generated: PlannedCalendarBlock[] = [];

    for (let i = 0; i < daysToAutoBlock; i++) {
      const dateObj = new Date(now.getTime() + i * 86400000);
      const dateStr = dateObj.toISOString().split('T')[0];

      const govModule = GOV_EXAMS_MODULES_CATALOG[i % GOV_EXAMS_MODULES_CATALOG.length];
      const skillModule = PROFESSIONAL_SKILLS_MODULES_CATALOG[i % PROFESSIONAL_SKILLS_MODULES_CATALOG.length];

      const govBlock: PlannedCalendarBlock = {
        id: `auto_gov_${dateStr}_${Date.now()}_${i}`,
        moduleCategory: 'Government Exams',
        title: govModule.title,
        topic: govModule.topic,
        subModuleCode: govModule.code,
        dateStr,
        startTime: govExamSlotTime,
        durationMinutes: blockDurationMins,
        isCompleted: false,
        calendarSynced: false,
        tasks: govModule.tasks,
      };

      const skillBlock: PlannedCalendarBlock = {
        id: `auto_skill_${dateStr}_${Date.now()}_${i}`,
        moduleCategory: 'Professional Skills',
        title: skillModule.title,
        topic: skillModule.topic,
        subModuleCode: skillModule.code,
        dateStr,
        startTime: skillSlotTime,
        durationMinutes: blockDurationMins,
        isCompleted: false,
        calendarSynced: false,
        tasks: skillModule.tasks,
      };

      generated.push(govBlock, skillBlock);
    }

    // Sync first 4 blocks to the backend StudyPlan API
    for (const block of generated.slice(0, 4)) {
      const studyPlanItem: Partial<StudyPlanItem> = {
        id: block.id,
        dayNumber: 1,
        dateStr: block.dateStr,
        title: `[${block.subModuleCode}] ${block.title}`,
        topic: block.topic,
        subject: block.moduleCategory,
        durationMinutes: block.durationMinutes,
        timeSlot: block.startTime,
        tasks: block.tasks.map((t) => ({ task: t, completed: false })),
        isCompleted: false,
        isMissed: false,
      };
      await fetch(`/api/study-plan/${profile.userId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studyPlanItem),
      }).catch(() => {});
    }

    await saveBlocksToStorageAndFirestore(generated);
    setIsSyncingCalendar(false);

    showFeedback(
      `Automatically scheduled ${generated.length} sessions (${daysToAutoBlock} days) for Government Exams (${govExamSlotTime}) and Professional Skills (${skillSlotTime})!`
    );
  };

  const handleDownloadIcsCalendar = () => {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AI Study Companion//Professional Skills and Government Exams Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    plannedBlocks.forEach((b) => {
      const { startIso, endIso } = buildCalendarStartEndIso(
        b.dateStr,
        b.startTime,
        b.durationMinutes
      );
      const dtStart = startIso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const dtEnd = endIso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const cleanDesc = `Module: ${b.subModuleCode} - ${b.topic} | Tasks: ${b.tasks.join('; ')}`.replace(
        /\n/g,
        ' '
      );

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${b.id}@studycompanion.app`);
      lines.push(`DTSTAMP:${dtStart}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:[${b.moduleCategory}] ${b.title}`);
      lines.push(`DESCRIPTION:${cleanDesc}`);
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gov_exams_skills_schedule_${todayStr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showFeedback(
      `Exported ${plannedBlocks.length} Government Exams & Professional Skills time blocks to .ics calendar file!`
    );
  };

  const handleToggleBlockCompleted = async (block: PlannedCalendarBlock) => {
    const nextCompleted = !block.isCompleted;
    const nextBlocks = plannedBlocks.map((b) =>
      b.id === block.id ? { ...b, isCompleted: nextCompleted } : b
    );
    await saveBlocksToStorageAndFirestore(nextBlocks);

    if (nextCompleted) {
      if (onLogStudyMinutes) {
        onLogStudyMinutes(
          block.durationMinutes,
          `[${block.moduleCategory}] ${block.subModuleCode}: ${block.title}`
        );
      }

      const newDailyMins = (profile.dailyStudyMinutesCompleted || 0) + block.durationMinutes;
      const addedHours = Number((block.durationMinutes / 60).toFixed(2));
      const newWeeklyHours = Number(((profile.weeklyHoursCompleted || 0) + addedHours).toFixed(2));
      const updatedProfile: StudentProfile = {
        ...profile,
        dailyStudyMinutesCompleted: newDailyMins,
        weeklyHoursCompleted: newWeeklyHours,
        totalSessions: (profile.totalSessions || 0) + 1,
        overallProgress: Math.min(100, (profile.overallProgress || 0) + 1),
      };
      onProfileUpdate(updatedProfile);
      showFeedback(
        `Completed "${block.title}"! Credited +${block.durationMinutes} mins to your daily & weekly study progress.`
      );
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    const nextBlocks = plannedBlocks.filter((b) => b.id !== blockId);
    await saveBlocksToStorageAndFirestore(nextBlocks);
  };

  const handleCreateCustomBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newBlock: PlannedCalendarBlock = {
      id: `custom_block_${Date.now()}`,
      moduleCategory: customCategory,
      title: customTitle.trim(),
      topic: customTopic.trim() || `${customCategory} Core Practice & Revision`,
      subModuleCode: customCategory === 'Professional Skills' ? 'SKILL-CUSTOM' : 'GOV-CUSTOM',
      dateStr: customDate,
      startTime: customTime,
      durationMinutes: Number(customDuration) || 60,
      isCompleted: false,
      calendarSynced: false,
      tasks: [
        `Complete ${customDuration}m focused study on ${customTitle.trim()}`,
        'Review key formulas/templates & solve 5 practice questions',
      ],
    };

    const next = [newBlock, ...plannedBlocks].sort((a, b) =>
      `${a.dateStr}_${a.startTime}`.localeCompare(`${b.dateStr}_${b.startTime}`)
    );
    await saveBlocksToStorageAndFirestore(next);
    setShowAddCustomBlockModal(false);
    setCustomTitle('');
    setCustomTopic('');
    showFeedback(
      `Scheduled [${newBlock.moduleCategory}] "${newBlock.title}" on ${newBlock.dateStr} at ${newBlock.startTime}!`
    );
  };

  const filteredBlocks = useMemo(() => {
    return plannedBlocks
      .filter((b) => (filterModule === 'all' ? true : b.moduleCategory === filterModule))
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [plannedBlocks, filterModule]);

  const skillBlocksCount = plannedBlocks.filter((b) => b.moduleCategory === 'Professional Skills').length;
  const govBlocksCount = plannedBlocks.filter((b) => b.moduleCategory === 'Government Exams').length;
  const totalBlockedHours = (
    plannedBlocks.reduce((acc, b) => acc + b.durationMinutes, 0) / 60
  ).toFixed(1);
  const completedCount = plannedBlocks.filter((b) => b.isCompleted).length;

  const upcomingExamMilestones = useMemo(() => {
    return (profile.examDates || [])
      .map((exam) => {
        const diffDays = Math.ceil(
          (new Date(exam.date).getTime() - new Date(todayStr).getTime()) / 86400000
        );
        return { ...exam, diffDays };
      })
      .filter((e) => e.diffDays >= -1)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [profile.examDates, todayStr]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-400">
            <Calendar className="w-4 h-4" />
            <span>Study Session Planner</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-indigo-400">Government Exams & Professional Skills</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Automated Time-Blocking & Upcoming Event View
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl">
            Automatically schedules slots for your Government Exams and Professional Skills modules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <button
            type="button"
            onClick={handleAutoScheduleModules}
            disabled={isSyncingCalendar}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
            <span>Auto-Block Sessions</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddCustomBlockModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Block</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadIcsCalendar}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export .ICS</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSchedulerSettings(!showSchedulerSettings)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusBanner.text}</span>
          </div>
          <button type="button" onClick={() => setStatusBanner(null)} className="text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showSchedulerSettings && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Morning Slot</label>
            <input
              type="text"
              value={govExamSlotTime}
              onChange={(e) => setGovExamSlotTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Evening Slot</label>
            <input
              type="text"
              value={skillSlotTime}
              onChange={(e) => setSkillSlotTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Duration (mins)</label>
            <input
              type="number"
              value={blockDurationMins}
              onChange={(e) => setBlockDurationMins(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
          <button
            onClick={handleAutoScheduleModules}
            className="w-full py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
          >
            Apply
          </button>
        </div>
      )}

      {showAddCustomBlockModal && (
        <form
          onSubmit={handleCreateCustomBlock}
          className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">Schedule Custom Time Block</h4>
            <button type="button" onClick={() => setShowAddCustomBlockModal(false)} className="text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="Professional Skills">Professional Skills</option>
              <option value="Government Exams">Government Exams</option>
            </select>
            <input
              type="text"
              required
              placeholder="Title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Topic"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
            <input type="text" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
            <input type="number" value={customDuration} onChange={(e) => setCustomDuration(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
            <button type="submit" className="bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg">Add Block</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {['all', 'Professional Skills', 'Government Exams'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterModule(cat as any)}
                className={`px-3 py-1.5 rounded-lg text-xs transition ${
                  filterModule === cat ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredBlocks.map((block) => (
              <div key={block.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleBlockCompleted(block)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                      block.isCompleted ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'
                    }`}
                  >
                    {block.isCompleted && <Check className="w-3.5 h-3.5 text-slate-950" />}
                  </button>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500">{block.moduleCategory}</div>
                    <div className="text-sm font-bold text-white">{block.title}</div>
                    <div className="text-xs text-slate-400">{block.dateStr} at {block.startTime}</div>
                  </div>
                </div>
                <button onClick={() => handleDeleteBlock(block.id)} className="text-slate-600 hover:text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-white mb-3">Exam Countdowns</h4>
            <div className="space-y-2">
              {upcomingExamMilestones.map((exam, i) => (
                <div key={i} className="p-3 bg-slate-900 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-amber-400">{exam.subject}</div>
                    <div className="text-xs font-bold text-white">{exam.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{exam.diffDays <= 0 ? 'Today' : `${exam.diffDays}d`}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
