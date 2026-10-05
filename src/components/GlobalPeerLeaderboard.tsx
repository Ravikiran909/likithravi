import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Crown,
  Medal,
  Users,
  TrendingUp,
  Zap,
  Award,
  Sparkles,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface GlobalPeerLeaderboardProps {
  profile: StudentProfile;
  onProfileUpdate?: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarInitials: string;
  educationLevel: string;
  streak: number;
  accuracy: number;
  completedCourses: number;
  totalPoints: number;
  weeklyDelta: number;
  badgeTier: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  studyGroup: string;
  isCurrentUser: boolean;
}

export function calculateLearningPoints(p: Partial<StudentProfile>): number {
  const streakPts = (p.streak || 0) * 50;
  const correctPts = (p.correctAnswers || 0) * 25;
  const progressPts = (p.overallProgress || 0) * 12;
  const coursePts = (p.completedCourseIds?.length || 0) * 200;
  const focusPts = Math.round((p.focusStats?.totalFocusMinutes || 60) * 2);
  return streakPts + correctPts + progressPts + coursePts + focusPts;
}

export const GlobalPeerLeaderboard: React.FC<GlobalPeerLeaderboardProps> = ({
  profile,
  onNavigateToChat,
}) => {
  const [allProfiles, setAllProfiles] = useState<StudentProfile[]>([]);
  const [scope, setScope] = useState<'global' | 'study_group'>('global');
  const [pointBonus, setPointBonus] = useState<number>(0);

  useEffect(() => {
    fetch('/api/students')
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((data) => {
        if (data?.profiles) setAllProfiles(data.profiles);
      })
      .catch(() => {});
  }, [profile.userId, profile.streak, profile.correctAnswers, profile.overallProgress]);

  const leaderboardEntries: LeaderboardEntry[] = useMemo(() => {
    const peerSeeds: LeaderboardEntry[] = [
      {
        userId: 'peer_ananya',
        name: 'Ananya Sharma',
        avatarInitials: 'AS',
        educationLevel: 'college',
        streak: 19,
        accuracy: 92,
        completedCourses: 4,
        totalPoints: 3420,
        weeklyDelta: 410,
        badgeTier: 'Diamond',
        studyGroup: 'AI & Algorithms Cohort',
        isCurrentUser: false,
      },
      {
        userId: 'peer_rohan',
        name: 'Rohan Verma',
        avatarInitials: 'RV',
        educationLevel: 'competitive_exam',
        streak: 14,
        accuracy: 88,
        completedCourses: 3,
        totalPoints: 2890,
        weeklyDelta: 325,
        badgeTier: 'Platinum',
        studyGroup: 'AI & Algorithms Cohort',
        isCurrentUser: false,
      },
      {
        userId: 'peer_meera',
        name: 'Meera Nair',
        avatarInitials: 'MN',
        educationLevel: 'college',
        streak: 11,
        accuracy: 85,
        completedCourses: 3,
        totalPoints: 2540,
        weeklyDelta: 260,
        badgeTier: 'Gold',
        studyGroup: 'AI & Algorithms Cohort',
        isCurrentUser: false,
      },
      {
        userId: 'peer_kabir',
        name: 'Kabir Patel',
        avatarInitials: 'KP',
        educationLevel: 'school',
        streak: 6,
        accuracy: 79,
        completedCourses: 2,
        totalPoints: 1840,
        weeklyDelta: 190,
        badgeTier: 'Silver',
        studyGroup: 'Full-Stack Study Circle',
        isCurrentUser: false,
      },
      {
        userId: 'peer_zoya',
        name: 'Zoya Khan',
        avatarInitials: 'ZK',
        educationLevel: 'professional',
        streak: 5,
        accuracy: 76,
        completedCourses: 1,
        totalPoints: 1590,
        weeklyDelta: 145,
        badgeTier: 'Bronze',
        studyGroup: 'Full-Stack Study Circle',
        isCurrentUser: false,
      },
    ];

    // Map backend student profiles
    const backendMapped: LeaderboardEntry[] = allProfiles
      .filter((p) => p.userId !== profile.userId)
      .map((p, idx) => {
        const acc =
          p.totalQuestionsAnswered > 0
            ? Math.round((p.correctAnswers / p.totalQuestionsAnswered) * 100)
            : 75;
        const pts = calculateLearningPoints(p);
        const initials = p.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return {
          userId: p.userId,
          name: p.name,
          avatarInitials: initials || 'ST',
          educationLevel: p.educationLevel,
          streak: p.streak || 1,
          accuracy: acc,
          completedCourses: p.completedCourseIds?.length || 1,
          totalPoints: pts,
          weeklyDelta: 180 + idx * 45,
          badgeTier:
            pts >= 3000
              ? 'Diamond'
              : pts >= 2400
              ? 'Platinum'
              : pts >= 1900
              ? 'Gold'
              : 'Silver',
          studyGroup: 'AI & Algorithms Cohort',
          isCurrentUser: false,
        };
      });

    // Current student entry
    const myAccuracy =
      profile.totalQuestionsAnswered > 0
        ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
        : 80;
    const myBasePoints = calculateLearningPoints(profile) + pointBonus;
    const myInitials = profile.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const currentUserEntry: LeaderboardEntry = {
      userId: profile.userId,
      name: `${profile.name} (You)`,
      avatarInitials: myInitials || 'ME',
      educationLevel: profile.educationLevel,
      streak: profile.streak || 1,
      accuracy: myAccuracy,
      completedCourses: profile.completedCourseIds?.length || 0,
      totalPoints: myBasePoints,
      weeklyDelta: 240 + pointBonus,
      badgeTier:
        myBasePoints >= 3000
          ? 'Diamond'
          : myBasePoints >= 2400
          ? 'Platinum'
          : myBasePoints >= 1900
          ? 'Gold'
          : 'Silver',
      studyGroup: 'AI & Algorithms Cohort',
      isCurrentUser: true,
    };

    const combined = [currentUserEntry, ...backendMapped, ...peerSeeds];
    // Deduplicate by name prefix
    const seen = new Set<string>();
    const unique = combined.filter((item) => {
      const key = item.isCurrentUser ? '__ME__' : item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const filtered =
      scope === 'study_group'
        ? unique.filter((u) => u.studyGroup === 'AI & Algorithms Cohort')
        : unique;

    return filtered.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [allProfiles, profile, scope, pointBonus]);

  const currentUserRank =
    leaderboardEntries.findIndex((e) => e.isCurrentUser) + 1 || 1;
  const currentUserData = leaderboardEntries.find((e) => e.isCurrentUser);
  const nextRankEntry =
    currentUserRank > 1 ? leaderboardEntries[currentUserRank - 2] : null;
  const pointsToNextRank = nextRankEntry && currentUserData
    ? Math.max(10, nextRankEntry.totalPoints - currentUserData.totalPoints + 10)
    : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-6">
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl text-amber-400 shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Global Peer Leaderboard
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Rank #{currentUserRank} of {leaderboardEntries.length}
              </span>
            </div>
            <h3 className="text-lg font-black text-white mt-0.5">
              Study Group Standings & Total Learning Points (XP)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Earn Learning Points from daily streaks (+50 XP/day), correct quiz answers (+25 XP), completed courses (+200 XP), and Pomodoro focus sessions.
            </p>
          </div>
        </div>

        {/* Scope Toggle & Share */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setScope('global')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                scope === 'global'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌍 Global Peers
            </button>
            <button
              type="button"
              onClick={() => setScope('study_group')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 cursor-pointer ${
                scope === 'study_group'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Study Group</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPointBonus((b) => b + 150)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer active:scale-95"
            title="Complete a quick peer challenge for +150 XP"
          >
            ⚡ +150 XP Challenge
          </button>
        </div>
      </div>

      {/* Current Student Standing Callout Banner */}
      {currentUserData && (
        <div className="relative z-10 bg-gradient-to-r from-indigo-950/70 via-slate-950 to-amber-950/40 border border-indigo-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black text-base flex items-center justify-center shadow-lg">
              #{currentUserRank}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Your Current Standing: {currentUserData.totalPoints.toLocaleString()} XP</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentUserData.badgeTier} League
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {nextRankEntry
                  ? `Only ${pointsToNextRank} XP needed to overtake ${nextRankEntry.name} for Rank #${currentUserRank - 1}!`
                  : `🏆 You are #1 at the top of the leaderboard! Keep defending your crown!`}
              </p>
            </div>
          </div>

          {onNavigateToChat && (
            <button
              type="button"
              onClick={() =>
                onNavigateToChat(
                  `🏆 I am currently Rank #${currentUserRank} on the Global Peer Leaderboard with ${currentUserData.totalPoints} XP! Give me a high-XP challenge question to climb higher!`
                )
              }
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 shrink-0 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Challenge Peers on WhatsApp</span>
            </button>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="relative z-10 space-y-2">
        {leaderboardEntries.map((entry, idx) => {
          const rank = idx + 1;
          return (
            <div
              key={entry.userId}
              className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                entry.isCurrentUser
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                {/* Rank Badge */}
                <div
                  className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                    rank === 1
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                      : rank === 2
                      ? 'bg-slate-300 text-slate-950'
                      : rank === 3
                      ? 'bg-orange-400 text-slate-950'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {rank <= 3 ? (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉') : `#${rank}`}
                </div>

                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                    entry.isCurrentUser
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {entry.avatarInitials}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm font-bold ${
                        entry.isCurrentUser ? 'text-amber-300' : 'text-white'
                      }`}
                    >
                      {entry.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {entry.studyGroup}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center space-x-1 text-amber-400">
                      <Flame className="w-3 h-3 fill-amber-400" />
                      <span>{entry.streak}d streak</span>
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400">{entry.accuracy}% quiz accuracy</span>
                    <span>•</span>
                    <span>{entry.completedCourses} courses</span>
                  </div>
                </div>
              </div>

              {/* Points & Weekly Delta */}
              <div className="flex items-center justify-between sm:justify-end space-x-4 pl-12 sm:pl-0">
                <div className="text-right">
                  <div className="text-sm font-black text-white font-mono">
                    {entry.totalPoints.toLocaleString()} XP
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold">
                    +{entry.weeklyDelta} XP this week
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
