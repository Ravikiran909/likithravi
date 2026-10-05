import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  BookOpen,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Brain,
  Clock,
  FileText,
  Filter,
  Flame,
  Trophy,
  RefreshCw,
  Pin,
  Box,
} from 'lucide-react';
import { StudentProfile, DocumentRecord } from '../types/index.ts';

interface SpacedRepetitionEngineProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat?: (prefilledText?: string) => void;
  onLogStudyMinutes?: (mins: number, label?: string) => void;
}

export interface LeitnerCard {
  id: string;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  subject: string;
  topic: string;
  front: string;
  back: string;
  hint: string;
  keywords: string[];
  leitnerBox: 1 | 2 | 3 | 4 | 5;
  intervalDays: number;
  lastReviewedAt?: string;
  nextReviewDate?: string;
  dueToday: boolean;
}

interface StoredLeitnerState {
  box: 1 | 2 | 3 | 4 | 5;
  intervalDays: number;
  lastReviewedAt: string;
  nextReviewDate: string;
  reviewedToday: boolean;
}

const LEITNER_BOX_CONFIG: {
  box: 1 | 2 | 3 | 4 | 5;
  name: string;
  intervalLabel: string;
  intervalDays: number;
  description: string;
  colorClass: string;
  badgeClass: string;
}[] = [
  {
    box: 1,
    name: 'Box 1 • New / Reset',
    intervalLabel: 'Every Day (1d)',
    intervalDays: 1,
    description: 'Immediate daily active recall required',
    colorClass: 'border-rose-500/50 bg-rose-950/30 text-rose-200',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  {
    box: 2,
    name: 'Box 2 • Developing',
    intervalLabel: 'Every 2 Days (2d)',
    intervalDays: 2,
    description: 'Short-interval reinforcement',
    colorClass: 'border-amber-500/50 bg-amber-950/30 text-amber-200',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    box: 3,
    name: 'Box 3 • Consolidating',
    intervalLabel: 'Every 4 Days (4d)',
    intervalDays: 4,
    description: 'Medium-term memory encoding',
    colorClass: 'border-sky-500/50 bg-sky-950/30 text-sky-200',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  {
    box: 4,
    name: 'Box 4 • Strong Recall',
    intervalLabel: 'Every 7 Days (7d)',
    intervalDays: 7,
    description: 'Weekly spaced verification',
    colorClass: 'border-indigo-500/50 bg-indigo-950/30 text-indigo-200',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  {
    box: 5,
    name: 'Box 5 • Mastered Vault',
    intervalLabel: 'Every 14 Days (14d)',
    intervalDays: 14,
    description: 'Graduated to long-term memory',
    colorClass: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-200',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
];

export const SpacedRepetitionEngine: React.FC<SpacedRepetitionEngineProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onLogStudyMinutes,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const storageKey = `leitner_srs_state_${profile.userId}`;

  const [rawCards, setRawCards] = useState<LeitnerCard[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [selectedBoxFilter, setSelectedBoxFilter] = useState<'due' | 'all' | 1 | 2 | 3 | 4 | 5>('due');

  const [leitnerMap, setLeitnerMap] = useState<Record<string, StoredLeitnerState>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [reviewedTodayCount, setReviewedTodayCount] = useState<number>(0);
  const [lastTransitionBanner, setLastTransitionBanner] = useState<string | null>(null);

  useEffect(() => {
    fetchRagLeitnerDeck();
  }, [profile.userId]);

  const fetchRagLeitnerDeck = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flashcards/leitner-deck');
      if (res.ok) {
        const data = await res.json();
        setRawCards(data.cards || []);
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.warn('Error loading RAG Leitner flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  // Merge raw RAG cards with persisted Leitner Box states
  const enrichedCards: LeitnerCard[] = useMemo(() => {
    return rawCards.map((card) => {
      const saved = leitnerMap[card.id];
      if (!saved) {
        return card;
      }
      const isDue = saved.nextReviewDate <= todayStr || !saved.reviewedToday;
      return {
        ...card,
        leitnerBox: saved.box,
        intervalDays: saved.intervalDays,
        lastReviewedAt: saved.lastReviewedAt,
        nextReviewDate: saved.nextReviewDate,
        dueToday: isDue && saved.box < 5,
      };
    });
  }, [rawCards, leitnerMap, todayStr]);

  // Count cards in each of the 5 Leitner boxes
  const boxCounts = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    enrichedCards.forEach((c) => {
      counts[c.leitnerBox] = (counts[c.leitnerBox] || 0) + 1;
    });
    return counts;
  }, [enrichedCards]);

  const dueTodayTotal = useMemo(
    () => enrichedCards.filter((c) => c.dueToday).length,
    [enrichedCards]
  );

  // Filter cards for the active review queue
  const activeQueue = useMemo(() => {
    return enrichedCards.filter((c) => {
      if (selectedSubject !== 'all' && c.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
        return false;
      }
      if (selectedDocId !== 'all' && c.documentId !== selectedDocId) {
        return false;
      }
      if (selectedBoxFilter === 'due') {
        return c.dueToday;
      }
      if (selectedBoxFilter !== 'all' && c.leitnerBox !== selectedBoxFilter) {
        return false;
      }
      return true;
    });
  }, [enrichedCards, selectedSubject, selectedDocId, selectedBoxFilter]);

  const currentCard = activeQueue[currentIndex] || activeQueue[0];

  const subjectsList = useMemo(
    () => Array.from(new Set(enrichedCards.map((c) => c.subject))),
    [enrichedCards]
  );

  // Leitner System Transition Logic
  const handleGradeCard = (grade: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;

    const currentBox = currentCard.leitnerBox;
    let nextBox: 1 | 2 | 3 | 4 | 5 = currentBox;

    if (grade === 'again') {
      // Forgotten card demotes all the way back to Box 1 (1-day interval)
      nextBox = 1;
    } else if (grade === 'hard') {
      // Difficult recall stays in current box (or demotes 1 if above Box 1)
      nextBox = currentBox > 1 ? ((currentBox - 1) as 1 | 2 | 3 | 4 | 5) : 1;
    } else if (grade === 'good') {
      // Successful recall promotes +1 Box up to Box 5
      nextBox = Math.min(5, currentBox + 1) as 1 | 2 | 3 | 4 | 5;
    } else if (grade === 'easy') {
      // Effortless recall promotes +2 Boxes up to Box 5
      nextBox = Math.min(5, currentBox + 2) as 1 | 2 | 3 | 4 | 5;
    }

    const boxMeta = LEITNER_BOX_CONFIG.find((b) => b.box === nextBox)!;
    const nextDateObj = new Date();
    nextDateObj.setDate(nextDateObj.getDate() + boxMeta.intervalDays);
    const nextDateStr = nextDateObj.toISOString().split('T')[0];

    const updatedState: StoredLeitnerState = {
      box: nextBox,
      intervalDays: boxMeta.intervalDays,
      lastReviewedAt: todayStr,
      nextReviewDate: nextDateStr,
      reviewedToday: grade === 'good' || grade === 'easy',
    };

    const nextMap = {
      ...leitnerMap,
      [currentCard.id]: updatedState,
    };

    setLeitnerMap(nextMap);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextMap));
    } catch {}

    setReviewedTodayCount((c) => c + 1);
    setLastTransitionBanner(
      grade === 'again'
        ? `↺ Card reset to Box 1 (Review again tomorrow)`
        : `✓ Card moved from Box ${currentBox} → Box ${nextBox} (Next review in ${boxMeta.intervalDays}d)`
    );

    if (onLogStudyMinutes && (reviewedTodayCount + 1) % 3 === 0) {
      onLogStudyMinutes(5, 'Leitner RAG Spaced Repetition');
    }

    setIsFlipped(false);
    setShowHint(false);
    if (currentIndex < activeQueue.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleResetLeitnerProgress = () => {
    setLeitnerMap({});
    setReviewedTodayCount(0);
    setLastTransitionBanner('Leitner boxes reset to initial RAG distribution.');
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start space-x-3.5">
          <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                RAG-Grounded Spaced Repetition Engine
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                5-Box Leitner System
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {dueTodayTotal} Due Today
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-white mt-0.5">
              Leitner Daily Review Queue (Pulled from Verified RAG Knowledge Base)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              Cards are dynamically generated from your indexed RAG curriculum chunks ({documents.length} source documents). Correct answers promote cards to higher Leitner boxes with longer review intervals (1d → 2d → 4d → 7d → 14d).
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center space-x-2">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-slate-300">
              Reviewed Today: <strong className="text-white">{reviewedTodayCount}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetLeitnerProgress}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs transition cursor-pointer"
            title="Reset Leitner Box assignments"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5-Box Leitner System Interactive Visualizer */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setSelectedBoxFilter('due');
            setCurrentIndex(0);
            setIsFlipped(false);
          }}
          className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
            selectedBoxFilter === 'due'
              ? 'bg-amber-500/20 border-amber-400 text-white ring-2 ring-amber-400/50'
              : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Due Today Queue
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{dueTodayTotal}</div>
          <span className="text-[10px] text-slate-400 mt-0.5">Priority Box 1 & 2</span>
        </button>

        {LEITNER_BOX_CONFIG.map((cfg) => {
          const count = boxCounts[cfg.box] || 0;
          const isSelected = selectedBoxFilter === cfg.box;
          return (
            <button
              key={cfg.box}
              type="button"
              onClick={() => {
                setSelectedBoxFilter(isSelected ? 'all' : cfg.box);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                cfg.colorClass
              } ${isSelected ? 'ring-2 ring-white scale-[1.01]' : 'opacity-90 hover:opacity-100'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider">
                  {cfg.name}
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-1">{count}</div>
              <span className="text-[10px] opacity-80 mt-0.5">{cfg.intervalLabel}</span>
            </button>
          );
        })}
      </div>

      {/* RAG Source Document & Subject Filters */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800/80 p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>RAG Subject:</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedSubject('all');
              setCurrentIndex(0);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedSubject === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            All ({enrichedCards.length})
          </button>
          {subjectsList.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => {
                setSelectedSubject(sub);
                setCurrentIndex(0);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedSubject === sub
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* RAG Document Selector */}
        <div className="flex items-center space-x-2">
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={selectedDocId}
            onChange={(e) => {
              setSelectedDocId(e.target.value);
              setCurrentIndex(0);
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All RAG Knowledge Base Documents ({documents.length})</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                📄 {doc.title} ({doc.subject})
              </option>
            ))}
          </select>
        </div>
      </div>

      {lastTransitionBanner && (
        <div className="relative z-10 p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between">
          <span className="font-semibold">{lastTransitionBanner}</span>
          <button
            type="button"
            onClick={() => setLastTransitionBanner(null)}
            className="text-indigo-300 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Active Flashcard Review Stage */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center space-y-2">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
          <span>Indexing flashcards from RAG knowledge base chunks...</span>
        </div>
      ) : !currentCard ? (
        <div className="py-10 text-center bg-slate-950/60 border border-slate-800 rounded-2xl p-6 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h4 className="text-base font-bold text-white">
            All Cards in This Leitner Filter Reviewed!
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You have cleared the due cards in this view. Switch to "All Boxes" or select a specific Leitner Box above to continue practicing.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedBoxFilter('all');
              setCurrentIndex(0);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Browse All {enrichedCards.length} RAG Cards
          </button>
        </div>
      ) : (
        <div className="relative z-10 space-y-4">
          {/* Card Progress Bar & Source Document Citation */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono font-bold">
                Card {currentIndex + 1} of {activeQueue.length}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  LEITNER_BOX_CONFIG.find((b) => b.box === currentCard.leitnerBox)?.badgeClass
                }`}
              >
                Leitner Box {currentCard.leitnerBox} ({currentCard.intervalDays}d Interval)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center space-x-1">
                <BookOpen className="w-3 h-3" />
                <span>RAG Source: {currentCard.documentTitle}</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showHint ? 'Hide RAG Keywords' : 'Show RAG Keywords'}</span>
              </button>
            </div>
          </div>

          {showHint && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{currentCard.hint}</span>
            </div>
          )}

          {/* Interactive 3D-Style Flip Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`min-h-[230px] p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-xl ${
              isFlipped
                ? 'bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 border-emerald-500/50'
                : 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border-indigo-500/40 hover:border-indigo-400/70'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="uppercase tracking-wider font-bold text-indigo-300">
                {isFlipped ? '✓ Verified RAG Knowledge Base Excerpt (Back)' : '🧠 Active Recall Prompt (Front)'}
              </span>
              <span className="flex items-center space-x-1 text-slate-400">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Click card to flip</span>
              </span>
            </div>

            <div className="my-4">
              {!isFlipped ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-400">
                    Subject: {currentCard.subject} • Topic: {currentCard.topic}
                  </div>
                  <h4 className="text-base sm:text-lg font-extrabold text-white leading-relaxed">
                    {currentCard.front}
                  </h4>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 text-xs sm:text-sm text-slate-100 whitespace-pre-line leading-relaxed font-sans">
                    {currentCard.back}
                  </div>
                  {currentCard.keywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">
                        Indexed RAG Keywords:
                      </span>
                      {currentCard.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
              <span>Chunk ID: {currentCard.chunkId}</span>
              <span className="text-emerald-400 font-semibold">
                {isFlipped ? 'Rate your recall below to update Leitner Box ↓' : 'Think of the answer, then click to reveal →'}
              </span>
            </div>
          </div>

          {/* Leitner Interval Grading Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => handleGradeCard('again')}
              className="p-3 rounded-2xl bg-rose-950/50 hover:bg-rose-900/70 border border-rose-500/40 text-left transition cursor-pointer active:scale-95"
            >
              <div className="text-xs font-black text-rose-300">1. Again (Forgot)</div>
              <div className="text-[10px] text-rose-200/80 mt-0.5">
                Demote → Box 1 (1d interval)
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleGradeCard('hard')}
              className="p-3 rounded-2xl bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/40 text-left transition cursor-pointer active:scale-95"
            >
              <div className="text-xs font-black text-amber-300">2. Hard Recall</div>
              <div className="text-[10px] text-amber-200/80 mt-0.5">
                Hold / Step Back → Box {Math.max(1, currentCard.leitnerBox - 1)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleGradeCard('good')}
              className="p-3 rounded-2xl bg-sky-950/50 hover:bg-sky-900/70 border border-sky-500/40 text-left transition cursor-pointer active:scale-95"
            >
              <div className="text-xs font-black text-sky-300">3. Good Recall</div>
              <div className="text-[10px] text-sky-200/80 mt-0.5">
                Promote +1 → Box {Math.min(5, currentCard.leitnerBox + 1)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleGradeCard('easy')}
              className="p-3 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-500/40 text-left transition cursor-pointer active:scale-95"
            >
              <div className="text-xs font-black text-emerald-300">4. Easy (Instant)</div>
              <div className="text-[10px] text-emerald-200/80 mt-0.5">
                Jump +2 → Box {Math.min(5, currentCard.leitnerBox + 2)}
              </div>
            </button>
          </div>

          {/* Navigation & WhatsApp Tutor Deep-Dive */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((i) => (i > 0 ? i - 1 : activeQueue.length - 1));
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex((i) => (i < activeQueue.length - 1 ? i + 1 : 0));
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
              >
                <span>Next Card</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {onNavigateToChat && (
              <button
                type="button"
                onClick={() =>
                  onNavigateToChat(
                    `Tutor, help me review this Leitner Box ${currentCard.leitnerBox} flashcard from "${currentCard.documentTitle}": ${currentCard.topic}`
                  )
                }
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer"
              >
                Ask WhatsApp AI Tutor About This RAG Chunk →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
