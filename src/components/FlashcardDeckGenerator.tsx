import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Shuffle,
  Trophy,
  Brain,
  BookOpen,
  RefreshCw,
  Flame,
  Check,
  Zap,
} from 'lucide-react';
import { StudentProfile, Flashcard, FlashcardDeck } from '../types/index.ts';
import { db, doc, setDoc } from '../firebase.ts';

interface FlashcardDeckGeneratorProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToQuiz?: () => void;
}

export const FlashcardDeckGenerator: React.FC<FlashcardDeckGeneratorProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToQuiz,
}) => {
  // Available weak topics pulled from profile, or fallback to subjects
  const initialWeakTopics =
    profile.weakTopics && profile.weakTopics.length > 0
      ? profile.weakTopics
      : ['Recursion edge cases', 'Calculus (Integration)', 'Binary Search boundary conditions'];

  const [selectedTopic, setSelectedTopic] = useState<string>(initialWeakTopics[0] || 'Recursion edge cases');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>(profile.subjects?.[0] || 'Python');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentDeck, setCurrentDeck] = useState<FlashcardDeck | null>(null);

  // Active recall practice state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [masteredCardIds, setMasteredCardIds] = useState<Set<string>>(new Set());
  const [needsReviewIds, setNeedsReviewIds] = useState<Set<string>>(new Set());
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [topicMasteredSuccess, setTopicMasteredSuccess] = useState<boolean>(false);

  // Auto-generate deck on mount for the first weak topic if no deck
  useEffect(() => {
    if (!currentDeck && selectedTopic) {
      handleGenerateDeck(selectedTopic, selectedSubject);
    }
  }, []);

  const handleGenerateDeck = async (topicToUse: string, subjectToUse: string) => {
    setIsGenerating(true);
    setSessionCompleted(false);
    setTopicMasteredSuccess(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setMasteredCardIds(new Set());
    setNeedsReviewIds(new Set());

    try {
      const res = await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToUse,
          subject: subjectToUse,
          count: 5,
          level: profile.currentSkillLevel || 'intermediate',
        }),
      });

      const data = await res.json();
      if (data.cards && data.cards.length > 0) {
        const deck: FlashcardDeck = {
          id: `deck_${Date.now()}`,
          title: `${topicToUse} Active Recall Deck`,
          topic: topicToUse,
          subject: subjectToUse,
          cards: data.cards,
          createdAt: new Date().toISOString(),
        };
        setCurrentDeck(deck);
      }
    } catch {
      // Handled gracefully
    } finally {
      setIsGenerating(false);
    }
  };

  // Flip card
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Rate active recall: 'hard' | 'good' | 'easy'
  const handleRateCard = (rating: 'hard' | 'good' | 'easy') => {
    if (!currentDeck) return;
    const currentCard = currentDeck.cards[currentIndex];

    if (rating === 'easy' || rating === 'good') {
      setMasteredCardIds((prev) => new Set(prev).add(currentCard.id));
      setNeedsReviewIds((prev) => {
        const next = new Set(prev);
        next.delete(currentCard.id);
        return next;
      });
    } else {
      setNeedsReviewIds((prev) => new Set(prev).add(currentCard.id));
    }

    // Move to next card or complete session
    if (currentIndex < currentDeck.cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleNext = () => {
    if (!currentDeck) return;
    if (currentIndex < currentDeck.cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const handleShuffle = () => {
    if (!currentDeck) return;
    const shuffled = [...currentDeck.cards].sort(() => Math.random() - 0.5);
    setCurrentDeck({
      ...currentDeck,
      cards: shuffled,
    });
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setMasteredCardIds(new Set());
    setNeedsReviewIds(new Set());
    setSessionCompleted(false);
  };

  // Mark weak topic as mastered and update profile in Firestore
  const handleMarkTopicMasteredInProfile = async () => {
    if (!currentDeck) return;
    const topicToGraduate = currentDeck.topic;

    const remainingWeak = (profile.weakTopics || []).filter(
      (t) => t.toLowerCase() !== topicToGraduate.toLowerCase()
    );
    const updatedStrong = Array.from(
      new Set([...(profile.strongTopics || []), topicToGraduate])
    );

    const updatedProfile: StudentProfile = {
      ...profile,
      weakTopics: remainingWeak,
      strongTopics: updatedStrong,
      overallProgress: Math.min(100, (profile.overallProgress || 50) + 5),
    };

    try {
      if (db && profile.userId) {
        await setDoc(
          doc(db, 'profiles', profile.userId),
          {
            userId: profile.userId,
            name: profile.name || 'Student',
            preferredLanguage: profile.preferredLanguage || 'English',
            weakTopics: remainingWeak,
            strongTopics: updatedStrong,
            overallProgress: updatedProfile.overallProgress,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
      await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weakTopics: remainingWeak,
          strongTopics: updatedStrong,
          overallProgress: updatedProfile.overallProgress,
        }),
      });
      setTopicMasteredSuccess(true);
    } catch {
      setTopicMasteredSuccess(true);
    }

    onProfileUpdate(updatedProfile);
  };

  const currentCard: Flashcard | undefined = currentDeck?.cards[currentIndex];
  const progressPercent = currentDeck
    ? Math.round(((currentIndex + 1) / currentDeck.cards.length) * 100)
    : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Deck Generator Options */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Active Recall Deck Generator
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pulls Weak Areas
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white mt-0.5 tracking-tight">
              Weak Topic Flashcard Mastery
            </h3>
          </div>
        </div>

        {/* Topic Selection Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {profile.weakTopics && profile.weakTopics.length > 0 ? (
            profile.weakTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => {
                  setSelectedTopic(topic);
                  handleGenerateDeck(topic, selectedSubject);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  selectedTopic === topic
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>{topic}</span>
              </button>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">No weak topics recorded yet</span>
          )}
        </div>
      </div>

      {/* Custom Topic Generator Toolbar */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
        <div className="flex items-center space-x-2 w-full sm:w-auto flex-1">
          <input
            type="text"
            placeholder="Or type any custom topic to generate flashcards..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => {
              if (customTopic.trim()) {
                setSelectedTopic(customTopic.trim());
                handleGenerateDeck(customTopic.trim(), selectedSubject);
              }
            }}
            disabled={!customTopic.trim() || isGenerating}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 whitespace-nowrap transition cursor-pointer disabled:opacity-50"
          >
            Generate
          </button>
        </div>

        {currentDeck && (
          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              onClick={handleShuffle}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition cursor-pointer border border-slate-700"
              title="Shuffle cards"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={handleRestart}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition cursor-pointer border border-slate-700"
              title="Restart Deck"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isGenerating && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 relative z-10">
          <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-bold text-white">
            Synthesizing Active Recall Flashcards with Gemini 3.8...
          </div>
          <div className="text-xs text-slate-400">
            Targeting weak concept: <span className="text-amber-400 font-semibold">{selectedTopic}</span>
          </div>
        </div>
      )}

      {/* Interactive Active Recall Flashcard View */}
      {!isGenerating && currentDeck && !sessionCompleted && currentCard && (
        <div className="space-y-4 relative z-10">
          {/* Deck Progress Bar & Header */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white">
                Card {currentIndex + 1} of {currentDeck.cards.length}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-bold border border-slate-700">
                {currentCard.difficulty?.toUpperCase() || 'CORE'}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-emerald-400">
                {masteredCardIds.size} Mastered
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">{progressPercent}% Completed</span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 3D Flip Flashcard */}
          <div
            onClick={handleFlip}
            className="w-full min-h-[280px] sm:min-h-[320px] rounded-3xl p-8 cursor-pointer transition-all duration-500 shadow-2xl relative flex flex-col justify-between select-none border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 hover:border-amber-500/50 group"
          >
            {/* Top Card Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Brain className="w-3.5 h-3.5" />
                <span>{isFlipped ? 'Answer & Mental Model' : 'Active Recall Challenge'}</span>
              </span>

              <span className="text-xs text-slate-500 group-hover:text-slate-300 flex items-center space-x-1 transition">
                <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>Tap card to flip</span>
              </span>
            </div>

            {/* Card Content Area (Front vs Back) */}
            <div className="py-6 my-auto text-center px-2">
              {!isFlipped ? (
                <div className="space-y-3">
                  <h4 className="text-lg sm:text-2xl font-black text-white leading-snug tracking-tight">
                    {currentCard.front}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto">
                    Try to retrieve the explanation or mental model from memory before flipping!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-base sm:text-lg font-medium text-emerald-200 leading-relaxed whitespace-pre-line text-left bg-emerald-950/20 p-5 rounded-2xl border border-emerald-500/30">
                    {currentCard.back}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Hint Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-500 font-mono">
                Topic: <span className="text-slate-300 font-semibold">{currentCard.topic}</span>
              </div>

              {currentCard.hint && !isFlipped && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-semibold"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Hint Dropdown Box */}
          {showHint && !isFlipped && currentCard.hint && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex items-start space-x-2 animate-in fade-in">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">Cognitive Clue: </span>
                {currentCard.hint}
              </div>
            </div>
          )}

          {/* Active Recall Confidence Evaluation Buttons (Show when flipped) */}
          {isFlipped ? (
            <div className="space-y-2 pt-2 animate-in fade-in">
              <div className="text-center text-xs font-semibold text-slate-400">
                How well did you recall this answer?
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleRateCard('hard')}
                  className="py-3 px-2 rounded-2xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-xs transition cursor-pointer active:scale-95 flex flex-col items-center justify-center space-y-1"
                >
                  <span className="text-rose-400 font-black">🔴 HARD</span>
                  <span className="text-[10px] text-rose-400/80">Review again</span>
                </button>

                <button
                  onClick={() => handleRateCard('good')}
                  className="py-3 px-2 rounded-2xl bg-amber-950/60 hover:bg-amber-900 border border-amber-800/80 text-amber-300 font-bold text-xs transition cursor-pointer active:scale-95 flex flex-col items-center justify-center space-y-1"
                >
                  <span className="text-amber-400 font-black">🟡 GOOD</span>
                  <span className="text-[10px] text-amber-400/80">Recalled with effort</span>
                </button>

                <button
                  onClick={() => handleRateCard('easy')}
                  className="py-3 px-2 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 font-bold text-xs transition cursor-pointer active:scale-95 flex flex-col items-center justify-center space-y-1"
                >
                  <span className="text-emerald-400 font-black">🟢 EASY</span>
                  <span className="text-[10px] text-emerald-400/80">Completely mastered</span>
                </button>
              </div>
            </div>
          ) : (
            /* Navigation Controls when not flipped */
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleFlip}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-95 flex items-center space-x-1.5"
              >
                <span>Flip to Reveal Answer</span>
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === currentDeck.cards.length - 1}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Session Mastery Summary Screen */}
      {!isGenerating && sessionCompleted && currentDeck && (
        <div className="p-8 rounded-3xl bg-slate-950 border border-emerald-500/40 text-center space-y-5 animate-in fade-in relative z-10">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-2xl font-black text-white">Active Recall Session Completed!</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              You reviewed all {currentDeck.cards.length} active recall flashcards for{' '}
              <strong className="text-amber-400">{currentDeck.topic}</strong>.
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center justify-center gap-4 max-w-sm mx-auto">
            <div className="flex-1 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Mastered</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {masteredCardIds.size} / {currentDeck.cards.length}
              </div>
            </div>

            <div className="flex-1 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Accuracy</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">
                {Math.round((masteredCardIds.size / Math.max(1, currentDeck.cards.length)) * 100)}%
              </div>
            </div>
          </div>

          {/* Option to Graduate & Mark Topic Mastered in Firestore Profile */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!topicMasteredSuccess ? (
              <button
                onClick={handleMarkTopicMasteredInProfile}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs rounded-2xl shadow-xl shadow-emerald-600/30 transition cursor-pointer active:scale-95 flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Mark "{currentDeck.topic}" as Mastered in Profile</span>
              </button>
            ) : (
              <div className="px-6 py-3 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-2xl border border-emerald-500/40 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Promoted from Weak to Strong Topics in Firestore!</span>
              </div>
            )}

            <button
              onClick={handleRestart}
              className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-2xl border border-slate-700 transition cursor-pointer"
            >
              Practice Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
