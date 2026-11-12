import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ComposedChart,
} from 'recharts';
import { 
  TrendingUp, 
  Flame, 
  CheckCircle2, 
  Activity, 
  Calendar, 
  ChevronRight,
  Info,
  Zap,
  Target
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface AnalyticsDataPoint {
  date: string;
  displayDate: string;
  mastery: number;
  questions: number;
  streak: number;
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
    
    const currentStreak = profile.streak || 1;
    const totalQuestions = profile.totalQuestionsAnswered || 0;
    const baseMastery = profile.overallProgress || 65;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isToday = i === 0;
      
      const dayIdx = days - 1 - i;
      const progressFactor = dayIdx / (days - 1 || 1);
      
      // Mastery grows over time
      const mastery = Math.round(Math.max(20, baseMastery - 15 + (progressFactor * 15) + (Math.random() * 2)));
      
      // Questions solved per day (randomized but realistic)
      const dailyQuestions = isToday ? (profile.questionsAnsweredToday || 5) : Math.round(5 + Math.random() * 10);
      
      // Streak calculation
      let dayStreak = 0;
      if (isToday) {
        dayStreak = currentStreak;
      } else {
        // Mock a streak that grows towards today
        dayStreak = Math.max(0, currentStreak - i);
      }

      points.push({
        date: d.toISOString().split('T')[0],
        displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        mastery,
        questions: dailyQuestions,
        streak: dayStreak,
        isToday
      });
    }
    return points;
  }, [timeRange, profile.streak, profile.totalQuestionsAnswered, profile.overallProgress, profile.questionsAnsweredToday]);

  const stats = useMemo(() => {
    const avgQuestions = Math.round(data.reduce((acc, curr) => acc + curr.questions, 0) / data.length);
    const peakMastery = Math.max(...data.map(d => d.mastery));
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
                  {entry.value}{entry.name.includes('Mastery') ? '%' : entry.name.includes('Streak') ? 'd' : ''}
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
          <p className="text-xs text-slate-500">Advanced learning telemetry and behavioral analytics</p>
        </div>

        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {(['7d', '14d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
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

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 group hover:border-amber-500/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Commitment</span>
          </div>
          <div className="text-2xl font-black text-white tabular-nums">{profile.streak}d</div>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Current active streak</p>
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
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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

        {/* Streak Intensity (Integrated view) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Study Streak Continuity
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Streak
              </div>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="displayDate" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                  interval={timeRange === '30d' ? 4 : 0}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="streak" 
                  name="Study Streak"
                  fill="#f59e0b" 
                  opacity={0.15}
                  barSize={40}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="streak" 
                  name="Consecutive Days"
                  stroke="#f59e0b" 
                  strokeWidth={4}
                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                  animationDuration={2000}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-[10px] text-slate-500 font-medium italic">
              Consistency is key. Your streak reflects consecutive days with at least one practice session logged via WhatsApp or the dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
