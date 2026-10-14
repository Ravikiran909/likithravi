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
  Heart,
  BookOpen,
  ArrowRight,
  Search,
  Filter,
  Clock,
  Target,
  ChevronUp,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface CommunityLeaderboardProps {
  profile: StudentProfile;
  onProfileUpdate?: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onNavigateToQuiz?: () => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

export interface CommunityPeer {
  userId: string;
  name: string;
  avatarInitials: string;
  educationLevel: string;
  learningSessions: number;
  studyHours: number;
  streak: number;
  accuracy: number;
  points: number;
  weeklyDelta: number;
  rank: number;
  topSubject: string;
  badgeTitle: string;
  badgeTier: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  kudosCount: number;
  isCurrentUser: boolean;
}

export function computeLeaderboardPoints(p: Partial<StudentProfile>, bonus: number = 0): number {
  const sessions = Math.max(p.totalSessions || 0, p.focusStats?.completedSessions || 0, 1);
  const sessionPts = sessions * 120;
  const correctPts = (p.correctAnswers || 0) * 20;
  const streakPts = (p.streak || 0) * 60;
  const progressPts = Math.round((p.overallProgress || 50) * 12);
  const coursePts = (p.completedCourseIds?.length || 0) * 200;
  const focusPts = Math.round(((p.focusStats?.totalFocusMinutes || 60) / 25) * 50);
  return sessionPts + correctPts + streakPts + progressPts + coursePts + focusPts + bonus;
}

export const CommunityLeaderboard: React.FC<CommunityLeaderboardProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onNavigateToQuiz,
  onLogStudyMinutes,
}) => {
  const [allProfiles, setAllProfiles] = useState<StudentProfile[]>([]);
  const [sortBy, setSortBy] = useState<'points' | 'sessions'>('points');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'all_time'>('weekly');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kudosMap, setKudosMap] = useState<Record<string, number>>({});
  const [kudosGivenSet, setKudosGivenSet] = useState<Set<string>>(new Set());
  const [kudosToast, setKudosToast] = useState<string | null>(null);
  const [extraSimulatedBonus, setExtraSimulatedBonus] = useState<number>(0);

  // Fetch real students from backend
  useEffect(() => {
    fetch('/api/students')
      .then((r) => (r.ok ? r.json() : { profiles: [] }))
      .then((data) => {
        if (Array.isArray(data?.profiles)) {
          setAllProfiles(data.profiles);
        }
      })
      .catch(() => {});
  }, [profile.userId, profile.totalSessions, profile.streak, profile.correctAnswers]);

  // Handle cheer / kudos to foster healthy competition
  const handleGiveKudos = (peer: CommunityPeer) => {
    if (kudosGivenSet.has(peer.userId)) return;

    setKudosGivenSet((prev) => new Set(prev).add(peer.userId));
    setKudosMap((prev) => ({
      ...prev,
      [peer.userId]: (prev[peer.userId] || peer.kudosCount) + 1,
    }));

    setKudosToast(`🎉 Cheered for ${peer.name}! Healthy competition sparks great minds.`);
    setTimeout(() => setKudosToast(null), 3500);
  };

  // Quick study session booster to climb ranks
  const handleQuickSessionSprint = () => {
    const nextSessions = (profile.totalSessions || 0) + 1;
    const bonusEarned = 120;
    setExtraSimulatedBonus((prev) => prev + bonusEarned);

    if (onLogStudyMinutes) {
      onLogStudyMinutes(25, 'Community Sprint: Rapid Problem Solving');
    }

    const updatedProfile: StudentProfile = {
      ...profile,
      totalSessions: nextSessions,
    };

    if (onProfileUpdate) {
      onProfileUpdate(updatedProfile);
    }

    // Persist to backend and Firestore
    fetch(`/api/students/${profile.userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalSessions: nextSessions }),
    }).catch(() => {});

    try {
      if (db && profile.userId) {
        setDoc(
          doc(db, 'profiles', profile.userId),
          { totalSessions: nextSessions, updatedAt: new Date().toISOString() },
          { merge: true }
        ).catch(() => {});
      }
    } catch {}

    setKudosToast(`⚡ Logged 1 Study Session (+${bonusEarned} Points)! Check your climb in the leaderboard!`);
    setTimeout(() => setKudosToast(null), 4000);
  };

  // Compile full community ranking list
  const rankedPeers: CommunityPeer[] = useMemo(() => {
    // Curated high-achieving peer benchmarks
    const communitySeeds = [
      {
        userId: 'peer_aarav_sharma',
        name: 'Aarav Sharma',
        avatarInitials: 'AS',
        educationLevel: 'college',
        baseSessions: 38,
        studyHours: 42.5,
        streak: 18,
        accuracy: 94,
        topSubject: 'DSA & Algorithms',
        badgeTitle: 'Algorithm Grandmaster',
        badgeTier: 'Diamond' as const,
        kudosBase: 24,
      },
      {
        userId: 'peer_priya_nair',
        name: 'Priya Nair',
        avatarInitials: 'PN',
        educationLevel: 'competitive_exam',
        baseSessions: 34,
        studyHours: 37.0,
        streak: 15,
        accuracy: 90,
        topSubject: 'Government Exams',
        badgeTitle: 'UPSC Aspirant Star',
        badgeTier: 'Diamond' as const,
        kudosBase: 19,
      },
      {
        userId: 'peer_rohan_gupta',
        name: 'Rohan Gupta',
        avatarInitials: 'RG',
        educationLevel: 'college',
        baseSessions: 29,
        studyHours: 31.5,
        streak: 12,
        accuracy: 86,
        topSubject: 'Python',
        badgeTitle: 'Python Ninja',
        badgeTier: 'Platinum' as const,
        kudosBase: 15,
      },
      {
        userId: 'peer_ananya_reddy',
        name: 'Ananya Reddy',
        avatarInitials: 'AR',
        educationLevel: 'school',
        baseSessions: 25,
        studyHours: 28.0,
        streak: 9,
        accuracy: 83,
        topSubject: 'Calculus',
        badgeTitle: 'Calculus Conqueror',
        badgeTier: 'Gold' as const,
        kudosBase: 11,
      },
      {
        userId: 'peer_vikram_singh',
        name: 'Vikram Singh',
        avatarInitials: 'VS',
        educationLevel: 'professional',
        baseSessions: 22,
        studyHours: 24.5,
        streak: 7,
        accuracy: 81,
        topSubject: 'Generative AI',
        badgeTitle: 'Prompt Engineer',
        badgeTier: 'Gold' as const,
        kudosBase: 8,
      },
      {
        userId: 'peer_kavita_deshmukh',
        name: 'Kavita Deshmukh',
        avatarInitials: 'KD',
        educationLevel: 'college',
        baseSessions: 18,
        studyHours: 19.5,
        streak: 6,
        accuracy: 79,
        topSubject: 'Java',
        badgeTitle: 'OOP Specialist',
        badgeTier: 'Silver' as const,
        kudosBase: 6,
      },
    ];

    // Multipliers for timeframes
    const tfMult = timeframe === 'weekly' ? 0.35 : timeframe === 'monthly' ? 0.75 : 1.0;

    const seedEntries: Omit<CommunityPeer, 'rank'>[] = communitySeeds.map((seed) => {
      const sessions = Math.max(1, Math.round(seed.baseSessions * tfMult));
      const hours = Math.round(seed.studyHours * tfMult * 10) / 10;
      const pts = Math.round((sessions * 120 + hours * 35 + seed.streak * 50 + seed.accuracy * 10) * tfMult);
      return {
        userId: seed.userId,
        name: seed.name,
        avatarInitials: seed.avatarInitials,
        educationLevel: seed.educationLevel,
        learningSessions: sessions,
        studyHours: hours,
        streak: seed.streak,
        accuracy: seed.accuracy,
        points: pts,
        weeklyDelta: Math.round(sessions * 15 + seed.streak * 8),
        topSubject: seed.topSubject,
        badgeTitle: seed.badgeTitle,
        badgeTier: seed.badgeTier,
        kudosCount: kudosMap[seed.userId] || seed.kudosBase,
        isCurrentUser: false,
      };
    });

    // Map other real profiles in the database
    const otherRealEntries: Omit<CommunityPeer, 'rank'>[] = allProfiles
      .filter((p) => p.userId !== profile.userId)
      .map((p) => {
        const sessions = Math.max(1, Math.round((p.totalSessions || 12) * tfMult));
        const hours = Math.round(((p.studyHoursPerDay || 2) * 8 * tfMult) * 10) / 10;
        const pts = Math.round(computeLeaderboardPoints(p) * tfMult);
        const initials = p.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'ST';
        const acc =
          p.totalQuestionsAnswered > 0
            ? Math.round((p.correctAnswers / p.totalQuestionsAnswered) * 100)
            : 78;

        return {
          userId: p.userId,
          name: p.name,
          avatarInitials: initials,
          educationLevel: p.educationLevel || 'college',
          learningSessions: sessions,
          studyHours: hours,
          streak: p.streak || 3,
          accuracy: acc,
          points: pts,
          weeklyDelta: Math.round(sessions * 14 + (p.streak || 1) * 6),
          topSubject: p.subjects?.[0] || 'DSA & Algorithms',
          badgeTitle: pts >= 2500 ? 'Mastery Prodigy' : 'Rising Scholar',
          badgeTier: pts >= 2500 ? 'Platinum' : pts >= 1800 ? 'Gold' : 'Silver',
          kudosCount: kudosMap[p.userId] || 7,
          isCurrentUser: false,
        };
      });

    // Current user entry
    const mySessions = Math.max(
      1,
      Math.round(
        (Math.max(profile.totalSessions || 0, profile.focusStats?.completedSessions || 0, 14) +
          (extraSimulatedBonus > 0 ? Math.floor(extraSimulatedBonus / 120) : 0)) *
          tfMult
      )
    );
    const myHours = Math.round(
      (Math.max(1, profile.studyHoursPerDay * 7) + (extraSimulatedBonus / 120) * 0.5) * tfMult * 10
    ) / 10;
    const myPoints = Math.round(
      (computeLeaderboardPoints(profile) + extraSimulatedBonus) * tfMult
    );
    const myAccuracy =
      profile.totalQuestionsAnswered > 0
        ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
        : 82;
    const myInitials = profile.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ME';

    const currentUserEntry: Omit<CommunityPeer, 'rank'> = {
      userId: profile.userId,
      name: `${profile.name} (You)`,
      avatarInitials: myInitials,
      educationLevel: profile.educationLevel || 'college',
      learningSessions: mySessions,
      studyHours: myHours,
      streak: profile.streak || 1,
      accuracy: myAccuracy,
      points: myPoints,
      weeklyDelta: 280 + extraSimulatedBonus,
      topSubject: profile.subjects?.[0] || 'Python Programming',
      badgeTitle: myPoints >= 2500 ? 'Diamond Veteran' : myPoints >= 1800 ? 'Gold Scholar' : 'Silver Learner',
      badgeTier: myPoints >= 2500 ? 'Diamond' : myPoints >= 1800 ? 'Gold' : 'Silver',
      kudosCount: kudosMap[profile.userId] || 12,
      isCurrentUser: true,
    };

    // Combine and deduplicate
    const combined = [currentUserEntry, ...seedEntries, ...otherRealEntries];
    const uniqueMap = new Map<string, Omit<CommunityPeer, 'rank'>>();
    combined.forEach((item) => {
      if (!uniqueMap.has(item.userId)) {
        uniqueMap.set(item.userId, item);
      }
    });

    const list = Array.from(uniqueMap.values());

    // Sort according to user preference
    list.sort((a, b) => {
      if (sortBy === 'sessions') {
        return b.learningSessions !== a.learningSessions
          ? b.learningSessions - a.learningSessions
          : b.points - a.points;
      }
      return b.points !== a.points ? b.points - a.points : b.learningSessions - a.learningSessions;
    });

    return list.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [
    profile,
    allProfiles,
    sortBy,
    timeframe,
    extraSimulatedBonus,
    kudosMap,
  ]);

  // Filter list by subject and search
  const filteredPeers = useMemo(() => {
    return rankedPeers.filter((peer) => {
      const matchesSearch =
        peer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        peer.topSubject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject =
        subjectFilter === 'all' ||
        peer.topSubject.toLowerCase().includes(subjectFilter.toLowerCase());
      return matchesSearch && matchesSubject;
    });
  }, [rankedPeers, searchQuery, subjectFilter]);

  // Current user standing
  const currentUserRank = useMemo(() => {
    return rankedPeers.find((p) => p.isCurrentUser);
  }, [rankedPeers]);

  const peerAboveCurrentUser = useMemo(() => {
    if (!currentUserRank || currentUserRank.rank === 1) return null;
    return rankedPeers.find((p) => p.rank === currentUserRank.rank - 1);
  }, [rankedPeers, currentUserRank]);

  // Top 3 Podium peers
  const topThree = useMemo(() => {
    return rankedPeers.slice(0, 3);
  }, [rankedPeers]);

  return (
    <section
      aria-label="Community Leaderboard"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-6"
    >
      {/* Background Decorative Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 relative z-10">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Healthy Peer Competition
            </span>
          </div>
          <h3 className="text-xl font-black text-white mt-1 flex items-center space-x-2">
            <span>Community Leaderboard</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
              Live Standings
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Ranked list of top students based on their total learning sessions and points earned through quizzes, WhatsApp doubt-solving, and study consistency.
          </p>
        </div>

        {/* Action Sprint Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleQuickSessionSprint}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
            title="Log a 25-minute study sprint to earn +1 session and +120 points"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Study Sprint (+120 XP)</span>
          </button>
          {onNavigateToQuiz && (
            <button
              type="button"
              onClick={onNavigateToQuiz}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center space-x-1.5"
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Take Quiz</span>
            </button>
          )}
        </div>
      </div>

      {/* Kudos Toast Notification */}
      {kudosToast && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{kudosToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setKudosToast(null)}
            className="text-emerald-400 hover:text-white text-xs ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* TOP 3 PODIUM SHOWCASE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 relative z-10">
        {topThree.map((peer, idx) => {
          const isGold = idx === 0;
          const isSilver = idx === 1;
          const isBronze = idx === 2;

          const borderBg = isGold
            ? 'bg-gradient-to-b from-amber-950/50 via-slate-900 to-slate-900 border-amber-500/50 shadow-amber-500/10'
            : isSilver
            ? 'bg-gradient-to-b from-slate-800/50 via-slate-900 to-slate-900 border-slate-400/40 shadow-slate-500/10'
            : 'bg-gradient-to-b from-orange-950/40 via-slate-900 to-slate-900 border-orange-500/40 shadow-orange-500/10';

          const medalIcon = isGold ? '🥇' : isSilver ? '🥈' : '🥉';
          const medalLabel = isGold ? '1st Place' : isSilver ? '2nd Place' : '3rd Place';

          return (
            <div
              key={peer.userId}
              className={`rounded-2xl border p-4.5 flex flex-col justify-between relative shadow-lg transition-transform hover:-translate-y-0.5 ${borderBg} ${
                peer.isCurrentUser ? 'ring-2 ring-indigo-400' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md ${
                      isGold
                        ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950'
                        : isSilver
                        ? 'bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-950'
                        : 'bg-gradient-to-tr from-orange-500 to-amber-600 text-white'
                    }`}
                  >
                    {peer.avatarInitials}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-white text-sm truncate max-w-[140px]">
                        {peer.name}
                      </span>
                      {peer.isCurrentUser && (
                        <span className="px-1.5 py-0.2 bg-indigo-500 text-white text-[9px] font-black rounded">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {peer.topSubject}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl block leading-none">{medalIcon}</span>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider ${
                      isGold ? 'text-amber-400' : isSilver ? 'text-slate-300' : 'text-orange-400'
                    }`}
                  >
                    {medalLabel}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80">
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    <span>Sessions</span>
                  </div>
                  <div className="text-base font-black text-white mt-0.5">
                    {peer.learningSessions} <span className="text-[11px] font-normal text-slate-400">({peer.studyHours}h)</span>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Points</span>
                  </div>
                  <div className="text-base font-black text-amber-300 mt-0.5">
                    {peer.points.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">XP</span>
                  </div>
                </div>
              </div>

              {/* Bottom Cheer & Streak info */}
              <div className="flex items-center justify-between mt-3 text-xs pt-1">
                <span className="text-slate-400 flex items-center space-x-1 text-[11px]">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{peer.streak}d streak</span>
                </span>
                {!peer.isCurrentUser && (
                  <button
                    type="button"
                    onClick={() => handleGiveKudos(peer)}
                    className="flex items-center space-x-1 text-slate-400 hover:text-rose-400 text-[11px] transition cursor-pointer"
                  >
                    <Heart className={`w-3.5 h-3.5 ${kudosGivenSet.has(peer.userId) ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{peer.kudosCount} Cheers</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* USER STANDING CALLOUT BANNER */}
      {currentUserRank && (
        <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/40 rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-black text-lg text-indigo-300 shrink-0">
              #{currentUserRank.rank}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Your Current Standing
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentUserRank.badgeTitle}
                </span>
              </div>
              <h4 className="text-base font-bold text-white mt-0.5">
                Rank #{currentUserRank.rank} with {currentUserRank.learningSessions} learning sessions & {currentUserRank.points.toLocaleString()} points
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {peerAboveCurrentUser ? (
                  <span>
                    You are just <strong className="text-amber-300">{(peerAboveCurrentUser.points - currentUserRank.points + 1).toLocaleString()} points</strong> or <strong className="text-amber-300">{Math.max(1, peerAboveCurrentUser.learningSessions - currentUserRank.learningSessions)} session(s)</strong> behind #{peerAboveCurrentUser.rank} {peerAboveCurrentUser.name}!
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold">
                    👑 You are leading the community leaderboard! Keep shining and inspiring others!
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateToChat && (
              <button
                type="button"
                onClick={() => onNavigateToChat('Give me a challenging practice problem to earn more learning points on the leaderboard!')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Practice on WhatsApp</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleQuickSessionSprint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              +1 Study Session
            </button>
          </div>
        </div>
      )}

      {/* FILTER & SORT CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort By Mode */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setSortBy('points')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                sortBy === 'points'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 Sort by Points (XP)
            </button>
            <button
              type="button"
              onClick={() => setSortBy('sessions')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                sortBy === 'sessions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📚 Sort by Sessions
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setTimeframe('weekly')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                timeframe === 'weekly'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('monthly')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                timeframe === 'monthly'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('all_time')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                timeframe === 'all_time'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All-Time
            </button>
          </div>
        </div>

        {/* Search & Subject Filter Input */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search peer or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 w-44"
            />
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Subjects</option>
            <option value="dsa">DSA & Algorithms</option>
            <option value="python">Python</option>
            <option value="calculus">Calculus</option>
            <option value="government">Gov Exams</option>
            <option value="ai">AI & Agents</option>
          </select>
        </div>
      </div>

      {/* RANKED COMMUNITY TABLE */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4 text-center">Learning Sessions</th>
              <th className="py-3 px-4 text-center">Study Hours</th>
              <th className="py-3 px-4 text-center">Quiz Accuracy</th>
              <th className="py-3 px-4 text-right">Total Points (XP)</th>
              <th className="py-3 px-4 text-center">Cheer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredPeers.map((peer) => {
              const isTopRank = peer.rank <= 3;
              return (
                <tr
                  key={peer.userId}
                  className={`transition-colors ${
                    peer.isCurrentUser
                      ? 'bg-indigo-950/40 font-semibold'
                      : 'hover:bg-slate-900/60'
                  }`}
                >
                  {/* Rank Column */}
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <div className="flex items-center space-x-1.5">
                      {peer.rank === 1 ? (
                        <span className="text-amber-400 text-base leading-none">🥇 1</span>
                      ) : peer.rank === 2 ? (
                        <span className="text-slate-300 text-base leading-none">🥈 2</span>
                      ) : peer.rank === 3 ? (
                        <span className="text-orange-400 text-base leading-none">🥉 3</span>
                      ) : (
                        <span className="text-slate-400 text-sm">#{peer.rank}</span>
                      )}
                    </div>
                  </td>

                  {/* Student Info */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isTopRank
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {peer.avatarInitials}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`font-semibold ${peer.isCurrentUser ? 'text-indigo-300 font-bold' : 'text-white'}`}>
                            {peer.name}
                          </span>
                          {peer.isCurrentUser && (
                            <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[9px] font-bold rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{peer.topSubject}</span>
                          <span>•</span>
                          <span className="flex items-center space-x-0.5 text-amber-400">
                            <Flame className="w-3 h-3 fill-amber-400" />
                            <span>{peer.streak}d streak</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Learning Sessions */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-black font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{peer.learningSessions} sessions</span>
                    </span>
                  </td>

                  {/* Study Hours */}
                  <td className="py-3.5 px-4 text-center text-slate-300 font-mono font-medium">
                    {peer.studyHours} hrs
                  </td>

                  {/* Quiz Accuracy */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`font-semibold ${
                        peer.accuracy >= 90
                          ? 'text-emerald-400'
                          : peer.accuracy >= 80
                          ? 'text-teal-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {peer.accuracy}%
                    </span>
                  </td>

                  {/* Total Points */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-extrabold text-amber-300 font-mono text-sm">
                      {peer.points.toLocaleString()} XP
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium">
                      +{peer.weeklyDelta} this period
                    </div>
                  </td>

                  {/* Cheer / Kudos Button */}
                  <td className="py-3.5 px-4 text-center">
                    {peer.isCurrentUser ? (
                      <span className="text-[10px] text-indigo-400 italic">Self</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGiveKudos(peer)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          kudosGivenSet.has(peer.userId)
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'bg-slate-900 hover:bg-rose-500/10 border-slate-800 text-slate-400 hover:text-rose-400'
                        }`}
                        title={`Cheer for ${peer.name}`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            kudosGivenSet.has(peer.userId) ? 'fill-rose-400' : ''
                          }`}
                        />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Encouragement Footer */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Rankings refresh live after every WhatsApp lesson, quiz completion, and deep focus session.
          </span>
        </div>
        <div className="text-slate-500 text-[11px]">
          Compete constructively • Collaborate in Study Circles
        </div>
      </div>
    </section>
  );
};
