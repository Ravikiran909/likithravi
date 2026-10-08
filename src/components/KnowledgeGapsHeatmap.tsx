import React, { useState, useMemo } from 'react';
import {
  Grid,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Play,
  Brain,
  Zap,
  ArrowRight,
  BookOpen,
  Clock,
  X,
  Target,
  Filter,
  Code2,
  Building2,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface KnowledgeGapsHeatmapProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

export interface TopicHeatmapCell {
  id: string;
  subject: 'DSA' | 'Government Exams' | string;
  subCategory: string;
  topic: string;
  masteryScore: number; // 0 - 100 quiz accuracy %
  gapIntensity: number; // 0 - 100 (100 - masteryScore)
  recommendedStudyMinutes: number; // Calculated study time needed based on quiz accuracy
  quizHistoryScores: number[]; // Recent quiz performance history (%)
  attempts: number;
  lastTested: string;
  status: 'critical' | 'high_need' | 'developing' | 'mastered';
  isWeakTopic: boolean;
  keyConcepts: string[];
  commonPitfall: string;
}

interface SubTopicTemplate {
  subCategory: string;
  topic: string;
  defaultScore: number;
  quizHistory: number[];
  keyConcepts: string[];
  pitfall: string;
}

const SUBJECT_CURRICULUM_TOPICS: Record<string, SubTopicTemplate[]> = {
  DSA: [
    {
      subCategory: 'Dynamic Programming',
      topic: '0/1 Knapsack, LCS & Memoization State Transitions',
      defaultScore: 36,
      quizHistory: [28, 35, 40, 36],
      keyConcepts: [
        'Overlapping subproblems & memo table dimensions',
        '1D reverse-capacity space optimization',
        'Longest Common Subsequence (LCS) recurrence',
      ],
      pitfall: 'Iterating capacity forward in 1D 0/1 Knapsack, accidentally reusing the same item multiple times (Unbounded Knapsack bug).',
    },
    {
      subCategory: 'Graph Algorithms',
      topic: 'Dijkstra Shortest Paths, Bellman-Ford & Topological Sort',
      defaultScore: 44,
      quizHistory: [38, 42, 48, 44],
      keyConcepts: [
        'Priority Queue min-heap edge relaxation O((V+E) log V)',
        "Kahn's BFS in-degree cycle detection",
        'Disjoint Set Union (DSU) path compression',
      ],
      pitfall: 'Applying Dijkstra on graphs with negative edge weights or forgetting to skip stale heap entries (d > dist[u]).',
    },
    {
      subCategory: 'Trees & Priority Queues',
      topic: 'Binary Search Tree (BST) Invariants, LCA & Morris Traversal',
      defaultScore: 54,
      quizHistory: [45, 52, 58, 54],
      keyConcepts: [
        'Strict [minVal, maxVal] range validation in O(n)',
        'Lowest Common Ancestor (LCA) single-pass recursion',
        'Two-Heap median maintenance (Max-Heap + Min-Heap)',
      ],
      pitfall: 'Checking only immediate left/right children instead of passing global subtree range bounds during BST validation.',
    },
    {
      subCategory: 'Stacks & Monotonic Queues',
      topic: 'Monotonic Stack: Next Greater Element & Histogram Area',
      defaultScore: 62,
      quizHistory: [55, 60, 64, 62],
      keyConcepts: [
        'Amortized O(n) push/pop invariant',
        'Previous & Next Smaller Element boundary indices',
        'Sliding Window Maximum with monotonic deque',
      ],
      pitfall: 'Storing raw values instead of indices on the monotonic stack, making width calculation impossible.',
    },
    {
      subCategory: 'Binary Search',
      topic: 'Binary Search on Monotonic Answer Space & Rotated Arrays',
      defaultScore: 76,
      quizHistory: [68, 72, 78, 76],
      keyConcepts: [
        'Overflow-safe mid = low + (high - low) // 2',
        'Feasibility predicate check(mid) on [minAns, maxAns]',
        'Lower bound & upper bound invariants',
      ],
      pitfall: 'Infinite loop when setting low = mid without biasing mid upward as low + (high - low + 1) // 2.',
    },
    {
      subCategory: 'Arrays & Sliding Window',
      topic: "Kadane's Subarray Sum, Two Pointers & Prefix Sums",
      defaultScore: 89,
      quizHistory: [80, 85, 92, 89],
      keyConcepts: [
        'Variable window expansion & contraction invariant',
        'Prefix sum hash map for subarray sum equals K',
        "Kadane's O(n) local vs global maximum",
      ],
      pitfall: 'Using two pointers on arrays containing negative numbers for subarray sum problems instead of Prefix Sum + HashMap.',
    },
  ],
  'Government Exams': [
    {
      subCategory: 'UPSC CSE / State PCS',
      topic: 'Indian Polity: Fundamental Rights (Art 12–35), Writs & Parliament',
      defaultScore: 41,
      quizHistory: [35, 40, 44, 41],
      keyConcepts: [
        'Articles 14–32 & 5 Constitutional Writs (Habeas Corpus to Quo Warranto)',
        'Basic Structure Doctrine (Kesavananda Bharati 1973)',
        'Money Bill (Art 110) vs Financial Bill & Joint Sitting',
      ],
      pitfall: 'Confusing Rights available only to Citizens (Articles 15, 16, 19, 29, 30) with Rights available to all persons.',
    },
    {
      subCategory: 'SSC CGL Tier-I & II',
      topic: 'Quantitative Aptitude: Time & Work LCM, Profit/Loss & Geometry',
      defaultScore: 47,
      quizHistory: [40, 45, 50, 47],
      keyConcepts: [
        'Successive percentage change A + B + (AB)/100',
        'Total Work = LCM of days efficiency method',
        'Circle secant-tangent PT² = PA·PB & triangle similarity',
      ],
      pitfall: 'Calculating discount on Cost Price (CP) instead of Marked Price (MP) in compound markup-discount questions.',
    },
    {
      subCategory: 'IBPS PO / SBI PO / RBI Grade B',
      topic: 'Circular Seating Puzzles, Syllogisms & RBI Monetary Policy',
      defaultScore: 53,
      quizHistory: [48, 50, 56, 53],
      keyConcepts: [
        '8-person Circular Arrangement (inward vs outward facing)',
        'Only-a-few Syllogism Venn diagram possibility rules',
        'Repo Rate, SDF, Reverse Repo, CRR & SLR instruments',
      ],
      pitfall: 'Reversing left/right seating directions when some persons face the center and others face outward.',
    },
    {
      subCategory: 'GATE CS/IT & PSU Scientist',
      topic: 'Operating Systems Deadlocks, DBMS BCNF & TCP Congestion',
      defaultScore: 59,
      quizHistory: [52, 58, 61, 59],
      keyConcepts: [
        "Banker's Algorithm safety sequence & resource allocation graph",
        '3NF vs BCNF lossless-join & dependency preservation',
        'TCP Slow Start + Congestion Avoidance AIMD window math',
      ],
      pitfall: 'Assuming every 3NF relation is automatically in BCNF when overlapping candidate keys exist.',
    },
    {
      subCategory: 'UPSC & SSC General Studies',
      topic: 'Modern Indian History (1885–1947) & Macroeconomic Indicators',
      defaultScore: 74,
      quizHistory: [66, 70, 76, 74],
      keyConcepts: [
        'Swadeshi (1905), Non-Cooperation (1920), Civil Disobedience (1930), Quit India (1942)',
        'Fiscal Deficit vs Primary Deficit & Real vs Nominal GDP',
        'CPI vs WPI inflation basket weighting',
      ],
      pitfall: 'Mixing up chronological order of Cripps Mission (1942), Wavell Plan (1945), and Cabinet Mission (1946).',
    },
    {
      subCategory: 'CSAT & Banking DI',
      topic: 'Data Interpretation: Ratio-Percentage Tables & Caselet Speed Math',
      defaultScore: 86,
      quizHistory: [78, 82, 88, 86],
      keyConcepts: [
        'Reciprocal fraction-to-percentage benchmarks (1/6 to 1/19)',
        'Weighted average & Alligation cross-difference rule',
        'Approximation techniques for multi-chart DI sets',
      ],
      pitfall: 'Using the wrong base year denominator when computing percentage growth across consecutive bars.',
    },
  ],
  Python: [
    {
      subCategory: 'Core Python',
      topic: 'Recursion, Call Stack Frames & LEGB Variable Scope',
      defaultScore: 48,
      quizHistory: [42, 46, 50, 48],
      keyConcepts: ['Call stack frames', 'Termination base condition', 'Local/Enclosing/Global/Built-in'],
      pitfall: 'Missing return on recursive step or using mutable default arguments def fn(items=[]).',
    },
    {
      subCategory: 'Advanced Python',
      topic: 'Asyncio Coroutines, Generators & Decorators',
      defaultScore: 78,
      quizHistory: [70, 75, 80, 78],
      keyConcepts: ['Event loop & async/await', 'Lazy yield generators', 'functools.wraps closures'],
      pitfall: 'Blocking the event loop with synchronous time.sleep() instead of await asyncio.sleep().',
    },
  ],
  Calculus: [
    {
      subCategory: 'Integral Calculus',
      topic: 'Integration by Parts (LIATE) & Definite Substitution',
      defaultScore: 43,
      quizHistory: [38, 40, 45, 43],
      keyConcepts: ['LIATE rule for u-selection', 'u-substitution Jacobian dx', 'Definite integral bounds'],
      pitfall: 'Forgetting to transform integration limits [a, b] when changing variables.',
    },
    {
      subCategory: 'Differential Calculus',
      topic: "Limits, L'Hôpital's Rule & Multivariable Chain Rule",
      defaultScore: 84,
      quizHistory: [78, 82, 86, 84],
      keyConcepts: ['Indeterminate forms 0/0', 'Gradient vector ∇f', 'Composite function chain rule'],
      pitfall: "Applying L'Hôpital's Rule when the limit is not in 0/0 or ∞/∞ form.",
    },
  ],
};

function computeRecommendedMinutes(masteryScore: number): number {
  if (masteryScore < 45) return 60;
  if (masteryScore < 55) return 45;
  if (masteryScore < 70) return 35;
  if (masteryScore < 85) return 20;
  return 10;
}

export const KnowledgeGapsHeatmap: React.FC<KnowledgeGapsHeatmapProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  onLogStudyMinutes,
}) => {
  // Default to showing DSA & Government Exams prominently as requested
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('dsa_gov_focus');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'critical' | 'high_need' | 'developing' | 'mastered'
  >('all');
  const [activeReviewPlan, setActiveReviewPlan] = useState<{
    cell: TopicHeatmapCell;
    steps: string[];
    practiceQuestion: {
      question: string;
      options: string[];
      correctLetter: string;
      explanation: string;
    };
  } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isUpdatingMastery, setIsUpdatingMastery] = useState(false);
  const [localScoreBoosts, setLocalScoreBoosts] = useState<Record<string, number>>({});
  const [scheduledToast, setScheduledToast] = useState<string | null>(null);

  // Build heatmap cells from DSA + Government Exams + profile quiz performance history
  const heatmapCells: TopicHeatmapCell[] = useMemo(() => {
    const subjectsOrder = ['DSA', 'Government Exams', 'Python', 'Calculus'];
    const weakList = (profile.weakTopics || []).map((w) => w.toLowerCase());
    const strongList = (profile.strongTopics || []).map((s) => s.toLowerCase());
    const historyItems = profile.learningHistory || [];

    const cells: TopicHeatmapCell[] = [];

    subjectsOrder.forEach((subject) => {
      const templates = SUBJECT_CURRICULUM_TOPICS[subject] || [];
      templates.forEach((tpl, idx) => {
        const cellId = `heatmap_${subject.replace(/\s+/g, '_').toLowerCase()}_${idx}`;

        // Check if student's learningHistory has quiz scores for this topic or subject
        const matchingHistory = historyItems.filter(
          (h) =>
            h.topic.toLowerCase().includes(tpl.subCategory.toLowerCase()) ||
            tpl.topic.toLowerCase().includes(h.topic.toLowerCase())
        );

        const matchesWeak = weakList.some(
          (w) =>
            tpl.topic.toLowerCase().includes(w) ||
            tpl.subCategory.toLowerCase().includes(w) ||
            w.includes(tpl.subCategory.toLowerCase().split(' ')[0])
        );
        const matchesStrong = strongList.some(
          (s) =>
            tpl.topic.toLowerCase().includes(s) ||
            tpl.subCategory.toLowerCase().includes(s)
        );

        let score = tpl.defaultScore;
        if (matchingHistory.length > 0) {
          const scored = matchingHistory.find((h) => typeof h.score === 'number');
          if (scored && typeof scored.score === 'number') {
            score = scored.score;
          }
        }
        if (matchesWeak) score = Math.min(score, 44);
        if (matchesStrong) score = Math.max(score, 86);
        if (localScoreBoosts[cellId] !== undefined) {
          score = Math.min(100, localScoreBoosts[cellId]);
        }

        const status: TopicHeatmapCell['status'] =
          score < 48
            ? 'critical'
            : score < 60
            ? 'high_need'
            : score < 78
            ? 'developing'
            : 'mastered';

        const gapIntensity = Math.max(0, 100 - score);
        const recommendedStudyMinutes = computeRecommendedMinutes(score);
        const updatedHistory =
          localScoreBoosts[cellId] !== undefined
            ? [...tpl.quizHistory.slice(1), score]
            : tpl.quizHistory;

        cells.push({
          id: cellId,
          subject,
          subCategory: tpl.subCategory,
          topic: tpl.topic,
          masteryScore: score,
          gapIntensity,
          recommendedStudyMinutes,
          quizHistoryScores: updatedHistory,
          attempts: tpl.quizHistory.length + matchingHistory.length,
          lastTested: idx === 0 ? 'Today' : idx === 1 ? 'Yesterday' : `${idx + 1}d ago`,
          status,
          isWeakTopic: score < 60 || matchesWeak,
          keyConcepts: tpl.keyConcepts,
          commonPitfall: tpl.pitfall,
        });
      });
    });

    return cells;
  }, [
    profile.weakTopics,
    profile.strongTopics,
    profile.learningHistory,
    localScoreBoosts,
  ]);

  const filteredCells = useMemo(() => {
    return heatmapCells.filter((c) => {
      if (selectedSubjectFilter === 'dsa_gov_focus') {
        if (c.subject !== 'DSA' && c.subject !== 'Government Exams') return false;
      } else if (selectedSubjectFilter !== 'all' && c.subject !== selectedSubjectFilter) {
        return false;
      }

      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [heatmapCells, selectedSubjectFilter, statusFilter]);

  const groupedBySubject = useMemo(() => {
    const map = new Map<string, TopicHeatmapCell[]>();
    filteredCells.forEach((cell) => {
      const list = map.get(cell.subject) || [];
      list.push(cell);
      map.set(cell.subject, list);
    });
    return map;
  }, [filteredCells]);

  // Summary metrics specifically for DSA & Government Exams
  const dsaAndGovCells = useMemo(
    () => heatmapCells.filter((c) => c.subject === 'DSA' || c.subject === 'Government Exams'),
    [heatmapCells]
  );
  const criticalCount = dsaAndGovCells.filter((c) => c.status === 'critical').length;
  const highNeedCount = dsaAndGovCells.filter((c) => c.status === 'high_need').length;
  const developingCount = dsaAndGovCells.filter((c) => c.status === 'developing').length;
  const masteredCount = dsaAndGovCells.filter((c) => c.status === 'mastered').length;
  const totalRecommendedMinutes = dsaAndGovCells
    .filter((c) => c.status === 'critical' || c.status === 'high_need')
    .reduce((sum, c) => sum + c.recommendedStudyMinutes, 0);

  // Open targeted review drawer for a sub-topic cell
  const handleSelectCell = (cell: TopicHeatmapCell) => {
    setSelectedAnswer(null);
    setActiveReviewPlan({
      cell,
      steps: [
        `Core Invariant: Master ${cell.keyConcepts[0]} (${cell.subCategory}).`,
        `Exam Trap Alert: Avoid the #1 quiz error — ${cell.commonPitfall}`,
        `Recommended Study Block: Complete a ${cell.recommendedStudyMinutes}-minute focused practice sprint on ${cell.subCategory}.`,
      ],
      practiceQuestion: {
        question: `[${cell.subject} · ${cell.subCategory}] Based on your quiz history (${cell.masteryScore}% accuracy), which principle prevents "${cell.commonPitfall}"?`,
        options: [
          `A) Apply ${cell.keyConcepts[0]} and explicitly verify boundary invariants before execution`,
          `B) Skip edge-case validation and assume uniform input constraints`,
          `C) Use unoptimized brute-force traversal without state tracking`,
          `D) Ignore base conditions to shorten solution time`,
        ],
        correctLetter: 'A',
        explanation: `Correct! Grounding your approach in ${cell.keyConcepts[0]} directly resolves the quiz pitfall and boosts your ${cell.subCategory} mastery.`,
      },
    });
  };

  // Remediate gap & sync updated quiz mastery to profile + Firestore
  const handleRemediateSubTopic = async (cell: TopicHeatmapCell) => {
    setIsUpdatingMastery(true);
    const boostedScore = Math.min(100, cell.masteryScore + 28);
    setLocalScoreBoosts((prev) => ({ ...prev, [cell.id]: boostedScore }));

    if (onLogStudyMinutes) {
      onLogStudyMinutes(
        cell.recommendedStudyMinutes,
        `Heatmap Gap Remediation: [${cell.subject}] ${cell.subCategory}`
      );
    }

    const updatedWeak = (profile.weakTopics || []).filter(
      (t) =>
        !cell.topic.toLowerCase().includes(t.toLowerCase()) &&
        !cell.subCategory.toLowerCase().includes(t.toLowerCase())
    );
    const updatedStrong = Array.from(
      new Set([...(profile.strongTopics || []), `${cell.subject}: ${cell.subCategory}`])
    );
    const updatedHistory = [
      ...(profile.learningHistory || []),
      {
        topic: `${cell.subCategory}: ${cell.topic}`,
        subject: cell.subject,
        date: new Date().toISOString().split('T')[0],
        score: boostedScore,
        mastered: boostedScore >= 78,
      },
    ];

    const updatedProfile: StudentProfile = {
      ...profile,
      weakTopics: updatedWeak,
      strongTopics: updatedStrong,
      learningHistory: updatedHistory,
      overallProgress: Math.min(100, (profile.overallProgress || 65) + 2),
    };

    onProfileUpdate(updatedProfile);

    try {
      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            weakTopics: updatedWeak,
            strongTopics: updatedStrong,
            learningHistory: updatedHistory,
            overallProgress: updatedProfile.overallProgress,
          },
          { merge: true }
        );
      }
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weakTopics: updatedWeak,
          strongTopics: updatedStrong,
          learningHistory: updatedHistory,
          overallProgress: updatedProfile.overallProgress,
        }),
      }).catch(() => {});
    } catch {
      // Non-blocking fallback
    } finally {
      setIsUpdatingMastery(false);
      setScheduledToast(
        `Updated quiz mastery for "${cell.subCategory}" to ${boostedScore}% and logged +${cell.recommendedStudyMinutes}m study time!`
      );
      setTimeout(() => setScheduledToast(null), 4500);
    }
  };

  // Color-coded heatmap intensity styles (Higher gap need = deeper warm crimson/orange/amber intensity; High mastery = cool emerald)
  const getCellIntensityStyles = (status: TopicHeatmapCell['status']) => {
    switch (status) {
      case 'critical':
        return {
          card: 'bg-rose-950/75 hover:bg-rose-900/80 border-rose-500/70 shadow-lg shadow-rose-950/50',
          bar: 'bg-rose-500',
          scoreText: 'text-rose-300',
          intensityLabel: 'High Study Need · Critical Gap',
          needColor: 'text-rose-300',
        };
      case 'high_need':
        return {
          card: 'bg-orange-950/65 hover:bg-orange-900/70 border-orange-500/60 shadow-md shadow-orange-950/40',
          bar: 'bg-orange-500',
          scoreText: 'text-orange-300',
          intensityLabel: 'Elevated Study Need',
          needColor: 'text-orange-300',
        };
      case 'developing':
        return {
          card: 'bg-amber-950/45 hover:bg-amber-900/55 border-amber-500/45',
          bar: 'bg-amber-400',
          scoreText: 'text-amber-300',
          intensityLabel: 'Moderate Reinforcement',
          needColor: 'text-amber-300',
        };
      case 'mastered':
        return {
          card: 'bg-emerald-950/45 hover:bg-emerald-900/55 border-emerald-500/45',
          bar: 'bg-emerald-400',
          scoreText: 'text-emerald-300',
          intensityLabel: 'Strong Quiz Mastery',
          needColor: 'text-emerald-300',
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header & Color Intensity Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-rose-400">
            <Grid className="w-4 h-4" />
            <span>Knowledge Gaps Heatmap</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-amber-400">DSA & Government Exams Sub-Topic Intensity</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-400 font-mono tabular-nums">
              {totalRecommendedMinutes}m Priority Study Time Needed
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Quiz Performance History & Sub-Topic Study Time Intensity Matrix
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl">
            Color-coded heat intensity highlights which specific sub-topics in <strong className="text-slate-200">DSA</strong> and <strong className="text-slate-200">Government Exams</strong> need more study time based on your recent quiz performance history. Click any cell to inspect quiz trends and launch a targeted remediation session.
          </p>
        </div>

        {/* Interactive Intensity Legend Filter */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 border border-slate-800 p-1.5 rounded-xl text-xs self-start lg:self-center">
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              statusFilter === 'critical'
                ? 'bg-rose-500/20 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
            <span>Critical (&lt;48%)</span>
            <span className="font-mono tabular-nums text-rose-400">{criticalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'high_need' ? 'all' : 'high_need')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              statusFilter === 'high_need'
                ? 'bg-orange-500/20 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
            <span>High Need (48–59%)</span>
            <span className="font-mono tabular-nums text-orange-400">{highNeedCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'developing' ? 'all' : 'developing')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              statusFilter === 'developing'
                ? 'bg-amber-500/20 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
            <span>Developing (60–77%)</span>
            <span className="font-mono tabular-nums text-amber-400">{developingCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'mastered' ? 'all' : 'mastered')}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              statusFilter === 'mastered'
                ? 'bg-emerald-500/20 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
            <span>Mastered (78%+)</span>
            <span className="font-mono tabular-nums text-emerald-400">{masteredCount}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {scheduledToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{scheduledToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setScheduledToast(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Track Switcher Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('dsa_gov_focus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              selectedSubjectFilter === 'dsa_gov_focus'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            DSA & Government Exams Focus (12 Sub-Topics)
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('DSA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
              selectedSubjectFilter === 'DSA'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>DSA Only</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('Government Exams')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
              selectedSubjectFilter === 'Government Exams'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Government Exams Only</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              selectedSubjectFilter === 'all'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Curriculum Tracks
          </button>
        </div>

        {statusFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
          >
            Show All Intensity Levels
          </button>
        )}
      </div>

      {/* Heatmap Matrix Grouped by Track (DSA & Government Exams) */}
      <div className="space-y-6">
        {Array.from(groupedBySubject.entries()).map(([subject, cells]) => {
          const avgQuizAccuracy = Math.round(
            cells.reduce((acc, c) => acc + c.masteryScore, 0) / Math.max(1, cells.length)
          );
          const trackStudyMinsNeeded = cells
            .filter((c) => c.status !== 'mastered')
            .reduce((acc, c) => acc + c.recommendedStudyMinutes, 0);

          return (
            <div key={subject} className="space-y-3">
              {/* Track Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-sm font-bold text-white">{subject}</span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-rose-400 font-medium">
                    {cells.filter((c) => c.status === 'critical' || c.status === 'high_need').length}{' '}
                    high-intensity gaps
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-slate-400 font-mono tabular-nums">
                    +{trackStudyMinsNeeded}m recommended study time
                  </span>
                </div>

                <div className="text-xs text-slate-400 font-mono tabular-nums">
                  Avg Quiz Score: <strong className="text-white">{avgQuizAccuracy}%</strong>
                </div>
              </div>

              {/* 3-Column Color-Coded Sub-Topic Heatmap Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {cells.map((cell) => {
                  const style = getCellIntensityStyles(cell.status);
                  const isSelected = activeReviewPlan?.cell.id === cell.id;

                  return (
                    <button
                      key={cell.id}
                      type="button"
                      onClick={() => handleSelectCell(cell)}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        style.card
                      } ${isSelected ? 'ring-2 ring-white' : ''}`}
                    >
                      <div className="space-y-2.5">
                        {/* Unboxed Metadata Kicker: Sub-Category · Study Time Needed */}
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className={`font-semibold ${style.needColor}`}>
                            {cell.subCategory}
                          </span>
                          <span className="font-mono tabular-nums text-white font-bold">
                            {cell.masteryScore}% Quiz Avg
                          </span>
                        </div>

                        {/* Sub-Topic Title */}
                        <h4 className="text-xs font-bold text-white leading-snug">
                          {cell.topic}
                        </h4>

                        {/* Heat Intensity Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                              style={{ width: `${cell.masteryScore}%` }}
                            />
                          </div>

                          {/* Quiz Performance History Sparkline Bars + Study Time Needed */}
                          <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Quiz History:</span>
                              <span className="font-mono tabular-nums text-slate-200">
                                {cell.quizHistoryScores.map((s) => `${s}%`).join(' → ')}
                              </span>
                            </div>
                            <span className="font-mono tabular-nums font-semibold text-amber-300">
                              Need +{cell.recommendedStudyMinutes}m
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">{style.intensityLabel}</span>
                        <span className="font-semibold text-white flex items-center gap-1">
                          <span>Remediate</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Remediation Drawer when any Sub-Topic Cell is selected */}
      {activeReviewPlan && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3.5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400 font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>{activeReviewPlan.cell.subject}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span>{activeReviewPlan.cell.subCategory}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="font-mono tabular-nums text-rose-300">
                  Quiz Accuracy: {activeReviewPlan.cell.masteryScore}% (Needs +
                  {activeReviewPlan.cell.recommendedStudyMinutes}m Study Time)
                </span>
              </div>
              <h4 className="text-base font-bold text-white">
                Targeted Gap Remediation: {activeReviewPlan.cell.topic}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setActiveReviewPlan(null)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close remediation drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7 Cols: Actionable Study Briefing & Launch Controls */}
            <div className="lg:col-span-7 space-y-3">
              <div className="text-xs font-semibold text-slate-300">
                3-Step Sub-Topic Remediation Plan
              </div>

              <div className="space-y-2">
                {activeReviewPlan.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                  >
                    <span className="font-mono font-bold text-amber-400 shrink-0">
                      0{idx + 1}.
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToChat(
                      `I have a knowledge gap in ${activeReviewPlan.cell.subject} — "${activeReviewPlan.cell.topic}" (quiz score: ${activeReviewPlan.cell.masteryScore}%). Teach me ${activeReviewPlan.cell.keyConcepts.join(', ')} and help me avoid "${activeReviewPlan.cell.commonPitfall}".`
                    )
                  }
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Study Sub-Topic with AI Tutor</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToQuiz) {
                      onNavigateToQuiz();
                    } else {
                      onNavigateToChat(`/smart-quiz ${activeReviewPlan.cell.subCategory}`);
                    }
                  }}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Take Sub-Topic Remediation Quiz</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRemediateSubTopic(activeReviewPlan.cell)}
                  disabled={isUpdatingMastery}
                  className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isUpdatingMastery
                      ? 'Syncing...'
                      : `Log +${activeReviewPlan.cell.recommendedStudyMinutes}m & Boost Mastery`}
                  </span>
                </button>
              </div>
            </div>

            {/* Right 5 Cols: Instant Diagnostic Check */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  <span>Instant Sub-Topic Verification</span>
                </span>
                <span className="font-mono tabular-nums text-emerald-400">+28% Quiz Mastery</span>
              </div>

              <p className="text-xs text-white font-medium leading-relaxed">
                {activeReviewPlan.practiceQuestion.question}
              </p>

              <div className="space-y-1.5">
                {activeReviewPlan.practiceQuestion.options.map((opt) => {
                  const letter = opt.charAt(0);
                  const isChosen = selectedAnswer === letter;
                  const isCorrect = letter === activeReviewPlan.practiceQuestion.correctLetter;

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setSelectedAnswer(letter);
                        if (isCorrect) {
                          handleRemediateSubTopic(activeReviewPlan.cell);
                        }
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                        !selectedAnswer
                          ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                          : isChosen && isCorrect
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold'
                          : isChosen && !isCorrect
                          ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                          : isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950/40 border-slate-800/50 text-slate-500'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] leading-relaxed border ${
                    selectedAnswer === activeReviewPlan.practiceQuestion.correctLetter
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  }`}
                >
                  {activeReviewPlan.practiceQuestion.explanation}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
