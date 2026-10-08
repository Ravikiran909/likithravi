import React, { useState, useEffect } from 'react';
import {
  Sun,
  Sparkles,
  RefreshCw,
  Heart,
  Share2,
  Quote,
  Volume2,
  Check,
  Flame,
  Bookmark,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface DailyAffirmationsCardProps {
  profile: StudentProfile;
  onNavigateToChat?: (prefilledText?: string) => void;
}

interface AffirmationPayload {
  date: string;
  index: number;
  totalQuotes: number;
  quote: string;
  author: string;
  affirmation: string;
  category: string;
  morningTip: string;
  personalizedNote: string;
  refreshedAt: string;
}

const FALLBACK_AFFIRMATION: AffirmationPayload = {
  date: new Date().toISOString().split('T')[0],
  index: 0,
  totalQuotes: 7,
  quote: 'Success is the sum of small efforts, repeated day in and day out.',
  author: 'Robert Collier',
  affirmation: 'Every concept I master today compounds into lifelong expertise.',
  category: 'Consistency & Streak',
  morningTip: 'Start with 15 minutes on your toughest topic while your mind is sharpest.',
  personalizedNote: 'Morning Study Motivation',
  refreshedAt: '06:00 AM Daily Morning Sync',
};

export const DailyAffirmationsCard: React.FC<DailyAffirmationsCardProps> = ({
  profile,
  onNavigateToChat,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [data, setData] = useState<AffirmationPayload>(FALLBACK_AFFIRMATION);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`affirmation_saved_${profile.userId}_${todayStr}`) === 'true';
    } catch {
      return false;
    }
  });
  const [pledgeTaken, setPledgeTaken] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`affirmation_pledge_${profile.userId}_${todayStr}`) === 'true';
    } catch {
      return false;
    }
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    fetchMorningAffirmation();
  }, [profile.userId]);

  const fetchMorningAffirmation = async (nextIndex?: number) => {
    setLoading(true);
    try {
      const cachedKey = `gemini_daily_affirmation_${profile.userId}_${todayStr}`;
      if (nextIndex === undefined) {
        try {
          const cached = localStorage.getItem(cachedKey);
          if (cached) {
            setData(JSON.parse(cached));
            setLoading(false);
            return;
          }
        } catch {}

        // Fetch personalized daily motivational quote from Gemini
        const geminiRes = await fetch('/api/daily-affirmation/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.userId,
            focusTopic: profile.weakTopics?.[0] || profile.subjects?.[0] || 'DSA & Exams',
          }),
        });
        if (geminiRes.ok) {
          const json = await geminiRes.json();
          setData(json);
          try {
            localStorage.setItem(cachedKey, JSON.stringify(json));
          } catch {}
          setLoading(false);
          return;
        }
      }

      const query =
        nextIndex !== undefined
          ? `/api/daily-affirmation?userId=${encodeURIComponent(profile.userId)}&index=${nextIndex}`
          : `/api/daily-affirmation?userId=${encodeURIComponent(profile.userId)}`;
      const res = await fetch(query);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Keep fallback affirmation if offline
    } finally {
      setLoading(false);
    }
  };

  const handleFetchGeminiPersonalizedQuote = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/daily-affirmation/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          focusTopic: profile.weakTopics?.[0] || profile.subjects?.[0] || 'DSA & Competitive Exams',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        try {
          localStorage.setItem(
            `gemini_daily_affirmation_${profile.userId}_${todayStr}`,
            JSON.stringify(json)
          );
        } catch {}
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSave = () => {
    const next = !isSaved;
    setIsSaved(next);
    try {
      localStorage.setItem(`affirmation_saved_${profile.userId}_${todayStr}`, String(next));
    } catch {}
  };

  const handleCommitMorningPledge = () => {
    setPledgeTaken(true);
    try {
      localStorage.setItem(`affirmation_pledge_${profile.userId}_${todayStr}`, 'true');
    } catch {}
  };

  const handleSpeakAffirmation = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      `Good morning ${profile.name}. Today's study quote is: "${data.quote}" by ${data.author}. Your daily affirmation: ${data.affirmation}`
    );
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/50 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Subtle sunrise glow */}
      <div className="absolute -top-16 -left-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Quote & Personal Affirmation */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Daily Study Affirmation</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Personalized by Gemini</span>
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 font-medium">
              {data.category}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              • Synced {data.date}
            </span>
          </div>

          <div className="relative pl-4 border-l-2 border-amber-400/70 space-y-1.5">
            <p className="text-base sm:text-lg font-extrabold text-white leading-snug tracking-tight flex items-start gap-2">
              <Quote className="w-4 h-4 text-amber-400 shrink-0 mt-1 rotate-180" />
              <span>“{data.quote}”</span>
            </p>
            <div className="text-xs font-semibold text-amber-300">
              — {data.author}
            </div>
          </div>

          {/* Student Personal Affirmation Banner */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start space-x-2 text-xs">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 font-medium">Morning Study Mantra: </span>
                <strong className="text-emerald-300">“{data.affirmation}”</strong>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  💡 <em>Tip: {data.morningTip}</em>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions & Morning Motivation Controls */}
        <div className="flex flex-col sm:flex-row lg:flex-col justify-between gap-2.5 shrink-0 lg:min-w-[235px]">
          <button
            type="button"
            onClick={handleCommitMorningPledge}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md ${
              pledgeTaken
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950'
            }`}
          >
            {pledgeTaken ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Morning Mindset Committed! 🔥</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 fill-slate-950" />
                <span>Commit to Today's Study Goal</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFetchGeminiPersonalizedQuote}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
              title="Fetch a new personalized motivational quote from Gemini"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Asking Gemini...' : 'Gemini Quote'}</span>
            </button>

            <button
              type="button"
              onClick={handleSpeakAffirmation}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isSpeaking
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Listen to Morning Affirmation aloud"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleSave}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isSaved
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isSaved ? 'Saved to favorites' : 'Bookmark quote'}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-400 text-rose-400' : ''}`} />
            </button>

            {onNavigateToChat && (
              <button
                type="button"
                onClick={() =>
                  onNavigateToChat(
                    `🌅 Morning Affirmation: "${data.quote}" — ${data.author}. Let's start today's study session on ${
                      profile.subjects[0] || 'Python'
                    }!`
                  )
                }
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                title="Share quote & start morning session in WhatsApp Simulator"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
