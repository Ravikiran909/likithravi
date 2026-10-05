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
  RefreshCw,
  X,
  TrendingUp,
  Target,
  Filter,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface KnowledgeGapsHeatmapProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
}

export interface TopicHeatmapCell {
  id: string;
  subject: string;
  topic: string;
  masteryScore: number; // 0 - 100
  attempts: number;
  lastTested: string;
  status: 'critical' | 'developing' | 'proficient' | 'mastered';
  isWeakTopic: boolean;
  keyConcepts: string[];
  commonPitfall: string;
}

const SUBJECT_CURRICULUM_TOPICS: Record<
  string,
  { topic: string; defaultScore: number; keyConcepts: string[]; pitfall: string }[]
> = {
  Python: [
    {
      topic: 'Recursion & Base Cases',
      defaultScore: 42,
      keyConcepts: ['Call stack frames', 'Termination base condition', 'Tail recursion optimization'],
      pitfall: 'Missing return on recursive step or stack overflow on edge inputs (n <= 0).',
    },
    {
      topic: 'Decorators & Closures',
      defaultScore: 48,
      keyConcepts: ['Higher-order functions', 'functools.wraps', 'Lexical scope binding'],
      pitfall: 'Losing function metadata or mutating outer state without nonlocal.',
    },
    {
      topic: 'Asyncio & Concurrency',
      defaultScore: 54,
      keyConcepts: ['Event loop', 'async/await coroutines', 'asyncio.gather'],
      pitfall: 'Blocking the event loop with synchronous time.sleep() instead of await asyncio.sleep().',
    },
    {
      topic: 'List Comprehensions & Generators',
      defaultScore: 78,
      keyConcepts: ['Lazy evaluation', 'yield keyword', 'Memory-efficient pipelines'],
      pitfall: 'Exhausting a generator iterator multiple times.',
    },
    {
      topic: 'Functions & Scoping (LEGB)',
      defaultScore: 86,
      keyConcepts: ['Local, Enclosing, Global, Built-in', '*args and **kwargs', 'Default mutable args'],
      pitfall: 'Using a mutable default argument like def fn(items=[]) across calls.',
    },
    {
      topic: 'OOP & Dunder Methods',
      defaultScore: 91,
      keyConcepts: ['__init__, __repr__, __eq__', 'Inheritance & super()', 'Class vs instance attributes'],
      pitfall: 'Confusing class-level shared variables with instance variables.',
    },
  ],
  DSA: [
    {
      topic: 'Dynamic Programming & Memoization',
      defaultScore: 38,
      keyConcepts: ['Overlapping subproblems', 'Optimal substructure', 'Top-down vs Bottom-up DP'],
      pitfall: 'Incorrect state transition equation or off-by-one table initialization.',
    },
    {
      topic: 'Graph Shortest Paths (Dijkstra / BFS)',
      defaultScore: 46,
      keyConcepts: ['Priority queue relaxation', 'Adjacency list traversal', 'Cycle detection'],
      pitfall: 'Applying Dijkstra on graphs with negative edge weights instead of Bellman-Ford.',
    },
    {
      topic: 'Trees & BST Balancing',
      defaultScore: 63,
      keyConcepts: ['Inorder/Preorder/Postorder', 'AVL rotations', 'Lowest Common Ancestor'],
      pitfall: 'Checking only immediate children instead of subtree min/max bounds for BST validity.',
    },
    {
      topic: 'Two Pointers & Sliding Window',
      defaultScore: 79,
      keyConcepts: ['Window expansion/contraction', 'Monotonic deque', 'Subarray invariants'],
      pitfall: 'Failing to shrink the left pointer properly when window constraint breaks.',
    },
    {
      topic: 'Binary Search & Monotonic Space',
      defaultScore: 88,
      keyConcepts: ['Search space halving O(log n)', 'Lower/upper bound', 'Midpoint overflow prevention'],
      pitfall: 'Infinite loop when updating left = mid with mid = (left + right) // 2.',
    },
    {
      topic: 'Arrays & Hash Maps',
      defaultScore: 94,
      keyConcepts: ['Amortized O(1) lookup', 'Prefix sums', 'Collision handling'],
      pitfall: 'Mutating keys in place while iterating over hash map entries.',
    },
  ],
  Calculus: [
    {
      topic: 'Integration by Parts & Substitution',
      defaultScore: 39,
      keyConcepts: ['LIATE rule for u-selection', 'u-substitution Jacobian dx', 'Definite integral bounds'],
      pitfall: 'Forgetting to transform integration limits [a, b] when changing variables.',
    },
    {
      topic: 'Differential Equations (ODEs)',
      defaultScore: 45,
      keyConcepts: ['Separable variables', 'Integrating factor e^(∫P dx)', 'Initial value problems'],
      pitfall: 'Dropping the constant of integration +C before applying initial conditions.',
    },
    {
      topic: 'Taylor & Maclaurin Series',
      defaultScore: 58,
      keyConcepts: ['Polynomial approximation', 'Radius of convergence', 'Lagrange error bound'],
      pitfall: 'Factorial denominator mismatch in n-th derivative term.',
    },
    {
      topic: 'Multivariable Partial Derivatives',
      defaultScore: 67,
      keyConcepts: ['Gradient vector ∇f', 'Directional derivatives', 'Chain rule on surfaces'],
      pitfall: 'Treating dependent intermediate variables as constants during chain rule.',
    },
    {
      topic: 'Limits & L’Hôpital’s Rule',
      defaultScore: 82,
      keyConcepts: ['Indeterminate forms 0/0, ∞/∞', 'Squeeze theorem', 'One-sided continuity'],
      pitfall: 'Applying L’Hôpital’s Rule when the limit is not in 0/0 or ∞/∞ form.',
    },
    {
      topic: 'Derivatives & Chain Rule',
      defaultScore: 90,
      keyConcepts: ['Power, product, quotient rules', 'Implicit differentiation', 'Tangent slopes'],
      pitfall: 'Omitting the inner derivative g′(x) in composite functions f(g(x)).',
    },
  ],
  'Generative AI': [
    {
      topic: 'RAG Vector Chunking & Hybrid Search',
      defaultScore: 49,
      keyConcepts: ['Cosine similarity', 'Semantic chunk overlap', 'Reciprocal Rank Fusion (RRF)'],
      pitfall: 'Splitting mid-sentence without overlap, losing cross-paragraph context.',
    },
    {
      topic: 'LoRA & Parameter-Efficient Fine-Tuning',
      defaultScore: 56,
      keyConcepts: ['Low-rank decomposition A×B', '4-bit quantization (QLoRA)', 'Rank r & alpha scaling'],
      pitfall: 'Overfitting small instruction datasets with an excessively high learning rate.',
    },
    {
      topic: 'Transformer Self-Attention Math',
      defaultScore: 74,
      keyConcepts: ['Scaled dot-product softmax(QK^T / √d_k)V', 'Multi-head projection', 'Positional encoding'],
      pitfall: 'Forgetting the 1/√d_k scaling factor, causing vanishing softmax gradients.',
    },
    {
      topic: 'Prompt Engineering & Structured JSON',
      defaultScore: 89,
      keyConcepts: ['Few-shot exemplars', 'Chain-of-Thought reasoning', 'Schema validation'],
      pitfall: 'Unconstrained prompt instructions leading to hallucinated JSON keys.',
    },
  ],
  'AI Agents': [
    {
      topic: 'Multi-Agent State Graphs (LangGraph)',
      defaultScore: 44,
      keyConcepts: ['Cyclic state machines', 'Conditional edges', 'Checkpointer persistence'],
      pitfall: 'Infinite agent routing loops without a max_iterations termination guard.',
    },
    {
      topic: 'ReAct Loop & Tool Calling Recovery',
      defaultScore: 62,
      keyConcepts: ['Thought → Action → Observation', 'Function schema validation', 'Error self-correction'],
      pitfall: 'Passing malformed tool arguments without retry feedback to the LLM.',
    },
    {
      topic: 'Episodic & Semantic Agent Memory',
      defaultScore: 81,
      keyConcepts: ['Short-term context window', 'Long-term vector recall', 'Entity summarization'],
      pitfall: 'Context window overflow from unbounded raw conversation history.',
    },
  ],
};

