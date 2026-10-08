import React, { useState, useMemo } from 'react';
import {
  Bell,
  BookOpen,
  FileText,
  Play,
  Calendar,
  CheckCircle2,
  Send,
  Code2,
  Building2,
  ArrowRight,
  Target,
  Clock,
  Layers,
  X,
  Check,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface DsaStudyModule {
  id: string;
  title: string;
  topicGroup: 'Arrays & Sliding Window' | 'Trees & Heaps' | 'Graphs & Shortest Paths' | 'Dynamic Programming';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  timeComplexity: string;
  spaceComplexity: string;
  keyPatterns: string[];
  codeTemplate: string;
  practiceCount: number;
  docTitle: string;
}

interface GovExamNotice {
  id: string;
  examCode: string;
  examTitle: string;
  conductingBody: string;
  category: 'UPSC / Civil Services' | 'SSC & Railways' | 'Banking & RBI' | 'GATE & Technical PSU';
  notificationStatus: 'Registration Open' | 'Admit Card & Mock Active' | 'Upcoming Notification';
  applicationDeadline: string;
  examDate: string;
  daysRemaining: number;
  syllabusHighlights: string[];
  prepDocTitle: string;
  liveClassTitle: string;
  videoEmbedUrl: string;
  instructor: string;
  classDuration: string;
}

const DSA_STUDY_MODULES: DsaStudyModule[] = [
  {
    id: 'dsa_mod_arrays_window',
    title: 'Arrays, Two Pointers, Sliding Window & Kadane’s Algorithm',
    topicGroup: 'Arrays & Sliding Window',
    difficulty: 'Beginner',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    keyPatterns: [
      'Fixed & Variable Size Sliding Window',
      'Two Pointers (Opposite & Same Direction)',
      'Kadane’s Maximum Subarray Invariant',
      'Prefix Sums & Difference Arrays',
    ],
    codeTemplate: `def longest_subarray_sum_k(nums: list[int], k: int) -> int:
    left = curr_sum = max_len = 0
    for right, val in enumerate(nums):
        curr_sum += val
        while curr_sum > k and left <= right:
            curr_sum -= nums[left]
            left += 1
        max_len = max(max_len, right - left + 1)
    return max_len`,
    practiceCount: 18,
    docTitle: 'DSA Study Guide: Arrays, Sliding Window, Two Pointers, Linked Lists & Monotonic Stacks',
  },
  {
    id: 'dsa_mod_trees_bst_heaps',
    title: 'Binary Trees, BST Invariants, Morris Traversal & Priority Queues',
    topicGroup: 'Trees & Heaps',
    difficulty: 'Intermediate',
    timeComplexity: 'O(n) / O(log n)',
    spaceComplexity: 'O(h)',
    keyPatterns: [
      'DFS (Inorder, Preorder, Postorder) & Level-Order BFS',
      'Lowest Common Ancestor (LCA) & Diameter of Tree',
      'Validate BST with [min_val, max_val] Range Bounds',
      'Top-K Elements & Median Stream with Dual Heaps',
    ],
    codeTemplate: `def is_valid_bst(node, low=float('-inf'), high=float('inf')) -> bool:
    if not node:
        return True
    if not (low < node.val < high):
        return False
    return (is_valid_bst(node.left, low, node.val) and
            is_valid_bst(node.right, node.val, high))`,
    practiceCount: 22,
    docTitle: 'DSA Masterbook: Trees, Heaps, Graph Algorithms (BFS/DFS/Dijkstra) & Dynamic Programming',
  },
  {
    id: 'dsa_mod_graphs_dijkstra',
    title: 'Graph Algorithms: BFS, DFS, Topological Sort, Dijkstra & Union-Find',
    topicGroup: 'Graphs & Shortest Paths',
    difficulty: 'Intermediate',
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V + E)',
    keyPatterns: [
      'Multi-Source BFS for Unweighted Shortest Paths',
      'Kahn’s Indegree Queue for DAG Topological Sort',
      'Dijkstra Min-Heap Priority Queue Relaxation',
      'Disjoint Set Union (Path Compression + Union by Rank)',
    ],
    codeTemplate: `import heapq
def dijkstra(n: int, adj: dict, src: int) -> list[int]:
    dist = [float('inf')] * n
    dist[src] = 0
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, weight in adj.get(u, []):
            if dist[u] + weight < dist[v]:
                dist[v] = dist[u] + weight
                heapq.heappush(pq, (dist[v], v))
    return dist`,
    practiceCount: 20,
    docTitle: 'DSA Masterbook: Trees, Heaps, Graph Algorithms (BFS/DFS/Dijkstra) & Dynamic Programming',
  },
  {
    id: 'dsa_mod_dynamic_programming',
    title: 'Dynamic Programming: 1D/2D State Transitions, Knapsack, LCS & Bitmask DP',
    topicGroup: 'Dynamic Programming',
    difficulty: 'Advanced',
    timeComplexity: 'O(n · W)',
    spaceComplexity: 'O(W) 1D Optimized',
    keyPatterns: [
      '0/1 Knapsack & Unbounded Coin Change',
      'Longest Common Subsequence (LCS) & Edit Distance',
      'Longest Increasing Subsequence in O(n log n)',
      'DP on Trees & Partition MCM Intervals',
    ],
    codeTemplate: `def knapsack_01(weights: list[int], values: list[int], capacity: int) -> int:
    dp = [0] * (capacity + 1)
    for w, val in zip(weights, values):
        for cap in range(capacity, w - 1, -1):
            dp[cap] = max(dp[cap], val + dp[cap - w])
    return dp[capacity]`,
    practiceCount: 25,
    docTitle: 'DSA Masterbook: Trees, Heaps, Graph Algorithms (BFS/DFS/Dijkstra) & Dynamic Programming',
  },
];

