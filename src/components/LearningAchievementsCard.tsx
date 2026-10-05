import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Share2,
  Zap,
  GraduationCap,
  Shield,
  Star,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { StudentProfile, LearningResource } from '../types/index.ts';
import {
  AchievementBadge,
  calculateLearningAchievements,
} from '../utils/achievements.ts';

interface LearningAchievementsCardProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToCourses?: () => void;
  onNavigateToChat?: (prompt?: string) => void;
}

export const LearningAchievementsCard: React.FC<LearningAchievementsCardProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToCourses,
  onNavigateToChat,
}) => {
  const [courses, setCourses] = useState<LearningResource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'streak' | 'course_completion'>('all');
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const [celebrationBadge, setCelebrationBadge] = useState<AchievementBadge | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch courses to calculate course-specific achievements
  useEffect(() => {
    fetch('/api/learning-resources')
      .then((res) => (res.ok ? res.json() : { resources: [] }))
      .then((data) => setCourses(data.resources || []))
      .catch((err) => console.warn('Could not load courses for achievements:', err));
  }, []);

  const {
    allBadges,
    streakBadges,
    courseBadges,
    unlockedCount,
    totalCount,
    completionRate,
    currentStreakTier,
  } = calculateLearningAchievements(profile, courses);

  const displayedBadges =
    selectedCategory === 'streak'
      ? streakBadges
      : selectedCategory === 'course_completion'
      ? courseBadges
      : allBadges;

  // Streak Boost handler to simulate or record continuous streak
  const handleBoostStreak = async () => {
    setIsUpdating(true);
    const newStreak = (profile.streak || 0) + 1;
    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streak: newStreak,
          lastActiveDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);

        // Check if any badge just got unlocked
        const nextAchievements = calculateLearningAchievements(updated, courses);
        const newlyUnlocked = nextAchievements.streakBadges.find(
          (b) => b.unlocked && streakBadges.find((sb) => sb.id === b.id && !sb.unlocked)
        );

        if (newlyUnlocked) {
          setCelebrationBadge(newlyUnlocked);
        }
      }
    } catch (e) {
      console.error('Failed to boost streak:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  // Share achievement to WhatsApp
  const handleShareBadge = (badge: AchievementBadge) => {
    const text = `🏆 *Achievement Unlocked on WhatsApp AI Tutor!* 🌟\n\nI just earned the *${badge.title}* badge (${badge.tier} tier)!\n• *Description:* ${badge.description}\n• *Current Study Streak:* ${profile.streak} Days 🔥\n• *Completed Courses:* ${(profile.completedCourseIds || []).length}\n\nJoin me in learning with AI on WhatsApp! 🚀`;
    if (onNavigateToChat) {
      onNavigateToChat(text);
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
    setSelectedBadge(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-6">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div className="flex items-start space-x-4">
          <div className="p-3.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-2xl text-amber-400 shadow-inner">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Learning Achievements & Badges
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {currentStreakTier}
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-1 tracking-tight">
              Honors, Course Medals & Streak Badges
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Earn distinguished badges by completing verified courses, mastering GenAI & AI Agents, and keeping your daily WhatsApp study streak blazing!
            </p>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center min-w-[105px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Badges Earned</span>
            <span className="text-lg font-black text-amber-400">
              {unlockedCount} <span className="text-xs font-normal text-slate-500">/ {totalCount}</span>
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center min-w-[105px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Streak</span>
            <span className="text-lg font-black text-orange-400 flex items-center justify-center space-x-1">
              <span>{profile.streak}</span>
              <span className="text-sm">🔥</span>
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center min-w-[105px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Courses Done</span>
            <span className="text-lg font-black text-emerald-400">
              {(profile.completedCourseIds || []).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Quick Action Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>All Badges ({allBadges.length})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('streak')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'streak'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Study Streaks ({streakBadges.length})</span>
          </button>

          <button
            onClick={() => setSelectedCategory('course_completion')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
              selectedCategory === 'course_completion'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Course Completions ({courseBadges.length})</span>
          </button>
        </div>

        {/* Quick Streak Simulation / Course Explorer */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleBoostStreak}
            disabled={isUpdating}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Simulate daily check-in to level up study streak"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>+1 Day Streak</span>
          </button>

          {onNavigateToCourses && (
            <button
              onClick={onNavigateToCourses}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <span>Explore Courses</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedBadges.map((badge) => {
          const isUnlocked = badge.unlocked;

          return (
            <div
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`rounded-2xl p-4 border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                isUnlocked
                  ? `bg-slate-950/80 border-slate-700/80 hover:border-amber-400/80 shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5`
                  : `bg-slate-950/40 border-slate-800/80 opacity-70 hover:opacity-100 hover:border-slate-700`
              }`}
            >
              {/* Top Row: Icon + Tier Badge + Lock/Check */}
              <div className="flex items-start justify-between">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border transition-transform duration-200 group-hover:scale-110 ${
                    isUnlocked
                      ? 'bg-slate-900 border-amber-500/40 shadow-inner'
                      : 'bg-slate-900/60 border-slate-800 grayscale'
                  }`}
                >
                  {badge.icon}
                </div>

                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      badge.tier === 'Diamond'
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        : badge.tier === 'Platinum'
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        : badge.tier === 'Gold'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : badge.tier === 'Silver'
                        ? 'bg-slate-400/10 text-slate-300 border-slate-400/30'
                        : 'bg-orange-500/10 text-orange-300 border-orange-500/30'
                    }`}
                  >
                    {badge.tier}
                  </span>

                  {isUnlocked ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center border border-slate-700">
                      <Lock className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="mt-3 space-y-1">
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  {badge.title}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {badge.description}
                </p>
              </div>

              {/* Progress Bar & Requirement */}
              <div className="mt-4 pt-3 border-t border-slate-900/80 space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">{badge.requirementDescription}</span>
                  <span
                    className={`font-mono font-bold ${
                      isUnlocked ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {badge.currentValue} / {badge.targetValue}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isUnlocked
                        ? 'bg-gradient-to-r from-amber-400 to-emerald-400'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${badge.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-amber-500/40 text-4xl flex items-center justify-center mx-auto shadow-xl">
                {selectedBadge.icon}
              </div>

              <div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {selectedBadge.tier} Tier • {selectedBadge.rarity}
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">{selectedBadge.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {selectedBadge.description}
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Unlock Condition:</span>
                <span className="text-white font-semibold">{selectedBadge.requirementDescription}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={`font-bold ${selectedBadge.unlocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedBadge.unlocked ? '✓ Unlocked & Earned' : '🔒 In Progress'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Progress:</span>
                <span className="text-white font-mono font-bold">
                  {selectedBadge.currentValue} / {selectedBadge.targetValue} ({selectedBadge.progressPercent}%)
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setSelectedBadge(null)}
                className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                Close
              </button>

              {selectedBadge.unlocked ? (
                <button
                  onClick={() => handleShareBadge(selectedBadge)}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </button>
              ) : selectedBadge.category === 'course_completion' && onNavigateToCourses ? (
                <button
                  onClick={() => {
                    setSelectedBadge(null);
                    onNavigateToCourses();
                  }}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-lg"
                >
                  <span>Go to Courses</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedBadge(null);
                    handleBoostStreak();
                  }}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shadow-lg"
                >
                  <Flame className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Build Streak Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Celebration Popup when a badge is unlocked */}
      {celebrationBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <div className="text-5xl animate-bounce">{celebrationBadge.icon}</div>
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                🎉 New Badge Unlocked! 🎉
              </span>
              <h3 className="text-2xl font-black text-white mt-1">{celebrationBadge.title}</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {celebrationBadge.description}
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-300 font-semibold">
              Added to your verified Student Profile accolades!
            </div>

            <button
              onClick={() => setCelebrationBadge(null)}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl transition shadow-lg shadow-amber-400/20 cursor-pointer"
            >
              Claim Badge & Keep Learning
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
