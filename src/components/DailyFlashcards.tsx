import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Brain,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Award,
  Flame,
} from 'lucide-react';
import { StudentProfile, Flashcard } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface DailyFlashcardsProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

interface SpacedFlashcardItem extends Flashcard {
  intervalDays: number;
  easeRating?: 'again' | 'good' | 'easy';
}

export const DailyFlashcards: React.FC<DailyFlashcardsProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onLogStudyMinutes,
}) => {
  const weakTopicsList =
    profile.weakTopics && profile.weakTopics.length > 0
      ? profile.weakTopics
      : ['Recursion & Base Cases', 'Integration by Parts', 'Binary Search Invariants'];

  const [selectedWeakTopic, setSelectedWeakTopic] = useState<string>(weakTopicsList[0]);
  const [cards, setCards] = useState<SpacedFlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [graduatedBanner, setGraduatedBanner] = useState<string | null>(null);

  useEffect(() => {
    if (weakTopicsList.length > 0 && !weakTopicsList.includes(selectedWeakTopic)) {
      setSelectedWeakTopic(weakTopicsList[0]);
    }
  }, [profile.weakTopics]);

  useEffect(() => {
    generateDailyFlashcardsForTopic(selectedWeakTopic);
  }, [selectedWeakTopic]);

  const generateDailyFlashcardsForTopic = async (topicName: string) => {
    setIsGenerating(true);
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex(0);
    setGraduatedBanner(null);

    const inferredSubject =
      topicName.toLowerCase().includes('calc') || topicName.toLowerCase().includes('integrat')
        ? 'Calculus'
        : topicName.toLowerCase().includes('dsa') ||
          topicName.toLowerCase().includes('tree') ||
          topicName.toLowerCase().includes('graph')
        ? 'DSA'
        : profile.subjects[0] || 'Python';

    try {
      const res = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          topic: topicName,
          subject: inferredSubject,
          count: 4,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rawList = data.cards || data.flashcards || [];
        const generated: SpacedFlashcardItem[] = rawList.map(
          (c: Flashcard) => ({
            ...c,
            intervalDays: 1,
          })
        );
        setCards(generated);
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRateSpacedRepetition = async (rating: 'again' | 'good' | 'easy') => {
    const intervalMap = { again: 1, good: 3, easy: 7 };
    const updatedCards = cards.map((c, idx) =>
      idx === currentIndex
        ? { ...c, easeRating: rating, intervalDays: intervalMap[rating] }
        : c
    );
    setCards(updatedCards);
    setIsFlipped(false);
    setShowHint(false);

    if (onLogStudyMinutes) {
      onLogStudyMinutes(2, `Daily Flashcard Recall (${selectedWeakTopic})`);
    }

    // Check if all cards in deck have been rated 'good' or 'easy'
    const masteredCount = updatedCards.filter(
      (c) => c.easeRating === 'good' || c.easeRating === 'easy'
    ).length;

    if (masteredCount === updatedCards.length && updatedCards.length > 0) {
      const nextWeak = (profile.weakTopics || []).filter(
        (t) => t.toLowerCase() !== selectedWeakTopic.toLowerCase()
      );
      const nextStrong = Array.from(
        new Set([...(profile.strongTopics || []), selectedWeakTopic])
      );

      const updatedProfile: StudentProfile = {
        ...profile,
        weakTopics: nextWeak,
        strongTopics: nextStrong,
        overallProgress: Math.min(100, (profile.overallProgress || 70) + 2),
      };
      onProfileUpdate(updatedProfile);

      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            userId: profile.userId,
            name: profile.name || 'Student',
            preferredLanguage: profile.preferredLanguage || 'English',
            weakTopics: nextWeak,
            strongTopics: nextStrong,
            overallProgress: updatedProfile.overallProgress,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});
      }

      setGraduatedBanner(
        `🎉 All ${updatedCards.length} Daily Flashcards mastered! "${selectedWeakTopic}" has been graduated from your Weak Topics into Strong Topics.`
      );
    } else if (currentIndex < updatedCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const activeCard = cards[currentIndex];
  const ratedCount = cards.filter((c) => Boolean(c.easeRating)).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Daily Flashcards • Gemini Spaced Repetition
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Targeting {weakTopicsList.length} Weak Topic(s)
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5">
              AI-Generated Daily Spaced-Repetition Flashcards
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Automatically fetches your flagged weak topics and uses the Gemini API to generate interactive active-recall flashcards with spaced-repetition intervals (1d / 3d / 7d).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {weakTopicsList.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setSelectedWeakTopic(topic)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                selectedWeakTopic === topic
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {topic}
            </button>
          ))}

          <button
            type="button"
            onClick={() => generateDailyFlashcardsForTopic(selectedWeakTopic)}
            disabled={isGenerating}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition cursor-pointer"
            title="Regenerate Gemini Flashcards"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {graduatedBanner && (
        <div className="relative z-10 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between">
          <span>{graduatedBanner}</span>
          <button
            type="button"
            onClick={() => setGraduatedBanner(null)}
            className="text-emerald-300 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Flashcard Stage */}
      {isGenerating ? (
        <div className="py-12 text-center space-y-2">
          <RefreshCw className="w-7 h-7 text-amber-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-300 font-semibold">
            Generating Gemini spaced-repetition flashcards for "{selectedWeakTopic}"...
          </p>
        </div>
      ) : activeCard ? (
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Card <strong className="text-white">{currentIndex + 1}</strong> of{' '}
              <strong className="text-white">{cards.length}</strong> • Topic:{' '}
              <strong className="text-amber-300">{selectedWeakTopic}</strong>
            </span>
            <span>
              Reviewed: <strong className="text-emerald-400">{ratedCount}/{cards.length}</strong>
            </span>
          </div>

          {/* Interactive Flip Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`min-h-[190px] p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              isFlipped
                ? 'bg-gradient-to-br from-emerald-950/50 via-slate-950 to-slate-900 border-emerald-500/50'
                : 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border-amber-500/40 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span
                className={`px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                  isFlipped
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isFlipped ? 'Answer & Intuition' : 'Active Recall Prompt (Click to Flip)'}
              </span>
              <span className="font-mono text-slate-400">
                Next Interval: {activeCard.intervalDays}d
              </span>
            </div>

            <div className="my-4 text-sm sm:text-base font-bold text-white leading-relaxed whitespace-pre-line">
              {isFlipped ? activeCard.back : activeCard.front}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              {activeCard.hint && !isFlipped ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                  className="text-amber-400 hover:underline flex items-center space-x-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showHint ? `Hint: ${activeCard.hint}` : 'Show Hint'}</span>
                </button>
              ) : (
                <span className="text-slate-400 text-[11px]">
                  Click card to toggle question/answer
                </span>
              )}

              <span className="text-[11px] font-semibold text-indigo-300">
                {isFlipped ? 'Rate recall below ↓' : 'Tap to reveal answer →'}
              </span>
            </div>
          </div>

          {/* Spaced Repetition Rating Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((i) => Math.max(0, i - 1));
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-white font-bold flex items-center space-x-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                disabled={currentIndex >= cards.length - 1}
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((i) => Math.min(cards.length - 1, i + 1));
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-white font-bold flex items-center space-x-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleRateSpacedRepetition('again')}
                className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer"
              >
                Again (1d Interval)
              </button>
              <button
                type="button"
                onClick={() => handleRateSpacedRepetition('good')}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
              >
                Good (3d Interval)
              </button>
              <button
                type="button"
                onClick={() => handleRateSpacedRepetition('easy')}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-black transition cursor-pointer"
              >
                Easy • Mastered (7d Interval)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
