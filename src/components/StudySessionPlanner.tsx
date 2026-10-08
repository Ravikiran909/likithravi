import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Code2,
  Building2,
  Download,
  ArrowRight,
  Play,
  Trash2,
  SlidersHorizontal,
  Check,
  X,
} from 'lucide-react';
import { StudentProfile, StudyPlan, StudyPlanItem } from '../types/index.ts';
import {
  db,
  doc,
  setDoc,
  initAuth,
  googleSignIn,
  getAccessToken,
  FirebaseUser,
} from '../firebase.ts';

interface StudySessionPlannerProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  htmlLink?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
}

export interface PlannedCalendarBlock {
  id: string;
  moduleCategory: 'DSA' | 'Government Exams';
  title: string;
  topic: string;
  subModuleCode: string;
  dateStr: string;
  startTime: string; // e.g. "07:00 AM" or "07:00 PM"
  durationMinutes: number;
  isCompleted: boolean;
  calendarSynced: boolean;
  googleCalendarLink?: string;
  tasks: string[];
}

const DSA_MODULES_CATALOG = [
  {
    code: 'DSA-M1',
    title: 'Arrays, Prefix Sums & Sliding Window Invariants',
    topic: "Kadane's Algorithm, Fixed/Variable Sliding Window & Two Pointers",
    durationMinutes: 60,
    tasks: [
      "Derive O(n) state transition for Kadane's Maximum Subarray",
      'Solve Longest Substring Without Repeating Characters (Variable Window)',
      'Verify invariants with 3 timed DSA quiz questions',
    ],
  },
  {
    code: 'DSA-M2',
    title: 'Binary Search on Answer Space & Monotonic Stacks',
    topic: 'Lower/Upper Bound Templates, Rotated Arrays & Next Greater Element',
    durationMinutes: 60,
    tasks: [
      'Implement overflow-safe mid = low + (high - low) // 2 template',
      'Solve Aggressive Cows / Koko Eating Bananas on monotonic predicate space',
      'Trace O(n) monotonic stack for Largest Rectangle in Histogram',
    ],
  },
  {
    code: 'DSA-M3',
    title: 'Binary Trees, BST Validation & Priority Queue Heaps',
    topic: 'DFS/BFS Traversals, Lowest Common Ancestor & K-Way Merge',
    durationMinutes: 75,
    tasks: [
      'Validate BST using [minVal, maxVal] range recursion in O(n)',
      'Trace Morris Inorder Traversal in O(1) auxiliary space',
      'Implement Top-K Elements & Median of Data Stream using Two Heaps',
    ],
  },
  {
    code: 'DSA-M4',
    title: 'Graph Algorithms: BFS, Topological Sort & Dijkstra',
    topic: "Kahn's Indegree Cycle Detection, Shortest Paths & Union-Find DSU",
    durationMinutes: 75,
    tasks: [
      "Implement Kahn's BFS topological sort for Course Schedule prerequisites",
      'Dry-run Dijkstra priority queue relaxation on weighted directed graphs',
      'Code Disjoint Set Union (DSU) with path compression & union by rank',
    ],
  },
  {
    code: 'DSA-M5',
    title: 'Dynamic Programming: 0/1 Knapsack, LCS & DP on Grids',
    topic: 'Memoization vs Tabulation, Space Optimization & State Transitions',
    durationMinutes: 90,
    tasks: [
      'Formulate 0/1 Knapsack recurrence and 1D reverse-capacity space optimization',
      'Solve Longest Common Subsequence (LCS) and Edit Distance table',
      'Complete 5 GATE/Interview level DP practice problems',
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
    title: 'GATE CS/IT & PSU Scientist: OS, DBMS Normalization & Computer Networks',
    topic: 'CPU Scheduling, Deadlocks, B+ Trees, 3NF/BCNF & TCP Congestion Control',
    durationMinutes: 75,
    tasks: [
      "Solve Banker's Algorithm safe-sequence & Page Replacement (LRU/Optimal) numericals",
      'Test candidate keys for 3NF and BCNF lossless join decomposition',
      'Calculate IPv4 CIDR subnet masks & TCP slow-start congestion window',
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
    const dsaMod = DSA_MODULES_CATALOG[dayOffset % DSA_MODULES_CATALOG.length];

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

    // Evening Calendar Block: DSA Learning Module
    blocks.push({
      id: `cal_block_dsa_${dateStr}_${dayOffset}`,
      moduleCategory: 'DSA',
      title: dsaMod.title,
      topic: dsaMod.topic,
      subModuleCode: dsaMod.code,
      dateStr,
      startTime: preferredEveningTime || '07:00 PM',
      durationMinutes: dsaMod.durationMinutes,
      isCompleted: false,
      calendarSynced: dayOffset < 2,
      tasks: dsaMod.tasks,
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
  const [dsaSlotTime, setDsaSlotTime] = useState<string>(profile.preferredStudyTime || '07:00 PM');
  const [blockDurationMins, setBlockDurationMins] = useState<number>(60);
  const [daysToAutoBlock, setDaysToAutoBlock] = useState<number>(5);
  const [filterModule, setFilterModule] = useState<'all' | 'DSA' | 'Government Exams'>('all');
  const [showSchedulerSettings, setShowSchedulerSettings] = useState<boolean>(false);
  const [showAddCustomBlockModal, setShowAddCustomBlockModal] = useState<boolean>(false);

  // Custom block form state
  const [customCategory, setCustomCategory] = useState<'DSA' | 'Government Exams'>('DSA');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [customTime, setCustomTime] = useState<string>(profile.preferredStudyTime || '07:00 PM');
  const [customDuration, setCustomDuration] = useState<number>(60);

  // Planned Calendar Blocks state (persisted to localStorage + Firestore + Backend StudyPlan)
  const [plannedBlocks, setPlannedBlocks] = useState<PlannedCalendarBlock[]>(() => {
    try {
      const saved = localStorage.getItem(`study_session_planner_blocks_${profile.userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to default schedule
    }
    return buildDefaultAutoSchedule(profile.preferredStudyTime || '07:00 PM');
  });

  // Google Calendar Integration State
  const [gcalUser, setGcalUser] = useState<FirebaseUser | null>(null);
  const [needsGcalAuth, setNeedsGcalAuth] = useState<boolean>(true);
  const [isConnectingGcal, setIsConnectingGcal] = useState<boolean>(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState<boolean>(false);
  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEvent[]>([]);
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

  // Persist blocks to localStorage & Firestore whenever updated
  const saveBlocksToStorageAndFirestore = useCallback(
    async (nextBlocks: PlannedCalendarBlock[]) => {
      setPlannedBlocks(nextBlocks);
      try {
        localStorage.setItem(
          `study_session_planner_blocks_${profile.userId}`,
          JSON.stringify(nextBlocks)
        );
      } catch {
        // Ignore storage quota errors
      }

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
        } catch {
          // Non-blocking Firestore persistence
        }
      }
    },
    [profile.userId]
  );

  // Fetch live Google Calendar events if user has authenticated
  const fetchLiveGoogleCalendarEvents = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsGcalAuth(true);
      return;
    }
    try {
      const timeMin = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
          timeMin
        )}&singleEvents=true&orderBy=startTime&maxResults=15`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setGcalEvents(data.items || []);
        setNeedsGcalAuth(false);
      }
    } catch {
      // Non-blocking fallback
    }
  }, []);

  useEffect(() => {
    const unsub = initAuth(
      (user) => {
        setGcalUser(user);
        setNeedsGcalAuth(false);
        fetchLiveGoogleCalendarEvents();
      },
      () => {
        setNeedsGcalAuth(true);
      }
    );
    return () => unsub();
  }, [fetchLiveGoogleCalendarEvents]);

  // Automatically generate and block out calendar time for Government Exams & DSA modules
  const handleAutoScheduleModules = async () => {
    setIsSyncingCalendar(true);
    const now = new Date();
    const generated: PlannedCalendarBlock[] = [];

    for (let i = 0; i < daysToAutoBlock; i++) {
      const dateObj = new Date(now.getTime() + i * 86400000);
      const dateStr = dateObj.toISOString().split('T')[0];

      const govModule = GOV_EXAMS_MODULES_CATALOG[i % GOV_EXAMS_MODULES_CATALOG.length];
      const dsaModule = DSA_MODULES_CATALOG[i % DSA_MODULES_CATALOG.length];

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
        calendarSynced: true,
        tasks: govModule.tasks,
      };

      const dsaBlock: PlannedCalendarBlock = {
        id: `auto_dsa_${dateStr}_${Date.now()}_${i}`,
        moduleCategory: 'DSA',
        title: dsaModule.title,
        topic: dsaModule.topic,
        subModuleCode: dsaModule.code,
        dateStr,
        startTime: dsaSlotTime,
        durationMinutes: blockDurationMins,
        isCompleted: false,
        calendarSynced: true,
        tasks: dsaModule.tasks,
      };

      generated.push(govBlock, dsaBlock);
    }

    // Also sync first 4 blocks to the backend StudyPlan API so all views stay unified
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

    // If connected to Google Calendar, push the today/tomorrow blocks to primary Google Calendar
    const accessToken = await getAccessToken();
    if (accessToken && !needsGcalAuth) {
      for (const block of generated.slice(0, 4)) {
        try {
          const { startIso, endIso, timeZone } = buildCalendarStartEndIso(
            block.dateStr,
            block.startTime,
            block.durationMinutes
          );
          const payload = {
            summary: `📚 [${block.moduleCategory}] ${block.title}`,
            description: `Module: ${block.subModuleCode}\nTopic: ${block.topic}\nChecklist:\n${block.tasks
              .map((t) => `• ${t}`)
              .join('\n')}`,
            start: { dateTime: startIso, timeZone },
            end: { dateTime: endIso, timeZone },
          };
          const res = await fetch(
            'https://www.googleapis.com/calendar/v3/calendars/primary/events',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            }
          );
          if (res.ok) {
            const ev = await res.json();
            block.googleCalendarLink = ev.htmlLink;
          }
        } catch {
          // Continue syncing remaining blocks
        }
      }
      await fetchLiveGoogleCalendarEvents();
    }

    await saveBlocksToStorageAndFirestore(generated);
    setIsSyncingCalendar(false);

    // Send browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('📅 Study Session Planner Updated', {
          body: `Automatically blocked out ${generated.length} calendar sessions for Government Exams (${govExamSlotTime}) and DSA (${dsaSlotTime}).`,
          icon: '/favicon.ico',
        });
      } catch {
        // Ignore notification errors
      }
    }

    showFeedback(
      `Automatically scheduled & blocked out ${generated.length} sessions (${daysToAutoBlock} days) for Government Exams (${govExamSlotTime}) and DSA (${dsaSlotTime})!`
    );
  };

  // Connect Google Calendar OAuth
  const handleConnectGoogleCalendar = async () => {
    setIsConnectingGcal(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGcalUser(result.user);
        setNeedsGcalAuth(false);
        await fetchLiveGoogleCalendarEvents();
        showFeedback('Connected to Google Calendar! Your DSA & Government Exam blocks are ready to sync.');
      }
    } catch {
      showFeedback(
        'Using built-in Smart Calendar Blocker & .ICS Calendar Export (Google Sign-In popup was closed).',
        'info'
      );
    } finally {
      setIsConnectingGcal(false);
    }
  };

  // Sync a single block to Google Calendar (or generate a direct Google Calendar template URL)
  const handleSyncSingleBlockToCalendar = async (block: PlannedCalendarBlock) => {
    const accessToken = await getAccessToken();
    const { startIso, endIso, timeZone } = buildCalendarStartEndIso(
      block.dateStr,
      block.startTime,
      block.durationMinutes
    );

    if (accessToken && !needsGcalAuth) {
      setIsSyncingCalendar(true);
      try {
        const res = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              summary: `📚 [${block.moduleCategory}] ${block.title}`,
              description: `Topic: ${block.topic}\nChecklist:\n${block.tasks.map((t) => `• ${t}`).join('\n')}`,
              start: { dateTime: startIso, timeZone },
              end: { dateTime: endIso, timeZone },
            }),
          }
        );
        if (res.ok) {
          const created = await res.json();
          const next = plannedBlocks.map((b) =>
            b.id === block.id
              ? { ...b, calendarSynced: true, googleCalendarLink: created.htmlLink }
              : b
          );
          await saveBlocksToStorageAndFirestore(next);
          await fetchLiveGoogleCalendarEvents();
          showFeedback(`Blocked out "${block.title}" on your Google Calendar!`);
          setIsSyncingCalendar(false);
          return;
        }
      } catch {
        // Fallback below
      }
      setIsSyncingCalendar(false);
    }

    // Mark as blocked in local/Firestore calendar & download/sync
    const next = plannedBlocks.map((b) =>
      b.id === block.id ? { ...b, calendarSynced: true } : b
    );
    await saveBlocksToStorageAndFirestore(next);
    showFeedback(
      `Time slot blocked (${block.dateStr} • ${block.startTime}, ${block.durationMinutes}m) for [${block.moduleCategory}] ${block.title}!`
    );
  };

  // Export all planned DSA & Government Exams blocks as standard .ics calendar file
  const handleDownloadIcsCalendar = () => {
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AI Study Companion//DSA and Government Exams Planner//EN',
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
    a.download = `dsa_gov_exams_study_schedule_${todayStr}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showFeedback(
      `Exported ${plannedBlocks.length} DSA & Government Exams time blocks to .ics calendar file!`
    );
  };

  // Complete a scheduled calendar block and credit study minutes to user's profile
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

  // Delete a block
  const handleDeleteBlock = async (blockId: string) => {
    const nextBlocks = plannedBlocks.filter((b) => b.id !== blockId);
    await saveBlocksToStorageAndFirestore(nextBlocks);
  };

  // Add custom DSA or Government Exam calendar block
  const handleCreateCustomBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newBlock: PlannedCalendarBlock = {
      id: `custom_block_${Date.now()}`,
      moduleCategory: customCategory,
      title: customTitle.trim(),
      topic: customTopic.trim() || `${customCategory} Core Practice & Revision`,
      subModuleCode: customCategory === 'DSA' ? 'DSA-CUSTOM' : 'GOV-CUSTOM',
      dateStr: customDate,
      startTime: customTime,
      durationMinutes: Number(customDuration) || 60,
      isCompleted: false,
      calendarSynced: true,
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
      `Scheduled & blocked out [${newBlock.moduleCategory}] "${newBlock.title}" on ${newBlock.dateStr} at ${newBlock.startTime}!`
    );
  };

  // Filtered & sorted upcoming events
  const filteredBlocks = useMemo(() => {
    return plannedBlocks
      .filter((b) => (filterModule === 'all' ? true : b.moduleCategory === filterModule))
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [plannedBlocks, filterModule]);

  const dsaBlocksCount = plannedBlocks.filter((b) => b.moduleCategory === 'DSA').length;
  const govBlocksCount = plannedBlocks.filter((b) => b.moduleCategory === 'Government Exams').length;
  const totalBlockedHours = (
    plannedBlocks.reduce((acc, b) => acc + b.durationMinutes, 0) / 60
  ).toFixed(1);
  const completedCount = plannedBlocks.filter((b) => b.isCompleted).length;

  // Merge upcoming Exam Dates + Planned Study Blocks for the Unified Upcoming Event View
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
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-400">
            <Calendar className="w-4 h-4" />
            <span>Study Session Planner & Calendar Time-Blocker</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-indigo-400">DSA & Government Exams Auto-Scheduler</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-400">
              {totalBlockedHours}h Blocked ({dsaBlocksCount} DSA · {govBlocksCount} Gov Exams)
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Automated Calendar Time-Blocking & Upcoming Event View
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl">
            Automatically schedules and blocks out dedicated calendar slots for your Government Exams (UPSC, SSC CGL, IBPS PO, GATE) and Data Structures & Algorithms (DSA) modules, syncing with Google Calendar, .ICS export, and your Student Dashboard progress.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <button
            type="button"
            onClick={handleAutoScheduleModules}
            disabled={isSyncingCalendar}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/15 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
            <span>Auto-Block DSA & Gov Exams</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddCustomBlockModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Time Block</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadIcsCalendar}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            title="Download standard .ICS calendar file for Apple/Outlook/Google Calendar"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export .ICS</span>
          </button>

          <button
            type="button"
            onClick={handleConnectGoogleCalendar}
            disabled={isConnectingGcal}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              !needsGcalAuth && gcalUser
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {!needsGcalAuth && gcalUser
                ? `Synced (${gcalUser.email?.split('@')[0] || 'Google Cal'})`
                : 'Connect Google Calendar'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowSchedulerSettings(!showSchedulerSettings)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Configure Auto-Blocking Time Windows"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Toast Feedback */}
      {statusBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Auto-Scheduler Time Slot Configurator */}
      {showSchedulerSettings && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Government Exams Morning Slot
            </label>
            <select
              value={govExamSlotTime}
              onChange={(e) => setGovExamSlotTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="06:30 AM">06:30 AM (Early Analytical)</option>
              <option value="07:30 AM">07:30 AM (Morning Prime)</option>
              <option value="09:00 AM">09:00 AM (Forenoon Block)</option>
              <option value="11:00 AM">11:00 AM (Midday Drill)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              DSA Evening Coding Slot
            </label>
            <select
              value={dsaSlotTime}
              onChange={(e) => setDsaSlotTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="05:00 PM">05:00 PM (Late Afternoon)</option>
              <option value="07:00 PM">07:00 PM (Evening Habit Anchor)</option>
              <option value="08:30 PM">08:30 PM (Night Deep Work)</option>
              <option value="09:30 PM">09:30 PM (Late Coding Sprint)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Session Block Length
            </label>
            <select
              value={blockDurationMins}
              onChange={(e) => setBlockDurationMins(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes (1 Hour)</option>
              <option value={75}>75 Minutes</option>
              <option value={90}>90 Minutes (1.5 Hours)</option>
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={handleAutoScheduleModules}
              className="w-full py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              Apply & Regenerate Blocks
            </button>
          </div>
        </div>
      )}

      {/* Custom Time-Block Modal Form */}
      {showAddCustomBlockModal && (
        <form
          onSubmit={handleCreateCustomBlock}
          className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">
              Schedule Custom DSA or Government Exam Time Block
            </h4>
            <button
              type="button"
              onClick={() => setShowAddCustomBlockModal(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Learning Track</label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as 'DSA' | 'Government Exams')}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="DSA">DSA (Data Structures & Algorithms)</option>
                <option value="Government Exams">Government Exams (UPSC / SSC / Banking / GATE)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Module Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Segment Trees & Fenwick BIT"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Specific Topic Focus</label>
              <input
                type="text"
                placeholder="e.g. Range Sum Queries in O(log n)"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Start Time</label>
              <input
                type="text"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                placeholder="07:00 PM"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Duration (mins)</label>
              <input
                type="number"
                min={15}
                max={180}
                value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <button
              type="submit"
              className="py-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              Block Time on Calendar
            </button>
          </div>
        </form>
      )}

      {/* Main 12-Column Layout: Left 8 Cols = Upcoming Scheduled Time Blocks | Right 4 Cols = Upcoming Exams & Live Calendar Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Interactive Upcoming Event View for DSA & Government Exams */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              {(
                [
                  { id: 'all', label: `All Upcoming Blocks (${plannedBlocks.length})` },
                  { id: 'Government Exams', label: `Government Exams (${govBlocksCount})` },
                  { id: 'DSA', label: `DSA Modules (${dsaBlocksCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterModule(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    filterModule === tab.id
                      ? 'bg-slate-800 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400 font-mono tabular-nums">
              {completedCount}/{plannedBlocks.length} blocks completed
            </div>
          </div>

          {/* Upcoming Events Timeline List */}
          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {filteredBlocks.map((block) => {
              const isDsa = block.moduleCategory === 'DSA';
              const isToday = block.dateStr === todayStr;

              return (
                <div
                  key={block.id}
                  className={`p-4 rounded-2xl border transition ${
                    block.isCompleted
                      ? 'bg-slate-950/40 border-emerald-500/30 opacity-80'
                      : isToday
                      ? 'bg-slate-950/90 border-slate-700'
                      : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleBlockCompleted(block)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 cursor-pointer ${
                          block.isCompleted
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-600 hover:border-emerald-400 text-transparent'
                        }`}
                        title={
                          block.isCompleted
                            ? 'Completed! Click to reopen'
                            : 'Mark calendar block complete & credit study minutes'
                        }
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div className="space-y-1">
                        {/* Unboxed Clean Metadata Line */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`font-semibold ${
                              isDsa ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {block.moduleCategory}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className="font-mono tabular-nums text-slate-300">
                            {isToday ? 'Today' : block.dateStr} at {block.startTime}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className="font-mono tabular-nums text-slate-400">
                            {block.durationMinutes} mins
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span
                            className={
                              block.calendarSynced ? 'text-indigo-400' : 'text-slate-500'
                            }
                          >
                            {block.calendarSynced ? 'Calendar Time-Blocked' : 'Pending Sync'}
                          </span>
                        </div>

                        <h4
                          className={`text-sm font-bold ${
                            block.isCompleted ? 'line-through text-slate-400' : 'text-white'
                          }`}
                        >
                          {block.subModuleCode}: {block.title}
                        </h4>

                        <p className="text-xs text-slate-400">{block.topic}</p>

                        {/* Actionable Checklist Tasks */}
                        <ul className="pt-1.5 space-y-1">
                          {block.tasks.map((taskText, idx) => (
                            <li
                              key={idx}
                              className="text-[11px] text-slate-300 flex items-start gap-2"
                            >
                              <span className="text-slate-500 select-none">•</span>
                              <span>{taskText}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Right Action Buttons for this Calendar Event */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToChat(
                            `Start my scheduled ${block.moduleCategory} calendar session on "${block.title}" (${block.topic}). Walk me through the key concepts and test me with 3 exam-style problems.`
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Launch Session</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {!block.calendarSynced ? (
                          <button
                            type="button"
                            onClick={() => handleSyncSingleBlockToCalendar(block)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium transition cursor-pointer"
                          >
                            Block in Calendar
                          </button>
                        ) : block.googleCalendarLink ? (
                          <a
                            href={block.googleCalendarLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 text-[11px] font-medium flex items-center gap-1 transition"
                          >
                            <span>Open Cal</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition cursor-pointer"
                          title="Remove time block"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Columns: Upcoming Event View (Exam Countdowns + Today's Blocked Agenda + Live Google Calendar Events) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Today's Blocked Time Summary */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Upcoming Event View ({todayStr})
              </span>
              <span className="text-xs font-mono tabular-nums text-emerald-400">
                {plannedBlocks.filter((b) => b.dateStr === todayStr).length} Today
              </span>
            </div>

            <div className="space-y-2">
              {plannedBlocks
                .filter((b) => b.dateStr >= todayStr)
                .slice(0, 4)
                .map((ev) => (
                  <div
                    key={`agenda_${ev.id}`}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span
                          className={`font-semibold ${
                            ev.moduleCategory === 'DSA' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {ev.moduleCategory}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="font-mono tabular-nums text-slate-400">
                          {ev.dateStr === todayStr ? 'Today' : ev.dateStr}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white truncate">
                        {ev.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {ev.startTime} ({ev.durationMinutes}m blocked)
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleBlockCompleted(ev)}
                      className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition shrink-0 cursor-pointer ${
                        ev.isCompleted
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {ev.isCompleted ? 'Done' : 'Complete'}
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Upcoming Government & Academic Exam Milestones */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Target Exam Dates & Countdowns
              </span>
              <span className="text-xs text-amber-400 font-mono tabular-nums">
                {upcomingExamMilestones.length} Dates
              </span>
            </div>

            <div className="space-y-2">
              {upcomingExamMilestones.map((exam, i) => (
                <div
                  key={`${exam.title}_${i}`}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] text-amber-400 font-medium">
                      {exam.subject} · {exam.date}
                    </div>
                    <div className="text-xs font-semibold text-white truncate mt-0.5">
                      {exam.title}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold font-mono tabular-nums text-white">
                      {exam.diffDays <= 0 ? 'Today' : `${exam.diffDays}d`}
                    </div>
                    <div className="text-[10px] text-slate-400">remaining</div>
                  </div>
                </div>
              ))}
            </div>

            {onNavigateToQuiz && (
              <button
                type="button"
                onClick={onNavigateToQuiz}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Take Timed DSA & Gov Exam Mock Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Connected Google Calendar Events Feed (when authenticated) */}
          {gcalEvents.length > 0 && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Google Calendar Live Feed</span>
                <span className="text-indigo-400 font-mono tabular-nums">
                  {gcalEvents.length} synced
                </span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {gcalEvents.slice(0, 4).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="truncate text-slate-200 font-medium">{ev.summary}</div>
                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
