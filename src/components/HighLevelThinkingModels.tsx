import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Layers,
  GitBranch,
  Compass,
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Send,
  BookOpen,
  Cpu,
  Target,
  RefreshCw,
  HelpCircle,
  Eye,
  EyeOff,
  Award,
  Zap,
} from 'lucide-react';
import { StudentProfile } from '../types/index.ts';

interface HighLevelThinkingModelsProps {
  profile: StudentProfile;
  onProfileUpdate: (updated: StudentProfile) => void;
  onNavigateToChat: (prefilledText?: string) => void;
  onLogStudyMinutes?: (minutes: number, label?: string) => void;
}

interface ThinkingStage {
  stageTitle: string;
  coreInsight: string;
  concreteExampleOrFormula: string;
  metacognitivePrompt: string;
}

interface CognitiveTrap {
  trap: string;
  whyItHappens: string;
  mentalModelCorrection: string;
}

interface SynthesisChallenge {
  question: string;
  hint: string;
  modelSolutionOutline: string;
}

interface ThinkingModelAnalysis {
  executiveThesis: string;
  cognitiveComplexityScore: number;
  reasoningTrace: string[];
  stages: ThinkingStage[];
  commonCognitiveTraps: CognitiveTrap[];
  synthesisChallenge: SynthesisChallenge;
}

interface FrameworkOption {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  cognitiveGoal: string;
  accentColor: string;
  icon: React.ReactNode;
}

const THINKING_FRAMEWORKS: FrameworkOption[] = [
  {
    id: 'first_principles',
    name: 'First-Principles Deconstruction',
    badge: 'Axiomatic Reasoning',
    tagline: 'Break complex topics down to irreducible truths and rebuild from scratch.',
    cognitiveGoal: 'Eliminates rote memorization by deriving formulas & algorithms from base axioms.',
    accentColor: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/40 text-indigo-300',
    icon: <Cpu className="w-4 h-4 text-indigo-400" />,
  },
  {
    id: 'feynman_mental_model',
    name: 'Feynman Mental Model & Analogical Transfer',
    badge: 'Deep Intuition',
    tagline: 'Map abstract theory onto concrete physical/system analogies & expose jargon blind spots.',
    cognitiveGoal: 'Builds crystal-clear mental imagery and pinpoints hidden conceptual gaps.',
    accentColor: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40 text-emerald-300',
    icon: <Lightbulb className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'socratic_dialectic',
    name: 'Socratic Counter-Example & Inquiry',
    badge: 'Critical Interrogation',
    tagline: 'Stress-test your hypothesis with adversarial edge cases and boundary conditions.',
    cognitiveGoal: 'Trains rigorous proof thinking and boundary-case debugging.',
    accentColor: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-300',
    icon: <Compass className="w-4 h-4 text-amber-400" />,
  },
  {
    id: 'systems_second_order',
    name: 'Second-Order & Systems Thinking',
    badge: 'Causal Loops',
    tagline: 'Analyze downstream cascading effects, bottleneck trade-offs, and feedback loops.',
    cognitiveGoal: 'Develops architectural judgment for time/space complexity and system design.',
    accentColor: 'from-sky-500/20 to-cyan-500/10 border-sky-500/40 text-sky-300',
    icon: <GitBranch className="w-4 h-4 text-sky-400" />,
  },
  {
    id: 'bloom_metacognitive',
    name: "Bloom's Higher-Order Synthesis",
    badge: 'Evaluate & Create',
    tagline: 'Ascend from recall to paradigm comparison, critique, and novel solution design.',
    cognitiveGoal: 'Prepares students for advanced research, competitive exams, and open-ended design.',
    accentColor: 'from-fuchsia-500/20 to-pink-500/10 border-fuchsia-500/40 text-fuchsia-300',
    icon: <Layers className="w-4 h-4 text-fuchsia-400" />,
  },
  {
    id: 'inversion_premortem',
    name: 'Inversion & Failure Pre-Mortem',
    badge: 'Backward Reasoning',
    tagline: 'Solve problems backward by identifying every way a proof or algorithm can fail first.',
    cognitiveGoal: 'Prevents off-by-one errors, infinite recursion, and invalid mathematical assumptions.',
    accentColor: 'from-rose-500/20 to-orange-500/10 border-rose-500/40 text-rose-300',
    icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
  },
];

