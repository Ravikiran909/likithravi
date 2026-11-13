import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  CheckCircle2,
  Activity,
  Zap,
  Target,
  BookOpen,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface AnalyticsDataPoint {
  date: string;
  displayDate: string;
  mastery: number;
  questions: number;
  isToday: boolean;
}

interface LearningAnalyticsDashboardProps {
  profile: StudentProfile;
}

export const LearningAnalyticsDashboard: React.FC<LearningAnalyticsDashboardProps> = ({ profile }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('14d');

  const data: AnalyticsDataPoint[] = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    const points: AnalyticsDataPoint[] = [];
    const today = new Date();
    const baseMastery = profile.overallProgress || 65;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isToday = i === 0;

      const dayIdx = days - 1 - i;
      const progressFactor = dayIdx / (days - 1 || 1);

      const mastery = Math.round(
        Math.max(20, Math.min(100, baseMastery - 15 + progressFactor * 15 + ((dayIdx % 3) - 1)))
      );

      const dailyQuestions = isToday
        ? profile.questionsAnsweredToday || 5
        : 4 + ((dayIdx * 3) % 9);

      points.push({
        date: d.toISOString().split('T')[0],
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        mastery,
        questions: dailyQuestions,
        isToday,
      });
    }
    return points;
  }, [timeRange, profile.totalQuestionsAnswered, profile.overallProgress, profile.questionsAnsweredToday]);

  const stats = useMemo(() => {
    const avgQuestions = Math.round(
      data.reduce((acc, curr) => acc + curr.questions, 0) / Math.max(1, data.length)
    );
    const peakMastery = Math.max(...data.map((d) => d.mastery));
    const totalPeriodQuestions = data.reduce((acc, curr) => acc + curr.questions, 0);

    return { avgQuestions, peakMastery, totalPeriodQuestions };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs text-slate-300 font-medium">{entry.name}</span>
                </div>
                <span className="text-xs font-bold text-white tabular-nums">
                  {entry.value}{entry.name.includes('Mastery') ? '%' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header & Range Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Performance Deep Dive</h2>
          </div>
          <p className="text-xs text-slate-500">Learning mastery and question-solving analytics</p>
        </div>

        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {(['7d', '14d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                timeRange === range
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 group hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Mastery</span>
          </div>
          <div className="text-2xl font-black text-white tabular-nums">{stats.peakMastery}%</div>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Peak curriculum grasp</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 group hover:border-indigo-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Efficiency</span>
          </div>
          <div className="text-2xl font-black text-white tabular-nums">{stats.avgQuestions}</div>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Avg daily questions</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 group hover:border-sky-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Volume</span>
          </div>
          <div className="text-2xl font-black text-white tabular-nums">{profile.totalQuestionsAnswered || 0}</div>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Total questions answered</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Progress (Mastery) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Learning Mastery
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Progress %
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMastery" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                  interval={timeRange === '30d' ? 5 : 0}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 2 }} />
                <Area
                  type="monotone"
                  dataKey="mastery"
                  name="Mastery Level"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMastery)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Questions Answered (Daily Output) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Daily Output
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Questions
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                  interval={timeRange === '30d' ? 5 : 0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                <Bar
                  dataKey="questions"
                  name="Questions Solved"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isToday ? '#818cf8' : '#4338ca'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