export const KnowledgeGapsHeatmap: React.FC<KnowledgeGapsHeatmapProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
}) => {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'developing' | 'mastered'>('all');
  const [selectedCell, setSelectedCell] = useState<TopicHeatmapCell | null>(null);
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

  // Build heatmap cells from profile subjects + weakTopics + strongTopics
  const heatmapCells: TopicHeatmapCell[] = useMemo(() => {
    const activeSubjects = Array.from(
      new Set([...(profile.subjects || []), 'Python', 'DSA', 'Calculus', 'Generative AI', 'AI Agents'])
    );

    const cells: TopicHeatmapCell[] = [];
    const weakList = (profile.weakTopics || []).map((w) => w.toLowerCase());
    const strongList = (profile.strongTopics || []).map((s) => s.toLowerCase());

    // First, ensure any explicit weakTopics from the student's profile are represented
    activeSubjects.forEach((subject) => {
      const templates = SUBJECT_CURRICULUM_TOPICS[subject] || [
        {
          topic: `${subject} Core Foundations`,
          defaultScore: 84,
          keyConcepts: [`${subject} syntax & semantics`, 'Standard idioms', 'Debugging patterns'],
          pitfall: 'Skipping foundational edge-case tests.',
        },
        {
          topic: `${subject} Advanced Problem Solving`,
          defaultScore: 47,
          keyConcepts: ['Algorithmic optimization', 'Time & space complexity', 'Boundary conditions'],
          pitfall: 'Suboptimal brute-force approach on large inputs.',
        },
      ];

      templates.forEach((tpl, idx) => {
        const cellId = `cell_${subject}_${idx}`;
        const matchesWeak = weakList.some(
          (w) =>
            tpl.topic.toLowerCase().includes(w) ||
            w.includes(tpl.topic.toLowerCase().split(' ')[0])
        );
        const matchesStrong = strongList.some(
          (s) =>
            tpl.topic.toLowerCase().includes(s) ||
            s.includes(tpl.topic.toLowerCase().split(' ')[0])
        );

        let score = tpl.defaultScore;
        if (matchesWeak) score = Math.min(score, 43);
        if (matchesStrong) score = Math.max(score, 88);
        if (localScoreBoosts[cellId] !== undefined) {
          score = Math.min(100, localScoreBoosts[cellId]);
        }

        const status: TopicHeatmapCell['status'] =
          score < 50
            ? 'critical'
            : score < 70
            ? 'developing'
            : score < 85
            ? 'proficient'
            : 'mastered';

        cells.push({
          id: cellId,
          subject,
          topic: tpl.topic,
          masteryScore: score,
          attempts: 3 + ((idx * 2) % 5),
          lastTested: idx === 0 ? 'Today' : `${idx + 1}d ago`,
          status,
          isWeakTopic: score < 55 || matchesWeak,
          keyConcepts: tpl.keyConcepts,
          commonPitfall: tpl.pitfall,
        });
      });
    });

    // Also inject any custom profile.weakTopics not yet matched
    (profile.weakTopics || []).forEach((weakTopic, wIdx) => {
      const alreadyExists = cells.some(
        (c) => c.topic.toLowerCase() === weakTopic.toLowerCase()
      );
      if (!alreadyExists) {
        const cellId = `cell_custom_weak_${wIdx}`;
        const boosted = localScoreBoosts[cellId];
        const score = boosted !== undefined ? boosted : 36;
        const status: TopicHeatmapCell['status'] =
          score < 50
            ? 'critical'
            : score < 70
            ? 'developing'
            : score < 85
            ? 'proficient'
            : 'mastered';

        cells.push({
          id: cellId,
          subject: profile.subjects[0] || 'Core Curriculum',
          topic: weakTopic,
          masteryScore: score,
          attempts: 4,
          lastTested: 'Yesterday',
          status,
          isWeakTopic: score < 60,
          keyConcepts: [
            `Core formulation of ${weakTopic}`,
            `Step-by-step boundary analysis`,
            `Exam-style application of ${weakTopic}`,
          ],
          commonPitfall: `Misapplying standard rules on edge cases in ${weakTopic}.`,
        });
      }
    });

    return cells;
  }, [profile.subjects, profile.weakTopics, profile.strongTopics, localScoreBoosts]);

  const subjectsList = useMemo(
    () => Array.from(new Set(heatmapCells.map((c) => c.subject))),
    [heatmapCells]
  );

  const filteredCells = useMemo(() => {
    return heatmapCells.filter((c) => {
      if (selectedSubjectFilter !== 'all' && c.subject !== selectedSubjectFilter) return false;
      if (statusFilter === 'critical' && c.status !== 'critical') return false;
      if (statusFilter === 'developing' && c.status !== 'developing') return false;
      if (statusFilter === 'mastered' && c.status !== 'mastered' && c.status !== 'proficient')
        return false;
      return true;
    });
  }, [heatmapCells, selectedSubjectFilter, statusFilter]);

  // Group filtered cells by subject for the matrix view
  const groupedBySubject = useMemo(() => {
    const map = new Map<string, TopicHeatmapCell[]>();
    filteredCells.forEach((cell) => {
      const list = map.get(cell.subject) || [];
      list.push(cell);
      map.set(cell.subject, list);
    });
    return map;
  }, [filteredCells]);

  const criticalCount = heatmapCells.filter((c) => c.status === 'critical').length;
  const developingCount = heatmapCells.filter((c) => c.status === 'developing').length;
  const masteredCount = heatmapCells.filter(
    (c) => c.status === 'mastered' || c.status === 'proficient'
  ).length;

  // Generate an interactive targeted review session for the clicked cell
  const handleGenerateTargetedReview = (cell: TopicHeatmapCell) => {
    setSelectedCell(cell);
    setSelectedAnswer(null);
    setActiveReviewPlan({
      cell,
      steps: [
        `Concept Intuition: Master ${cell.keyConcepts[0]} and how it governs ${cell.topic}.`,
        `Trap Avoidance: Watch out for the #1 student mistake — ${cell.commonPitfall}`,
        `Active Application: Apply ${cell.keyConcepts[1] || cell.topic} to solve the verification check below.`,
      ],
      practiceQuestion: {
        question: `In ${cell.subject} (${cell.topic}), which strategy best prevents "${cell.commonPitfall}" while ensuring optimal correctness?`,
        options: [
          `A) Explicitly verify boundary invariants and apply ${cell.keyConcepts[0]} before execution`,
          `B) Skip base-case validation to reduce code length`,
          `C) Rely on unconstrained global state mutations`,
          `D) Ignore edge inputs and assume uniform distribution`,
        ],
        correctLetter: 'A',
        explanation: `Correct! Grounding your implementation in ${cell.keyConcepts[0]} and checking boundary invariants directly eliminates the pitfall: "${cell.commonPitfall}"`,
      },
    });
  };

  // Mark topic as remediated / boost mastery score
  const handleCompleteTargetedReview = async (cell: TopicHeatmapCell) => {
    setIsUpdatingMastery(true);
    const nextScore = Math.min(100, Math.max(85, cell.masteryScore + 35));
    setLocalScoreBoosts((prev) => ({ ...prev, [cell.id]: nextScore }));

    const updatedWeak = (profile.weakTopics || []).filter(
      (t) => !cell.topic.toLowerCase().includes(t.toLowerCase()) && t.toLowerCase() !== cell.topic.toLowerCase()
    );
    const updatedStrong = Array.from(new Set([...(profile.strongTopics || []), cell.topic]));

    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weakTopics: updatedWeak,
          strongTopics: updatedStrong,
          overallProgress: Math.min(100, (profile.overallProgress || 65) + 2),
        }),
      });
      if (res.ok) {
        const updatedProfile = await res.json();
        onProfileUpdate(updatedProfile);
      } else {
        onProfileUpdate({
          ...profile,
          weakTopics: updatedWeak,
          strongTopics: updatedStrong,
        });
      }
    } catch {
      onProfileUpdate({
        ...profile,
        weakTopics: updatedWeak,
        strongTopics: updatedStrong,
      });
    } finally {
      setIsUpdatingMastery(false);
    }
  };

  const getHeatmapCellStyle = (status: TopicHeatmapCell['status']) => {
    switch (status) {
      case 'critical':
        return 'bg-rose-950/60 hover:bg-rose-900/70 border-rose-500/50 text-rose-200 shadow-rose-950/40';
      case 'developing':
        return 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-500/40 text-amber-200 shadow-amber-950/30';
      case 'proficient':
        return 'bg-teal-950/50 hover:bg-teal-900/60 border-teal-500/40 text-teal-200 shadow-teal-950/30';
      case 'mastered':
        return 'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-500/50 text-emerald-200 shadow-emerald-950/40';
    }
  };

  const getScoreBadgeStyle = (status: TopicHeatmapCell['status']) => {
    switch (status) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'developing':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'proficient':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'mastered':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-6">
      {/* Decorative background glow */}
      <div className="absolute -top-16 -right-16 w-72 h-72 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Summary Legend */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-inner shrink-0">
            <Grid className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Diagnostic Competency Matrix
              </span>
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{criticalCount} Knowledge Gaps Detected</span>
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Knowledge Gaps & Topic Mastery Heatmap
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Click any low-performing <span className="text-rose-400 font-semibold">Critical Gap (&lt;50%)</span> or{' '}
              <span className="text-amber-400 font-semibold">Developing (50–69%)</span> cell to immediately generate a targeted AI review session or launch a 5-minute remediation quiz.
            </p>
          </div>
        </div>

        {/* Heatmap Color Scale Legend */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl text-[11px] shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border transition cursor-pointer ${
              statusFilter === 'critical'
                ? 'bg-rose-500/20 border-rose-500 text-white'
                : 'border-transparent text-slate-300 hover:bg-slate-900'
            }`}
          >
            <span className="w-3 h-3 rounded bg-rose-500/80 border border-rose-400 inline-block" />
            <span>Critical (&lt;50%)</span>
            <span className="font-bold text-rose-400">({criticalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'developing' ? 'all' : 'developing')}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border transition cursor-pointer ${
              statusFilter === 'developing'
                ? 'bg-amber-500/20 border-amber-500 text-white'
                : 'border-transparent text-slate-300 hover:bg-slate-900'
            }`}
          >
            <span className="w-3 h-3 rounded bg-amber-500/80 border border-amber-400 inline-block" />
            <span>Developing (50–69%)</span>
            <span className="font-bold text-amber-400">({developingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'mastered' ? 'all' : 'mastered')}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded-lg border transition cursor-pointer ${
              statusFilter === 'mastered'
                ? 'bg-emerald-500/20 border-emerald-500 text-white'
                : 'border-transparent text-slate-300 hover:bg-slate-900'
            }`}
          >
            <span className="w-3 h-3 rounded bg-emerald-500/80 border border-emerald-400 inline-block" />
            <span>Mastered (70%+)</span>
            <span className="font-bold text-emerald-400">({masteredCount})</span>
          </button>
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium flex items-center space-x-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Subject:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedSubjectFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedSubjectFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            All Subjects
          </button>
          {subjectsList.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubjectFilter(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedSubjectFilter === sub
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {statusFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
          >
            Reset Status Filter
          </button>
        )}
      </div>

      {/* Heatmap Matrix Rows by Subject */}
      <div className="relative z-10 space-y-5">
        {Array.from(groupedBySubject.entries()).map(([subject, cells]) => (
          <div key={subject} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                  {subject}
                </span>
                <span className="text-[11px] text-slate-500">
                  ({cells.filter((c) => c.status === 'critical').length} critical gaps)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Avg Mastery:{' '}
                <strong className="text-white">
                  {Math.round(cells.reduce((acc, c) => acc + c.masteryScore, 0) / cells.length)}%
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cells.map((cell) => {
                const isSelected = activeReviewPlan?.cell.id === cell.id;
                return (
                  <button
                    key={cell.id}
                    type="button"
                    onClick={() => handleGenerateTargetedReview(cell)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative group flex flex-col justify-between shadow-md ${getHeatmapCellStyle(
                      cell.status
                    )} ${isSelected ? 'ring-2 ring-white scale-[1.01]' : 'hover:-translate-y-0.5'}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white group-hover:underline leading-snug">
                          {cell.topic}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black border shrink-0 ${getScoreBadgeStyle(
                            cell.status
                          )}`}
                        >
                          {cell.masteryScore}%
                        </span>
                      </div>

                      {/* Mini Heat Intensity Bar */}
                      <div className="w-full h-1.5 bg-slate-950/70 rounded-full overflow-hidden mt-2.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cell.status === 'critical'
                              ? 'bg-rose-500'
                              : cell.status === 'developing'
                              ? 'bg-amber-400'
                              : cell.status === 'proficient'
                              ? 'bg-teal-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${cell.masteryScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                      <span className="opacity-80">
                        {cell.status === 'critical'
                          ? '⚠️ Needs Targeted Review'
                          : cell.status === 'developing'
                          ? '⚡ Reinforce Concept'
                          : '✓ Solid Mastery'}
                      </span>
                      <span className="font-bold flex items-center space-x-1 text-white group-hover:translate-x-0.5 transition-transform">
                        <span>
                          {cell.status === 'critical' || cell.status === 'developing'
                            ? 'Review Gap'
                            : 'Practice'}
                        </span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Targeted Review Session Drawer / Panel when a cell is clicked */}
      {activeReviewPlan && (
        <div className="relative z-10 mt-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/50 border-2 border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3.5">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Targeted Review Session Generated
                  </span>
                  <span className="text-xs text-slate-400">
                    {activeReviewPlan.cell.subject} • Current Mastery:{' '}
                    <strong className="text-white">{activeReviewPlan.cell.masteryScore}%</strong>
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">
                  Remediation Plan: {activeReviewPlan.cell.topic}
                </h4>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveReviewPlan(null)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close review panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: 3-Step Targeted Review Breakdown & Key Concepts (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>3-Step Micro-Review Briefing</span>
              </div>

              <div className="space-y-2">
                {activeReviewPlan.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 flex items-start space-x-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons to launch on WhatsApp Simulator */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToChat(
                      `Start a targeted review session on ${activeReviewPlan.cell.topic} in ${activeReviewPlan.cell.subject} and walk me through my knowledge gaps step by step`
                    )
                  }
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Launch Socratic Review on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onNavigateToChat(`/smart-quiz ${activeReviewPlan.cell.topic}`)
                  }
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Start 5-Min Adaptive Quiz on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCompleteTargetedReview(activeReviewPlan.cell)}
                  disabled={isUpdatingMastery}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isUpdatingMastery ? 'Updating...' : 'Mark Gap Remediated (+35%)'}</span>
                </button>
              </div>
            </div>

            {/* Right: Instant Concept Check Question (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  <span>Instant Gap Verification Check</span>
                </span>
                <span className="text-[10px] text-slate-400">+35% Mastery Boost</span>
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
                          handleCompleteTargetedReview(activeReviewPlan.cell);
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
