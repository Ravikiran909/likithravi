import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  Clock,
  Award,
  TrendingUp,
  Calendar,
  Sparkles,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface WeeklyLearningActivityChartProps {
  profile: StudentProfile;
  extraMinutesToday?: number;
  onLogStudyMinutes?: (mins: number) => void;
}

interface WeeklyActivityPoint {
  day: string;
  fullDay: string;
  dateStr: string;
  studyHours: number;
  targetHours: number;
  quizScore: number;
  questionsAnswered: number;
  isToday: boolean;
}

export const WeeklyLearningActivityChart: React.FC<WeeklyLearningActivityChartProps> = ({
  profile,
  extraMinutesToday = 45,
  onLogStudyMinutes,
}) => {
  const [metricView, setMetricView] = useState<'both' | 'hours' | 'quiz'>('both');
  const [simulatedQuizBonus, setSimulatedQuizBonus] = useState<number>(0);

  const baseAccuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 78;

  const targetHours = profile.studyHoursPerDay || 2;

  const weeklyData: WeeklyActivityPoint[] = useMemo(() => {
    const today = new Date();
    const points: WeeklyActivityPoint[] = [];

    // Build last 7 days ending Today
    const studyMultipliers = [0.85, 1.0, 0.75, 1.15, 0.95, 1.25, 1.0];
    const quizOffsets = [-8, -5, -9, -2, +1, +4, 0];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const idx = 6 - i;
      const isToday = i === 0;

      const dayShort = d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDay = d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      const hours = isToday
        ? Math.round((extraMinutesToday / 60) * 10) / 10
        : Math.round(targetHours * studyMultipliers[idx] * 10) / 10;

      const rawQuiz = isToday
        ? Math.min(100, baseAccuracy + simulatedQuizBonus)
        : Math.max(45, Math.min(98, baseAccuracy + quizOffsets[idx]));

      points.push({
        day: isToday ? `${dayShort} (Today)` : dayShort,
        fullDay,
        dateStr: d.toISOString().split('T')[0],
        studyHours: hours,
        targetHours,
        quizScore: rawQuiz,
        questionsAnswered: isToday
          ? (profile.questionsAnsweredToday || 6) + Math.round(simulatedQuizBonus / 2)
          : 5 + ((idx * 3) % 7),
        isToday,
      });
    }

    return points;
  }, [profile.studyHoursPerDay, extraMinutesToday, baseAccuracy, simulatedQuizBonus, targetHours, profile.questionsAnsweredToday]);

  const totalWeeklyHours = useMemo(
    () => Math.round(weeklyData.reduce((acc, p) => acc + p.studyHours, 0) * 10) / 10,
    [weeklyData]
  );

  const avgQuizPerformance = useMemo(
    () => Math.round(weeklyData.reduce((acc, p) => acc + p.quizScore, 0) / weeklyData.length),
    [weeklyData]
  );

  const daysGoalMet = useMemo(
    () => weeklyData.filter((p) => p.studyHours >= p.targetHours).length,
    [weeklyData]
  );

  const CustomWeeklyTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point: WeeklyActivityPoint = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[205px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-white">
            <span className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>{point.fullDay}</span>
            </span>
            {point.isToday && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                Today
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sky-400 font-medium">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Daily Study Hours:</span>
              </span>
              <span className="font-bold">
                {point.studyHours}h / {point.targetHours}h
              </span>
            </div>

            <div className="flex items-center justify-between text-emerald-400 font-medium">
              <span className="flex items-center space-x-1.5">
                <Award className="w-3.5 h-3.5" />
                <span>Quiz Performance:</span>
              </span>
              <span className="font-bold">{point.quizScore}%</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Questions Solved:</span>
              <span className="text-white font-semibold">{point.questionsAnswered} MCQs</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-white text-base">
                Weekly Learning Activity
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                7-Day Trend
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparing your daily study hours against quiz accuracy performance trends across the past 7 days
            </p>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setMetricView('both')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                metricView === 'both'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dual Trend
            </button>
            <button
              type="button"
              onClick={() => setMetricView('hours')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1 cursor-pointer ${
                metricView === 'hours'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Study Hours</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricView('quiz')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center space-x-1 cursor-pointer ${
                metricView === 'quiz'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3 h-3" />
              <span>Quiz Score %</span>
            </button>
          </div>

          {onLogStudyMinutes && (
            <button
              type="button"
              onClick={() => {
                onLogStudyMinutes(30);
                setSimulatedQuizBonus((prev) => Math.min(18, prev + 3));
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1 cursor-pointer active:scale-95"
              title="Log 30m study session & refresh today's point"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+0.5h Today</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-sky-400 font-semibold flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Weekly Study Time</span>
          </div>
          <div className="text-xl font-bold text-white mt-1">{totalWeeklyHours} hrs</div>
          <span className="text-[10px] text-slate-400">
            Target: {Math.round(targetHours * 7 * 10) / 10} hrs/wk
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
            <Award className="w-3.5 h-3.5" />
            <span>Avg Quiz Accuracy</span>
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{avgQuizPerformance}%</div>
          <span className="text-[10px] text-slate-400">7-day rolling average</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-amber-400 font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Daily Target Hit</span>
          </div>
          <div className="text-xl font-bold text-white mt-1">{daysGoalMet} / 7 Days</div>
          <span className="text-[10px] text-slate-400">Met {targetHours}h/day goal</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
          <div className="text-[11px] text-indigo-400 font-semibold flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Today's Progress</span>
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {weeklyData[weeklyData.length - 1]?.studyHours || 0}h •{' '}
            {weeklyData[weeklyData.length - 1]?.quizScore || baseAccuracy}%
          </div>
          <span className="text-[10px] text-slate-400">Live session telemetry</span>
        </div>
      </div>

      {/* Recharts LineChart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeklyData} margin={{ top: 10, right: 18, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis
              dataKey="day"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            {(metricView === 'both' || metricView === 'hours') && (
              <YAxis
                yAxisId="hoursAxis"
                orientation="left"
                domain={[0, Math.max(4, Math.ceil(targetHours * 1.6))]}
                stroke="#38bdf8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(v) => `${v}h`}
              />
            )}

            {(metricView === 'both' || metricView === 'quiz') && (
              <YAxis
                yAxisId="quizAxis"
                orientation={metricView === 'quiz' ? 'left' : 'right'}
                domain={[0, 100]}
                stroke="#10b981"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(v) => `${v}%`}
              />
            )}

            <Tooltip content={<CustomWeeklyTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              iconType="circle"
            />

            {(metricView === 'both' || metricView === 'hours') && (
              <ReferenceLine
                yAxisId="hoursAxis"
                y={targetHours}
                stroke="#6366f1"
                strokeDasharray="4 4"
                label={{
                  value: `Goal (${targetHours}h)`,
                  position: 'insideTopLeft',
                  fill: '#818cf8',
                  fontSize: 10,
                }}
              />
            )}

            {(metricView === 'both' || metricView === 'hours') && (
              <Line
                yAxisId="hoursAxis"
                type="monotone"
                dataKey="studyHours"
                name="Daily Study Hours (hrs)"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 4, fill: '#38bdf8', strokeWidth: 2, stroke: '#0f172a' }}
                activeDot={{ r: 6, fill: '#38bdf8' }}
              />
            )}

            {(metricView === 'both' || metricView === 'quiz') && (
              <Line
                yAxisId="quizAxis"
                type="monotone"
                dataKey="quizScore"
                name="Quiz Performance (%)"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
                activeDot={{ r: 6, fill: '#10b981' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
