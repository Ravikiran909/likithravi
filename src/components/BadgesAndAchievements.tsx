import React, { useState, useMemo } from 'react';
import {
  Award,
  Flame,
  Trophy,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  Share2,
  Download,
  Zap,
  Star,
  Target,
  Clock,
  BookOpen,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface BadgesAndAchievementsProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onOpenFullBadgesVault?: () => void;
}

export interface DigitalStickerBadge {
  id: string;
  title: string;
  stickerTag: string;
  emoji: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  description: string;
  requirementLabel: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  unlocked: boolean;
  gradientClass: string;
  borderClass: string;
  accentHex: string;
}

export const BadgesAndAchievements: React.FC<BadgesAndAchievementsProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onOpenFullBadgesVault,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [activeStickerModal, setActiveStickerModal] = useState<DigitalStickerBadge | null>(null);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const quizAccuracy =
    profile.totalQuestionsAnswered > 0
      ? Math.round((profile.correctAnswers / profile.totalQuestionsAnswered) * 100)
      : 0;

  const focusMinutes = profile.focusStats?.totalFocusMinutes || 125;
  const pinnedDocsCount = profile.pinnedDocumentIds?.length || 1;
  const earnedIdsSet = useMemo(
    () => new Set((profile.earnedBadges || []).map((b) => b.id)),
    [profile.earnedBadges]
  );

  const stickers: DigitalStickerBadge[] = useMemo(() => {
    const streakVal = profile.streak || 0;
    const topPerfScore = Math.max(quizAccuracy, profile.overallProgress || 0);
    const questionsSolved = profile.totalQuestionsAnswered || 0;
    const masteredCount =
      (profile.strongTopics?.length || 0) +
      (profile.learningHistory?.filter((h) => h.mastered).length || 0);

    return [
      {
        id: 'sticker_7_day_streak',
        title: '7-Day Streak',
        stickerTag: 'STREAK LEGEND STICKER',
        emoji: '🔥',
        tier: 'Gold',
        description:
          'Awarded for maintaining 7 consecutive days of active WhatsApp learning without breaking your study chain.',
        requirementLabel: '7 consecutive study days',
        currentValue: Math.min(7, streakVal),
        targetValue: 7,
        unit: 'days',
        unlocked: streakVal >= 7 || earnedIdsSet.has('sticker_7_day_streak') || earnedIdsSet.has('streak-master'),
        gradientClass: 'from-amber-500/25 via-orange-600/15 to-slate-900',
        borderClass: 'border-amber-400/60',
        accentHex: '#f59e0b',
      },
      {
        id: 'sticker_top_performer',
        title: 'Top Performer',
        stickerTag: 'ELITE SCHOLAR STICKER',
        emoji: '👑',
        tier: 'Diamond',
        description:
          'Unlocked by achieving 80%+ quiz accuracy or reaching 75%+ overall curriculum mastery across active subjects.',
        requirementLabel: '80%+ Quiz Accuracy or 75%+ Mastery',
        currentValue: Math.min(80, topPerfScore),
        targetValue: 80,
        unit: '% score',
        unlocked:
          quizAccuracy >= 80 ||
          (profile.overallProgress || 0) >= 75 ||
          earnedIdsSet.has('sticker_top_performer') ||
          earnedIdsSet.has('quiz-champion'),
        gradientClass: 'from-indigo-500/25 via-purple-600/15 to-slate-900',
        borderClass: 'border-indigo-400/60',
        accentHex: '#818cf8',
      },
      {
        id: 'sticker_problem_crusher',
        title: 'Problem Solver Pro',
        stickerTag: 'ACTIVE RECALL STICKER',
        emoji: '⚡',
        tier: 'Silver',
        description:
          'Awarded for answering at least 25 adaptive quiz and Socratic practice questions.',
        requirementLabel: '25+ questions answered',
        currentValue: Math.min(25, questionsSolved),
        targetValue: 25,
        unit: 'questions',
        unlocked: questionsSolved >= 25 || earnedIdsSet.has('sticker_problem_crusher'),
        gradientClass: 'from-emerald-500/25 via-teal-600/15 to-slate-900',
        borderClass: 'border-emerald-400/60',
        accentHex: '#10b981',
      },
      {
        id: 'sticker_deep_focus',
        title: 'Deep Focus Guardian',
        stickerTag: 'POMODORO LOCK STICKER',
        emoji: '🛡️',
        tier: 'Gold',
        description:
          'Unlocked by logging 2+ hours (120 mins) of distraction-free Pomodoro Deep Focus study sessions.',
        requirementLabel: '120+ focused minutes logged',
        currentValue: Math.min(120, focusMinutes),
        targetValue: 120,
        unit: 'mins',
        unlocked: focusMinutes >= 120 || earnedIdsSet.has('sticker_deep_focus'),
        gradientClass: 'from-sky-500/25 via-cyan-600/15 to-slate-900',
        borderClass: 'border-sky-400/60',
        accentHex: '#38bdf8',
      },
      {
        id: 'sticker_rag_synthesizer',
        title: 'RAG Knowledge Synthesizer',
        stickerTag: 'VOICE & RAG STICKER',
        emoji: '🧠',
        tier: 'Silver',
        description:
          'Unlocked by pinning curriculum study materials or indexing Voice-to-Knowledge notes into the RAG store.',
        requirementLabel: 'Pin or index 2+ RAG study notes',
        currentValue: Math.min(2, pinnedDocsCount),
        targetValue: 2,
        unit: 'notes',
        unlocked: pinnedDocsCount >= 2 || earnedIdsSet.has('sticker_rag_synthesizer'),
        gradientClass: 'from-rose-500/25 via-pink-600/15 to-slate-900',
        borderClass: 'border-rose-400/60',
        accentHex: '#f43f5e',
      },
      {
        id: 'sticker_concept_master',
        title: 'Concept Conqueror',
        stickerTag: 'MASTERY VAULT STICKER',
        emoji: '🏆',
        tier: 'Diamond',
        description:
          'Awarded for graduating 3 or more curriculum topics into your Mastered Topics vault.',
        requirementLabel: '3+ topics mastered',
        currentValue: Math.min(3, Math.max(1, masteredCount)),
        targetValue: 3,
        unit: 'topics',
        unlocked: masteredCount >= 3 || earnedIdsSet.has('sticker_concept_master'),
        gradientClass: 'from-fuchsia-500/25 via-purple-600/15 to-slate-900',
        borderClass: 'border-fuchsia-400/60',
        accentHex: '#e879f9',
      },
    ];
  }, [
    profile.streak,
    profile.overallProgress,
    profile.totalQuestionsAnswered,
    profile.strongTopics,
    profile.learningHistory,
    quizAccuracy,
    focusMinutes,
    pinnedDocsCount,
    earnedIdsSet,
  ]);

  const unlockedStickersCount = stickers.filter((s) => s.unlocked).length;

  const displayedStickers = useMemo(() => {
    if (filterMode === 'unlocked') return stickers.filter((s) => s.unlocked);
    if (filterMode === 'locked') return stickers.filter((s) => !s.unlocked);
    return stickers;
  }, [stickers, filterMode]);

  // Unlock / Claim a sticker milestone and persist to profile & Firestore
  const handleUnlockMilestoneSticker = async (sticker: DigitalStickerBadge) => {
    setIsSyncing(true);
    try {
      const existingBadges = profile.earnedBadges || [];
      const alreadyRecorded = existingBadges.some((b) => b.id === sticker.id);
      const updatedEarned = alreadyRecorded
        ? existingBadges
        : [
            ...existingBadges,
            {
              id: sticker.id,
              name: sticker.title,
              awardedAt: new Date().toISOString(),
            },
          ];

      const patchPayload: Partial<StudentProfile> = {
        earnedBadges: updatedEarned,
      };

      if (sticker.id === 'sticker_7_day_streak' && (profile.streak || 0) < 7) {
        patchPayload.streak = 7;
      }
      if (sticker.id === 'sticker_top_performer' && (profile.overallProgress || 0) < 80) {
        patchPayload.overallProgress = Math.max(profile.overallProgress || 75, 80);
      }

      const updatedProfile: StudentProfile = {
        ...profile,
        ...patchPayload,
      };

      onProfileUpdate(updatedProfile);

      if (db && profile.userId) {
        await setDoc(doc(db, 'profiles', profile.userId), patchPayload, { merge: true }).catch(
          () => {}
        );
      }

      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      }).catch(() => {});

      setUnlockToast(`🎉 Unlocked "${sticker.title}" Digital Sticker! Synced to your profile.`);
      setTimeout(() => setUnlockToast(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Download Digital Sticker as a crisp PNG badge using HTML5 Canvas
  const handleDownloadStickerPng = (sticker: DigitalStickerBadge) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Outer sticker die-cut white border + shadow
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 600, 600);

      // Circular sticker badge
      ctx.beginPath();
      ctx.arc(300, 300, 250, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.lineWidth = 14;
      ctx.strokeStyle = sticker.accentHex;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(300, 300, 224, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Sticker Tag
      ctx.fillStyle = sticker.accentHex;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sticker.stickerTag, 300, 145);

      // Emoji Emblem
      ctx.font = '110px sans-serif';
      ctx.fillText(sticker.emoji, 300, 280);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(sticker.title.toUpperCase(), 300, 355);

      // Tier & Student Name
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${sticker.tier} Tier  •  ${profile.name}`, 300, 400);

      // Date stamp
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText(
        `Unlocked on WhatsApp AI Companion • ${new Date().toLocaleDateString()}`,
        300,
        445
      );

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${sticker.title.replace(/\s+/g, '_')}_Digital_Sticker.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.warn('Failed to export digital sticker PNG:', err);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Decorative Ambient Glow */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Badges & Achievements Sticker Vault
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {unlockedStickersCount} / {stickers.length} Stickers Unlocked
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5">
              Collectible Digital Stickers & Study Milestone Badges
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Unlock holographic digital stickers when you hit study milestones like{' '}
              <strong className="text-amber-300">7-Day Streak</strong> or{' '}
              <strong className="text-indigo-300">Top Performer</strong>. Download stickers as PNGs or share them in your WhatsApp study chat.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(['all', 'unlocked', 'locked'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                filterMode === mode
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}

          {onOpenFullBadgesVault && (
            <button
              type="button"
              onClick={onOpenFullBadgesVault}
              className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
            >
              Full Vault →
            </button>
          )}
        </div>
      </div>

      {unlockToast && (
        <div className="relative z-10 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
          <span className="font-bold">{unlockToast}</span>
          <button
            type="button"
            onClick={() => setUnlockToast(null)}
            className="text-emerald-300 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Digital Stickers Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedStickers.map((sticker) => {
          const pct = Math.min(
            100,
            Math.round((sticker.currentValue / sticker.targetValue) * 100)
          );
          return (
            <div
              key={sticker.id}
              onClick={() => setActiveStickerModal(sticker)}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                sticker.unlocked
                  ? `bg-gradient-to-br ${sticker.gradientClass} ${sticker.borderClass} shadow-xl hover:scale-[1.01]`
                  : 'bg-slate-950/60 border-slate-800/80 opacity-85 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              {/* Die-cut Digital Sticker Emblem Top Row */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border-2 shadow-lg transition-transform group-hover:rotate-3 ${
                      sticker.unlocked
                        ? 'bg-slate-950/90 border-white/80 shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-700 grayscale'
                    }`}
                  >
                    <span>{sticker.emoji}</span>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        sticker.unlocked
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      {sticker.unlocked ? '✓ Sticker Unlocked' : '🔒 Locked'}
                    </span>
                    <span className="text-[10px] font-bold text-amber-300/90">
                      {sticker.tier} Tier
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                    {sticker.stickerTag}
                  </span>
                  <h4 className="text-base font-black text-white mt-0.5">{sticker.title}</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {sticker.description}
                  </p>
                </div>
              </div>

              {/* Milestone Progress & Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">{sticker.requirementLabel}</span>
                    <span className="font-mono font-bold text-white">
                      {sticker.currentValue}/{sticker.targetValue} {sticker.unit} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div
                  className="flex items-center justify-between gap-2 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {sticker.unlocked ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDownloadStickerPng(sticker)}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center justify-center space-x-1 transition cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-amber-400" />
                        <span>Save Sticker PNG</span>
                      </button>
                      {onNavigateToChat && (
                        <button
                          type="button"
                          onClick={() =>
                            onNavigateToChat(
                              `${sticker.emoji} I just unlocked the "${sticker.title}" (${sticker.tier} Digital Sticker) on WhatsApp AI Learning Companion!`
                            )
                          }
                          className="py-1.5 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                          title="Share Digital Sticker to WhatsApp Chat"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => handleUnlockMilestoneSticker(sticker)}
                      className="w-full py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Claim / Unlock Milestone Sticker</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Digital Sticker Preview Modal */}
      {activeStickerModal && (
        <div
          onClick={() => setActiveStickerModal(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl"
          >
            <div className="w-24 h-24 rounded-full bg-slate-950 border-4 border-white mx-auto flex items-center justify-center text-5xl shadow-xl">
              {activeStickerModal.emoji}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                {activeStickerModal.stickerTag} • {activeStickerModal.tier} Tier
              </span>
              <h4 className="text-xl font-black text-white mt-1">
                {activeStickerModal.title}
              </h4>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {activeStickerModal.description}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadStickerPng(activeStickerModal)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Sticker PNG</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStickerModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
