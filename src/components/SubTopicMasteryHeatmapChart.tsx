import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  Treemap,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import {
  Grid,
  Sparkles,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  BarChart2,
  Target,
  Award,
  TrendingUp,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface SubTopicMasteryHeatmapChartProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
}

export interface SubTopicMasteryPoint {
  id: string;
  subject: string;
  subjectIdx: number;
  subTopic: string;
  slotIdx: number; // 0..5 column in matrix
  masteryScore: number; // 0..100
  quizAccuracy: number; // 0..100
  quizAttempts: number;
  historySessions: number;
  lastStudiedDate: string;
  tier: 'critical' | 'developing' | 'proficient' | 'mastered';
  isWeakFlagged: boolean;
  isHistoryMastered: boolean;
}

const CURRICULUM_SUBTOPICS: Record<string, string[]> = {
  Python: [
    'Syntax & Variables',
    'Functions & Scope',
    'List Comprehensions',
    'OOP & Classes',
    'Decorators & Closures',
    'Recursion & Call Stack',
  ],
  DSA: [
    'Arrays & Hash Maps',
    'Binary Search',
    'Two Pointers',
    'Binary Trees & BST',
    'Graph Algorithms',
    'Dynamic Programming',
  ],
  Calculus: [
    'Limits & Continuity',
    'Derivatives & Chain Rule',
    'Implicit Differentiation',
    'Definite Integrals',
    'Integration by Parts',
    'Differential Equations',
  ],
  Java: [
    'JVM & Memory Model',
    'OOP & Interfaces',
    'Collections Framework',
    'Generics & Streams',
    'Exception Handling',
    'Multithreading & Locks',
  ],
  'Machine Learning': [
    'Linear & Logistic Reg.',
    'Gradient Descent',
    'Decision Trees & RF',
    'Neural Nets & Backprop',
    'Regularization & Overfit',
    'Transformers & Attention',
  ],
};

function getHeatColor(score: number): {
  fill: string;
  stroke: string;
  badgeBg: string;
  label: string;
} {
  if (score < 50) {
    return {
      fill: '#f43f5e', // rose-500
      stroke: '#fda4af',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      label: 'Critical Gap (<50%)',
    };
  }
  if (score < 70) {
    return {
      fill: '#f59e0b', // amber-500
      stroke: '#fcd34d',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      label: 'Developing (50–69%)',
    };
  }
  if (score < 85) {
    return {
      fill: '#14b8a6', // teal-500
      stroke: '#5eead4',
      badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      label: 'Proficient (70–84%)',
    };
  }
  return {
    fill: '#10b981', // emerald-500
    stroke: '#6ee7b7',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    label: 'Mastered (85–100%)',
  };
}

// Custom SVG Heatmap Cell Shape for Recharts ScatterChart
const CustomHeatmapCellShape = (props: any) => {
  const { cx, cy, payload, onSelectPoint, selectedId } = props;
  if (cx === undefined || cy === undefined || !payload) return null;

  const width = 98;
  const height = 44;
  const x = cx - width / 2;
  const y = cy - height / 2;
  const heat = getHeatColor(payload.masteryScore);
  const isSelected = selectedId === payload.id;

  const shortTitle =
    payload.subTopic.length > 14 ? payload.subTopic.slice(0, 13) + '…' : payload.subTopic;

  return (
    <g
      onClick={() => onSelectPoint && onSelectPoint(payload)}
      style={{ cursor: 'pointer' }}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={9}
        ry={9}
        fill={heat.fill}
        fillOpacity={isSelected ? 0.95 : 0.78}
        stroke={isSelected ? '#ffffff' : heat.stroke}
        strokeWidth={isSelected ? 2.5 : 1}
      />
      <text
        x={cx}
        y={cy - 5}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={10}
        fontWeight={700}
      >
        {shortTitle}
      </text>
      <text
        x={cx}
        y={cy + 11}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize={11}
        fontWeight={800}
      >
        {payload.masteryScore}%
      </text>
    </g>
  );
};

