import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip as RechartsTooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  Treemap,
} from 'recharts';
import {
  Grid,
  Sparkles,
  CheckCircle2,
  Play,
  Brain,
  Zap,
  ArrowRight,
  X,
  Target,
  BarChart2,
  Layers,
  History,
  TrendingUp,
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
  subject: string;
  subjectIdx: number;
  slotIdx: number;
  subCategory: string;
  topic: string;
  masteryScore: number; // 0 - 100 quiz accuracy %
  gapIntensity: number; // 0 - 100 struggle / gap score (100 - masteryScore)
  struggleScore: number; // Weighted struggle index from quiz errors + unmastered learning history
  recommendedStudyMinutes: number;
  quizHistoryScores: number[];
  attempts: number;
  historyMatchesCount: number;
  unmasteredSessionsCount: number;
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

const SUBJECTS_ORDER = [
  'DSA',
  'Government Exams',
  'Python',
  'Calculus',
  'Java',
  'Generative AI',
];

const MODULE_STAGE_LABELS = [
  'Stage 1: Foundations',
  'Stage 2: Core Logic',
  'Stage 3: Applied Patterns',
  'Stage 4: Edge Cases',
];

const SUBJECT_CURRICULUM_TOPICS: Record<string, SubTopicTemplate[]> = {
  DSA: [
    {
      subCategory: 'Dynamic Programming',
      topic: '0/1 Knapsack, LCS & Memoization State Transitions',
      defaultScore: 34,
      quizHistory: [28, 35, 38, 34],
      keyConcepts: [
        'Overlapping subproblems & memo table dimensions',
        '1D reverse-capacity space optimization',
        'Longest Common Subsequence (LCS) recurrence',
      ],
      pitfall:
        'Iterating capacity forward in 1D 0/1 Knapsack, accidentally reusing the same item multiple times.',
    },
    {
      subCategory: 'Graph Algorithms',
      topic: 'Dijkstra Shortest Paths, Bellman-Ford & Topological Sort',
      defaultScore: 43,
      quizHistory: [38, 42, 46, 43],
      keyConcepts: [
        'Priority Queue min-heap edge relaxation O((V+E) log V)',
        "Kahn's BFS in-degree cycle detection",
        'Disjoint Set Union (DSU) path compression',
      ],
      pitfall:
        'Applying Dijkstra on graphs with negative edge weights or forgetting to skip stale heap entries (d > dist[u]).',
    },
    {
      subCategory: 'Trees & Priority Queues',
      topic: 'Binary Search Tree (BST) Invariants, LCA & Morris Traversal',
      defaultScore: 56,
      quizHistory: [48, 52, 59, 56],
      keyConcepts: [
        'Strict [minVal, maxVal] range validation in O(n)',
        'Lowest Common Ancestor (LCA) single-pass recursion',
        'Two-Heap median maintenance (Max-Heap + Min-Heap)',
      ],
      pitfall:
        'Checking only immediate left/right children instead of passing global subtree range bounds during BST validation.',
    },
    {
      subCategory: 'Arrays & Sliding Window',
      topic: "Kadane's Subarray Sum, Two Pointers & Prefix Sums",
      defaultScore: 86,
      quizHistory: [78, 82, 88, 86],
      keyConcepts: [
        'Variable window expansion & contraction invariant',
        'Prefix sum hash map for subarray sum equals K',
        "Kadane's O(n) local vs global maximum",
      ],
      pitfall:
        'Using two pointers on arrays containing negative numbers for subarray sum problems instead of Prefix Sum + HashMap.',
    },
  ],
  'Government Exams': [
    {
      subCategory: 'Indian Polity & Constitution',
      topic: 'Fundamental Rights (Art 12–35), Writs & Parliamentary Bills',
      defaultScore: 39,
      quizHistory: [32, 38, 42, 39],
      keyConcepts: [
        'Articles 14–32 & 5 Constitutional Writs (Habeas Corpus to Quo Warranto)',
        'Basic Structure Doctrine (Kesavananda Bharati 1973)',
        'Money Bill (Art 110) vs Financial Bill & Joint Sitting',
      ],
      pitfall:
        'Confusing Fundamental Rights available only to Citizens (Articles 15, 16, 19, 29, 30) with rights available to all persons.',
    },
    {
      subCategory: 'SSC Quantitative Aptitude',
      topic: 'Time & Work LCM, Compound Profit/Loss & Circle Geometry',
      defaultScore: 47,
      quizHistory: [40, 44, 50, 47],
      keyConcepts: [
        'Successive percentage change A + B + (AB)/100',
        'Total Work = LCM of days efficiency method',
        'Circle secant-tangent PT² = PA·PB & triangle similarity',
      ],
      pitfall:
        'Calculating discount on Cost Price (CP) instead of Marked Price (MP) in compound markup-discount questions.',
    },
    {
      subCategory: 'Banking Puzzles & Monetary Policy',
      topic: 'Circular Seating Arrangements, Syllogisms & RBI Repo/CRR',
      defaultScore: 63,
      quizHistory: [56, 60, 65, 63],
      keyConcepts: [
        '8-person Circular Arrangement (inward vs outward facing)',
        'Only-a-few Syllogism Venn diagram possibility rules',
        'Repo Rate, SDF, Reverse Repo, CRR & SLR instruments',
      ],
      pitfall:
        'Reversing left/right seating directions when some persons face the center and others face outward.',
    },
    {
      subCategory: 'CSAT Data Interpretation',
      topic: 'Ratio-Percentage Tables, Alligation & Caselet Speed Math',
      defaultScore: 84,
      quizHistory: [76, 80, 86, 84],
      keyConcepts: [
        'Reciprocal fraction-to-percentage benchmarks (1/6 to 1/19)',
        'Weighted average & Alligation cross-difference rule',
        'Approximation techniques for multi-chart DI sets',
      ],
      pitfall:
        'Using the wrong base year denominator when computing percentage growth across consecutive bars.',
    },
  ],
  Python: [
    {
      subCategory: 'Recursion & Call Stack',
      topic: 'Recursive Backtracking, Stack Frames & LEGB Scope Rules',
      defaultScore: 42,
      quizHistory: [36, 40, 45, 42],
      keyConcepts: [
        'Call stack activation records & base case return',
        'LEGB (Local, Enclosing, Global, Built-in) resolution',
        'Mutable default argument pitfall in function definitions',
      ],
      pitfall:
        'Forgetting to return the recursive call result or mutating shared default list arguments across invocations.',
    },
    {
      subCategory: 'Asyncio & Concurrency',
      topic: 'Event Loop Coroutines, Generators & Context Managers',
      defaultScore: 54,
      quizHistory: [48, 52, 57, 54],
      keyConcepts: [
        'Non-blocking await asyncio.gather() concurrency',
        'Lazy yield generators & memory-efficient pipelines',
        'Custom __enter__ and __exit__ resource cleanup',
      ],
      pitfall:
        'Calling synchronous time.sleep() inside an async coroutine and freezing the entire single-threaded event loop.',
    },
    {
      subCategory: 'OOP & Dunder Protocols',
      topic: 'Metaclasses, MRO Diamond Inheritance & Descriptor Protocol',
      defaultScore: 71,
      quizHistory: [64, 68, 74, 71],
      keyConcepts: [
        'C3 Linearization Method Resolution Order (MRO)',
        '__slots__ memory layout optimization',
        '@property getter/setter descriptor mechanics',
      ],
      pitfall:
        'Hardcoding parent class calls instead of using super() in cooperative multiple inheritance hierarchies.',
    },
    {
      subCategory: 'Comprehensions & Itertools',
      topic: 'Dictionary/List Comprehensions, Slicing & Functional Map/Filter',
      defaultScore: 89,
      quizHistory: [82, 86, 91, 89],
      keyConcepts: [
        'Nested comprehension filtering order',
        'Shallow vs deep copy reference semantics',
        'itertools.groupby andislice lazy iteration',
      ],
      pitfall:
        'Creating 2D matrices via [[0]*cols]*rows which aliases all inner row references to the same list object.',
    },
  ],
  Calculus: [
    {
      subCategory: 'Integration by Parts',
      topic: 'LIATE Integration by Parts, Trig Substitution & Improper Bounds',
      defaultScore: 38,
      quizHistory: [30, 35, 41, 38],
      keyConcepts: [
        'LIATE priority rule for choosing u and dv',
        'Definite u-substitution limit transformation',
        'Improper integral convergence p-test',
      ],
      pitfall:
        'Forgetting to update lower and upper integration bounds [a, b] when substituting u = g(x).',
    },
    {
      subCategory: 'Differential Equations',
      topic: 'Separable ODEs, Integrating Factors & 2nd-Order Characteristic Roots',
      defaultScore: 49,
      quizHistory: [42, 46, 52, 49],
      keyConcepts: [
        'First-order linear ODE integrating factor e^(∫P(x)dx)',
        'Initial Value Problem (IVP) constant C evaluation',
        'Homogeneous vs non-homogeneous particular solutions',
      ],
      pitfall:
        'Dropping the absolute value or integration constant C before applying initial boundary conditions.',
    },
    {
      subCategory: 'Multivariable & Gradients',
      topic: 'Partial Derivatives, Directional Gradients & Lagrange Multipliers',
      defaultScore: 66,
      quizHistory: [58, 63, 68, 66],
      keyConcepts: [
        'Gradient vector ∇f points in steepest ascent direction',
        'Multivariable Chain Rule tree diagram',
        'Hessian determinant saddle-point second derivative test',
      ],
      pitfall:
        'Not normalizing the direction vector u into a unit vector before taking the dot product ∇f · u.',
    },
    {
      subCategory: 'Limits & Derivatives',
      topic: "L'Hôpital's Rule, Continuity & Implicit Differentiation",
      defaultScore: 83,
      quizHistory: [76, 80, 85, 83],
      keyConcepts: [
        'Indeterminate forms 0/0 and ∞/∞ verification',
        'Implicit dy/dx chain rule differentiation',
        'Mean Value Theorem & Rolle Theorem conditions',
      ],
      pitfall:
        "Applying L'Hôpital's Rule directly to a non-indeterminate limit without first verifying 0/0 or ∞/∞.",
    },
  ],
  Java: [
    {
      subCategory: 'Concurrency & Locks',
      topic: 'Volatile Memory Visibility, ReentrantLock & CompletableFuture',
      defaultScore: 45,
      quizHistory: [38, 43, 48, 45],
      keyConcepts: [
        'Java Memory Model happens-before visibility guarantee',
        'AtomicInteger CAS vs synchronized intrinsic locks',
        'ThreadPoolExecutor queue sizing & rejection policies',
      ],
      pitfall:
        'Assuming volatile guarantees atomicity for compound read-modify-write operations like count++.',
    },
    {
      subCategory: 'JVM Memory & GC',
      topic: 'Heap Generations (Eden/Survivor/Tenured), G1GC & ClassLoader',
      defaultScore: 58,
      quizHistory: [50, 55, 60, 58],
      keyConcepts: [
        'Stack frame primitives vs Heap object references',
        'Reachability roots & memory leak prevention',
        'String Pool interning & Metaspace allocation',
      ],
      pitfall:
        'Retaining static collection references to short-lived listeners, preventing garbage collection.',
    },
    {
      subCategory: 'Generics & Streams API',
      topic: 'PECS Wildcards (? extends / ? super) & Parallel Stream Collectors',
      defaultScore: 73,
      quizHistory: [66, 70, 75, 73],
      keyConcepts: [
        'Producer Extends, Consumer Super (PECS) invariance',
        'Type erasure & bridge methods at compile time',
        'Collectors.groupingBy and partitioningBy reductions',
      ],
      pitfall:
        'Mutating shared external state inside a parallelStream().forEach() lambda, causing race conditions.',
    },
    {
      subCategory: 'Collections & HashMap',
      topic: 'HashMap Bucket Treeification, equals/hashCode Contract & TreeSet',
      defaultScore: 85,
      quizHistory: [78, 82, 87, 85],
      keyConcepts: [
        'O(1) lookup to O(log n) Red-Black tree threshold (8)',
        'Reflexive, symmetric, transitive equals() & hashCode()',
        'ConcurrentHashMap segment bucket locking',
      ],
      pitfall:
        'Mutating a key field after inserting it into a HashMap, making the entry unreachable in its original bucket.',
    },
  ],
  'Generative AI': [
    {
      subCategory: 'RAG & Vector Search',
      topic: 'Semantic Chunking, HNSW Cosine Similarity & Hybrid Reranking',
      defaultScore: 46,
      quizHistory: [40, 44, 49, 46],
      keyConcepts: [
        'Sliding window chunk overlap to preserve cross-boundary context',
        'Dense vector cosine similarity + BM25 lexical fusion (RRF)',
        'Cross-encoder reranking & citation grounding',
      ],
      pitfall:
        'Using fixed character chunking without overlap, splitting definitions and formulas across chunk boundaries.',
    },
    {
      subCategory: 'Agentic Tool Calling',
      topic: 'ReAct Loops, Structured JSON Schema Output & Guardrails',
      defaultScore: 55,
      quizHistory: [48, 52, 58, 55],
      keyConcepts: [
        'Deterministic function declaration parameter schemas',
        'Thought-Action-Observation loop termination guards',
        'Hallucination verification against retrieved context',
      ],
      pitfall:
        'Allowing unbounded recursive tool-calling loops without max-step budgets or schema validation.',
    },
    {
      subCategory: 'Transformer Attention',
      topic: 'Scaled Dot-Product Self-Attention, KV Cache & RoPE Positional Encoding',
      defaultScore: 68,
      quizHistory: [60, 65, 71, 68],
      keyConcepts: [
        'Softmax(QK^T / sqrt(d_k))V variance scaling factor',
        'Multi-Head Attention subspace projection',
        'KV-Cache memory bandwidth optimization during decoding',
      ],
      pitfall:
        'Omitting the 1/sqrt(d_k) scaling factor, pushing dot products into saturated softmax regions with vanishing gradients.',
    },
    {
      subCategory: 'Prompt Engineering & Eval',
      topic: 'Few-Shot Chain-of-Thought, System Instructions & LLM-as-a-Judge',
      defaultScore: 87,
      quizHistory: [80, 84, 89, 87],
      keyConcepts: [
        'System role boundary & structured rubric evaluation',
        'Temperature / Top-P sampling control for factual tasks',
        'Ground-truth precision & recall RAG evaluation',
      ],
      pitfall:
        'Using high temperature (>0.8) on strict extraction or schema-constrained classification prompts.',
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

function getGapHeatPalette(status: TopicHeatmapCell['status']) {
  switch (status) {
    case 'critical':
      return {
        fill: '#f43f5e', // rose-500
        stroke: '#fda4af',
        text: '#ffe4e6',
        label: 'Critical Struggle',
      };
    case 'high_need':
      return {
        fill: '#f97316', // orange-500
        stroke: '#fdba74',
        text: '#ffedd5',
        label: 'High Struggle',
      };
    case 'developing':
      return {
        fill: '#eab308', // amber-500
        stroke: '#fde047',
        text: '#fef9c3',
        label: 'Developing',
      };
    case 'mastered':
      return {
        fill: '#10b981', // emerald-500
        stroke: '#6ee7b7',
        text: '#d1fae5',
        label: 'Mastered',
      };
  }
}

// Custom SVG Heatmap Tile for Recharts ScatterChart Matrix
const RechartsHeatmapMatrixTile = (props: any) => {
  const { cx, cy, payload, selectedCellId, onSelectCell, metricMode } = props;
  if (cx === undefined || cy === undefined || !payload) return null;

  const cell: TopicHeatmapCell = payload;
  const tileWidth = 132;
  const tileHeight = 52;
  const x = cx - tileWidth / 2;
  const y = cy - tileHeight / 2;
  const palette = getGapHeatPalette(cell.status);
  const isSelected = selectedCellId === cell.id;

  const shortTitle =
    cell.subCategory.length > 18
      ? cell.subCategory.slice(0, 17) + '…'
      : cell.subCategory;

  const primaryMetric =
    metricMode === 'struggle'
      ? `${cell.gapIntensity}% Gap`
      : `${cell.masteryScore}% Quiz`;

  return (
    <g
      onClick={() => onSelectCell && onSelectCell(cell)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={x}
        y={y}
        width={tileWidth}
        height={tileHeight}
        rx={10}
        ry={10}
        fill={palette.fill}
        fillOpacity={
          isSelected
            ? 0.96
            : cell.status === 'critical'
            ? 0.88
            : cell.status === 'high_need'
            ? 0.82
            : 0.72
        }
        stroke={isSelected ? '#ffffff' : palette.stroke}
        strokeWidth={isSelected ? 2.5 : 1.2}
      />
      <text
        x={cx}
        y={cy - 7}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={10.5}
        fontWeight={700}
      >
        {shortTitle}
      </text>
      <text
        x={cx}
        y={cy + 11}
        textAnchor="middle"
        fill={palette.text}
        fontSize={11}
        fontWeight={800}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {primaryMetric} · +{cell.recommendedStudyMinutes}m
      </text>
    </g>
  );
};

// Custom Treemap Node sized by Struggle Intensity (Gap %)
const RechartsStruggleTreemapNode = (props: any) => {
  const { x, y, width, height, name, gapIntensity, masteryScore, status } = props;
  if (width < 36 || height < 28 || gapIntensity === undefined) return null;
  const palette = getGapHeatPalette(status || 'developing');

  return (
    <g>
      <rect
        x={x + 2}
        y={y + 2}
        width={Math.max(0, width - 4)}
        height={Math.max(0, height - 4)}
        rx={8}
        ry={8}
        fill={palette.fill}
        fillOpacity={0.84}
        stroke="#0f172a"
        strokeWidth={2}
      />
      {width > 78 && height > 42 && (
        <>
          <text
            x={x + 10}
            y={y + 20}
            fill="#ffffff"
            fontSize={11}
            fontWeight={700}
          >
            {String(name).length > 22 ? String(name).slice(0, 21) + '…' : name}
          </text>
          <text
            x={x + 10}
            y={y + 36}
            fill={palette.text}
            fontSize={11}
            fontWeight={800}
          >
            {gapIntensity}% Struggle Gap ({masteryScore}% Quiz)
          </text>
        </>
      )}
    </g>
  );
};

export const KnowledgeGapsHeatmap: React.FC<KnowledgeGapsHeatmapProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  onLogStudyMinutes,
}) => {
  const [viewMode, setViewMode] = useState<
    'recharts_matrix' | 'struggle_ranking' | 'radar' | 'treemap' | 'both'
  >('both');
  const [metricMode, setMetricMode] = useState<'struggle' | 'mastery'>('struggle');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
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

  // Overall student quiz accuracy from profile telemetry
  const overallQuizAccuracy = useMemo(() => {
    if (profile.totalQuestionsAnswered > 0) {
      return Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100);
    }
    return 72;
  }, [profile.totalQuestionsAnswered, profile.correctAnswers]);

  // Build heatmap cells from all study subjects + profile learningHistory & quiz performance
  const heatmapCells: TopicHeatmapCell[] = useMemo(() => {
    const weakList = (profile.weakTopics || []).map((w) => w.toLowerCase());
    const strongList = (profile.strongTopics || []).map((s) => s.toLowerCase());
    const historyItems = profile.learningHistory || [];

    // Dynamically adjust baseline if user's overall quiz accuracy deviates from 72%
    const accuracyDelta = Math.round((overallQuizAccuracy - 72) * 0.35);

    const cells: TopicHeatmapCell[] = [];

    SUBJECTS_ORDER.forEach((subject, subjectIdx) => {
      const templates = SUBJECT_CURRICULUM_TOPICS[subject] || [];
      templates.forEach((tpl, slotIdx) => {
        const cellId = `heatmap_${subject.replace(/\s+/g, '_').toLowerCase()}_${slotIdx}`;

        // Match student's learningHistory records for this topic or subCategory
        const matchingHistory = historyItems.filter(
          (h) =>
            h.topic.toLowerCase().includes(tpl.subCategory.toLowerCase()) ||
            tpl.topic.toLowerCase().includes(h.topic.toLowerCase()) ||
            (h.subject.toLowerCase() === subject.toLowerCase() &&
              h.topic.toLowerCase().split(' ').some((w) => w.length > 3 && tpl.subCategory.toLowerCase().includes(w)))
        );

        const unmasteredSessionsCount = matchingHistory.filter((h) => !h.mastered).length;
        const masteredSessionsCount = matchingHistory.filter((h) => h.mastered).length;

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

        let score = Math.max(18, Math.min(96, tpl.defaultScore + accuracyDelta));

        if (matchingHistory.length > 0) {
          const scoredEntries = matchingHistory.filter((h) => typeof h.score === 'number');
          if (scoredEntries.length > 0) {
            const avgHistoryScore = Math.round(
              scoredEntries.reduce((acc, curr) => acc + (curr.score || 0), 0) /
                scoredEntries.length
            );
            score = avgHistoryScore;
          } else if (unmasteredSessionsCount > masteredSessionsCount) {
            score = Math.min(score, 44);
          } else if (masteredSessionsCount > 0) {
            score = Math.max(score, 84);
          }
        }

        if (matchesWeak) score = Math.min(score, 43);
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
        // Weighted struggle score factors in quiz error rate + unmastered learning history attempts + weak topic flag
        const struggleScore = Math.min(
          100,
          Math.round(
            gapIntensity +
              unmasteredSessionsCount * 6 +
              (matchesWeak ? 8 : 0) -
              masteredSessionsCount * 4
          )
        );

        const recommendedStudyMinutes = computeRecommendedMinutes(score);
        const updatedHistory =
          localScoreBoosts[cellId] !== undefined
            ? [...tpl.quizHistory.slice(1), score]
            : tpl.quizHistory;

        const latestHistoryDate = matchingHistory[matchingHistory.length - 1]?.date;

        cells.push({
          id: cellId,
          subject,
          subjectIdx,
          slotIdx,
          subCategory: tpl.subCategory,
          topic: tpl.topic,
          masteryScore: score,
          gapIntensity,
          struggleScore,
          recommendedStudyMinutes,
          quizHistoryScores: updatedHistory,
          attempts: tpl.quizHistory.length + matchingHistory.length,
          historyMatchesCount: matchingHistory.length,
          unmasteredSessionsCount,
          lastTested:
            latestHistoryDate ||
            (slotIdx === 0 ? 'Today' : slotIdx === 1 ? 'Yesterday' : `${slotIdx + 1}d ago`),
          status,
          isWeakTopic: score < 60 || matchesWeak || unmasteredSessionsCount > 0,
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
    overallQuizAccuracy,
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

  // Top struggled topics sorted by highest gapIntensity / struggleScore
  const topStruggledTopics = useMemo(() => {
    return [...filteredCells]
      .sort((a, b) => b.struggleScore - a.struggleScore || a.masteryScore - b.masteryScore)
      .slice(0, 10);
  }, [filteredCells]);

  // Treemap data weighted by Gap Intensity so largest struggle blocks stand out visually
  const struggleTreemapData = useMemo(() => {
    return filteredCells.map((cell) => ({
      name: `${cell.subject}: ${cell.subCategory}`,
      size: Math.max(15, cell.gapIntensity),
      gapIntensity: cell.gapIntensity,
      masteryScore: cell.masteryScore,
      status: cell.status,
      cell,
    }));
  }, [filteredCells]);

  const groupedBySubject = useMemo(() => {
    const map = new Map<string, TopicHeatmapCell[]>();
    filteredCells.forEach((cell) => {
      const list = map.get(cell.subject) || [];
      list.push(cell);
      map.set(cell.subject, list);
    });
    return map;
  }, [filteredCells]);

  // Summary metrics across all curriculum cells
  const criticalCount = heatmapCells.filter((c) => c.status === 'critical').length;
  const highNeedCount = heatmapCells.filter((c) => c.status === 'high_need').length;
  const developingCount = heatmapCells.filter((c) => c.status === 'developing').length;
  const masteredCount = heatmapCells.filter((c) => c.status === 'mastered').length;
  const totalRecommendedMinutes = heatmapCells
    .filter((c) => c.status === 'critical' || c.status === 'high_need')
    .reduce((sum, c) => sum + c.recommendedStudyMinutes, 0);

  // Compute Radar Chart data comparing relative Strength (Mastery %) vs Knowledge Gap (Deficit %) across study subjects
  const subjectRadarData = useMemo(() => {
    return SUBJECTS_ORDER.map((subj) => {
      const cells = heatmapCells.filter((c) => c.subject === subj);
      const strength =
        cells.length > 0
          ? Math.round(cells.reduce((sum, c) => sum + c.masteryScore, 0) / cells.length)
          : 65;
      const knowledgeGap = Math.max(0, 100 - strength);
      const targetBenchmark = 80;
      const weakestCell = [...cells].sort((a, b) => a.masteryScore - b.masteryScore)[0];
      const strongestCell = [...cells].sort((a, b) => b.masteryScore - a.masteryScore)[0];
      return {
        subject: subj,
        shortSubject:
          subj === 'Government Exams'
            ? 'Gov Exams'
            : subj === 'Generative AI'
            ? 'Gen AI'
            : subj,
        strength,
        knowledgeGap,
        targetBenchmark,
        weakestSubTopic: weakestCell?.subCategory || subj,
        strongestSubTopic: strongestCell?.subCategory || subj,
        weakestCell,
      };
    });
  }, [heatmapCells]);

  const strongestSubject = useMemo(
    () => [...subjectRadarData].sort((a, b) => b.strength - a.strength)[0],
    [subjectRadarData]
  );
  const weakestSubject = useMemo(
    () => [...subjectRadarData].sort((a, b) => a.strength - b.strength)[0],
    [subjectRadarData]
  );

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
        question: `[${cell.subject} · ${cell.subCategory}] Based on your quiz history (${cell.masteryScore}% accuracy, ${cell.gapIntensity}% gap), which principle prevents "${cell.commonPitfall}"?`,
        options: [
          `A) Apply ${cell.keyConcepts[0]} and explicitly verify boundary invariants before execution`,
          `B) Skip edge-case validation and assume uniform input constraints`,
          `C) Use unoptimized brute-force traversal without state tracking`,
          `D) Ignore base conditions to shorten solution time`,
        ],
        correctLetter: 'A',
        explanation: `Correct! Grounding your approach in ${cell.keyConcepts[0]} directly resolves the quiz pitfall and closes your ${cell.subCategory} knowledge gap.`,
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
            userId: profile.userId,
            name: profile.name || 'Student',
            preferredLanguage: profile.preferredLanguage || 'English',
            weakTopics: updatedWeak,
            strongTopics: updatedStrong,
            learningHistory: updatedHistory,
            overallProgress: updatedProfile.overallProgress,
            updatedAt: new Date().toISOString(),
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
        `Closed knowledge gap in "${cell.subCategory}"! Mastery boosted to ${boostedScore}% and logged +${cell.recommendedStudyMinutes}m study time.`
      );
      setTimeout(() => setScheduledToast(null), 4500);
    }
  };

  const getCellIntensityStyles = (status: TopicHeatmapCell['status']) => {
    switch (status) {
      case 'critical':
        return {
          card: 'bg-rose-950/75 hover:bg-rose-900/80 border-rose-500/70 shadow-lg shadow-rose-950/50',
          bar: 'bg-rose-500',
          scoreText: 'text-rose-300',
          intensityLabel: 'Critical Struggle · Priority Gap',
          needColor: 'text-rose-300',
        };
      case 'high_need':
        return {
          card: 'bg-orange-950/65 hover:bg-orange-900/70 border-orange-500/60 shadow-md shadow-orange-950/40',
          bar: 'bg-orange-500',
          scoreText: 'text-orange-300',
          intensityLabel: 'High Struggle · Needs Practice',
          needColor: 'text-orange-300',
        };
      case 'developing':
        return {
          card: 'bg-amber-950/45 hover:bg-amber-900/55 border-amber-500/45',
          bar: 'bg-amber-400',
          scoreText: 'text-amber-300',
          intensityLabel: 'Developing Mastery',
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
      {/* Header & Recharts Visualization Mode Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-rose-400">
            <Grid className="w-4 h-4" />
            <span>Recharts Knowledge Gaps Heatmap</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-emerald-400">
              Quiz Accuracy ({overallQuizAccuracy}% across {profile.totalQuestionsAnswered || 0} Qs)
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-indigo-400 flex items-center gap-1">
              <History className="w-3.5 h-3.5" />
              <span>{(profile.learningHistory || []).length} Learning History Logs</span>
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-400 font-mono tabular-nums">
              {totalRecommendedMinutes}m Priority Remediation
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Knowledge Gaps Heatmap: Topics You Struggle With Most
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl">
            Interactive Recharts heatmap analyzing your <strong className="text-slate-200">learning history, flagged weak topics, and quiz performance</strong> across <strong className="text-slate-200">DSA, Government Exams, Python, Calculus, Java, and Generative AI</strong>. Click any heatmap cell or struggle bar to launch a targeted Socratic remediation drill.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start xl:self-center">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === 'both'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Views
            </button>
            <button
              type="button"
              onClick={() => setViewMode('recharts_matrix')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'recharts_matrix'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>2D Heatmap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('struggle_ranking')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'struggle_ranking'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Struggle Ranking</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('treemap')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'treemap'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gap Treemap</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('radar')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'radar'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Subject Radar</span>
            </button>
          </div>
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

      {/* Interactive Subject & Struggle Tier Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              selectedSubjectFilter === 'all'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Subjects ({heatmapCells.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('dsa_gov_focus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              selectedSubjectFilter === 'dsa_gov_focus'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            DSA &amp; Gov Exams
          </button>
          {SUBJECTS_ORDER.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSelectedSubjectFilter(subj)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedSubjectFilter === subj
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        {/* Interactive Intensity Legend Filter */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 border border-slate-800 p-1.5 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              statusFilter === 'critical'
                ? 'bg-rose-500/20 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
            <span>Critical Struggle (&lt;48%)</span>
            <span className="font-mono tabular-nums text-rose-400">{criticalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'high_need' ? 'all' : 'high_need')}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
              statusFilter === 'high_need'
                ? 'bg-orange-500/20 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
            <span>High Struggle (48–59%)</span>
            <span className="font-mono tabular-nums text-orange-400">{highNeedCount}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === 'developing' ? 'all' : 'developing')
            }
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
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
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
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

      {/* SECTION 1: Recharts 2D Knowledge Gaps Heatmap Matrix & Top Struggled Topics BarChart */}
      {(viewMode === 'both' ||
        viewMode === 'recharts_matrix' ||
        viewMode === 'struggle_ranking' ||
        viewMode === 'treemap') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5">
          {/* Left 7 Cols: Recharts 2D Heatmap Matrix (or Treemap when selected) */}
          <div
            className={`${
              viewMode === 'recharts_matrix' || viewMode === 'treemap'
                ? 'lg:col-span-12'
                : viewMode === 'struggle_ranking'
                ? 'hidden'
                : 'lg:col-span-7'
            } flex flex-col justify-between space-y-3`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Grid className="w-4 h-4 text-rose-400" />
                  <span>
                    {viewMode === 'treemap'
                      ? 'Recharts Knowledge Gap Treemap (Sized by Struggle Intensity)'
                      : 'Recharts 2D Knowledge Gaps Heatmap Matrix'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Deep crimson &amp; orange cells reveal topics with the highest quiz error rates and unmastered learning history sessions.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMetricMode('struggle')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    metricMode === 'struggle'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Show Gap %
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode('mastery')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    metricMode === 'mastery'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Show Quiz %
                </button>
              </div>
            </div>

            {viewMode === 'treemap' ? (
              <div className="w-full h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={struggleTreemapData}
                    dataKey="size"
                    stroke="#0f172a"
                    fill="#f43f5e"
                    content={<RechartsStruggleTreemapNode />}
                    onClick={(node: any) => {
                      if (node && node.cell) {
                        handleSelectCell(node.cell);
                      }
                    }}
                  >
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload;
                        const cell: TopicHeatmapCell = item.cell;
                        if (!cell) return null;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5">
                            <div className="font-bold text-white">
                              {cell.subject} · {cell.subCategory}
                            </div>
                            <div className="text-slate-300 text-[11px]">{cell.topic}</div>
                            <div className="flex items-center gap-3 pt-1 border-t border-slate-800 font-mono tabular-nums text-[11px]">
                              <span className="text-rose-400 font-bold">
                                Struggle Gap: {cell.gapIntensity}%
                              </span>
                              <span className="text-emerald-400">
                                Quiz Accuracy: {cell.masteryScore}%
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full h-[370px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 18, right: 28, bottom: 18, left: 108 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      type="number"
                      dataKey="slotIdx"
                      name="Curriculum Stage"
                      domain={[-0.5, 3.5]}
                      ticks={[0, 1, 2, 3]}
                      tickFormatter={(val) => MODULE_STAGE_LABELS[Number(val)] || `Topic ${Number(val) + 1}`}
                      stroke="#94a3b8"
                      tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="subjectIdx"
                      name="Subject"
                      domain={[-0.5, SUBJECTS_ORDER.length - 0.5]}
                      ticks={SUBJECTS_ORDER.map((_, idx) => idx)}
                      tickFormatter={(val) => {
                        const s = SUBJECTS_ORDER[Number(val)] || '';
                        return s === 'Government Exams' ? 'Gov Exams' : s;
                      }}
                      stroke="#94a3b8"
                      tick={{ fill: '#f8fafc', fontSize: 11, fontWeight: 700 }}
                    />
                    <ZAxis type="number" dataKey="gapIntensity" range={[450, 450]} />
                    <RechartsTooltip
                      cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const cell = payload[0].payload as TopicHeatmapCell;
                        const palette = getGapHeatPalette(cell.status);
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 max-w-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-white">
                                {cell.subject} · {cell.subCategory}
                              </span>
                              <span
                                className="font-mono tabular-nums font-bold"
                                style={{ color: palette.fill }}
                              >
                                {cell.gapIntensity}% Gap
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-200 font-medium leading-snug">
                              {cell.topic}
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800 text-[11px] font-mono tabular-nums">
                              <div>
                                <span className="text-slate-400">Quiz Accuracy: </span>
                                <strong className="text-emerald-400">{cell.masteryScore}%</strong>
                              </div>
                              <div>
                                <span className="text-slate-400">Attempts: </span>
                                <strong className="text-white">{cell.attempts}</strong>
                              </div>
                              <div>
                                <span className="text-slate-400">Study Needed: </span>
                                <strong className="text-amber-300">
                                  +{cell.recommendedStudyMinutes}m
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-400">Last Tested: </span>
                                <strong className="text-slate-300">{cell.lastTested}</strong>
                              </div>
                            </div>
                            <div className="text-[10px] text-rose-300 pt-1 border-t border-slate-800/80">
                              Pitfall: {cell.commonPitfall}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      name="Topic Knowledge Gaps"
                      data={filteredCells}
                      shape={
                        <RechartsHeatmapMatrixTile
                          selectedCellId={activeReviewPlan?.cell.id}
                          onSelectCell={handleSelectCell}
                          metricMode={metricMode}
                        />
                      }
                    >
                      {filteredCells.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={getGapHeatPalette(entry.status).fill}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Recharts BarChart of Topics the Student Struggles With Most */}
          {viewMode !== 'recharts_matrix' && viewMode !== 'treemap' && (
            <div
              className={`${
                viewMode === 'struggle_ranking' ? 'lg:col-span-12' : 'lg:col-span-5'
              } flex flex-col justify-between space-y-3`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-rose-400" />
                    <span>Topics You Struggle With Most (Gap Severity %)</span>
                  </h4>
                  <span className="text-[11px] text-rose-300 font-mono tabular-nums">
                    Top {topStruggledTopics.length} Struggles
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ranked by quiz error rate &amp; unmastered learning history sessions. Click any bar to remediate.
                </p>
              </div>

              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topStruggledTopics}
                    layout="vertical"
                    margin={{ top: 6, right: 24, left: 118, bottom: 6 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      unit="%"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="subCategory"
                      stroke="#94a3b8"
                      tick={{ fill: '#f1f5f9', fontSize: 11, fontWeight: 600 }}
                      width={114}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const cell = payload[0].payload as TopicHeatmapCell;
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1">
                            <div className="font-bold text-white">
                              {cell.subject}: {cell.subCategory}
                            </div>
                            <div className="text-slate-300 text-[11px]">{cell.topic}</div>
                            <div className="text-rose-400 font-mono tabular-nums font-semibold pt-1">
                              Struggle Gap: {cell.gapIntensity}% · Quiz Score: {cell.masteryScore}%
                            </div>
                            <div className="text-amber-300 font-mono tabular-nums text-[11px]">
                              Recommended Remediation: +{cell.recommendedStudyMinutes} mins
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="gapIntensity"
                      name="Knowledge Gap (%)"
                      radius={[0, 6, 6, 0]}
                      onClick={(barData: any) => {
                        const cell = barData?.payload || barData;
                        if (cell && cell.id) {
                          handleSelectCell(cell as TopicHeatmapCell);
                        }
                      }}
                    >
                      {topStruggledTopics.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={getGapHeatPalette(entry.status).fill}
                          cursor="pointer"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {topStruggledTopics[0] && (
                <button
                  type="button"
                  onClick={() => handleSelectCell(topStruggledTopics[0])}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    Practice #1 Struggle Topic: {topStruggledTopics[0].subject} ·{' '}
                    {topStruggledTopics[0].subCategory} ({topStruggledTopics[0].gapIntensity}% Gap)
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Multi-Axis Subject Strength vs. Knowledge Gap Radar Chart */}
      {(viewMode === 'both' || viewMode === 'radar') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-5">
          {/* Left 7 Cols: Interactive Recharts RadarChart */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span>Multi-Subject Strength vs. Knowledge Gap Radar</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Green polygon shows current subject strength (%); crimson polygon highlights knowledge gap deficit (%).
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
                <span className="text-emerald-400">Strength %</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-rose-400">Knowledge Gap %</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-indigo-400">80% Target</span>
              </div>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="74%" data={subjectRadarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis
                    dataKey="shortSubject"
                    tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickCount={6}
                  />
                  <Radar
                    name="Subject Strength (%)"
                    dataKey="strength"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="#10b981"
                    fillOpacity={0.32}
                  />
                  <Radar
                    name="Knowledge Gap Deficit (%)"
                    dataKey="knowledgeGap"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="#f43f5e"
                    fillOpacity={0.22}
                  />
                  <Radar
                    name="Mastery Benchmark (80%)"
                    dataKey="targetBenchmark"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right 5 Cols: Relative Subject Strength & Weakness Breakdown Table */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">
                  Relative Subject Strength &amp; Weakness
                </h4>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                  6 Study Subjects
                </span>
              </div>

              {/* Top Strength & Primary Weakness Callout Row */}
              <div className="grid grid-cols-2 gap-2.5">
                {strongestSubject && (
                  <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-500/30">
                    <div className="text-[10px] font-semibold text-emerald-400">
                      Top Subject Strength
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5 flex items-baseline justify-between">
                      <span>{strongestSubject.subject}</span>
                      <span className="font-mono tabular-nums text-emerald-300">
                        {strongestSubject.strength}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Lead: {strongestSubject.strongestSubTopic}
                    </div>
                  </div>
                )}

                {weakestSubject && (
                  <div className="p-3 rounded-xl bg-rose-950/35 border border-rose-500/30">
                    <div className="text-[10px] font-semibold text-rose-400">
                      Primary Knowledge Gap
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5 flex items-baseline justify-between">
                      <span>{weakestSubject.subject}</span>
                      <span className="font-mono tabular-nums text-rose-300">
                        {weakestSubject.strength}% ({weakestSubject.knowledgeGap}% Gap)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Focus: {weakestSubject.weakestSubTopic}
                    </div>
                  </div>
                )}
              </div>

              {/* Per-Subject Strength vs Gap Bars */}
              <div className="space-y-2 pt-1">
                {subjectRadarData.map((row) => {
                  const isWeak = row.strength < 65;
                  return (
                    <div
                      key={row.subject}
                      onClick={() => {
                        setSelectedSubjectFilter(row.subject);
                        if (row.weakestCell) {
                          handleSelectCell(row.weakestCell);
                        }
                      }}
                      className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{row.subject}</span>
                          <span className="text-[11px] text-slate-400">
                            · Struggle: {row.weakestSubTopic}
                          </span>
                        </div>
                        <div className="font-mono tabular-nums text-xs flex items-center gap-2">
                          <span
                            className={
                              row.strength >= 75
                                ? 'text-emerald-400 font-bold'
                                : isWeak
                                ? 'text-rose-400 font-bold'
                                : 'text-amber-300 font-bold'
                            }
                          >
                            {row.strength}% Strength
                          </span>
                          <span className="text-slate-500">·</span>
                          <span className="text-rose-300">{row.knowledgeGap}% Gap</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-500 ${
                            row.strength >= 75
                              ? 'bg-emerald-500'
                              : isWeak
                              ? 'bg-amber-500'
                              : 'bg-teal-400'
                          }`}
                          style={{ width: `${row.strength}%` }}
                        />
                        <div
                          className="h-full bg-rose-500/40"
                          style={{ width: `${row.knowledgeGap}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {weakestSubject?.weakestCell && (
              <button
                type="button"
                onClick={() => handleSelectCell(weakestSubject.weakestCell!)}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  Remediate Top Gap: {weakestSubject.subject} ({weakestSubject.weakestSubTopic})
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: Detailed Sub-Topic Cards Grouped by Subject */}
      {viewMode === 'both' && (
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
                      {
                        cells.filter((c) => c.status === 'critical' || c.status === 'high_need')
                          .length
                      }{' '}
                      high-struggle topics
                    </span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="text-slate-400 font-mono tabular-nums">
                      +{trackStudyMinsNeeded}m recommended study time
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono tabular-nums">
                    Subject Strength: <strong className="text-white">{avgQuizAccuracy}%</strong> ·
                    Gap: <strong className="text-rose-400">{100 - avgQuizAccuracy}%</strong>
                  </div>
                </div>

                {/* 4-Column Color-Coded Sub-Topic Heatmap Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
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
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className={`font-semibold ${style.needColor}`}>
                              {cell.subCategory}
                            </span>
                            <span className="font-mono tabular-nums text-white font-bold">
                              {cell.gapIntensity}% Gap ({cell.masteryScore}%)
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-white leading-snug">
                            {cell.topic}
                          </h4>

                          <div className="space-y-1">
                            <div className="w-full h-2 bg-slate-950/80 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                                style={{ width: `${cell.masteryScore}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Quizzes:</span>
                                <span className="font-mono tabular-nums text-slate-200">
                                  {cell.quizHistoryScores.map((s) => `${s}%`).join('→')}
                                </span>
                              </div>
                              <span className="font-mono tabular-nums font-semibold text-amber-300">
                                +{cell.recommendedStudyMinutes}m
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
      )}

      {/* Interactive Remediation Drawer when any Sub-Topic Cell or Bar is selected */}
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
                  Struggle Gap: {activeReviewPlan.cell.gapIntensity}% (Quiz Accuracy:{' '}
                  {activeReviewPlan.cell.masteryScore}%)
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