const GOVERNMENT_EXAM_NOTICES: GovExamNotice[] = [
  {
    id: 'gov_exam_ssc_cgl',
    examCode: 'SSC CGL & RRB NTPC',
    examTitle: 'SSC Combined Graduate Level (Tier-I & II) & Railway NTPC Exam',
    conductingBody: 'Staff Selection Commission (SSC) & Railway Recruitment Board',
    category: 'SSC & Railways',
    notificationStatus: 'Registration Open',
    applicationDeadline: '2026-10-25',
    examDate: '2026-11-08',
    daysRemaining: 32,
    syllabusHighlights: [
      'Quantitative Aptitude: Percentage, Profit & Loss, SI/CI, Time & Work, Mensuration',
      'General Intelligence & Reasoning: Syllogism, Coding-Decoding, Number Series',
      'English Comprehension & General Awareness (Polity, Science, Current Affairs)',
    ],
    prepDocTitle:
      'Government Exams Prep: SSC CGL, IBPS/SBI PO & Railways — Quantitative Aptitude & Reasoning Shortcuts',
    liveClassTitle:
      'SSC CGL, CHSL & Railway NTPC Masterclass: Quantitative Aptitude & Logical Reasoning',
    videoEmbedUrl: 'https://www.youtube.com/embed/KJgsSFOSQv0',
    instructor: 'Prof. R.K. Verma (Competitive Exam Faculty)',
    classDuration: '55 Classes (45 Hours)',
  },
  {
    id: 'gov_exam_upsc_cse',
    examCode: 'UPSC CSE & State PCS',
    examTitle: 'UPSC Civil Services Preliminary & Mains (IAS / IPS / IFS)',
    conductingBody: 'Union Public Service Commission (UPSC)',
    category: 'UPSC / Civil Services',
    notificationStatus: 'Admit Card & Mock Active',
    applicationDeadline: '2026-10-30',
    examDate: '2026-11-22',
    daysRemaining: 46,
    syllabusHighlights: [
      'Indian Polity & Constitution: Fundamental Rights (Art 12–35), Writs, DPSP, Parliament',
      'Indian Economy: RBI Monetary Policy, Budget, Inflation, Inclusive Growth',
      'CSAT Paper-II: Reading Comprehension, Logical Reasoning & Data Sufficiency',
    ],
    prepDocTitle:
      'Government Exams Prep: UPSC CSE & State PCS — Indian Polity, Economy & General Studies',
    liveClassTitle:
      'UPSC CSE & State PCS Foundation Class: Indian Polity, Governance & Laxmikanth Summary',
    videoEmbedUrl: 'https://www.youtube.com/embed/ZA-tUyM_y7s',
    instructor: 'Dr. Siddharth Arora & SWAYAM Faculty',
    classDuration: '40 Lectures (32 Hours)',
  },
  {
    id: 'gov_exam_ibps_sbi_po',
    examCode: 'IBPS PO / SBI PO & RBI',
    examTitle: 'IBPS & SBI Probationary Officer (PO) & RBI Grade B Officer Exam',
    conductingBody: 'Institute of Banking Personnel Selection (IBPS) & RBI',
    category: 'Banking & RBI',
    notificationStatus: 'Registration Open',
    applicationDeadline: '2026-10-20',
    examDate: '2026-11-15',
    daysRemaining: 39,
    syllabusHighlights: [
      'High-Level Seating Arrangement (Circular/Linear) & Floor Puzzles',
      'Data Interpretation: Caselets, Missing DI, Radar & Mixed Graphs',
      'Banking & Financial Awareness: Repo Rate, Basel-III Norms, NPAs, UPI & Digital Rupee',
    ],
    prepDocTitle:
      'Government Exams Prep: SSC CGL, IBPS/SBI PO & Railways — Quantitative Aptitude & Reasoning Shortcuts',
    liveClassTitle:
      'IBPS PO, SBI PO & RBI Grade B Complete Class: Data Interpretation, Puzzles & Banking Awareness',
    videoEmbedUrl: 'https://www.youtube.com/embed/_uQrJ0TkZlc',
    instructor: 'Ankush Lamba & Banking Prep Team',
    classDuration: '36 Classes (28 Hours)',
  },
  {
    id: 'gov_exam_gate_isro_psu',
    examCode: 'GATE CS / ISRO / NIC',
    examTitle: 'GATE Computer Science, ISRO Scientist/Engineer & PSU Recruitment',
    conductingBody: 'IITs / ISRO Centralised Recruitment Board (ICRB) / NIC',
    category: 'GATE & Technical PSU',
    notificationStatus: 'Registration Open',
    applicationDeadline: '2026-10-28',
    examDate: '2026-11-29',
    daysRemaining: 53,
    syllabusHighlights: [
      'Algorithms & Data Structures: Asymptotic Recurrences, Master Theorem, Hashing, Graphs',
      'Operating Systems & DBMS: CPU Scheduling, Deadlocks, Virtual Memory Paging, B+ Trees, BCNF',
      'Computer Networks & Discrete Mathematics: IPv4 Subnetting, TCP Congestion, Graph Theory',
    ],
    prepDocTitle:
      'Government Technical Exams: GATE CS/IT, ISRO, DRDO & NIC Scientist Revision Handbook',
    liveClassTitle:
      'GATE CS/IT, ISRO & NIC Scientist Class: Algorithms, OS, DBMS & Computer Networks',
    videoEmbedUrl: 'https://www.youtube.com/embed/8mAITcNt710',
    instructor: 'NPTEL & IIT GATE Faculty',
    classDuration: '60 Lectures (50 Hours)',
  },
];

