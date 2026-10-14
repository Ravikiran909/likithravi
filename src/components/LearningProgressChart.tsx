import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Award,
  Calendar,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  BarChart2,
  Activity,
  Plus,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface LearningProgressChartProps {
  profile: StudentProfile;
  extraMinutesToday?: number;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
  onNavigateToQuiz?: () => void;
  onNavigateToChat?: (prefilledText?: string) => void;
}

interface ProgressDataPoint {
  dateStr: string;
  displayDate: string;
  fullDate: string;
  studyHours: number;
  targetHours: number;
  quizAccuracy: number;
  trend: number;
  questionsAnswered: number;
  isToday: boolean;
}

export const LearningProgressChart: React.FC<LearningProgressChartProps> = ({
  profile,
  extraMinutesToday = 45,
  onLogStudyMinutes,
  onNavigateToQuiz,
  onNavigateToChat,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [metricView, setMetricView] = useState<'combined' | 'hours' | 'accuracy'>('combined');
  const [interactiveQuizBoost, setInteractiveQuizBoost] = useState<number>(0);

  // Base values from student profile
  const targetDailyHours = profile.studyHoursPerDay || 2;
  const overallAccuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 78;

  // Generate realistic historical data points based on profile's learning history & quiz telemetry
  const data: ProgressDataPoint[] = useMemo(() => {
    const daysCount = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const today = new Date();
    const points: ProgressDataPoint[] = [];

    // Base multipliers to simulate natural study variance
    const studyVariances = [0.85, 1.1, 0.7, 1.25, 0.9, 1.3, 1.0, 0.8, 1.15, 0.95, 1.4, 0.75, 1.2, 1.0];
    const quizDeltas = [-8, -6, -4, -3, -1, +2, 0, -5, -2, +1, +3, -1, +4, 0];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isToday = i === 0;
      const idx = daysCount - 1 - i;

      const dateStr = d.toISOString().split('T')[0];
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const displayDate = isToday ? 'Today' : `${monthShort} ${dayNum}`;
      const fullDate = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Study hours: Today is driven by live logged minutes, historical by profile target & variance
      const varianceMod = studyVariances[idx % studyVariances.length];
      const hours = isToday
        ? Math.round((extraMinutesToday / 60) * 10) / 10
        : Math.round(targetDailyHours * varianceMod * 10) / 10;

      // Quiz accuracy progression: upward trajectory as student learns
      const delta = quizDeltas[idx % quizDeltas.length];
      const naturalGain = Math.round((idx / Math.max(1, daysCount - 1)) * 6);
      const accuracy = isToday
        ? Math.min(100, Math.max(40, overallAccuracy + interactiveQuizBoost))
        : Math.min(98, Math.max(45, overallAccuracy - 6 + naturalGain + delta));

      // Calculate smooth trend line (moving average)
      points.push({
        dateStr,
        displayDate,
        fullDate,
        studyHours: hours,
        targetHours: targetDailyHours,
        quizAccuracy: accuracy,
        trend: 0, // Will be computed in next pass
        questionsAnswered: isToday
          ? (profile.questionsAnsweredToday || 5) + Math.round(interactiveQuizBoost / 3)
          : Math.round(3 + (hours * 3.5)),
        isToday,
      });
    }

    // Compute moving average trend for quiz accuracy
    const windowSize = timeRange === '30d' ? 5 : 3;
    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(points.length - 1, i + Math.floor(windowSize / 2));
      let sum = 0;
      let count = 0;
      for (let j = start; j <= end; j++) {
        sum += points[j].quizAccuracy;
        count++;
      }
      points[i].trend = Math.round((sum / count) * 10) / 10;
    }

    return points;
  }, [timeRange, targetDailyHours, overallAccuracy, extraMinutesToday, interactiveQuizBoost, profile.questionsAnsweredToday]);

  // Aggregate metrics
  const totalStudyHours = useMemo(
    () => Math.round(data.reduce((sum, d) => sum + d.studyHours, 0) * 10) / 10,
    [data]
  );
  const avgQuizAccuracy = useMemo(
    () => Math.round(data.reduce((sum, d) => sum + d.quizAccuracy, 0) / data.length),
    [data]
  );
  const totalQuestionsSolved = useMemo(
    () => data.reduce((sum, d) => sum + d.questionsAnswered, 0),
    [data]
  );
  const daysGoalMet = useMemo(
    () => data.filter((d) => d.studyHours >= d.targetHours).length,
    [data]
  );
  const accuracyTrendDelta = useMemo(() => {
    if (data.length < 2) return 0;
    return Math.round(data[data.length - 1].trend - data[0].trend);
  }, [data]);

  // Custom high-contrast Dark Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const point: ProgressDataPoint = payload[0].payload;
    if (!point) return null;

    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-white">
          <span className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>{point.fullDate}</span>
          </span>
          {point.isToday && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              Today
            </span>
          )}
        </div>

        <div className="space-y-1.5 pt-0.5 text-[11px]">
          <div className="flex items-center justify-between text-indigo-300 font-medium">
            <span className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Study Hours:</span>
            </span>
            <span className="font-bold tabular-nums">
              {point.studyHours}h <span className="text-slate-400 font-normal">/ {point.targetHours}h</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-emerald-300 font-medium">
            <span className="flex items-center space-x-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quiz Accuracy:</span>
            </span>
            <span className="font-bold tabular-nums">{point.quizAccuracy}%</span>
          </div>

          <div className="flex items-center justify-between text-amber-300 font-medium">
            <span className="flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Mastery Trend:</span>
            </span>
            <span className="font-bold tabular-nums">{point.trend}%</span>
          </div>

          <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
            <span>Questions Practiced:</span>
            <span className="font-bold text-slate-200 tabular-nums">
              {point.questionsAnswered} MCQs
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
            <Activity className="w-4 h-4" />
            <span>Learning Progress Analytics</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-indigo-400">Recharts Dual-Axis Visualization</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-amber-400 font-mono tabular-nums">
              {accuracyTrendDelta >= 0 ? `+${accuracyTrendDelta}%` : `${accuracyTrendDelta}%`} Trend Momentum
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Learning Progress: Study Hours, Quiz Accuracy &amp; Trend Over Time
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Track daily study dedication against your <strong className="text-slate-200">{profile.studyHoursPerDay}h/day goal</strong>, observe adaptive quiz accuracy trends, and follow your mastery trajectory.
          </p>
        </div>

        {/* View & Time Range Segmented Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric View Selector */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setMetricView('combined')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                metricView === 'combined'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Combined View
            </button>
            <button
              type="button"
              onClick={() => setMetricView('hours')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                metricView === 'hours'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hours Only
            </button>
            <button
              type="button"
              onClick={() => setMetricView('accuracy')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                metricView === 'accuracy'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Accuracy Only
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
            {(['7d', '14d', '30d'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  timeRange === range
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Study Hours</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {totalStudyHours}h
          </div>
          <div className="text-[11px] text-indigo-300 mt-1 flex items-center gap-1">
            <span>Goal met {daysGoalMet}/{data.length} days</span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Avg Quiz Accuracy</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {avgQuizAccuracy}%
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span>{totalQuestionsSolved} questions evaluated</span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Mastery Trend</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums flex items-baseline gap-1.5">
            <span>{accuracyTrendDelta >= 0 ? `+${accuracyTrendDelta}%` : `${accuracyTrendDelta}%`}</span>
            <span className="text-xs text-amber-400 font-semibold">momentum</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Calculated moving average
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Daily Target</span>
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {profile.studyHoursPerDay} hrs
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Target benchmark line
          </div>
        </div>
      </div>

      {/* Main Recharts ComposedChart Canvas */}
      <div className="w-full h-[380px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 18, right: 28, left: 0, bottom: 10 }}>
            <defs>
              {/* Indigo gradient for Study Hours bars */}
              <linearGradient id="studyHoursBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#4338ca" stopOpacity={0.6} />
              </linearGradient>

              {/* Emerald gradient for Quiz Accuracy area */}
              <linearGradient id="quizAccuracyAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="displayDate"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />

            {/* Left Y-Axis: Study Hours */}
            {(metricView === 'combined' || metricView === 'hours') && (
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#818cf8"
                tick={{ fill: '#818cf8', fontSize: 11, fontWeight: 600 }}
                unit="h"
                domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax + 0.5))]}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
            )}

            {/* Right Y-Axis: Quiz Accuracy % */}
            {(metricView === 'combined' || metricView === 'accuracy') && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#34d399"
                tick={{ fill: '#34d399', fontSize: 11, fontWeight: 600 }}
                unit="%"
                domain={[30, 100]}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{
                fontSize: '12px',
                paddingTop: '14px',
                color: '#cbd5e1',
              }}
            />

            {/* Reference Line for Daily Target Hours */}
            {(metricView === 'combined' || metricView === 'hours') && (
              <ReferenceLine
                yAxisId="left"
                y={targetDailyHours}
                stroke="#6366f1"
                strokeDasharray="4 4"
                label={{
                  value: `Target: ${targetDailyHours}h`,
                  fill: '#a5b4fc',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
            )}

            {/* Reference Line for 80% Mastery Benchmark */}
            {(metricView === 'combined' || metricView === 'accuracy') && (
              <ReferenceLine
                yAxisId="right"
                y={80}
                stroke="#10b981"
                strokeDasharray="3 3"
                label={{
                  value: '80% Mastery',
                  fill: '#6ee7b7',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
            )}

            {/* Bar: Daily Study Hours */}
            {(metricView === 'combined' || metricView === 'hours') && (
              <Bar
                yAxisId="left"
                dataKey="studyHours"
                name="Study Hours (hrs)"
                fill="url(#studyHoursBarGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={timeRange === '30d' ? 14 : timeRange === '14d' ? 24 : 36}
              />
            )}

            {/* Area & Line: Quiz Accuracy % */}
            {(metricView === 'combined' || metricView === 'accuracy') && (
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="quizAccuracy"
                name="Quiz Accuracy (%)"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#quizAccuracyAreaGradient)"
                dot={{ fill: '#10b981', r: 3, stroke: '#064e3b', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {/* Line: Trend Over Time (Moving Average) */}
            {(metricView === 'combined' || metricView === 'accuracy') && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="trend"
                name="Trend Trajectory (%)"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
        <div className="flex items-center space-x-2 text-slate-400">
          <span className="font-semibold text-slate-300">Quick Log for Today:</span>
          {onLogStudyMinutes && (
            <>
              <button
                type="button"
                onClick={() => onLogStudyMinutes(15, '15m Quick Revision')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer border border-slate-700"
              >
                +15m
              </button>
              <button
                type="button"
                onClick={() => onLogStudyMinutes(30, '30m Focused Practice')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer border border-slate-700"
              >
                +30m
              </button>
              <button
                type="button"
                onClick={() => onLogStudyMinutes(60, '1h Deep Study Sprint')}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition cursor-pointer"
              >
                +1h Sprint
              </button>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {onNavigateToQuiz && (
            <button
              type="button"
              onClick={onNavigateToQuiz}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition cursor-pointer flex items-center space-x-1"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Take Quiz to Boost Accuracy</span>
            </button>
          )}
          {onNavigateToChat && (
            <button
              type="button"
              onClick={() => onNavigateToChat('Review my learning progress and suggest where I should focus next.')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer flex items-center space-x-1 border border-slate-700"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Ask AI Tutor for Analysis</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