// Custom Treemap Node Content for Recharts Treemap
const CustomTreemapNode = (props: any) => {
  const { x, y, width, height, name, masteryScore } = props;
  if (width < 32 || height < 26 || masteryScore === undefined) return null;
  const heat = getHeatColor(masteryScore);

  return (
    <g>
      <rect
        x={x + 2}
        y={y + 2}
        width={Math.max(0, width - 4)}
        height={Math.max(0, height - 4)}
        rx={8}
        ry={8}
        fill={heat.fill}
        fillOpacity={0.82}
        stroke="#0f172a"
        strokeWidth={2}
      />
      {width > 65 && height > 38 && (
        <>
          <text
            x={x + 10}
            y={y + 20}
            fill="#ffffff"
            fontSize={11}
            fontWeight={700}
          >
            {String(name).length > 18 ? String(name).slice(0, 17) + '…' : name}
          </text>
          <text
            x={x + 10}
            y={y + 36}
            fill="#ecfdf5"
            fontSize={12}
            fontWeight={800}
          >
            {masteryScore}% Mastery
          </text>
        </>
      )}
    </g>
  );
};

export const SubTopicMasteryHeatmapChart: React.FC<SubTopicMasteryHeatmapChartProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
}) => {
  const [chartMode, setChartMode] = useState<'matrix' | 'treemap' | 'bars'>('matrix');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [localBoosts, setLocalBoosts] = useState<Record<string, number>>({});
  const [selectedPoint, setSelectedPoint] = useState<SubTopicMasteryPoint | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const subjectsList = useMemo(() => {
    const base = Array.from(
      new Set([...(profile.subjects || []), 'Python', 'DSA', 'Calculus', 'Java', 'Machine Learning'])
    );
    return base.slice(0, 5);
  }, [profile.subjects]);

  // Compute sub-topic mastery points anchored to quiz performance + learningHistory + weakTopics + strongTopics
  const masteryPoints: SubTopicMasteryPoint[] = useMemo(() => {
    const baseAccuracy =
      profile.totalQuestionsAnswered > 0
        ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
        : profile.overallProgress || 74;

    const weakLower = (profile.weakTopics || []).map((w) => w.toLowerCase());
    const strongLower = (profile.strongTopics || []).map((s) => s.toLowerCase());
    const historyList = profile.learningHistory || [];

    const points: SubTopicMasteryPoint[] = [];

    subjectsList.forEach((subject, subjectIdx) => {
      const subTopics = CURRICULUM_SUBTOPICS[subject] || [
        `${subject} Foundations`,
        `${subject} Core Syntax`,
        `${subject} Data Modeling`,
        `${subject} Applied Patterns`,
        `${subject} Optimization`,
        `${subject} Edge Cases`,
      ];

      subTopics.slice(0, 6).forEach((subTopic, slotIdx) => {
        const id = `${subject}__${subTopic}`;
        const subLower = subTopic.toLowerCase();
        const subjLower = subject.toLowerCase();

        // Check learning history matches
        const matchingHistory = historyList.filter(
          (h) =>
            h.topic.toLowerCase().includes(subLower) ||
            subLower.includes(h.topic.toLowerCase()) ||
            (h.subject.toLowerCase() === subjLower && slotIdx < 2)
        );
        const isHistoryMastered = matchingHistory.some((h) => h.mastered);
        const hasUnmasteredHistory = matchingHistory.some((h) => !h.mastered);

        // Check weak / strong topic match
        const isWeakFlagged = weakLower.some(
          (w) =>
            w.includes(subLower) ||
            subLower.includes(w) ||
            (w.includes(subjLower) && slotIdx >= 4)
        );
        const isStrongFlagged = strongLower.some(
          (s) =>
            s.includes(subLower) ||
            subLower.includes(s) ||
            (s.includes(subjLower) && slotIdx <= 1)
        );

        // Progressive difficulty curve across slots 0..5 anchored to student's quiz accuracy
        const slotDifficultyOffset = (2 - slotIdx) * 5; // +10, +5, 0, -5, -10, -15
        let computedScore = baseAccuracy + slotDifficultyOffset;

        if (isHistoryMastered) computedScore = Math.max(computedScore, 88);
        if (isStrongFlagged) computedScore = Math.max(computedScore, 86);
        if (hasUnmasteredHistory) computedScore = Math.min(computedScore, 54);
        if (isWeakFlagged) computedScore = Math.min(computedScore, 44 + (slotIdx % 3) * 3);

        const boost = localBoosts[id] || 0;
        const finalScore = Math.max(18, Math.min(100, Math.round(computedScore + boost)));

        const tier: SubTopicMasteryPoint['tier'] =
          finalScore < 50
            ? 'critical'
            : finalScore < 70
            ? 'developing'
            : finalScore < 85
            ? 'proficient'
            : 'mastered';

        const quizAttempts = Math.max(
          2,
          Math.round((profile.totalQuestionsAnswered || 30) / 14) + (6 - slotIdx)
        );

        const lastStudiedDate =
          matchingHistory[0]?.date ||
          new Date(Date.now() - (slotIdx + subjectIdx + 1) * 86400000)
            .toISOString()
            .split('T')[0];

        points.push({
          id,
          subject,
          subjectIdx,
          subTopic,
          slotIdx,
          masteryScore: finalScore,
          quizAccuracy: Math.min(100, Math.max(20, finalScore + (slotIdx % 2 === 0 ? 2 : -2))),
          quizAttempts,
          historySessions: matchingHistory.length || (slotIdx < 3 ? 2 : 1),
          lastStudiedDate,
          tier,
          isWeakFlagged,
          isHistoryMastered,
        });
      });
    });

    return points;
  }, [
    subjectsList,
    profile.totalQuestionsAnswered,
    profile.correctAnswers,
    profile.overallProgress,
    profile.weakTopics,
    profile.strongTopics,
    profile.learningHistory,
    localBoosts,
  ]);

  const filteredPoints = useMemo(() => {
    if (subjectFilter === 'all') return masteryPoints;
    return masteryPoints.filter((p) => p.subject === subjectFilter);
  }, [masteryPoints, subjectFilter]);

  const activeSelection = selectedPoint || filteredPoints.find((p) => p.tier === 'critical') || filteredPoints[0];

  const summaryMetrics = useMemo(() => {
    const total = masteryPoints.length || 1;
    const masteredCount = masteryPoints.filter((p) => p.tier === 'mastered').length;
    const criticalCount = masteryPoints.filter((p) => p.tier === 'critical').length;
    const avgScore = Math.round(
      masteryPoints.reduce((acc, p) => acc + p.masteryScore, 0) / total
    );
    return { total, masteredCount, criticalCount, avgScore };
  }, [masteryPoints]);

  const treemapData = useMemo(() => {
    return filteredPoints.map((pt) => ({
      name: `${pt.subject}: ${pt.subTopic}`,
      size: Math.max(30, pt.masteryScore),
      masteryScore: pt.masteryScore,
      subject: pt.subject,
      subTopic: pt.subTopic,
    }));
  }, [filteredPoints]);

  const handleBoostSubTopicMastery = async (point: SubTopicMasteryPoint) => {
    const nextBoost = (localBoosts[point.id] || 0) + 15;
    setLocalBoosts((prev) => ({ ...prev, [point.id]: nextBoost }));

    const newScore = Math.min(100, point.masteryScore + 15);
    const updatedHistory = [
      {
        topic: point.subTopic,
        subject: point.subject,
        date: new Date().toISOString().split('T')[0],
        mastered: newScore >= 80,
      },
      ...(profile.learningHistory || []).filter(
        (h) => h.topic.toLowerCase() !== point.subTopic.toLowerCase()
      ),
    ];

    const updatedWeak =
      newScore >= 75
        ? (profile.weakTopics || []).filter(
            (w) => !w.toLowerCase().includes(point.subTopic.toLowerCase())
          )
        : profile.weakTopics || [];

    const updatedStrong =
      newScore >= 85 && !(profile.strongTopics || []).includes(point.subTopic)
        ? [...(profile.strongTopics || []), point.subTopic]
        : profile.strongTopics || [];

    const updatedProfile: StudentProfile = {
      ...profile,
      learningHistory: updatedHistory,
      weakTopics: updatedWeak,
      strongTopics: updatedStrong,
      totalQuestionsAnswered: (profile.totalQuestionsAnswered || 0) + 3,
      correctAnswers: (profile.correctAnswers || 0) + 3,
      overallProgress: Math.min(100, (profile.overallProgress || 70) + 1),
    };

    setSelectedPoint({
      ...point,
      masteryScore: newScore,
      tier:
        newScore < 50
          ? 'critical'
          : newScore < 70
          ? 'developing'
          : newScore < 85
          ? 'proficient'
          : 'mastered',
    });

    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learningHistory: updatedHistory,
          weakTopics: updatedWeak,
          strongTopics: updatedStrong,
          totalQuestionsAnswered: updatedProfile.totalQuestionsAnswered,
          correctAnswers: updatedProfile.correctAnswers,
          overallProgress: updatedProfile.overallProgress,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        onProfileUpdate(saved);
      } else {
        onProfileUpdate(updatedProfile);
      }
    } catch {
      onProfileUpdate(updatedProfile);
    }

    setStatusBanner(
      `Recorded +15% mastery boost for "${point.subTopic}" (${point.subject}) in your learning history!`
    );
    setTimeout(() => setStatusBanner(null), 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & View Switcher */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <Grid className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recharts Sub-Topic Mastery Heatmap</span>
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
              Quiz Accuracy + Learning History Telemetry
            </span>
          </div>
          <h3 className="text-lg font-bold text-white">
            Sub-Topic Mastery Heatmap ({summaryMetrics.avgScore}% Avg Mastery)
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Visualizes your mastery across <strong className="text-slate-200">{summaryMetrics.total} granular sub-topics</strong> derived from your{' '}
            <strong className="text-emerald-400">{profile.totalQuestionsAnswered} quiz questions answered</strong> and{' '}
            <strong className="text-indigo-300">{(profile.learningHistory || []).length} logged learning history records</strong>. Click any heatmap cell to inspect or practice.
          </p>
        </div>

        {/* Chart Library View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setChartMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                chartMode === 'matrix'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>2D Heatmap Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('treemap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                chartMode === 'treemap'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Treemap Heatmap</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bars')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                chartMode === 'bars'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Sub-Topic Spectrum</span>
            </button>
          </div>
        </div>
      </div>

      {statusBanner && (
        <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-emerald-400 hover:text-white text-[11px] font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Subject Filter Bar & Color Scale Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Filter Subject:</span>
          <button
            type="button"
            onClick={() => setSubjectFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              subjectFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Subjects ({masteryPoints.length})
          </button>
          {subjectsList.map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => setSubjectFilter(subj)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                subjectFilter === subj
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        {/* Heat Color Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
            <span className="text-slate-300">&lt;50% Critical ({summaryMetrics.criticalCount})</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
            <span className="text-slate-300">50–69% Developing</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-teal-500 inline-block" />
            <span className="text-slate-300">70–84% Proficient</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
            <span className="text-slate-300">85–100% Mastered ({summaryMetrics.masteredCount})</span>
          </span>
        </div>
      </div>

      {/* Recharts Visual Heatmap Canvas */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
        {chartMode === 'matrix' && (
          <div className="w-full h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  dataKey="slotIdx"
                  name="Sub-Topic Module"
                  domain={[-0.5, 5.5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tickFormatter={(val) => `Module ${Number(val) + 1}`}
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="subjectIdx"
                  name="Subject"
                  domain={[-0.6, subjectsList.length - 0.4]}
                  ticks={subjectsList.map((_, i) => i)}
                  tickFormatter={(val) => subjectsList[Number(val)] || ''}
                  stroke="#94a3b8"
                  tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 600 }}
                />
                <ZAxis type="number" dataKey="masteryScore" range={[400, 400]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const pt = payload[0].payload as SubTopicMasteryPoint;
                    const heat = getHeatColor(pt.masteryScore);
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[220px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white">{pt.subTopic}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${heat.badgeBg}`}>
                            {pt.masteryScore}%
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Subject: <strong className="text-slate-200">{pt.subject}</strong> (Module #{pt.slotIdx + 1})
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
                          <div>
                            <span className="text-slate-400">Quiz Accuracy: </span>
                            <strong className="text-emerald-400">{pt.quizAccuracy}%</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Attempts: </span>
                            <strong className="text-white">{pt.quizAttempts}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">History Logs: </span>
                            <strong className="text-indigo-300">{pt.historySessions}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Last Studied: </span>
                            <strong className="text-slate-300">{pt.lastStudiedDate}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  name="Sub-Topic Mastery"
                  data={filteredPoints}
                  shape={
                    <CustomHeatmapCellShape
                      selectedId={activeSelection?.id}
                      onSelectPoint={(pt: SubTopicMasteryPoint) => setSelectedPoint(pt)}
                    />
                  }
                >
                  {filteredPoints.map((entry) => (
                    <Cell key={entry.id} fill={getHeatColor(entry.masteryScore).fill} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartMode === 'treemap' && (
          <div className="w-full h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="size"
                stroke="#0f172a"
                fill="#10b981"
                content={<CustomTreemapNode />}
              >
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-emerald-400 font-bold mt-1">
                          Mastery Score: {item.masteryScore}%
                        </div>
                      </div>
                    );
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}

        {chartMode === 'bars' && (
          <div className="w-full h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredPoints.slice(0, 12)}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="subTopic"
                  stroke="#94a3b8"
                  tick={{ fill: '#e2e8f0', fontSize: 11 }}
                  width={115}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const pt = payload[0].payload as SubTopicMasteryPoint;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1">
                        <div className="font-bold text-white">
                          {pt.subject}: {pt.subTopic}
                        </div>
                        <div className="text-emerald-400 font-semibold">
                          Mastery: {pt.masteryScore}% • Quiz Accuracy: {pt.quizAccuracy}%
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="masteryScore"
                  radius={[0, 6, 6, 0]}
                  onClick={(data: any) => {
                    if (data && data.payload) setSelectedPoint(data.payload);
                  }}
                >
                  {filteredPoints.slice(0, 12).map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={getHeatColor(entry.masteryScore).fill}
                      cursor="pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Selected Sub-Topic Drill-Down Inspector & Action Bar */}
      {activeSelection && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/30 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Selected Sub-Topic Telemetry
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  getHeatColor(activeSelection.masteryScore).badgeBg
                }`}
              >
                {activeSelection.masteryScore}% Mastery ({getHeatColor(activeSelection.masteryScore).label})
              </span>
              {activeSelection.isWeakFlagged && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Flagged Weak Topic</span>
                </span>
              )}
              {activeSelection.isHistoryMastered && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <Award className="w-3 h-3" />
                  <span>Verified in Learning History</span>
                </span>
              )}
            </div>

            <h4 className="text-base font-bold text-white">
              {activeSelection.subject} — {activeSelection.subTopic}
            </h4>

            <p className="text-xs text-slate-400">
              Quiz Accuracy: <strong className="text-emerald-400">{activeSelection.quizAccuracy}%</strong> across{' '}
              <strong className="text-slate-200">{activeSelection.quizAttempts} attempts</strong> • Logged History Sessions:{' '}
              <strong className="text-indigo-300">{activeSelection.historySessions}</strong> • Last Reviewed:{' '}
              <strong className="text-slate-300">{activeSelection.lastStudiedDate}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleBoostSubTopicMastery(activeSelection)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold text-xs rounded-xl border border-emerald-500/30 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Log Practice (+15% Mastery)</span>
            </button>

            {onNavigateToQuiz && (
              <button
                type="button"
                onClick={onNavigateToQuiz}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Adaptive Quiz</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onNavigateToChat(
                  `Teach me "${activeSelection.subTopic}" in ${activeSelection.subject} with a concrete example and 2 practice questions to boost my mastery from ${activeSelection.masteryScore}%!`
                )
              }
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Master in WhatsApp Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