interface DsaAndGovExamHubProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  onOpenMaterialsTab?: () => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

export const DsaAndGovExamHub: React.FC<DsaAndGovExamHubProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  onOpenMaterialsTab,
  onLogStudyMinutes,
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'dsa' | 'gov_exams'>('all');
  const [selectedDsaModule, setSelectedDsaModule] = useState<DsaStudyModule>(DSA_STUDY_MODULES[0]);
  const [activeClassVideo, setActiveClassVideo] = useState<GovExamNotice | null>(null);
  const [notificationToast, setNotificationToast] = useState<{
    title: string;
    message: string;
    examCode: string;
  } | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);

  const subscribedExams = useMemo(() => {
    const set = new Set<string>();
    (profile.examDates || []).forEach((e) => {
      set.add(e.title.toLowerCase());
    });
    return set;
  }, [profile.examDates]);

  const handleDispatchGovExamNotification = async (exam: GovExamNotice) => {
    setSendingAlertId(exam.id);
    try {
      // Request browser notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`Government Exam Alert: ${exam.examCode}`, {
            body: `${exam.examTitle} (${exam.notificationStatus}) — Exam Date: ${exam.examDate} (${exam.daysRemaining} days left).`,
            icon: '/icon-192.svg',
          });
        } catch {
          // ignore
        }
      }

      // Add exam to student's profile examDates if not already present
      const existingExams = profile.examDates || [];
      const alreadyExists = existingExams.some(
        (e) => e.title.toLowerCase() === exam.examTitle.toLowerCase()
      );
      const updatedExams = alreadyExists
        ? existingExams
        : [
            ...existingExams,
            {
              subject: 'Government Exams',
              date: exam.examDate,
              title: exam.examTitle,
            },
          ];

      const updatedSubjects = Array.from(
        new Set([...(profile.subjects || []), 'DSA', 'Government Exams'])
      );

      const updatedProfile: StudentProfile = {
        ...profile,
        subjects: updatedSubjects,
        examDates: updatedExams,
      };
      onProfileUpdate(updatedProfile);

      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            userId: profile.userId,
            examDates: updatedExams,
          },
          { merge: true }
        ).catch(() => {});
      }

      // Create official reminder & send WhatsApp notification via /api/reminders
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          reminderText: `Government Exam Notification: ${exam.examTitle} (${exam.examCode})`,
          targetTime: profile.preferredStudyTime || '08:00 AM',
          frequency: 'daily',
          subject: 'Government Exams',
          type: 'exam',
          examTitle: exam.examTitle,
          examDate: exam.examDate,
          daysBeforeExam: exam.daysRemaining,
          sendWhatsAppNow: true,
        }),
      }).catch(() => {});

      setNotificationToast({
        title: `Government Exam Notification Activated: ${exam.examCode}`,
        message: `Alert sent for "${exam.examTitle}" (Exam on ${exam.examDate}, ${exam.daysRemaining} days left) and synced to your Study Planner & WhatsApp (${profile.whatsappNumber}).`,
        examCode: exam.examCode,
      });
    } finally {
      setSendingAlertId(null);
    }
  };

  return (
    <section
      aria-label="DSA Study Materials and Government Exams Preparation Hub"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
    >
      {/* Live Government Exam Notification Banner */}
      <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
            <Bell className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-amber-400">
                Official Government Exam Notification Desk
              </span>
              <span aria-hidden="true">·</span>
              <span>UPSC CSE · SSC CGL · IBPS/SBI PO · GATE CS & ISRO</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-emerald-400">
                4 Active Exam Alerts
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">
              Upcoming Government Exams: SSC CGL Tier-II (Nov 8), IBPS PO (Nov 15), UPSC Prelims Mock (Nov 22) & GATE CS/PSU (Nov 29)
            </h4>
            <p className="text-xs text-slate-300">
              Enable instant WhatsApp & browser push notifications for registration deadlines, admit card releases, daily aptitude classes, and verified preparation documents.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleDispatchGovExamNotification(GOVERNMENT_EXAM_NOTICES[0])}
            disabled={sendingAlertId !== null}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Gov Exam Alert Now</span>
          </button>

          {onOpenMaterialsTab && (
            <button
              type="button"
              onClick={onOpenMaterialsTab}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl border border-slate-700 transition cursor-pointer"
            >
              Browse All RAG Docs
            </button>
          )}
        </div>
      </div>

      {/* Toast Confirmation when Government Exam Notification is Triggered */}
      {notificationToast && (
        <div
          role="status"
          className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl p-4 flex items-start justify-between gap-3 text-xs text-emerald-200"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">{notificationToast.title}</div>
              <p className="text-emerald-200/90 mt-0.5">{notificationToast.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotificationToast(null)}
            className="text-emerald-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Section Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-indigo-400">Curriculum & Competitive Prep</span>
            <span aria-hidden="true">·</span>
            <span>DSA Study Materials</span>
            <span aria-hidden="true">·</span>
            <span>Government Exam Documents & Classes</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-0.5">
            DSA Learning Materials & Government Exams Preparation Center
          </h3>
        </div>

        <div
          role="group"
          aria-label="Filter DSA and Government Exam Sections"
          className="inline-flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs"
        >
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeSection === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All (DSA + Gov Exams)
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('dsa')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeSection === 'dsa'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            DSA Study Materials
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('gov_exams')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeSection === 'gov_exams'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gov Exams & Classes
          </button>
        </div>
      </div>

      {/* PART 1: DSA STUDY MATERIALS TO LEARN */}
      {(activeSection === 'all' || activeSection === 'dsa') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-bold text-white">
                Data Structures & Algorithms (DSA) Study Materials & Code Templates
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              4 Core Modules · 85 Curated Problems · Indexed in RAG
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: 4 DSA Study Material Cards */}
            <div className="lg:col-span-5 space-y-2.5">
              {DSA_STUDY_MODULES.map((mod) => {
                const isSelected = selectedDsaModule.id === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setSelectedDsaModule(mod)}
                    className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500/70 shadow-sm'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold text-indigo-400">{mod.topicGroup}</span>
                      <span className="font-mono tabular-nums text-slate-300">
                        {mod.timeComplexity} · {mod.difficulty}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1">{mod.title}</div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>{mod.practiceCount} Guided Problems</span>
                      <span className="text-indigo-300 font-medium">Inspect Notes →</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Interactive DSA Study Material Reader & Code Template */}
            <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-xs text-indigo-400 font-semibold">
                      {selectedDsaModule.topicGroup} · Verified RAG Study Sheet
                    </div>
                    <h5 className="text-sm font-bold text-white mt-0.5">
                      {selectedDsaModule.title}
                    </h5>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-emerald-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                    Time: {selectedDsaModule.timeComplexity} · Space: {selectedDsaModule.spaceComplexity}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-1.5">
                    Key Algorithmic Patterns & Invariants:
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300">
                    {selectedDsaModule.keyPatterns.map((pat) => (
                      <li key={pat} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{pat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-slate-300">
                      Reference Implementation Template (Python):
                    </span>
                    <span className="font-mono text-[11px]">{selectedDsaModule.docTitle}</span>
                  </div>
                  <pre className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-indigo-200 overflow-x-auto leading-relaxed">
                    {selectedDsaModule.codeTemplate}
                  </pre>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onLogStudyMinutes) {
                        onLogStudyMinutes(30, `DSA Study: ${selectedDsaModule.topicGroup}`);
                      }
                      onNavigateToChat(
                        `Teach me the DSA study material "${selectedDsaModule.title}" with a step-by-step dry run trace and 2 coding interview questions.`
                      );
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Learn with AI Tutor</span>
                  </button>

                  {onNavigateToQuiz && (
                    <button
                      type="button"
                      onClick={onNavigateToQuiz}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Take DSA Quiz</span>
                    </button>
                  )}
                </div>

                {onOpenMaterialsTab && (
                  <button
                    type="button"
                    onClick={onOpenMaterialsTab}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Full DSA PDF Notes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PART 2: GOVERNMENT EXAMS PREPARATION DOCUMENTS, CLASSES & NOTIFICATIONS */}
      {(activeSection === 'all' || activeSection === 'gov_exams') && (
        <div className="space-y-4 pt-2 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">
                Government Exams Preparation Documents, Classes & Live Notifications
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              UPSC · SSC CGL · Banking PO · GATE / PSU
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GOVERNMENT_EXAM_NOTICES.map((exam) => {
              const isSubscribed = subscribedExams.has(exam.examTitle.toLowerCase());
              const isSending = sendingAlertId === exam.id;

              return (
                <div
                  key={exam.id}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                          <span className="font-semibold text-amber-400">{exam.examCode}</span>
                          <span aria-hidden="true">·</span>
                          <span>{exam.notificationStatus}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-emerald-400">
                            {exam.daysRemaining}d left
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-white mt-1">{exam.examTitle}</h5>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {exam.conductingBody} · Exam Date:{' '}
                          <span className="text-slate-200 font-mono tabular-nums">
                            {exam.examDate}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDispatchGovExamNotification(exam)}
                        disabled={isSending}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                          isSubscribed
                            ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300'
                        }`}
                        title="Send Government Exam Notification & Sync to Study Planner"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>
                          {isSending
                            ? 'Sending...'
                            : isSubscribed
                            ? 'Alert Active'
                            : 'Notify Me'}
                        </span>
                      </button>
                    </div>

                    {/* Preparation Document & Class Info Box */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400">Prep Document: </span>
                          <span className="text-white font-medium">{exam.prepDocTitle}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400">Preparation Class: </span>
                          <span className="text-emerald-300 font-medium">{exam.liveClassTitle}</span>
                          <span className="text-slate-400 block text-[11px] mt-0.5">
                            {exam.instructor} · {exam.classDuration}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Syllabus Highlights */}
                    <ul className="space-y-1 text-xs text-slate-300">
                      {exam.syllabusHighlights.map((item) => (
                        <li key={item} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Buttons: Watch Class, Study Document, Practice Mock */}
                  <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onLogStudyMinutes) {
                            onLogStudyMinutes(45, `Gov Exam Class: ${exam.examCode}`);
                          }
                          setActiveClassVideo(exam);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Attend Prep Class</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToChat(
                            `I am preparing for ${exam.examTitle} (${exam.examCode}). Summarize the preparation document "${exam.prepDocTitle}" and give me 3 previous-year level practice MCQs.`
                          )
                        }
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Study Notes & PYQs</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDispatchGovExamNotification(exam)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <span>Send WhatsApp Alert</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Embedded Government Exam Preparation Class Video Modal */}
      {activeClassVideo && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveClassVideo(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-amber-400">
                  {activeClassVideo.examCode} · Live & Recorded Preparation Class
                </div>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {activeClassVideo.liveClassTitle}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeClassVideo.instructor} · {activeClassVideo.classDuration}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveClassVideo(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <iframe
                src={activeClassVideo.videoEmbedUrl}
                title={activeClassVideo.liveClassTitle}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-xs text-slate-300">
                Companion Document: <span className="text-white font-medium">{activeClassVideo.prepDocTitle}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = activeClassVideo;
                    setActiveClassVideo(null);
                    onNavigateToChat(
                      `I just watched the ${target.examCode} preparation class "${target.liveClassTitle}". Test me with 5 high-yield government exam questions on this topic.`
                    );
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Practice Class Mock Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