export const HighLevelThinkingModels: React.FC<HighLevelThinkingModelsProps> = ({
  profile,
  onProfileUpdate,
  onNavigateToChat,
  onLogStudyMinutes,
}) => {
  const defaultTopic =
    profile.weakTopics && profile.weakTopics.length > 0
      ? profile.weakTopics[0]
      : 'Recursion & Dynamic Programming State Transitions';
  const defaultSubject =
    profile.subjects && profile.subjects.length > 0 ? profile.subjects[0] : 'DSA';

  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>('first_principles');
  const [subject, setSubject] = useState<string>(defaultSubject);
  const [topic, setTopic] = useState<string>(defaultTopic);
  const [studentHypothesis, setStudentHypothesis] = useState<string>('');
  const [thinkingDepth, setThinkingDepth] = useState<'HIGH' | 'LOW'>('HIGH');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<ThinkingModelAnalysis | null>(null);
  const [modelUsedBadge, setModelUsedBadge] = useState<string>(
    'gemini-3.8-flash (ThinkingLevel.HIGH)'
  );
  const [selfReflections, setSelfReflections] = useState<Record<number, string>>({});
  const [completedStages, setCompletedStages] = useState<Record<number, boolean>>({});
  const [showChallengeHint, setShowChallengeHint] = useState<boolean>(false);
  const [showChallengeSolution, setShowChallengeSolution] = useState<boolean>(false);
  const [challengeAttempt, setChallengeAttempt] = useState<string>('');
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [isSavingRag, setIsSavingRag] = useState<boolean>(false);
  const [isPushingWa, setIsPushingWa] = useState<boolean>(false);

  const selectedFramework =
    THINKING_FRAMEWORKS.find((f) => f.id === selectedFrameworkId) || THINKING_FRAMEWORKS[0];

  const runThinkingModel = async (
    overrideFrameworkId?: string,
    overrideTopic?: string,
    overrideSubject?: string,
    options?: { saveToRag?: boolean; pushToWhatsApp?: boolean }
  ) => {
    const fwId = overrideFrameworkId || selectedFrameworkId;
    const targetTopic = overrideTopic !== undefined ? overrideTopic : topic;
    const targetSubject = overrideSubject !== undefined ? overrideSubject : subject;

    if (!options?.saveToRag && !options?.pushToWhatsApp) {
      setIsLoading(true);
      setShowChallengeHint(false);
      setShowChallengeSolution(false);
    }

    try {
      const res = await fetch('/api/thinking-models/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          topic: targetTopic,
          subject: targetSubject,
          frameworkId: fwId,
          thinkingDepth,
          studentHypothesis,
          saveToRag: Boolean(options?.saveToRag),
          pushToWhatsApp: Boolean(options?.pushToWhatsApp),
        }),
      });

      const data = await res.json();
      if (res.ok && data.analysis) {
        setAnalysis(data.analysis);
        if (data.modelUsed) {
          setModelUsedBadge(data.modelUsed);
        }
        if (options?.saveToRag) {
          setStatusToast('Saved Thinking Model blueprint to RAG Knowledge Base!');
          setTimeout(() => setStatusToast(null), 4000);
        } else if (options?.pushToWhatsApp) {
          setStatusToast(`Dispatched Thinking Model summary to WhatsApp (+${profile.whatsappNumber})!`);
          setTimeout(() => setStatusToast(null), 4000);
        }
      }
    } catch {
      // Keep existing state if transient error
    } finally {
      setIsLoading(false);
      setIsSavingRag(false);
      setIsPushingWa(false);
    }
  };

  useEffect(() => {
    runThinkingModel('first_principles', defaultTopic, defaultSubject);
  }, []);

  const handleSelectFramework = (fwId: string) => {
    setSelectedFrameworkId(fwId);
    setCompletedStages({});
    runThinkingModel(fwId, topic, subject);
  };

  const handleToggleStageComplete = (idx: number) => {
    const next = { ...completedStages, [idx]: !completedStages[idx] };
    setCompletedStages(next);

    const completedCount = Object.values(next).filter(Boolean).length;
    if (completedCount === 4 && onLogStudyMinutes) {
      onLogStudyMinutes(20, `20m High-Level Thinking (${selectedFramework.name})`);
      setStatusToast('+20 mins Deep Cognitive Study logged & XP awarded!');
      setTimeout(() => setStatusToast(null), 4000);
    }
  };

  const handleSaveToRag = async () => {
    setIsSavingRag(true);
    await runThinkingModel(selectedFrameworkId, topic, subject, { saveToRag: true });
  };

  const handlePushToWhatsApp = async () => {
    setIsPushingWa(true);
    await runThinkingModel(selectedFrameworkId, topic, subject, { pushToWhatsApp: true });
  };

  const handleMasterConcept = async () => {
    if (onLogStudyMinutes) {
      onLogStudyMinutes(15, `15m Thinking Model Synthesis: ${topic}`);
    }
    const updatedWeak = (profile.weakTopics || []).filter(
      (t) => t.toLowerCase() !== topic.toLowerCase()
    );
    const nextProgress = Math.min(100, (profile.overallProgress || 70) + 2);
    const updatedProfile: StudentProfile = {
      ...profile,
      weakTopics: updatedWeak,
      overallProgress: nextProgress,
      totalQuestionsAnswered: (profile.totalQuestionsAnswered || 0) + 1,
      correctAnswers: (profile.correctAnswers || 0) + 1,
    };

    try {
      const res = await fetch(`/api/students/${profile.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weakTopics: updatedWeak,
          overallProgress: nextProgress,
          totalQuestionsAnswered: updatedProfile.totalQuestionsAnswered,
          correctAnswers: updatedProfile.correctAnswers,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        onProfileUpdate(saved);
      } else {
        onProfileUpdate(updatedProfile);
      }
    } catch {
      onProfileUpdate(updatedProfile);
    }

    setStatusToast(`Marked "${topic}" as cognitively mastered (+2% Curriculum Mastery)!`);
    setTimeout(() => setStatusToast(null), 4000);
  };

  const quickTopics = Array.from(
    new Set([
      ...(profile.weakTopics || []),
      'Recursion & Call Stack Invariants',
      'Dynamic Programming Optimal Substructure',
      'Calculus Limits & Epsilon-Delta Proofs',
      'Deadlocks & Concurrency Race Conditions',
      'Backpropagation & Gradient Vanishing',
    ])
  ).slice(0, 6);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cognitive Reasoning Lab</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>{modelUsedBadge}</span>
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
              6 Mental Models
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>High-Level Thinking Models for Students</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            Move beyond surface memorization. Select a cognitive framework—such as{' '}
            <strong className="text-slate-200">First-Principles Deconstruction</strong>,{' '}
            <strong className="text-slate-200">Feynman Analogical Transfer</strong>,{' '}
            <strong className="text-slate-200">Socratic Counter-Examples</strong>, or{' '}
            <strong className="text-slate-200">Inversion Pre-Mortem</strong>—to deeply deconstruct any curriculum topic or weak area.
          </p>
        </div>

        {/* Thinking Depth Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setThinkingDepth('HIGH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                thinkingDepth === 'HIGH'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Deep multi-step reasoning mode (ThinkingLevel.HIGH)"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Deep Thinking (HIGH)</span>
            </button>
            <button
              type="button"
              onClick={() => setThinkingDepth('LOW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                thinkingDepth === 'LOW'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Fast intuitive synthesis mode (ThinkingLevel.LOW)"
            >
              <span>Fast Intuition (LOW)</span>
            </button>
          </div>
        </div>
      </div>

      {statusToast && (
        <div className="relative z-10 bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-emerald-400 hover:text-white text-[11px] font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 6 High-Level Thinking Models Grid */}
      <div className="relative z-10 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Choose a High-Level Thinking Model Framework
          </label>
          <span className="text-[11px] text-slate-400">
            Active: <strong className="text-indigo-300">{selectedFramework.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {THINKING_FRAMEWORKS.map((fw) => {
            const isSelected = fw.id === selectedFrameworkId;
            return (
              <button
                key={fw.id}
                type="button"
                onClick={() => handleSelectFramework(fw.id)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `bg-gradient-to-br ${fw.accentColor} shadow-lg scale-[1.01]`
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800">
                        {fw.icon}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-300">
                        {fw.badge}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-white text-sm">{fw.name}</div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{fw.tagline}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <strong className="text-slate-300">Goal:</strong> {fw.cognitiveGoal}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Topic, Subject & Student Hypothesis Controls */}
      <div className="relative z-10 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Subject Domain
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {Array.from(
                new Set([
                  ...(profile.subjects || []),
                  'DSA',
                  'Python',
                  'Calculus',
                  'Java',
                  'Machine Learning',
                  'Physics',
                  'System Design',
                ])
              ).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Target Concept, Theorem, or Problem to Deconstruct
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Dynamic Programming Memoization vs Tabulation"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="md:col-span-4 flex items-end">
            <button
              type="button"
              onClick={() => runThinkingModel(selectedFrameworkId, topic, subject)}
              disabled={isLoading || !topic.trim()}
              className="w-full py-2 px-4 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Thinking Model...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>Generate High-Level Breakdown</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Optional Student Intuition / Hypothesis Input for Socratic Audit */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Optional: Your Current Intuition or Hypothesis (AI will audit & stress-test your mental model)
          </label>
          <input
            type="text"
            value={studentHypothesis}
            onChange={(e) => setStudentHypothesis(e.target.value)}
            placeholder="e.g., 'I think recursion is always slower than iteration because of function calls...'"
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Quick Weak-Topic Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">
            Quick Concept Targets:
          </span>
          {quickTopics.map((qt) => (
            <button
              key={qt}
              type="button"
              onClick={() => {
                setTopic(qt);
                runThinkingModel(selectedFrameworkId, qt, subject);
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                topic === qt
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {profile.weakTopics?.includes(qt) ? `⚠️ ${qt}` : qt}
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Output */}
      {analysis && (
        <div className="relative z-10 space-y-6">
          {/* Executive Thesis & Reasoning Trace Banner */}
          <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-emerald-950/40 border border-indigo-500/30 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    Executive Mental Model Thesis • {selectedFramework.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Cognitive Rigor: {analysis.cognitiveComplexityScore || 92}/100
                  </span>
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {analysis.executiveThesis}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveToRag}
                  disabled={isSavingRag}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSavingRag ? 'Indexing...' : 'Save to RAG Notes'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePushToWhatsApp}
                  disabled={isPushingWa}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isPushingWa ? 'Sending...' : 'Send to WhatsApp'}</span>
                </button>
              </div>
            </div>

            {/* Chain-of-Thought Reasoning Trace */}
            {analysis.reasoningTrace && analysis.reasoningTrace.length > 0 && (
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>AI Cognitive Reasoning Trace ({thinkingDepth} Depth)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {analysis.reasoningTrace.map((traceStep, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 flex items-start space-x-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{traceStep}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4-Stage Interactive Thinking Model Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(analysis.stages || []).map((stage, idx) => {
              const isDone = Boolean(completedStages[idx]);
              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
                          Stage {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white">{stage.stageTitle}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleStageComplete(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center space-x-1 shrink-0 ${
                          isDone
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isDone ? 'Understood' : 'Mark Understood'}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{stage.coreInsight}</p>

                    {stage.concreteExampleOrFormula && (
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                        {stage.concreteExampleOrFormula}
                      </div>
                    )}
                  </div>

                  {/* Metacognitive Self-Reflection Check */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-semibold text-amber-300 flex items-start space-x-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Metacognitive Check: {stage.metacognitivePrompt}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={selfReflections[idx] || ''}
                        onChange={(e) =>
                          setSelfReflections({ ...selfReflections, [idx]: e.target.value })
                        }
                        placeholder="Write your 1-line reflection or test answer..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToChat(
                            `Using ${selectedFramework.name} on ${topic}: My reflection on "${stage.metacognitivePrompt}" is "${
                              selfReflections[idx] || 'Can you verify my understanding?'
                            }". Critique my thinking!`
                          )
                        }
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] font-semibold border border-slate-700 transition shrink-0 cursor-pointer"
                        title="Verify with AI Tutor in WhatsApp Chat"
                      >
                        Verify in Chat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Common Cognitive Traps & Misconception Immunizer */}
          {analysis.commonCognitiveTraps && analysis.commonCognitiveTraps.length > 0 && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Cognitive Traps & Misconception Immunizer</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Why rote learners lose marks vs. how high-level thinkers solve it
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.commonCognitiveTraps.map((trapItem, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-4 space-y-2"
                  >
                    <div className="text-xs font-bold text-rose-300 flex items-center space-x-1.5">
                      <span>⚠️ Trap #{idx + 1}: {trapItem.trap}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      <strong className="text-slate-300">Why it happens:</strong>{' '}
                      {trapItem.whyItHappens}
                    </p>
                    <p className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2">
                      <strong>Mental Model Fix:</strong> {trapItem.mentalModelCorrection}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Higher-Order Synthesis & Transfer Challenge */}
          {analysis.synthesisChallenge && (
            <div className="bg-gradient-to-r from-amber-950/30 via-slate-950 to-indigo-950/30 border border-amber-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Higher-Order Transfer Challenge
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      Test Your Mental Model Under Novel Constraints
                    </h4>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowChallengeHint(!showChallengeHint)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl text-xs font-semibold border border-amber-500/30 transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{showChallengeHint ? 'Hide Hint' : 'First-Principles Hint'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChallengeSolution(!showChallengeSolution)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-500/30 transition flex items-center space-x-1 cursor-pointer"
                  >
                    {showChallengeSolution ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide Blueprint</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Reveal Blueprint</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-200 font-medium leading-relaxed bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
                {analysis.synthesisChallenge.question}
              </p>

              {showChallengeHint && (
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200">
                  <strong>First-Principles Hint:</strong> {analysis.synthesisChallenge.hint}
                </div>
              )}

              {showChallengeSolution && (
                <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 text-xs text-indigo-200">
                  <strong>Rigorous Solution Blueprint:</strong>{' '}
                  {analysis.synthesisChallenge.modelSolutionOutline}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  value={challengeAttempt}
                  onChange={(e) => setChallengeAttempt(e.target.value)}
                  placeholder="Draft your synthesis solution or invariant proof to debate with the AI Tutor..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    onNavigateToChat(
                      `[High-Level Thinking Challenge - ${selectedFramework.name}] Question: "${
                        analysis.synthesisChallenge.question
                      }" — My solution: "${
                        challengeAttempt || 'Please walk me through the first-principles proof.'
                      }"`
                    )
                  }
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                >
                  <span>Debate in Socratic Chat</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleMasterConcept}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Graduate Concept (+XP)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
